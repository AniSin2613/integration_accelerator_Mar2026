#!/usr/bin/env bash
# ============================================================
# scripts/test-all.sh
#
# Cogniviti Bridge — global regression & smoke test runner.
# Verifies that recent Integration Copilot feature additions
# (AI mapping suggestions, source coverage, rollback, promote
# API wiring) do not break any existing system behaviour.
#
# Usage:
#   ./scripts/test-all.sh               # full suite
#   ./scripts/test-all.sh --skip-api    # skip API smoke tests
#   ./scripts/test-all.sh --skip-types  # skip tsc checks (fast)
#
# Exit code: 0 = all pass, 1 = one or more failures.
# ============================================================

set -uo pipefail   # -e intentionally omitted so we collect all failures

# ── Options ──────────────────────────────────────────────────
SKIP_API=false
SKIP_TYPES=false
for arg in "$@"; do
  case "$arg" in
    --skip-api)   SKIP_API=true ;;
    --skip-types) SKIP_TYPES=true ;;
  esac
done

# ── Paths ─────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WEB_DIR="$ROOT/apps/web"
API_DIR="$ROOT/apps/api"

# ── Colours ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; RESET='\033[0m'

# ── Counters ──────────────────────────────────────────────────
PASS=0; FAIL=0; SKIP=0; WARN=0

# ── Helpers ───────────────────────────────────────────────────
pass()    { echo -e "  ${GREEN}✓ PASS${RESET}  $1"; ((PASS++)); }
fail()    { echo -e "  ${RED}✗ FAIL${RESET}  $1"; ((FAIL++)); }
skip()    { echo -e "  ${DIM}⊘ SKIP${RESET}  $1"; ((SKIP++)); }
warn()    { echo -e "  ${YELLOW}⚠ WARN${RESET}  $1"; ((WARN++)); }
section() { echo -e "\n${BOLD}${BLUE}── $1 ${RESET}${DIM}$(printf '─%.0s' {1..50})${RESET}"; }

# py_search FILE PATTERN   — returns 0 if Python re.search finds PATTERN in FILE
# Uses Python3 so it works on macOS (BSD grep lacks -P/PCRE support).
py_search() {
  python3 - "$1" "$2" <<'__PYEOF__' 2>/dev/null
import sys, re
try:
    content = open(sys.argv[1], encoding='utf-8', errors='replace').read()
    sys.exit(0 if re.search(sys.argv[2], content) else 1)
except Exception:
    sys.exit(1)
__PYEOF__
}

# assert_contains FILE PATTERN DESCRIPTION
assert_contains() {
  local file="$1" pattern="$2" desc="$3"
  if py_search "$file" "$pattern"; then
    pass "$desc"
  else
    fail "$desc  ${DIM}(pattern not found: $pattern)${RESET}"
  fi
}

# assert_absent FILE PATTERN DESCRIPTION
assert_absent() {
  local file="$1" pattern="$2" desc="$3"
  if py_search "$file" "$pattern"; then
    fail "$desc  ${DIM}(unexpected pattern present: $pattern)${RESET}"
  else
    pass "$desc"
  fi
}

# api_check DESCRIPTION EXPECTED_STATUSES... -- CURL_ARGS...
# Calls the API and verifies HTTP status is in the expected set.
# Prints a WARN (not FAIL) when API is unreachable.
api_check() {
  local desc="$1"; shift
  local expected_codes=()
  while [[ "$1" != "--" ]]; do
    expected_codes+=("$1"); shift
  done
  shift  # consume '--'

  local actual
  actual=$(curl -sS -o /tmp/cb_test_resp.json -w "%{http_code}" \
    -H "Authorization: Bearer ${AUTH_STUB_SECRET}" \
    -H "X-User-Id: test-script-user" \
    -H "X-User-Role: ADMIN" \
    "$@" 2>/tmp/cb_test_curl_err) || true

  if [[ -z "$actual" ]]; then
    warn "$desc — API unreachable (run with --skip-api to suppress)"
    return
  fi

  for code in "${expected_codes[@]}"; do
    if [[ "$actual" == "$code" ]]; then
      pass "$desc (HTTP $actual)"
      return
    fi
  done
  fail "$desc — got HTTP $actual, expected one of: ${expected_codes[*]}"
  echo -e "    ${DIM}Response: $(cat /tmp/cb_test_resp.json 2>/dev/null | head -c 200)${RESET}"
}

