// viewerHost.js

import { bootstrapViewerFromUrl, bootstrapViewer } from "./runtime/bootstrapViewer.js";
import { attachUiProfile } from "./ui/attachUiProfile.js";
import { resizeHub, startHub } from "./ui/hubOps.js";
import { teardownPrev, setOwnedHandle } from "./ui/ownedHandle.js";

export async function mountViewerHost(opts) {
  const {
    canvasId = "viewer-canvas",
    modelUrl,
    document3dss,
    modelLabel,
    profile = "prod_full",
    gizmoWrapperId = "gizmo-slot",
    timelineRootId = "timeline-root",
    devBootLog = false,
  } = opts || {};

  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`[viewerHost] canvas not found: ${canvasId}`);

  const owned = { hub: null, ui: null };
  let ro = null;
  let disposed = false;
  let loggedViewportMismatch = false;

  // iOS/DevTools emulation can report a "layout viewport" width larger than the
  // visual viewport (e.g. ~980px vs 430px). When that happens, the renderer is
  // sized to the larger width and the user sees only the left half.
  //
  // We guard against this by:
  // - enforcing safe CSS on the canvas/html/body (important)
  // - clamping sizing to visualViewport when it clearly disagrees
  const visualViewport = window.visualViewport || null;
  let vvOnChange = null;
  function applyViewportCssGuards() {
    try {
      const el = document.documentElement;
      const body = document.body;

      el?.style?.setProperty?.("overflow", "hidden", "important");
      el?.style?.setProperty?.("overflow-x", "hidden", "important");
      body?.style?.setProperty?.("overflow", "hidden", "important");
      body?.style?.setProperty?.("overflow-x", "hidden", "important");
      body?.style?.setProperty?.("margin", "0", "important");
      body?.style?.setProperty?.("padding", "0", "important");
      body?.style?.setProperty?.("width", "100%", "important");
      body?.style?.setProperty?.("height", "100%", "important");

      canvas?.style?.setProperty?.("position", "absolute", "important");
      canvas?.style?.setProperty?.("inset", "0", "important");
      canvas?.style?.setProperty?.("display", "block", "important");
      canvas?.style?.setProperty?.("width", "100%", "important");
      canvas?.style?.setProperty?.("height", "100%", "important");
      canvas?.style?.setProperty?.("max-width", "100%", "important");
      canvas?.style?.setProperty?.("max-height", "100%", "important");
      canvas?.style?.setProperty?.("touch-action", "none", "important");
    } catch (_e) {}
  }
  applyViewportCssGuards();

  // 1フレームに1回だけ resize を流す（ResizeObserver の連打対策）
  let rafId = 0;
  let pendingW = 0;
  let pendingH = 0;
  function requestResize(w, h) {
    pendingW = w;
    pendingH = h;
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      const hub = owned.hub;
      if (!hub) return;
      if (pendingW > 0 && pendingH > 0) resizeHub(hub, pendingW, pendingH);
    });
  }

  function readCanvasClientSize() {
    // Prefer real rendered rect; fall back to client size.
    const r = canvas.getBoundingClientRect?.();
    let w = r ? Math.floor(r.width) : 0;
    let h = r ? Math.floor(r.height) : 0;

    const cw = canvas.clientWidth || 0;
    const ch = canvas.clientHeight || 0;
    if (cw > 0 && ch > 0) {
      w = cw;
      h = ch;
    }

    // Clamp to the *visual* viewport when layout viewport goes wild.
    const vw = visualViewport ? Math.floor(visualViewport.width) : 0;
    const vh = visualViewport ? Math.floor(visualViewport.height) : 0;
    const iw = Math.floor(window.innerWidth || 0);
    const ih = Math.floor(window.innerHeight || 0);
    const refW = vw || iw || 0;
    const refH = vh || ih || 0;

    let clamped = false;
    if (refW > 0) {
      if (w <= 0) {
        w = refW;
        clamped = true;
      } else if (w > refW * 1.2) {
        w = refW;
        clamped = true;
      }
    }
    if (refH > 0) {
      if (h <= 0) {
        h = refH;
        clamped = true;
      } else if (h > refH * 1.2) {
        h = refH;
        clamped = true;
      }
    }

    // If we had to clamp, force CSS pixel sizing so subsequent rect/client sizes stabilize.
    if (clamped && refW > 0 && refH > 0) {
      if (!loggedViewportMismatch) {
        loggedViewportMismatch = true;
        try {
          const r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
          // eslint-disable-next-line no-console
          console.info("[viewerHost] viewport mismatch detected (clamping)", {
            rect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
            client: { w: canvas.clientWidth || 0, h: canvas.clientHeight || 0 },
            visualViewport: visualViewport
              ? { w: Math.round(visualViewport.width), h: Math.round(visualViewport.height), scale: visualViewport.scale }
              : null,
            inner: { w: Math.round(window.innerWidth || 0), h: Math.round(window.innerHeight || 0) },
            chosen: { w: refW, h: refH },
          });
        } catch (_e) {}
      }
      try {
        canvas.style.setProperty("width", `${refW}px`, "important");
        canvas.style.setProperty("height", `${refH}px`, "important");
      } catch (_e) {}
    }

    return { w, h };
  }

  try {
    if (document3dss && typeof document3dss === "object") {
      setOwnedHandle(owned, "hub", await bootstrapViewer(canvasId, document3dss, {
        devBootLog,
        devLabel: "viewer_host",
        modelUrl: modelLabel || "(local file)",
      }));
    } else {
      if (!modelUrl) throw new Error('[viewerHost] modelUrl or document3dss required');
      setOwnedHandle(owned, "hub", await bootstrapViewerFromUrl(canvasId, modelUrl, {
        devBootLog,
        devLabel: "viewer_host",
      }));
    }
    const hub = owned.hub;

    // attach（profile で分岐はここだけ）
    setOwnedHandle(owned, "ui", attachUiProfile(hub, {
      profile,
      canvas,
      win: window,
      doc: document,
      gizmoWrapper: document.getElementById(gizmoWrapperId),
      timelineRoot: document.getElementById(timelineRootId) || document,
      force: true,
    }));
    void owned.ui; // 参照だけ（未使用警告対策）

    // ResizeObserver（host の責務）
    ro = new ResizeObserver(() => {
      if (disposed) return;
      applyViewportCssGuards();
      const { w, h } = readCanvasClientSize();
      if (w > 0 && h > 0) requestResize(w, h);
    });
    ro.observe(canvas);

    // visualViewport can change without triggering ResizeObserver (URL bar show/hide, zoom, etc.)
    if (visualViewport) {
      vvOnChange = () => {
        if (disposed) return;
        applyViewportCssGuards();
        const { w, h } = readCanvasClientSize();
        if (w > 0 && h > 0) requestResize(w, h);
      };
      try { visualViewport.addEventListener("resize", vvOnChange, { passive: true }); } catch (_e) {}
      try { visualViewport.addEventListener("scroll", vvOnChange, { passive: true }); } catch (_e) {}
    }

    // 初回は明示的に 1 回サイズ反映してから start（初期 0 サイズ事故を潰す）
    {
      const { w, h } = readCanvasClientSize();
      if (w > 0 && h > 0) resizeHub(hub, w, h);
    }

    startHub(hub);

    return {
      hub,
      ui: owned.ui,
      dispose() {
        try { ro?.disconnect?.(); } catch (_e) {}
        if (visualViewport && vvOnChange) {
          try { visualViewport.removeEventListener("resize", vvOnChange); } catch (_e) {}
          try { visualViewport.removeEventListener("scroll", vvOnChange); } catch (_e) {}
          vvOnChange = null;
        }
        teardownPrev(owned, "ui");
        teardownPrev(owned, "hub");
      },
    };
  } catch (e) {
    if (disposed) return;
        disposed = true;
        try { if (rafId) window.cancelAnimationFrame(rafId); } catch (_e) {}
        rafId = 0;
        try { ro?.disconnect?.(); } catch (_e) {}
        if (visualViewport && vvOnChange) {
          try { visualViewport.removeEventListener("resize", vvOnChange); } catch (_e) {}
          try { visualViewport.removeEventListener("scroll", vvOnChange); } catch (_e) {}
          vvOnChange = null;
        }
    teardownPrev(owned, "ui");
    teardownPrev(owned, "hub");
    throw e;
  }
}
