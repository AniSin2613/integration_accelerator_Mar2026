#!/usr/bin/env bash
# Cogniviti Bridge — Camel Runner HTTP dispatcher
#
# Provides a minimal HTTP interface for the control plane to:
#   POST /run  { "route": "/app/routes/some-route.yaml" }  → execute the route
#   GET  /health                                            → liveness check
#
# This is a development-grade runner. It handles one execution at a time and
# streams Camel output to stdout. Production-grade scheduling, concurrency, and
# observability will be addressed in a later phase.
#
# Uses socat (Alpine-compatible) instead of GNU netcat.

set -euo pipefail

PORT="${RUNNER_PORT:-8080}"
RUNNER_SECRET="${RUNNER_SHARED_SECRET:-}"
ROUTES_BASE="/app/routes"

log() { echo "[camel-runner] $*" >&2; }

cleanup_file() {
  local file_path="$1"
  [[ -n "$file_path" && -f "$file_path" ]] && rm -f "$file_path"
}

send_json() {
  local status_code="$1" status_text="$2" json_body="$3"
  printf 'HTTP/1.1 %s %s\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' \
    "$status_code" "$status_text" "${#json_body}" "$json_body"
}

validate_route_path() {
  local route_file="$1"

  if [[ -z "$route_file" ]]; then
    return 1
  fi

  if [[ "$route_file" == *".."* ]] || [[ ! "$route_file" =~ ^/app/routes/[a-zA-Z0-9._-]+\.yaml$ ]]; then
    return 1
  fi

  local resolved_path
  resolved_path=$(realpath -m "$route_file" 2>/dev/null || echo "")
  if [[ -z "$resolved_path" || "$resolved_path" != "$ROUTES_BASE"/* ]]; then
    return 1
  fi

  if [[ ! -f "$route_file" ]]; then
    return 1
  fi

  return 0
}

handle_request() {
  local method path body content_length auth_header=""
  read -r method path _ || return
  path="${path%$'\r'}"
  content_length=0

  # Drain headers, capture auth
  while IFS= read -r header; do
    header="${header%$'\r'}"
    [[ -z "$header" ]] && break
    if [[ "$header" =~ ^[Cc]ontent-[Ll]ength:\ *([0-9]+) ]]; then
      content_length="${BASH_REMATCH[1]}"
    fi
    if [[ "$header" =~ ^[Xx]-[Rr]unner-[Ss]ecret:\ *(.*) ]]; then
      auth_header="${BASH_REMATCH[1]}"
    fi
  done

  body=""
  if [[ "$content_length" -gt 0 ]]; then
    # Read the exact request body byte count from the socket stream.
    body="$(dd bs=1 count="$content_length" status=none 2>/dev/null || true)"
  fi

  # Health endpoint is unauthenticated
  if [[ "$path" == "/health" ]]; then
    send_json 200 "OK" '{"status":"UP","camelVersion":"4.8.5"}'
    return
  fi

  # Authenticate all non-health endpoints via shared secret
  if [[ -n "$RUNNER_SECRET" && "$auth_header" != "$RUNNER_SECRET" ]]; then
    send_json 401 "Unauthorized" '{"error":"invalid or missing X-Runner-Secret header"}'
    return
  fi

  # Connection test endpoint
  if [[ "$method" == "POST" && "$path" == "/connections/test" ]]; then
    handle_connection_test "$body"
    return
  fi

  # Preview run endpoint: execute route and extract CB_PREVIEW_OUTPUT marker
  if [[ "$method" == "POST" && "$path" == "/preview-run" ]]; then
    local route_file route_yaml temp_route_file=""
    route_file=$(echo "$body" | jq -r '.route // empty' 2>/dev/null || true)

    if [[ -z "$route_file" ]]; then
      route_yaml=$(echo "$body" | jq -r '.yaml // empty' 2>/dev/null || true)
      if [[ -n "$route_yaml" ]]; then
        # Create a temp file with a .yaml extension so Camel can detect the DSL
        # format. Use a base path with no dots before the suffix so Camel parses
        # the extension as "yaml" (it uses everything after the first dot).
        local temp_stub
        temp_stub="$(mktemp /tmp/cb-preview-XXXXXX)"
        temp_route_file="${temp_stub}.yaml"
        mv "$temp_stub" "$temp_route_file"
        printf '%s' "$route_yaml" > "$temp_route_file"
        route_file="$temp_route_file"
      fi
    fi

    if [[ -z "$route_file" ]]; then
      send_json 400 "Bad Request" '{"error":"either route or yaml is required"}'
      return
    fi

    if [[ -z "$temp_route_file" ]] && ! validate_route_path "$route_file"; then
      send_json 400 "Bad Request" '{"error":"invalid route path"}'
      return
    fi

    log "Executing preview route: $route_file"
    local output exit_code=0
    output=$(camel run "$route_file" --max-messages=1 2>&1) || exit_code=$?
    cleanup_file "$temp_route_file"

    if [[ "$exit_code" -ne 0 ]]; then
      local safe_output
      safe_output=$(echo "$output" | tail -10 | jq -Rs . 2>/dev/null || echo '"see container logs"')
      local fail
      fail=$(jq -n --argjson code "$exit_code" --argjson output "$safe_output" '{"status":"failed","exitCode":$code,"error":"preview route failed","output":$output}')
      send_json 500 "Internal Server Error" "$fail"
      return
    fi

    local marker_line marker_payload
    marker_line=$(echo "$output" | grep 'CB_PREVIEW_OUTPUT:' | tail -1 || true)
    marker_payload="${marker_line#*CB_PREVIEW_OUTPUT:}"

    if [[ -z "$marker_payload" ]]; then
      local fail
      fail=$(jq -n --arg out "$(echo "$output" | tail -10)" '{"status":"failed","error":"preview output marker not found","output":$out}')
      send_json 500 "Internal Server Error" "$fail"
      return
    fi

    if ! echo "$marker_payload" | jq -e . >/dev/null 2>&1; then
      local fail
      fail=$(jq -n --arg payload "$marker_payload" '{"status":"failed","error":"preview payload is not valid JSON","raw":$payload}')
      send_json 500 "Internal Server Error" "$fail"
      return
    fi

    local ok
    ok=$(jq -n --argjson mappedPayload "$marker_payload" '{"status":"completed","mappedPayload":$mappedPayload}')
    send_json 200 "OK" "$ok"
    return
  fi

  if [[ "$method" == "POST" && "$path" == "/run" ]]; then
    # Extract "route" field using jq (installed in container)
    local route_file
    route_file=$(echo "$body" | jq -r '.route // empty' 2>/dev/null || true)

    if ! validate_route_path "$route_file"; then
      send_json 400 "Bad Request" '{"error":"invalid route path"}'
      return
    fi

    log "Executing route: $route_file"
    local output exit_code=0
    output=$(camel run "$route_file" --max-messages=1 2>&1) || exit_code=$?

    local safe_output
    safe_output=$(echo "$output" | tail -10 | jq -Rs . 2>/dev/null || echo '"see container logs"')

    if [[ "$exit_code" -eq 0 ]]; then
      local ok
      ok=$(jq -n --argjson output "$safe_output" '{"status":"completed","output":$output}')
      send_json 200 "OK" "$ok"
    else
      local fail
      fail=$(jq -n --argjson code "$exit_code" --argjson output "$safe_output" \
        '{"status":"failed","exitCode":$code,"output":$output}')
      send_json 500 "Internal Server Error" "$fail"
    fi
    return
  fi

  send_json 404 "Not Found" '{"error":"not found"}'
}

handle_connection_test() {
  local body="$1"
  local family config base_url test_path test_method auth_method timeout_ms
  family=$(echo "$body" | jq -r '.family // empty' 2>/dev/null || true)
  config=$(echo "$body" | jq -r '.config // empty' 2>/dev/null || true)

  if [[ -z "$config" || "$config" == "null" ]]; then
    send_json 400 "Bad Request" '{"status":"failed","summaryMessage":"Missing config in request body","details":{}}'
    return
  fi

  base_url=$(echo "$config" | jq -r '.baseUrl // empty' 2>/dev/null || true)
  test_path=$(echo "$config" | jq -r '.testPath // empty' 2>/dev/null || true)
  test_method=$(echo "$config" | jq -r '.testMethod // "GET"' 2>/dev/null || true)
  test_method=$(echo "$test_method" | tr '[:lower:]' '[:upper:]')
  auth_method=$(echo "$config" | jq -r '.authMethod // "None"' 2>/dev/null || true)
  timeout_ms=$(echo "$config" | jq -r '.timeoutMs // 10000' 2>/dev/null || true)
  local timeout_secs=$(( (timeout_ms + 999) / 1000 ))
  [[ "$timeout_secs" -lt 2 ]] && timeout_secs=2
  [[ "$timeout_secs" -gt 30 ]] && timeout_secs=30

  if [[ -z "$base_url" ]]; then
    send_json 200 "OK" "$(jq -n '{status:"failed",summaryMessage:"Base URL is empty",details:{family:"'"$family"'"}}')"
    return
  fi

  if [[ "$test_method" != "GET" && "$test_method" != "HEAD" && "$test_method" != "POST" ]]; then
    test_method="GET"
  fi

  local effective_base_url="$base_url"
  # Runner executes in Docker. For local dev, localhost in Base URL refers to
  # the container itself; rewrite to host.docker.internal so host services are reachable.
  if [[ "$effective_base_url" == http://localhost* || "$effective_base_url" == https://localhost* ]]; then
    effective_base_url="${effective_base_url/localhost/host.docker.internal}"
  elif [[ "$effective_base_url" == http://127.0.0.1* || "$effective_base_url" == https://127.0.0.1* ]]; then
    effective_base_url="${effective_base_url/127.0.0.1/host.docker.internal}"
  fi

  local test_url="$effective_base_url"
  if [[ -n "$test_path" ]]; then
    if [[ "$test_path" != /* ]]; then
      test_path="/$test_path"
    fi
    if [[ "$effective_base_url" == */ && "$test_path" == /* ]]; then
      test_url="${effective_base_url%/}$test_path"
    else
      test_url="$effective_base_url$test_path"
    fi
  else
    # No test path: use GET to avoid side effects on root URL
    if [[ "$test_method" != "GET" && "$test_method" != "HEAD" ]]; then
      test_method="GET"
      log "No testPath configured — falling back to GET for root URL check"
    fi
  fi

  log "Testing connection: family=$family auth=$auth_method method=$test_method url=$test_url"

  local start_ms http_code curl_output curl_exit=0
  local access_token="" oauth_token_type="" oauth_expires_in=""
  start_ms=$(date +%s%3N 2>/dev/null || date +%s000)

  # Build curl args based on auth method
  local -a curl_args=(-s -o /dev/null -w '%{http_code}' --max-time "$timeout_secs" -L -X "$test_method"
    -H "Accept: application/json")

  case "$auth_method" in
    "Bearer Token")
      local token_ref
      token_ref=$(echo "$config" | jq -r '.bearerTokenRef // empty' 2>/dev/null || true)
      if [[ -n "$token_ref" ]]; then
        curl_args+=(-H "Authorization: Bearer $token_ref")
      fi
      ;;
    "API Key")
      local key_name key_value placement
      key_name=$(echo "$config" | jq -r '.apiKeyName // empty' 2>/dev/null || true)
      key_value=$(echo "$config" | jq -r '.apiKeyValueRef // empty' 2>/dev/null || true)
      placement=$(echo "$config" | jq -r '.apiKeyPlacement // "Header"' 2>/dev/null || true)
      if [[ -n "$key_name" && -n "$key_value" ]]; then
        if [[ "$placement" == "Header" ]]; then
          curl_args+=(-H "$key_name: $key_value")
        else
          # For query placement, append to URL — handled below
          if [[ "$test_url" == *"?"* ]]; then
            test_url="${test_url}&${key_name}=${key_value}"
          else
            test_url="${test_url}?${key_name}=${key_value}"
          fi
        fi
      fi
      ;;
    "Basic")
      local username password_ref
      username=$(echo "$config" | jq -r '.basicUsername // empty' 2>/dev/null || true)
      password_ref=$(echo "$config" | jq -r '.basicPasswordRef // empty' 2>/dev/null || true)
      if [[ -n "$username" && -n "$password_ref" ]]; then
        curl_args+=(-u "$username:$password_ref")
      fi
      ;;
    "OAuth 2.0")
      # Attempt client_credentials token exchange
      local client_id client_secret_ref token_endpoint scope
      client_id=$(echo "$config" | jq -r '.oauthClientId // empty' 2>/dev/null || true)
      client_secret_ref=$(echo "$config" | jq -r '.oauthClientSecretRef // empty' 2>/dev/null || true)
      token_endpoint=$(echo "$config" | jq -r '.oauthTokenEndpoint // empty' 2>/dev/null || true)
      scope=$(echo "$config" | jq -r '.oauthScope // empty' 2>/dev/null || true)

      if [[ -n "$client_id" && -n "$token_endpoint" ]]; then
        local token_data="grant_type=client_credentials"
        if [[ -n "$scope" ]]; then
          token_data="${token_data}&scope=$scope"
        fi

        # Append custom auth parameters to the token request body
        local custom_params_count
        custom_params_count=$(echo "$config" | jq -r '.customAuthParams | length' 2>/dev/null || echo "0")
        if [[ "$custom_params_count" -gt 0 ]]; then
          for idx in $(seq 0 $(( custom_params_count - 1 ))); do
            local cp_key cp_val
            cp_key=$(echo "$config" | jq -r ".customAuthParams[$idx].key // empty" 2>/dev/null || true)
            cp_val=$(echo "$config" | jq -r ".customAuthParams[$idx].value // empty" 2>/dev/null || true)
            # Skip keys already set by the built-in OAuth flow to avoid duplicates
            if [[ -n "$cp_key" && "$cp_key" != "grant_type" && "$cp_key" != "client_id" && "$cp_key" != "client_secret" && "$cp_key" != "scope" ]]; then
              token_data="${token_data}&${cp_key}=${cp_val}"
            fi
          done
        fi

        # Build token request args — send client creds via Basic auth (RFC 6749 §2.3.1)
        # and also in the body for providers that expect it there
        local -a token_args=(-s --max-time "$timeout_secs" -X POST "$token_endpoint"
          -H "Content-Type: application/x-www-form-urlencoded")

        if [[ -n "$client_secret_ref" ]]; then
          token_args+=(-u "$client_id:$client_secret_ref")
          token_data="${token_data}&client_id=$client_id&client_secret=$client_secret_ref"
        else
          token_data="${token_data}&client_id=$client_id"
        fi

        token_args+=(-d "$token_data")

        local token_response token_exit=0
        token_response=$(curl "${token_args[@]}" 2>&1) || token_exit=$?

        if [[ "$token_exit" -eq 0 ]]; then
          access_token=$(echo "$token_response" | jq -r '.access_token // empty' 2>/dev/null || true)
          oauth_token_type=$(echo "$token_response" | jq -r '.token_type // "Bearer"' 2>/dev/null || true)
          oauth_expires_in=$(echo "$token_response" | jq -r '.expires_in // empty' 2>/dev/null || true)
          if [[ -n "$access_token" ]]; then
            curl_args+=(-H "Authorization: Bearer $access_token")
            log "OAuth 2.0 token acquired successfully"
          else
            local token_error
            token_error=$(echo "$token_response" | jq -r '.error // .error_description // empty' 2>/dev/null || true)
            local end_ms
            end_ms=$(date +%s%3N 2>/dev/null || date +%s000)
            local latency=$(( end_ms - start_ms ))
            send_json 200 "OK" "$(jq -n \
              --arg msg "OAuth 2.0 token exchange failed: ${token_error:-no access_token in response}" \
              --argjson lat "$latency" \
              --arg fam "$family" \
              --arg ep "$token_endpoint" \
              '{status:"failed",summaryMessage:$msg,latencyMs:$lat,details:{family:$fam,tokenEndpoint:$ep,phase:"token_exchange"}}')"
            return
          fi
        else
          local end_ms
          end_ms=$(date +%s%3N 2>/dev/null || date +%s000)
          local latency=$(( end_ms - start_ms ))
          send_json 200 "OK" "$(jq -n \
            --arg msg "Cannot reach OAuth 2.0 token endpoint: $token_endpoint" \
            --argjson lat "$latency" \
            --arg fam "$family" \
            --arg ep "$token_endpoint" \
            '{status:"failed",summaryMessage:$msg,latencyMs:$lat,details:{family:$fam,tokenEndpoint:$ep,phase:"token_exchange",curlExit:'"$token_exit"'}}')"
          return
        fi
      fi
      ;;
  esac

  # For non-OAuth auth methods, add custom params as request headers
  if [[ "$auth_method" != "OAuth 2.0" ]]; then
    local custom_params_count
    custom_params_count=$(echo "$config" | jq -r '.customAuthParams | length' 2>/dev/null || echo "0")
    if [[ "$custom_params_count" -gt 0 ]]; then
      for idx in $(seq 0 $(( custom_params_count - 1 ))); do
        local cp_key cp_val
        cp_key=$(echo "$config" | jq -r ".customAuthParams[$idx].key // empty" 2>/dev/null || true)
        cp_val=$(echo "$config" | jq -r ".customAuthParams[$idx].value // empty" 2>/dev/null || true)
        if [[ -n "$cp_key" ]]; then
          curl_args+=(-H "$cp_key: $cp_val")
        fi
      done
    fi
  fi

  # Execute the check against the configured test URL/method.
  http_code=$(curl "${curl_args[@]}" "$test_url" 2>/dev/null) || curl_exit=$?

  local end_ms
  end_ms=$(date +%s%3N 2>/dev/null || date +%s000)
  local latency=$(( end_ms - start_ms ))

  # Build optional OAuth token detail args
  local oauth_detail_args=()
  if [[ -n "${access_token:-}" ]]; then
    oauth_detail_args+=(--arg bearerToken "$access_token")
    oauth_detail_args+=(--arg tokenType "${oauth_token_type:-Bearer}")
    if [[ -n "${oauth_expires_in:-}" ]]; then
      oauth_detail_args+=(--argjson expiresIn "$oauth_expires_in")
    fi
  fi

  if [[ "$curl_exit" -ne 0 ]]; then
    send_json 200 "OK" "$(jq -n \
      --arg msg "Cannot reach $test_url (curl exit $curl_exit)" \
      --argjson lat "$latency" \
      --arg fam "$family" \
      --arg url "$test_url" \
      --arg base "$base_url" \
      --arg resolvedBase "$effective_base_url" \
      --arg method "$test_method" \
      "${oauth_detail_args[@]}" \
      '{status:"failed",summaryMessage:$msg,latencyMs:$lat,details:({family:$fam,baseUrl:$base,resolvedBaseUrl:$resolvedBase,testUrl:$url,testMethod:$method,curlExit:'"$curl_exit"'} + (if $ARGS.named.bearerToken then {bearerToken:$ARGS.named.bearerToken,tokenType:$ARGS.named.tokenType} + (if $ARGS.named.expiresIn then {expiresIn:$ARGS.named.expiresIn} else {} end) else {} end))}')"
    return
  fi

  log "Connection test result: HTTP $http_code in ${latency}ms"

  # When OAuth token was acquired but no testPath was given, authentication is
  # verified regardless of what the bare root URL returns — report healthy.
  if [[ -n "${access_token:-}" && -z "$test_path" ]]; then
    log "OAuth token acquired; no testPath configured — reporting healthy (root HTTP $http_code ignored)"
    send_json 200 "OK" "$(jq -n \
      --arg msg "OAuth authentication successful — credentials verified" \
      --argjson lat "$latency" \
      --arg fam "$family" \
      --arg url "$test_url" \
      --arg base "$base_url" \
      --arg resolvedBase "$effective_base_url" \
      --arg method "$test_method" \
      "${oauth_detail_args[@]}" \
      '{status:"healthy",summaryMessage:$msg,latencyMs:$lat,details:({family:$fam,baseUrl:$base,resolvedBaseUrl:$resolvedBase,testUrl:$url,testMethod:$method,httpStatus:'"$http_code"'} + (if $ARGS.named.bearerToken then {bearerToken:$ARGS.named.bearerToken,tokenType:$ARGS.named.tokenType} + (if $ARGS.named.expiresIn then {expiresIn:$ARGS.named.expiresIn} else {} end) else {} end))}')"
    return
  fi

  if [[ "$http_code" -ge 200 && "$http_code" -lt 400 ]]; then
    send_json 200 "OK" "$(jq -n \
      --arg msg "Connection successful (HTTP $http_code)" \
      --argjson lat "$latency" \
      --arg fam "$family" \
      --arg url "$test_url" \
      --arg base "$base_url" \
      --arg resolvedBase "$effective_base_url" \
      --arg method "$test_method" \
      "${oauth_detail_args[@]}" \
      '{status:"healthy",summaryMessage:$msg,latencyMs:$lat,details:({family:$fam,baseUrl:$base,resolvedBaseUrl:$resolvedBase,testUrl:$url,testMethod:$method,httpStatus:'"$http_code"'} + (if $ARGS.named.bearerToken then {bearerToken:$ARGS.named.bearerToken,tokenType:$ARGS.named.tokenType} + (if $ARGS.named.expiresIn then {expiresIn:$ARGS.named.expiresIn} else {} end) else {} end))}')"
  elif [[ "$http_code" -ge 400 && "$http_code" -lt 500 ]]; then
    local warning_msg="Server returned HTTP $http_code"
    if [[ "$http_code" -eq 401 || "$http_code" -eq 403 ]]; then
      warning_msg="Server returned HTTP $http_code — check credentials or auth configuration"
    elif [[ "$http_code" -eq 404 ]]; then
      warning_msg="Server returned HTTP 404 — verify Base URL and Test Path"
    else
      warning_msg="Server returned HTTP $http_code — verify endpoint path and request configuration"
    fi

    send_json 200 "OK" "$(jq -n \
      --arg msg "$warning_msg" \
      --argjson lat "$latency" \
      --arg fam "$family" \
      --arg url "$test_url" \
      --arg base "$base_url" \
      --arg resolvedBase "$effective_base_url" \
      --arg method "$test_method" \
      "${oauth_detail_args[@]}" \
      '{status:"warning",summaryMessage:$msg,latencyMs:$lat,details:({family:$fam,baseUrl:$base,resolvedBaseUrl:$resolvedBase,testUrl:$url,testMethod:$method,httpStatus:'"$http_code"'} + (if $ARGS.named.bearerToken then {bearerToken:$ARGS.named.bearerToken,tokenType:$ARGS.named.tokenType} + (if $ARGS.named.expiresIn then {expiresIn:$ARGS.named.expiresIn} else {} end) else {} end))}')"
  else
    send_json 200 "OK" "$(jq -n \
      --arg msg "Server returned HTTP $http_code" \
      --argjson lat "$latency" \
      --arg fam "$family" \
      --arg url "$test_url" \
      --arg base "$base_url" \
      --arg resolvedBase "$effective_base_url" \
      --arg method "$test_method" \
      "${oauth_detail_args[@]}" \
      '{status:"failed",summaryMessage:$msg,latencyMs:$lat,details:({family:$fam,baseUrl:$base,resolvedBaseUrl:$resolvedBase,testUrl:$url,testMethod:$method,httpStatus:'"$http_code"'} + (if $ARGS.named.bearerToken then {bearerToken:$ARGS.named.bearerToken,tokenType:$ARGS.named.tokenType} + (if $ARGS.named.expiresIn then {expiresIn:$ARGS.named.expiresIn} else {} end) else {} end))}')"
  fi
}

log "Starting Camel Runner on port $PORT"
camel --version 2>/dev/null || log "Camel JBang not available — connection testing only"

# Export all functions + variables so socat's child bash processes can access them
export -f log send_json handle_request handle_connection_test
export PORT RUNNER_SECRET ROUTES_BASE

# Use socat to listen; Alpine-compatible, forks per connection
while true; do
  socat TCP-LISTEN:"$PORT",reuseaddr,fork EXEC:"/bin/bash -c handle_request" 2>&1 || true
done
