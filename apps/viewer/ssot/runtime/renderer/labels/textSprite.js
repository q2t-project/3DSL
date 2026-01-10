// viewer/runtime/renderer/labels/textSprite.js
//
// ラベル用 CanvasTexture 生成＋同一テキスト/同一ラスタ条件で Texture 共有（refCount）
// - renderer 内専用（three.js 依存あり）
// - 生成: createTextLabelObject(text,label)
// - 破棄: disposeTextLabelObject(obj) で release される

import * as THREE from "/viewer/vendor/three/build/three.module.js";
import { labelConfig } from "./labelConfig.js";
import { createHtmlCanvas, getDevicePixelRatio } from "../env.js";

function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function getDpr() { return getDevicePixelRatio(); }

function buildRasterSpecFromLabel(label, cfg = labelConfig) {
  const base = Number(cfg?.baseLabelSize) || 8;
  const size = Number(label?.size) || base;
  const sizeFactor = size / base;

  const raster = cfg?.raster || {};
  const supersamplePx = Number(raster.supersamplePx) || 64;
  const minFontPx = Number(raster.minFontPx) || 8;
  const maxFontPx = Number(raster.maxFontPx) || 256;
  const padding = Number(raster.padding) || 4;
  const fontFamily =
    (typeof raster.fontFamily === "string" && raster.fontFamily) ||
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const dpr = getDpr();
  const fontPx = clamp(supersamplePx * sizeFactor, minFontPx, maxFontPx) * dpr;

  const outline = cfg?.outline || {};
  const outlineEnabled = outline.enabled !== false;
  const outlineWidthPx = (Number(outline.widthPx) || 0) * dpr;
  const extraPaddingPx = (Number(outline.extraPaddingPx) || 0) * dpr;

  const pad = padding * dpr + (outlineEnabled ? extraPaddingPx : 0);

  const textCfg = cfg?.text || {};
  const fillStyle = (typeof textCfg.fillStyle === "string" && textCfg.fillStyle) || "#ffffff";

  const bg = cfg?.background || {};
  const bgEnabled = !!bg.enabled;
  const bgFillStyle = (typeof bg.fillStyle === "string" && bg.fillStyle) || "rgba(0,0,0,0.65)";

  return {
    dpr,
    fontFamily,
    fontPx,
    pad,
    fillStyle,
    bgEnabled,
    bgFillStyle,
    outlineEnabled,
    outlineWidthPx,
    outlineColor: (typeof outline.color === "string" && outline.color) || "rgba(0,0,0,0.95)",
    outlineLineJoin: (typeof outline.lineJoin === "string" && outline.lineJoin) || "round",
  };
}

