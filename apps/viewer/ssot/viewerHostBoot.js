// viewerHostBoot.js
import { mountViewerHost } from "./viewerHost.js";

function showFatal(e) {
  try {
    const el = document.getElementById('fallback');
    if (!el) return;
    const msg = e && (e.stack || e.message) ? String(e.stack || e.message) : String(e);
    el.textContent = `[viewer] boot failed\n${msg}`;
  } catch (_err) {}
}

(async () => {
  // dev/HMR/手動再実行でも二重マウントせんように
  try { window.__vh?.dispose?.(); } catch (_e) {}
  window.__vh = null;

  const p = new URLSearchParams(location.search);
  // Some older site links used `mode=` by mistake; treat it as an alias.
  const modelUrl =
    p.get("model") || p.get("mode") || "/3dss/sample/core_viewer_baseline.3dss.json";
  const profile = p.get("profile") || "prod_full";

  // embed mode: hide UI chrome (viewer.css uses body.is-embed)
  if (p.get("embed") === "1") {
    try { document.body.classList.add("is-embed"); } catch (_e) {}
  }

  window.__vh = await mountViewerHost({
    canvasId: "viewer-canvas",
    modelUrl,
    profile,
    gizmoWrapperId: "gizmo-slot",
    devBootLog: false,
  });
})().catch((e) => {
  console.error("[viewerHostBoot] mount failed:", e);
  try { showFatal(e); } catch (_err) {}
});
