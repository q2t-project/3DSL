// viewer/runtime/renderer/microFX/marker.js

import * as THREE from "../../../../vendor/three/build/three.module.js";

let marker = null;

export function ensureMarker(scene) {
  if (marker && marker.parent !== scene) {
    marker.parent?.remove(marker);
    marker = null;
  }

  if (!marker) {
    // ---- Plane marker（球の上にうっすら重なる板） ----
    // 0.14 は「unitless な world 長さ」で、シーンのスケールとは独立した基準サイズ。
    const geometry = new THREE.PlaneGeometry(0.14, 0.14);
    const material = new THREE.MeshBasicMaterial({
      color: "#ffffaa",
      transparent: true,
      opacity: 0.06,         // さらに控えめ
      depthTest: false,      // 奥行き判定しない
      depthWrite: false,     // 深度バッファにも書き込まない
    });
    marker = new THREE.Mesh(geometry, material);
    marker.renderOrder = 20;        // 球(renderOrder=10前後)より少し前
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
  return [x, y, z].map(v => THREE.MathUtils.clamp(v, -MAX, MAX));
}

export function updateMarker(target, position) {
  if (!target) return;

  const sanitized = sanitizePosition(position);
  if (!sanitized) return;

  target.position.set(sanitized[0], sanitized[1], sanitized[2]);
}

export function removeMarker(scene) {
  if (marker) {
    scene.remove(marker);
    marker = null;
  }
}