function rasterizeTextToCanvas(text, rasterSpec) {
  const canvas = createHtmlCanvas();
  if (!canvas) return { canvas: null, w: 0, h: 0, aspect: 1 };
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas: null, w: 0, h: 0, aspect: 1 };

  const t = text == null ? "" : String(text);

  // measure
  ctx.font = `${rasterSpec.fontPx}px ${rasterSpec.fontFamily}`;
  const metrics = ctx.measureText(t);
  const textWidth = Number(metrics.width) || 0;
  const textHeight = rasterSpec.fontPx * 1.2;

  const cw = Math.ceil(textWidth + rasterSpec.pad * 2);
  const ch = Math.ceil(textHeight + rasterSpec.pad * 2);
  canvas.width = Math.max(1, cw);
  canvas.height = Math.max(1, ch);

  // reset after resize
  ctx.font = `${rasterSpec.fontPx}px ${rasterSpec.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (rasterSpec.bgEnabled) {
    ctx.fillStyle = rasterSpec.bgFillStyle;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (rasterSpec.outlineEnabled && rasterSpec.outlineWidthPx > 0) {
    ctx.lineJoin = rasterSpec.outlineLineJoin;
    ctx.lineWidth = rasterSpec.outlineWidthPx;
    ctx.strokeStyle = rasterSpec.outlineColor;
    ctx.strokeText(t, cx, cy);
  }

  ctx.fillStyle = rasterSpec.fillStyle;
  ctx.fillText(t, cx, cy);

  const aspect = (canvas.width / canvas.height) || 1;
  return { canvas, w: canvas.width, h: canvas.height, aspect };
}

function canvasToTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// ------------------------------------------------------------
// Texture cache (shared by identical raster result)
// ------------------------------------------------------------

/** @type {Map<string, {texture:THREE.Texture, w:number, h:number, aspect:number, refs:number}>} */
const _textTexCache = new Map();

export function makeTextTextureKey(text, label, cfg = labelConfig) {
  const rasterSpec = buildRasterSpecFromLabel(label, cfg);
  const t = text == null ? "" : String(text);

  const fp = Math.round(rasterSpec.fontPx);
  const pad = Math.round(rasterSpec.pad);
  const ow = Math.round(rasterSpec.outlineWidthPx);

  const bg = rasterSpec.bgEnabled ? rasterSpec.bgFillStyle : "";
  const ol = rasterSpec.outlineEnabled
    ? `${ow}:${rasterSpec.outlineColor}:${rasterSpec.outlineLineJoin}`
    : "";

  return [
    "t", t,
    "ff", rasterSpec.fontFamily,
    "fp", fp,
    "pad", pad,
    "fill", rasterSpec.fillStyle,
    "bg", rasterSpec.bgEnabled ? "1" : "0",
    "bgc", bg,
    "ol", rasterSpec.outlineEnabled ? "1" : "0",
    "olc", ol,
  ].join("|");
}

export function acquireTextTexture(text, label, cfg = labelConfig) {
  const key = makeTextTextureKey(text, label, cfg);
  const hit = _textTexCache.get(key);
  if (hit) {
    hit.refs++;
    return { key, texture: hit.texture, w: hit.w, h: hit.h, aspect: hit.aspect };
  }

  const rasterSpec = buildRasterSpecFromLabel(label, cfg);
  const { canvas, w, h, aspect } = rasterizeTextToCanvas(text, rasterSpec);
  if (!canvas) return null;

  const texture = canvasToTexture(canvas);
  _textTexCache.set(key, { texture, w, h, aspect, refs: 1 });
  return { key, texture, w, h, aspect };
}

export function releaseTextTexture(key) {
  if (!key) return;
  const hit = _textTexCache.get(key);
  if (!hit) return;

  hit.refs--;
  if (hit.refs <= 0) {
    try { hit.texture.dispose(); } catch (_e) {}
    _textTexCache.delete(key);
  }
}

// Mesh label 用 PlaneGeometry を共有（大量ラベルで alloc 減）
const _sharedPlaneGeom = new THREE.PlaneGeometry(1, 1);

function applyPlaneOrientation(obj, plane) {
  const p = (typeof plane === "string" ? plane : "billboard").toLowerCase();
  if (p === "xy") obj.rotation.set(0, 0, 0);
  else if (p === "yz") obj.rotation.set(0, Math.PI / 2, 0);
  else if (p === "zx") obj.rotation.set(-Math.PI / 2, 0, 0);
}

export function createTextLabelObjectFromTexture(texture, label, meta = {}) {
  if (!texture) return null;

  const plane = (typeof label?.plane === "string" ? label.plane : "billboard").toLowerCase();
  const isBillboard = plane === "billboard";
  const aspect = Number(meta.aspect) || 1;

  let obj;
  if (isBillboard) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    obj = new THREE.Sprite(material);
  } else {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    obj = new THREE.Mesh(_sharedPlaneGeom, material);
    obj.userData.__labelSharedGeom = true;
    applyPlaneOrientation(obj, plane);
  }

  obj.userData.__labelAspect = aspect;
  obj.userData.__labelRasterPx = { w: Number(meta.w) || 0, h: Number(meta.h) || 0 };
  obj.userData.__labelPlane = plane;

  // 初期は aspect だけ合わせる（絶対スケールは runtime 側で決める）
  obj.scale.set(aspect, 1, 1);

  return obj;
}

export function createTextLabelObject(text, label, cfg = labelConfig) {
  const acquired = acquireTextTexture(text, label, cfg);
  if (!acquired) return null;

  const obj = createTextLabelObjectFromTexture(acquired.texture, label, acquired);
  if (!obj) {
    releaseTextTexture(acquired.key);
    return null;
  }

  // shared texture の refCount 管理用
  obj.userData.__labelTexKey = acquired.key;
  return obj;
}

export function disposeTextLabelObject(obj) {
  if (!obj) return;

  const key = obj.userData?.__labelTexKey;
  if (key) releaseTextTexture(key);

  // material は各ラベル専用
  const mat = obj.material;
  if (mat && typeof mat.dispose === "function") {
    // shared texture は release 側で管理
    mat.dispose();
  }

  // geometry: 共有 plane は触らん。Sprite も触らん（内部共有の可能性）。
  const geom = obj.geometry;
  const isShared = !!obj.userData?.__labelSharedGeom || geom === _sharedPlaneGeom;
  if (!isShared && geom && typeof geom.dispose === "function") {
    geom.dispose();
  }
}

// 互換: 旧 createTextSprite（billboard 前提）
export function createTextSprite(text, opts = {}) {
  const label = {
    size: opts.fontSize ? (Number(opts.fontSize) / 1.5) : 8,
    plane: "billboard",
  };

  const tmpCfg = {
    ...labelConfig,
    raster: {
      ...labelConfig.raster,
      fontFamily: opts.fontFamily || labelConfig.raster.fontFamily,
      padding: Number.isFinite(opts.padding) ? opts.padding : labelConfig.raster.padding,
    },
    text: { fillStyle: opts.color || labelConfig.text.fillStyle },
    background: {
      enabled: !!opts.bgColor,
      fillStyle: opts.bgColor || labelConfig.background.fillStyle,
    },
  };

  return createTextLabelObject(text, label, tmpCfg);
}
