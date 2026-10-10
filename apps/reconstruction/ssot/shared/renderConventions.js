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

export function arrowPlacement(arrow, sense) {
  const value = arrow?.placement;
  return ['end_a', 'end_b', 'both', 'none'].includes(value)
    ? value : sense === 'b_to_a' ? 'end_a' : 'end_b';
}
