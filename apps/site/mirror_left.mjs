// mirror_left.mjs
// usage: node mirror_left.mjs input.gltf output.gltf
import fs from "node:fs";
import path from "node:path";

const inPath = process.argv[2];
const outPath = process.argv[3] ?? "left_mirrored.gltf";
if (!inPath) {
  console.error("usage: node mirror_left.mjs input.gltf [output.gltf]");
  process.exit(1);
}

const gltf = JSON.parse(fs.readFileSync(inPath, "utf8"));
const baseDir = path.dirname(inPath);

// ----------------------------
// buffer load / save
// ----------------------------
function decodeDataUri(uri) {
  const m = /^data:application\/octet-stream;base64,(.*)$/s.exec(uri);
  if (!m) return null;
  return Buffer.from(m[1], "base64");
}
function encodeDataUri(buf) {
  return "data:application/octet-stream;base64," + buf.toString("base64");
}
function loadBuffer0() {
  const b0 = gltf.buffers?.[0];
  if (!b0?.uri) throw new Error("buffers[0].uri missing");

  const embedded = decodeDataUri(b0.uri);
  if (embedded) return { bin: embedded, embedded: true };

  // external .bin
  const binPath = path.resolve(baseDir, b0.uri);
  return { bin: fs.readFileSync(binPath), embedded: false, binPath };
}

// ----------------------------
// accessors helpers
// ----------------------------
const TYPE_COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function getAccessorView(accIndex) {
  const acc = gltf.accessors[accIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  if (!acc || !bv) throw new Error(`bad accessor/bufferView: ${accIndex}`);
  if (acc.componentType !== 5126) throw new Error("only float32 supported");
  const comp = TYPE_COMP[acc.type];
  const stride = bv.byteStride ?? comp * 4;
  const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  return { acc, bv, comp, stride, base };
}

function flipX_Vec3(dv, accIndex) {
  const { acc, comp, stride, base } = getAccessorView(accIndex);
  if (acc.type !== "VEC3" || comp !== 3) return;

  for (let i = 0; i < acc.count; i++) {
    const off = base + i * stride;
    const x = dv.getFloat32(off + 0, true);
    dv.setFloat32(off + 0, -x, true);
  }

  // update min/max if present（POSITION向け）
  if (Array.isArray(acc.min) && Array.isArray(acc.max) && acc.min.length >= 3 && acc.max.length >= 3) {
    const minX = acc.min[0], maxX = acc.max[0];
    acc.min[0] = -maxX;
    acc.max[0] = -minX;
  }
}

function swapTriangleWindingNonIndexed(dv, accIndex) {
  // 非indexed TRIANGLES のときだけ必要（このモデルは線だけやけど保険で入れとく）
  const { acc, comp, stride, base } = getAccessorView(accIndex);
  const triCount = Math.floor(acc.count / 3);
  for (let t = 0; t < triCount; t++) {
    const i1 = 3 * t + 1;
    const i2 = 3 * t + 2;
    const off1 = base + i1 * stride;
    const off2 = base + i2 * stride;

    for (let c = 0; c < comp; c++) {
      const a = dv.getFloat32(off1 + c * 4, true);
      const b = dv.getFloat32(off2 + c * 4, true);
      dv.setFloat32(off1 + c * 4, b, true);
      dv.setFloat32(off2 + c * 4, a, true);
    }
  }
}

// ----------------------------
// main transform
// ----------------------------
const { bin, embedded } = loadBuffer0();
const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);

// 1) mesh primitives から POSITION/NORMAL を集めて X反転
const posAcc = new Set();
const norAcc = new Set();
const nonIndexedTriAttrAcc = new Set();

for (const mesh of gltf.meshes ?? []) {
  for (const prim of mesh.primitives ?? []) {
    const a = prim.attributes ?? {};
    if (a.POSITION != null) posAcc.add(a.POSITION);
    if (a.NORMAL != null) norAcc.add(a.NORMAL);

    const mode = prim.mode ?? 4;
    const hasIndices = prim.indices != null;
    if (mode === 4 && !hasIndices) {
      for (const k of Object.keys(a)) nonIndexedTriAttrAcc.add(a[k]);
    }
  }
}

for (const i of posAcc) flipX_Vec3(dv, i);
for (const i of norAcc) flipX_Vec3(dv, i); // NORMALも x 反転

// 2) 非indexed TRIANGLES があれば winding 補正（線だけなら実質スキップされる）
for (const i of nonIndexedTriAttrAcc) swapTriangleWindingNonIndexed(dv, i);

// 3) ノード変換（translation / matrix の X だけ反転）
for (const node of gltf.nodes ?? []) {
  if (Array.isArray(node.translation) && node.translation.length >= 3) {
    node.translation[0] = -node.translation[0];
  }
  if (Array.isArray(node.matrix) && node.matrix.length === 16) {
    // column-major、平行移動は [12,13,14]
    node.matrix[12] = -node.matrix[12];
  }
}

// 4) buffer 書き戻し（埋め込みなら uri 更新、外部binなら bin を上書き保存）
if (embedded) {
  gltf.buffers[0].uri = encodeDataUri(bin);
  fs.writeFileSync(outPath, JSON.stringify(gltf));
} else {
  // 外部bin形式の場合：gltf本体 + bin を出力先に合わせて保存
  const outDir = path.dirname(outPath);
  fs.mkdirSync(outDir, { recursive: true });

  // gltf側のuriはそのまま使う（同名bin前提）
  fs.writeFileSync(outPath, JSON.stringify(gltf));
  const outBinPath = path.resolve(outDir, gltf.buffers[0].uri);
  fs.writeFileSync(outBinPath, bin);
}

console.log(`wrote: ${outPath}`);
