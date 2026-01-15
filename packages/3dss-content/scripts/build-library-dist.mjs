// packages/3dss-content/scripts/build-library-dist.mjs
// SSOT: packages/3dss-content/library/<ID>/
// Output payload root: packages/3dss-content/dist/**  (to be mirrored into apps/site/public/**)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const LIBRARY_DIR = path.join(ROOT, "library");
const SAMPLE_DIR = path.join(ROOT, "sample");
const SCENES_DIR = path.join(ROOT, "scenes");
const CANONICAL_DIR = path.join(ROOT, "canonical");
const DIST_DIR = path.join(ROOT, "dist");

const OUT_3DSS_DIR = path.join(DIST_DIR, "3dss");
const OUT_3DSS_SAMPLE_DIR = path.join(OUT_3DSS_DIR, "sample");
const OUT_3DSS_SCENES_DIR = path.join(OUT_3DSS_DIR, "scenes");
const OUT_3DSS_CANONICAL_DIR = path.join(OUT_3DSS_DIR, "canonical");
const OUT_3DSS_LIBRARY_DIR = path.join(OUT_3DSS_DIR, "library");
const OUT_LIBRARY_DIR = path.join(DIST_DIR, "library");

const ID_RE = /^\d{6}[0-9a-z]{2}$/;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  const s = fs.readFileSync(p, "utf8");
  return JSON.parse(s);
}

function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function cleanDist() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}

function toEpoch(s) {
  if (!s) return 0;
  const t = Date.parse(String(s));
  return Number.isFinite(t) ? t : 0;
}

