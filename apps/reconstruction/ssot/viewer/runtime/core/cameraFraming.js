// Numerical guards only. The reading distance comes from the rendered work and viewport.
export const MIN_DISTANCE = 1e-9;
export const MAX_DISTANCE = Number.MAX_SAFE_INTEGER;

export function readingBounds(layout) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  function include(point) {
    if (point?.length !== 3 || !point.every(Number.isFinite)) return;
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], point[i]);
      max[i] = Math.max(max[i], point[i]);
    }
  }
  for (const point of layout?.geometry ?? []) include(point);
  for (const label of layout?.labels ?? []) {
    for (const corner of label.corners ?? []) include(corner);
  }
  return Number.isFinite(min[0]) ? { min, max } : null;
}

// Fit the eight world-space corners in the existing orbit, including depth.
// A long vertical line on a phone should be allowed to use the full height.
export function fitReadingBounds(bounds, camera, width, height) {
  if (!bounds || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const { min, max } = bounds;
  const half = max.map((v, i) => (v - min[i]) / 2);
  const center = half.map((v, i) => min[i] + v);
  if (!center.every(value => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)) return null;
  const { theta, phi, fov } = camera;
  const tanY = Math.tan(fov * Math.PI / 360);
  const tanX = tanY * width / height;
  if (!(tanX > 0 && tanY > 0)) return null;
  const sinT = Math.sin(theta), cosT = Math.cos(theta);
  const sinP = Math.sin(phi), cosP = Math.cos(phi);
  const radius = Math.hypot(...half);
  // A position without any drawable extent has no natural magnification.
  let distance = radius > 0 ? MIN_DISTANCE : camera.distance;
  for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of [-half[2], half[2]]) {
    const radial = x * cosT + y * sinT;
    const depth = radial * sinP + z * cosP;
    const right = y * cosT - x * sinT;
    const up = z * sinP - radial * cosP;
    distance = Math.max(distance, depth + Math.max(radius * 0.05,
      1.15 * Math.abs(right) / tanX, 1.15 * Math.abs(up) / tanY));
  }
  if (!Number.isFinite(distance) || distance > MAX_DISTANCE) return null;
  return { ...camera, distance, target: { x: center[0], y: center[1], z: center[2] } };
}
