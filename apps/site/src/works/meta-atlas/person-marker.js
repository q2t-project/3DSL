// The synchronizer supplies the approved v1 outline GLB. This reader projects
// its single uncompressed triangle mesh into the model's existing Canvas 2D.
export const personMarkerHeight = 16;
const meshScale = personMarkerHeight / 8;
let layer;

export async function loadPersonMarker() {
  const response = await fetch(new URL("./person.glb", import.meta.url));
  if (!response.ok) throw new Error("人物部品を読み込めません。");

  const bytes = await response.arrayBuffer();
  const header = new DataView(bytes);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) {
    throw new Error("人物部品のGLB形式が異なります。");
  }

  const jsonLength = header.getUint32(12, true);
  const mesh = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength)));
  const binaryOffset = 28 + jsonLength;
  const primitive = mesh.meshes[0].primitives[0];
  const position = mesh.accessors[primitive.attributes.POSITION];
  const index = mesh.accessors[primitive.indices];
  const byteOffset = accessor => binaryOffset +
    (mesh.bufferViews[accessor.bufferView].byteOffset ?? 0) + (accessor.byteOffset ?? 0);

  if (primitive.mode !== 4 || position.componentType !== 5126 || position.type !== "VEC3" ||
      index.componentType !== 5125 || index.type !== "SCALAR" ||
      mesh.bufferViews[position.bufferView].byteStride) {
    throw new Error("人物部品の頂点形式が異なります。");
  }

  const positions = new Float32Array(bytes, byteOffset(position), position.count * 3);
  const indices = new Uint32Array(bytes, byteOffset(index), index.count);
  const vertices = [];
  for (let i = 0; i < positions.length; i += 3) {
    // glTF Y-up, −Z facing → 3DSL Z-up, +Y facing.
    vertices.push([positions[i] * meshScale, -positions[i + 2] * meshScale, positions[i + 1] * meshScale]);
  }
  return { vertices, indices };
}

export function drawPersonMarker(context, { vertices, indices }, [x, y, z], project, scale = 1) {
  const projected = vertices.map(([dx, dy, dz]) =>
    project([x + dx * scale, y + dy * scale, z + dz * scale]));
  const ratio = context.getTransform().a;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const { x, y, z } of projected) {
    if (!Number.isFinite(z) || Math.abs(z) > 1) continue;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  // Draw fill and the thin edge into an opaque mask, then composite once.
  const pixelX = Math.max(0, Math.floor((left - 1) * ratio));
  const pixelY = Math.max(0, Math.floor((top - 1) * ratio));
  const width = Math.min(context.canvas.width, Math.ceil((right + 1) * ratio)) - pixelX;
  const height = Math.min(context.canvas.height, Math.ceil((bottom + 1) * ratio)) - pixelY;
  if (!(width > 0 && height > 0)) return;
  layer ??= document.createElement("canvas").getContext("2d");
  if (layer.canvas.width < width) layer.canvas.width = width;
  if (layer.canvas.height < height) layer.canvas.height = height;
  layer.resetTransform();
  layer.clearRect(0, 0, width, height);
  layer.setTransform(ratio, 0, 0, ratio, -pixelX, -pixelY);
  layer.fillStyle = context.fillStyle;
  layer.strokeStyle = context.fillStyle;
  layer.lineWidth = .75;
  layer.beginPath();
  for (let i = 0; i < indices.length; i += 3) {
    const a = projected[indices[i]];
    const b = projected[indices[i + 1]];
    const c = projected[indices[i + 2]];
    if ([a, b, c].some(point => !Number.isFinite(point.z) || Math.abs(point.z) > 1)) continue;
    const clockwise = (b.x - a.x) * (c.y - a.y) > (b.y - a.y) * (c.x - a.x);
    const next = clockwise ? b : c;
    const last = clockwise ? c : b;
    layer.moveTo(a.x, a.y);
    layer.lineTo(next.x, next.y);
    layer.lineTo(last.x, last.y);
    layer.closePath();
  }
  layer.fill();
  layer.stroke();
  context.drawImage(layer.canvas, 0, 0, width, height,
    pixelX / ratio, pixelY / ratio, width / ratio, height / ratio);
}
