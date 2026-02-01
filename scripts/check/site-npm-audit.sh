#!/usr/bin/env bash
set -euo pipefail

# Audit helper focusing on runtime deps.
# Note: `npm audit` reports dev-toolchain advisories too (language servers, etc.).
# For production risk tracking, we use `--omit=dev`.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR/apps/site"

npm audit --omit=dev "$@"
