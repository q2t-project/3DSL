// Read-only rendering conventions shared by Modeler and Viewer.
// A declared text size is a model-space height, never a texture-pixel count.
export function lineCaptionStyle(captionText) {
  const c = captionText && typeof captionText === 'object' ? captionText : {};
  const size = Number(c.font_size ?? c.size);
  const worldSize = Number.isFinite(size) && size > 0 ? size : 8;
  return {
    worldSize,
    // Small authored text still needs enough raster pixels to remain legible.
    fontSize: Math.max(24, Math.min(64, worldSize * 8)),
    pose: c.pose ?? { front: [0, 1, 0], up: [0, 0, 1] },
    align: typeof c.align === 'string' ? c.align : '',
  };
}

export function plateRenderSpec(plate) {
  const p = plate && typeof plate === 'object' ? plate : {};
  const size = Array.isArray(p.size) && p.size.length === 2 && p.size.every(v => Number.isFinite(v) && v >= 0)
    ? [...p.size] : [32, 32];
  const position = Array.isArray(p.position) && p.position.length === 3 && p.position.every(Number.isFinite)
    ? [...p.position] : [0, 0, 0];
  const plane = ['xy', 'yz', 'zx'].includes(p.plane) ? p.plane : 'xy';
  return { size, position, plane };
}

const surfaceAxes = { xy: [0, 1], xz: [0, 2], yz: [1, 2] };

export function surfacePoint(appearance, uv) {
  const axes = Object.hasOwn(surfaceAxes, appearance?.plane) ? surfaceAxes[appearance.plane] : null;
  const position = appearance?.position;
  const size = appearance?.size;
  if (!axes || !Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)
      || !Array.isArray(size) || size.length !== 2 || !size.every(v => Number.isFinite(v) && v > 0)
      || !Array.isArray(uv) || uv.length !== 2 || !uv.every(v => Number.isFinite(v) && v >= 0 && v <= 1)) return null;
  const point = [...position];
  point[axes[0]] += (uv[0] - 0.5) * size[0];
  point[axes[1]] += (uv[1] - 0.5) * size[1];
  return point;
}

export function surfaceUV(appearance, point) {
  const center = surfacePoint(appearance, [0.5, 0.5]);
  if (!center || !Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) return null;
  return surfaceAxes[appearance.plane].map((axis, index) => {
    const value = (point[axis] - center[axis]) / appearance.size[index] + 0.5;
    return Number(Math.min(1, Math.max(0, value)).toFixed(6));
  });
}

export function surfaceHatchSegments(appearance) {
  if (appearance?.pattern !== 'hatch' || !surfacePoint(appearance, [0, 0])) return [];
  const segments = [];
  for (let step = -7; step <= 7; step += 1) {
    const offset = step / 8;
    segments.push([
      surfacePoint(appearance, [Math.max(0, -offset), Math.max(0, offset)]),
      surfacePoint(appearance, [1 - Math.max(0, offset), 1 - Math.max(0, -offset)]),
    ]);
  }
  return segments;
}

export function arrowPlacement(arrow, sense) {
  const value = arrow?.placement;
  return ['end_a', 'end_b', 'both', 'none'].includes(value)
    ? value : sense === 'b_to_a' ? 'end_a' : 'end_b';
}
