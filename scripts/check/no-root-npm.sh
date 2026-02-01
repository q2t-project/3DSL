#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Root of this monorepo must stay "tooling-free".
# Running npm/yarn/pnpm/bun at repo root creates lockfiles or node_modules that
# break SSOT sync and leads to "it works on my machine" drift.
bad=(
  package.json
  package-lock.json
  npm-shrinkwrap.json
  node_modules
  yarn.lock
  pnpm-lock.yaml
  bun.lock
  bun.lockb
)
found=()
for f in "${bad[@]}"; do
  if [[ -e "$repo_root/$f" ]]; then
    found+=("$f")
  fi
done

if (( ${#found[@]} > 0 )); then
  echo "Root must be npm-free. Found: ${found[*]}" >&2
  exit 1
fi

echo "OK: root is npm-free"
