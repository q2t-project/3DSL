// apps/site/scripts/ci/premium-dod.mjs
// P8: Regression & quality gate for premium introduction.
// Intentionally lightweight: validates build outputs and key SEO/public invariants.

import { promises as fs } from "node:fs";
import path from "node:path";

const siteRoot = process.cwd();
const distDir = path.join(siteRoot, "dist");
const publicDir = path.join(siteRoot, "public");

function fail(msg) {
  console.error(`[ci:dod] FAIL: ${msg}`);
  process.exitCode = 1;
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readText(p) {
  return await fs.readFile(p, "utf8");
}

function extractCanonical(html) {
  // Accept both <link rel="canonical" href="..."> and swapped attribute order
  const m =
    html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return m ? m[1] : null;
}

async function main() {
  console.log("[ci:dod] start");

  // 1) Build output existence
  if (!(await exists(distDir))) fail(`dist dir not found: ${distDir}`);

  // 2) Required public pages (public UX smoke, file-level)
  const mustExistDist = [
    "index.html",
    path.join("library", "index.html"),
    path.join("app", "viewer", "index.html"),
    path.join("docs", "index.html"),
    path.join("policy", "index.html"),
    "robots.txt",
    "sitemap.xml",
  ];
  for (const rel of mustExistDist) {
    const p = path.join(distDir, rel);
    if (!(await exists(p))) fail(`missing dist output: ${rel}`);
  }

  // 3) Library detail pages exist (at least one)
  const libDir = path.join(distDir, "library");
  let libChildren = [];
  try {
    libChildren = await fs.readdir(libDir, { withFileTypes: true });
  } catch {
    libChildren = [];
  }
  const libSlugs = libChildren.filter((d) => d.isDirectory()).map((d) => d.name);
  const libDetailOk = [];
  for (const slug of libSlugs) {
    const p = path.join(libDir, slug, "index.html");
    if (await exists(p)) libDetailOk.push(slug);
  }
  if (libDetailOk.length === 0) fail("no library detail pages found under dist/library/<slug>/index.html");

  // 4) Premium routes are present for synced slugs (staticpaths)
  const premiumMetaDir = path.join(publicDir, "api", "premium", "meta");
  let premiumSlugs = [];
  if (await exists(premiumMetaDir)) {
    const entries = await fs.readdir(premiumMetaDir, { withFileTypes: true });
    premiumSlugs = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => name && !name.startsWith(".") && !name.endsWith(".json"))
      .sort();
  }
  if (premiumSlugs.length === 0) {
    // Not fatal if premium isn't configured in a fork, but warn loudly.
    console.warn("[ci:dod] WARN: no premium slugs found (public/api/premium/meta/<slug>)." );
  } else {
    for (const slug of premiumSlugs) {
      const p = path.join(distDir, "premium", slug, "index.html");
      if (!(await exists(p))) fail(`missing premium static page for slug=${slug}: dist/premium/${slug}/index.html`);
    }
  }

  // 5) SEO artifacts: sitemap / robots sanity
  const sitemapPath = path.join(distDir, "sitemap.xml");
  const robotsPath = path.join(distDir, "robots.txt");
  const sitemap = await readText(sitemapPath);
  const robots = await readText(robotsPath);

  if (!sitemap.includes("<urlset")) fail("sitemap.xml does not look like XML urlset");
  if (sitemap.includes("/premium/")) fail("sitemap.xml unexpectedly includes /premium/ (premium should not be indexed)");
  if (!sitemap.includes("/library/")) console.warn("[ci:dod] WARN: sitemap.xml does not include /library/ (check generator inputs)");

  if (!robots.toLowerCase().includes("sitemap:")) fail("robots.txt missing Sitemap: line");

  // 6) Canonical tags: representative pages
  const libIndexHtml = await readText(path.join(distDir, "library", "index.html"));
  const libCanon = extractCanonical(libIndexHtml);
  if (!libCanon) fail("missing canonical link on /library");
  else if (!/\/library\/?$/.test(libCanon)) fail(`canonical on /library is unexpected: ${libCanon}`);

  if (premiumSlugs.length > 0) {
    const testSlug = premiumSlugs[0];
    const premHtml = await readText(path.join(distDir, "premium", testSlug, "index.html"));
    const premCanon = extractCanonical(premHtml);
    if (!premCanon) fail(`missing canonical link on /premium/${testSlug}`);
    else if (!new RegExp(`/premium/${testSlug}(/)?$`).test(premCanon)) fail(`canonical on /premium/${testSlug} is unexpected: ${premCanon}`);
  }

  // 7) Premium containment (cheap signal)
  // - Ensure premium viewer app exists only as a public asset, not merged into sitemap.
  // - Ensure boundary check already ran in ci:build (hard gate).
  const premiumViewerIndex = path.join(publicDir, "viewer_app_premium", "index.html");
  if (!(await exists(premiumViewerIndex))) {
    console.warn("[ci:dod] WARN: public/viewer_app_premium/index.html not found (P5 route switch might be incomplete).");
  }

  if (process.exitCode) {
    console.error("[ci:dod] done with failures");
    process.exit(process.exitCode);
  }
  console.log("[ci:dod] OK");
}

await main();
