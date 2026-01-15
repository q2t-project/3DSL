// packages/3dss-content/scripts/build-library-dist.mjs
// SSOT: packages/3dss-content/library/<ID>/
// Output payload root:
// - default: packages/3dss-content/dist/**
// - --out <path>: <path>/**  (intended: apps/site/public/**)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");                 // packages/3dss-content
const REPO_ROOT = path.resolve(ROOT, "..", "..");          // repo root

function readArg(name) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return String(process.argv[i + 1]);
  return null;
}

function resolveOutRoot(repoRoot, outArg) {
  if (!outArg) return null;
  // absolute path is respected; relative path is resolved from repo root
  if (path.isAbsolute(outArg)) return path.resolve(outArg);
  return path.resolve(repoRoot, outArg);
}

const outArg = readArg("--out");
const outRoot = resolveOutRoot(REPO_ROOT, outArg);

const LIBRARY_DIR = path.join(ROOT, "library");
const SAMPLE_DIR = path.join(ROOT, "sample");
const CANONICAL_DIR = path.join(ROOT, "canonical");
const SCENES_DIR = path.join(ROOT, "scenes");
const DIST_DIR = outRoot ? outRoot : path.join(ROOT, "dist");
const OUT_3DSS_DIR = path.join(DIST_DIR, "3dss");

const OUT_3DSS_RELEASE_DIR = path.join(OUT_3DSS_DIR, "release");

const OUT_3DSS_SCENE_DIR = path.join(OUT_3DSS_DIR, "scene");
const OUT_3DSS_SAMPLE_DIR = path.join(OUT_3DSS_DIR, "sample");
const OUT_3DSS_CANONICAL_DIR = path.join(OUT_3DSS_DIR, "canonical");
const OUT_3DSS_LIBRARY_DIR = path.join(OUT_3DSS_DIR, "library");
const OUT_LIBRARY_DIR = path.join(DIST_DIR, "library");

const SCHEMAS_RELEASE_DIR = path.join(ROOT, "..", "schemas", "release");

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
  // IMPORTANT:
  // Never delete DIST_DIR itself because it may be apps/site/public.
  // Only remove our output subtrees.
  rmIfExists(OUT_3DSS_DIR);
  rmIfExists(OUT_LIBRARY_DIR);
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

function newestVersionDir(root) {
  if (!fs.existsSync(root)) return null;
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^v\d+\.\d+\.\d+$/.test(d.name))
    .map((d) => d.name)
    .sort(); // lex sort works for v1.1.3 style (same digit width); good enough here
  return dirs.length ? dirs[dirs.length - 1] : null;
}

function copySchemasRelease(srcReleaseDir, dstReleaseDir) {
  if (!fs.existsSync(srcReleaseDir)) return;

  rmIfExists(dstReleaseDir);
  ensureDir(dstReleaseDir);
  fs.cpSync(srcReleaseDir, dstReleaseDir, { recursive: true });

  // latest alias: release/3DSS.schema.json -> release/vX.Y.Z/3DSS.schema.json
  const latest = newestVersionDir(dstReleaseDir);
  if (latest) {
    const latestSchema = path.join(dstReleaseDir, latest, "3DSS.schema.json");
    const aliasSchema = path.join(dstReleaseDir, "3DSS.schema.json");
    if (existsFile(latestSchema)) fs.copyFileSync(latestSchema, aliasSchema);
  }
}

function rmIfExists(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function main() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    throw new Error(`library dir not found: ${LIBRARY_DIR}`);
  }

  cleanDist();
  ensureDir(OUT_3DSS_SCENE_DIR);
  ensureDir(OUT_3DSS_LIBRARY_DIR);
  ensureDir(OUT_LIBRARY_DIR);
  ensureDir(OUT_3DSS_CANONICAL_DIR);
  ensureDir(OUT_3DSS_SAMPLE_DIR);
  ensureDir(OUT_3DSS_RELEASE_DIR);

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
  // copy 3dss sample (viewer default expects /3dss/sample/...)
  if (fs.existsSync(SAMPLE_DIR)) {
    fs.cpSync(SAMPLE_DIR, OUT_3DSS_SAMPLE_DIR, { recursive: true });
  }

  // copy canonical (site expects /3dss/canonical/...)
  if (fs.existsSync(CANONICAL_DIR)) {
    fs.cpSync(CANONICAL_DIR, OUT_3DSS_CANONICAL_DIR, { recursive: true });
  }

  // copy scenes (site expects /3dss/scene/...)
  if (fs.existsSync(SCENES_DIR)) {
    fs.cpSync(SCENES_DIR, OUT_3DSS_SCENE_DIR, { recursive: true });
  }

// copy schemas release (viewer runtime expects /3dss/release/...)
copySchemasRelease(SCHEMAS_RELEASE_DIR, OUT_3DSS_RELEASE_DIR);

  // compat: some paths may be prefixed twice (/3dss/release/...)

  // optional editorial mirroring (if you choose to place SSOT here)
  const editorialSrc = path.join(ROOT, "editorial", "library.editorial.json");
  if (existsFile(editorialSrc)) {
    ensureDir(OUT_LIBRARY_DIR);
    fs.copyFileSync(editorialSrc, path.join(OUT_LIBRARY_DIR, "editorial.json"));
  }

  console.log(`[build:${outArg ? "out" : "dist"}] OK out=${DIST_DIR} items=${items.length}`);
}

main();

