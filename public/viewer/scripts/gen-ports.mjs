// scripts/gen-ports.mjs
// Generate /viewer/_generated/PORTS.md from /viewer/manifest.yaml
// - no external deps (very small YAML subset parser)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.yaml');
const outPath = path.join(repoRoot, '_generated', 'PORTS.md');

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');

function stripOuterQuotes(s) {
  const t = String(s ?? '').trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function isSectionHeader(line) {
  // top-level: "name:" (no indent)
  return /^[A-Za-z0-9_]+:\s*$/.test(line);
}

function parseKeyValue(line) {
  const m = line.match(/^\s*([A-Za-z0-9_]+):\s*(.*?)\s*$/);
  if (!m) return null;
  const key = m[1];
  const raw = m[2];
  // drop trailing inline comment if it looks like "  # ..."
  const noComment = raw.replace(/\s+#.*$/, '');
  return { key, value: stripOuterQuotes(noComment) };
}

function parseListOfObjects(lines, startIndex, baseIndent) {
  // Parses blocks like:
  //   - id: "..."
  //     caller: "..."
  //     ...
  const items = [];
  let i = startIndex;
  let current = null;

  const itemRe = new RegExp(`^\\s{${baseIndent}}-\\s+(.+)$`);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith('#')) {
      i++;
      continue;
    }

    // leave this list scope if indentation drops
    const indent = (line.match(/^\s*/)?.[0]?.length) ?? 0;
    if (indent < baseIndent) break;
    // break if next top-level section starts (defensive)
    if ((baseIndent === 0 || baseIndent === 2) && isSectionHeader(line)) break;

    const mItem = line.match(itemRe);
    if (mItem) {
      // new item
      if (current) items.push(current);
      current = {};
      // parse first kv after "- "
      const first = parseKeyValue(mItem[1]);
      if (first) current[first.key] = first.value;
      i++;
      continue;
    }

    // subsequent kv lines (more indented)
    const kv = parseKeyValue(line);
    if (kv && current) {
      current[kv.key] = kv.value;
    }
    i++;
  }
  if (current) items.push(current);
  return { items, nextIndex: i };
}

function extractPortsAndDeprecatedCompat(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const result = { ports: [], compat: [], meta: {} };

  // quick meta
  for (const line of lines) {
    const kv = parseKeyValue(line);
    if (!kv) continue;
    if (kv.key === 'manifest_schema_version') result.meta.schema = kv.value;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === 'ports:') {
      const parsed = parseListOfObjects(lines, i + 1, 2);
      result.ports = parsed.items;
      i = parsed.nextIndex;
      continue;
    }
    if (line.trim() === 'deprecated:') {
      // look for "compat:" under deprecated
      i++;
      while (i < lines.length) {
        const l2 = lines[i];
        if (isSectionHeader(l2)) break;
        if (l2.trim() === 'compat:') {
          const parsed = parseListOfObjects(lines, i + 1, 4);
          result.compat = parsed.items;
          i = parsed.nextIndex;
          break;
        }
        i++;
      }
      continue;
    }
    i++;
  }
  return result;
}

function groupPorts(ports) {
  const groups = new Map();
  for (const p of ports) {
    const caller = p.caller || '?';
    const callee = p.callee || '?';
    const k = `${caller} -> ${callee}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  // stable ordering
  const keys = [...groups.keys()].sort();
  const ordered = [];
  for (const k of keys) {
    const arr = groups.get(k);
    arr.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
    ordered.push([k, arr]);
  }
  return ordered;
}

function renderMarkdown({ ports, compat, meta }) {
  const lines = [];
  lines.push('# Viewer Ports (Generated)');
  lines.push('');
  lines.push(`- source: /viewer/manifest.yaml`);
  if (meta?.schema) lines.push(`- manifest_schema_version: ${meta.schema}`);
  lines.push(`- generator: node scripts/gen-ports.mjs`);
  lines.push('');
  lines.push('## Ports');
  lines.push('');

  const grouped = groupPorts(ports);
  if (grouped.length === 0) {
    lines.push('(no ports)');
  }
  for (const [gk, arr] of grouped) {
    lines.push(`### ${gk}`);
    lines.push('');
    lines.push('| id | surface | stability |');
    lines.push('|---|---|---|');
    for (const p of arr) {
      const id = p.id || '';
      const surface = (p.surface || '').replace(/\|/g, '\\|');
      const stability = p.stability || '';
      lines.push(`| ${id} | ${surface} | ${stability} |`);
    }
    lines.push('');
  }

  lines.push('## Deprecated / Compat (Not Ports)');
  lines.push('');
  if (!compat || compat.length === 0) {
    lines.push('(none)');
    lines.push('');
  } else {
    lines.push('| id | path | scope | until | exit_criteria |');
    lines.push('|---|---|---|---|---|');
    for (const c of compat) {
      const id = c.id || '';
      const p = (c.path || '').replace(/\|/g, '\\|');
      const scope = c.scope || '';
      const until = c.until || '';
      const exit = (c.exit_criteria || '').replace(/\|/g, '\\|');
      lines.push(`| ${id} | ${p} | ${scope} | ${until} | ${exit} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const yamlText = fs.readFileSync(manifestPath, 'utf8');
  const { ports, compat, meta } = extractPortsAndDeprecatedCompat(yamlText);
  const md = renderMarkdown({ ports, compat, meta });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (CHECK) {
    const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    if (existing !== md) {
      console.error('[gen-ports] OUT OF DATE:', outPath);
      console.error('Run: node scripts/gen-ports.mjs');
      process.exit(1);
    }
    return;
  }

  fs.writeFileSync(outPath, md, 'utf8');
  console.log('[gen-ports] wrote', path.relative(repoRoot, outPath));
}

main();
