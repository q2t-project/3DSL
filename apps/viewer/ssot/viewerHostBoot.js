// viewerHostBoot.js
import { mountViewerHost } from "./viewerHost.js";

function showFatal(e) {
  try {
    const el = document.getElementById("fallback");
    if (!el) return;
    const msg = e && (e.stack || e.message) ? String(e.stack || e.message) : String(e);
    el.textContent = `[viewer] boot failed\n${msg}`;
  } catch (_err) {}
}

function applyFrameFit() {
  // When this viewer runs inside an iframe (/app/viewer), some environments
  // report an inflated layout viewport (e.g. 980px) compared to the iframe box
  // (e.g. 430px). That makes 100vw/fixed UI render wider and get clipped.

  const root = document.documentElement;
  const body = document.body;

  const clear = () => {
    try { body?.classList?.remove("frame-fit"); } catch (_e) {}
    try {
      root?.style?.removeProperty("--frame-w");
      root?.style?.removeProperty("--frame-h");
    } catch (_e) {}
  };

  const fe = window.frameElement;
  if (!fe || !root || !body) {
    clear();
    return;
  }

  let rect = null;
  try { rect = fe.getBoundingClientRect(); } catch (_e) { rect = null; }

  const w = rect?.width ? Math.round(rect.width) : 0;
  const h = rect?.height ? Math.round(rect.height) : 0;
  if (!w || !h) return;

  const dw = Math.abs(w - window.innerWidth);
  const dh = Math.abs(h - window.innerHeight);
  const need = dw > 8 || dh > 8;

  if (!need) {
    clear();
    return;
  }

  try {
    root.style.setProperty("--frame-w", `${w}px`);
    root.style.setProperty("--frame-h", `${h}px`);
    body.classList.add("frame-fit");
  } catch (_e) {}
}

(async () => {
  // dev/HMR/手動再実行でも二重マウントせんように
  try { window.__vh?.dispose?.(); } catch (_e) {}
  window.__vh = null;

  const p = new URLSearchParams(location.search);

  // allow small boot toggles for debugging
  const mode = p.get("mode") || "prod"; // "prod" | "dev"

  // simple model selection
  const modelUrl = p.get("model") || "";

  // embed mode: hide UI chrome (viewer.css uses body.is-embed)
  if (p.get("embed") === "1") {
    try { document.body.classList.add("is-embed"); } catch (_e) {}
  }

  window.__FRAME_FIT_V = "v13";
  applyFrameFit();
  window.addEventListener("resize", applyFrameFit, { passive: true });

  const host = await mountViewerHost({
    mode,
    modelUrl,
    qs: p,
  });

  window.__vh = host;
})().catch(showFatal);
