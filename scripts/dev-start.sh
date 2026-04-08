#!/usr/bin/env bash
# =============================================================
# dev-start.sh
# Purpose : Start the full local development environment
# Starts  : Postgres + Camel Runner (Docker infra only)
#           API (NestJS) and Web (Next.js) as local Node processes
# Logs    : logs/api.log, logs/web.log  (created automatically)
# PIDs    : logs/api.pid, logs/web.pid  (used by dev-stop.sh)
# Usage   : ./scripts/dev-start.sh
# Note    : Safe to re-run — Docker is started idempotently,
#           and any previously running Node processes are replaced.
# =============================================================

set -e  # Exit immediately if any command fails

# Resolve the monorepo root regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

# Create logs directory if it doesn't exist yet
mkdir -p logs

# --- Docker: Infrastructure only (Postgres + Camel Runner) --------------------
# Rebuild camel-runner on startup because runner.sh is part of the image, not a bind mount.
# The API and Web are run as local Node processes below (faster hot-reload).
echo "Building Camel Runner image..."
docker compose -f infra/docker/docker-compose.yml build camel-runner

echo "Starting Docker infrastructure (Postgres, Camel Runner)..."
docker compose -f infra/docker/docker-compose.yml up -d postgres camel-runner

# --- Wait for Postgres to be healthy ------------------------------------------
# Polls pg_isready so the API doesn't race the database on boot.
# POSTGRES_USER defaults to 'cogniviti' to match docker-compose.yml.
echo "Waiting for Postgres to be ready..."
until docker compose -f infra/docker/docker-compose.yml exec -T postgres \
    pg_isready -U "${POSTGRES_USER:-cogniviti}" -q; do
  sleep 1
done
echo "Postgres is ready."

# --- Stop any previously running Node processes --------------------------------
# Reads PIDs saved from a previous dev-start run and also kills anything still
# listening on the expected dev ports. This avoids stale child Node processes
# surviving after their parent shell/PID has exited.
if [[ -f logs/api.pid ]]; then
  kill "$(cat logs/api.pid)" 2>/dev/null && echo "Stopped previous API process." || true
  rm -f logs/api.pid
fi

API_PORT_PID="$(lsof -tiTCP:4000 -sTCP:LISTEN 2>/dev/null | head -n 1)"
if [[ -n "$API_PORT_PID" ]]; then
  kill "$API_PORT_PID" 2>/dev/null && echo "Stopped stale API listener on port 4000." || true
fi

if [[ -f logs/web.pid ]]; then
  kill "$(cat logs/web.pid)" 2>/dev/null && echo "Stopped previous Web process." || true
  rm -f logs/web.pid
fi

WEB_PORT_PID="$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | head -n 1)"
if [[ -n "$WEB_PORT_PID" ]]; then
  kill "$WEB_PORT_PID" 2>/dev/null && echo "Stopped stale Web listener on port 3000." || true
fi

# --- API (NestJS) -------------------------------------------------------------
# Runs in the background; all output is piped to logs/api.log.
# The PID is saved so dev-stop.sh can cleanly terminate this exact process.
echo "Starting API..."
pnpm --filter @cogniviti/api dev >> logs/api.log 2>&1 &
echo $! > logs/api.pid
echo "API started (PID $(cat logs/api.pid)) — tail logs/api.log to follow"

# --- Web (Next.js) ------------------------------------------------------------
# Runs in the background; all output is piped to logs/web.log.
echo "Starting Web..."
pnpm --filter @cogniviti/web dev >> logs/web.log 2>&1 &
echo $! > logs/web.pid
echo "Web started (PID $(cat logs/web.pid)) — tail logs/web.log to follow"

echo ""
echo "Dev environment is up."
echo "  API : http://localhost:4000"
echo "  Web : http://localhost:3000"
echo ""
echo "To follow logs:"
echo "  tail -f logs/api.log"
echo "  tail -f logs/web.log"
