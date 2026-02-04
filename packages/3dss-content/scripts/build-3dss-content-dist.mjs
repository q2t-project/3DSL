// packages/3dss-content/scripts/build-3dss-content-dist.mjs
// Build packages/3dss-content/dist/** for site publishing.
//
// SSOT inputs: 
// - library/<ID>/model.3dss.json + library/<ID>/_meta.json
// - scenes/** (required)
// - sample/** (optional)
// - canonical/** (optional)
// - editorial/library.editorial.json (optional)
//
// Output payload root: packages/3dss-content/dist/**
// (mirrored into apps/site/public/** by apps/site/scripts/sync/3dss-content.mjs)

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

const ID_RE = /^\d{6}[0-9a-z]{2}$/i;

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (s) return s;
  }
  return null;
}

function deriveCreatedAt(dm, id, modelPath) {
  const explicit = firstNonEmpty(dm?.created_at, dm?.createdAt);
  if (explicit && toEpoch(explicit)) return explicit;

  // fallback: id=YYMMDDxx
  const sid = String(id ?? "");
  if (ID_RE.test(sid)) {
    const yy = Number(sid.slice(0, 2));
    const mm = Number(sid.slice(2, 4));
    const dd = Number(sid.slice(4, 6));
    if (Number.isFinite(yy) && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const y = 2000 + yy;
      return `${y}-${pad2(mm)}-${pad2(dd)}`;
    }
  }

  // last resort: file timestamps
  try {
    const st = fs.statSync(modelPath);
    const d = st?.birthtime ?? st?.mtime;
    if (d && !Number.isNaN(d.getTime())) return new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
  } catch {
    // ignore
  }
  return null;
}

function derivePublishedAt(meta) {
  // NOTE: keep updated_at only as a migration fallback (do not output updated_at).
  const s = firstNonEmpty(meta?.published_at, meta?.publishedAt, meta?.updated_at);
  return s && toEpoch(s) ? s : null;
}

