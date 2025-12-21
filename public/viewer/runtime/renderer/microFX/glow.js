// viewer/runtime/renderer/microFX/glow.js
import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";

let glow = null;
let glowTexture = null;

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

const MAX_COORD = 1e4;
function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function sanitizePosition(position) {
  if (!Array.isArray(position) || position.length < 3) return null;
  const raw = position.map((v) => Number(v));
  if (!raw.every((v) => Number.isFinite(v))) return null;
  return raw.map((v) => clamp(v, -MAX_COORD, MAX_COORD));
}

// px -> world（この式が“画面一定”の本体）
function worldSizeForPixels(camera, dist, px, viewportH) {
  const h = Math.max(1, Number(viewportH) || 0);
  const p = Math.max(0, Number(px) || 0);

  if (camera?.isPerspectiveCamera) {
    const fov = THREE.MathUtils.degToRad(camera.fov || 50);
    const worldH = 2 * dist * Math.tan(fov / 2);
    return worldH * (p / h);
  }

  if (camera?.isOrthographicCamera) {
    const worldH = (camera.top - camera.bottom) / (camera.zoom || 1);
    return worldH * (p / h);
  }

  return 0;
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
      // ここは true のままでOK（px→world で“見かけ一定”にする）
      sizeAttenuation: true,
      depthWrite: false,
      depthTest: false,
    });

    glow = new THREE.Sprite(material);
    glow.renderOrder = 9999;
  }

  if (glow.parent !== scene) scene.add(glow);
  return glow;
}

export function updateGlow(target, position, camera, intensity = 1, viewportH = window.innerHeight) {
  if (!target || !camera) return;

  const cfg = microFXConfig?.glow || {}; // ★これが無いと screenPx 効かん/落ちる

  let s = Number.isFinite(intensity) ? intensity : 1;
  s = clamp(s, 0, 1);
  if (s <= 0) { target.visible = false; return; }

  const p = sanitizePosition(position);
  if (!p) { target.visible = false; return; }

  target.visible = true;
  target.position.set(p[0], p[1], p[2]);

  // dist はアンカー位置基準
  let dist = camera.position.distanceTo(target.position) || 1.0;

  // オフセット（点→カメラ方向に“画面px相当”だけ前に出す）
  const offsetPx = Number.isFinite(cfg.offsetPx) ? cfg.offsetPx : 12;
  const toCameraDir = new THREE.Vector3().subVectors(camera.position, target.position).normalize();
  const offsetWorld = worldSizeForPixels(camera, dist, offsetPx, viewportH);
  if (offsetWorld > 0) target.position.addScaledVector(toCameraDir, offsetWorld);

  // dist はオフセット後で更新
  dist = camera.position.distanceTo(target.position) || 1.0;

  // スケール（画面px固定）
  const screenPx = Number.isFinite(cfg.screenPx) ? cfg.screenPx : 64;
  let scaleWorld = worldSizeForPixels(camera, dist, screenPx, viewportH);

  // 任意の安全柵（欲しいなら config で指定）
  if (Number.isFinite(cfg.minWorldScale)) scaleWorld = Math.max(scaleWorld, cfg.minWorldScale);
  if (Number.isFinite(cfg.maxWorldScale)) scaleWorld = Math.min(scaleWorld, cfg.maxWorldScale);

  target.scale.setScalar(scaleWorld);

  const mat = target.material;
  if (mat && "opacity" in mat) {
    mat.transparent = true;
    mat.opacity = s;
    mat.needsUpdate = true;
  }
}

export function removeGlow(scene) {
  if (glow) {
    scene.remove(glow);
    glow = null;
  }
}
