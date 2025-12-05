// viewer/runtime/renderer/microFX/axes.js

import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";

// このモジュールは「unitless な world 座標系」でのローカル座標軸可視化だけを担当する。
// microState そのものは参照せず、呼び出し側から渡される localAxes 情報だけを見る。
// px や画面解像度は一切参照せず、すべてのスカラーは「world 長さの係数」として解釈する。

let axesGroup = null; // singleton

// ------------------------------------------------------------
// 共通ヘルパ
// ------------------------------------------------------------

// 3DSS / microState 由来の unitless ベクトルを、
// 数値として安全な範囲（±1e4）に丸めるだけの正規化。
function sanitizeVector3(arr) {
  if (!Array.isArray(arr) || arr.length < 3) return null;

  const MAX = 1e4;
  const [x, y, z] = arr.map((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return THREE.MathUtils.clamp(n, -MAX, MAX);
  });

  return [x, y, z];
}

// localAxes オブジェクトの想定フォーマット:
//
//   - origin : world 座標（unitless）  … 通常は microState.focusPosition から構成
//   - xDir/yDir/zDir : unitless な方向ベクトル（省略可）
//   - scale : 軸長さに掛ける無次元スカラー
//
// ここでは数値の範囲だけ整え、幾何学的な単位は決めない。
function sanitizeLocalAxes(localAxes) {
  if (!localAxes) return null;

  const origin = Array.isArray(localAxes?.origin)
    ? localAxes.origin
    : Array.isArray(localAxes)
    ? localAxes
    : null;

  const sanitizedOrigin = sanitizeVector3(origin);
  if (!sanitizedOrigin) return null;

  const sanitizedX = sanitizeVector3(localAxes?.xDir);
  const sanitizedY = sanitizeVector3(localAxes?.yDir);
  const sanitizedZ = sanitizeVector3(localAxes?.zDir);

  const rawScale =
    typeof localAxes?.scale === "number" ? Number(localAxes.scale) : 1;
  const baseScale = Number.isFinite(rawScale)
    ? THREE.MathUtils.clamp(rawScale, 0.01, 10)
    : 1;

  return {
    origin: sanitizedOrigin,
    xDir: sanitizedX,
    yDir: sanitizedY,
    zDir: sanitizedZ,
    baseScale,
  };
}

// ------------------------------------------------------------
// ensure / update / remove
// ------------------------------------------------------------

export function ensureAxes(scene) {
  if (axesGroup && axesGroup.parent !== scene) {
    axesGroup.parent?.remove(axesGroup);
    axesGroup = null;
  }

  if (!axesGroup) {
    // [-1,1] のベース軸（長さ 2）。scale で最終長さを決める。
    const positions = new Float32Array([
      // X axis
      -1, 0, 0,
      1, 0, 0,
      // Y axis
      0, -1, 0,
      0, 1, 0,
      // Z axis
      0, 0, -1,
      0, 0, 1,
    ]);

    const colors = new Float32Array([
      // X axis (blue)
      0.3, 0.6, 1,
      0.3, 0.6, 1,
      // Y axis (green)
      0.2, 1, 0.2,
      0.2, 1, 0.2,
      // Z axis (red)
      1, 0.2, 0.2,
      1, 0.2, 0.2,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: true,
      depthWrite: false, // 他オブジェクトの奥に隠れはするが、Zバッファは汚さない
      transparent: true,
      opacity: 1,
    });

    axesGroup = new THREE.LineSegments(geometry, material);
    axesGroup.name = "micro-axes";
    axesGroup.renderOrder = 996; // glow/bounds より少し前に出したければ調整
  }

  if (axesGroup.parent !== scene) {
    scene.add(axesGroup);
  }

  return axesGroup;
}

export function updateAxes(target, localAxes, camera, intensity = 1) {
  if (!target) return;

  // intensity は 0..1 にクランプ。0 以下なら完全非表示。
  if (!Number.isFinite(intensity)) intensity = 1;
  intensity = THREE.MathUtils.clamp(intensity, 0, 1);

  if (intensity <= 0) {
    target.visible = false;
    return;
  }

  // localAxes が既に sanitize 済みならそのまま使用。
  // そうでなければここで sanitize する。
  let sanitized = null;

  if (
    localAxes &&
    Array.isArray(localAxes.origin) &&
    typeof localAxes.baseScale === "number"
  ) {
    sanitized = localAxes;
  } else {
    sanitized = sanitizeLocalAxes(localAxes);
  }

  if (!sanitized || !camera) {
    target.visible = false;
    return;
  }

  const { origin, xDir, yDir, zDir, baseScale } = sanitized;

  // origin は unitless world 空間上の位置ベクトル
  target.position.fromArray(origin);

  if (xDir && yDir && zDir) {
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(
      new THREE.Vector3(...xDir),
      new THREE.Vector3(...yDir),
      new THREE.Vector3(...zDir)
    );
    target.quaternion.setFromRotationMatrix(matrix);
  } else {
    // fallback: カメラ方向に揃える（HUD 軸っぽく見せる）
    target.quaternion.copy(camera.quaternion);
  }

  // カメラとの距離に応じてスケール
  const distance = camera.position.distanceTo(target.position) || 1;

  const cfg = microFXConfig.axes || {};
  const scalePerDistance =
    typeof cfg.scalePerDistance === "number" ? cfg.scalePerDistance : 0.08;
  const minScale =
    typeof cfg.minScale === "number" ? cfg.minScale : 0.6;
  const maxScale =
    typeof cfg.maxScale === "number" ? cfg.maxScale : 3.0;
  const opacityBase =
    typeof cfg.opacity === "number" ? cfg.opacity : 0.9;

  const rawScale = baseScale * distance * scalePerDistance;
  const scaled = THREE.MathUtils.clamp(rawScale, minScale, maxScale);

  // intensity をスケールに掛けてフェードアウト時は細く・小さく
  target.scale.setScalar(scaled * intensity);

  // 不透明度も intensity に合わせておく
  const material = target.material;
  if (material && "opacity" in material) {
    material.transparent = true;
    material.opacity = opacityBase * intensity;
  }

  target.visible = true;
}

export function removeAxes(scene) {
  if (axesGroup) {
    axesGroup.parent?.remove(axesGroup);
    axesGroup = null;
  }
}
