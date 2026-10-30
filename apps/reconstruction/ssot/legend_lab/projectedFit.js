// Fit actual authored points in a fixed camera direction. The allowable screen
// rectangle can exclude controls without creating fictitious world-AABB corners.
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => {
  const length = Math.hypot(...a);
  if (!(length > 1e-9)) throw new Error('Camera direction and up must be independent.');
  return a.map((value) => value / length);
};

export function fitProjectedPoints(points, options) {
  if (!points.length || points.some((p) => p.length !== 3 || !p.every(Number.isFinite))) {
    throw new Error('Camera fitting requires finite actual points.');
  }
  const direction = unit(options.direction);
  const right = unit(cross(options.up ?? [0, 0, 1], direction));
  const up = unit(cross(direction, right));
  const { width, height, fov } = options;
  const inset = options.insets ?? { left: 0, right: 0, top: 0, bottom: 0 };
  const tangentY = Math.tan(fov * Math.PI / 360);
  const tangentX = tangentY * width / height;
  const xLow = (-1 + 2 * inset.left / width) * tangentX;
  const xHigh = (1 - 2 * inset.right / width) * tangentX;
  const yLow = (-1 + 2 * inset.bottom / height) * tangentY;
  const yHigh = (1 - 2 * inset.top / height) * tangentY;
  if (!(xLow < xHigh && yLow < yHigh)) throw new Error('Camera fitting needs a non-empty screen rectangle.');
  const projected = points.map((point) => [dot(point, right), dot(point, up), dot(point, direction)]);
  let minDepth = Infinity, maxDepth = -Infinity;
  for (const point of projected) { minDepth = Math.min(minDepth, point[2]); maxDepth = Math.max(maxDepth, point[2]); }
  const targetDepth = (minDepth + maxDepth) / 2;
  const minCameraDepth = Math.max(maxDepth + 0.5, targetDepth + (options.minDistance ?? 25));
  const maxCameraDepth = targetDepth + (options.maxDistance ?? 2500);

  // At each distance every point allows an interval of camera translations.
  // Their intersections give a perspective-correct fit, including unequal
  // top/bottom margins. Moving closer shrinks those intervals monotonically.
  function intervals(cameraDepth) {
    let left = -Infinity, rightEdge = Infinity, bottom = -Infinity, top = Infinity;
    for (const [x, y, depth] of projected) {
      const distance = cameraDepth - depth;
      if (!(distance > 0)) return null;
      left = Math.max(left, x - xHigh * distance);
      rightEdge = Math.min(rightEdge, x - xLow * distance);
      bottom = Math.max(bottom, y - yHigh * distance);
      top = Math.min(top, y - yLow * distance);
    }
    return left <= rightEdge && bottom <= top ? { x: (left + rightEdge) / 2, y: (bottom + top) / 2 } : null;
  }
  if (!intervals(maxCameraDepth)) throw new Error('The specimen exceeds the supported camera distance.');
  let low = minCameraDepth, high = maxCameraDepth;
  if (intervals(low)) high = low;
  else for (let iteration = 0; iteration < 56; iteration += 1) {
    const middle = (low + high) / 2;
    if (intervals(middle)) high = middle;
    else low = middle;
  }
  // A tiny numeric margin protects points exactly on the allowed rectangle.
  const cameraDepth = Math.min(maxCameraDepth, high + 1e-5);
  const center = intervals(cameraDepth);
  const combine = (depth) => right.map((component, i) => component * center.x + up[i] * center.y + direction[i] * depth);
  return {
    position: combine(cameraDepth), target: combine(targetDepth),
    distance: cameraDepth - targetDepth, direction, right, up,
  };
}