function deriveUpdatedAt(meta, dm, modelPath) {
  const m =
    (typeof meta?.updated_at === "string" && meta.updated_at.trim()) ||
    (typeof dm?.updated_at === "string" && dm.updated_at.trim()) ||
    (typeof dm?.updatedAt === "string" && dm.updatedAt.trim()) ||
    "";

  if (m && toEpoch(m)) return m;

  // fallback: file mtime
  try {
    const st = fs.statSync(modelPath);
    return st?.mtime ? new Date(st.mtime).toISOString() : null;
  } catch {
    return null;
  }
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function buildViewerUrl(modelUrl) {
  // Contract: viewer entry takes `model=`. (Legacy `open=` is supported only for backward links.)
  return `/viewer/index.html?model=${encodeURIComponent(modelUrl)}`;
}

function pickSeo(meta, titleFallback, descFallback) {
  // ultra-minimal: accept either top-level or meta.seo.* if present
  const seo = meta?.seo && typeof meta.seo === "object" ? meta.seo : {};

  const metaTitle =
    (typeof seo.title === "string" && seo.title.trim()) ||
    (typeof meta.title === "string" && meta.title.trim()) ||
    null;

  const metaDescription =
    (typeof seo.description === "string" && seo.description.trim()) ||
    (typeof meta.description === "string" && meta.description.trim()) ||
    null;

  return {
    meta_title: metaTitle ?? titleFallback ?? null,
    meta_description: metaDescription ?? descFallback ?? null,
  };
}

function main() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    throw new Error(`library dir not found: ${LIBRARY_DIR}`);
  }

  cleanDist();
  ensureDir(OUT_3DSS_LIBRARY_DIR);
  ensureDir(OUT_LIBRARY_DIR);
  ensureDir(OUT_3DSS_CANONICAL_DIR);
  ensureDir(OUT_3DSS_SAMPLE_DIR);
  ensureDir(OUT_3DSS_SCENES_DIR);

  const ids = fs
    .readdirSync(LIBRARY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => ID_RE.test(name))
    .sort() // ascending
    .reverse(); // descending (newest first)

  const items = [];

  for (const id of ids) {
    const srcDir = path.join(LIBRARY_DIR, id);
    const modelPath = path.join(srcDir, "model.3dss.json");
    const metaPath = path.join(srcDir, "_meta.json");
    if (!existsFile(modelPath)) {
      throw new Error(`missing model.3dss.json: ${modelPath}`);
    }
    if (!existsFile(metaPath)) {
      throw new Error(`missing _meta.json (required): ${metaPath}`);
    }

    const model = readJson(modelPath);
    const meta = readJson(metaPath);

    const dm = model?.document_meta ?? {};

    // Support both legacy keys (title/summary) and current keys (document_title/document_summary).
    const rawTitle = dm.title ?? dm.document_title;
    if (typeof rawTitle !== "string" || !rawTitle.trim()) {
      throw new Error(`missing document_meta.(title|document_title) in ${modelPath}`);
    }
    const title = rawTitle.trim();

    const modelSummary = typeof dm.summary === "string" ? dm.summary : (typeof dm.document_summary === "string" ? dm.document_summary : "");

    // summary is primarily for UI; allow _meta.summary, then _meta.description, then model document summary.
    const summary =
      (typeof meta?.summary === "string" ? meta.summary : null) ??
      (typeof meta?.description === "string" ? meta.description : null) ??
      (typeof modelSummary === "string" ? modelSummary : "") ??
      "";

    const modelTags = Array.isArray(dm.tags) ? dm.tags : [];
    const tags = uniq([...(Array.isArray(meta?.tags) ? meta.tags : []), ...modelTags]);

    const entry_points = Array.isArray(meta?.entry_points) ? meta.entry_points : [];
    const pairs = Array.isArray(meta?.pairs) ? meta.pairs : [];
    const rights = meta?.rights ?? null;
    const related = Array.isArray(meta?.related) ? meta.related : [];

    const outDir = path.join(OUT_3DSS_LIBRARY_DIR, id);
    ensureDir(outDir);

    // copy model
    fs.copyFileSync(modelPath, path.join(outDir, "model.3dss.json"));

    const model_url = `/3dss/library/${id}/model.3dss.json`;
    const viewer_url = buildViewerUrl(model_url);

    // SEO: minimal title/description only (no per-item og image).
    const seo = pickSeo(meta, title, summary);

    const published = meta?.published !== false;
    if (!published) {
      console.warn(`[build:dist] NOTE unpublished item (excluded from index): ${id}`);
    } else {
      items.push({
        id,
        slug: id,
        title,
        summary: summary ?? "",
        updated_at: deriveUpdatedAt(meta, dm, modelPath),
        tags,
        viewer_url,
        entry_points,
        pairs,
        rights,
        related,
        // optional seo keys (do not break current readers)
        ...seo
      });
    }
  }

  writeJson(path.join(OUT_LIBRARY_DIR, "library_index.json"), {
    version: 3,
    generated_at: new Date().toISOString(),
    items,
  });
  // copy 3dss sample (legacy: /3dss/sample/...)
  if (fs.existsSync(SAMPLE_DIR)) {
    fs.cpSync(SAMPLE_DIR, OUT_3DSS_SAMPLE_DIR, { recursive: true });
  }

  // copy 3dss scenes (default entry: /3dss/scenes/...)
  if (!fs.existsSync(SCENES_DIR)) {
    throw new Error(`[build:dist] Missing SSOT dir: ${SCENES_DIR}`);
  }
  fs.cpSync(SCENES_DIR, OUT_3DSS_SCENES_DIR, { recursive: true });
  const scenesProbe = path.join(OUT_3DSS_SCENES_DIR, "default", "default.3dss.json");
  if (!fs.existsSync(scenesProbe)) {
    throw new Error(`[build:dist] scenes copy failed: ${scenesProbe}`);
  }

  // copy canonical (site expects /3dss/canonical/...)
  if (fs.existsSync(CANONICAL_DIR)) {
    fs.cpSync(CANONICAL_DIR, OUT_3DSS_CANONICAL_DIR, { recursive: true });
  }

  // optional editorial mirroring (if you choose to place SSOT here)
  const editorialSrc = path.join(ROOT, "editorial", "library.editorial.json");
  if (existsFile(editorialSrc)) {
    ensureDir(OUT_LIBRARY_DIR);
    fs.copyFileSync(editorialSrc, path.join(OUT_LIBRARY_DIR, "editorial.json"));
  }

  console.log(`[build:dist] OK items=${items.length}`);
}

main();