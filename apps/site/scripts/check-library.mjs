import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readdir, readFile, stat } from 'node:fs/promises';

// Small-scale sanity checks for packages/3dss-content/library/
// - folder id matches YYMMDDxx (xx is base36)
// - each item has model.3dss.json (valid JSON)
// - document_meta has required fields for 3DSS schema

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const LIB_ROOT = path.join(repoRoot, 'packages/3dss-content', 'library');

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(LIB_ROOT))) {
    console.log('[check] library: skipped (no packages/3dss-content/library)');
    return;
  }

  const entries = await readdir(LIB_ROOT, { withFileTypes: true });
  const idRe = /^\d{6}[0-9a-z]{2}$/;

  let ok = true;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const id = e.name;
    if (id.startsWith('_') || id.startsWith('.')) continue;

    if (!idRe.test(id)) {
      console.error(`[check] bad id folder: ${id}`);
      ok = false;
      continue;
    }

    const model = path.join(LIB_ROOT, id, 'model.3dss.json');
    if (!(await exists(model))) {
      console.error(`[check] missing model.3dss.json: ${id}`);
      ok = false;
      continue;
    }

    try {
      const raw = await readFile(model, 'utf8');
      const j = JSON.parse(raw);
      const dm = j?.document_meta ?? {};
      const req = ['document_title', 'document_uuid', 'schema_uri', 'author', 'version'];
      for (const k of req) {
        if (!dm[k] || typeof dm[k] !== 'string') {
          console.error(`[check] missing document_meta.${k}: ${id}`);
          ok = false;
        }
      }
      // quick stat so that accidental directories are caught early
      await stat(model);
    } catch (err) {
      console.error(`[check] invalid json: ${id}`);
      console.error(err);
      ok = false;
    }
  }

  if (!ok) process.exit(1);
  console.log('[check] library: OK');
}

main().catch((e) => {
  console.error('[check] library: FAILED');
  console.error(e);
  process.exit(1);
});
