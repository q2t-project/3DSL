// ui/viewerHostBoot.js
// Boot entry for /viewer/ui/index.html
//
// NOTE:
// Historically, some links used ?mode=<modelUrl> by mistake.
// We only accept that legacy alias when it actually looks like a URL/path.

import { mountViewerHost } from "./viewerHost.js";

function showFatal(e) {
  const msg = e?.stack || String(e);
  console.error("[viewer] boot failed", e);
  const el = document.getElementById("boot-error");
  if (el) el.textContent = `[viewer] boot failed\n${msg}`;
}

function looksLikeModelUrl(s) {
  if (!s) return false;
  if (s.startsWith("/") || s.startsWith("./") || s.startsWith("../")) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (s.includes(".json")) return true;
  return false;
}

(async () => {
  try {
    window.__vh?.dispose?.();
  } catch (_e) {}
  window.__vh = null;

  const p = new URLSearchParams(location.search);

  const profile = p.get("profile") || "prod_full";

  let modelUrl = p.get("model") || "";
  if (!modelUrl) {
    const legacy = p.get("mode");
    if (looksLikeModelUrl(legacy)) modelUrl = legacy;
  }
  if (!modelUrl) modelUrl = "/3dss/sample/core_viewer_baseline.3dss.json";

  if (p.get("embed") === "1") {
    try {
      document.body.classList.add("is-embed");
    } catch (_e) {}
  }

  const host = await mountViewerHost({
    canvasId: "viewer-canvas",
    modelUrl,
    profile,
  });

  window.__vh = host;
})().catch(showFatal);
