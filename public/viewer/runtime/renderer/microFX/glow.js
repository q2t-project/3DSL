// viewer/runtime/renderer/microFX/glow.js

import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";

// unitless な world 座標系上での「輝き」オーバーレイ。
// position, offsetFactor, scalePerDistance などはすべて無次元スカラーとして扱う。

let glow = null;
let glowTexture = null;

// 中心が最も明るく、外側へ向かって透明になるラジアルグラデのテクスチャ
function getGlowTexture() {
  if (glowTexture) return glowTexture;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.7)");
  grad.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  glowTexture = tex;
  return glowTexture;
}

const MAX_COORD = 1e4; // 数値暴走だけ抑える。単位はここでは規定しない。

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function ensureGlow(scene) {
  if (glow && glow.parent !== scene) {
    glow.parent?.remove(glow);
    glow = null;
  }

  if (!glow) {
    const tex = getGlowTexture();
    if (!tex) return null;
    const material = new THREE.SpriteMaterial({
      map: tex,
      color: new THREE.Color("#00ffff"),
      transparent: true,
      opacity: 1.0,
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

  const raw = position.map((v) => Number(v));
  if (!raw.every((v) => Number.isFinite(v))) return null;

  // unitless な world 座標として ±MAX_COORD にだけクランプ
  return raw.map((v) => clamp(v, -MAX_COORD, MAX_COORD))
}

export function updateGlow(target, position, camera) {
  if (!target) return;
  if (!camera) return;

  const sanitized = sanitizePosition(position);
  if (!sanitized) return;

  target.position.set(sanitized[0], sanitized[1], sanitized[2]);

  const cfg = microFXConfig.glow || {};

  // 距離は「点とカメラの現在距離」
  const dist = camera.position.distanceTo(target.position) || 1.0;

  // 設定が無ければ適当なデフォルトを持つ
  const offsetFactor = Number.isFinite(cfg.offsetFactor)
    ? cfg.offsetFactor
    : 0.04;
  const baseScale = Number.isFinite(cfg.baseScale)
    ? cfg.baseScale
    : 0.3;
  const minScale = Number.isFinite(cfg.minScale) ? cfg.minScale : 0.1;
  const maxScale = Number.isFinite(cfg.maxScale) ? cfg.maxScale : 3.0;

  // ★ オフセット方向を「点 → カメラ」にする
  const toCameraDir = new THREE.Vector3()
    .subVectors(camera.position, target.position)
    .normalize();

  const offset = dist * offsetFactor;
  target.position.addScaledVector(toCameraDir, offset);

  // ★ スケールは world 固定（カメラ距離には依存させない）
  //    → ズームすると画面上では一緒に大きく／小さく見える。
  const scale = clamp(baseScale, minScale, maxScale);
  target.scale.setScalar(scale);
}
export function removeGlow(scene) {
  if (glow) {
    scene.remove(glow);
    glow = null;
  }
}