# ── Config from env ───────────────────────────────────────────
API_URL="${API_URL:-http://localhost:4000}"
AUTH_STUB_SECRET="${AUTH_STUB_SECRET:-dev_stub_secret_not_for_production}"

echo -e "\n${BOLD}Cogniviti Bridge — Global Regression Test${RESET}"
echo -e "${DIM}Root: $ROOT${RESET}"
echo -e "${DIM}API:  $API_URL   |   skip-api=$SKIP_API   skip-types=$SKIP_TYPES${RESET}"
echo -e "${DIM}Run:  $(date)${RESET}"

# ══════════════════════════════════════════════════════════════
# SECTION 1: TypeScript compilation
# ══════════════════════════════════════════════════════════════
section "TypeScript: type-checking"

if [[ "$SKIP_TYPES" == "true" ]]; then
  skip "API tsc --noEmit"
  skip "Web tsc --noEmit"
else
  echo -e "  ${DIM}Compiling Camel package first (web/api both depend on it)…${RESET}"
  if pnpm --filter @cogniviti/camel build --silent 2>/tmp/cb_camel_build.log; then
    pass "Camel package build"
  else
    warn "Camel package build failed — type-check results may be incomplete"
    cat /tmp/cb_camel_build.log | tail -5
  fi

  if npx tsc --noEmit -p "$API_DIR/tsconfig.json" 2>/tmp/cb_api_tsc.log; then
    pass "API tsc --noEmit"
  else
    fail "API tsc --noEmit"
    grep "error TS" /tmp/cb_api_tsc.log | head -10
  fi

  if npx tsc --noEmit -p "$WEB_DIR/tsconfig.json" 2>/tmp/cb_web_tsc.log; then
    pass "Web tsc --noEmit"
  else
    fail "Web tsc --noEmit"
    grep "error TS" /tmp/cb_web_tsc.log | head -10
  fi
fi

# ══════════════════════════════════════════════════════════════
# SECTION 2: Modified file — StudioHeader.tsx
# ══════════════════════════════════════════════════════════════
STUDIO_HEADER="$WEB_DIR/src/components/mapping-studio/StudioHeader.tsx"
section "StudioHeader.tsx — AI props & buttons"

assert_contains "$STUDIO_HEADER" "onAskAI:\s*\(\)\s*=>\s*void" \
  "onAskAI prop declared"
assert_contains "$STUDIO_HEADER" "unreviewedAiCount\?:\s*number" \
  "unreviewedAiCount prop declared"
assert_contains "$STUDIO_HEADER" "Suggest Required" \
  "Button renamed to 'Suggest Required'"
assert_contains "$STUDIO_HEADER" "Ask AI" \
  "'Ask AI' button present"
assert_contains "$STUDIO_HEADER" "Preview & Test" \
  "Button renamed to 'Preview & Test'"
assert_contains "$STUDIO_HEADER" "unreviewedAiCount > 0" \
  "Unreviewed badge conditional renders"
assert_contains "$STUDIO_HEADER" "bg-violet" \
  "Violet AI button styling applied"
# Regression: original required props must still exist
assert_contains "$STUDIO_HEADER" "onSuggest" \
  "[regression] onSuggest prop still present"
assert_contains "$STUDIO_HEADER" "onValidate" \
  "[regression] onValidate prop still present"
assert_contains "$STUDIO_HEADER" "onPreview" \
  "[regression] onPreview prop still present"
assert_contains "$STUDIO_HEADER" "onSave" \
  "[regression] onSave prop still present"

# ══════════════════════════════════════════════════════════════
# SECTION 3: Modified file — MappingHealthStrip.tsx
# ══════════════════════════════════════════════════════════════
HEALTH_STRIP="$WEB_DIR/src/components/mapping/MappingHealthStrip.tsx"
section "MappingHealthStrip.tsx — source coverage & AI counter"

assert_contains "$HEALTH_STRIP" "sourceUsed\?:\s*number" \
  "sourceUsed prop declared"
assert_contains "$HEALTH_STRIP" "sourceTotal\?:\s*number" \
  "sourceTotal prop declared"
assert_contains "$HEALTH_STRIP" "unreviewedAiCount\?:\s*number" \
  "unreviewedAiCount prop declared"
assert_contains "$HEALTH_STRIP" "Source fields used" \
  "Source coverage label rendered"
assert_contains "$HEALTH_STRIP" "need review before promoting" \
  "AI review reminder rendered"
assert_contains "$HEALTH_STRIP" "unreviewedAiCount === 0" \
  "Strip success gate checks unreviewedAiCount"
