// viewer_app_premium/premiumBoot.js
// Premium entry bootstrap: inject premium capabilities + premium-only addons.

import { mountViewerHost } from "/viewer/viewerHost.js";
import { createPremiumCapabilities } from "./premiumCapabilities.js";
import { createPremiumDummyAddon } from "./premiumDummyAddon.js";
import { createCaptureHiResAddon } from "./addons/captureHiResAddon.js";

function isProbablyUrlish(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("/") || t.startsWith("./") || t.startsWith("../")) return true;
  if (t.startsWith("http://") || t.startsWith("https://")) return true;
  if (t.endsWith(".json")) return true;
  return false;
}

function showFatal(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.style.cssText =
    "position:fixed;inset:0;padding:12px;white-space:pre-wrap;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#000;color:#fff;z-index:999999;";
  pre.textContent = `[viewer_premium] boot failed\n${String(err?.stack || err)}`;
  document.body.appendChild(pre);
}

(async () => {
  const p = new URLSearchParams(location.search);

  const mode = p.get("mode") || "prod";

  let modelUrl = p.get("model") || "";
  if (modelUrl && !isProbablyUrlish(modelUrl)) modelUrl = "";
  if (!modelUrl) modelUrl = "/3dss/scenes/default/default.3dss.json";

  // Production safety rule:
  // - Do NOT rewrite premium endpoints to any *.json variant.
  //   Premium data must only be fetched through guarded endpoints.

  if (p.get("embed") === "1") {
    try { document.body.classList.add("is-embed"); } catch {}
  }

  // capability injection (no branching in public route)
  // Register premium addons. Dummy is fallback only.
  const capabilities = createPremiumCapabilities();
  try {
    capabilities.registerAddon(createCaptureHiResAddon());
    console.log("[premium] capture addon registered");
  } catch (e) {
    console.warn("[premium] capture addon register failed; fallback to dummy", e);
    try { capabilities.registerAddon(createPremiumDummyAddon()); } catch (_e) {}
  }

  const profile = p.get("profile") || ((mode === "dev") ? "devHarness_full" : "prod_full");

  const host = await mountViewerHost({
    mode,
    modelUrl,
    profile,
    devBootLog: mode === "dev",
    capabilities,
  });
  window.__vh = host;
})().catch(showFatal);
