// viewer/runtime/renderer/microFX/utils.js
//
// Utilities shared by microFX modules.
//
// NOTE:
// - This file is imported by multiple microFX modules (index/axes/bounds/marker/glow/highlight).
// - Keep it dependency-light (no core/viewerHub imports).

function _toFiniteNumber(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Clamp numeric value into [min, max]. Non-finite values fall back to min. */
export function clamp(v, min, max) {
  const x = _toFiniteNumber(v, null);
  const a = _toFiniteNumber(min, null);
  const b = _toFiniteNumber(max, null);
  if (x == null || a == null || b == null) return a ?? 0;
  if (a <= b) return Math.min(Math.max(x, a), b);
  // If bounds are inverted, still behave reasonably.
  return Math.min(Math.max(x, b), a);
}

/** Clamp numeric value into [0, 1]. */
export function clamp01(v) {
  return clamp(v, 0, 1);
}

/** Clamp scale-like value into [min, max], with safe fallback when invalid. */
export function clampScale(v, min = 0.0001, max = 1e6) {
  const x = _toFiniteNumber(v, null);
  if (x == null) return clamp(1, min, max);
  return clamp(x, min, max);
}

/** Normalize intensity into [0, 1]. Undefined/null => defaultValue. */
export function normalizeIntensity(intensity, defaultValue = 1) {
  const base = intensity == null ? defaultValue : intensity;
  const x = _toFiniteNumber(base, defaultValue);
  return clamp01(x);
}

/**
 * Sanitize a vec3-like value.
 * Accepts:
 * - [x, y, z]
 * - {x, y, z}
 * - THREE.Vector3-like objects (x,y,z)
 */
export function sanitizeVec3(raw, fallback = null) {
  const outFallback = () => {
    if (fallback == null) return null;
    if (Array.isArray(fallback) && fallback.length >= 3) {
      const x = _toFiniteNumber(fallback[0], null);
      const y = _toFiniteNumber(fallback[1], null);
      const z = _toFiniteNumber(fallback[2], null);
      return x == null || y == null || z == null ? null : [x, y, z];
    }
    if (typeof fallback === "object") {
      const x = _toFiniteNumber(fallback.x, null);
      const y = _toFiniteNumber(fallback.y, null);
      const z = _toFiniteNumber(fallback.z, null);
      return x == null || y == null || z == null ? null : [x, y, z];
    }
    return null;
  };

  if (raw == null) return outFallback();

  if (Array.isArray(raw) && raw.length >= 3) {
    const x = _toFiniteNumber(raw[0], null);
    const y = _toFiniteNumber(raw[1], null);
    const z = _toFiniteNumber(raw[2], null);
    if (x == null || y == null || z == null) return outFallback();
    return [x, y, z];
  }

  if (typeof raw === "object") {
    const x = _toFiniteNumber(raw.x, null);
    const y = _toFiniteNumber(raw.y, null);
    const z = _toFiniteNumber(raw.z, null);
    if (x == null || y == null || z == null) return outFallback();
    return [x, y, z];
  }

  return outFallback();
}

/** Sanitize a position vec3 (alias of sanitizeVec3 for readability). */
export function sanitizePosition(raw, fallback = null) {
  return sanitizeVec3(raw, fallback);
}

/**
 * Convert a screen size in pixels to a world size (in the viewer's unitless world).
 *
 * For a perspective camera:
 *   worldHeightAtDist = 2 * dist * tan(fov/2)
 *   worldPerPx = worldHeightAtDist / viewportHeightPx
 *
 * For an orthographic camera:
 *   worldHeight = top - bottom
 *   worldPerPx = worldHeight / viewportHeightPx
 */
export function worldSizeFromScreenPx(camera, viewportHeightPx, screenPx, distance) {
  const viewH = _toFiniteNumber(viewportHeightPx, 0);
  const px = _toFiniteNumber(screenPx, 0);
  const dist = _toFiniteNumber(distance, 1);
  if (!camera || viewH <= 0 || px <= 0) return 1;

  // Perspective
  const isPerspective = !!(camera.isPerspectiveCamera || ("fov" in camera));
  if (isPerspective) {
    const fovDeg = _toFiniteNumber(camera.fov, null);
    if (fovDeg != null) {
      const fovRad = (fovDeg * Math.PI) / 180;
      const worldH = 2 * dist * Math.tan(fovRad / 2);
      const perPx = worldH / viewH;
      const w = perPx * px;
      return Number.isFinite(w) && w > 0 ? w : 1;
    }
  }

  // Orthographic
  if ("top" in camera && "bottom" in camera) {
    const top = _toFiniteNumber(camera.top, null);
    const bottom = _toFiniteNumber(camera.bottom, null);
    if (top != null && bottom != null) {
      const worldH = Math.abs(top - bottom) || 1;
      const perPx = worldH / viewH;
      const w = perPx * px;
      return Number.isFinite(w) && w > 0 ? w : 1;
    }
  }

  // Fallback
  return 1;
}
