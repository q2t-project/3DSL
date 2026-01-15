// apps/viewer/ssot/ui/i18n.js
// viewer 用 i18n 初期化（browser only）

// Browser-native ESM: bare specifier ("i18next") は解決できへんので vendor を使う
// NOTE: 規約: vendor import は /vendor/... の絶対パスのみ
import * as i18nextNs from "/vendor/i18next/i18next.js";
const i18next = i18nextNs.default ?? i18nextNs;

function normalizeBasePath(input) {
  if (typeof input !== "string") return "/";
  let s = input.trim();
  if (!s) return "/";

  // URL が来ても pathname に落とす
  if (/^https?:\/\//i.test(s)) {
    try { s = new URL(s).pathname; } catch (_e) {}
  }

  if (!s.startsWith("/")) s = "/" + s;
  s = s.replace(/\/{2,}/g, "/");
  if (!s.endsWith("/")) s = s + "/";
  return s;
}

function readBaseHrefPath() {
  try {
    const el = document.querySelector("base[href]");
    const href = el?.getAttribute?.("href");
    if (!href) return null;
    return new URL(href, location.href).pathname || null;
  } catch (_e) {
    return null;
  }
}

function readViteBaseUrl() {
  // Astro/Vite なら import.meta.env.BASE_URL が入る
  try {
    const v = import.meta?.env?.BASE_URL;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  } catch (_e) {
    return null;
  }
}

function inferBaseFromPathname() {
  try {
    const p = String(location?.pathname || "/");
    const idx = p.indexOf("/viewer/");
    if (idx >= 0) {
      // "/viewer/" を境に、そこまでを site base とみなす
      // 例: "/3dsl/viewer/..." -> "/3dsl/"
      //     "/viewer/..."      -> "/"
      return p.slice(0, idx + 1);
    }
  } catch (_e) {}
  return "/";
}

function resolveSiteBase(opts = {}) {
  if (opts && typeof opts.base === "string" && opts.base.trim()) {
    return normalizeBasePath(opts.base);
  }

  // 1) <base href>
  const fromBaseTag = readBaseHrefPath();
  if (fromBaseTag) return normalizeBasePath(fromBaseTag);

  // 2) import.meta.env.BASE_URL
  const fromEnv = readViteBaseUrl();
  if (fromEnv) return normalizeBasePath(fromEnv);

  // 3) location.pathname から推定
  return normalizeBasePath(inferBaseFromPathname());
}

function joinBase(base, rel) {
  const b = normalizeBasePath(base);
  const r = String(rel || "");
  if (!r) return b;
  if (r.startsWith("http://") || r.startsWith("https://")) return r;
  if (r.startsWith("/")) return r;
  return b + r.replace(/^\/+/, "");
}

function safeFallbackT(key, o) {
  return o && typeof o === "object" && "defaultValue" in o ? o.defaultValue : key;
}

function pickLng(opts = {}) {
  // 1) opts.lng
  if (opts && typeof opts.lng === "string" && opts.lng.trim()) return opts.lng.trim();

  // 2) query ?lng=
  try {
    const v = new URL(location.href).searchParams.get("lng");
    if (v && v.trim()) return v.trim();
  } catch (_e) {}

  // 3) localStorage i18nextLng
  try {
    const v = localStorage.getItem("i18nextLng");
    if (v && v.trim()) return v.trim();
  } catch (_e) {}

  // 4) navigator
  try {
    const cand = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    const s = String(cand || "").toLowerCase();
    if (s.startsWith("ja")) return "ja";
    if (s.startsWith("en")) return "en";
  } catch (_e) {}

  return "en";
}

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`i18n: failed to fetch ${url} (${res.status})`);
  return await res.json();
}

/**
 * @param {{ debug?: boolean, base?: string }} opts
 * @returns {Promise<{ i18n: any, t: Function, base: string, viewerBase: string }>}
 */
export async function initViewerI18n(opts = {}) {
  const base = resolveSiteBase(opts);
  const viewerBase = normalizeBasePath(joinBase(base, "viewer/"));

  // SSOT: locales は site 全体で共有する（/locales/...）。
  // - viewer 単体配布などの互換のため、/viewer/locales/... も fallback で試す。
  // 例:
  //   preferred: /locales/ja/translation.json
  //             /3dsl/locales/en/translation.json
  //   fallback : /viewer/locales/ja/translation.json
  //             /3dsl/viewer/locales/en/translation.json
  const preferredLoadPath = joinBase(base, "locales/{{lng}}/translation.json");
  const fallbackLoadPath = joinBase(viewerBase, "locales/{{lng}}/translation.json");

  const instance = i18next.createInstance();

  try {
    const lng = pickLng(opts);
    const url1 = preferredLoadPath.replace("{{lng}}", encodeURIComponent(lng));
    const url2 = fallbackLoadPath.replace("{{lng}}", encodeURIComponent(lng));
    let resources = {};
    try {
      const json = await loadJson(url1).catch(async () => await loadJson(url2));
      resources = { [lng]: { translation: json } };
    } catch (e) {
      // 翻訳ファイルが無い/取れないときは key fallback で続行
      try { console.warn("[i18n] missing locales -> fallback t()", e); } catch (_e2) {}
    }

    await instance.init({
      debug: !!opts.debug,
      lng,
      fallbackLng: "en",
      resources,
      interpolation: { escapeValue: false },
      returnNull: false,
      returnEmptyString: true,
    });

    const t = (key, o) => instance.t(key, o);
    return { i18n: instance, t, base, viewerBase };
  } catch (e) {
    try { console.warn("[i18n] init failed -> fallback t()", e); } catch (_e2) {}
    return { i18n: null, t: safeFallbackT, base, viewerBase };
  }
}
