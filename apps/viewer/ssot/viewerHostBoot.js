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
  let lastReaderStateKey = "";

  function postParentLifecycle(type, detail = {}) {
    try {
      if (window.parent === window) return;
      window.parent.postMessage(
        { type, ...detail },
        window.location.origin
      );
    } catch (_e) {}
  }

  function loadFailureMessage(err) {
    const raw =
      err && typeof err === "object" && typeof err.message === "string"
        ? err.message
        : String(err || "");
    return raw.slice(0, 240);
  }

  function postReaderState(force = false) {
    try {
      if (!currentHost?.reader?.getState) return;
      if (window.parent === window) return;
      const state = currentHost.reader.getState();
      const key = JSON.stringify(state);
      if (!force && key === lastReaderStateKey) return;
      lastReaderStateKey = key;
      window.parent.postMessage(
        { type: "3dsl.viewer.reader.state", state },
        window.location.origin
      );
    } catch (_e) {}
  }

  const readerStateTimer = window.setInterval(() => postReaderState(false), 200);
  window.addEventListener("beforeunload", () => {
    try { window.clearInterval(readerStateTimer); } catch (_e) {}
  });

  async function remount(nextOpts, { notifyLifecycle = true } = {}) {
    if (notifyLifecycle) postParentLifecycle("3dsl.viewer.loadStart");
    try {
      try { currentHost?.dispose?.(); } catch {}
      const host = await mountViewerHost({
        ...nextOpts,
        profile,
      });
      currentHost = host;
      window.__vh = host;
      lastReaderStateKey = "";
      window.setTimeout(() => postReaderState(true), 0);
      if (notifyLifecycle) postParentLifecycle("3dsl.viewer.loadOk");
      return host;
    } catch (err) {
      if (notifyLifecycle) {
        postParentLifecycle("3dsl.viewer.loadFail", {
          message: loadFailureMessage(err),
        });
      }
      throw err;
    }
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

        if (d.type === "3dsl.viewer.reader.focus") {
          const uuid = typeof d.uuid === "string" ? d.uuid.trim() : "";
          const kind =
            d.kind === "points" || d.kind === "lines" || d.kind === "aux"
              ? d.kind
              : undefined;
          if (!uuid) return;
          currentHost?.reader?.focus?.(uuid, kind);
          window.setTimeout(() => postReaderState(true), 50);
          return;
        }

        if (d.type === "3dsl.viewer.reader.overview") {
          currentHost?.reader?.overview?.();
          window.setTimeout(() => postReaderState(true), 50);
          return;
        }

        if (d.type === "3dsl.viewer.reader.requestState") {
          postReaderState(true);
          return;
        }

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

    // /app/viewer (and other iframe hosts) own navigation chrome.
    // Keeping the inner back button active can navigate the iframe to its parent URL,
    // producing a nested Viewer host. Framed runtimes therefore suppress this control.
    if (window.parent !== window) {
      btn.hidden = true;
      btn.style.display = "none";
      btn.setAttribute("aria-hidden", "true");
      btn.tabIndex = -1;
      return;
    }

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
  postParentLifecycle("3dsl.viewer.hostReady");
})().catch(showFatal);