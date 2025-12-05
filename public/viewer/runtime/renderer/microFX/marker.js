// viewer/runtime/renderer/microFX/marker.js

import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";

let marker = null;

export function ensureMarker(scene) {
  if (marker && marker.parent !== scene) {
    marker.parent?.remove(marker);
    marker = null;
  }

  if (!marker) {
    // ---- Plane marker（フォーカス位置に重なる薄い板） ----
    // baseSize/baseOpacity は microFXConfig.marker から取得。
    const cfg = microFXConfig.marker || {};
    const baseSize = Number.isFinite(cfg.baseSize) ? cfg.baseSize : 0.14;
    const baseOpacity =
      Number.isFinite(cfg.opacity) ? cfg.opacity : 0.06;

    const geometry = new THREE.PlaneGeometry(baseSize, baseSize);
    const material = new THREE.MeshBasicMaterial({
      color: "#ffffaa",
      transparent: true,
      opacity: baseOpacity,
      depthTest: false,  // 奥行き判定しない
      depthWrite: false, // 深度バッファにも書き込まない
    });

    marker = new THREE.Mesh(geometry, material);
    marker.renderOrder = 20; // 球(renderOrder=10前後)より少し前
    marker.visible = false;

    marker.userData.baseOpacity = baseOpacity;
  }

  if (marker.parent !== scene) {
    scene.add(marker);
  }

  return marker;
}

function sanitizePosition(position) {
  if (!Array.isArray(position) || position.length < 3) return null;

  const [x, y, z] = position.map((v) => Number(v));
  if (![x, y, z].every((v) => Number.isFinite(v))) return null;

  const MAX = 1e4;
  return [x, y, z].map((v) => THREE.MathUtils.clamp(v, -MAX, MAX));
}

// position: microState.focusPosition を想定（world 座標系, unitless）
export function updateMarker(target, position, intensity = 1) {
  if (!target) return;

  const sanitized = sanitizePosition(position);
  let s = Number.isFinite(intensity) ? intensity : 1;
  s = THREE.MathUtils.clamp(s, 0, 1);

  // 位置が無効 or intensity=0 なら完全 OFF
  if (!sanitized || s <= 0) {
    target.visible = false;
    return;
  }

  target.position.set(sanitized[0], sanitized[1], sanitized[2]);

  // opacity は baseOpacity × intensity
  const cfg = microFXConfig.marker || {};
  const fallbackOpacity =
    Number.isFinite(cfg.opacity) ? cfg.opacity : 0.06;
  const baseOpacity =
    typeof target.userData.baseOpacity === "number"
      ? target.userData.baseOpacity
      : fallbackOpacity;

  const mat = target.material;
  if (mat && "opacity" in mat) {
    mat.transparent = true;
    mat.opacity = baseOpacity * s;
    mat.depthTest = false;
    mat.depthWrite = false;
  }

  // サイズも intensity に応じて軽く縮ませる（0.3〜1 の間）
  const minScale = 0.3;
  const scale = minScale + (1 - minScale) * s;
  target.scale.setScalar(scale);

  target.visible = true;
}

export function removeMarker(scene) {
  if (marker) {
    scene.remove(marker);
    marker = null;
  }
}
