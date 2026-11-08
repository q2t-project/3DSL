// A deterministic GLB with an embedded RGBA PNG. Shared by the isolated benchmark and the opt-in device check.
import { crc32, deflateSync } from 'node:zlib';

function png(width) {
  const chunk = (label, bytes) => {
    const data = Buffer.concat([Buffer.from(label), bytes]);
    const record = Buffer.alloc(data.length + 8);
    record.writeUInt32BE(bytes.length);
    data.copy(record, 4);
    record.writeUInt32BE(crc32(data), record.length - 4);
    return record;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(width, 4);
  header[8] = 8; header[9] = 6;
  const stride = width * 4 + 1;
  const pixels = Buffer.alloc(stride * width);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    pixels.writeUInt32BE(((x >> 4) + (y >> 4)) % 2 ? 0x268881ff : 0xd8d2a0ff, y * stride + 1 + x * 4);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
const pad = (buffer, byte = 0) => Buffer.concat([buffer, Buffer.alloc((4 - buffer.length % 4) % 4, byte)]);

export function texturedGrid(cells, width) {
  const stride = cells + 1, n = stride ** 2;
  const positions = Buffer.alloc(n * 12), uv = Buffer.alloc(n * 8);
  const indices = Buffer.alloc(cells ** 2 * 6 * 4);
  let next = 0;
  for (let y = 0; y < stride; y++) for (let x = 0; x < stride; x++) {
    const i = y * stride + x;
    positions.writeFloatLE(x / cells * 6 - 3, i * 12);
    positions.writeFloatLE(y / cells * 6 - 3, i * 12 + 4);
    uv.writeFloatLE(x / cells, i * 8); uv.writeFloatLE(y / cells, i * 8 + 4);
    if (x < cells && y < cells) {
      for (const index of [i, i + 1, i + stride, i + 1, i + stride + 1, i + stride]) {
        indices.writeUInt32LE(index, next); next += 4;
      }
    }
  }
  const buffers = [positions, uv, indices, png(width)];
  let offset = 0;
  const views = buffers.map(bytes => {
    const view = {buffer: 0, byteOffset: offset, byteLength: bytes.length};
    offset += pad(bytes).length;
    return view;
  });
  const bin = Buffer.concat(buffers.map(bytes => pad(bytes)));
  const asset = { asset: { version: '2.0' }, buffers: [{byteLength: bin.length}], bufferViews: views,
    accessors: [{bufferView: 0, componentType: 5126, count: n, type: 'VEC3', min: [-3,-3,0], max: [3,3,0]},
      {bufferView: 1, componentType: 5126, count: n, type: 'VEC2'},
      {bufferView: 2, componentType: 5125, count: indices.length / 4, type: 'SCALAR'}],
    images: [{bufferView: 3, mimeType: 'image/png'}], textures: [{source: 0}],
    materials: [{doubleSided: true, pbrMetallicRoughness: {baseColorTexture: {index: 0}},
      extensions: {KHR_materials_unlit: {}}}], extensionsUsed: ['KHR_materials_unlit'],
    meshes: [{primitives: [{attributes: {POSITION: 0, TEXCOORD_0: 1}, indices: 2, material: 0}]}],
    nodes: [{mesh: 0}], scenes: [{nodes: [0]}], scene: 0 };
  const json = pad(Buffer.from(JSON.stringify(asset)), 32);
  const header = Buffer.alloc(12);
  header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8);
  const block = (name, bytes) => {
    const h = Buffer.alloc(8); h.writeUInt32LE(bytes.length); h.write(name, 4, 'ascii');
    return Buffer.concat([h, bytes]);
  };
  return Buffer.concat([header, block('JSON',json), block('BIN\0',bin)]);
}
