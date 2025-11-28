// viewer/runtime/renderer/microFX/index.js

import { ensureMarker, updateMarker, removeMarker } from "./marker.js";
import { ensureGlow, updateGlow, removeGlow } from "./glow.js";
import { applyHighlight, clearHighlight } from "./highlight.js";
import { ensureAxes, updateAxes, removeAxes } from "./axes.js";
import {
  ensureBounds,
  updateBounds,
  removeBounds,
  setOutlineMode,
  setHandlesVisible,
} from "./bounds.js";

function sanitizeVector3(arr) {
  if (!Array.isArray(arr) || arr.length < 3) return null;
  const MAX = 1e4;
  const [x, y, z] = arr.map((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n, -MAX), MAX);
  });
  return [x, y, z];
}

function sanitizePosition(position) {
  return sanitizeVector3(position);
}

function sanitizeLocalAxes(localAxes) {
  if (!localAxes) return null;

  const origin = Array.isArray(localAxes?.origin)
    ? localAxes.origin
    : Array.isArray(localAxes)
    ? localAxes
    : null;

  const sanitizedOrigin = sanitizeVector3(origin);
  if (!sanitizedOrigin) return null;

  const sanitizedAxes = {
    origin: sanitizedOrigin,
    xDir: sanitizeVector3(localAxes?.xDir),
    yDir: sanitizeVector3(localAxes?.yDir),
    zDir: sanitizeVector3(localAxes?.zDir),
  };

  const rawScale =
    typeof localAxes?.scale === "number" ? Number(localAxes.scale) : 1;
  sanitizedAxes.baseScale = Number.isFinite(rawScale)
    ? Math.min(Math.max(rawScale, 0.01), 10)
    : 1;

  return sanitizedAxes;
}

function sanitizeLocalBounds(localBounds) {
  if (!localBounds) return null;

  const center = sanitizeVector3(localBounds.center);
  const size = sanitizeVector3(localBounds.size);

  if (!center || !size) return null;

  const minSize = Math.min(...size.map((v) => Math.abs(v)));
  if (!(minSize > 0)) return null;

  return {
    center,
    size,
    isMirror: !!localBounds.isMirror,
  };
}

/**
 * microFX のメイン入口
 * @param {THREE.Scene} scene
 * @param {object|null} microState
 * @param {object}      cameraState   // 今はほぼ未使用だが将来用
 * @param {object}      indexMaps     // { points, lines, aux, baseStyle, camera }
 */
export function applyMicroFX(scene, microState, cameraState, indexMaps) {
  if (!microState) {
    removeMarker(scene);
    removeGlow(scene);
    removeAxes(scene);
    removeBounds(scene);
    clearHighlight(scene);
    return;
  }

  const camera = indexMaps?.camera || null;

  const getObjectByUuid = (uuid) => {
    if (!uuid || !indexMaps) return null;
    const { points, lines, aux } = indexMaps;
    return (
      (points && points.get && points.get(uuid)) ||
      (lines && lines.get && lines.get(uuid)) ||
      (aux && aux.get && aux.get(uuid)) ||
      null
    );
  };

  const {
    focusPosition,
    relatedUuids,
    localAxes,
    localBounds,
    isHover,
    editing,
  } = microState;

  // --- Axes ---
  const sanitizedAxes = sanitizeLocalAxes(localAxes);
  if (sanitizedAxes && camera) {
    const axes = ensureAxes(scene);
    updateAxes(axes, sanitizedAxes, camera);
  } else {
    removeAxes(scene);
  }

  // --- Bounds ---
  const sanitizedBounds = sanitizeLocalBounds(localBounds);
  if (sanitizedBounds) {
    const bounds = ensureBounds(scene);
    updateBounds(bounds, sanitizedBounds);
    setOutlineMode(!!isHover);
    setHandlesVisible(editing === true);
  } else {
    removeBounds(scene);
  }

  // --- Marker ---
  const sanitizedFocus = sanitizePosition(focusPosition);
  if (sanitizedFocus) {
    const marker = ensureMarker(scene);
    updateMarker(marker, sanitizedFocus);
  } else {
    removeMarker(scene);
  }

  // --- Glow ---
  if (sanitizedFocus && camera) {
    const glow = ensureGlow(scene);
    updateGlow(glow, sanitizedFocus, camera);
  } else {
    removeGlow(scene);
  }

  // --- Highlight ---
  clearHighlight(scene);
  if (Array.isArray(relatedUuids) && relatedUuids.length > 0) {
    applyHighlight(scene, relatedUuids, getObjectByUuid);
  }
}

