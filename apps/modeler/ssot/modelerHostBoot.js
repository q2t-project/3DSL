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

  const KNOWN_ISSUES = "/docs/modeler/known-issues";
  const GUIDE = "/docs/modeler/public-alpha";

  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.inset = "0";
  wrap.style.display = "grid";
  wrap.style.placeItems = "center";
  wrap.style.background = "rgba(0,0,0,0.72)";
  wrap.style.padding = "24px";
  wrap.style.zIndex = "99999";

  const card = document.createElement("div");
  card.style.maxWidth = "920px";
  card.style.width = "100%";
  card.style.border = "1px solid rgba(255,255,255,0.14)";
  card.style.background = "rgba(18,18,22,0.94)";
  card.style.borderRadius = "16px";
  card.style.padding = "18px 18px 14px";
  card.style.color = "#eaeaf0";
  card.style.fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";

  const h = document.createElement("div");
  h.style.display = "flex";
  h.style.gap = "10px";
  h.style.alignItems = "center";
  h.style.justifyContent = "space-between";

  const title = document.createElement("div");
  title.style.fontSize = "16px";
  title.style.fontWeight = "700";
  title.textContent = "Modeler の起動に失敗した";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";

  const mkBtn = (label, onClick) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.type = "button";
    b.style.border = "1px solid rgba(255,255,255,0.18)";
    b.style.background = "rgba(255,255,255,0.06)";
    b.style.color = "#eaeaf0";
    b.style.padding = "6px 10px";
    b.style.borderRadius = "10px";
    b.style.cursor = "pointer";
    b.addEventListener("click", onClick);
    return b;
  };

  actions.appendChild(mkBtn("Reload", () => window.location.reload()));
  actions.appendChild(mkBtn("使い方・注意", () => window.open(GUIDE, "_blank", "noopener,noreferrer")));
  actions.appendChild(mkBtn("Known issues", () => window.open(KNOWN_ISSUES, "_blank", "noopener,noreferrer")));

  h.appendChild(title);
  h.appendChild(actions);

  const pre = document.createElement("pre");
  pre.style.margin = "12px 0 0";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontSize = "12px";
  pre.style.lineHeight = "1.5";
  pre.style.opacity = "0.92";
  pre.textContent = String(e?.stack || e);

  card.appendChild(h);
  card.appendChild(pre);
  wrap.appendChild(card);
  document.body.appendChild(wrap);

});
