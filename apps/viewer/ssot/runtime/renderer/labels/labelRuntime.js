// runtime/renderer/labels/labelRuntime.js
//
// LabelLayer の実体（scene ノード + ラベルの生成/更新/破棄）
// - LabelLayer は薄いラッパにして、重い処理はここへ寄せる。
// - 表示/非表示: visibleSet
// - 位置/スケール: cameraState.distance + labelConfig.world
// - microState は「ラベルの見え方調整」にだけ使う（越権しない）
//
// NOTE:
// - viewport は CSS px（context 側で統一）
// - dpr は cameraState.viewport.dpr として別で渡せるが、ここでは現状未使用

import * as THREE from "/vendor/three/build/three.module.js";
import { labelConfig } from "./labelConfig.js";
import { createTextLabelObject, disposeTextLabelObject } from "./textSprite.js";

function isTroikaText(obj) {
  // troika-three-text の Text は Mesh 派生。こちら側では userData の印で判定する。
  // （互換のため複数キーを許容）
  const ud = obj?.userData;
  return !!(
    obj?.isTroikaText ||
    ud?.labelBackend === "troika" ||
    ud?.troikaThreeText === true ||
    ud?.__troikaText === true
  );
}

function isAutoScaleTarget(obj) {
  // 旧: Canvas/Sprite 系は isSprite を持つ。troika も auto-scale の対象に含める。
  return !!(obj?.isSprite || isTroikaText(obj));
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}

function normalizeIntensity(v, fallback = 1) {
  const n = Number(v);
  return clamp01(Number.isFinite(n) ? n : fallback);
}

