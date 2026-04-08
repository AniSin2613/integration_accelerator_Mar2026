#!/usr/bin/env bash
# =============================================================
# dev-stop.sh
# Purpose : Stop the Node dev processes (API + Web)
# Stops   : NestJS API process, Next.js Web process
# Leaves  : Docker containers (Postgres, Camel Runner) running
#           so the next dev-start.sh boots faster
# Usage   : ./scripts/dev-stop.sh
# Note    : To also stop Docker containers, run dev-teardown.sh
# =============================================================

# Resolve the monorepo root regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

# --- Stop API process ---------------------------------------------------------
# Tries the PID file first, then kills anything still listening on port 4000.
if [[ -f logs/api.pid ]]; then
  kill "$(cat logs/api.pid)" 2>/dev/null && echo "API stopped." || echo "API process already gone."
  rm -f logs/api.pid
fi

API_PORT_PID="$(lsof -tiTCP:4000 -sTCP:LISTEN 2>/dev/null | head -n 1)"
if [[ -n "$API_PORT_PID" ]]; then
  kill "$API_PORT_PID" 2>/dev/null && echo "API listener on port 4000 stopped." || true
elif [[ ! -f logs/api.pid ]]; then
  echo "No API process found."
fi

# --- Stop Web process ---------------------------------------------------------
if [[ -f logs/web.pid ]]; then
  kill "$(cat logs/web.pid)" 2>/dev/null && echo "Web stopped." || echo "Web process already gone."
  rm -f logs/web.pid
fi

WEB_PORT_PID="$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | head -n 1)"
if [[ -n "$WEB_PORT_PID" ]]; then
  kill "$WEB_PORT_PID" 2>/dev/null && echo "Web listener on port 3000 stopped." || true
elif [[ ! -f logs/web.pid ]]; then
  echo "No Web process found."
fi

echo ""
echo "Node processes stopped. Docker containers are still running."
echo "Run ./scripts/dev-teardown.sh to also stop containers."