function deriveRepublishedAt(meta) {
  // NOTE: keep updated_at only as a migration fallback (do not output updated_at).
  const s = firstNonEmpty(meta?.republished_at, meta?.republishedAt, meta?.updated_at);
  return s && toEpoch(s) ? s : null;
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

function safeCpDir(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return false;
  if (!fs.statSync(srcDir).isDirectory()) return false;
  ensureDir(dstDir);
  fs.cpSync(srcDir, dstDir, { recursive: true });
  return true;
}

function pickSeo(meta, titleFallback, descFallback) {
  const seo = meta?.seo && typeof meta.seo === "object" ? meta.seo : {};

  const metaTitle = firstNonEmpty(
    seo.title,
    meta?.meta_title,
    meta?.seo_title,
    meta?.title,
  );

  const metaDescription = firstNonEmpty(
    seo.description,
    meta?.meta_description,
    meta?.seo_description,
    meta?.description,
  );

  return {
    meta_title: metaTitle ?? titleFallback ?? null,
    meta_description: metaDescription ?? descFallback ?? null,
  };
}

function ensureMeta(metaPath, id) {
  if (!existsFile(metaPath)) {
    throw new Error(
      `missing _meta.json (library registry) for item: ${id}
` +
        `  expected: ${metaPath}
` +
        `  hint: create it via tools/new-library-item.mjs (or add by hand)`
    );
  }

  const meta = readJson(metaPath);

  // Ledger-only. Core display fields are SSOT in model.document_meta.
  const forbidden = ['title', 'summary', 'tags', 'created_at', 'updated_at'];
  for (const k of forbidden) {
    if (Object.prototype.hasOwnProperty.call(meta ?? {}, k)) {
      throw new Error(`forbidden _meta.json key: ${k} (SSOT is model.document_meta): ${metaPath}`);
    }
  }

  // Minimal sanity for published workflow
  if (typeof meta?.published !== 'boolean') {
    throw new Error(`missing or invalid _meta.json.published (boolean): ${metaPath}`);
  }
  if (meta.published === true) {
    if (typeof meta.published_at !== 'string') throw new Error(`missing _meta.json.published_at (string): ${metaPath}`);
    if (typeof meta.republished_at !== 'string') throw new Error(`missing _meta.json.republished_at (string): ${metaPath}`);
  } else {
    // unpublished: dates should generally be absent (not null)
    if (meta.published_at === null) throw new Error(`_meta.json.published_at must not be null (omit the key): ${metaPath}`);
    if (meta.republished_at === null) throw new Error(`_meta.json.republished_at must not be null (omit the key): ${metaPath}`);
  }

  return meta;
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
    .sort()
    .reverse();

  const items = [];

  for (const id of ids) {
    const srcDir = path.join(LIBRARY_DIR, id);
    const modelPath = path.join(srcDir, "model.3dss.json");
    const metaPath = path.join(srcDir, "_meta.json");

    if (!existsFile(modelPath)) {
      throw new Error(`missing model.3dss.json: ${modelPath}`);
    }
    const model = readJson(modelPath);
    const dm = model?.document_meta ?? {};

    // Guard: display metadata must be SSOT in _meta.json only.

    const meta = ensureMeta(metaPath, id);
    // Display metadata (title/summary/tags/author/i18n) is SSOT in model.document_meta.
    const titleFromModel = firstNonEmpty(dm?.document_title, dm?.title);
    const summaryFromModel = firstNonEmpty(dm?.document_summary, dm?.summary);

    if (meta?.title && titleFromModel && meta.title !== titleFromModel) {
      console.warn(
        `[build:dist] WARN meta title differs from model title: id=${id} meta.title="${meta.title}" model.title="${titleFromModel}"`
      );
    }

    const title = titleFromModel ?? firstNonEmpty(meta?.title) ?? String(id);
    const summary = summaryFromModel ?? firstNonEmpty(meta?.summary, meta?.description) ?? "";
    const tags = Array.isArray(dm?.tags) ? dm.tags : Array.isArray(meta?.tags) ? meta.tags : [];

    const entry_points = Array.isArray(meta?.entry_points) ? meta.entry_points : [];
    const pairs = Array.isArray(meta?.pairs) ? meta.pairs : [];
    const rights = meta?.rights ?? null;
    const related = Array.isArray(meta?.related) ? meta.related : [];

    // --- dist outputs ---
    // 1) legacy/public model path (for backward shared links)
    const out3dssDir = path.join(OUT_3DSS_LIBRARY_DIR, id);
    ensureDir(out3dssDir);
    fs.copyFileSync(modelPath, path.join(out3dssDir, "model.3dss.json"));

    // 2) site data root (mirrored to apps/site/public/_data/library/<id>/...)
    const outDataDir = path.join(OUT_LIBRARY_DIR, id);
    ensureDir(outDataDir);
    fs.copyFileSync(modelPath, path.join(outDataDir, "model.3dss.json"));

    // copy meta (if missing in SSOT, emit an ensured meta JSON in dist)
    if (existsFile(metaPath)) {
      fs.copyFileSync(metaPath, path.join(outDataDir, "_meta.json"));
    } else {
      writeJson(path.join(outDataDir, "_meta.json"), meta);
    }

    // optional: content + assets + attachments
    const contentSrc = path.join(srcDir, "content.md");
    if (existsFile(contentSrc)) {
      fs.copyFileSync(contentSrc, path.join(outDataDir, "content.md"));
    }
    safeCpDir(path.join(srcDir, "assets"), path.join(outDataDir, "assets"));
    safeCpDir(path.join(srcDir, "attachments"), path.join(outDataDir, "attachments"));

    const data_dir = `/_data/library/${id}`;
    const model_url = `${data_dir}/model.3dss.json`;
    const legacy_model_url = `/3dss/library/${id}/model.3dss.json`;
    const viewer_url = buildViewerUrl(model_url);

    const created_at = deriveCreatedAt(dm, id, modelPath);

    const published_at = derivePublishedAt(meta);
    const republished_at = deriveRepublishedAt(meta) ?? published_at;

    // SEO: minimal title/description only (no per-item og image).
    const seo = pickSeo(meta, title, summary);

    const published = meta?.published !== false;
    if (!published) {
      console.warn(`[build:dist] NOTE unpublished item (excluded from index): ${id}`);
      continue;
    }

    items.push({
      id,
      slug: id,
      title,
      summary,
      created_at,
      published_at,
      republished_at,
      tags,
      data_dir,
      model_url,
      legacy_model_url,
      viewer_url,
      entry_points,
      pairs,
      rights,
      related,
      page: meta?.page ?? null,
      ...seo,
    });
  }

  writeJson(path.join(OUT_LIBRARY_DIR, "library_index.json"), {
    version: 4,
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
