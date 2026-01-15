// viewer/runtime/renderer/microFX/glow.js
//
// micro-glow:
// - focusPosition をアンカーにした「光球」オーバーレイ。
// - 見た目サイズは screen px 基準（ズームしても一定）
//   → camera.fov + viewportHeight から world 長へ変換して scale を決める。
//
// 依存:
// - microFXConfig.glow.{screenPx, opacity, color, minWorld, maxWorld}
// - utils.worldSizeFromScreenPx / sanitizePosition / normalizeIntensity / clamp01

import * as THREE from "/viewer/vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";
import { createHtmlCanvas, getViewportHeightPxFallback } from "../env.js";
import {
  clamp01,
  normalizeIntensity,
  sanitizePosition,
  worldSizeFromScreenPx,
} from "./utils.js";

let glow = null;
let glowTexture = null;

// 中心が最も明るく、外へ行くほど透明になるテクスチャ
function getGlowTexture() {
  if (glowTexture) return glowTexture;

  const size = 256;
  const canvas = createHtmlCanvas();
  if (!canvas) return null;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0.0, "rgba(255,255,255,1.0)");
  g.addColorStop(0.20, "rgba(255,255,255,0.75)");
  g.addColorStop(0.45, "rgba(255,255,255,0.28)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  glowTexture = tex;
  return glowTexture;
}

function getViewportHeightPx(renderer) {
  if (renderer && typeof renderer.getSize === "function") {
    const v = new THREE.Vector2();
    renderer.getSize(v);
    if (Number.isFinite(v.y) && v.y > 0) return v.y;
  }
  const el = renderer?.domElement;
  const h = el && Number.isFinite(el.clientHeight) ? el.clientHeight : 0;
  if (h > 0) return h;
  // 最終手段（microFX は renderer を持っているはずだが）
  return getViewportHeightPxFallback();
}

export function ensureGlow(scene) {
  if (glow && glow.parent && glow.parent !== scene) {
    glow.parent.remove(glow);
    glow = null;
  }

  if (!glow) {
    const tex = getGlowTexture();
    const cfg = microFXConfig.glow || {};
    const color = cfg.color || "#66ccff";

    const mat = new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    glow = new THREE.Sprite(mat);
    glow.name = "micro-glow";
    glow.renderOrder = 997; // bounds(10-12) や axes(996) より前面
    glow.visible = false;

    // 後で update で上書きするけど初期値
    glow.scale.set(1, 1, 1);
  }

  if (glow.parent !== scene) {
    scene.add(glow);
  }
  return glow;
}

// position: microState.focusPosition（world, unitless）
// camera/renderer: screen px → world 長変換に必要
export function updateGlow(target, position, camera, renderer, intensity = 1) {
  if (!target) return;

  const p = sanitizePosition(position, null);
  const s = normalizeIntensity(intensity, 1);

  if (!p || !camera || s <= 0) {
    target.visible = false;
    return;
  }

  target.position.set(p[0], p[1], p[2]);

  const cfg = microFXConfig.glow || {};

  // 見た目サイズ（px）基準：直径扱い
  const screenPx = Number.isFinite(cfg.screenPx) ? cfg.screenPx : 64;

  const viewH = getViewportHeightPx(renderer);
  const dist = camera.position.distanceTo(target.position) || 1;

  // px → world 長（直径）
  let worldSize = worldSizeFromScreenPx(camera, viewH, screenPx, dist);

  // 安全弁（指定があれば）
  const minW = Number.isFinite(cfg.minWorld) ? cfg.minWorld : null;
  const maxW = Number.isFinite(cfg.maxWorld) ? cfg.maxWorld : null;
  if (minW != null) worldSize = Math.max(worldSize, minW);
  if (maxW != null) worldSize = Math.min(worldSize, maxW);

  // intensity でフェードアウト時は少し縮む（視覚的）
  const shrink = 0.7 + 0.3 * s;
  worldSize *= shrink;

  target.scale.set(worldSize, worldSize, 1);

  const mat = target.material;
  if (mat && "opacity" in mat) {
    const baseOpacity = Number.isFinite(cfg.opacity) ? cfg.opacity : 0.85;
    mat.transparent = true;
    mat.opacity = clamp01(baseOpacity * s);
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
  }

  target.visible = true;
}

export function removeGlow(scene) {
  if (!glow) return;

  glow.parent?.remove(glow);

  // material/texture は共有想定（texture は module singleton）
  try { glow.material?.dispose?.(); } catch (_e) {}

  glow = null;
}
