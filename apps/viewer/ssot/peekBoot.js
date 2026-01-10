// peekBoot.js
// Minimal host for Home "peek viewer": renderer + orbit input only (NO UI chrome)
// NOTE: This is intentionally standalone (no UI layer modules) to avoid "zombie UI" reappearing.

import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";

function showFatal(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.style.position = "fixed";
  pre.style.inset = "12px";
  pre.style.zIndex = "99999";
  pre.style.padding = "12px";
  pre.style.background = "rgba(0,0,0,.85)";
  pre.style.color = "#fff";
  pre.style.font = "12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace";
  pre.style.whiteSpace = "pre-wrap";
  pre.textContent = String(err?.stack || err);
  document.body.appendChild(pre);
}

window.addEventListener("error", (e) => showFatal(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => showFatal(e.reason));

function ensureWebGL(canvas) {
  const gl =
    canvas.getContext("webgl2", { antialias: true }) ||
    canvas.getContext("webgl", { antialias: true }) ||
    canvas.getContext("experimental-webgl");
  if (!gl) {
    showFatal(
      "WebGLが使えへんみたいや。\n" +
        "・ブラウザ設定でハードウェアアクセラレーションON\n" +
        "・GPUドライバ更新\n" +
        "・拡張(AdBlock等)を一旦OFF/シークレットで確認\n"
    );
    return false;
  }
  return true;
}

// 高DPRで落ちるPC対策（three側で setPixelRatio するならそっちでOK）
const DPR = Math.min(window.devicePixelRatio || 1, 2);

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function getModelUrlOrThrow() {
  const qs = new URLSearchParams(globalThis.location?.search ?? "");
  const raw = (qs.get("model") || qs.get("scene") || qs.get("src") || "").trim();
  if (!raw) return new URL("/3dss/scene/default/default.3dss.json", globalThis.location.origin).toString();
  if (/^https?:\/\//i.test(raw)) return raw;
  return new URL(raw, globalThis.location.href).toString();
}

function installOrbitInput(canvas, hub) {
  // NOTE: prefer hub.camera (command pipeline) over direct cameraEngine mutation.
  const cam =
    hub?.camera ??
    hub?.core?.camera ??
    hub?.core?.cameraEngine ??
    hub?.renderer?.camera ??
    null;

  if (!cam) throw new Error("[peekBoot] camera is missing");

  const missing = ["rotate", "pan", "zoom"].filter((k) => typeof cam?.[k] !== "function");
  if (missing.length) throw new Error(`[peekBoot] camera missing methods: ${missing.join(", ")}`);

  // prevent browser gestures (critical on mobile)
  try {
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
  } catch (_e) {}

  let activeId = null;
  let mode = "rotate"; // rotate|pan
  let lastX = 0;
  let lastY = 0;

  // touch multi-pointer
  const touches = new Map(); // id -> {x,y}
  let pinchLastDist = 0;
  let pinchLastMid = { x: 0, y: 0 };
  let pinchArmed = false;

  function setTouch(e) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  function delTouch(e) {
    touches.delete(e.pointerId);
  }

  function getDist(a, b) {
    const dx = a.x - b.x,
      dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function getMid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function onPointerDown(e) {
    try {
      e.preventDefault();
    } catch (_e) {}
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_e) {}

    if (e.pointerType === "touch") {
      setTouch(e);
      if (touches.size === 1) {
        activeId = e.pointerId;
        mode = "rotate";
        lastX = e.clientX;
        lastY = e.clientY;
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
    mode = e.button === 2 || e.ctrlKey || e.metaKey || e.shiftKey ? "pan" : "rotate";
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onPointerMove(e) {
    if (e.pointerType === "touch") {
      if (!touches.has(e.pointerId)) return;
      setTouch(e);
      try {
        e.preventDefault();
      } catch (_e) {}

      if (touches.size === 1 && activeId === e.pointerId) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
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

    if (activeId !== e.pointerId) return;
    try {
      e.preventDefault();
    } catch (_e) {}

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (mode === "pan") cam.pan(-dx, dy);
    else cam.rotate(-dx, -dy);
  }

  function onPointerUp(e) {
    try {
      e.preventDefault?.();
    } catch (_e) {}

    if (e.pointerType === "touch") {
      if (touches.has(e.pointerId)) delTouch(e);

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

      if (touches.size === 0) activeId = null;
      return;
    }

    if (activeId === e.pointerId) activeId = null;
  }

  function onWheel(e) {
    try {
      e.preventDefault();
    } catch (_e) {}
    const dy = clamp(Number(e.deltaY) || 0, -1200, 1200);
    cam.zoom(dy);
  }

  function onContextMenu(e) {
    try {
      e.preventDefault();
    } catch (_e) {}
  }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);
}

async function bootstrapCompat({ canvas, modelUrl }) {
  // まずは object 版を試して、ダメなら positional に落とす（署名違い吸収）
  try {
    return await bootstrapViewerFromUrl({ canvas, modelUrl, url: modelUrl, src: modelUrl, dpr: DPR });
  } catch (e1) {
    try {
      return await bootstrapViewerFromUrl(canvas, modelUrl);
    } catch (e2) {
      e1.cause = e2;
      throw e1;
    }
  }
}

(async function main() {
  const canvas =
    /** @type {HTMLCanvasElement|null} */ (
      document.querySelector('[data-role="viewer-canvas"]') ||
      document.getElementById("viewer-canvas")
    );

  if (!canvas) throw new Error("[peekBoot] viewer canvas not found");

  canvas.tabIndex = 0;
  canvas.focus?.();

  if (!ensureWebGL(canvas)) return;

  const modelUrl = getModelUrlOrThrow();

  const hub = await bootstrapCompat({ canvas, modelUrl });
  if (!hub) throw new Error("[peekBoot] bootstrap returned null hub");

  // 可能なら renderer の pixelRatio をクランプ
  const r = hub?.renderer?.renderer ?? hub?.renderer ?? null;
  if (r && typeof r.setPixelRatio === "function") {
    try {
      r.setPixelRatio(DPR);
    } catch (_e) {}
  }

  if (typeof hub.start === "function") hub.start();

  installOrbitInput(canvas, hub);

  window.__peek = { hub, modelUrl, DPR };
})().catch(showFatal);
