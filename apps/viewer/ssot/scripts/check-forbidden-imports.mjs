// scripts/check-forbidden-imports.mjs
// Enforce dependency_rules + minimal global reference rules.
// - Reads /viewer/manifest.yaml
// - Scans JS modules under /viewer (excluding vendor/_generated)
//
// Global reference rules (lightweight, no parser):
// - core/renderer must not directly reference `window`/`document`.
// - Exception: renderer/env.js is the only allowed place to touch window/document.

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
    description: 'bootstrap / composition root',
    match: (rel) => rel === 'runtime/bootstrapViewer.js' || rel.startsWith('runtime/entry/'),
  },
  {
    name: 'hub',
    description: 'orchestrator (transaction order)',
    match: (rel) => rel === 'runtime/viewerHub.js',
  },
  {
    name: 'core',
    description: 'canonical state + rules (single-writer)',
    match: (rel) => rel.startsWith('runtime/core/'),
  },
  {
    name: 'renderer',
    description: 'three/webgl execution (no DOM)',
    match: (rel) => rel.startsWith('runtime/renderer/'),
  },
  {
    name: 'ui',
    description: 'interaction + DOM overlay (no state writes)',
    match: (rel) => rel.startsWith('ui/'),
  },
  {
    name: 'host',
    description: 'host app shells / html / css',
    match: (rel) =>
      rel === 'viewerHost.js' ||
      rel === 'viewerDevHarness.js' ||
      rel === 'viewerHostBoot.js' ||
      rel.endsWith('.html') ||
      rel.endsWith('.css'),
  },
];

const minimalHostEntries = {
  'peekBoot.js': {
    classification: 'A. UI無し (No-UI Host)',
    allowedTargets: new Set(['runtime/bootstrapViewer.js', 'runtime/entry/inputTuning.js']),
    reason: 'Minimal host entry (no UI). Allow entry-only import to avoid zombie UI.',
  },
};

import { appendFileSync } from 'fs';

function logError(message) {
  console.error(message);
  appendFileSync('error.log', `${new Date().toISOString()} - ${message}\n`);
}

function readManifestEdges() {
  try {
    const text = fs.readFileSync(manifestPath, 'utf8');
    const lines = text.split(/\r?\n/);
    const allowed = new Set();
    const forbidden = new Set();
    let mode = null;

    for (const raw of lines) {
      const line = raw.replace(/\s+#.*$/, '').trimEnd();
      if (!line.trim()) continue;
      if (line.trim() === 'allowed:') {
        mode = 'allowed';
        continue;
      }
      if (line.trim() === 'forbidden:') {
        mode = 'forbidden';
        continue;
      }
      const m = line.match(/^\s*-\s*"(.+?)"\s*$/);
      if (!m || !mode) continue;
      (mode === 'allowed' ? allowed : forbidden).add(m[1]);
    }

    return { allowed, forbidden };
  } catch (err) {
    console.error(`Failed to read manifest: ${err.message}`);
    process.exit(1);
  }
}

import { readdir } from 'fs/promises';

async function walkJsFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const e of entries) {
    const p = path.join(dir, e.name);
    const rel = path.relative(repoRoot, p).replace(/\\/g, '/');

    if (e.isDirectory()) {
      if (rel.startsWith('vendor/') || rel.startsWith('_generated/') ) continue;
      out.push(...await walkJsFiles(p));
      continue;
    }

    if (e.isFile() && p.endsWith('.js')) {
      out.push(p);
    }
  }

  return out;
}

