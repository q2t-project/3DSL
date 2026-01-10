// runtime/renderer/labels/labelRuntime.js
//
// LabelLayer の実体（scene ノード + ラベルの生成/更新/破棄）
// - LabelLayer は薄いラッパにして、重い処理はここへ寄せる。
// - 表示/非表示: visibleSet
// - 位置/スケール: cameraState.distance + labelConfig.world
// - microState は「ラベルの見え方調整」にだけ使う（越権しない）

import * as THREE from "/viewer/vendor/three/build/three.module.js";
import { labelConfig } from "./labelConfig.js";
import { createTextLabelObject, disposeTextLabelObject } from "./textSprite.js";

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}

function normalizeIntensity(v, fallback = 1) {
  const n = Number(v);
  return clamp01(Number.isFinite(n) ? n : fallback);
}

function hasIn(setLike, uuid) {
  return !!setLike && typeof setLike.has === "function" && setLike.has(uuid);
}

function buildVisiblePredicate(visibleSet) {
  if (!visibleSet) return () => false;

  // 旧: Set<uuid>
  if (typeof visibleSet.has === "function") {
    return (uuid) => visibleSet.has(uuid);
  }

  // 新: {points,lines,aux}
  if (typeof visibleSet === "object") {
    return (uuid) =>
      hasIn(visibleSet.points, uuid) ||
      hasIn(visibleSet.lines, uuid) ||
      hasIn(visibleSet.aux, uuid);
  }

  return () => false;
}

function getDegree(degreeByUuid, uuid) {
  if (!degreeByUuid || !uuid) return null;

  if (degreeByUuid instanceof Map) {
    const v = degreeByUuid.get(uuid);
    return Number.isFinite(Number(v)) ? Number(v) : null;
  }

  if (typeof degreeByUuid === "object") {
    const v = degreeByUuid[uuid];
    return Number.isFinite(Number(v)) ? Number(v) : null;
  }

  return null;
}

