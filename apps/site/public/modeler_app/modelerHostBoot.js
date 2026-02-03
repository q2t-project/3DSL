// modelerHostBoot.js
// Host bootstrap for /modeler/index.html

import { mountModelerHost } from "./modelerHost.js";

function isProbablyUrlish(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("/") || t.startsWith("./") || t.startsWith("../")) return true;
  if (t.startsWith("http://") || t.startsWith("https://")) return true;
  if (t.endsWith(".json")) return true;
  return false;
}

function getQueryParam(name) {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  } catch (_e) {
    return null;
  }
}

async function main() {
  const modelUrlParam = getQueryParam("url") || getQueryParam("model") || getQueryParam("file");
  const modelUrl = isProbablyUrlish(modelUrlParam) ? modelUrlParam : null;

  const hub = await mountModelerHost({
    rootId: "modeler-root",
    canvasId: "modeler-canvas",
    modelUrl,
    devBootLog: true
  });

// Debug pose snapshot bridge (for /app/compare)
// - enabled only when ?debugPose=1
// - request: postMessage({ type: '3DSL_GET_DEBUG_POSE', requestId, uuids: [...] }, '*')
// - response: postMessage({ type: '3DSL_DEBUG_POSE', requestId, snapshot }, '*')
const enableDebugPose = (() => {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get("debugPose") === "1";
  } catch (_e) {
    return false;
  }
})();

if (enableDebugPose) {
  const getSnapshot = (msg) => {
    try {
      const uuids = Array.isArray(msg?.uuids) ? msg.uuids : [];
      return hub?.getDebugPoseSnapshot?.({ uuids }) ?? null;
    } catch (_e) {
      return null;
    }
  };

  try { globalThis.__3dslDebugPose = () => getSnapshot({}); } catch (_e) {}

  window.addEventListener("message", (ev) => {
    const data = ev?.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "3DSL_GET_DEBUG_POSE") return;
    const requestId = data.requestId;
    const snapshot = getSnapshot(data);
    try {
      ev.source?.postMessage?.({ type: "3DSL_DEBUG_POSE", requestId, snapshot }, "*");
    } catch (_e) {
      try { window.parent?.postMessage?.({ type: "3DSL_DEBUG_POSE", requestId, snapshot }, "*"); } catch (_e2) {}
    }
  });
}

}

main().catch((e) => {
  console.error(e);
  const el = document.createElement("pre");
  el.style.whiteSpace = "pre-wrap";
  el.textContent = String(e?.stack || e);
  document.body.appendChild(el);
});
