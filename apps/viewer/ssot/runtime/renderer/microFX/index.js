// viewer/runtime/renderer/microFX/index.js
//
// microFX orchestrator
// - index.js ローカル sanitizePosition は削除
// - sanitizePosition は utils から import
// - config.js は microFXConfig / DEBUG_MICROFX を named export している前提

import { microFXConfig, DEBUG_MICROFX } from "./config.js";
import { normalizeIntensity, sanitizePosition, sanitizeVec3 } from "./utils.js";

import { ensureMarker, updateMarker, removeMarker } from "./marker.js";
import { ensureAxes, updateAxes, removeAxes } from "./axes.js";
import { ensureBounds, updateBounds, removeBounds } from "./bounds.js";
import { ensureGlow, updateGlow, removeGlow } from "./glow.js";
import { applyHighlight, clearHighlight } from "./highlight.js";

/**
 * 互換込みで deps を解決する。
 * 旧: applyMicroFX(scene, microState, getObjectByUuid, visibleSet, camera, intensity)
 * 新: applyMicroFX(scene, microState, { getObjectByUuid, visibleSet, camera, intensity })
 */
function resolveDeps(args) {
  const [_scene, _microState, a2, a3, a4, a5] = args;

  if (typeof a2 === "function") {
    return {
      getObjectByUuid: a2,
      visibleSet: a3 ?? null,
      camera: a4 ?? null,
      renderer: null,
      intensity: a5,
    };
  }

  if (a2 && typeof a2 === "object") {
    return {
      getObjectByUuid: typeof a2.getObjectByUuid === "function" ? a2.getObjectByUuid : null,
      visibleSet: a2.visibleSet ?? null,
      camera: a2.camera ?? null,
      renderer: a2.renderer ?? null,
      intensity: a2.intensity,
    };
  }

  return { getObjectByUuid: null, visibleSet: null, camera: null, renderer: null, intensity: undefined };
}

function logDebug(...xs) {
  if (!DEBUG_MICROFX) return;
  // eslint-disable-next-line no-console
  console.log("[microFX]", ...xs);
}

function sanitizeLocalAxes(localAxes) {
  if (!localAxes || typeof localAxes !== "object") return null;

  const origin = sanitizeVec3(localAxes.origin ?? localAxes, null);
  const xDir = sanitizeVec3(localAxes.xDir, null);
  const yDir = sanitizeVec3(localAxes.yDir, null);
  const zDir = sanitizeVec3(localAxes.zDir, null);

  const baseScale = Number(localAxes.baseScale ?? localAxes.scale ?? 1);
  const safeBaseScale = Number.isFinite(baseScale) ? baseScale : 1;

  if (!origin) return null;

  return {
    origin,
    xDir,
    yDir,
    zDir,
    baseScale: safeBaseScale,
  };
}

export function clearMicroFX(scene) {
  if (!scene) return;

  clearHighlight(scene);

  removeGlow(scene);
  removeBounds(scene);
  removeAxes(scene);
  removeMarker(scene);

  logDebug("clear");
}

export function applyMicroFX(scene, microState, ...rest) {
  if (!scene) return;

  const { getObjectByUuid, visibleSet, camera, renderer, intensity } = resolveDeps([scene, microState, ...rest]);
  const s = normalizeIntensity(intensity, 1);

  if (!microState || s <= 0) {
    clearMicroFX(scene);
    return;
  }

  // ---------------- marker / glow (focusPosition anchor) ----------------
  const focusPos = sanitizePosition(microState.focusPosition, null);

  if (focusPos) {
    const m = ensureMarker(scene);
    updateMarker(m, focusPos, s);

    if (microFXConfig.glow?.enabled !== false) {
      const g = ensureGlow(scene);
      updateGlow(g, focusPos, camera, renderer, s);
    } else {
      removeGlow(scene);
    }
  } else {
    // focusPosition 無いなら anchor 系は消す
    removeMarker(scene);
    removeGlow(scene);
  }

  // ---------------- axes / bounds (local axes/bounds) ----------------
  const localAxes = sanitizeLocalAxes(microState.localAxes);
  if (localAxes && camera) {
    const a = ensureAxes(scene);
    updateAxes(a, localAxes, camera, s);
  } else {
    removeAxes(scene);
  }

  if (microState.localBounds) {
    const b = ensureBounds(scene);
    updateBounds(b, microState.localBounds, s);
  } else {
    removeBounds(scene);
  }

  // ---------------- highlight (uuid based overlay) ----------------
  if (typeof getObjectByUuid === "function") {
    applyHighlight(scene, microState, getObjectByUuid, visibleSet, s);
  } else {
    clearHighlight(scene);
  }

  logDebug("apply", {
    s,
    focusUuid: microState.focusUuid ?? null,
    hasFocusPos: !!focusPos,
    hasLocalAxes: !!localAxes,
    hasLocalBounds: !!microState.localBounds,
  });
}
