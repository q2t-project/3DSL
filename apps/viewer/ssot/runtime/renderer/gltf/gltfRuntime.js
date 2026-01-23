// viewer/runtime/renderer/gltf/gltfRuntime.js
//
// glTF marker support (renderer-internal)
// - Uses dynamic import because vendor/three layout differs by version.

import * as THREE from "/vendor/three/build/three.module.js";

let _gltfLoaderCtorPromise = null;

async function loadGLTFLoaderCtor() {
  if (_gltfLoaderCtorPromise) return _gltfLoaderCtorPromise;
  _gltfLoaderCtorPromise = (async () => {
    // three r150+: /addons/
    try {
      const mod = await import("/vendor/three/addons/loaders/GLTFLoader.js");
      if (mod?.GLTFLoader) return mod.GLTFLoader;
    } catch (_e) {}

    // older vendor layout: /examples/jsm/
    const mod = await import("/vendor/three/examples/jsm/loaders/GLTFLoader.js");
    if (!mod?.GLTFLoader) throw new Error("GLTFLoader not found in vendor/three");
    return mod.GLTFLoader;
  })();
  return _gltfLoaderCtorPromise;
}

export function resolveAssetUrl(rawUrl, modelUrl) {
  const u = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!u) return null;

  // If rawUrl is already absolute, URL() will keep it.
  const baseCandidates = [];
  if (typeof modelUrl === "string" && modelUrl.trim()) baseCandidates.push(modelUrl.trim());
  baseCandidates.push(globalThis.location?.href || "");

  for (const base of baseCandidates) {
    try {
      const abs = new URL(u, base);
      return abs.toString();
    } catch (_e) {}
  }

  // Fallback: return as-is (may still work for absolute-ish paths)
  return u;
}

export async function loadGltfScene(absUrl) {
  if (!absUrl) return null;
  const GLTFLoader = await loadGLTFLoaderCtor();
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(absUrl);
  const scene = gltf?.scene || gltf?.scenes?.[0] || null;
  if (!scene) return null;
  try { scene.updateMatrixWorld(true); } catch (_e) {}

  // If the glTF contains line primitives, convert them into tube meshes.
  // WebGL line widths are not reliable across platforms; mesh-based tubes are.
  try { convertGltfLinesToTubes(scene); } catch (_e) {}

  return scene;
}

