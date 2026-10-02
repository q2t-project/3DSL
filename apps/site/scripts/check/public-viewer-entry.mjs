import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const publicSources = [
  "src/pages/index.astro",
  "src/content/pages/concept.md",
  "src/layouts/Layout.astro",
  "src/pages/library/index.astro",
  "src/pages/library/[slug].astro",
];

for (const rel of publicSources) {
  const text = read(rel);
  const badHref = [...text.matchAll(/href\s*=\s*["']\/viewer(?:\/|["'])/g)];
  if (badHref.length) {
    throw new Error(`raw /viewer public href found in ${rel}`);
  }
}

// Internal preview/runtime references are allowed; generated reader-facing URLs are not.
const indexPath = path.join(ROOT, "public/_data/library/library_index.json");
if (!fs.existsSync(indexPath)) {
  throw new Error("library_index.json missing; run sync:3dss-content first");
}
const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const items = Array.isArray(data?.items) ? data.items : [];
for (const item of items) {
  const url = String(item?.viewer_url ?? "");
  if (!url.startsWith("/app/viewer?")) {
    throw new Error(`Library item ${item?.id ?? "?"} has non-canonical viewer_url: ${url}`);
  }
}

console.log(`public viewer entry check: PASS (${items.length} library items)`);
