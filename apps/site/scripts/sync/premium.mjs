import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm, cp, readFile, writeFile, readdir, stat } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

const SRC = path.join(repoRoot, "packages", "3dss-content", "premium");
const DST_META = path.join(siteRoot, "public", "api", "premium", "meta");
const DST_MODEL = path.join(siteRoot, "public", "api", "premium", "model");
const DST_ASSET = path.join(siteRoot, "public", "api", "premium", "asset");

// NOTE:
// Production safety rule:
// - Do NOT emit any *.json mirror for premium API payloads.
//   (If we emit /api/premium/**/<slug>.json as a static file, it can bypass
//    Functions guards depending on hosting routing.)
//
// Local dev/preview should test premium via the guarded endpoints
// (/api/premium/**/<slug>) and not via static mirrors.

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(root) {
  const out = [];
  if (!(await exists(root))) return out;
  const ents = await readdir(root, { withFileTypes: true });
  for (const ent of ents) {
    if (ent.isDirectory()) out.push(ent.name);
  }
  return out;
}

async function main() {
  if (!(await exists(SRC))) {
    console.log("[sync] premium: SKIP (no SSOT)");
    return;
  }

  // Remove old outputs (owned by sync)
  // Keep this directory entirely under sync control to avoid stale payloads.
  await rm(path.join(siteRoot, "public", "api", "premium"), { recursive: true, force: true });
  await mkdir(DST_META, { recursive: true });
  await mkdir(DST_MODEL, { recursive: true });
  await mkdir(DST_ASSET, { recursive: true });

  const slugs = await listDirs(SRC);
  for (const slug of slugs) {
    const base = path.join(SRC, slug);
    const metaPath = path.join(base, "_meta.json");
    const contentPath = path.join(base, "content.md");

    // model: allow model.3dss.json or any *.3dss.json
    let modelFile = path.join(base, "model.3dss.json");
    if (!(await exists(modelFile))) {
      const files = await readdir(base);
      const found = files.find((n) => n.endsWith(".3dss.json"));
      if (found) modelFile = path.join(base, found);
    }

    const metaRaw = (await exists(metaPath)) ? await readFile(metaPath, "utf8") : "{}";
    let metaJson;
    try {
      metaJson = JSON.parse(metaRaw);
    } catch {
      metaJson = {};
    }

    const contentMd = (await exists(contentPath)) ? await readFile(contentPath, "utf8") : "";

    // assets
    const assetsDir = path.join(base, "assets");
    const assets = [];
    if (await exists(assetsDir)) {
      const ents = await readdir(assetsDir, { withFileTypes: true });
      for (const ent of ents) {
        if (!ent.isFile()) continue;
        const name = ent.name;
        assets.push({ name, path: encodeURIComponent(name) });
      }
      // copy whole dir
      const dstAssetsDir = path.join(DST_ASSET, slug);
      await mkdir(dstAssetsDir, { recursive: true });
      await cp(assetsDir, dstAssetsDir, { recursive: true });
    }

    // write model (extension-less only)
    if (await exists(modelFile)) {
      await cp(modelFile, path.join(DST_MODEL, slug), { recursive: false });
    } else {
      // keep missing model visible for debugging (still protected)
      const missing = JSON.stringify({ ok: false, code: "MODEL_MISSING" });
      await writeFile(path.join(DST_MODEL, slug), missing, "utf8");
    }

    // write meta (single JSON, includes content + assets)
    const metaOut = {
      ...metaJson,
      slug,
      content_md: contentMd,
      assets,
    };
    const metaText = JSON.stringify(metaOut, null, 2);
    await writeFile(path.join(DST_META, slug), metaText, "utf8");
  }

  try {
    await writeFile(path.join(siteRoot, "public", "api", "premium", ".OWNED_BY_SYNC"), "", "utf8");
  } catch {}

  console.log(`[sync] premium: OK (${slugs.length} slug)`);
}

await main();
