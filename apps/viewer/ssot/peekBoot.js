// SSOT_EXCEPTION_HOST: A. UI無し (No-UI Host)
// Purpose: Minimal host for Home "peek viewer" (renderer + orbit input, NO UI chrome)
// Allowed: entry bootstrap (bootstrapPeekFromUrl) + PeekHandle.camera operations
// Forbidden: ui/* import, hub/core/renderer internal modules
// NOTE: This is intentionally standalone (no UI layer modules) to avoid "zombie UI" reappearing.

import { bootstrapPeekFromUrl } from "./runtime/bootstrapViewer.js";
import { INPUT_TUNING } from "./runtime/entry/inputTuning.js";

// 高DPRで落ちるPC対策（renderer側 setPixelRatio するならそっちでOK）
const DPR = Math.min(window.devicePixelRatio || 1, 2);

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

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function getModelUrlOrThrow() {
  const qs = new URLSearchParams(globalThis.location?.search ?? "");
  const raw = (qs.get("model") || qs.get("scene") || qs.get("src") || "").trim();
  if (!raw) {
    return new URL("/3dss/scenes/top/top.3dss.json", globalThis.location.origin).toString();
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  return new URL(raw, globalThis.location.href).toString();
}

function installOrbitInput(canvas, cam) {
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

  // ------------------------------------------------------------
  // pointer delta -> camera inputs
  // NOTE: Keep tuning consistent with viewer UI defaults.
  // ------------------------------------------------------------
  const T = INPUT_TUNING?.pointer || {};

  function _getDistanceFallback() {
    const st = typeof cam.getState === "function" ? cam.getState() : null;
    const d = Number(st?.distance);
    return Number.isFinite(d) ? d : 10;
  }

  function _resolvePointerTuning(e, kind) {
    const isTouch = e?.pointerType === "touch";
    const isFast = !!e?.shiftKey;

    if (kind === "rotate") {
      const base = isFast ? Number(T.rotateSpeedFast) : Number(T.rotateSpeed);
      const mul = isTouch ? Number(T.peekTouchRotateMul ?? 1) : Number(T.peekPointerRotateMul ?? 1);
      const v = Number.isFinite(base) ? base : 0.001;
      return v * (Number.isFinite(mul) ? mul : 1);
    }

    if (kind === "panSpeed") {
      const base = isFast ? Number(T.panSpeedFast) : Number(T.panSpeed);
      const mul = isTouch ? Number(T.peekTouchPanMul ?? 1) : Number(T.peekPointerPanMul ?? 1);
      const v = Number.isFinite(base) ? base : 0.002;
      return v * (Number.isFinite(mul) ? mul : 1);
    }

    if (kind === "wheelZoom") {
      const base = isFast ? Number(T.wheelZoomSpeedFast) : Number(T.wheelZoomSpeed);
      return Number.isFinite(base) ? base : 0.00035;
    }

    if (kind === "pinchZoom") {
      const base = isFast ? Number(T.pinchZoomSpeedFast) : Number(T.pinchZoomSpeed);
      return Number.isFinite(base) ? base : 0.0007;
    }

    return 0;
  }

  function rotateFromPixels(dxPx, dyPx, e) {
    const s = _resolvePointerTuning(e, "rotate");
    cam.rotate(dxPx * s, dyPx * s);
  }

  function panFromPixels(dxPx, dyPx, e) {
    const distance = Math.max(0.001, _getDistanceFallback());
    const panFactor = Number.isFinite(Number(T.panFactor)) ? Number(T.panFactor) : 0.02;
    const panSpeed = _resolvePointerTuning(e, "panSpeed");
    const panScale = distance * panFactor;
    const panX = dxPx * panSpeed * panScale;
    const panY = dyPx * panSpeed * panScale;
    cam.pan(panX, panY);
  }

  function zoomFromWheelDelta(deltaY, e) {
    const s = _resolvePointerTuning(e, "wheelZoom");
    cam.zoom(deltaY * s);
  }

  function zoomFromPinchDistDelta(ddPx, e) {
    const s = _resolvePointerTuning(e, "pinchZoom");
    // pinch: fingers apart (dd>0) should zoom-in => negative zoomDelta
    cam.zoom(-ddPx * s);
  }

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
    try { e.preventDefault(); } catch (_e) {}
    try { canvas.setPointerCapture(e.pointerId); } catch (_e) {}

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
      try { e.preventDefault(); } catch (_e) {}

      if (touches.size === 1 && activeId === e.pointerId) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        rotateFromPixels(dx, dy, e);
        return;
      }

      if (touches.size === 2 && pinchArmed) {
        const pts = Array.from(touches.values());
        const dist = getDist(pts[0], pts[1]);
        const mid = getMid(pts[0], pts[1]);

        // pinch => zoom
        const dd = dist - pinchLastDist;
        pinchLastDist = dist;
        zoomFromPinchDistDelta(dd, e);

        // 2-finger move => pan
        const dxm = mid.x - pinchLastMid.x;
        const dym = mid.y - pinchLastMid.y;
        pinchLastMid = mid;
        panFromPixels(dxm, dym, e);
        return;
      }
      return;
    }

    if (activeId !== e.pointerId) return;
    try { e.preventDefault(); } catch (_e) {}

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (mode === "pan") panFromPixels(dx, dy, e);
    else rotateFromPixels(dx, dy, e);
  }

  function onPointerUp(e) {
    try { e.preventDefault?.(); } catch (_e) {}

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
    try { e.preventDefault(); } catch (_e) {}
    const dy = clamp(Number(e.deltaY) || 0, -1200, 1200);
    zoomFromWheelDelta(dy, e);
  }

  function onContextMenu(e) {
    try { e.preventDefault(); } catch (_e) {}
  }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);

  // cleanup を返しとく（host責務）
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", onContextMenu);
  };
}

