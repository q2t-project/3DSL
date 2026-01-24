// scripts/check-ports-conformance.mjs
// Heuristic token scan:
// - UI layer must not touch hub.* outside ui->hub ports listed in manifest.yaml
// - Additionally, only ui/hubFacade.js may touch hub.core.* (hub.core is privileged facade).
// - In ui/hubFacade.js, hub.core.<subprop> usage is allowlisted to prevent silent surface expansion.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'manifest.yaml');

// Only this UI file is allowed to touch hub.core directly.
const UI_FILES_ALLOWED_TO_TOUCH_HUB_CORE = new Set(['ui/hubFacade.js']);

// Allowlist for hub.core.<subprop> used by UI via hubFacade.
// If you add a new hub.core facade field, update:
// - runtime/modelerHub.js (public surface)
// - manifest.yaml (hub.core.facade surface description)
// - this allowlist (to keep CI honest)
const ALLOWED_HUB_CORE_PROPS = new Set([
  'document',
  'io',
  'quickcheck',
  'selection',
  'lock',
  'frames',
  'transform',
  'commands',
  'focusByIssue',
]);

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
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const rel = path.relative(repoRoot, p).replace(/\\/g, '/');
      if (e.isDirectory()) {
        if (rel.startsWith('vendor/')) continue;
        if (rel.startsWith('_generated/')) continue;
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

function isCommentish(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/');
}

function collectHubCoreAliases(fullText) {
  const aliases = new Set();

  // const core = hub.core; / let core = hub?.core;
  {
    const re = /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*hub(?:\?\.|\.)\s*core\b/g;
    let m;
    while ((m = re.exec(fullText))) aliases.add(m[1]);
  }

  // const { core } = hub; / const { core: c } = hub;
  {
    const re = /\b(?:const|let|var)\s*\{([^}]+)\}\s*=\s*hub\b/g;
    let m;
    while ((m = re.exec(fullText))) {
      const inside = m[1] || '';
      for (const part of inside.split(',')) {
        const s = part.trim();
        if (!s) continue;
        if (s === 'core') { aliases.add('core'); continue; }
        const mm = s.match(/^core\s*:\s*([A-Za-z_$][A-Za-z0-9_$]*)$/);
        if (mm) aliases.add(mm[1]);
      }
    }
  }

  return [...aliases];
}

function main() {
  const allowedHubProps = parseUiHubPorts();
  const files = walkUiFiles();
  const violations = [];

  const reHubTop = /\bhub(?:\?\.|\.)\s*([A-Za-z0-9_]+)/g;
  const reHubCoreDirect = /\bhub(?:\?\.|\.)\s*core(?:\?\.|\.)\s*([A-Za-z0-9_]+)/g;

  for (const f of files) {
    const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
    const text = fs.readFileSync(f, 'utf8');
    const lines = text.split(/\r?\n/);

    const coreAliases = collectHubCoreAliases(text);
    const allowTouchCore = UI_FILES_ALLOWED_TO_TOUCH_HUB_CORE.has(rel);

    if (!allowTouchCore && coreAliases.length > 0) {
      violations.push({
        file: rel,
        line: 1,
        prop: 'core',
        kind: 'UI_TOUCHED_HUB_CORE_OUTSIDE_HUBFACADE',
        text: `hub.core aliased as: ${coreAliases.join(', ')}`,
      });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentish(line)) continue;

      // 1) hub.<topProp>
      if (line.includes('hub.') || line.includes('hub?.')) {
        let m;
        while ((m = reHubTop.exec(line))) {
          const prop = m[1];
          if (!allowedHubProps.has(prop)) {
            violations.push({ file: rel, line: i + 1, prop, kind: 'UI_USED_NON_PORT_HUB_PROP', text: line.trim() });
          }
        }
        reHubTop.lastIndex = 0;

        // 2) hub.core.<subProp> (direct usage)
        while ((m = reHubCoreDirect.exec(line))) {
          const sub = m[1];
          if (!allowTouchCore) {
            violations.push({ file: rel, line: i + 1, prop: `core.${sub}`, kind: 'UI_TOUCHED_HUB_CORE_OUTSIDE_HUBFACADE', text: line.trim() });
          } else if (!ALLOWED_HUB_CORE_PROPS.has(sub)) {
            violations.push({ file: rel, line: i + 1, prop: `core.${sub}`, kind: 'UI_USED_NON_PORT_HUB_CORE_PROP', text: line.trim() });
          }
        }
        reHubCoreDirect.lastIndex = 0;
      }

      // 3) alias.<subProp> where alias was assigned from hub.core
      if (coreAliases.length > 0) {
        for (const alias of coreAliases) {
          const reAlias = new RegExp(`\\b${alias}(?:\\?\\.|\\.)\\s*([A-Za-z0-9_]+)`, 'g');
          let m;
          while ((m = reAlias.exec(line))) {
            const sub = m[1];
            if (!allowTouchCore) {
              violations.push({ file: rel, line: i + 1, prop: `core.${sub}`, kind: 'UI_TOUCHED_HUB_CORE_OUTSIDE_HUBFACADE', text: line.trim() });
            } else if (!ALLOWED_HUB_CORE_PROPS.has(sub)) {
              violations.push({ file: rel, line: i + 1, prop: `core.${sub}`, kind: 'UI_USED_NON_PORT_HUB_CORE_PROP', text: line.trim() });
            }
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('[ports-conformance] violations:');
    for (const v of violations) {
      console.error(`- ${v.kind}: ${v.file}:${v.line}: ${v.prop}: ${v.text}`);
    }
    process.exit(1);
  }

  console.log('[ports-conformance] OK');
}

main();
