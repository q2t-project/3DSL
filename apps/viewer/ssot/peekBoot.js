// peekBoot.js
// Minimal host for Home "peek viewer": renderer + orbit input only (NO UI chrome)

import { bootstrapViewerFromUrl } from "./runtime/bootstrapViewer.js";
import { PointerInput } from "./ui/pointerInput.js";

function getParam(name) {
  try {
    return new URL(location.href).searchParams.get(name) || "";
  } catch {
    return "";
  }
}

function showFatal(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.style.cssText = "position:fixed;inset:0;margin:0;padding:12px;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#fff;background:#000;";
  pre.textContent = String(err?.stack || err);
  document.body.appendChild(pre);
}

(async () => {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("viewer-canvas"));
  if (!canvas) throw new Error("[peekBoot] canvas not found");

  // model is required
  const modelUrl = getParam("model");
  if (!modelUrl) throw new Error("[peekBoot] ?model=... is required");

  // bootstrap hub (no host UI)
  const hub = await bootstrapViewerFromUrl("viewer-canvas", modelUrl, {
    devBootLog: false,
    devLabel: "peek",
  });

  // start render loop
  hub.start();

  // orbit + pan + zoom (pointer/touch). Constructor auto-attaches listeners.
  // PointerInput also forces canvas touch-action:none to avoid browser gestures.
  const input = new PointerInput(canvas, hub);

  // expose for debugging
  window.__peek = { hub, input };
})().catch(showFatal);
