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
import { DEBUG_MICROFX, microFXConfig } from "./config.js";

// ------------------------------------------------------------
// intensity 管理（0..1）
// ------------------------------------------------------------
let currentIntensity = 0; // 実際に使う値
let targetIntensity = 0;  // microState 有無から決まる目標値
let lastUpdateTime = null;
let lastMicroState = null; // fade-out 用に直近の microState を保持

function stepIntensity(now) {
  const cfg = (microFXConfig && microFXConfig.transition) || {};
  const enabled = cfg.enabled !== undefined ? !!cfg.enabled : true;

  // トランジション無効なら target に即追従
  if (!enabled) {
    currentIntensity = targetIntensity;
    lastUpdateTime = now;
    return currentIntensity;
  }

  if (lastUpdateTime == null) {
    lastUpdateTime = now;
    currentIntensity = targetIntensity;
    return currentIntensity;
  }

  const duration =
    typeof cfg.durationMs === "number" && cfg.durationMs > 0
      ? cfg.durationMs
      : 1;

  const dt = now - lastUpdateTime;
  lastUpdateTime = now;

  const delta = dt / duration;

  if (targetIntensity > currentIntensity) {
    currentIntensity = Math.min(targetIntensity, currentIntensity + delta);
  } else if (targetIntensity < currentIntensity) {
    currentIntensity = Math.max(targetIntensity, currentIntensity - delta);
  }

  if (currentIntensity < 0) currentIntensity = 0;
  if (currentIntensity > 1) currentIntensity = 1;

  return currentIntensity;
}

function resetIntensity() {
  currentIntensity = 0;
  targetIntensity = 0;
  lastUpdateTime = null;
  lastMicroState = null;
}

function resetAllFX(scene) {
  removeMarker(scene);
  removeGlow(scene);
  removeAxes(scene);
  removeBounds(scene);
  clearHighlight(scene);
}

// ------------------------------------------------------------
// 共通ヘルパ: UUID から any Object3D を引く
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

// 3DSS / microState から渡される unitless ベクトルを、±1e4 にクランプ
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

// localAxes: unitless な局所座標軸
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

// microState.localBounds 用 AABB 正規化
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
 *
 * @param {THREE.Scene} scene
 * @param {object|null} microState   // MicroState | null
 * @param {object}      cameraState  // unitless な CameraEngine state
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

// ★ グローバル OFF モード
// NOTE: DEBUG_MICROFX=false の間は、microState が来ていても microFX 全体を封印する。
//       viewerSettings.fx.micro.enabled 等とは別レイヤの「開発フェーズ用マスタースイッチ」。
if (!DEBUG_MICROFX) {
  resetIntensity();
  resetAllFX(scene);
  return;
}

  // microState の有無から targetIntensity を決定
  if (microState) {
    lastMicroState = microState;
    targetIntensity = 1;
  } else {
    targetIntensity = 0;
  }

  const intensity = stepIntensity(performance.now());

  // microState もなく intensity も 0 なら完全 OFF
  if (!lastMicroState || intensity <= 0) {
    if (!microState) {
      lastMicroState = null;
    }
    resetAllFX(scene);
    return;
  }

  // ここから先は「lastMicroState」をソースとする
  const {
    focusUuid,
    focusPosition,
    relatedUuids,
    localAxes,
    localBounds,
    isHover,
    editing,
    kind,
  } = lastMicroState;

  // localAxes が未指定でも、focusPosition があればそこを原点とする標準 XYZ 軸を自動生成
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
    // intensity は第 4 引数として渡す（実装側で使っても使わなくてもよい）
    updateAxes(axes, sanitizedAxes, camera, intensity);
  } else {
    removeAxes(scene);
  }

  // --- Bounds ---
  const sanitizedBounds = sanitizeLocalBounds(localBounds);
  // 「編集中」のときだけ AABB とハンドルを表示
  const wantBounds = !!(sanitizedBounds && editing === true);

  if (wantBounds) {
    const bounds = ensureBounds(scene);
    updateBounds(bounds, sanitizedBounds, intensity);
    setOutlineMode(!!isHover);
    setHandlesVisible(true);
  } else {
    removeBounds(scene);
  }

  // --- Marker ---
  const sanitizedFocus = sanitizePosition(focusPosition);
  if (sanitizedFocus) {
    const marker = ensureMarker(scene);
    updateMarker(marker, sanitizedFocus, intensity);
  } else {
    removeMarker(scene);
  }

  // --- Glow ---
  // 線選択時（kind === "lines"）は中点からの玉グローは出さない
  if (sanitizedFocus && camera && kind !== "lines") {
    const glow = ensureGlow(scene);
    updateGlow(glow, sanitizedFocus, camera, intensity);
  } else {
    removeGlow(scene);
  }

  // --- Highlight ---
  const getFromMaps = (uuid) => getObjectByUuid(uuid, indexMaps);
  applyHighlight(scene, lastMicroState, getFromMaps, visibleSet, intensity);
}
