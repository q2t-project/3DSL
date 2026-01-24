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

  await mountModelerHost({
    rootId: "modeler-root",
    canvasId: "modeler-canvas",
    modelUrl,
    devBootLog: true
  });
}

main().catch((e) => {
  console.error(e);
  const el = document.createElement("pre");
  el.style.whiteSpace = "pre-wrap";
  el.textContent = String(e?.stack || e);
  document.body.appendChild(el);
});
