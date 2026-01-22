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
