#!/usr/bin/env bash
# =============================================================
# dev-teardown.sh
# Purpose : Full shutdown — stop Node processes AND Docker containers
# Stops   : NestJS API, Next.js Web, Postgres, Camel Runner
# Removes : Docker containers (volumes are intentionally preserved)
# Usage   : ./scripts/dev-teardown.sh
# Note    : Database data is safe — the postgres_data Docker volume
#           is NOT removed. Run dev-start.sh to bring everything back.
# =============================================================

set -e  # Exit immediately if any command fails

# Resolve the monorepo root regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

# --- Stop Node processes first ------------------------------------------------
# Same logic as dev-stop.sh — terminate by PID file, fall back to pkill.
echo "Stopping Node processes..."

if [[ -f logs/api.pid ]]; then
  kill "$(cat logs/api.pid)" 2>/dev/null && echo "API stopped." || echo "API process already gone."
  rm -f logs/api.pid
else
  pkill -f "pnpm.*@cogniviti/api" 2>/dev/null && echo "API stopped (via pkill)." || echo "No API process found."
fi

if [[ -f logs/web.pid ]]; then
  kill "$(cat logs/web.pid)" 2>/dev/null && echo "Web stopped." || echo "Web process already gone."
  rm -f logs/web.pid
else
  pkill -f "next dev" 2>/dev/null && echo "Web stopped (via pkill)." || echo "No Web process found."
fi

# --- Stop and remove Docker containers ----------------------------------------
# Runs 'docker compose down' to stop and remove all containers defined in the
# compose file. --remove-orphans cleans up any leftover containers not currently
# in the compose configuration.
# Docker named volumes (postgres_data, camel_routes) are NOT removed here —
# add --volumes to this command only if you want to wipe the database.
echo "Stopping Docker containers..."
docker compose -f infra/docker/docker-compose.yml down --remove-orphans
echo "Containers stopped and removed."

echo ""
echo "Full teardown complete. Run ./scripts/dev-start.sh to restart."