function readScalar(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

export function createLabelRuntime(scene, { renderOrder = 900, camera = null } = {}) {
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

  // stats（in-place 更新。getStats は同一参照を返す）
  const stats = {
    labelCount: 0,
    labelVisible: 0,
    updateCalls: 0,
    textRebuilds: 0,
    labelCulledDistance: 0,
    labelCulledScreen: 0,
    labelCulledFrustum: 0,
    throttleSkips: 0,
  };

  // throttle / moving 判定
  let lastUpdateAt = 0;
  let hasLastSnap = false;
  const lastSnap = { cx: 0, cy: 0, cz: 0, tx: 0, ty: 0, tz: 0, dist: 0, fov: 0 };

  // frustum
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();

  // fixed label helpers (avoid mirrored text from backside)
  const flipQuatLocalY = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI,
  );

  const tmpCamPos = new THREE.Vector3();
  const tmpToCam = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();
  const tmpAlignOffset = new THREE.Vector3();

  function readVec3(input, out) {
    if (Array.isArray(input) && input.length >= 3) {
      out.set(Number(input[0]) || 0, Number(input[1]) || 0, Number(input[2]) || 0);
      return true;
    }
    if (input && typeof input === "object") {
      if ("x" in input || "y" in input || "z" in input) {
        out.set(Number(input.x) || 0, Number(input.y) || 0, Number(input.z) || 0);
        return true;
      }
    }
    return false;
  }

  function getTargetPosition(cameraState, out) {
    const src = cameraState?.target ?? cameraState?.lookAt ?? null;
    if (readVec3(src, out)) return true;
    out.set(0, 0, 0);
    return false;
  }

  function getCameraPositionFromState(cameraState, out) {
    if (!cameraState || typeof cameraState !== "object") return false;

    // direct
    if (readVec3(cameraState.position, out)) return true;
    if (readVec3(cameraState.eye, out)) return true;
    if (readVec3(cameraState.cameraPosition, out)) return true;

    // fallback: orbit params (Z-up)
    const theta = Number(cameraState.theta);
    const phi = Number(cameraState.phi);
    const dist = Number(cameraState.distance);
    if (!Number.isFinite(theta) || !Number.isFinite(phi) || !Number.isFinite(dist)) return false;

    getTargetPosition(cameraState, tmpTarget);

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    out.set(
      tmpTarget.x + dist * sinPhi * Math.cos(theta),
      tmpTarget.y + dist * sinPhi * Math.sin(theta),
      tmpTarget.z + dist * cosPhi,
    );
    return true;
  }

  function snapshotCamera(camPos, tgtPos, camDist, fov) {
    const cx = camPos?.x ?? 0, cy = camPos?.y ?? 0, cz = camPos?.z ?? 0;
    const tx = tgtPos?.x ?? 0, ty = tgtPos?.y ?? 0, tz = tgtPos?.z ?? 0;
    const d = Number.isFinite(Number(camDist)) ? Number(camDist) : 0;
    const fv = Number.isFinite(Number(fov)) ? Number(fov) : 0;

    if (!hasLastSnap) {
      hasLastSnap = true;
      lastSnap.cx = cx; lastSnap.cy = cy; lastSnap.cz = cz;
      lastSnap.tx = tx; lastSnap.ty = ty; lastSnap.tz = tz;
      lastSnap.dist = d;
      lastSnap.fov = fv;
      return false;
    }

    const eps = 1e-4;
    const moved =
      Math.abs(cx - lastSnap.cx) > eps ||
      Math.abs(cy - lastSnap.cy) > eps ||
      Math.abs(cz - lastSnap.cz) > eps ||
      Math.abs(tx - lastSnap.tx) > eps ||
      Math.abs(ty - lastSnap.ty) > eps ||
      Math.abs(tz - lastSnap.tz) > eps ||
      Math.abs(d  - lastSnap.dist) > eps ||
      Math.abs(fv - lastSnap.fov)  > eps;

    lastSnap.cx = cx; lastSnap.cy = cy; lastSnap.cz = cz;
    lastSnap.tx = tx; lastSnap.ty = ty; lastSnap.tz = tz;
    lastSnap.dist = d;
    lastSnap.fov = fv;

    return moved;
  }

  function clear() {
    for (const { obj } of labels.values()) {
      group.remove(obj);
      disposeTextLabelObject(obj);
    }
    labels.clear();
    stats.labelCount = 0;
    stats.labelVisible = 0;
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

      // entry が変わったら貼り替え（text/size/font/align/pose）
      const entryKey = [
        entry.text ?? "",
        `s=${Number(entry.size) || 8}`,
        `f=${entry.font?.key ?? entry.font ?? ""}`,
        `a=${entry.align?.key ?? entry.align ?? ""}`,
        `p=${entry.pose?.key ?? ""}`,
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

      stats.textRebuilds += 1;

      obj.name = `label:${uuid}`;
      obj.visible = false;

      group.add(obj);
      labels.set(uuid, { obj, entry, entryKey });
    }

    stats.labelCount = labels.size;
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

  function getStats() {
    stats.labelCount = labels.size;
    return stats;
  }

  function update(cameraState, visibleSet) {
    // pointObjects / cameraState が無いとき、前回の visible が残るのを防ぐ
    if (!pointObjects || !cameraState) {
      for (const { obj } of labels.values()) obj.visible = false;
      stats.labelVisible = 0;
      return;
    }

    const lod = labelConfig?.lod || {};
    const lodEnabled = lod.enabled !== false;
    const throttleMs = readScalar(lod.throttleMs, 0);

    // camera pos（優先: three camera）
    let hasCameraPos = false;
    if (camera?.position) {
      tmpCamPos.copy(camera.position);
      hasCameraPos = true;
    } else {
      hasCameraPos = getCameraPositionFromState(cameraState, tmpCamPos);
    }

    // target（snapshot用）
    getTargetPosition(cameraState, tmpTarget);

    const camDist = Math.max(Number(cameraState.distance) || 1, 0.1);
    const fov = readScalar(cameraState.fov, 50);

    if (lodEnabled && throttleMs > 0) {
      const now = (globalThis.performance?.now?.() ?? Date.now());
      const moving = snapshotCamera(tmpCamPos, tmpTarget, camDist, fov);
      if (moving && now - lastUpdateAt < throttleMs) {
        stats.throttleSkips += 1;
        return;
      }
      lastUpdateAt = now;
    } else {
      snapshotCamera(tmpCamPos, tmpTarget, camDist, fov);
    }

    stats.updateCalls += 1;
    stats.labelVisible = 0;
    stats.labelCulledDistance = 0;
    stats.labelCulledScreen = 0;
    stats.labelCulledFrustum = 0;

    const isVisible = buildVisiblePredicate(visibleSet);

    // viewport(CSS px)
    const viewportH = readScalar(cameraState.viewport?.height, 0);

    // LOD: distance / fade / screen-size（ループ外で確定）
    const distCfg = lod.distance || {};
    let maxDist = readScalar(distCfg.maxDistance, NaN);
    if (!Number.isFinite(maxDist)) {
      const factor = readScalar(distCfg.maxDistanceFactor, NaN);
      if (Number.isFinite(factor) && factor > 0) maxDist = camDist * factor;
    }

    let fadeStart = readScalar(distCfg.fadeStart, NaN);
    if (!Number.isFinite(fadeStart) && Number.isFinite(maxDist)) {
      const factor = readScalar(distCfg.fadeStartFactor, NaN);
      if (Number.isFinite(factor) && factor > 0) fadeStart = maxDist * factor;
    }

    const minPx = readScalar(lod.screenSize?.minPixels, 0);
    const useScreenCull = lodEnabled && minPx > 0 && viewportH > 0 && hasCameraPos;

    const fovRad = (fov * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);

    // frustum cull（camera が渡されてる時だけ）
    let useFrustum = false;
    if (lodEnabled && camera && lod?.frustum?.enabled) {
      try {
        camera.updateMatrixWorld?.();
        camera.updateProjectionMatrix?.();
        projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);
        useFrustum = true;
      } catch (_e) {
        useFrustum = false;
      }
    }

    const wcfg = labelConfig.world || {};
    const baseLabelSize = Number(labelConfig.baseLabelSize) || 8;

    // up axis: 既定は Z（3DSL の "Z+up/freeXY" 前提）
    // 互換のため設定で 'y' も選べるようにしておく
    const upAxis =
      (wcfg.upAxis === "y" || wcfg.upAxis === "z")
        ? wcfg.upAxis
        : "z";

    // Geometry in world space must be camera-independent unless billboard.
    // - Mesh labels (fixed pose) use a fixed world height.
    // - Sprite labels (billboard) may optionally scale with camera distance.
    const baseHeightFixed = (Number(wcfg.baseHeight) || 0.2);
    const scalePerCameraDistance = Number(wcfg.scalePerCameraDistance);
    const useCameraScale = Number.isFinite(scalePerCameraDistance);

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

      obj.visible = false; // cull を通ったら最後に true

      obj.position.copy(pointObj.position);

      // size factor
      const size = Number(entry?.size) || baseLabelSize;
      const sizeFactor = size / baseLabelSize;

      // base height (world): fixed for mesh labels, optional camera-distance scaling for auto-scale targets.
      // NOTE: troika-three-text の Text も auto-scale 対象に含める。
      const baseHeight = (isAutoScaleTarget(obj) && useCameraScale)
        ? camDist * scalePerCameraDistance
        : baseHeightFixed;

      let h = baseHeight * sizeFactor;
      if (minH != null) h = Math.max(h, minH);
      if (maxH != null) h = Math.min(h, maxH);

      const lift = h * offsetYFactor;
      if (upAxis === "y") obj.position.y += lift;
      else obj.position.z += lift;

      const aspect = Number(obj.userData?.__labelAspect) || 1;

      // LOD: distance / screen-size / frustum（なるべく早めに落とす）
      let distToCam = null;
      if (lodEnabled && hasCameraPos) {
        distToCam = tmpCamPos.distanceTo(obj.position);

        if (Number.isFinite(maxDist) && Number.isFinite(distToCam) && distToCam > maxDist) {
          stats.labelCulledDistance += 1;
          continue;
        }

        if (useScreenCull && Number.isFinite(distToCam) && distToCam > 0 && tanHalfFov > 0) {
          const denom = 2 * tanHalfFov * distToCam;
          const approxPx = denom > 0 ? (h * viewportH) / denom : Infinity;
          if (approxPx < minPx) {
            stats.labelCulledScreen += 1;
            continue;
          }
        }
      }

      if (useFrustum && !frustum.containsPoint(obj.position)) {
        stats.labelCulledFrustum += 1;
        continue;
      }

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

      // LOD: fade-out near maxDist（距離が取れてる時だけ）
      if (lodEnabled && Number.isFinite(maxDist) && Number.isFinite(fadeStart) && maxDist > fadeStart) {
        if (distToCam == null && hasCameraPos) distToCam = tmpCamPos.distanceTo(obj.position);
        if (Number.isFinite(distToCam) && distToCam > fadeStart) {
          const t = (distToCam - fadeStart) / (maxDist - fadeStart);
          alpha *= clamp01(1 - t);
        }
      }

      // scale / fontSize
      if (isTroikaText(obj)) {
        // troika-three-text: world 単位は fontSize で管理する（scale は 1 を維持）
        const fs = Math.max(0.0001, h * scaleMul);
        if (obj.fontSize !== fs) obj.fontSize = fs;
        // troika はパラメータ変更後に sync() が必要
        if (typeof obj.sync === "function") obj.sync();
        obj.scale.set(1, 1, 1);
      } else if (obj.isSprite) {
        obj.scale.set(h * aspect * scaleMul, h * scaleMul, 1);
      } else {
        // mesh plane (fixed pose): keep aspect ratio
        const sx = h * aspect * scaleMul;
        const sy = h * scaleMul;
        obj.scale.set(sx, sy, 1);
      }

      // fixed pose: keep orientation static (no camera-dependent flipping)
      // - backside is allowed to render as-is (DoubleSide material)

      // align offset（allocation なし）
      const align = entry?.align;
      // troika は width/height が scale だけで決まらないので align は別実装にする
      if (align && !obj.isSprite && !isTroikaText(obj)) {
        const ax = Number(align.x);
        const ay = Number(align.y);
        const alignX = Number.isFinite(ax) ? ax : 0.5;
        const alignY = Number.isFinite(ay) ? ay : 0.5;
        const dx = (0.5 - alignX) * obj.scale.x;
        const dy = (0.5 - alignY) * obj.scale.y;
        if (dx || dy) {
          tmpAlignOffset.set(dx, dy, 0);
          tmpAlignOffset.applyQuaternion(obj.quaternion);
          obj.position.add(tmpAlignOffset);
        }
      }

      const mat = obj.material;
      if (mat && "opacity" in mat) {
        mat.transparent = true;
        mat.opacity = clamp01(alpha);
        mat.depthWrite = false;
      }

      obj.visible = true;
      stats.labelVisible += 1;
    }
  }

  return {
    group,
    labels,

    setPointObjects,
    syncIndex,

    applyMicroFX,
    update,
    getStats,

    clear,
    dispose,
  };
}