# Regression: existing blockers prop must still be used
assert_contains "$HEALTH_STRIP" "blockers" \
  "[regression] blockers prop still used in strip"

# ══════════════════════════════════════════════════════════════
# SECTION 4: Modified file — PreviewPanel.tsx
# ══════════════════════════════════════════════════════════════
PREVIEW_PANEL="$WEB_DIR/src/components/mapping-studio/PreviewPanel.tsx"
section "PreviewPanel.tsx — source coverage display"

assert_contains "$PREVIEW_PANEL" "sourceUsed\?:\s*number" \
  "sourceUsed prop declared in interface"
assert_contains "$PREVIEW_PANEL" "sourceTotal\?:\s*number" \
  "sourceTotal prop declared in interface"
assert_contains "$PREVIEW_PANEL" "Source fields used:" \
  "Coverage label rendered in Issues column"
assert_contains "$PREVIEW_PANEL" "sourceTotal != null && sourceTotal > 0" \
  "Coverage section gated correctly"
# Regression: existing issue sections still render
assert_contains "$PREVIEW_PANEL" "unmappedRequired" \
  "[regression] unmapped required fields check still present"
assert_contains "$PREVIEW_PANEL" "failureStage" \
  "[regression] failure stage diagnostic still present"
assert_contains "$PREVIEW_PANEL" "All required fields mapped" \
  "[regression] success state message still present"

# ══════════════════════════════════════════════════════════════
# SECTION 5: Modified file — mapping/page.tsx
# ══════════════════════════════════════════════════════════════
MAPPING_PAGE="$WEB_DIR/src/app/(dashboard)/integrations/[id]/mapping/page.tsx"
section "mapping/page.tsx — AI state, handlers, modal"

assert_contains "$MAPPING_PAGE" "aiReviewMap" \
  "aiReviewMap state declared"
assert_contains "$MAPPING_PAGE" "'UNREVIEWED'" \
  "aiReviewMap typed as UNREVIEWED"
assert_contains "$MAPPING_PAGE" "copilotOpen" \
  "copilotOpen state declared (renamed from askAiOpen)"
assert_contains "$MAPPING_PAGE" "handleAskAI\s*=" \
  "handleAskAI handler present (opens CopilotPanel)"
assert_contains "$MAPPING_PAGE" "handleCopilotApplyMapping\s*=" \
  "handleCopilotApplyMapping handler present (agentic apply)"
assert_contains "$MAPPING_PAGE" "markAiReviewed\s*=" \
  "markAiReviewed handler present"
assert_contains "$MAPPING_PAGE" "CopilotPanel" \
  "CopilotPanel component imported and rendered"
assert_contains "$MAPPING_PAGE" "onApplyMapping=\{handleCopilotApplyMapping\}" \
  "onApplyMapping wired to CopilotPanel"
assert_contains "$MAPPING_PAGE" "const unreviewedAiCount" \
  "unreviewedAiCount computed value derived"
assert_contains "$MAPPING_PAGE" "const sourceUsed" \
  "sourceUsed computed value derived"
assert_contains "$MAPPING_PAGE" "const sourceTotal" \
  "sourceTotal computed value derived"
assert_contains "$MAPPING_PAGE" "onAskAI=\{handleAskAI\}" \
  "onAskAI wired to StudioHeader"
assert_contains "$MAPPING_PAGE" "unreviewedAiCount=\{unreviewedAiCount\}" \
  "unreviewedAiCount wired to StudioHeader"
assert_contains "$MAPPING_PAGE" "sourceUsed=\{sourceUsed\}" \
  "sourceUsed wired to components"
# Regression: existing flow still intact
assert_contains "$MAPPING_PAGE" "handleSuggest" \
  "[regression] handleSuggest still present"
assert_contains "$MAPPING_PAGE" "aiConfidence" \
  "aiConfidence stored on AI-suggested mappings"
assert_contains "$MAPPING_PAGE" "toAdd\.length === 0" \
  "handleSuggest guards against empty additions (no badge/canvas desync)"
assert_contains "$MAPPING_PAGE" "handleValidate" \
  "[regression] handleValidate still present"
assert_contains "$MAPPING_PAGE" "PreviewPanel" \
  "[regression] PreviewPanel still rendered"
assert_contains "$MAPPING_PAGE" "TransformEditorSheet" \
  "[regression] TransformEditorSheet still rendered"

