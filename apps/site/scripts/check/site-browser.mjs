import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromiumPort } from './chromium-port.mjs';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };

export async function serveBuild(fixtures = new Map()) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      let data = fixtures.get(pathname);
      let filename = pathname;
      if (!data) {
        filename = path.resolve(dist, '.' + pathname);
        if (!filename.startsWith(dist) && filename !== path.resolve(dist)) { res.writeHead(403).end(); return; }
        if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
        data = await readFile(filename);
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Content-Length': data.length });
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { origin: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(resolve => server.close(resolve)) };
}

export async function waitFor(read, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await read();
    if (result) return result;
    await delay(50);
  }
  throw new Error('Timed out waiting for ' + label);
}

export async function withBrowser(run) {
  const executable = [process.env.CHROME_BIN, 'google-chrome', 'chromium', 'chromium-browser']
    .filter(Boolean).find(bin => spawnSync(bin, ['--version']).status === 0);
  assert(executable, 'Set CHROME_BIN to a working Chromium binary');
  const profile = await mkdtemp(path.join(os.tmpdir(), '3dsl-browser-'));
  const downloads = path.join(profile, 'downloads');
  await mkdir(downloads);
  const proc = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
    '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws;
  try {
    const port = await chromiumPort(proc, profile);
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await once(ws, 'open');
    const pending = new Map();
    const events = new EventTarget();
    let sequence = 0;
    ws.addEventListener('message', ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.method) events.dispatchEvent(new CustomEvent(msg.method, { detail: msg.params }));
      const item = pending.get(msg.id);
      if (!item) return;
      clearTimeout(item.timer);
      pending.delete(msg.id);
      if (msg.error) item.reject(new Error(item.method + ': ' + msg.error.message));
      else item.resolve(msg.result);
    });
    const cmd = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 45000);
      pending.set(id, { method, resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      assert(!result.exceptionDetails, result.exceptionDetails?.exception?.description ?? result.exceptionDetails?.text);
      return result.result.value;
    };
    await cmd('Page.enable');
    await cmd('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: downloads, eventsEnabled: true });
    return await run({ cmd, evaluate, events, downloads, pid: proc.pid });
  } finally {
    ws?.close();
    if (proc.exitCode === null && !proc.signalCode) {
      const closed = once(proc, 'close');
      proc.kill();
      await closed;
    }
    await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
  }
}
