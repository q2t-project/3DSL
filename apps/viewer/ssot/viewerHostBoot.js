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
    const idx = await fetchJson(`/_data/library/library_index.json?t=${Date.now()}`);
    const u = extractModelUrlFromIndex(idx);
    if (u) return u;
  } catch {}

  // 2) known historical sample path (if present)
  return "/3dss/scenes/default/default.3dss.json";
}

function showFatal(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.style.cssText =
    "position:fixed;inset:0;padding:12px;white-space:pre-wrap;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#000;color:#fff;z-index:999999;";
  pre.textContent = `[viewer] boot failed\n${String(err?.stack || err)}`;
  document.body.appendChild(pre);
}

// ---- optional mini ad ----

function isTruthyParam(p, key) {
  const v = (p.get(key) || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function ensureAdsenseScript(publisherId) {
  if (!publisherId) return;
  if (document.querySelector("script[data-3dsl-adsense='1']")) return;

  // Optional meta tag (recommended by AdSense)
  if (!document.querySelector("meta[name='google-adsense-account']")) {
    const m = document.createElement("meta");
    m.setAttribute("name", "google-adsense-account");
    m.setAttribute("content", publisherId);
    document.head.appendChild(m);
  }

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-3dsl-adsense", "1");
  document.head.appendChild(s);
}

function initMiniAd(p) {
  const root = document.querySelector("[data-role='viewer-mini-ad']");
  if (!root) return;

  const closeBtn = document.getElementById("viewer-mini-ad-close");
  const ins = document.getElementById("viewer-mini-ad-ins");

  const hide = () => {
    try { root.setAttribute("data-on", "0"); } catch {}
    try { root.setAttribute("aria-hidden", "true"); } catch {}
  };

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      try { localStorage.setItem("3dsl.viewer.miniAd", "0"); } catch {}
      hide();
    });
  }

  // Gate: only for library-origin full viewer
  const from = (p.get("from") || "").trim().toLowerCase();
  const isEmbed = isTruthyParam(p, "embed");
  const noAds = isTruthyParam(p, "noads");
  if (from !== "library" || isEmbed || noAds) {
    hide();
    return;
  }

  // Respect user close
  try {
    if (localStorage.getItem("3dsl.viewer.miniAd") === "0") {
      hide();
      return;
    }
  } catch {}

  // Keep the 3D view unobstructed on small screens
  if (!window.matchMedia || !window.matchMedia("(min-width: 1024px)").matches) {
    hide();
    return;
  }

  const conf = window.__ADSENSE_CONFIG__;
  const publisherId = conf?.publisherId || "";
  const slot = conf?.slots?.slot_300x250 || "";

  if (!publisherId || !slot || !ins) {
    hide();
    return;
  }

  ensureAdsenseScript(publisherId);

  try { ins.setAttribute("data-ad-client", publisherId); } catch {}
  try { ins.setAttribute("data-ad-slot", slot); } catch {}

  try { root.setAttribute("data-on", "1"); } catch {}
  try { root.setAttribute("aria-hidden", "false"); } catch {}

  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  } catch {}
}

// ---- boot ----

(async () => {
  const p = new URLSearchParams(location.search);

  // allow small boot toggles for debugging
  const mode = p.get("mode") || "prod"; // "prod" | "dev"

  // model selection
  let modelUrl = p.get("model") || "";
  if (modelUrl && !isProbablyUrlish(modelUrl)) modelUrl = "";
  if (!modelUrl) modelUrl = await pickDefaultModelUrl();

  // embed mode: hide host UI chrome (viewer.css uses body.is-embed)
  if (p.get("embed") === "1") {
    try {
      document.body.classList.add("is-embed");
    } catch {}
  }

  // Optional mini ad (only for library-origin full viewer)
  try { initMiniAd(p); } catch {}

  // UI profile (devHarness_full | prod_full)
  // attachUiProfile() is strict: profile is required.
  // default by mode unless explicitly provided.
  let profile = p.get("profile") || "";
  if (!profile) profile = (mode === "dev") ? "devHarness_full" : "prod_full";

  let currentHost = null;

  async function remount(nextOpts) {
    try { currentHost?.dispose?.(); } catch {}
    const host = await mountViewerHost({
      ...nextOpts,
      profile,
    });
    currentHost = host;
    window.__vh = host;
    return host;
  }

  // Allow outer host (/app/viewer) to load a local document into the iframe.
  // - postMessage: { type: '3dsl.viewer.loadDocument', document3dss: <object>, label?: <string> }
  // - postMessage: { type: '3dsl.viewer.loadUrl', modelUrl: <string> }
  function wireMessageApi() {
    window.addEventListener("message", (ev) => {
      try {
        if (ev.origin !== window.location.origin) return;
        const d = ev.data;
        if (!d || typeof d !== "object") return;

        if (d.type === "3dsl.viewer.loadDocument") {
          const doc = d.document3dss;
          if (!doc || typeof doc !== "object") return;
          const label = (typeof d.label === "string" && d.label.trim()) ? d.label.trim() : "(local file)";
          void remount({
            document3dss: doc,
            modelLabel: label,
            devBootLog: mode === "dev",
          }).catch(showFatal);
          return;
        }

        if (d.type === "3dsl.viewer.loadUrl") {
          const u = (typeof d.modelUrl === "string") ? d.modelUrl.trim() : "";
          if (!u || !isProbablyUrlish(u)) return;
          void remount({
            modelUrl: u,
            devBootLog: mode === "dev",
          }).catch(showFatal);
        }
      } catch (_e) {}
    });
  }


  function wireBackButton() {
    const btn = document.getElementById("viewer-back");
    if (!btn) return;
    const sp = new URLSearchParams(location.search);
    const ret = sp.get("return");

    const isSafeReturn = (u) => {
      if (typeof u !== "string") return false;
      const t = u.trim();
      if (!t) return false;
      // allow same-origin absolute, or root-relative paths
      if (t.startsWith("/")) return true;
      try {
        const uu = new URL(t, location.href);
        return uu.origin === location.origin;
      } catch (_e) {
        return false;
      }
    };

    const safeRet = isSafeReturn(ret) ? new URL(ret, location.href).toString() : "";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (safeRet) {
        location.href = safeRet;
        return;
      }
      try {
        if (document.referrer) {
          const r = new URL(document.referrer);
          if (r.origin === location.origin) {
            location.href = r.toString();
            return;
          }
        }
      } catch (_e) {}
      if (history.length > 1) {
        history.back();
        return;
      }
      location.href = "/library/";
    });
  }


  wireMessageApi();
  wireBackButton();

  await remount({
    mode,
    modelUrl,
    devBootLog: mode === "dev",
  });
})().catch(showFatal);