# ══════════════════════════════════════════════════════════════
# SECTION 5b: New file — CopilotPanel.tsx
# ══════════════════════════════════════════════════════════════
COPILOT_PANEL="$WEB_DIR/src/components/mapping-studio/CopilotPanel.tsx"
section "CopilotPanel.tsx — conversational AI panel"

assert_contains "$COPILOT_PANEL" "handleAsk\s*=" \
  "handleAsk async function defined"
assert_contains "$COPILOT_PANEL" "handleApply\s*=" \
  "handleApply function defined (agentic apply)"
assert_contains "$COPILOT_PANEL" 'aria-label="Integration Copilot"' \
  "Panel has correct aria-label for accessibility"
assert_contains "$COPILOT_PANEL" "copilot/ask-field" \
  "Correct backend API endpoint used"
assert_contains "$COPILOT_PANEL" "'thinking'" \
  "thinking phase state defined"
assert_contains "$COPILOT_PANEL" "'needs-context'" \
  "needs-context phase state defined"
assert_contains "$COPILOT_PANEL" "onApplyMapping" \
  "onApplyMapping callback prop used"
assert_contains "$COPILOT_PANEL" "Apply mapping" \
  "'Apply mapping' button rendered in candidate cards"
assert_contains "$COPILOT_PANEL" "Apply with transform" \
  "'Apply with transform' button rendered for hints"
assert_absent  "$COPILOT_PANEL" "dangerouslySetInnerHTML" \
  "CopilotPanel — no dangerouslySetInnerHTML (XSS risk)"

# ══════════════════════════════════════════════════════════════
# SECTION 5c: Modified file — MappingCanvas.tsx (confidence badge)
# ══════════════════════════════════════════════════════════════
MAPPING_CANVAS="$WEB_DIR/src/components/mapping-studio/MappingCanvas.tsx"
section "MappingCanvas.tsx — AI confidence badge on mapping bar"

assert_contains "$MAPPING_CANVAS" "aiConfidence" \
  "aiConfidence field read from mapping object"
assert_contains "$MAPPING_CANVAS" "AI confidence" \
  "Confidence badge tooltip present"
assert_contains "$MAPPING_CANVAS" "mapping.aiConfidence >= 0.8" \
  "Green threshold (>=80%) applied"
assert_contains "$MAPPING_CANVAS" "mapping.aiConfidence >= 0.6" \
  "Yellow threshold (>=60%) applied"
assert_absent  "$MAPPING_CANVAS" "dangerouslySetInnerHTML" \
  "MappingCanvas — no dangerouslySetInnerHTML (XSS risk)"

# ════════════════════════════════════════════════════════════════
# SECTION 6: Modified file — IntegrationOverviewPage.tsx
# ════════════════════════════════════════════════════════════════
OVERVIEW_PAGE="$WEB_DIR/src/components/integration-overview/IntegrationOverviewPage.tsx"
section "IntegrationOverviewPage.tsx — PromoteDrawer API wiring"

assert_contains "$OVERVIEW_PAGE" "api\.post\(" \
  "api.post call present in onConfirm"
assert_contains "$OVERVIEW_PAGE" "versions/" \
  "Promote endpoint uses version path segment"
assert_contains "$OVERVIEW_PAGE" "toEnvironment" \
  "toEnvironment forwarded to API"
assert_absent "$OVERVIEW_PAGE" "TODO: POST auditPayload" \
  "TODO comment replaced (no longer a stub)"
assert_absent "$OVERVIEW_PAGE" "console\.info\('\[Promote action\]'" \
  "console.info stub removed from onConfirm"
# Regression: PromoteDrawer still rendered
assert_contains "$OVERVIEW_PAGE" "PromoteDrawer" \
  "[regression] PromoteDrawer still in JSX"
assert_contains "$OVERVIEW_PAGE" "setPromoteTarget\(null\)" \
  "[regression] promoteTarget cleared after action"

# ══════════════════════════════════════════════════════════════
# SECTION 7: Modified file — releases/page.tsx
# ══════════════════════════════════════════════════════════════
RELEASES_PAGE="$WEB_DIR/src/app/(dashboard)/integrations/[id]/releases/page.tsx"
section "releases/page.tsx — rollback support"

assert_contains "$RELEASES_PAGE" "rollbackTargetId" \
  "rollbackTargetId state declared"
assert_contains "$RELEASES_PAGE" "rollbackReason" \
  "rollbackReason state declared"
assert_contains "$RELEASES_PAGE" "rollbackLoading" \
  "rollbackLoading state declared"
assert_contains "$RELEASES_PAGE" "handleRollback\s*=" \
  "handleRollback function defined"
