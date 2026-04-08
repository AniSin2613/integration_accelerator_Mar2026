#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify-preview-compile] Building Camel package"
pnpm --filter @cogniviti/camel build

echo "[verify-preview-compile] Type-checking API"
npx tsc --noEmit -p apps/api/tsconfig.json

echo "[verify-preview-compile] Type-checking Web"
npx tsc --noEmit -p apps/web/tsconfig.json