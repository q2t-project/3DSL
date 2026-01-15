// viewer/runtime/renderer/env.js
//
// Renderer-only environment helpers.
//
// Goal: isolate DOM/global references (window/document) to this module so the
// rest of renderer code can stay free of direct `window` / `document` usage.

function hasDocument() {
  return (typeof document !== "undefined") && !!document?.createElement;
}

export function createHtmlCanvas() {
  if (!hasDocument()) return null;
  const c = document.createElement("canvas");
  return c || null;
}

export function getDevicePixelRatio() {
  // `devicePixelRatio` is a window property in browsers, but `globalThis` is fine.
  const dpr = (typeof globalThis !== "undefined") ? globalThis.devicePixelRatio : 1;
  return (typeof dpr === "number" && Number.isFinite(dpr) && dpr > 0) ? dpr : 1;
}

export function getViewportHeightPxFallback() {
  const h = (typeof globalThis !== "undefined") ? globalThis.innerHeight : 0;
  return (typeof h === "number" && Number.isFinite(h) && h > 0) ? h : 720;
}

export function nowMs() {
  return (globalThis.performance?.now?.() ?? Date.now());
}
