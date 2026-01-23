// viewer/runtime/renderer/gltf/gltfRuntime.js
//
// glTF marker support (renderer-internal)
// - Uses dynamic import because vendor/three layout differs by version.

import * as THREE from "/vendor/three/build/three.module.js";

let _gltfLoaderCtorPromise = null;

async function loadGLTFLoaderCtor() {
  if (_gltfLoaderCtorPromise) return _gltfLoaderCtorPromise;
  _gltfLoaderCtorPromise = (async () => {
    // Prefer /examples/jsm/ (this project's current vendor layout).
    try {
      const mod = await import("/vendor/three/examples/jsm/loaders/GLTFLoader.js");
      if (mod?.GLTFLoader) return mod.GLTFLoader;
    } catch (_e) {}

    // three r150+: /addons/
    try {
      const mod = await import("/vendor/three/addons/loaders/GLTFLoader.js");
      if (mod?.GLTFLoader) return mod.GLTFLoader;
    } catch (_e2) {}

    throw new Error("GLTFLoader not found in vendor/three");
  })();
  return _gltfLoaderCtorPromise;
}

export function resolveAssetUrl(rawUrl, modelUrl) {
  const u = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!u) return null;

  // NOTE:
  // - modelUrl in this project is often a root-relative path like "/_data/.../model.3dss.json".
  //   new URL(rel, "/_data/...") throws because base must be absolute.
  // - Normalize modelUrl against current location so that relative asset URLs resolve
  //   next to the model JSON (not next to /viewer/).

  const locHref = globalThis.location?.href || "";

  /** @type {string[]} */
  const baseCandidates = [];

  if (typeof modelUrl === "string") {
    const m = modelUrl.trim();
    if (m) {
      // 1) already absolute
      try {
        baseCandidates.push(new URL(m).toString());
      } catch (_e) {
        // 2) root-relative / relative -> resolve against current location
        try {
          if (locHref) baseCandidates.push(new URL(m, locHref).toString());
        } catch (_e2) {}
      }
    }
  }

  if (locHref) baseCandidates.push(locHref);

  for (const base of baseCandidates) {
    try {
      return new URL(u, base).toString();
    } catch (_e) {}
  }

  // Fallback: return as-is (may still work for absolute-ish paths)
  return u;
}

// ------------------------------------------------------------
// glTF line primitive (LINE_STRIP / LINES / LINE_LOOP) -> mesh
// - WebGL lineWidth is effectively 1px on many platforms.
// - Convert to TubeGeometry / Instanced cylinders for stable "line thickness".
// ------------------------------------------------------------

function _pickMatColorOpacity(srcMat, parser) {
  let color = 0xffffff;
  let opacity = 1;

  // Prefer glTF baseColorFactor when available (works even if downstream code tints materials).
  try {
    const assoc = parser?.associations?.get?.(srcMat);
    const idx = assoc?.materials;
    const jm = (Number.isInteger(idx) && parser?.json?.materials) ? parser.json.materials[idx] : null;
    const base = jm?.pbrMetallicRoughness?.baseColorFactor;
    if (Array.isArray(base) && base.length >= 3) {
      const r = Number(base[0]);
      const g = Number(base[1]);
      const b = Number(base[2]);
      const a = (base.length >= 4) ? Number(base[3]) : 1;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        try { color = new THREE.Color(r, g, b).getHex(); } catch (_e) {}
      }
      if (Number.isFinite(a)) opacity = Math.max(0, Math.min(1, a));
      return { color, opacity };
    }
  } catch (_e) {}

  // Fallback: three.js material fields
  try {
    if (srcMat?.color && typeof srcMat.color.getHex === "function") {
      color = srcMat.color.getHex();
    }
  } catch (_e) {}
  try {
    const o = Number(srcMat?.opacity);
    if (Number.isFinite(o)) opacity = o;
  } catch (_e) {}
  return { color, opacity };
}

function _makeBasicMaterialFrom(srcMat, parser) {
  const { color, opacity } = _pickMatColorOpacity(srcMat, parser);
  const transparent = opacity < 0.999;
  const m = new THREE.MeshBasicMaterial({ color, transparent, opacity });
  // avoid z-fighting artifacts for thin tubes
  try { m.depthWrite = false; } catch (_e) {}
  return m;
}

function _guessTubeRadius(scene, ratio = 0.0025) {
  try {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const diag = size.length();
    let r = diag * ratio;
    if (!Number.isFinite(r) || r <= 0) r = 0.01;
    r = Math.max(0.001, Math.min(10, r));
    return r;
  } catch (_e) {
    return 0.01;
  }
}