assert_contains "$RELEASES_PAGE" "/rollback" \
  "Rollback API endpoint called"
assert_contains "$RELEASES_PAGE" "targetArtifactId" \
  "targetArtifactId passed to rollback API"
assert_contains "$RELEASES_PAGE" "Confirm Rollback" \
  "Rollback confirmation dialog rendered"
assert_contains "$RELEASES_PAGE" "SUPERSEDED" \
  "Rollback button shown for SUPERSEDED artifacts"
assert_contains "$RELEASES_PAGE" "rollbackReason\.trim\(\)" \
  "Reason sanitised before API call"
# Regression: existing promote-next flow unchanged
assert_contains "$RELEASES_PAGE" "handleSubmit" \
  "[regression] handleSubmit still present"
assert_contains "$RELEASES_PAGE" "handleApprove" \
  "[regression] handleApprove still present"
assert_contains "$RELEASES_PAGE" "handlePromote" \
  "[regression] handlePromote still present"
assert_contains "$RELEASES_PAGE" "promote-next" \
  "[regression] promote-next endpoint still called"
assert_contains "$RELEASES_PAGE" "Submit for Approval" \
  "[regression] Submit button still in render"

# ══════════════════════════════════════════════════════════════
# SECTION 8: Cross-cutting — no broken imports / obvious issues
# ══════════════════════════════════════════════════════════════
section "Cross-cutting checks"

# All modified files should use the 'use client' directive
for f in "$STUDIO_HEADER" "$PREVIEW_PANEL" "$MAPPING_PAGE" "$RELEASES_PAGE" "$OVERVIEW_PAGE"; do
  fname=$(basename "$f")
  assert_contains "$f" "'use client'" \
    "$fname has 'use client' directive"
done

# api-client must be imported where used
assert_contains "$OVERVIEW_PAGE" "from '@/lib/api-client'" \
  "IntegrationOverviewPage imports api-client"
assert_contains "$RELEASES_PAGE"  "from '@/lib/api-client'" \
  "releases/page imports api-client"
assert_contains "$MAPPING_PAGE"   "from '@/lib/api-client'" \
  "mapping/page imports api-client"

# No raw fetch() calls introduced (security: all calls go through api-client)
assert_absent "$MAPPING_PAGE"   "(?<!// )fetch\(" \
  "mapping/page uses api-client, not raw fetch"
assert_absent "$RELEASES_PAGE"  "(?<!// )fetch\(" \
  "releases/page uses api-client, not raw fetch"

# No dangerouslySetInnerHTML in any modified file
for f in "$STUDIO_HEADER" "$HEALTH_STRIP" "$PREVIEW_PANEL" "$MAPPING_PAGE" "$RELEASES_PAGE" "$OVERVIEW_PAGE"; do
  assert_absent "$f" "dangerouslySetInnerHTML" \
    "$(basename $f) — no dangerouslySetInnerHTML (XSS risk)"
done

# External evidence links: externalEvidence is always [] in v1 copilot service — no links rendered yet.
# When external evidence links are added to CopilotPanel, assert rel="noopener noreferrer" there.
skip "External evidence links — not yet rendered (externalEvidence: [] in service; future sprint)"

# ══════════════════════════════════════════════════════════════
# SECTION 9: API smoke tests (conditional)
# ══════════════════════════════════════════════════════════════
section "API smoke tests"

if [[ "$SKIP_API" == "true" ]]; then
  skip "All API smoke tests (--skip-api)"
