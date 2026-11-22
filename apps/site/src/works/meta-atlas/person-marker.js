// The synchronizer supplies the approved v1 outline GLB. This reader projects
// its single uncompressed triangle mesh into the model's existing Canvas 2D.
export const personMarkerHeight = 32;
const scale = 4; // Outline catalog scale 8 → 32, uniformly along all axes.

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
    vertices.push([positions[i] * scale, -positions[i + 2] * scale, positions[i + 1] * scale]);
  }
  return { vertices, indices };
}

export function drawPersonMarker(context, { vertices, indices }, [x, y, z], project) {
  const projected = vertices.map(([dx, dy, dz]) => project([x + dx, y + dy, z + dz]));
  context.beginPath();
  for (let i = 0; i < indices.length; i += 3) {
    const a = projected[indices[i]];
    const b = projected[indices[i + 1]];
    const c = projected[indices[i + 2]];
    if ([a, b, c].some(point => !Number.isFinite(point.z) || Math.abs(point.z) > 1)) continue;
    const clockwise = (b.x - a.x) * (c.y - a.y) > (b.y - a.y) * (c.x - a.x);
    const next = clockwise ? b : c;
    const last = clockwise ? c : b;
    context.moveTo(a.x, a.y);
    context.lineTo(next.x, next.y);
    context.lineTo(last.x, last.y);
    context.closePath();
  }
  context.fill();
  // Keep the thin catalog strokes legible on a small canvas.
  context.strokeStyle = context.fillStyle;
  context.lineWidth = .75;
  context.stroke();
}
