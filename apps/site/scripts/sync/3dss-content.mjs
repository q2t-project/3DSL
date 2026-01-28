import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// repoRoot: derived from this script location (apps/site/scripts/sync/*)
const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");
const srcDist = path.join(repoRoot, "packages", "3dss-content", "dist");
const dstPublic = path.join(repoRoot, "apps", "site", "public");
const dstContent = path.join(repoRoot, "apps", "site", "src", "content", "library_items");

function rmIfExists(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function rmGeneratedMarkdown(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile()) continue;
    if (ent.name === ".gitkeep") continue;
    if (!ent.name.endsWith(".md")) continue;
    fs.rmSync(path.join(dir, ent.name), { force: true });
  }
}

function patchContentPlaceholders(text, id) {
  // Optional convenience: allow authors to write /_data/library/<ID>/... in content.md.
  // Keep it conservative: only replace the known placeholder patterns.
  return String(text)
    .replaceAll("/_data/library/<ID>/", `/_data/library/${id}/`)
    .replaceAll("/_data/library/{{ID}}/", `/_data/library/${id}/`);
}

function yamlDq(s) {
  // YAML double-quoted scalar escape.
  return String(s).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

if (!fs.existsSync(srcDist)) {
  console.error(`[sync] dist not found: ${srcDist}`);
  process.exit(1);
}

// public の中で、この同期が責任持つ範囲だけ掃除（残骸事故防止）
// NOTE: /library は Astro のページ用ルートに予約し、
// 3dss-content の dist/library は public/_data/library に退避して衝突を避ける。
ensureDir(dstPublic);
rmIfExists(path.join(dstPublic, "3dss", "library"));
rmIfExists(path.join(dstPublic, "3dss", "scene"));
rmIfExists(path.join(dstPublic, "_data", "library"));
rmIfExists(path.join(dstPublic, "library")); // legacy cleanup

// dist 直下（3dss/, library/ など）を public に同期。
// - dist/library -> public/_data/library
// - その他は public 直下へ
for (const ent of fs.readdirSync(srcDist, { withFileTypes: true })) {
  const name = ent.name;
  const src = path.join(srcDist, name);
  const dst = name === "library" ? path.join(dstPublic, "_data", "library") : path.join(dstPublic, name);
  rmIfExists(dst);
  ensureDir(path.dirname(dst));
  fs.cpSync(src, dst, { recursive: true });
}

console.log("[sync] 3dss-content(dist) -> site/public OK (library -> /_data/library)");

// --- generate Astro content entries for optional per-item Markdown body ---
// Source of truth: public/_data/library/<id>/content.md
// Output: apps/site/src/content/library_items/<id>.md (untracked generated)
ensureDir(dstContent);
rmGeneratedMarkdown(dstContent);

const indexPath = path.join(dstPublic, "_data", "library", "library_index.json");
if (fs.existsSync(indexPath)) {
  const idx = readJson(indexPath);
  const items = Array.isArray(idx?.items) ? idx.items : [];
  for (const it of items) {
    const id = typeof it?.id === "string" ? it.id : (typeof it?.slug === "string" ? it.slug : null);
    if (!id) continue;

        const contentSrc = path.join(dstPublic, "_data", "library", id, "content.md");

    let body = "";
    if (fs.existsSync(contentSrc)) {
      const bodyRaw = fs.readFileSync(contentSrc, "utf8");
      body = patchContentPlaceholders(bodyRaw, id);
    }

    const fm = [
      "---",
      `id: \"${yamlDq(id)}\"`,
      (typeof it?.title === "string" && it.title.trim()) ? `title: \"${yamlDq(it.title.trim())}\"` : null,
      (typeof it?.summary === "string" && it.summary.trim()) ? `summary: \"${yamlDq(it.summary.trim())}\"` : null,
      Array.isArray(it?.tags)
        ? `tags: [${it.tags.map((t) => `\"${yamlDq(String(t))}\"`).join(", ")}]`
        : null,
      (typeof it?.created_at === "string" && it.created_at.trim()) ? `created_at: \"${yamlDq(it.created_at.trim())}\"` : null,
      (typeof it?.updated_at === "string" && it.updated_at.trim()) ? `updated_at: \"${yamlDq(it.updated_at.trim())}\"` : null,
      "---",
      "",
    ].filter(Boolean).join("\n");

    const outPath = path.join(dstContent, `${id}.md`);
    fs.writeFileSync(outPath, `${fm}${body}`, "utf8");

  }
  console.log("[sync] library Markdown -> src/content/library_items OK");
} else {
  console.warn(`[sync] library_index.json not found (skip Markdown gen): ${indexPath}`);
}

// --- fixtures suite -> site/public (for regression/fixtures validation) ---
const srcFixturesSuite = path.join(repoRoot, "packages", "3dss-content", "fixtures", "regression");
const dstFixturesSuite = path.join(dstPublic, "3dss", "fixtures", "regression");

if (!fs.existsSync(srcFixturesSuite)) {
  console.error(`[sync] fixtures suite not found: ${srcFixturesSuite}`);
  process.exit(1);
}

rmIfExists(dstFixturesSuite);
ensureDir(path.dirname(dstFixturesSuite));
fs.cpSync(srcFixturesSuite, dstFixturesSuite, { recursive: true });

console.log("[sync] fixtures suite -> site/public OK");
