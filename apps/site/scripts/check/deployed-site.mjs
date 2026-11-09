import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDeployed } from '../ops/check-deployed.mjs';

const site = fileURLToPath(new URL('../..', import.meta.url));
const dist = path.join(site, 'dist');
const node = (await readFile(path.join(site, '.node-version'), 'utf8')).trim();
const runtime = '/preview-reconstruction/viewer/runtime/viewerHub.js';
const model = '/preview-reconstruction/models/knowledge_questions.3dsl-work.json';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain' };
let mode = 'healthy'; let foreignRequests = 0;
const methods = [];
const foreign = http.createServer((req, res) => { foreignRequests++; res.end('must not be fetched'); });
await new Promise(resolve => foreign.listen(0, '127.0.0.1', resolve));
const foreignOrigin = 'http://127.0.0.1:' + foreign.address().port;
const server = http.createServer(async (req, res) => {
  methods.push(req.method);
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    let status = 200; let body; let type;
    if (pathname === '/__deploy_probe.txt') {
      body = JSON.stringify({ sha: 'aaaaaaa', node }); type = 'text/plain';
    } else if (pathname === '/docs/works/structure-classification/') {
      status = 410; body = '<!doctype html><title>公開終了</title>'; type = 'text/html';
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex');
    } else {
      const file = pathname === '/preview-reconstruction/contract_viewer/reader' ? pathname + '.html'
        : pathname.endsWith('/') ? pathname + 'index.html' : pathname;
      try { body = await readFile(path.join(dist, file)); type = mime[path.extname(file)]; }
      catch { status = 404; body = await readFile(path.join(dist, '404.html')); type = 'text/html'; }
    }
    if (pathname === model) {
      if (mode === 'lost model') { status = 404; type = 'text/html'; body = '<title>Not found</title>'; }
      if (mode === 'soft 404') { type = 'text/html'; body = '<title>3DSL</title>'; }
      if (mode === 'empty work') body = '{}';
      if (mode === 'broken JSON') body = '{';
      if (mode === 'oversize') body = 'x'.repeat(4 * 1024 * 1024 + 1);
    }
    if (pathname === runtime) {
      if (mode === 'runtime MIME') { type = 'text/html'; body = '<title>3DSL</title>'; }
      if (mode === 'redirect') { status = 302; res.setHeader('Location', foreignOrigin + '/login?token=do-not-log'); }
    }
    if (/\.(?:js|css)$/.test(pathname)) res.setHeader('Cache-Control', mode === 'stale runtime' && pathname === runtime ? 'public, max-age=14400' : 'no-cache');
    res.setHeader('Content-Type', type || 'application/octet-stream');
    res.setHeader('ETag', '"' + createHash('sha256').update(body).digest('hex') + '"');
    res.writeHead(status);
    if (mode === 'slow body' && pathname === '/modeler_tuning.css') { res.write('/* body never completes'); return; }
    res.end(body);
  } catch { res.writeHead(500); res.end('fixture error'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const temporary = await mkdtemp(path.join(os.tmpdir(), '3dsl-health-'));
try {
  const healthy = await checkDeployed({ base, expectedSha: 'aaaaaaa' });
  assert.equal(healthy.checks.length, 16);
  assert.equal(healthy.ok, true, JSON.stringify(healthy.checks.filter(check => !check.ok)));
  assert(healthy.checks.find(check => check.name === 'representative work').points > 0);
  for (const [scenario, name] of [
    ['lost model', 'representative work'], ['soft 404', 'representative work'], ['empty work', 'representative work'],
    ['broken JSON', 'representative work'], ['oversize', 'representative work'], ['runtime MIME', 'Viewer runtime'],
    ['stale runtime', 'Viewer runtime'], ['redirect', 'Viewer runtime'],
  ]) {
    mode = scenario;
    const report = await checkDeployed({ base, expectedSha: 'aaaaaaa' });
    assert.equal(report.ok, false, scenario);
    assert.deepEqual(report.checks.filter(check => !check.ok).map(check => check.name), [name], scenario);
    assert.equal(report.checks.find(check => check.name === 'home').ok, true, scenario);
    assert(!JSON.stringify(report).includes('do-not-log'));
  }
  assert.equal(foreignRequests, 0, 'a redirect must not reach a foreign site');
  mode = 'healthy';
  const wrongRevision = await checkDeployed({ base, expectedSha: 'bbbbbbb' });
  assert.deepEqual(wrongRevision.checks.filter(check => !check.ok).map(check => check.name), ['deployment']);
  mode = 'slow body';
  const stalled = await checkDeployed({ base, expectedSha: 'aaaaaaa', timeoutMs: 250 });
  assert.equal(stalled.checks.find(check => check.name === 'Modeler CSS').error, 'request or body read timed out');
  mode = 'lost model';
  const output = path.join(temporary, 'report.json');
  const child = spawn(process.execPath, ['scripts/ops/check-deployed.mjs', '--base', base, '--expect-sha', 'aaaaaaa', '--output', output], { cwd: site, stdio: 'ignore' });
  assert.equal(await new Promise(resolve => child.on('exit', resolve)), 1, 'CLI failure must be observable');
  assert.equal(JSON.parse(await readFile(output, 'utf8')).ok, false);
  await assert.rejects(checkDeployed({ base: 'https://user:secret@example.invalid' }), /without credentials/);
  await assert.rejects(checkDeployed({ base, expectedSha: 'not-a-commit' }), /expected SHA/);
  assert(methods.every(method => method === 'GET'));
  console.log('[check:deployed-site] PASS generated pages, lost/invalid/oversize model, stale runtime, MIME, rejected redirect, commit mismatch, body timeout and CLI exit/report. Loopback only; no external form submission or monitoring setup.');
} finally {
  server.closeAllConnections(); foreign.closeAllConnections();
  await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => foreign.close(resolve))]);
  await rm(temporary, { recursive: true, force: true });
}