(async function main() {
  const canvas =
    /** @type {HTMLCanvasElement|null} */ (
      document.querySelector('[data-role="viewer-canvas"]') ||
      document.getElementById("viewer-canvas")
    );

  if (!canvas) throw new Error("[peekBoot] viewer canvas not found");

  // NOTE: In embedded contexts (e.g., Library detail / Top page peek iframe),
  // forcing focus causes the browser to scroll the parent page to the iframe.
  // Auto-focus only when running standalone (top-level).
  canvas.tabIndex = 0;
  const isEmbedded = (() => {
    try {
      return window.top !== window.self;
    } catch {
      // If cross-origin access throws, assume embedded.
      return true;
    }
  })();

  if (!isEmbedded) {
    // Defer focus to avoid layout/scroll surprises during first paint.
    requestAnimationFrame(() => canvas.focus?.());
  }

  if (!ensureWebGL(canvas)) return;

  const modelUrl = getModelUrlOrThrow();

  const peek = await bootstrapPeekFromUrl(canvas, modelUrl, { dpr: DPR });
  if (!peek) throw new Error("[peekBoot] bootstrap returned null peek handle");

  // レンダーループ開始は host が握る
  peek.start?.();


  // Debug pose snapshot bridge (for /app/compare)
  // - enabled only when ?debugPose=1
  // - request: postMessage({ type: '3DSL_GET_DEBUG_POSE', requestId, uuids: [...] }, '*')
  // - response: postMessage({ type: '3DSL_DEBUG_POSE', requestId, snapshot }, '*')
  const _enableDebugPose = (() => {
    try {
      const sp = new URLSearchParams(globalThis.location?.search ?? "");
      return sp.get("debugPose") === "1";
    } catch (_e) {
      return false;
    }
  })();

  if (_enableDebugPose) {
    const getSnapshot = (msg) => {
      try {
        const uuids = Array.isArray(msg?.uuids) ? msg.uuids : [];
        return peek?.debugPose?.({ uuids }) ?? null;
      } catch (_e) {
        return null;
      }
    };

    // Direct call hook (for devtools)
    try { globalThis.__3dslDebugPose = () => getSnapshot({}); } catch (_e) {}

    window.addEventListener("message", (ev) => {
      const data = ev?.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "3DSL_GET_DEBUG_POSE") return;
      const requestId = data.requestId;
      const snapshot = getSnapshot(data);
      try {
        ev.source?.postMessage?.({ type: "3DSL_DEBUG_POSE", requestId, snapshot }, "*");
      } catch (_e) {
        try { window.parent?.postMessage?.({ type: "3DSL_DEBUG_POSE", requestId, snapshot }, "*"); } catch (_e2) {}
      }
    });
  }

  const uninstallInput = installOrbitInput(canvas, peek.camera);

  function resizeToCanvas() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    peek.resize?.(w, h, DPR);
  }

  resizeToCanvas();
  window.addEventListener("resize", resizeToCanvas, { passive: true });

  // 任意：離脱時の後始末
  window.addEventListener(
    "pagehide",
    () => {
      window.removeEventListener("resize", resizeToCanvas);
      try { uninstallInput?.(); } catch (_e) {}
      peek.dispose?.();
    },
    { passive: true }
  );

  // debug: ?dbgPeek=1 の時だけ露出（Hubは露出しない）
  try {
    const sp = new URLSearchParams(globalThis.location?.search ?? "");
    if (sp.get("dbgPeek") === "1") globalThis.__peek = { peek, modelUrl, DPR };
  } catch (_e) {}
})().catch(showFatal);
