// /viewer/viewer_min_scene.js
// 3DSS.points / lines → three.js への最小写像

import * as THREE from "../vendor/three/build/three.module.js";

// ------------------------------------------------------------
// 共通ヘルパ：position を {x,y,z} に正規化
//   - [x,y,z] 形式でも {x,y,z} 形式でも対応
// ------------------------------------------------------------
function normalizePos(pos) {
  if (!pos) return { x: 0, y: 0, z: 0 };

  if (Array.isArray(pos)) {
    const [x = 0, y = 0, z = 0] = pos;
    return { x, y, z };
  }

  return {
    x: pos.x ?? 0,
    y: pos.y ?? 0,
    z: pos.z ?? 0,
  };
}

// ------------------------------------------------------------
// points を Sphere として配置しつつ、
// line 用に uuid → 位置 の index を返す
// ------------------------------------------------------------
export function setupPoints(core, threeDSS) {
  const { scene } = core;
  const points = Array.isArray(threeDSS.points) ? threeDSS.points : [];
  console.log("[min] points length =", points.length);

  const pointPosByUUID = new Map();

  for (const p of points) {
    const app = p.appearance || {};
    const pos = normalizePos(app.position);

    const radius = app.radius ?? 0.4;
    const colorRaw = app.color ?? "#ff5555";
    const color =
      typeof colorRaw === "string" ? new THREE.Color(colorRaw) : colorRaw;
    const opacity = app.opacity ?? 1.0;

    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, pos.z);
    scene.add(mesh);

    // 3DSS 準拠：基本は meta.uuid、念のため p.uuid もフォールバック
    const uuid = p.meta?.uuid ?? p.uuid;
    if (uuid) {
      pointPosByUUID.set(uuid, { x: pos.x, y: pos.y, z: pos.z });
    }
  }

  console.log("[min] pointPosByUUID size =", pointPosByUUID.size);
  return pointPosByUUID;
}

// ------------------------------------------------------------
// end_a / end_b を {x,y,z} に解決
//   - { ref }      → pointPosByUUID 参照
//   - { coord }    → coord を position として解釈
// ------------------------------------------------------------
function resolveEndPos(end, pointPosByUUID) {
  if (!end) return { x: 0, y: 0, z: 0 };

  if (end.ref && pointPosByUUID.has(end.ref)) {
    return pointPosByUUID.get(end.ref);
  }

  // 直指定座標（coord or position）
  const coord = end.coord ?? end.position ?? [0, 0, 0];
  return normalizePos(coord);
}

// ------------------------------------------------------------
// lines を Line として配置する
// ------------------------------------------------------------
export function setupLines(core, threeDSS, pointPosByUUID) {
  const { scene } = core;
  const lines = Array.isArray(threeDSS.lines) ? threeDSS.lines : [];
  console.log("[min] lines length =", lines.length);

  if (!lines.length) return;

  const group = new THREE.Group();
  group.name = "linesGroup(min)";
  scene.add(group);

  for (const ln of lines) {
    const app = ln.appearance || {};

    const a = resolveEndPos(app.end_a, pointPosByUUID);
    const b = resolveEndPos(app.end_b, pointPosByUUID);

    const colorRaw = app.color ?? "#ffff55";
    const color =
      typeof colorRaw === "string" ? new THREE.Color(colorRaw) : colorRaw;
    const opacity = app.opacity ?? 1.0;

    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a.x, a.y, a.z),
      new THREE.Vector3(b.x, b.y, b.z),
    ]);

    const mat = new THREE.LineBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
    });

    const line = new THREE.Line(geom, mat);
    group.add(line);
  }

  console.log("[min] lines built =", group.children.length);
}
