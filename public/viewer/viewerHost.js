// viewerHost.js

import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";
import { attachUiProfile } from "./ui/attachUiProfile.js";
import { teardownPrev, setOwnedHandle } from "./ui/ownedHandle.js";

export async function mountViewerHost(opts) {
  const {
    canvasId = "viewer-canvas",
    modelUrl,
    profile = "prod_full",
    gizmoWrapperId = "gizmo-slot",
    timelineRootId = "timeline-root",
    devBootLog = false,
  } = opts || {};

  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`[viewerHost] canvas not found: ${canvasId}`);

  const owned = { hub: null, ui: null };
  let ro = null;

  try {
    setOwnedHandle(owned, "hub", await bootstrapViewerFromUrl(canvasId, modelUrl, {
      devBootLog,
      devLabel: "viewer_host",
    }));
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
    const ui = owned.ui;

    // ResizeObserver（host の責務）
    ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w > 0 && h > 0) hub?.resize?.(w, h);
    });
    ro.observe(canvas);

    hub?.start?.();

    return {
      hub,
      ui,
      dispose() {
        try { ro?.disconnect?.(); } catch (_e) {}
        teardownPrev(owned, "ui");
        teardownPrev(owned, "hub");
      },
    };
  } catch (e) {
    try { ro?.disconnect?.(); } catch (_e) {}
    teardownPrev(owned, "ui");
    teardownPrev(owned, "hub");
    throw e;
  }
}
