// viewer/runtime/renderer/microFX/axes.js

import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";

// このモジュールは「unitless な world 座標系」でのローカル座標軸可視化だけを担当する。
// px や画面解像度は一切参照せず、すべてのスカラーは「長さ係数」として解釈する。
let axesGroup = null; // singleton

// 3DSS / microState 由来の unitless ベクトルを、
// 数値として安全な範囲（±1e4）に丸めるだけの正規化。
// 単位や意味付けはここでは一切いじらない。
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

// microState.localAxes:
//   - origin : world 座標（unitless）
//   - xDir/yDir/zDir : unitless な方向ベクトル（省略可）
//   - scale : 軸長さに掛ける無次元スカラー
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

  const rawScale = typeof localAxes?.scale === "number" ? Number(localAxes.scale) : 1;
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

export function ensureAxes(scene) {
  if (axesGroup && axesGroup.parent !== scene) {
    axesGroup.parent?.remove(axesGroup);
    axesGroup = null;
  }

  if (!axesGroup) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      // X axis
      -0.5, 0, 0,
      0.5, 0, 0,
      // Y axis
      0, -0.5, 0,
      0, 0.5, 0,
      // Z axis
      0, 0, -0.5,
      0, 0, 0.5,
    ]);

    const colors = new Float32Array([
      // X axis (red)
      1, 0, 0,
      1, 0, 0,
      // Y axis (green)
      0, 1, 0,
      0, 1, 0,
      // Z axis (blue)
      0, 0, 1,
      0, 0, 1,
    ]);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      // 他の microFX（bounds/glow/highlight）と同様、
      // 深度バッファは汚さないオーバーレイ寄りにしておく
      depthWrite: false,
    });
    axesGroup = new THREE.LineSegments(geometry, material);
    axesGroup.name = "micro-axes";
    axesGroup.renderOrder = 996;
  }

  if (axesGroup.parent !== scene) {
    scene.add(axesGroup);
  }

  return axesGroup;
}

export function updateAxes(target, localAxes, camera) {
  if (!target) return;

  const sanitized = sanitizeLocalAxes(localAxes);
  if (!sanitized || !camera) {
    target.visible = false;
    return;
  }

  const { origin, xDir, yDir, zDir, baseScale } = sanitized;

  // origin は unitless world 空間上の位置ベクトル
  target.position.fromArray(origin);

  if (xDir && yDir && zDir) {    const matrix = new THREE.Matrix4();
    matrix.makeBasis(
      new THREE.Vector3(...xDir),
      new THREE.Vector3(...yDir),
      new THREE.Vector3(...zDir)
    );
    target.quaternion.setFromRotationMatrix(matrix);
  } else {
    // fallback: カメラ方向に揃える（HUD 軸として自然）
    target.quaternion.copy(camera.quaternion);
  }

  // カメラとの距離も unitless。「遠いほど大きく見せる」ための係数にだけ利用
  const distance = camera.position.distanceTo(target.position);

  const cfg = microFXConfig.axes;
  const rawScale = baseScale * distance * cfg.scalePerDistance;
  const scaled = THREE.MathUtils.clamp(
    rawScale,
    cfg.minScale,
    cfg.maxScale
  );

  target.scale.setScalar(scaled);

  target.visible = true;
}

export function removeAxes(scene) {
  if (axesGroup) {
    axesGroup.parent?.remove(axesGroup);
    axesGroup = null;
  }
}