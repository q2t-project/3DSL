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

  // devicePixelRatio はユーザー操作（ブラウザズーム等）で変わり得るので
  // resize のたびに取得する（極端な値は抑える）
  function getDpr() {
    const dpr = Number(globalThis.devicePixelRatio) || 1;
    return Math.max(1, Math.min(2, dpr));
  }

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
      if (pendingW > 0 && pendingH > 0) resizeHub(hub, pendingW, pendingH, getDpr());
    });
  }

  function readCanvasClientSize() {
    // clientWidth/Height が 0 のケースがあるので rect も見る
    const cw = canvas.clientWidth || 0;
    const ch = canvas.clientHeight || 0;
    if (cw > 0 && ch > 0) return { w: cw, h: ch };
    const r = canvas.getBoundingClientRect?.();
    const w = r ? Math.floor(r.width) : 0;
    const h = r ? Math.floor(r.height) : 0;
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
      const { w, h } = readCanvasClientSize();
      if (w > 0 && h > 0) requestResize(w, h);
    });
    ro.observe(canvas);

    // 初回は明示的に 1 回サイズ反映してから start（初期 0 サイズ事故を潰す）
    {
      const { w, h } = readCanvasClientSize();
      if (w > 0 && h > 0) resizeHub(hub, w, h, getDpr());
    }

    startHub(hub);

    // Peek mode: decorative, non-interactive, auto-orbit enabled.
    // (input/UI/gizmo are suppressed by profile + domContract)
    try {
      if (profile === "peek") {
        hub?.camera?.startAutoOrbit?.({});
      }
    } catch (_e) {}

    return {
      hub,
      ui: owned.ui,
      dispose() {
        try { ro?.disconnect?.(); } catch (_e) {}
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
    teardownPrev(owned, "ui");
    teardownPrev(owned, "hub");
    throw e;
  }
}
