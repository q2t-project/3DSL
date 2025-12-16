#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-public/viewer}"

echo "=== [1] lineEffects / updateLineEffects ==="
grep -RIn --exclude-dir=node_modules --exclude-dir=dist \
  -E "lineEffects|updateLineEffects|applyLineEffects" "$ROOT" || true
echo

echo "=== [2] recomputeSceneRadius (def/call) ==="
grep -RIn --exclude-dir=node_modules --exclude-dir=dist \
  -E "recomputeSceneRadius\\b" "$ROOT" || true
echo

echo "=== [3] pick / raycaster / intersect ==="
grep -RIn --exclude-dir=node_modules --exclude-dir=dist \
  -E "pickObjectAt\\b|Raycaster\\b|intersectObjects\\b|raycast\\b" "$ROOT" || true
echo

echo "=== [4] hub render loop order (applyMicroFX/applySelection/render) ==="
grep -RIn --exclude-dir=node_modules --exclude-dir=dist \
  -E "applyMicroFX\\b|applySelection\\b|applySelectionHighlight\\b|\\.render\\b|render\\(" "$ROOT/runtime" || true
echo

echo "=== [5] renderer.applyViewerSettings / viewerSettings ==="
grep -RIn --exclude-dir=node_modules --exclude-dir=dist \
  -E "applyViewerSettings\\b|viewerSettings\\b|setLineWidthMode\\b" "$ROOT/runtime" || true
echo
