// viewer/runtime/renderer/microFX/glow.js

import * as THREE from "../../../../vendor/three/build/three.module.js";

let glow = null;
const OFFSET = 0.01; // 位置オフセットはやや控えめに

export function ensureGlow(scene) {
  if (glow && glow.parent !== scene) {
    glow.parent?.remove(glow);
    glow = null;
  }

  if (!glow) {
    const material = new THREE.SpriteMaterial({
      color: "#ffffaa",
      transparent: true,
      opacity: 0.25,             // ちょっと弱め
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      depthTest: false,
    });
    glow = new THREE.Sprite(material);
    glow.renderOrder = 998;
  }

  if (glow.parent !== scene) {
    scene.add(glow);
  }

  return glow;
}

function sanitizePosition(position) {
  if (!Array.isArray(position) || position.length < 3) return null;

  const [x, y, z] = position.map((v) => Number(v));

  if (![x, y, z].every((v) => Number.isFinite(v))) return null;

  return [x, y, z];
}

export function updateGlow(target, position, camera) {
  if (!target) return;
  if (!camera) return;

  const sanitized = sanitizePosition(position);
  if (!sanitized) return;

  target.position.set(sanitized[0], sanitized[1], sanitized[2]);

  const cameraToPoint = new THREE.Vector3()
    .subVectors(target.position, camera.position)
    .normalize()
    .multiplyScalar(OFFSET * camera.position.distanceTo(target.position));

  target.position.add(cameraToPoint);
  
  // glow サイズも距離依存で拡縮（最小/最大をクランプ）
  const dist = camera.position.distanceTo(target.position);
  const rawScale   = dist * 0.035;
  const clampedMin = 0.18;
  const clampedMax = 1.5;
  const scale      = Math.min(Math.max(rawScale, clampedMin), clampedMax);
  target.scale.setScalar(scale);
}

export function removeGlow(scene) {
  if (glow) {
    scene.remove(glow);
    glow = null;
  }
}