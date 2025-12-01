// viewer/runtime/renderer/microFX/index.js

import { ensureMarker, updateMarker, removeMarker } from "./marker.js";
import { ensureGlow, updateGlow, removeGlow } from "./glow.js";
import { applyHighlight, clearHighlight } from "./highlight.js";
import { ensureAxes, updateAxes, removeAxes } from "./axes.js";
import {
  ensureBounds,
  updateBounds,
  removeBounds,
  setOutlineMode,
  setHandlesVisible,
} from "./bounds.js";
import { DEBUG_MICROFX } from "./config.js";

// ------------------------------------------------------------
// 共通ヘルパ: UUID から any Object3D を引く
// bundles: { points, lines, aux, labels? ... }
// どれも「unitless な world 座標系」での Object3D 群（px とは無関係）
// ------------------------------------------------------------
function getObjectByUuid(uuid, bundles) {
  if (!uuid || !bundles) return null;
  const { points, lines, aux, labels } = bundles;

  return (
    (points && points.get && points.get(uuid)) ||
    (lines && lines.get && lines.get(uuid)) ||
    (aux && aux.get && aux.get(uuid)) ||
    (labels && labels.get && labels.get(uuid)) ||
    null
  );
}

// 3DSS / microState から渡される unitless ベクトルを、
// 数値として妥当な範囲（±1e4）にクランプするだけの正規化。
// 幾何的な意味付けや単位はここでは一切いじらない。
function sanitizeVector3(arr) {
  if (!Array.isArray(arr) || arr.length < 3) return null;
  const MAX = 1e4;
  const [x, y, z] = arr.map((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n, -MAX), MAX);
  });
  return [x, y, z];
}

function sanitizePosition(position) {
  return sanitizeVector3(position);
}

// microState.localAxes: unitless な局所座標軸。
// origin は world 座標、xDir/yDir/zDir は unitless な方向ベクトル、
// scale も「長さ係数」として unitless で扱う。
function sanitizeLocalAxes(localAxes) {
  if (!localAxes) return null;

  const origin = Array.isArray(localAxes?.origin)
    ? localAxes.origin
    : Array.isArray(localAxes)
    ? localAxes
    : null;

  const sanitizedOrigin = sanitizeVector3(origin);
  if (!sanitizedOrigin) return null;

  const sanitizedAxes = {
    origin: sanitizedOrigin,
    xDir: sanitizeVector3(localAxes?.xDir),
    yDir: sanitizeVector3(localAxes?.yDir),
    zDir: sanitizeVector3(localAxes?.zDir),
  };

  const rawScale =
    typeof localAxes?.scale === "number" ? Number(localAxes.scale) : 1;
  sanitizedAxes.baseScale = Number.isFinite(rawScale)
    ? Math.min(Math.max(rawScale, 0.01), 10)
    : 1;

  return sanitizedAxes;
}

// microState.localBounds: unitless な AABB。
// center/size ともに world 座標系の数値やけど、
// ここでは「長さの単位名」は一切決めず、数値だけを扱う。
function sanitizeLocalBounds(localBounds) {
  if (!localBounds) return null;

  const center = sanitizeVector3(localBounds.center);
  const size = sanitizeVector3(localBounds.size);

  if (!center || !size) return null;

  const minSize = Math.min(...size.map((v) => Math.abs(v)));
  if (!(minSize > 0)) return null;

  return {
    center,
    size,
    isMirror: !!localBounds.isMirror,
  };
}

/**
 * microFX のメイン入口
 * @param {THREE.Scene} scene
 * @param {object|null} microState   // MicroState | null
 * @param {object}      cameraState  // unitless な CameraEngine state（今はほぼ未使用）
 * @param {object}      indexMaps    // { points, lines, aux, baseStyle?, camera, labels? }
 * @param {Set?}        visibleSet   // 現在の frame/filter 後の visibleSet（任意）
  */
export function applyMicroFX(
  scene,
  microState,
  cameraState,
  indexMaps,
  visibleSet
) {
    const camera = indexMaps?.camera || null;

  // ★ まとめて OFF モード：
  //   - microFX 関連オブジェクトは毎フレーム掃除
  //   - ラベル側の microFX は context.js 側で止める想定（必要ならそっちにもフラグ）
  if (!DEBUG_MICROFX) {
    removeMarker(scene);
    removeGlow(scene);
    removeAxes(scene);
    removeBounds(scene);
    clearHighlight(scene);
    return;
  }
  if (!microState) {
    removeMarker(scene);
    removeGlow(scene);
    removeAxes(scene);
    removeBounds(scene);
    clearHighlight(scene);
    return;
  }

  const {
    focusUuid,
    focusPosition,
    relatedUuids,
    localAxes,
    localBounds,
    isHover,
    editing,
    kind,
  } = microState;

  // localAxes が未指定でも、focusPosition があれば
  // そこを原点とする標準 XYZ 軸を自動で生やす。
  let effectiveLocalAxes = localAxes;
  if (!effectiveLocalAxes && Array.isArray(focusPosition)) {
    effectiveLocalAxes = {
      origin: focusPosition,
      xDir: [1, 0, 0],
      yDir: [0, 1, 0],
      zDir: [0, 0, 1],
      scale: 1,
    };
  }

  // --- Axes ---
  const sanitizedAxes = sanitizeLocalAxes(effectiveLocalAxes);
  if (sanitizedAxes && camera) {
    const axes = ensureAxes(scene);
    updateAxes(axes, sanitizedAxes, camera);
  } else {
    removeAxes(scene);
  }

  // --- Bounds ---
  const sanitizedBounds = sanitizeLocalBounds(localBounds);
  // 単なる micro フォーカスでは出さず、
  // 「編集中」のときだけ AABB とハンドルを表示する。
  const wantBounds = !!(sanitizedBounds && editing === true);

  if (wantBounds) {
    const bounds = ensureBounds(scene);
    updateBounds(bounds, sanitizedBounds);
    setOutlineMode(!!isHover);
    setHandlesVisible(true);
  } else {
    removeBounds(scene);
  }

  // --- Marker ---
  const sanitizedFocus = sanitizePosition(focusPosition);
  if (sanitizedFocus) {
    const marker = ensureMarker(scene);
    updateMarker(marker, sanitizedFocus);
  } else {
    removeMarker(scene);
  }

  // --- Glow ---
  // 線選択時（kind === "lines"）は中点からの玉グローは出さない
  if (sanitizedFocus && camera && kind !== "lines") {
    const glow = ensureGlow(scene);
    updateGlow(glow, sanitizedFocus, camera);
  } else {
    removeGlow(scene);
  }

  // --- Highlight ---
  const getFromMaps = (uuid) => getObjectByUuid(uuid, indexMaps);
  applyHighlight(scene, microState, getFromMaps, visibleSet);
}