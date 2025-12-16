// viewer/runtime/renderer/microFX/microFXRuntime.js
import * as THREE from "../../../vendor/three/build/three.module.js";

/**
 * Phase5 規範（案2：hub協調パス固定）：
 * - hub が毎フレーム先頭で resetToBaseStyle() を呼ぶ
 * - ここ（applyMicroFX/applySelection）は “上書きのみ”
 * - selection は lastMicroState != null の間は no-op（renderer 防御）
 */
export function createMicroFXRuntime({ pointObjects, lineObjects, auxObjects }) {
  let lastMicroState = null;

  // 必要最低限のプロファイル（増やすならここ）
  let microFXProfile = {
    dimOpacity: 0.18,        // 非関連をどれだけ薄くするか（0..1）
    dimDarken: 0.45,         // 非関連の暗さ（0..1, 0=暗くしない）
    relatedBoostL: 0.10,     // related の明度ブースト
    focusBoostL: 0.22,       // focus の明度ブースト
    relatedOpacityMul: 0.85, // related の不透明度倍率
    focusOpacityMul: 1.00,   // focus の不透明度倍率
    raiseRenderOrder: true,  // 強調物を手前に
    relatedRenderOrder: 5,
    focusRenderOrder: 8,
    haloRelatedMul: 1.10,    // halo opacity 乗算
    haloFocusMul: 1.25,
    haloDimMul: 0.20,
  };

  let selectionProfile = {
    boostL: 0.12,
    opacityMul: 1.0,
    raiseRenderOrder: true,
    renderOrder: 4,
    haloMul: 1.08,
  };

  // ------------------------------
  // util
  // ------------------------------

  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

  const normalizeUuid = (sel) => {
    if (!sel) return null;
    if (typeof sel === "string") return sel;
    if (typeof sel === "object") {
      if (typeof sel.uuid === "string") return sel.uuid;
      if (typeof sel.id === "string") return sel.id;
    }
    return null;
  };

  function forEachAllObjects(fn) {
    pointObjects?.forEach((obj, uuid) => fn(obj, uuid, "point"));
    lineObjects?.forEach((obj, uuid) => fn(obj, uuid, "line"));
    auxObjects?.forEach((obj, uuid) => fn(obj, uuid, "aux"));
  }

  function forEachMaterial(mat, fn) {
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) if (m) fn(m);
      return;
    }
    fn(mat);
  }

  function boostMaterialLightness(mat, deltaL) {
    if (!mat?.color) return;
    const hsl = { h: 0, s: 0, l: 0 };
    mat.color.getHSL(hsl);
    hsl.l = Math.min(1.0, Math.max(0, hsl.l + deltaL));
    mat.color.setHSL(hsl.h, hsl.s, hsl.l);
  }

  function darkenMaterialLightness(mat, amount01) {
    if (!mat?.color) return;
    const a = clamp01(amount01);
    const hsl = { h: 0, s: 0, l: 0 };
    mat.color.getHSL(hsl);
    hsl.l = hsl.l * (1 - a);
    mat.color.setHSL(hsl.h, hsl.s, hsl.l);
  }

  function mulMaterialOpacity(mat, mul) {
    if (!mat) return;
    if (typeof mat.opacity === "number") {
      const next = mat.opacity * mul;
      mat.opacity = Math.max(0, Math.min(1, next));
      if (mat.opacity < 1) mat.transparent = true;
    }
  }

  function setMaterialOpacityFloor(mat, floor01) {
    if (!mat) return;
    if (typeof mat.opacity === "number") {
      mat.opacity = Math.max(clamp01(floor01), Math.min(1, mat.opacity));
      if (mat.opacity < 1) mat.transparent = true;
    }
  }

  function touchNeedsUpdate(mat) {
    if (mat && typeof mat.needsUpdate === "boolean") mat.needsUpdate = true;
  }

  function applyHaloMul(obj, mul) {
    if (!obj?.userData) return;
    for (const halo of [obj.userData.haloInner, obj.userData.haloOuter]) {
      if (!halo?.material) continue;
      forEachMaterial(halo.material, (m) => {
        mulMaterialOpacity(m, mul);
        touchNeedsUpdate(m);
      });
    }
  }

  // ------------------------------
  // core: applyMicroFX (overlay only)
  // ------------------------------

  function applyMicroFX(microState) {
    lastMicroState = microState ?? null;
    if (!lastMicroState) return;

    const focusUuid =
      typeof lastMicroState.focusUuid === "string" ? lastMicroState.focusUuid : null;

    const related = new Set();
    const rel = lastMicroState.relatedUuids;
    if (Array.isArray(rel)) {
      for (const u of rel) if (typeof u === "string") related.add(u);
    }
    if (focusUuid) related.add(focusUuid);

    const dimOpacity = clamp01(microFXProfile.dimOpacity);
    const dimDarken = clamp01(microFXProfile.dimDarken);

    // 1) まず全体を dim（関連以外）
    forEachAllObjects((obj, uuid) => {
      if (!obj) return;
      if (related.has(uuid)) return;

      // opacity を “床” に落とす（reset 済み前提）
      forEachMaterial(obj.material, (m) => {
        // いきなり 0 にならんように「床」にする
        if (typeof m.opacity === "number") {
          m.opacity = Math.min(m.opacity, dimOpacity);
          if (m.opacity < 1) m.transparent = true;
        }
        if (dimDarken > 0) darkenMaterialLightness(m, dimDarken);
        touchNeedsUpdate(m);
      });

      applyHaloMul(obj, microFXProfile.haloDimMul);
    });

    // 2) related を軽く持ち上げ
    related.forEach((uuid) => {
      const obj =
        pointObjects.get(uuid) || lineObjects.get(uuid) || auxObjects.get(uuid);
      if (!obj) return;

      const isFocus = focusUuid && uuid === focusUuid;

      const boostL = isFocus ? microFXProfile.focusBoostL : microFXProfile.relatedBoostL;
      const opMul = isFocus ? microFXProfile.focusOpacityMul : microFXProfile.relatedOpacityMul;
      const ro =
        microFXProfile.raiseRenderOrder
          ? (isFocus ? microFXProfile.focusRenderOrder : microFXProfile.relatedRenderOrder)
          : null;

      forEachMaterial(obj.material, (m) => {
        if (boostL) boostMaterialLightness(m, boostL);
        if (opMul !== 1) mulMaterialOpacity(m, opMul);

        // dim の床が残ってても、関連は最低これだけ見えるように
        setMaterialOpacityFloor(m, 0.35);

        touchNeedsUpdate(m);
      });

      if (typeof ro === "number") obj.renderOrder = ro;

      applyHaloMul(obj, isFocus ? microFXProfile.haloFocusMul : microFXProfile.haloRelatedMul);
    });
  }

  // ------------------------------
  // selection (macro only + defense no-op)
  // ------------------------------

  function applySelection(selection) {
    // renderer 側の防御規範：micro が生きてる間は selection 無効
    if (lastMicroState != null) return;

    const uuid = normalizeUuid(selection);
    if (!uuid) return;

    const obj =
      pointObjects.get(uuid) || lineObjects.get(uuid) || auxObjects.get(uuid);
    if (!obj) return;

    forEachMaterial(obj.material, (m) => {
      boostMaterialLightness(m, selectionProfile.boostL);
      mulMaterialOpacity(m, selectionProfile.opacityMul);
      setMaterialOpacityFloor(m, 0.5);
      touchNeedsUpdate(m);
    });

    if (selectionProfile.raiseRenderOrder) obj.renderOrder = selectionProfile.renderOrder;

    applyHaloMul(obj, selectionProfile.haloMul);
  }

  // ------------------------------
  // knobs
  // ------------------------------

  function setMicroFXProfile(next) {
    if (!next || typeof next !== "object") return;
    microFXProfile = { ...microFXProfile, ...next };
  }

  function setSelectionProfile(next) {
    if (!next || typeof next !== "object") return;
    selectionProfile = { ...selectionProfile, ...next };
  }

  function getLastMicroState() {
    return lastMicroState;
  }

  function resetState() {
    lastMicroState = null;
  }

  return {
    applyMicroFX,
    applySelection,

    setMicroFXProfile,
    setSelectionProfile,

    getLastMicroState,
    resetState,
  };
}