function stripCommentsAndStrings(src) {
  // Remove strings and comments without parsing (works for ESM).
  // Keeps code structure roughly intact so regex word-boundary checks work.
  let out = '';
  let i = 0;
  const n = src.length;

  const isLineTerminator = (c) => c === '\n' || c === '\r';

  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : '';

    // line comment //
    if (c === '/' && c2 === '/') {
      i += 2;
      while (i < n && !isLineTerminator(src[i])) i++;
      // keep newline if present
      if (i < n) out += src[i];
      i++;
      continue;
    }

    // block comment /* ... */
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n) {
        if (src[i] === '*' && i + 1 < n && src[i + 1] === '/') {
          i += 2;
          break;
        }
        // preserve newlines to keep rough line/col mapping usable
        if (isLineTerminator(src[i])) out += src[i];
        i++;
      }
      continue;
    }

    // strings: ', ", `
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i++; // consume opener
      while (i < n) {
        const ch = src[i];

        // template literal: handle ${...} by skipping until matching }
        if (quote === '`' && ch === '$' && i + 1 < n && src[i + 1] === '{') {
          i += 2; // skip ${
          let depth = 1;
          while (i < n && depth > 0) {
            const t = src[i];
            const t2 = i + 1 < n ? src[i + 1] : '';

            // nested strings inside template expression
            if (t === "'" || t === '"' || t === '`') {
              // recurse by skipping another string
              const q2 = t;
              i++;
              while (i < n) {
                const s = src[i];
                if (s === '\\') { i += 2; continue; }
                if (s === q2) { i++; break; }
                if (isLineTerminator(s)) out += s;
                i++;
              }
              continue;
            }

            // comments inside template expression
            if (t === '/' && t2 === '/') {
              i += 2;
              while (i < n && !isLineTerminator(src[i])) i++;
              if (i < n) out += src[i];
              i++;
              continue;
            }
            if (t === '/' && t2 === '*') {
              i += 2;
              while (i < n) {
                if (src[i] === '*' && i + 1 < n && src[i + 1] === '/') { i += 2; break; }
                if (isLineTerminator(src[i])) out += src[i];
                i++;
              }
              continue;
            }

            if (t === '{') depth++;
            else if (t === '}') depth--;
            if (isLineTerminator(t)) out += t;
            i++;
          }
          continue;
        }

        if (ch === '\\') {
          // escape sequence, skip next char too
          i += 2;
          continue;
        }
        if (ch === quote) {
          i++; // consume closer
          break;
        }
        if (isLineTerminator(ch)) out += ch;
        i++;
      }
      // replace removed string content with a space to avoid token merging
      out += ' ';
      continue;
    }

    out += c;
    i++;
  }

  return out;
}

function scanForbiddenGlobals(rel, layer, jsText) {
  if (layer !== 'core' && layer !== 'renderer') return [];
  if (layer === 'renderer' && rel === 'runtime/renderer/env.js') return [];

  const sanitized = stripCommentsAndStrings(jsText);
  const names = ['window', 'document'];
  const hits = [];
  for (const name of names) {
    const re = new RegExp(`\\b${name}\\b`, 'g');
    let m;
    while ((m = re.exec(sanitized))) {
      const pos = indexToLineCol(sanitized, m.index);
      hits.push({ name, line: pos.line, col: pos.col });
      // only report the first few per file
      if (hits.length >= 5) break;
    }
    if (hits.length >= 5) break;
  }
  return hits;
}

function layerOf(fileAbsPath) {
  const rel = path.relative(repoRoot, fileAbsPath).replace(/\\/g, '/');
  for (const def of layerDefinitions) {
    if (def.match(rel)) return def.name;
  }
  return 'host';
}

function isUrlLikeImport(spec) {
  const s = String(spec || "");
  if (!s) return false;

  // external URL
  if (/^(https?:)?\/\//i.test(s)) return true;

  // "URL path" served by site/viewer host (not a repo file path)
  // - /viewer/... is an app route/asset base
  // - /vendor/... is site vendor asset base
  if (s.startsWith("/viewer/")) return true;
  if (s.startsWith("/vendor/")) return true;

  // data: / blob: etc (unlikely here, but safe)
  if (/^(data|blob):/i.test(s)) return true;

  return false;
}

function resolveImport(fromFile, spec) {
  const s = String(spec || '');
  if (!s) return null;

  // URL-like imports are served by the host (public assets / routes),
  // not resolvable as repo-local modules for layering checks.
  if (isUrlLikeImport(s)) {
    return null;
  }

  let target;
  if (s.startsWith('/')) {
    target = path.join(repoRoot, s.slice(1));
  } else {
    target = path.resolve(path.dirname(fromFile), s);
  }

  if (!path.extname(target)) {
    const withJs = `${target}.js`;
    if (fs.existsSync(withJs)) target = withJs;
  }

  if (!fs.existsSync(target)) {
    logError(`Failed to resolve import: ${spec} from ${fromFile}. Target does not exist.`);
    return null;
  }

  return target;
}

function extractImportSpecifiers(jsText) {
  const specs = [];
  // static: import ... from '...'
  const re1 = /\bimport\s+[\s\S]*?\sfrom\s*['"]([^'"]+)['"]/g;
  // side-effect: import '...'
  const re2 = /\bimport\s*['"]([^'"]+)['"]/g;
  // dynamic: import('...')
  const re3 = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const re of [re1, re2, re3]) {
    let m;
    while ((m = re.exec(jsText))) specs.push(m[1]);
  }
  return specs;
}

