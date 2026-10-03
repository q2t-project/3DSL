// viewerHost.js

import { bootstrapViewerFromUrl, bootstrapViewer } from "./runtime/bootstrapViewer.js";
import { attachUiProfile } from "./ui/attachUiProfile.js";
import { resizeHub, startHub } from "./ui/hubOps.js";
import { teardownPrev, setOwnedHandle } from "./ui/ownedHandle.js";
import { createHubFacade } from "./ui/hubFacade.js";

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

    // Reader-facing navigation facade.
    // The outer product host may ask the Viewer to move between whole/macro
    // and a concrete model UUID, but it never mutates core state directly.
    const hf = createHubFacade(hub);
    const reader = Object.freeze({
      focus(uuid, kind) {
        if (typeof uuid !== "string" || !uuid.trim()) return false;
        const modeApi = hf.getMode?.();
        if (!modeApi) return false;
        const u = uuid.trim();
        if (typeof modeApi.focus === "function") {
          modeApi.focus(u, kind);
          return true;
        }
        if (typeof modeApi.set === "function") {
          modeApi.set("micro", u, kind);
          return true;
        }
        return false;
      },
      overview() {
        const modeApi = hf.getMode?.();
        if (!modeApi) return false;
        if (typeof modeApi.exit === "function") {
          modeApi.exit();
          return true;
        }
        if (typeof modeApi.set === "function") {
          modeApi.set("macro");
          return true;
        }
        return false;
      },
      getState() {
        const modeApi = hf.getMode?.();
        const selectionApi = hf.getSelection?.();
        const mode = modeApi?.get?.() ?? "macro";
        const selection = selectionApi?.get?.() ?? null;

        let label = "";
        if (selection && typeof selection.uuid === "string") {
          try {
            const rec = hf.getItemByUuid?.(selection.uuid);
            const item =
              rec?.item ?? rec?.point ?? rec?.line ?? rec?.aux ?? rec?.data ?? rec ?? null;
            const raw =
              item?.signification?.name ??
              item?.signification?.caption ??
              item?.appearance?.marker?.text?.content ??
              "";
            if (typeof raw === "string") label = raw.trim();
            else if (raw && typeof raw === "object") {
              label = String(raw.ja ?? raw.en ?? "").trim();
            }
          } catch (_e) {}
        }

        return {
          mode: mode === "micro" ? "micro" : "macro",
          selection:
            selection && typeof selection.uuid === "string"
              ? { uuid: selection.uuid, kind: selection.kind ?? null, label }
              : null,
        };
      },
    });

    return {
      hub,
      ui: owned.ui,
      reader,
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