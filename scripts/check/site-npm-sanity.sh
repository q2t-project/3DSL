#!/usr/bin/env bash
set -euo pipefail

# Linux/macOS equivalent of scripts/check/site-npm-sanity.cmd
# - root must remain npm-free
# - apps/site must have its own lockfile without workspace ".." links

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITE_LOCK="$ROOT_DIR/apps/site/package-lock.json"

bash "$ROOT_DIR/scripts/check/no-root-npm.sh" >/dev/null

if [ ! -f "$SITE_LOCK" ]; then
  echo "NG: missing $SITE_LOCK" >&2
  exit 1
fi

# Fail if lockfile contains relative paths to repo root (common when npm workspaces leak in)
if grep -nE '"(\.\./)+' "$SITE_LOCK" >/dev/null; then
  echo "NG: apps/site/package-lock.json contains relative path links (workspace contamination)." >&2
  echo "    Fix: run 'npm --prefix apps/site ci' (NOT root npm install), then re-run this check." >&2
  exit 1
fi

echo "OK: site npm sanity"
