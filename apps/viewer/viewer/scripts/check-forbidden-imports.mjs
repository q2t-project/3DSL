// scripts/check-forbidden-imports.mjs
// Enforce dependency_rules + minimal global reference rules.
// - Reads /viewer/manifest.yaml
// - Scans JS modules under /viewer (excluding vendor/spec/_legacy/_generated)
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

function readManifestEdges() {
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
}

function walkJsFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    const rel = path.relative(repoRoot, p).replace(/\\/g, '/');

    if (e.isDirectory()) {
      if (rel.startsWith('vendor/')) continue;
      if (rel.startsWith('_generated/')) continue;
      if (rel.startsWith('spec/_legacy/')) continue;
      out.push(...walkJsFiles(p));
      continue;
    }
    if (e.isFile() && p.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

function stripCommentsAndStrings(src) {
  // good-enough sanitizer for token scanning (not a full JS lexer)
  let out = '';
  let i = 0;
  let state = 'code';
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = (i + 1 < src.length) ? src[i + 1] : '';

    if (state === 'code') {
      if (c === '/' && n === '/') {
        out += '  ';
        i += 2;
        state = 'linecomment';
        continue;
      }
      if (c === '/' && n === '*') {
        out += '  ';
        i += 2;
        state = 'blockcomment';
        continue;
      }
      if (c === '\'' || c === '"') {
        quote = c;
        out += ' ';
        i += 1;
        state = 'string';
        continue;
      }
      if (c === '`') {
        out += ' ';
        i += 1;
        state = 'template';
        continue;
      }
      out += c;
      i += 1;
      continue;
    }

    if (state === 'linecomment') {
      if (c === '\n') {
        out += '\n';
        i += 1;
        state = 'code';
      } else {
        out += ' ';
        i += 1;
      }
      continue;
    }

    if (state === 'blockcomment') {
      if (c === '*' && n === '/') {
        out += '  ';
        i += 2;
        state = 'code';
      } else if (c === '\n') {
        out += '\n';
        i += 1;
      } else {
        out += ' ';
        i += 1;
      }
      continue;
    }

    if (state === 'string') {
      if (c === '\\') {
        // escape + next char
        out += '  ';
        i += 2;
        continue;
      }
      if (c === quote) {
        out += ' ';
        i += 1;
        state = 'code';
        continue;
      }
      if (c === '\n') {
        out += '\n';
        i += 1;
        state = 'code';
        continue;
      }
      out += ' ';
      i += 1;
      continue;
    }

    if (state === 'template') {
      if (c === '\\') {
        out += '  ';
        i += 2;
        continue;
      }
      if (c === '`') {
        out += ' ';
        i += 1;
        state = 'code';
        continue;
      }
      // NOTE: we treat `${...}` as part of string for this checker.
      // This may miss tokens inside template expressions, but keeps the check
      // deterministic and low-noise.
      if (c === '\n') {
        out += '\n';
        i += 1;
      } else {
        out += ' ';
        i += 1;
      }
      continue;
    }
  }
  return out;
}

function indexToLineCol(text, idx) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < idx && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
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
  if (rel.startsWith('runtime/core/')) return 'core';
  if (rel.startsWith('runtime/renderer/')) return 'renderer';
  if (rel === 'runtime/viewerHub.js') return 'hub';
  if (rel === 'runtime/bootstrapViewer.js') return 'entry';
  if (rel.startsWith('ui/')) return 'ui';

  // NOTE: viewerHost/viewerDevHarness are “host app shells” (composition root)
  if (rel === 'viewerHost.js' || rel === 'viewerDevHarness.js') return 'host';
  if (rel === 'viewerHostBoot.js') return 'host';
  if (rel.endsWith('.html') || rel.endsWith('.css')) return 'host';

  // default: host
  return 'host';
}

function resolveImport(fromFile, spec) {
  const s = String(spec || '');
  if (!s) return null;

  // ignore bare specifiers (npm/node)
  if (!s.startsWith('.') && !s.startsWith('/')) return null;

  // ignore vendor imports (treated as external)
  if (s.includes('/vendor/')) return null;

  let target;
  if (s.startsWith('/viewer/')) {
    target = path.join(repoRoot, s.slice('/viewer/'.length));
  } else if (s.startsWith('/')) {
    // treat absolute as repo-root relative
    target = path.join(repoRoot, s.slice(1));
  } else {
    target = path.resolve(path.dirname(fromFile), s);
  }

  // add extension if missing
  if (!path.extname(target)) {
    const withJs = `${target}.js`;
    if (fs.existsSync(withJs)) target = withJs;
  }
  if (!fs.existsSync(target)) return null;

  // ignore generated/spec/vendor
  const rel = path.relative(repoRoot, target).replace(/\\/g, '/');
  if (rel.startsWith('vendor/')) return null;
  if (rel.startsWith('_generated/')) return null;
  if (rel.startsWith('spec/_legacy/')) return null;

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

function main() {
  const { allowed, forbidden } = readManifestEdges();
  const files = walkJsFiles(repoRoot);
  const violations = [];
  const globalViolations = [];

  for (const f of files) {
    const fromLayer = layerOf(f);
    const text = fs.readFileSync(f, 'utf8');
    const specs = extractImportSpecifiers(text);
    for (const spec of specs) {
      const target = resolveImport(f, spec);
      if (!target) continue;
      const toLayer = layerOf(target);
      if (fromLayer === toLayer) continue;
      const edge = `${fromLayer} -> ${toLayer}`;
      if (forbidden.has(edge) || !allowed.has(edge)) {
        const relFrom = path.relative(repoRoot, f).replace(/\\/g, '/');
        const relTo = path.relative(repoRoot, target).replace(/\\/g, '/');
        violations.push({ edge, from: relFrom, to: relTo, spec });
      }
    }

    // global references
    {
      const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
      const hits = scanForbiddenGlobals(rel, fromLayer, text);
      for (const h of hits) {
        globalViolations.push({ layer: fromLayer, file: rel, name: h.name, line: h.line, col: h.col });
      }
    }
  }

  if (violations.length > 0 || globalViolations.length > 0) {
    console.error('[forbidden-imports] violations:');
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

main();