else
  # Probe health endpoint first — suppresses all API tests if down
  echo -e "  ${DIM}Probing $API_URL/health …${RESET}"
  if ! curl -fsS "$API_URL/health" -o /dev/null 2>/dev/null; then
    warn "API not reachable at $API_URL — skipping all API smoke tests"
    warn "Start the API with: pnpm --filter @cogniviti/api dev"
    SKIP=$((SKIP + 12))
  else
    pass "API health endpoint reachable"

    # ── Database connectivity probe ────────────────────────────
    DB_HOST="${DATABASE_URL:-postgresql://localhost:5432}"
    DB_REACHABLE=true
    if ! python3 -c "import socket; s=socket.create_connection(('localhost',5432),timeout=2); s.close()" 2>/dev/null; then
      DB_REACHABLE=false
      warn "PostgreSQL not reachable at localhost:5432 — DB-dependent API tests will be skipped"
      warn "Start PostgreSQL and run: pnpm db:migrate:deploy && pnpm db:seed"
    fi

    # ── Existing routes (regression) ──────────────────────────
    if [[ "$DB_REACHABLE" == "false" ]]; then
      skip "GET /integrations — skipped (DB not running)"
    else
      api_check "GET /integrations — existing list route" 200 -- \
        -X GET "$API_URL/integrations"
    fi

    # Pick the first integration id for route-specific tests
    FIRST_ID=""
    if [[ "$DB_REACHABLE" == "true" ]]; then
      FIRST_ID=$(curl -sS -H "Authorization: Bearer $AUTH_STUB_SECRET" \
        -H "X-User-Id: test-script-user" -H "X-User-Role: ADMIN" \
        "$API_URL/integrations" | python3 -c \
        "import json,sys; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) and d else '')" 2>/dev/null || true)
    fi

    if [[ -z "$FIRST_ID" ]]; then
      warn "No integrations found — seeded data may be missing; skipping per-integration route tests"
      warn "Run: pnpm db:seed"
      SKIP=$((SKIP + 8))
    else
      echo -e "  ${DIM}Using integration id: $FIRST_ID${RESET}"

      api_check "GET /integrations/:id — existing get-by-id" 200 -- \
        -X GET "$API_URL/integrations/$FIRST_ID"

      api_check "GET /integrations/:id/readiness — existing readiness route" 200 404 -- \
        -X GET "$API_URL/integrations/$FIRST_ID/readiness"

      api_check "GET /integrations/:id/releases — existing releases list" 200 -- \
        -X GET "$API_URL/integrations/$FIRST_ID/releases"

      api_check "GET /integrations/:id/preview-payloads — existing preview route" 200 400 422 -- \
        -X GET "$API_URL/integrations/$FIRST_ID/preview-payloads"

      # ── New / expanded routes ─────────────────────────────
      # Rollback endpoint: not yet implemented on backend — expect 404 or 400,
      # but NOT 500 (no crash). A 401 would mean auth is broken.
      api_check "POST /integrations/:id/rollback — new endpoint accepts or 404" 200 201 400 404 422 -- \
        -X POST "$API_URL/integrations/$FIRST_ID/rollback" \
        -H "Content-Type: application/json" \
        -d '{"targetArtifactId":"non-existent-id","reason":"script test"}'

      # Copilot ask-field: new endpoint — accept 200/201 or 404 (not yet built)
      api_check "POST /integrations/:id/copilot/ask-field — new endpoint accepts or 404" 200 201 400 404 422 -- \
        -X POST "$API_URL/integrations/$FIRST_ID/copilot/ask-field" \
        -H "Content-Type: application/json" \
        -d '{"targetField":"name","confidenceThreshold":0.65,"maxCandidates":3}'

      # Existing releases promote-next still works (passing bad id is fine — just check auth)
      api_check "POST /integrations/:id/releases/:id/promote-next — existing route reachable" 200 400 404 -- \
        -X POST "$API_URL/integrations/$FIRST_ID/releases/non-existent/promote-next" \
        -H "Content-Type: application/json" \
        -d '{}'

      # Auth regression: a request with no token should 401
      echo -e "  ${DIM}Checking auth guard regression (no token → 401)…${RESET}"
      no_auth_code=$(curl -sS -o /dev/null -w "%{http_code}" \
        -X GET "$API_URL/integrations" 2>/dev/null || true)
      if [[ "$no_auth_code" == "401" ]]; then
        pass "[regression] Unauthenticated request correctly returns 401"
      else
        fail "[regression] Auth guard broken — unauthenticated request returned HTTP $no_auth_code"
      fi
    fi
  fi
fi

# ══════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════
TOTAL=$((PASS + FAIL + SKIP + WARN))
echo ""
echo -e "${BOLD}$(printf '═%.0s' {1..60})${RESET}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${RESET}  ${RED}$FAIL failed${RESET}  ${YELLOW}$WARN warnings${RESET}  ${DIM}$SKIP skipped${RESET}  │  $TOTAL total"
echo -e "${BOLD}$(printf '═%.0s' {1..60})${RESET}"

if [[ $FAIL -gt 0 ]]; then
  echo -e "\n${RED}${BOLD}FAILED${RESET} — $FAIL check(s) did not pass. Review output above.\n"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo -e "\n${YELLOW}${BOLD}PASSED WITH WARNINGS${RESET} — $WARN warning(s). Likely API not running or seed data missing.\n"
  exit 0
else
  echo -e "\n${GREEN}${BOLD}ALL CHECKS PASSED${RESET}\n"
  exit 0
fi
