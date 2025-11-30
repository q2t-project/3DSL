// viewer/runtime/renderer/labels/textSprite.js
import * as THREE from "../../../../vendor/three/build/three.module.js";

export function createTextSprite(text, {
  fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize = 16,        // px
  color = "#ffffff",
  padding = 4,          // px
  bgColor = null,       // 例: "rgba(0,0,0,0.5)" / null
} = {}) {
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const fontPx = fontSize * dpr;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  ctx.font = `${fontPx}px ${fontFamily}`;
  const metrics = ctx.measureText(text || "");
  const textWidth = metrics.width;
  const textHeight = fontPx * 1.2; // 適当な行高さ

  const pad = padding * dpr;
  const cw = Math.ceil(textWidth + pad * 2);
  const ch = Math.ceil(textHeight + pad * 2);

  canvas.width = cw;
  canvas.height = ch;

  // 再セット（canvas サイズ変更で state が飛ぶため）
  ctx.font = `${fontPx}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
  }

  ctx.fillStyle = color;
  const cx = cw / 2;
  const cy = ch / 2;
  ctx.fillText(text || "", cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);

  // ワールド空間でのサイズ（大雑把な変換: px → world）
  // スケールの絶対値はあとで cameraState から調整する前提で、
  // ここでは「アスペクト比だけ正しく」しておく。
  const aspect = cw / ch || 1;
  const base = 1; // 後で距離ベースで掛ける係数
  sprite.scale.set(base * aspect, base, 1);

  return sprite;
}
