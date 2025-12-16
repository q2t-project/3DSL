// viewer/runtime/renderer/baseStyle.js
import * as THREE from "../../../vendor/three/build/three.module.js";

/**
 * material のスナップショット（単体）
 * ここで戻したい属性だけ持つ（増やしたければここに足す）
 */
function snapshotMaterialOne(mat) {
  if (!mat) return null;

  return {
    // color は無い material もある
    hasColor: !!mat.color,
    color: mat.color ? mat.color.clone() : null,

    opacity: typeof mat.opacity === "number" ? mat.opacity : undefined,
    transparent: typeof mat.transparent === "boolean" ? mat.transparent : undefined,

    depthWrite: typeof mat.depthWrite === "boolean" ? mat.depthWrite : undefined,
    depthTest: typeof mat.depthTest === "boolean" ? mat.depthTest : undefined,

    linewidth: typeof mat.linewidth === "number" ? mat.linewidth : undefined,

    // dashed offset（どっち系でも戻せるように）
    dashOffset:
      typeof mat.dashOffset === "number"
        ? mat.dashOffset
        : mat.uniforms?.dashOffset && typeof mat.uniforms.dashOffset.value === "number"
          ? mat.uniforms.dashOffset.value
          : undefined,
  };
}

function applyMaterialOne(mat, snap) {
  if (!mat || !snap) return;

  if (snap.hasColor && mat.color && snap.color) {
    mat.color.copy(snap.color);
  }

  if (typeof snap.opacity === "number") mat.opacity = snap.opacity;
  if (typeof snap.transparent === "boolean") mat.transparent = snap.transparent;

  if (typeof snap.depthWrite === "boolean") mat.depthWrite = snap.depthWrite;
  if (typeof snap.depthTest === "boolean") mat.depthTest = snap.depthTest;

  if (typeof snap.linewidth === "number" && typeof mat.linewidth === "number") {
    mat.linewidth = snap.linewidth;
  }

  if (typeof snap.dashOffset === "number") {
    if (typeof mat.dashOffset === "number") {
      mat.dashOffset = snap.dashOffset;
    } else if (mat.uniforms?.dashOffset) {
      mat.uniforms.dashOffset.value = snap.dashOffset;
    }
  }

  // 変更検知が必要な material もあるので、保険で
  mat.needsUpdate = true;
}

function snapshotMaterial(matOrArray) {
  if (!matOrArray) return null;
  if (Array.isArray(matOrArray)) {
    return matOrArray.map(snapshotMaterialOne);
  }
  return snapshotMaterialOne(matOrArray);
}

function applyMaterial(matOrArray, snap) {
  if (!matOrArray || !snap) return;
  if (Array.isArray(matOrArray)) {
    if (!Array.isArray(snap)) return;
    const n = Math.min(matOrArray.length, snap.length);
    for (let i = 0; i < n; i++) applyMaterialOne(matOrArray[i], snap[i]);
    return;
  }
  if (Array.isArray(snap)) return;
  applyMaterialOne(matOrArray, snap);
}

function snapshotHalo(halo) {
  if (!halo) return null;
  const matSnap = snapshotMaterial(halo.material);
  const scaleSnap = halo.scale ? halo.scale.clone() : new THREE.Vector3(1, 1, 1);

  // baseOpacity / baseScale は userData にも保持する運用に合わせる
  const baseOpacity =
    typeof halo.userData?.baseOpacity === "number"
      ? halo.userData.baseOpacity
      : (halo.material && typeof halo.material.opacity === "number" ? halo.material.opacity : 1);

  const baseScale =
    halo.userData?.baseScale?.clone
      ? halo.userData.baseScale.clone()
      : scaleSnap.clone();

  return {
    material: matSnap,
    renderOrder: typeof halo.renderOrder === "number" ? halo.renderOrder : 0,
    scale: scaleSnap,
    baseOpacity,
    baseScale,
  };
}

function applyHalo(halo, snap) {
  if (!halo || !snap) return;

  applyMaterial(halo.material, snap.material);

  if (typeof snap.renderOrder === "number") halo.renderOrder = snap.renderOrder;

  if (halo.scale && snap.scale) {
    halo.scale.copy(snap.scale);
  }

  // lineEffects が参照する “base” を毎回正に戻す
  if (!halo.userData) halo.userData = {};
  halo.userData.baseOpacity = snap.baseOpacity;
  halo.userData.baseScale = snap.baseScale.clone ? snap.baseScale.clone() : snap.baseScale;

  if (halo.material && typeof halo.material.opacity === "number") {
    halo.material.opacity = snap.baseOpacity;
    halo.material.needsUpdate = true;
  }
}

function snapshotObjectStyle(obj) {
  if (!obj) return null;

  const snap = {
    material: snapshotMaterial(obj.material),
    renderOrder: typeof obj.renderOrder === "number" ? obj.renderOrder : 0,
    haloInner: snapshotHalo(obj.userData?.haloInner),
    haloOuter: snapshotHalo(obj.userData?.haloOuter),
  };

  return snap;
}

function applyObjectStyle(obj, snap) {
  if (!obj || !snap) return;

  applyMaterial(obj.material, snap.material);

  if (typeof snap.renderOrder === "number") obj.renderOrder = snap.renderOrder;

  if (snap.haloInner) applyHalo(obj.userData?.haloInner, snap.haloInner);
  if (snap.haloOuter) applyHalo(obj.userData?.haloOuter, snap.haloOuter);
}

/**
 * baseStyle store
 * - uuid -> snapshot
 */
export function createBaseStyleStore() {
  const map = new Map();

  function capture(uuid, obj) {
    if (!uuid || !obj) return;
    map.set(uuid, snapshotObjectStyle(obj));
  }

  function apply(uuid, obj) {
    if (!uuid || !obj) return;
    const snap = map.get(uuid);
    if (!snap) return;
    applyObjectStyle(obj, snap);
  }

  function clear() {
    map.clear();
  }

  return {
    map,
    capture,
    apply,
    clear,
  };
}
