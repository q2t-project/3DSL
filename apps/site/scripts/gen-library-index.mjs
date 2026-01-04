import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';

// Generate apps/site/public/library/library_index.json from published 3DSS files.
//
// SSOT:
// - public/3dss/library/<id>/model.3dss.json : published model files
// - public/library/editorial.json   : recommended order / optional overrides
//
// Output:
// - public/library/library_index.json
//
// Notes:
// - This repo is small-scale. "おすすめ" is editorial (stable shelf), not an auto-ranking.
// - "新着" is derived from updated_at (document_meta.updated_at) or filesystem mtime.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const siteRoot = path.join(repoRoot, 'apps/site');
const publicRoot = path.join(siteRoot, 'public');

const CONTENT_DIR = path.join(publicRoot, '3dss', 'library');
const EDITORIAL_JSON = path.join(publicRoot, 'library', 'editorial.json');
const OUT_JSON = path.join(publicRoot, 'library', 'library_index.json');
const SNAPSHOT_DIR = path.join(publicRoot, 'library', 'snapshots');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTag(t) {
  const s = (t ?? '').toString().trim();
  if (!s) return '';
  // Compact tags: "m:time-arrow" -> "time-arrow". Keep originals if no prefix.
  const i = s.indexOf(':');
  if (i >= 0 && i < s.length - 1) return s.slice(i + 1).trim();
  return s;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function slugFromId(id) {
  // Detail pages are 1-segment routes: /library/<slug>
  // Keep id as-is for storage path mapping, but slug must not contain '/'.
  return (id ?? '').toString().replaceAll('/', '--');
}

async function listModelFiles(contentDir) {
  // Directory layout: public/3dss/library/<id>/model.3dss.json
  // - ignore directories starting with "_" or "." (private docs / temp)
  // - ignore anything without model.3dss.json
  const out = [];
  const entries = await readdir(contentDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;

    const id = e.name;
    const abs = path.join(contentDir, id, 'model.3dss.json');
    if (await exists(abs)) out.push({ id, abs });
  }
  return out;
}

async function readJson(p) {
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw);
}

function toEpoch(s) {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function isDateId(id) {
  return /^\d{6}[0-9a-z]{2}$/.test((id ?? '').toString());
}

async function deriveDates(absPath, docMeta) {
  const st = await stat(absPath);
  const mtimeIso = st.mtime ? new Date(st.mtime).toISOString() : nowIso();
  const updated = (docMeta?.updated_at ?? docMeta?.updatedAt ?? docMeta?.document_updated_at ?? '').toString();
  const created = (docMeta?.created_at ?? docMeta?.createdAt ?? docMeta?.document_created_at ?? '').toString();
  const updated_at = updated && toEpoch(updated) ? updated : mtimeIso;
  const created_at = created && toEpoch(created) ? created : updated_at;
  return { created_at, updated_at };
}

async function findSnapshot(id) {
  // snapshot is optional. check common extensions.
  const candidates = [
    path.join(SNAPSHOT_DIR, `${id}.svg`),
    path.join(SNAPSHOT_DIR, `${id}.png`),
    path.join(SNAPSHOT_DIR, `${id}.jpg`),
    path.join(SNAPSHOT_DIR, `${id}.jpeg`),
    path.join(SNAPSHOT_DIR, `${id}.webp`),
  ];
  for (const abs of candidates) {
    if (await exists(abs)) {
      const rel = path.relative(publicRoot, abs).split(path.sep).join('/');
      return '/' + rel;
    }
  }
  return undefined;
}

function applyOverrides(base, ov) {
  if (!ov || typeof ov !== 'object') return base;
  const out = { ...base };
  for (const k of Object.keys(ov)) {
    const v = ov[k];
    if (v === undefined) continue;
    // shallow merge is enough here; nested objects (rights/policy) can be overridden fully.
    out[k] = v;
  }
  return out;
}

async function main() {
  // Always write an index so the site can build deterministically.
  // (Empty library is a valid state.)

  const editorial = (await exists(EDITORIAL_JSON)) ? await readJson(EDITORIAL_JSON) : { recommended: [], hidden: [], overrides: {} };
  const recommendedList = safeArray(editorial?.recommended).map((s) => (s ?? '').toString()).filter(Boolean);
  const hidden = new Set(safeArray(editorial?.hidden).map((s) => (s ?? '').toString()).filter(Boolean));
  const overrides = (editorial?.overrides && typeof editorial.overrides === 'object') ? editorial.overrides : {};

  const models = (await exists(CONTENT_DIR)) ? await listModelFiles(CONTENT_DIR) : [];

  const items = [];
  for (const m of models) {
    const id = m.id;
    const abs = m.abs;
    const slug = slugFromId(id);
    if (hidden.has(id)) continue;

    let json;
    try {
      json = await readJson(abs);
    } catch (e) {
      console.warn('[gen] skip (invalid json):', id);
      continue;
    }

    const meta = json?.document_meta ?? {};
    const title = (meta?.document_title ?? '').toString().trim() || id;
    const summary = (meta?.document_summary ?? '').toString().trim() || undefined;

    const tagsRaw = safeArray(meta?.tags).map(normalizeTag).filter(Boolean);
    const tags = Array.from(new Set(tagsRaw));

    const { created_at, updated_at } = await deriveDates(abs, meta);

    const recIdx = recommendedList.indexOf(id);
    const recommended_rank = recIdx >= 0 ? recIdx + 1 : undefined;
    const recommended = recIdx >= 0 ? true : undefined;

    const thumb = await findSnapshot(id);

    const item = applyOverrides(
      {
        id,
        slug,
        title,
        summary,
        thumb,
        // /app/viewer resolves id -> /3dss/library/<id>/model.3dss.json
        viewer_url: `/app/viewer?id=${encodeURIComponent(id)}`,
        tags,
        created_at,
        updated_at,
        recommended,
        recommended_rank,
      },
      overrides[id]
    );

    items.push(item);
  }

  // New shelf: small-scale curation.
  // - Prefer date-based id order (YYMMDDxx desc) when available.
  // - Fallback: updated_at desc.
  items.sort((a, b) => {
    const aid = (a.id ?? '').toString();
    const bid = (b.id ?? '').toString();
    const ad = isDateId(aid);
    const bd = isDateId(bid);
    if (ad && bd && aid !== bid) return aid < bid ? 1 : -1;

    const at = toEpoch(a.updated_at);
    const bt = toEpoch(b.updated_at);
    if (at !== bt) return bt - at;
    return (a.title || '').localeCompare(b.title || '', 'ja');
  });

  const out = {
    version: 3,
    generated_at: nowIso(),
    items,
  };

  await mkdir(path.dirname(OUT_JSON), { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`[gen] library-index: wrote ${path.relative(repoRoot, OUT_JSON)} (${items.length} items)`);
}

main().catch((e) => {
  console.error('[gen] library-index: FAILED');
  console.error(e);
  process.exit(1);
});
