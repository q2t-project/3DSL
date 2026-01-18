// apps/site/scripts/tool/generate-sitemap.mjs
// Generates public/sitemap.xml and public/robots.txt for the Astro site.
//
// Base URL resolution:
//   1) SITE_URL        (recommended: production custom domain)
//   2) CF_PAGES_URL    (Cloudflare Pages provided, useful for preview deployments)
//   3) https://3dsl.jp (final fallback)
//
// Production-only policy:
// - Preview deployments are for verification; sitemap/robots are not useful there.
// - In Preview builds, this script deletes public/sitemap.xml and public/robots.txt
//   if they exist, to prevent stale artifacts from leaking into preview.
//
// Usage:
//   node scripts/tool/generate-sitemap.mjs
//
// Opt-in overrides:
//   - GEN_SITEMAP_FORCE=1   : generate even on preview

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This file lives at: apps/site/scripts/tool/generate-sitemap.mjs
// siteRoot should become: apps/site
const siteRoot = path.resolve(__dirname, "..", "..");
const publicDir = path.join(siteRoot, "public");

function trimTrailingSlashes(s) {
  return String(s ?? "").replace(/\/+$/g, "");
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toYmd(s) {
  if (!s) return null;
  // accept: YYYY-MM-DD or ISO-ish
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function isProbablyUrl(s) {
  return /^https?:\/\//i.test(String(s ?? ""));
}

function resolveBaseUrl() {
  const site = process.env.SITE_URL;
  const cf = process.env.CF_PAGES_URL;

  if (site && isProbablyUrl(site)) return trimTrailingSlashes(site);
  if (cf && isProbablyUrl(cf)) return trimTrailingSlashes(cf);

  return "https://3dsl.jp";
}

function joinUrl(baseUrl, pathname) {
  const base = trimTrailingSlashes(baseUrl);
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${p}`;
}

function isProductionBuild(baseUrl) {
  // Cloudflare Pages:
  // - CF_PAGES_ENV is sometimes available as "production" / "preview".
  // - CF_PAGES_BRANCH is available; production branch is commonly "main".
  // We keep it conservative: generate only when it looks like production.
  const force = String(process.env.GEN_SITEMAP_FORCE ?? "") === "1";
  if (force) return { ok: true, reason: "force" };

  const env = String(process.env.CF_PAGES_ENV ?? "").toLowerCase();
  if (env === "production") return { ok: true, reason: "CF_PAGES_ENV=production" };

  const branch = String(process.env.CF_PAGES_BRANCH ?? "");
  if (branch === "main") return { ok: true, reason: "CF_PAGES_BRANCH=main" };

  const site = process.env.SITE_URL;
  if (site && isProbablyUrl(site)) {
    // If SITE_URL is explicitly configured, treat it as production intent.
    return { ok: true, reason: "SITE_URL set" };
  }

  // Fallback heuristic: if baseUrl is the official domain, treat as production.
  if (trimTrailingSlashes(baseUrl) === "https://3dsl.jp") {
    return { ok: true, reason: "baseUrl is 3dsl.jp" };
  }

  return { ok: false, reason: "preview/unknown" };
}

async function readLibraryIndex() {
  const p = path.join(publicDir, "library", "library_index.json");
  try {
    const raw = await fs.readFile(p, "utf8");
    const j = JSON.parse(raw);
    const items = Array.isArray(j?.items) ? j.items : [];
    return items
      .map((it) => ({
        slug: typeof it?.slug === "string" ? it.slug : null,
        updated_at: typeof it?.updated_at === "string" ? it.updated_at : null,
      }))
      .filter((it) => it.slug);
  } catch {
    return [];
  }
}

function buildUrlEntries(baseUrl, libraryItems) {
  // Keep trailing slashes for pages.
  const fixed = [
    "/",
    "/concept/",
    "/library/",
    "/docs/",
    "/faq/",
    "/policy/",
    "/contact/",
    "/modeler/",
    "/canonical/",
    // viewer routes
    "/viewer/",
    "/app/viewer/",
  ];

  const out = [];
  for (const p of fixed) {
    out.push({ loc: joinUrl(baseUrl, p), lastmod: null });
  }

  for (const it of libraryItems) {
    const slug = it.slug;
    // ensure safe-ish slug usage (no slashes)
    const safe = String(slug).replace(/^\/+/, "").replace(/\/+$/, "");
    if (!safe || safe.includes("/")) continue;

    out.push({
      loc: joinUrl(baseUrl, `/library/${safe}/`),
      lastmod: toYmd(it.updated_at),
    });
  }

  // de-dup by loc, keep the latest lastmod if duplicated
  const map = new Map();
  for (const e of out) {
    const prev = map.get(e.loc);
    if (!prev) {
      map.set(e.loc, e);
      continue;
    }
    const a = prev.lastmod ?? "";
    const b = e.lastmod ?? "";
    if (b > a) map.set(e.loc, e);
  }

  return Array.from(map.values());
}

async function writeSitemapXml(entries) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  for (const e of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(e.loc)}</loc>`);
    if (e.lastmod) lines.push(`    <lastmod>${xmlEscape(e.lastmod)}</lastmod>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  lines.push("");

  const outPath = path.join(publicDir, "sitemap.xml");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, lines.join("\n"), "utf8");
  return { outPath, count: entries.length };
}

async function writeRobotsTxt(baseUrl) {
  const sitemapUrl = joinUrl(baseUrl, "/sitemap.xml");

  // Allow crawling site pages, but discourage indexing of large mirrored assets.
  // IMPORTANT: do not Disallow /library/ or /viewer/ pages themselves.
  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
    "# mirrored / large assets",
    "Disallow: /viewer/runtime/",
    "Disallow: /viewer/ui/",
    "Disallow: /vendor/",
    "Disallow: /schemas/",
    "Disallow: /locales/",
    "Disallow: /3dss/fixtures/",
    "Disallow: /_data/library/library_index.json",
    "",
    `Sitemap: ${sitemapUrl}`,
    "",
  ];

  const outPath = path.join(publicDir, "robots.txt");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, lines.join("\n"), "utf8");
  return { outPath };
}

async function removeIfExists(p) {
  try {
    await fs.rm(p, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const prod = isProductionBuild(baseUrl);

  if (!prod.ok) {
    const removedSitemap = await removeIfExists(path.join(publicDir, "sitemap.xml"));
    const removedRobots = await removeIfExists(path.join(publicDir, "robots.txt"));

    console.log(`[gen:sitemap] skip (reason=${prod.reason}) baseUrl=${baseUrl}`);
    if (removedSitemap || removedRobots) {
      console.log(
        `[gen:sitemap] removed stale artifacts: sitemap=${removedSitemap ? "yes" : "no"} robots=${removedRobots ? "yes" : "no"}`
      );
    }
    return;
  }

  const items = await readLibraryIndex();
  const entries = buildUrlEntries(baseUrl, items);

  const sitemap = await writeSitemapXml(entries);
  const robots = await writeRobotsTxt(baseUrl);

  console.log(`[gen:sitemap] baseUrl=${baseUrl}`);
  console.log(`[gen:sitemap] mode=production (${prod.reason})`);
  console.log(`[gen:sitemap] sitemap: ${sitemap.outPath} urls=${sitemap.count}`);
  console.log(`[gen:sitemap] robots:  ${robots.outPath}`);
}

await main();
