// scripts/check-forbidden-imports.mjs
// Enforce dependency_rules (manifest) for modeler SSOT.
// - Reads /modeler/manifest.yaml
// - Scans JS modules under /modeler (excluding vendor/_generated)
// NOTE: This is a lightweight import-line scan (no full parser).
//       It is intentionally strict and may flag unusual formatting.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.yaml');

const layerDefinitions = [
  {
    name: 'entry',
    match: (rel) => rel === 'runtime/bootstrapModeler.js' || rel.startsWith('runtime/entry/'),
  },
  {
    name: 'hub',
    match: (rel) => rel === 'runtime/modelerHub.js',
  },
  {
    name: 'core',
    match: (rel) => rel.startsWith('runtime/core/'),
  },
  {
    name: 'renderer',
    match: (rel) => rel.startsWith('runtime/renderer/'),
  },
  {
    name: 'ui',
    match: (rel) => rel.startsWith('ui/'),
  },
  {
    name: 'host',
    match: (rel) =>
      rel === 'modelerHost.js' ||
      rel === 'modelerDevHarness.js' ||
      rel === 'modelerHostBoot.js' ||
      rel.endsWith('.html') ||
      rel.endsWith('.css'),
  },
];

function readManifestEdges() {
  const text = fs.readFileSync(manifestPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const allowed = new Set();
  const forbidden = new Set();
  let mode = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    if (line.trim() === 'allowed:') { mode = 'allowed'; continue; }
    if (line.trim() === 'forbidden:') { mode = 'forbidden'; continue; }
    const m = line.match(/^\s*-\s*"(.+?)"\s*$/);
    if (!m || !mode) continue;
    (mode === 'allowed' ? allowed : forbidden).add(m[1]);
  }

  return { allowed, forbidden };
}

function classifyLayer(rel) {
  for (const d of layerDefinitions) {
    if (d.match(rel)) return d.name;
  }
  // unknown files are treated as host-ish (docs, etc.) and ignored by this check
  return null;
}

function walkJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(repoRoot, p).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (rel.startsWith('vendor/')) continue;
      if (rel.startsWith('_generated/')) continue;
      out.push(...walkJsFiles(p));
      continue;
    }
    if (e.isFile() && p.endsWith('.js')) out.push(p);
  }
  return out;
}

function parseImports(jsText) {
  // ESM: import ... from 'x';  (line-based)
  const out = [];
  const lines = jsText.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('import')) continue;
    const m = t.match(/\bfrom\s+['"](.+?)['"]/);
    if (m) out.push(m[1]);
  }
  return out;
}

function resolveRelative(fromRel, spec) {
  if (!spec.startsWith('.')) return null;
  const fromDir = path.posix.dirname(fromRel);
  const joined = path.posix.normalize(path.posix.join(fromDir, spec));
  // accept "./x" and "./x.js"
  const cands = [joined, `${joined}.js`, `${joined}/index.js`];
  for (const c of cands) {
    const abs = path.join(repoRoot, c);
    if (fs.existsSync(abs) && abs.endsWith('.js')) return c;
  }
  return null;
}

function main() {
  const { allowed, forbidden } = readManifestEdges();
  const files = walkJsFiles(repoRoot);

  const violations = [];

  for (const abs of files) {
    const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
    const fromLayer = classifyLayer(rel);
    if (!fromLayer) continue;

    const text = fs.readFileSync(abs, 'utf8');
    const imports = parseImports(text);

    for (const spec of imports) {
      const toRel = resolveRelative(rel, spec);
      if (!toRel) continue; // external or unresolved: ignore here
      const toLayer = classifyLayer(toRel);
      if (!toLayer) continue;

      const edge = `${fromLayer} -> ${toLayer}`;
      if (forbidden.has(edge)) {
        violations.push({ file: rel, edge, import: spec });
        continue;
      }
      // If allowed list is present, we keep it as documentation; do not require exhaustive allowlist.
      // (The forbidden list is the hard guard.)
    }
  }

  if (violations.length > 0) {
    console.error('[forbidden-imports] violations:');
    for (const v of violations) {
      console.error(`- FORBIDDEN_EDGE: ${v.file}: ${v.edge} via import '${v.import}'`);
    }
    process.exit(1);
  }

  console.log('[forbidden-imports] OK');
}

main();
