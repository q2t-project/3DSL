// viewerHostBoot.js
// Host bootstrap for /viewer/index.html

import { mountViewerHost } from "./viewerHost.js";

// ---- utils ----

function isProbablyUrlish(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (!t) return false;
  // allow absolute/relative URLs and root paths
  if (t.startsWith("/") || t.startsWith("./") || t.startsWith("../")) return true;
  if (t.startsWith("http://") || t.startsWith("https://")) return true;
  // allow filenames
  if (t.endsWith(".json")) return true;
  return false;
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`fetch failed ${r.status} ${url}`);
  return await r.json();
}

function extractModelUrlFromIndex(indexJson) {
  if (!indexJson || typeof indexJson !== "object") return null;

  const candidates = [];

  // common shapes
  const list =
    Array.isArray(indexJson.items)
      ? indexJson.items
      : Array.isArray(indexJson.entries)
        ? indexJson.entries
        : Array.isArray(indexJson.library)
          ? indexJson.library
          : Array.isArray(indexJson)
            ? indexJson
            : null;

  if (!list || list.length === 0) return null;

  const item = list[0];
  if (!item || typeof item !== "object") return null;

  // try common fields (order matters)
  const fields = [
    "model_url",
    "modelUrl",
    "json_url",
    "jsonUrl",
    "url",
    "path",
    "viewer_model_url",
    "viewerModelUrl",
  ];

  for (const k of fields) {
    const v = item[k];
    if (typeof v === "string" && v.trim()) candidates.push(v.trim());
  }

  // nested: item.files?.model / item.files?.json
  if (item.files && typeof item.files === "object") {
    const v1 = item.files.model || item.files.json;
    if (typeof v1 === "string" && v1.trim()) candidates.push(v1.trim());
  }

  // nested: item.assets?.model
  if (item.assets && typeof item.assets === "object") {
    const v2 = item.assets.model || item.assets.json;
    if (typeof v2 === "string" && v2.trim()) candidates.push(v2.trim());
  }

  for (const c of candidates) {
    if (!isProbablyUrlish(c)) continue;
    // normalize: if it's a bare relative file (no leading / or ./), treat as /library/<c>
    if (!c.startsWith("/") && !c.startsWith("./") && !c.startsWith("../") && !c.startsWith("http")) {
      return `/library/${c}`;
    }
    return c;
  }

  return null;
}

async function pickDefaultModelUrl() {
  // 1) library index (most stable in this project)
  try {
    const idx = await fetchJson(`/library/library_index.json?t=${Date.now()}`);
    const u = extractModelUrlFromIndex(idx);
    if (u) return u;
  } catch {}

  // 2) known historical sample path (if present)
  return "/3dss/sample/3dsl_concept.3dss.json";
}

function showFatal(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.style.cssText =
    "position:fixed;inset:0;padding:12px;white-space:pre-wrap;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#000;color:#fff;z-index:999999;";
  pre.textContent = `[viewer] boot failed\n${String(err?.stack || err)}`;
  document.body.appendChild(pre);
}

// ---- boot ----

(async () => {
  const p = new URLSearchParams(location.search);

  // allow small boot toggles for debugging
    const mode = p.get("mode") || "prod"; // "prod" | "dev" | "peek"

  // model selection
  let modelUrl = p.get("model") || "";
  if (modelUrl && !isProbablyUrlish(modelUrl)) modelUrl = "";
  if (!modelUrl) modelUrl = await pickDefaultModelUrl();

  // embed mode: hide host UI chrome (viewer.css uses body.is-embed)
  // mode=peek implies embed + extra hiding
  if (p.get("embed") === "1" || mode === "peek") {
    try {
      document.body.classList.add("is-embed");
    } catch {}
  }
  if (mode === "peek") {
    try {
      document.body.classList.add("is-peek");
    } catch {}
  }

  // UI profile (devHarness_full | prod_full)
  // attachUiProfile() is strict: profile is required.
  // default by mode unless explicitly provided.
  let profile = p.get("profile") || "";
  if (!profile) {
    if (mode === "dev") profile = "devHarness_full";
    else if (mode === "peek") profile = "peek";
    else profile = "prod_full";
  }

  const host = await mountViewerHost({
    mode,
    modelUrl,
    qs: p,
    profile,
  });

  // expose for devtools
  window.__vh = host;
})().catch(showFatal);
