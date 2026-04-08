#!/usr/bin/env bash

set -euo pipefail

RUNNER_URL="${CAMEL_RUNNER_URL:-http://127.0.0.1:8080}"
RUNNER_SECRET="${CAMEL_RUNNER_SECRET:-dev_runner_secret}"

echo "[verify-preview-runtime] Checking camel-runner health at ${RUNNER_URL}/health"
curl -fsS "${RUNNER_URL}/health" >/dev/null

echo "[verify-preview-runtime] Checking camel-runner preview endpoint at ${RUNNER_URL}/preview-run"
status_code=$(curl -sS -o /tmp/cb-preview-runtime-check.out -w "%{http_code}" \
  -H "X-Runner-Secret: ${RUNNER_SECRET}" \
  -H 'Content-Type: application/json' \
  -d '{}' \
  "${RUNNER_URL}/preview-run")

if [[ "${status_code}" == "404" ]]; then
  echo "[verify-preview-runtime] preview-run endpoint is missing (404)"
  echo "[verify-preview-runtime] Re-run ./scripts/dev-start.sh to rebuild and restart camel-runner."
  cat /tmp/cb-preview-runtime-check.out
  exit 1
fi

if [[ "${status_code}" == "401" ]]; then
  echo "[verify-preview-runtime] preview-run endpoint rejected auth; check CAMEL_RUNNER_SECRET"
  cat /tmp/cb-preview-runtime-check.out
  exit 1
fi

echo "[verify-preview-runtime] preview-run endpoint reachable (HTTP ${status_code})"
cat /tmp/cb-preview-runtime-check.out