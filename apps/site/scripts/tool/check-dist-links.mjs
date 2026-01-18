// apps/site/scripts/tool/check-dist-links.mjs
import fs from "node:fs";
import path from "node:path";

const SITE_ROOT = path.resolve(process.cwd(), "apps/site");
const DIST = path.join(SITE_ROOT, "dist");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function normalizeHref(href) {
  if (!href) return null;
  // strip hash/query
  const noHash = href.split("#")[0];
  const noQuery = noHash.split("?")[0];
  if (!noQuery.startsWith("/")) return null;
  // ignore special
  if (noQuery.startsWith("//")) return null;
  return noQuery;
}

function existsAsRoute(href) {
  // dist では以下どれかに落ちることが多い
  // /docs -> dist/docs/index.html
  // /docs/a -> dist/docs/a/index.html (または dist/docs/a.html)
  const directFile = path.join(DIST, href);
  const a = path.join(DIST, href, "index.html");
  const b = path.join(DIST, href + ".html");
  const c = path.join(DIST, href); // assets like /schemas/xxx, /viewer/xxx
  const candidates = [a, b, c, directFile];

  return candidates.some((p) => fs.existsSync(p));
}

if (!fs.existsSync(DIST)) {
  console.error(`[check-dist-links] dist not found: ${DIST}`);
  console.error(`Run: npm --prefix apps/site run build`);
  process.exit(2);
}

const htmlFiles = walk(DIST).filter((p) => p.endsWith(".html"));

const hrefs = new Set();
for (const file of htmlFiles) {
  const s = fs.readFileSync(file, "utf8");
  // ざっくり href="..." と href='...' を拾う
  for (const m of s.matchAll(/href\s*=\s*["']([^"']+)["']/g)) {
    const href = normalizeHref(m[1]);
    if (!href) continue;
    hrefs.add(href);
  }
}

const missing = [];
for (const href of [...hrefs].sort()) {
  // root is always ok
  if (href === "/") continue;
  if (!existsAsRoute(href)) missing.push(href);
}

if (missing.length) {
  console.error(`[check-dist-links] MISSING (${missing.length})`);
  for (const x of missing) console.error(`- ${x}`);
  process.exit(1);
}

console.log(`[check-dist-links] OK internal links=${hrefs.size}`);
