// scripts/check-single-writer.mjs
// Forbid UI layer from directly mutating hub.core controllers / canonical state.
// Heuristic scan (line-based). Intended to be strict and noisy rather than permissive.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(repoRoot, p).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (rel.startsWith('vendor/')) continue;
      if (rel.startsWith('_generated/')) continue;
      out.push(...walk(p));
      continue;
    }
    if (e.isFile() && p.endsWith('.js')) out.push(p);
  }
  return out;
}

function isUiLayer(fileAbsPath) {
  const rel = path.relative(repoRoot, fileAbsPath).replace(/\\/g, '/');
  return rel.startsWith('ui/');
}

const WRITE_PATTERNS = [
  /\bhub\.core\b\s*=\s*[^=]/,                       // hub.core = ...
  /\bhub\.core\.[A-Za-z0-9_$\.]+\s*=/,            // hub.core.xxx = ...
  /\bhub\.core\s*\[[^\]]+\]\s*=/,               // hub.core[...] = ...
  /\bObject\.assign\(\s*hub\.core\b/,             // Object.assign(hub.core, ...)
  /\bObject\.assign\(\s*hub\.core\.[A-Za-z0-9_$\.]+\b/, // Object.assign(hub.core.xxx, ...)
];

function main() {
  const files = walk(repoRoot).filter(isUiLayer);
  const violations = [];

  for (const f of files) {
    const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      if (line.trim().startsWith('//')) continue;
      for (const re of WRITE_PATTERNS) {
        if (re.test(line)) {
          violations.push({ file: rel, line: i + 1, text: line.trim() });
          break;
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('[single-writer] violations:');
    for (const v of violations) {
      console.error(`- NO_HUB_CORE_MUTATION_IN_UI_LAYER: ${v.file}:${v.line}: ${v.text}`);
    }
    process.exit(1);
  }

  console.log('[single-writer] OK');
}

main();
