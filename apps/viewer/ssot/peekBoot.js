// peekBoot.js
// Minimal host for Home "peek viewer": renderer + orbit input only (NO UI chrome)
// NOTE: This is intentionally standalone (no UI layer modules) to avoid "zombie UI" reappearing.

import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";

function showFatal(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.style.cssText = "position:fixed;inset:0;margin:0;padding:12px;background:#000;color:#fff;white-space:pre-wrap;z-index:99999;";
  pre.textContent = String(err?.stack || err);
  document.body.appendChild(pre);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function installOrbitInput(canvas, hub) {
  // NOTE: Use hub.camera (command pipeline) instead of core.cameraEngine direct mutation.
  // Direct mutation can render only the initial frame on some devices/builds.
  // Current hub contract exposes camera commands via `hub.core.camera`.
  // Keep backward compatibility with older `hub.camera`.
  const cam = hub?.camera ?? hub?.core?.camera;
  if (!cam) throw new Error('[peekBoot] camera is missing');

  // prevent browser gestures (critical on mobile)
  try {
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
  } catch (_e) {}

  // basic tuning (keep modest; Home peek is not for precision work)
  const ROTATE_SPEED = 0.008; // radians per px
  const PAN_SPEED = 0.0025;   // world-ish scale factor (cameraEngine handles scaling internally)
  const WHEEL_ZOOM = 0.0012;  // zoom per wheel deltaY px
  const PINCH_ZOOM = 0.0030;  // zoom per pinch px (distance delta)

  let activeId = null;
  let mode = "rotate"; // rotate|pan
  let lastX = 0;
  let lastY = 0;

  // touch multi-pointer
  const touches = new Map(); // id -> {x,y}
  let pinchLastDist = 0;
  let pinchLastMid = { x: 0, y: 0 };
  let pinchArmed = false;

  function setTouch(e) { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); }
  function delTouch(e) { touches.delete(e.pointerId); }

  function getDist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
  }
  function getMid(a, b) { return { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }; }

  function onPointerDown(e) {
    // ignore non-primary buttons except right-button pan
    try { e.preventDefault(); } catch (_e) {}
    try { canvas.setPointerCapture(e.pointerId); } catch (_e) {}

    if (e.pointerType === "touch") {
      setTouch(e);
      if (touches.size === 1) {
        activeId = e.pointerId;
        mode = "rotate";
        lastX = e.clientX; lastY = e.clientY;
        pinchArmed = false;
      } else if (touches.size === 2) {
        const pts = Array.from(touches.values());
        pinchLastDist = getDist(pts[0], pts[1]);
        pinchLastMid = getMid(pts[0], pts[1]);
        pinchArmed = true;
      }
      return;
    }

    activeId = e.pointerId;
    mode = (e.button === 2 || e.ctrlKey || e.metaKey || e.shiftKey) ? "pan" : "rotate";
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onPointerMove(e) {
    if (e.pointerType === "touch") {
      if (!touches.has(e.pointerId)) return;
      setTouch(e);
      try { e.preventDefault(); } catch (_e) {}

      if (touches.size === 1 && activeId === e.pointerId) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        cam.rotate(-dx, -dy);
        return;
      }

      if (touches.size === 2 && pinchArmed) {
        const pts = Array.from(touches.values());
        const dist = getDist(pts[0], pts[1]);
        const mid = getMid(pts[0], pts[1]);

        // pinch => zoom
        const dd = dist - pinchLastDist;
        pinchLastDist = dist;
        cam.zoom(-dd);

        // 2-finger move => pan
        const dxm = mid.x - pinchLastMid.x;
        const dym = mid.y - pinchLastMid.y;
        pinchLastMid = mid;
        cam.pan(-dxm, dym);
        return;
      }
      return;
    }

    // mouse/pen: drag => rotate or pan
    if (activeId !== e.pointerId) return;
    try { e.preventDefault(); } catch (_e) {}

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;

    if (mode === "pan") {
      cam.pan(-dx, dy);
    } else {
      cam.rotate(-dx, -dy);
    }
  }

  function onPointerUp(e) {
    try { e.preventDefault?.(); } catch (_e) {}
    if (e.pointerType === "touch") {
      if (touches.has(e.pointerId)) delTouch(e);
      // if one finger remains, re-arm single-finger rotate
      if (touches.size === 1) {
        const only = Array.from(touches.entries())[0];
        activeId = only[0];
        mode = "rotate";
        lastX = only[1].x;
        lastY = only[1].y;
        pinchArmed = false;
      } else if (touches.size < 2) {
        pinchArmed = false;
      }
      if (touches.size === 0) {
        activeId = null;
      }
      return;
    }

    if (activeId === e.pointerId) {
      activeId = null;
    }
  }

  function onWheel(e) {
    try { e.preventDefault(); } catch (_e) {}
    // normalize: positive deltaY => zoom out
    const dy = clamp(Number(e.deltaY) || 0, -1200, 1200);
    cam.zoom(dy);
  }

  function onContextMenu(e) { try { e.preventDefault(); } catch (_e) {} }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);
}


function getModelUrlOrThrow() {
  const qs = new URLSearchParams(globalThis.location?.search ?? "");
  const raw = (qs.get("model") || qs.get("scene") || qs.get("src") || "").trim();
  if (!raw) return new URL("/3dss/sample/3dsl_concept.3dss.json", globalThis.location.origin).toString();
  // absolute URL
  if (/^https?:\/\//i.test(raw)) return raw;
  // resolve relative to this page
  return new URL(raw, globalThis.location.href).toString();
}

(async function main() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("viewer-canvas"));
  if (!canvas) throw new Error("[peekBoot] #viewer-canvas not found");

  const modelUrl = getModelUrlOrThrow();

  // NOTE: runtime/bootstrapViewer.js signature is (canvasOrId, url, options)
  const hub = await bootstrapViewerFromUrl(canvas, modelUrl, {
    devBootLog: false,
    devLabel: "peek",
  });

  hub.start();
  installOrbitInput(canvas, hub);

  window.__peek = { hub };
})().catch(showFatal);