export function createLabelRuntime(scene, { renderOrder = 900 } = {}) {
  const group = new THREE.Group();
  group.name = "label-layer";
  group.renderOrder = renderOrder;
  scene.add(group);

  // uuid -> { obj, entry, entryKey }
  const labels = new Map();

  let pointLabelIndex = new Map();
  let pointObjects = null;

  // microFX state（ラベル見え方だけ）
  const fx = {
    enabled: false,
    intensity: 1,
    focusUuid: null,
    relatedSet: new Set(),
    degreeByUuid: null,
  };

  function clear() {
    for (const { obj } of labels.values()) {
      group.remove(obj);
      disposeTextLabelObject(obj);
    }
    labels.clear();
  }

  function dispose() {
    clear();
    scene.remove(group);
  }

  function setPointObjects(map) {
    pointObjects = map || null;
  }

  function syncIndex(nextIndex) {
    pointLabelIndex = nextIndex || new Map();

    const nextUuids = new Set(pointLabelIndex.keys());

    // remove
    for (const [uuid, info] of labels.entries()) {
      if (!nextUuids.has(uuid)) {
        group.remove(info.obj);
        disposeTextLabelObject(info.obj);
        labels.delete(uuid);
      }
    }

    // add/update
    for (const [uuid, entry] of pointLabelIndex.entries()) {
      if (!entry || entry.kind !== "points") continue;

      // entry が変わったら貼り替え（text/size/font/align/plane）
      const entryKey = [
        entry.text ?? "",
        `s=${Number(entry.size) || 8}`,
        `f=${entry.font ?? ""}`,
        `a=${entry.align ?? ""}`,
        `p=${entry.plane ?? ""}`,
      ].join("|");

      const cur = labels.get(uuid);
      if (cur && cur.entryKey === entryKey) {
        cur.entry = entry;
        continue;
      }

      if (cur) {
        group.remove(cur.obj);
        disposeTextLabelObject(cur.obj);
        labels.delete(uuid);
      }

      const obj = createTextLabelObject(entry.text, entry, labelConfig);
      if (!obj) continue;

      obj.name = `label:${uuid}`;
      obj.visible = false;

      group.add(obj);
      labels.set(uuid, { obj, entry, entryKey });
    }
  }

  function applyMicroFX(microState, intensity = 1) {
    if (!microState) {
      fx.enabled = false;
      fx.intensity = 1;
      fx.focusUuid = null;
      fx.relatedSet = new Set();
      fx.degreeByUuid = null;
      return;
    }

    fx.enabled = true;
    fx.intensity = normalizeIntensity(intensity, 1);
    fx.focusUuid = microState.focusUuid || null;
    fx.relatedSet = new Set(Array.isArray(microState.relatedUuids) ? microState.relatedUuids : []);
    fx.degreeByUuid = microState.degreeByUuid || null;
  }

  function update(cameraState, visibleSet) {
    if (!pointObjects || !cameraState) return;

    const isVisible = buildVisiblePredicate(visibleSet);

    const camDist = Math.max(Number(cameraState.distance) || 1, 0.1);

    const wcfg = labelConfig.world || {};
    const baseLabelSize = Number(labelConfig.baseLabelSize) || 8;

    // 「計算式」をここに置くのは renderer の責務（ラベル見た目は描画側で決める）
    // ただし固定値を散らかさず、labelConfig に寄せてある。
    const baseHeight = Number.isFinite(Number(wcfg.scalePerCameraDistance))
      ? camDist * Number(wcfg.scalePerCameraDistance)
      : (Number(wcfg.baseHeight) || 0.2);

    const minH = Number.isFinite(Number(wcfg.minHeight)) ? Number(wcfg.minHeight) : null;
    const maxH = Number.isFinite(Number(wcfg.maxHeight)) ? Number(wcfg.maxHeight) : null;

    const offsetYFactor = Number(wcfg.offsetYFactor) || 0.6;

    const degreeAlpha = Array.isArray(labelConfig?.microFX?.degreeAlpha)
      ? labelConfig.microFX.degreeAlpha
      : [1.0, 0.85, 0.70, 0.55, 0.40, 0.30, 0.22];

    for (const [uuid, info] of labels.entries()) {
      const obj = info.obj;
      const entry = info.entry;

      if (!isVisible(uuid)) {
        obj.visible = false;
        continue;
      }

      const pointObj = pointObjects.get(uuid);
      if (!pointObj) {
        obj.visible = false;
        continue;
      }

      obj.visible = true;
      obj.position.copy(pointObj.position);

      // size factor
      const size = Number(entry?.size) || baseLabelSize;
      const sizeFactor = size / baseLabelSize;

      let h = baseHeight * sizeFactor;
      if (minH != null) h = Math.max(h, minH);
      if (maxH != null) h = Math.min(h, maxH);

      obj.position.y += h * offsetYFactor;

      const aspect = Number(obj.userData?.__labelAspect) || 1;

      // microFX（opacity/scale だけ。位置や可視判定を勝手に弄らん）
      let alpha = 1;
      let scaleMul = 1;

      if (fx.enabled) {
        const s = fx.intensity;
        const isFocus = fx.focusUuid && uuid === fx.focusUuid;
        const isRelated = fx.relatedSet && fx.relatedSet.has(uuid);

        if (isFocus) {
          alpha = 1.0;
          scaleMul = 1.12;
        } else if (isRelated) {
          alpha = 0.85;
          scaleMul = 1.04;
        } else {
          const deg = getDegree(fx.degreeByUuid, uuid);
          if (deg != null && deg >= 0) {
            const i = Math.min(deg, degreeAlpha.length - 1);
            alpha = degreeAlpha[i];
          } else {
            alpha = 0.25;
          }
          scaleMul = 0.98;
        }

        alpha *= s;
      }

      obj.scale.set(h * aspect * scaleMul, h * scaleMul, 1);

      const mat = obj.material;
      if (mat && "opacity" in mat) {
        mat.transparent = true;
        mat.opacity = clamp01(alpha);
        mat.depthWrite = false;
      }
    }
  }

  return {
    group,
    labels,

    setPointObjects,
    syncIndex,

    applyMicroFX,
    update,

    clear,
    dispose,
  };
}
