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

log() { echo "[camel-runner] $*"; }

handle_request() {
  local method path body content_length
  read -r method path _ || return
  path="${path%$'\r'}"
  content_length=0

  # Drain headers
  while IFS= read -r header; do
    header="${header%$'\r'}"
    [[ -z "$header" ]] && break
    if [[ "$header" =~ ^[Cc]ontent-[Ll]ength:\ *([0-9]+) ]]; then
      content_length="${BASH_REMATCH[1]}"
    fi
  done

  body=""
  if [[ "$content_length" -gt 0 ]]; then
    read -r -n "$content_length" body || true
  fi

  if [[ "$path" == "/health" ]]; then
    local resp='{"status":"UP","camelVersion":"4.8.5"}'
    printf 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' "${#resp}" "$resp"
    return
  fi

  if [[ "$method" == "POST" && "$path" == "/run" ]]; then
    # Extract "route" field using jq (installed in container)
    local route_file
    route_file=$(echo "$body" | jq -r '.route // empty' 2>/dev/null || true)

    if [[ -z "$route_file" || ! -f "$route_file" ]]; then
      local err
      err=$(printf '{"error":"route file not found","file":"%s"}' "$route_file")
      printf 'HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' "${#err}" "$err"
      return
    fi

    log "Executing route: $route_file"
    local output exit_code=0
    output=$(camel run "$route_file" --max-messages=1 2>&1) || exit_code=$?

    local safe_output
    safe_output=$(echo "$output" | tail -10 | jq -Rs . 2>/dev/null || echo '"see container logs"')

    if [[ "$exit_code" -eq 0 ]]; then
      local ok
      ok=$(printf '{"status":"completed","output":%s}' "$safe_output")
      printf 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' "${#ok}" "$ok"
    else
      local fail
      fail=$(printf '{"status":"failed","exitCode":%d,"output":%s}' "$exit_code" "$safe_output")
      printf 'HTTP/1.1 500 Internal Server Error\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' "${#fail}" "$fail"
    fi
    return
  fi

  local nf='{"error":"not found"}'
  printf 'HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' "${#nf}" "$nf"
}

log "Starting Camel Runner on port $PORT"
camel --version

# Use socat to listen; Alpine-compatible, handles one request at a time
while true; do
  socat TCP-LISTEN:"$PORT",reuseaddr,fork SYSTEM:"bash -c 'handle_request'" 2>/dev/null || true
done
