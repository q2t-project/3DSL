// scripts/check-ports-conformance.mjs
// Very small static check:
// - UI layer must not touch hub.* outside ui->hub ports listed in manifest.yaml
// - This is a heuristic (token scan), but catches "new hub API creep" early.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.yaml');

function parseUiHubPorts() {
  const text = fs.readFileSync(manifestPath, 'utf8');
  const lines = text.split(/\r?\n/);
  let inPorts = false;
  let current = null;
  const ports = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '');
    if (line.trim() === 'ports:') {
      inPorts = true;
      continue;
    }
    if (!inPorts) continue;
    if (/^[A-Za-z0-9_]+:\s*$/.test(line)) break; // next top-level section
    const mItem = line.match(/^\s{2}-\s+id:\s*(.+)\s*$/);
    if (mItem) {
      if (current) ports.push(current);
      current = { id: mItem[1].trim().replace(/^['"]|['"]$/g, '') };
      continue;
    }
    const mKv = line.match(/^\s{4}([A-Za-z0-9_]+):\s*(.+?)\s*$/);
    if (mKv && current) {
      const k = mKv[1];
      const v = mKv[2].trim().replace(/^['"]|['"]$/g, '');
      current[k] = v;
    }
  }
  if (current) ports.push(current);

  const allowedProps = new Set();
  for (const p of ports) {
    if (p.caller !== 'ui' || p.callee !== 'hub') continue;
    const id = String(p.id || '');
    const m = id.match(/^hub\.([A-Za-z0-9_]+)(\.|$)/);
    if (m) allowedProps.add(m[1]);
  }
  return allowedProps;
}

function walkUiFiles() {
  const out = [];
  function rec(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const rel = path.relative(repoRoot, p).replace(/\\/g, '/');
      if (e.isDirectory()) {
        if (rel.startsWith('vendor/')) continue;
        if (rel.startsWith('_generated/')) continue;
        if (rel.startsWith('spec/_legacy/')) continue;
        rec(p);
        continue;
      }
      if (e.isFile() && p.endsWith('.js')) {
        if (rel.startsWith('ui/')) out.push(p);
      }
    }
  }
  rec(repoRoot);
  return out;
}

function main() {
  const allowed = parseUiHubPorts();
  const files = walkUiFiles();
  const violations = [];

  const re = /\bhub\.([A-Za-z0-9_]+)/g;

  for (const f of files) {
    const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
    const text = fs.readFileSync(f, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/')) continue;
      if (!line.includes('hub.')) continue;
      let m;
      while ((m = re.exec(line))) {
        const prop = m[1];
        if (!allowed.has(prop)) {
          violations.push({ file: rel, line: i + 1, prop, text: line.trim() });
        }
      }
      re.lastIndex = 0;
    }
  }

  // Host must not call hub.* at all (host -> hub is forbidden).
  {
    const hostFiles = ['viewerHost.js', 'viewerDevHarness.js', 'viewerHostBoot.js'];
    const reHost = /\bhub\.([A-Za-z0-9_]+)/g;
    for (const rel of hostFiles) {
      const f = path.join(repoRoot, rel);
      if (!fs.existsSync(f)) continue;
      const text = fs.readFileSync(f, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/')) continue;
        if (!line.includes('hub.')) continue;
        let m;
        while ((m = reHost.exec(line))) {
          violations.push({ file: rel, line: i + 1, prop: m[1], text: line.trim(), kind: 'HOST_TOUCHED_HUB' });
        }
        reHost.lastIndex = 0;
      }
    }
  }

  if (violations.length > 0) {
    console.error('[ports-conformance] violations:');
    for (const v of violations) {
      const kind = v.kind || 'UI_USED_NON_PORT_HUB_PROP';
      console.error(`- ${kind}: ${v.file}:${v.line}: hub.${v.prop}  :: ${v.text}`);
    }
    console.error('[ports-conformance] Allowed hub.* props are:', [...allowed].sort().join(', '));
    process.exit(1);
  }

  console.log('[ports-conformance] OK');
}

main();