function _tubeMeshFromLine(line, radius, radialSegments = 8, parser) {
  const pos = line?.geometry?.attributes?.position;
  if (!pos || pos.count < 2) return null;

  const pts = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    pts.push(v.clone());
  }

  const path = new THREE.CurvePath();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a.distanceToSquared(b) < 1e-12) continue;
    path.add(new THREE.LineCurve3(a, b));
  }
  if (!path.curves.length) return null;

  // segments scale with polyline length (clamped)
  const tubularSegments = Math.max(2, Math.min(2048, path.curves.length * 4));
  const geo = new THREE.TubeGeometry(path, tubularSegments, radius, radialSegments, false);
  const mat = _makeBasicMaterialFrom(line.material, parser);
  const mesh = new THREE.Mesh(geo, mat);

  // preserve transform
  try {
    mesh.position.copy(line.position);
    mesh.quaternion.copy(line.quaternion);
    mesh.scale.copy(line.scale);
  } catch (_e) {}
  mesh.visible = line.visible;
  mesh.renderOrder = line.renderOrder;
  mesh.name = (line.name ? `${line.name}__tube` : "LineTube");
  mesh.userData.__fromGltfLine = true;
  return mesh;
}

function _instancedCylindersFromLineSegments(lineSeg, radius, radialSegments = 8, parser) {
  const pos = lineSeg?.geometry?.attributes?.position;
  if (!pos || pos.count < 2) return null;

  const segCount = Math.floor(pos.count / 2);
  if (segCount <= 0) return null;

  const geo = new THREE.CylinderGeometry(radius, radius, 1, radialSegments, 1, true);
  const mat = _makeBasicMaterialFrom(lineSeg.material, parser);
  const inst = new THREE.InstancedMesh(geo, mat, segCount);

  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3(1, 1, 1);
  const m4 = new THREE.Matrix4();

  for (let i = 0; i < segCount; i++) {
    p0.fromBufferAttribute(pos, i * 2);
    p1.fromBufferAttribute(pos, i * 2 + 1);

    dir.subVectors(p1, p0);
    const len = dir.length();
    if (!Number.isFinite(len) || len < 1e-9) {
      m4.identity();
      inst.setMatrixAt(i, m4);
      continue;
    }

    mid.addVectors(p0, p1).multiplyScalar(0.5);
    quat.setFromUnitVectors(yAxis, dir.normalize());
    scale.set(1, len, 1);
    m4.compose(mid, quat, scale);
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;

  // preserve transform
  try {
    inst.position.copy(lineSeg.position);
    inst.quaternion.copy(lineSeg.quaternion);
    inst.scale.copy(lineSeg.scale);
  } catch (_e) {}
  inst.visible = lineSeg.visible;
  inst.renderOrder = lineSeg.renderOrder;
  inst.name = (lineSeg.name ? `${lineSeg.name}__cyl` : "LineSegmentsCyl");
  inst.userData.__fromGltfLineSegments = true;
  return inst;
}

function _convertLinesToMeshes(scene, { radiusRatio = 0.0025, parser = null } = {}) {
  if (!scene) return;
  /** @type {any[]} */
  const targets = [];
  try {
    scene.traverse((o) => {
      if (!o) return;
      if (o.userData?.__fromGltfLine || o.userData?.__fromGltfLineSegments) return;
      if (o.isLine || o.isLineLoop || o.isLineSegments) targets.push(o);
    });
  } catch (_e) {}
  if (!targets.length) return;

  const radius = _guessTubeRadius(scene, radiusRatio);

  for (const o of targets) {
    const parent = o.parent;
    if (!parent) continue;

    let repl = null;
    if (o.isLineSegments) repl = _instancedCylindersFromLineSegments(o, radius, 8, parser);
    else repl = _tubeMeshFromLine(o, radius, 8, parser);
    if (!repl) continue;

    try {
      parent.add(repl);
      parent.remove(o);
    } catch (_e) {}
  }
}

export async function loadGltfScene(absUrl) {
  if (!absUrl) return null;
  const GLTFLoader = await loadGLTFLoaderCtor();
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(absUrl);
  const scene = gltf?.scene || gltf?.scenes?.[0] || null;
  if (!scene) return null;
  try { scene.updateMatrixWorld(true); } catch (_e) {}

  // Convert LINE_* primitives to meshes for stable thickness.
  try { _convertLinesToMeshes(scene, { radiusRatio: 0.0025, parser: gltf?.parser }); } catch (_e) {}

  return scene;
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