function isRelativeVendorImport(spec) {
  const s = String(spec || '');
  if (!s.startsWith('.')) return false;
  // e.g. ../../../vendor/three/... or ./vendor/...
  return s.includes('/vendor/');
}

async function main() {
  const { allowed, forbidden } = readManifestEdges();
  const files = await walkJsFiles(repoRoot);
  const violations = [];
  const globalViolations = [];
  const vendorImportViolations = [];
  const minimalHostViolations = [];

  for (const f of files) {
    const fromLayer = layerOf(f);
    const text = fs.readFileSync(f, 'utf8');
    const specs = extractImportSpecifiers(text);
    const relFrom = path.relative(repoRoot, f).replace(/\\/g, '/');
    const minimalHost =
      minimalHostEntries[path.basename(relFrom)] ?? minimalHostEntries[relFrom];

    for (const spec of specs) {
      if (isRelativeVendorImport(spec)) {
        vendorImportViolations.push({ from: relFrom, spec });
        continue;
      }
      const target = resolveImport(f, spec);
      if (!target) continue;
      const toLayer = layerOf(target);
      if (fromLayer === toLayer) continue;
      const edge = `${fromLayer} -> ${toLayer}`;
      if (forbidden.has(edge) || !allowed.has(edge)) {
        const relTo = path.relative(repoRoot, target).replace(/\\/g, '/');
        violations.push({ edge, from: relFrom, to: relTo, spec });
      }
      if (minimalHost) {
        const relTo = path.relative(repoRoot, target).replace(/\\/g, '/');
        if (!minimalHost.allowedTargets.has(relTo)) {
          minimalHostViolations.push({
            entry: relFrom,
            to: relTo,
            spec,
            reason: minimalHost.reason,
          });
        }
      }
    }

    // global references
    {
      const hits = scanForbiddenGlobals(relFrom, fromLayer, text);
      for (const h of hits) {
        globalViolations.push({ layer: fromLayer, file: relFrom, name: h.name, line: h.line, col: h.col });
      }
    }
  }

  if (
    violations.length > 0 ||
    globalViolations.length > 0 ||
    vendorImportViolations.length > 0 ||
    minimalHostViolations.length > 0
  ) {
    console.error('[forbidden-imports] violations:');
    for (const v of vendorImportViolations) {
      console.error(`- VENDOR_IMPORT_MUST_BE_ABSOLUTE: ${v.from}  (import '${v.spec}')`);
    }
    for (const v of minimalHostViolations) {
      console.error(`- MINIMAL_HOST_FORBIDDEN_IMPORT: ${v.entry}  ->  ${v.to}  (import '${v.spec}')`);
      console.error(`  reason: ${v.reason}`);
    }
    for (const v of violations) {
      console.error(`- ${v.edge}: ${v.from}  ->  ${v.to}  (import '${v.spec}')`);
    }
    for (const v of globalViolations) {
      console.error(`- GLOBAL_REF_FORBIDDEN: ${v.layer}: ${v.file}:${v.line}:${v.col}: ${v.name}`);
    }
    process.exit(1);
  }
  console.log('[forbidden-imports] OK');
}

await main();
