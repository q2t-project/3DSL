import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const production = 'https://3dsl.jp';
const buildNode = (await readFile(new URL('../../.node-version', import.meta.url), 'utf8')).trim();
const workPath = '/preview-reconstruction/models/knowledge_questions.3dsl-work.json';
const runtimePath = '/preview-reconstruction/viewer/runtime/viewerHub.js';
const maxBytes = 4 * 1024 * 1024;
const fail = message => { throw new Error(message); };
const requireValue = (condition, message) => { if (!condition) fail(message); };
const attribute = (tag, name) => tag.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(["\x27])(.*?)\\1', 'i'))?.[2];
const hasId = (html, id) => new RegExp('\\bid\\s*=\\s*(["\x27])' + id + '\\1').test(html);
const directives = value => (value || '').toLowerCase().split(',').map(x => x.trim());
const isModel = value => value && typeof value.document_meta === 'object'
  && Array.isArray(value.points) && value.points.length > 0 && Array.isArray(value.lines);
function canonical(html, pathname) {
  const link = [...html.matchAll(/<link\b[^>]*>/gi)].map(x => x[0])
    .find(tag => (attribute(tag, 'rel') || '').split(/\s+/).includes('canonical'));
  requireValue(link && attribute(link, 'href') === production + pathname, 'canonical URL differs');
}
function htmlMarker(id) {
  return ({ text }) => requireValue(hasId(text, id), 'expected page control is missing');
}
const resources = [
  { name: 'deployment', path: '/__deploy_probe.txt', type: /^(?:text\/plain|application\/json)\b/i,
    inspect({ text }, expectedSha) {
      const probe = JSON.parse(text);
      requireValue(/^[a-f0-9]{7}$/.test(probe.sha), 'invalid deployment probe');
      requireValue(probe.node === buildNode, 'build Node differs from .node-version');
      if (expectedSha) requireValue(probe.sha === expectedSha.slice(0, 7), 'deployed commit differs');
      return { revision: probe.sha, node: probe.node };
    } },
  { name: 'home', path: '/', type: /^text\/html\b/i, inspect({ text }) { canonical(text, '/'); } },
  { name: 'library', path: '/library/', type: /^text\/html\b/i,
    inspect({ text }) { canonical(text, '/library/'); requireValue(hasId(text, 'cards') && /\bdata-library-id\s*=/.test(text), 'Library cards are missing'); } },
  { name: 'reading guide', path: '/docs/works/knowledge-questions/', type: /^text\/html\b/i,
    inspect({ text }) { canonical(text, '/docs/works/knowledge-questions/'); requireValue(text.includes(workPath), 'representative work link is missing'); } },
  { name: 'representative work', path: workPath, type: /^application\/(?:[\w.+-]*\+)?json\b/i,
    inspect({ text }) { const work = JSON.parse(text); requireValue(work.format === '3dsl-modeler-work/0.1' && isModel(work.scene), 'representative work has no readable scene'); return { points: work.scene.points.length, lines: work.scene.lines.length }; } },
  { name: 'Library model', path: '/_data/library/26010501/model.3dss.json', type: /^application\/(?:[\w.+-]*\+)?json\b/i,
    inspect({ text }) { const model = JSON.parse(text); requireValue(isModel(model), 'Library JSON has no readable model'); return { points: model.points.length, lines: model.lines.length }; } },
  { name: 'Viewer host', path: '/app/viewer/', type: /^text\/html\b/i, inspect: htmlMarker('app-viewer-iframe') },
  { name: 'Viewer reader', path: '/preview-reconstruction/contract_viewer/reader', type: /^text\/html\b/i, inspect: htmlMarker('reading-stage') },
  { name: 'Modeler host', path: '/app/modeler/', type: /^text\/html\b/i, inspect: htmlMarker('app-modeler-iframe') },
  { name: 'Modeler entry', path: '/modeler_app/', type: /^text\/html\b/i,
    inspect({ text }) { requireValue(/<title>[^<]*Modeler/i.test(text), 'Modeler document is missing'); } },
  { name: 'contact page', path: '/contact/', type: /^text\/html\b/i,
    inspect({ text }) {
      const form = [...text.matchAll(/<form\b[^>]*>/gi)].map(x => x[0]).find(tag => attribute(tag, 'id') === 'contact-form');
      requireValue(form && attribute(form, 'method')?.toUpperCase() === 'POST', 'contact form is missing');
      const action = new URL(attribute(form, 'action') || '', production);
      requireValue(action.origin === 'https://formspree.io' && /^\/f\/[a-z0-9]+$/i.test(action.pathname) && !/\/x+$/i.test(action.pathname), 'contact destination differs');
    } },
  { name: 'Viewer runtime', path: runtimePath, type: /^(?:text|application)\/(?:java|ecma)script\b/i, executable: true },
  { name: 'validator', path: '/vendor/ajv/dist/ajv.js', type: /^(?:text|application)\/(?:java|ecma)script\b/i, executable: true },
  { name: 'Modeler CSS', path: '/modeler_tuning.css', type: /^text\/css\b/i, executable: true },
  { name: 'retired guide', path: '/docs/works/structure-classification/', status: 410, type: /^text\/html\b/i,
    inspect({ headers }) {
      requireValue(directives(headers.get('cache-control')).includes('no-store'), 'retired response can be stored');
      requireValue(/\bnoindex\b/i.test(headers.get('x-robots-tag') || ''), 'retired response has no noindex');
    } },
  { name: 'missing page', path: '/__site_health_missing__', status: 404, type: /^text\/html\b/i },
];

export async function checkDeployed({ base = production, expectedSha = '', timeoutMs = 15000 } = {}) {
  const origin = new URL(base);
  requireValue(['https:', 'http:'].includes(origin.protocol) && !origin.username && !origin.password
    && !origin.search && !origin.hash && origin.pathname === '/', 'base must be an HTTP(S) origin without credentials, path or query');
  requireValue(!expectedSha || /^(?:[a-f0-9]{7}|[a-f0-9]{40})$/i.test(expectedSha), 'expected SHA must contain 7 or 40 hexadecimal characters');
  const checks = [];
  async function probe(resource) {
    const start = performance.now();
    const record = { name: resource.name, path: resource.path, ok: false };
    let response;
    try {
      response = await fetch(new URL(resource.path, origin), {
        redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': '3DSL-site-health', 'Accept-Encoding': 'identity' },
      });
      record.status = response.status;
      record.cacheControl = response.headers.get('cache-control');
      record.etag = response.headers.get('etag');
      requireValue(response.status === (resource.status || 200), 'unexpected HTTP status ' + response.status);
      requireValue(resource.type.test(response.headers.get('content-type') || ''), 'unexpected Content-Type');
      const chunks = []; let size = 0;
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > maxBytes) fail('response exceeds 4 MiB health-check limit');
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks); const text = body.toString('utf8');
      requireValue(body.length > 0, 'empty response');
      record.bytes = size;
      record.sha256 = createHash('sha256').update(body).digest('hex');
      if (resource.executable) {
        requireValue(directives(record.cacheControl).includes('no-cache'), 'executable response does not require revalidation');
        requireValue(record.etag && !/^\s*</.test(text), 'executable content or ETag is missing');
      }
      Object.assign(record, resource.inspect?.({ text, headers: response.headers }, expectedSha.toLowerCase()));
      record.ok = true;
    } catch (error) {
      record.error = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'request or body read timed out'
        : error instanceof SyntaxError ? 'invalid JSON response' : error.message;
    } finally {
      if (response?.body && !response.bodyUsed) await response.body.cancel().catch(() => {});
    }
    record.durationMs = Math.round(performance.now() - start);
    return record;
  }
  // Limit request pressure and keep output in the same order on every run.
  for (let start = 0; start < resources.length; start += 4) {
    checks.push(...await Promise.all(resources.slice(start, start + 4).map(probe)));
  }
  return { checkedAt: new Date().toISOString(), origin: origin.origin, expectedSha: expectedSha || null,
    ok: checks.every(check => check.ok), checks,
    scope: 'HTTP delivery, representative JSON shape, page markers and selected JS/CSS policy. No WebGL execution, file save, Formspree submission, DNS/TLS expiry audit or recurring notification.' };
}

async function main() {
  const options = {};
  let output;
  const args = process.argv.slice(2);
  while (args.length) {
    const key = args.shift(); const value = args.shift();
    requireValue(['--base', '--expect-sha', '--output'].includes(key) && value !== undefined, 'usage: check-deployed.mjs [--base ORIGIN] [--expect-sha SHA] [--output FILE]');
    if (key === '--base') options.base = value;
    if (key === '--expect-sha') options.expectedSha = value;
    if (key === '--output') output = value;
  }
  const report = await checkDeployed(options);
  if (output) { await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); }
  for (const check of report.checks) console.log((check.ok ? 'PASS ' : 'FAIL ') + check.name + ' ' + check.path + (check.ok ? '' : ': ' + check.error));
  console.log(`[site-health] ${report.checks.filter(check => check.ok).length}/${report.checks.length}; deployed=${report.checks[0].revision || 'unknown'}; HTTP scope only`);
  if (!report.ok) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error('[site-health] ' + error.message); process.exitCode = 1; });
}
