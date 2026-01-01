// viewerHostBoot.js
import { mountViewerHost } from "./viewerHost.js";

(async () => {
  // dev/HMR/手動再実行でも二重マウントせんように
  try { window.__vh?.dispose?.(); } catch (_e) {}
  window.__vh = null;

  const p = new URLSearchParams(location.search);
  const modelUrl =
    p.get("model") || "/3dss/canonical/valid/sample02_mixed_basic.3dss.json";
  const profile = p.get("profile") || "prod_full";

  window.__vh = await mountViewerHost({
    canvasId: "viewer-canvas",
    modelUrl,
    profile,
    gizmoWrapperId: "gizmo-slot",
    timelineRootId: "timeline-root",
    devBootLog: false,
  });
})().catch((e) => {
  console.error("[viewerHostBoot] mount failed:", e);
});