function _readPolylinePointsFromGeometry(geo) {
  if (!geo) return [];
  const pos = geo.getAttribute?.("position") || null;
  if (!pos || typeof pos.count !== "number" || pos.count <= 0) return [];

  const pts = [];
  const idx = geo.index || null;
  if (idx && idx.array && typeof idx.count === "number") {
    const a = idx.array;
    for (let k = 0; k < idx.count; k++) {
      const i = a[k];
      pts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
  } else {
    for (let i = 0; i < pos.count; i++) {
      pts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
  }

  // Dedup consecutive points (degenerate segments make TubeGeometry unstable)
  const out = [];
  let prev = null;
  for (const p of pts) {
    if (!prev || p.distanceToSquared(prev) > 1e-12) out.push(p);
    prev = p;
  }
  return out;
}

function _computeWorldBoundsOfLines(root) {
  const box = new THREE.Box3();
  const wp = new THREE.Vector3();
  let has = false;
  root.traverse?.((o) => {
    if (!o) return;
    if (!o.isLine && !o.isLineSegments && !o.isLineLoop) return;
    const geo = o.geometry || null;
    const pts = _readPolylinePointsFromGeometry(geo);
    if (pts.length < 2) return;
    for (const p of pts) {
      wp.copy(p).applyMatrix4(o.matrixWorld);
      if (!has) { box.set(wp, wp); has = true; }
      else box.expandByPoint(wp);
    }
  });
  return has ? box : null;
}

function _createBasicFromLineMaterial(lineMat) {
  const col = (lineMat?.color && typeof lineMat.color.getHex === "function")
    ? lineMat.color.getHex()
    : 0xffffff;
  const op = Number(lineMat?.opacity);
  const opacity = Number.isFinite(op) ? op : 1;
  const transparent = opacity < 1;
  return new THREE.MeshBasicMaterial({
    color: col,
    transparent,
    opacity,
    depthWrite: !transparent,
  });
}

function _replaceObject(parent, oldObj, newObj) {
  if (!parent || !oldObj || !newObj) return;
  // Preserve transforms / visibility / layers.
  newObj.name = oldObj.name;
  newObj.visible = oldObj.visible;
  try { newObj.layers.mask = oldObj.layers.mask; } catch (_e) {}

  newObj.position.copy(oldObj.position);
  newObj.quaternion.copy(oldObj.quaternion);
  newObj.scale.copy(oldObj.scale);
  newObj.matrixAutoUpdate = oldObj.matrixAutoUpdate;
  if (!newObj.matrixAutoUpdate) {
    try { newObj.matrix.copy(oldObj.matrix); } catch (_e) {}
  }
  try { newObj.renderOrder = oldObj.renderOrder; } catch (_e) {}
  try { newObj.userData = { ...(oldObj.userData || {}), __tubeifiedFromLine: true }; } catch (_e) {}

  parent.add(newObj);
  parent.remove(oldObj);
}

function _polylineToTubeMesh(lineObj, radiusWorld, { radialSegments = 8, closed = false } = {}) {
  const geo = lineObj?.geometry || null;
  const pts = _readPolylinePointsFromGeometry(geo);
  if (pts.length < 2) return null;

  // Convert desired world-space radius into local-space radius
  const ws = new THREE.Vector3(1, 1, 1);
  try { lineObj.getWorldScale(ws); } catch (_e) {}
  const s = (ws.x + ws.y + ws.z) / 3;
  const radiusLocal = radiusWorld / (Number.isFinite(s) && s > 1e-9 ? s : 1);

  // Keep corners straight (no smoothing)
  const path = new THREE.CurvePath();
  for (let i = 0; i < pts.length - 1; i++) {
    path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  }
  if (closed) {
    path.add(new THREE.LineCurve3(pts[pts.length - 1], pts[0]));
  }

  const segEdges = closed ? pts.length : (pts.length - 1);
  const tubularSegments = Math.min(512, Math.max(8, segEdges * 8));
  const tubeGeo = new THREE.TubeGeometry(path, tubularSegments, radiusLocal, radialSegments, !!closed);
  const mat = _createBasicFromLineMaterial(lineObj.material);
  const mesh = new THREE.Mesh(tubeGeo, mat);
  return mesh;
}

function _lineSegmentsToCylinders(lineObj, radiusWorld, { radialSegments = 8 } = {}) {
  const geo = lineObj?.geometry || null;
  const pos = geo?.getAttribute?.("position") || null;
  if (!pos || pos.count < 2) return null;

  // Convert desired world-space radius into local-space radius
  const ws = new THREE.Vector3(1, 1, 1);
  try { lineObj.getWorldScale(ws); } catch (_e) {}
  const s = (ws.x + ws.y + ws.z) / 3;
  const radiusLocal = radiusWorld / (Number.isFinite(s) && s > 1e-9 ? s : 1);

  const group = new THREE.Group();
  const mat = _createBasicFromLineMaterial(lineObj.material);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();

  const makeCylinder = (len) => new THREE.CylinderGeometry(radiusLocal, radiusLocal, len, radialSegments);

  // If indexed, interpret indices as pairs; else use position order.
  const idx = geo.index || null;
  const indices = (idx && idx.array && typeof idx.count === "number") ? idx.array : null;
  const icount = (idx && typeof idx.count === "number") ? idx.count : 0;
  const segCount = indices ? Math.floor(icount / 2) : Math.floor(pos.count / 2);

  for (let sidx = 0; sidx < segCount; sidx++) {
    const i0 = indices ? indices[sidx * 2] : (sidx * 2);
    const i1 = indices ? indices[sidx * 2 + 1] : (sidx * 2 + 1);
    a.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
    b.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
    const len = a.distanceTo(b);
    if (!(len > 1e-9)) continue;
    mid.copy(a).add(b).multiplyScalar(0.5);
    dir.copy(b).sub(a).normalize();
    q.setFromUnitVectors(up, dir);

    const cyl = new THREE.Mesh(makeCylinder(len), mat);
    cyl.position.copy(mid);
    cyl.quaternion.copy(q);
    group.add(cyl);
  }

  return group;
}

function convertGltfLinesToTubes(root, {
  radiusRatio = 0.0025,
  minRadius = 0.001,
  maxRadius = 10,
  radialSegments = 8,
} = {}) {
  if (!root) return;

  // Determine a stable "world" radius based on overall bounds of line primitives.
  const bounds = _computeWorldBoundsOfLines(root);
  if (!bounds) return;
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const diag = size.length();
  if (!(diag > 0)) return;
  const radiusWorld = Math.max(minRadius, Math.min(maxRadius, diag * radiusRatio));

  /** @type {THREE.Object3D[]} */
  const targets = [];
  root.traverse?.((o) => {
    if (!o) return;
    if (o.isLine || o.isLineSegments || o.isLineLoop) targets.push(o);
  });

  for (const lineObj of targets) {
    const parent = lineObj.parent;
    if (!parent) continue;

    let repl = null;
    if (lineObj.isLineSegments) {
      repl = _lineSegmentsToCylinders(lineObj, radiusWorld, { radialSegments });
    } else {
      repl = _polylineToTubeMesh(lineObj, radiusWorld, { radialSegments, closed: !!lineObj.isLineLoop });
    }

    if (!repl) continue;
    _replaceObject(parent, lineObj, repl);
  }

  try { root.updateMatrixWorld(true); } catch (_e) {}
}

function cloneMaterial(mat) {
  if (!mat) return mat;
  try { return mat.clone(); } catch (_e) { return mat; }
}

export function cloneGltfScene(scene, { cloneMaterials = true } = {}) {
  if (!scene) return null;
  const root = scene.clone(true);
  if (!cloneMaterials) return root;

  try {
    root.traverse((o) => {
      if (!o || !o.isMesh) return;
      const m = o.material;
      if (Array.isArray(m)) o.material = m.map(cloneMaterial);
      else o.material = cloneMaterial(m);
    });
  } catch (_e) {}

  return root;
}

export function applyEulerYawPitchRoll(obj, ypr) {
  if (!obj) return;
  const a = Array.isArray(ypr) ? ypr : null;
  const yaw = Number(a?.[0]);
  const pitch = Number(a?.[1]);
  const roll = Number(a?.[2]);
  const y = Number.isFinite(yaw) ? yaw : 0;
  const x = Number.isFinite(pitch) ? pitch : 0;
  const z = Number.isFinite(roll) ? roll : 0;
  try { obj.rotation.order = "YXZ"; } catch (_e) {}
  try { obj.rotation.set(x, y, z); } catch (_e) {}
}

export function applyScaleVec3(obj, scale) {
  if (!obj) return;
  const a = Array.isArray(scale) ? scale : null;
  const sx = Number(a?.[0]);
  const sy = Number(a?.[1]);
  const sz = Number(a?.[2]);
  obj.scale.set(
    Number.isFinite(sx) ? sx : 1,
    Number.isFinite(sy) ? sy : 1,
    Number.isFinite(sz) ? sz : 1,
  );
}

export function applyOffsetVec3(obj, offset) {
  if (!obj) return;
  const a = Array.isArray(offset) ? offset : null;
  const ox = Number(a?.[0]);
  const oy = Number(a?.[1]);
  const oz = Number(a?.[2]);
  obj.position.set(
    Number.isFinite(ox) ? ox : 0,
    Number.isFinite(oy) ? oy : 0,
    Number.isFinite(oz) ? oz : 0,
  );
}

export function applyEmissiveFlagToMaterial(mat, colorHex, enabled) {
  if (!mat) return;
  if (!enabled) return;
  try {
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
  } catch (_e) {}
  // If the material supports emissive, set it too.
  try {
    if (mat.emissive && typeof mat.emissive.set === "function") {
      mat.emissive.set(colorHex);
      if ("emissiveIntensity" in mat) mat.emissiveIntensity = 1.0;
    }
  } catch (_e) {}
}
