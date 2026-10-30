// HG-V1 display specimen, served from generated assets and exercised by CDP.
// This checks browser behavior, not Android hardware or human interpretation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.resolve(site, '../..');
const webRoot = process.env.VISUAL_GRAMMAR_WEB_ROOT || path.join(site, 'dist');
const route = '/preview-reconstruction/legend_lab/';
const source = path.join(repo, 'apps/reconstruction/ssot/legend_lab');
const sourceText = await fs.readFile(path.join(source, 'model.3dss.json'), 'utf8');
const model = JSON.parse(sourceText);
const shipped = await fs.readFile(path.join(webRoot, route, 'model.3dss.json'), 'utf8');
assert.equal(shipped, sourceText, 'served specimen is the authored source');
const pointIds = new Set(model.points.map(point => point.meta.uuid));
const allIds = [...pointIds, ...model.lines.map(line => line.meta.uuid)];
assert.equal(new Set(allIds).size, model.points.length + model.lines.length, 'unique specimen element IDs');
for (const line of model.lines) for (const side of ['end_a', 'end_b']) {
  assert(pointIds.has(line.appearance[side]?.ref), 'specimen endpoints reference actual points');
}
const chrome = [process.env.CHROME_BIN, 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)
  .find(name => spawnSync(name, ['--version'], { encoding: 'utf8' }).status === 0);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const width = Number(process.env.VISUAL_GRAMMAR_VIEWPORT_WIDTH) || null;
const logs = path.join(site, 'ci-logs');
await fs.mkdir(logs, { recursive: true });

if (!chrome) {
  console.log('[check:visual-grammar-lab] STATIC PASS source/distribution and endpoints. SKIP browser: Chromium unavailable; no display or gesture PASS claimed.');
} else if (!width) {
  const cases = [];
  for (const viewport of [360, 390, 1280]) {
    const proc = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, CHROME_BIN: chrome, VISUAL_GRAMMAR_VIEWPORT_WIDTH: String(viewport) }, stdio: 'inherit',
    });
    await new Promise((resolve, reject) => {
      proc.on('error', reject);
      proc.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Specimen check ${viewport} failed (${code ?? signal})`)));
    });
    cases.push(JSON.parse(await fs.readFile(path.join(logs, `visual-grammar-lab-${viewport}.json`), 'utf8')));
  }
  await fs.writeFile(path.join(logs, 'visual-grammar-lab-results.json'), JSON.stringify({
    scope: 'Generated HG-V1 specimen, Chromium software WebGL with emulated touch. Not Android hardware or human comprehension.', cases,
  }, null, 2));
  console.log('[check:visual-grammar-lab] PASS 360/390/1280: actual fonts, vertical writing, stable authored data/poses/sizes, display comparisons, selection and rotation, simultaneous diagram/information.');
} else {
  assert([360, 390, 1280].includes(width), 'known viewport');
  const useTouch = width < 650;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), '3dsl-visual-grammar-'));
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
      let file = path.resolve(webRoot, '.' + decodeURIComponent(url.pathname));
      if (file !== webRoot && !file.startsWith(webRoot + path.sep)) { res.writeHead(403).end(); return; }
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '', processError, ws;
  proc.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-12000); });
  proc.on('error', error => { processError = error; });
  try {
    let port;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const active = await fs.readFile(path.join(dir, 'DevToolsActivePort'), 'utf8').catch(() => '');
      if (active) { port = active.split('\n')[0]; break; }
      if (processError) throw processError;
      if (proc.exitCode !== null || proc.signalCode !== null) throw new Error(`Chromium exited (${proc.exitCode ?? proc.signalCode}): ${stderr}`);
      await sleep(100);
    }
    assert(port, `Chromium debugger started: ${stderr}`);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connection timeout')), 15000);
      ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener('error', error => { clearTimeout(timer); reject(error); }, { once: true });
    });
    let seq = 0;
    const pending = new Map(), errors = [], failedResponses = [];
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
        failedResponses.push({ status: message.params.response.status, url: message.params.response.url });
      }
      const entry = pending.get(message.id);
      if (entry) {
        pending.delete(message.id); clearTimeout(entry.timer);
        message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result);
      }
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    async function evaluate(expression) {
      const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert(!result.exceptionDetails, 'browser evaluation: ' + JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function until(expression, message) {
      const limit = Date.now() + 20000;
      while (Date.now() < limit) {
        if (await evaluate(expression)) return;
        await sleep(75);
      }
      assert.fail(message + ': ' + JSON.stringify({ errors, failedResponses }));
    }
    const painted = () => evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const state = () => evaluate('window.legendLab.getState()');
    async function screenshot(name) {
      const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(path.join(logs, `visual-grammar-${name}-${width}.png`), Buffer.from(result.data, 'base64'));
    }
    async function pointer(type, point) {
      if (useTouch) await command('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...point, id: 1, radiusX: 2, radiusY: 2 }] });
      else await command('Input.dispatchMouseEvent', { type: ({ touchStart: 'mousePressed', touchMove: 'mouseMoved', touchEnd: 'mouseReleased' })[type], ...point, button: 'left', buttons: type === 'touchEnd' ? 0 : 1, clickCount: type === 'touchMove' ? 0 : 1 });
    }
    async function click(selector) {
      const point = await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      assert(point, 'click target exists: ' + selector);
      await pointer('touchStart', point); await pointer('touchEnd', point); await painted();
    }
    const domSnapshot = () => evaluate(`(() => {
      const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      return {width:innerWidth,height:innerHeight,pageWidth:document.scrollingElement.scrollWidth,pageHeight:document.scrollingElement.scrollHeight,scrollY,background:getComputedStyle(document.getElementById('model-stage')).backgroundColor,
        stage:rect(document.getElementById('model-stage')),panel:rect(document.getElementById('support-panel')),
        labels:[...document.querySelectorAll('.model-label[data-element-id]')].map(el=>{const ink=el.querySelector('.label-ink')||el,s=getComputedStyle(ink);return {id:el.dataset.elementId,text:ink.textContent,kind:el.dataset.kind,writing:s.writingMode,font:s.fontFamily,color:s.color,rect:rect(ink),localWidth:ink.offsetWidth,localHeight:ink.offsetHeight,display:s.display,visibility:s.visibility};})};
    })()`);
    function preserve(before, after, message) {
      assert.deepEqual(after.model, model, message + ': source data unchanged');
      assert.equal(after.modelUnchanged, true, message + ': live source data unchanged');
      const props = snapshot => snapshot.labels.map(label => ({ id: label.id, position: label.position, quaternion: label.quaternion, size: label.size })).sort((a, b) => a.id.localeCompare(b.id));
      assert.deepEqual(props(after), props(before), message + ': authored position, pose and size unchanged');
    }
    function assertLayout(dom, message) {
      assert(dom.stage.width > 200 && dom.stage.height >= (useTouch ? 300 : 250), message + ': usable model area');
      assert(dom.stage.y >= 0 && dom.stage.bottom <= dom.height + 1, message + ': model inside viewport');
      assert(dom.panel.height >= 100 && dom.panel.bottom <= dom.height + 1, message + ': useful information area remains in viewport');
      if (useTouch) assert(dom.panel.y >= dom.stage.bottom - 1, message + ': information remains beneath model');
      else assert(dom.panel.x >= dom.stage.right - 1 && dom.panel.right <= dom.width + 1, message + ': information remains alongside model');
      assert(dom.pageWidth <= dom.width + 1 && dom.pageHeight <= dom.height + 1 && dom.scrollY === 0, message + ': no page overflow or jump');
    }
    function screenMetrics(dom, current) {
      const stage = dom.stage;
      const rects = dom.labels.map(label => ({
        x: Math.max(stage.x, label.rect.x), y: Math.max(stage.y, label.rect.y),
        right: Math.min(stage.right, label.rect.right), bottom: Math.min(stage.bottom, label.rect.bottom),
      })).filter(rect => rect.right > rect.x && rect.bottom > rect.y);
      // Exact union of clipped screen AABBs, not glyph ink or projected quads.
      const xs = [...new Set(rects.flatMap(rect => [rect.x, rect.right]))].sort((a, b) => a - b);
      let unionArea = 0;
      for (let i = 1; i < xs.length; i++) {
        const left = xs[i - 1], right = xs[i];
        const intervals = rects.filter(rect => rect.x < right && rect.right > left).map(rect => [rect.y, rect.bottom]).sort((a, b) => a[0] - b[0]);
        let height = 0, start = null, end = null;
        for (const [a, b] of intervals) {
          if (start === null) { start = a; end = b; }
          else if (a <= end) end = Math.max(end, b);
          else { height += end - start; start = a; end = b; }
        }
        if (start !== null) height += end - start;
        unionArea += (right - left) * height;
      }
      const round = value => Number(value.toFixed(4));
      const envelope = rects.length ? {
        x: Math.min(...rects.map(rect => rect.x)), y: Math.min(...rects.map(rect => rect.y)),
        right: Math.max(...rects.map(rect => rect.right)), bottom: Math.max(...rects.map(rect => rect.bottom)),
      } : { x: 0, y: 0, right: 0, bottom: 0 };
      return {
        caveat: 'Axis-aligned label boxes include whitespace and overestimate slanted glyph footprints. These measurements do not establish legibility.',
        aabbUnionAreaRatio: round(unionArea / (stage.width * stage.height)),
        envelopeWidthRatio: round((envelope.right - envelope.x) / stage.width),
        envelopeHeightRatio: round((envelope.bottom - envelope.y) / stage.height),
        visibleBoxCount: rects.length,
        primaryLabels: dom.labels.filter(label => ['家の米', '保管', '炊飯', '調理役', 'ご飯'].includes(label.text)).map(label => ({
          text: label.text, id: label.id, writing: label.writing, font: label.font,
          modelSize: current.labels.find(item => item.id === label.id)?.size,
          screenRect: label.rect,
        })),
      };
    }
    function contrastMetrics(dom, current) {
      const parse = color => {
        if (/^#?[0-9a-f]{6}$/i.test(color)) {
          const hex = color.replace(/^#/, '');
          return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
        }
        const match = color.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
        assert(match && (match[4] === undefined || Number(match[4]) === 1), 'contrast metric requires opaque sRGB colors');
        return match.slice(1, 4).map(value => Number(value) / 255);
      };
      const luminance = color => parse(color).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
      const bg = luminance(dom.background);
      const ratio = color => { const fg = luminance(color); return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05); };
      const texts = [...new Set(dom.labels.map(label => label.color))].map(color => ({ color, ratio: ratio(color) }));
      const lines = [...new Set(current.renderColors)].map(color => ({ color: '#' + color, ratio: ratio(color) }));
      assert(texts.every(item => item.ratio >= 4.5), 'authored text colors meet 4.5:1 against flat stage background');
      assert(lines.every(item => item.ratio >= 3), 'authored line colors meet 3:1 against flat stage background');
      return { background: dom.background, texts, lines, caveat: 'Specified sRGB colors against the flat stage background only. Not a test of thin-line rasterization, overlaps, color-vision discrimination, or whole-site WCAG conformance.' };
    }
    function checkProjectedFit(points, current, dom, message, tight = false) {
      assert(points.length > 0 && points.every(point => point.length === 3 && point.every(Number.isFinite)), message + ': finite actual fit points');
      const dot = (a, b) => a.reduce((total, value, index) => total + value * b[index], 0);
      const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
      const unit = vector => { const length = Math.hypot(...vector); return vector.map(value => value / length); };
      const camera = current.camera, stage = dom.stage, inset = current.fitInsets;
      assert(inset && Object.values(inset).every(Number.isFinite), message + ': actual fit insets are available');
      const backwards = unit(camera.position.map((value, index) => value - camera.target[index]));
      const right = unit(cross(camera.up, backwards));
      const up = unit(cross(backwards, right));
      const tanY = Math.tan(camera.fov * Math.PI / 360), tanX = tanY * camera.aspect;
      assert(Math.abs(camera.aspect - stage.width / stage.height) < 1e-9, message + ': camera aspect equals rendered stage');
      const projected = points.map(point => {
        const relative = point.map((value, index) => value - camera.position[index]);
        const depth = -dot(relative, backwards);
        assert(depth > 0.1, message + ': point is in front of camera');
        return { x: stage.x + (1 + dot(relative, right) / (depth * tanX)) * stage.width / 2,
          y: stage.y + (1 - dot(relative, up) / (depth * tanY)) * stage.height / 2 };
      });
      const allowed = { left: stage.x + inset.left, right: stage.right - inset.right, top: stage.y + inset.top, bottom: stage.bottom - inset.bottom };
      for (const point of projected) assert(point.x >= allowed.left - .02 && point.x <= allowed.right + .02 && point.y >= allowed.top - .02 && point.y <= allowed.bottom + .02,
        message + ': actual corner stays within control-free viewport: ' + JSON.stringify({ point, allowed }));
      const extrema = { left: Math.min(...projected.map(point => point.x)), right: Math.max(...projected.map(point => point.x)), top: Math.min(...projected.map(point => point.y)), bottom: Math.max(...projected.map(point => point.y)) };
      const widthRatio = (extrema.right - extrema.left) / (allowed.right - allowed.left), heightRatio = (extrema.bottom - extrema.top) / (allowed.bottom - allowed.top);
      if (tight) assert(Math.max(widthRatio, heightRatio) >= .96, message + ': actual points use available width or height instead of fitting a fictitious world box');
      return { pointCount: points.length, allowed, extrema, widthRatio, heightRatio };
    }
    await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: useTouch });
    await command('Emulation.setTouchEmulationEnabled', { enabled: useTouch, maxTouchPoints: 2 });
    await command('Page.navigate', { url: origin + route + '?test=1' });
    await until('window.legendLab?.ready === true', 'specimen ready');
    await evaluate('document.fonts.ready'); await painted();
    const initial = await state(), initialDom = await domSnapshot();
    assert.deepEqual(initial.model, model, 'browser model equals authored JSON');
    assert.equal(initial.modelUnchanged, true, 'live source is unchanged after rendering');
    assert.equal(new Set(initial.labels.map(label => label.id)).size, allIds.length, 'all model labels are represented');
    function rotateByQuaternion(v, q) {
      const [x, y, z, w] = q;
      const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
      const uv = cross([x, y, z], v), uuv = cross([x, y, z], uv);
      return v.map((value, index) => value + 2 * (w * uv[index] + uuv[index]));
    }
    for (const label of initial.labels) {
      const element = (label.kind === 'point' ? model.points : model.lines).find(item => item.meta.uuid === label.id);
      assert(element, 'rendered label belongs to source');
      const config = label.kind === 'point' ? element.appearance.marker.text : element.appearance.caption_text;
      assert.equal(label.size, config[label.kind === 'point' ? 'size' : 'font_size'] ?? 8, 'rendered label keeps source size');
      for (const [axis, basis] of [['front', [0, 0, 1]], ['up', [0, 1, 0]]]) {
        const actual = rotateByQuaternion(basis, label.quaternion);
        assert(actual.every((value, index) => Math.abs(value - config.pose[axis][index]) < 1e-6), `${label.id}: rendered ${axis} matches authored pose`);
      }
    }
    assertLayout(initialDom, 'initial');
    const initialFit = checkProjectedFit(initial.initialFitPoints, initial, initialDom, 'initial projected fit', useTouch);
    await screenshot('initial');

    const fonts = await evaluate(`({loaded:[...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight})),sans:document.fonts.check('16px "Lab Sans"','米'),serif:document.fonts.check('16px "Lab Serif"','米')})`);
    assert(fonts.sans && fonts.serif, 'Japanese specimen fonts can render');
    for (const family of ['Lab Sans', 'Lab Serif']) assert(fonts.loaded.some(font => font.family.replaceAll('"', '') === family && font.status === 'loaded'), `${family}: actual FontFace loaded`);

    const comparisons = [];
    for (const step of [0, 1, 2, 3]) {
      await evaluate(`(()=>{const el=document.getElementById('comparison-step');el.value='${step}';el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await painted();
      const current = await state(), dom = await domSnapshot();
      assert.equal(Number(current.step), step, 'comparison control changed step');
      preserve(initial, current, 'step ' + step);
      assertLayout(dom, 'step ' + step);
      if (step === 0) assert(dom.labels.every(label => label.writing === 'horizontal-tb'), 'plane-only comparison uses horizontal text');
      else {
        const vertical = dom.labels.filter(label => label.writing === 'vertical-rl');
        assert(vertical.length > 0, 'authored vertical text has actual CSS vertical writing');
        assert(vertical.some(label => label.text.trim().length > 1 && label.localHeight > label.localWidth), 'vertical run has a vertical local layout independent of camera projection');
      }
      const families = new Set(dom.labels.map(label => label.font));
      if (step < 2) assert.equal(families.size, 1, 'before font comparison one family');
      else assert(families.size >= 2, 'font comparison has distinct rendered families');
      comparisons.push({ step, writingModes: [...new Set(dom.labels.map(label => label.writing))], families: [...families], screenMetrics: screenMetrics(dom, current), contrast: contrastMetrics(dom, current) });
      await screenshot(`step-${step}`);
    }
    await screenshot('full');
    const fullColors = (await state()).renderColors;
    assert(Array.isArray(fullColors) && new Set(fullColors).size >= 2, 'full comparison actually colors rendered relations');

    await click('#no-color');
    await until('window.legendLab.getState().noColor === true', 'color-free mode enabled');
    preserve(initial, await state(), 'color-free mode');
    assert.equal(new Set((await state()).renderColors).size, 1, 'color-free mode changes actual rendered line materials');
    const mono = await domSnapshot();
    assertLayout(mono, 'color-free');
    assert.deepEqual(mono.labels.map(label => [label.id, label.text]).sort(), initialDom.labels.map(label => [label.id, label.text]).sort(), 'color-free mode retains every word');
    await screenshot('no-color');
    await click('#single-font');
    await until('window.legendLab.getState().singleFont === true', 'single-font mode enabled');
    preserve(initial, await state(), 'single-font mode');
    const oneFont = await domSnapshot();
    assert.equal(new Set(oneFont.labels.map(label => label.font)).size, 1, 'single-font mode changes actual rendered families');
    await screenshot('no-color-single-font');
    await click('#single-font'); await click('#no-color');

    const readingViews = [];
    for (const [key, targetWord] of [['storage', '保管'], ['cooking', '炊飯']]) {
      await click('#reset-view'); await painted();
      const before = await state(), beforeDom = await domSnapshot();
      await click('#view-' + key); await painted();
      const current = await state(), dom = await domSnapshot();
      preserve(initial, current, key + ' reading view');
      assertLayout(dom, key + ' reading view');
      assert.equal(current.labels.length, initial.labels.length, key + ': other model elements are retained');
      const group = current.readingGroups[key];
      assert(group?.ids?.length > 2, key + ': reading view includes a relation group');
      const ids = new Set(group.ids);
      const relations = model.lines.filter(line => ids.has(line.meta.uuid));
      assert(relations.length > 0, key + ': reading view contains actual model relations');
      for (const line of relations) for (const side of ['end_a', 'end_b']) assert(ids.has(line.appearance[side].ref), key + ': both relation endpoints remain in the reading group');
      const corners = current.labels.filter(label => ids.has(label.id)).flatMap(label => label.worldCorners);
      const projectedFit = checkProjectedFit(corners, current, dom, key + ' relationship fit');
      const previousWord = beforeDom.labels.find(label => label.text === targetWord), currentWord = dom.labels.find(label => label.text === targetWord);
      assert(previousWord && currentWord, key + ': target word exists');
      const areaRatio = currentWord.rect.width * currentWord.rect.height / (previousWord.rect.width * previousWord.rect.height);
      assert(areaRatio > 1.1, key + ': target word becomes visibly larger through camera fitting');
      assert.notDeepEqual(current.camera.position, before.camera.position, key + ': scope button actually changes camera');
      readingViews.push({ key, targetWord, group, areaRatio, projectedFit, screenMetrics: screenMetrics(dom, current) });
      await screenshot('view-' + key);
    }
    await click('#reset-view'); await painted();

    // Use real screen hit testing rather than calling the specimen's selection API.
    const pick = await evaluate(`(() => {
      const stage=document.getElementById('model-stage').getBoundingClientRect();
      for(const el of document.querySelectorAll('.model-label[data-element-id][data-kind="point"]')){
        const r=(el.querySelector('.label-ink')||el).getBoundingClientRect();
        for(const fx of [.5,.35,.65])for(const fy of [.5,.35,.65]){
          const x=r.left+r.width*fx,y=r.top+r.height*fy;
          if(x<stage.left||x>stage.right||y<stage.top||y>stage.bottom)continue;
          if(document.elementFromPoint(x,y)?.closest('[data-element-id]')===el)return {id:el.dataset.elementId,x,y};
        }
      }return null;
    })()`);
    assert(pick, 'a model word is screen-pickable');
    const beforePick = await state();
    await pointer('touchStart', { x: pick.x, y: pick.y }); await pointer('touchEnd', { x: pick.x, y: pick.y });
    await until(`window.legendLab.getState().selectedId === ${JSON.stringify(pick.id)}`, 'trusted pointer selects hit word');
    const selected = await state();
    preserve(initial, selected, 'selection');
    assert.deepEqual(selected.renderColors, fullColors, 'selection retains authored relation colors');
    assert.deepEqual(selected.camera, beforePick.camera, 'selecting information does not move the camera');
    assertLayout(await domSnapshot(), 'selected information');
    await screenshot('selected');
    await click('#tab-legend');
    assertLayout(await domSnapshot(), 'legend panel');
    await click('#tab-info');
    assertLayout(await domSnapshot(), 'information panel');

    const beforeOrbit = await state();
    const stage = (await domSnapshot()).stage;
    const a = { x: stage.x + stage.width * .18, y: stage.y + stage.height * .38 };
    const b = { x: a.x + Math.min(75, stage.width * .2), y: a.y + 25 };
    await pointer('touchStart', a);
    for (let step = 1; step <= 6; step++) {
      await pointer('touchMove', { x: a.x + (b.x - a.x) * step / 6, y: a.y + (b.y - a.y) * step / 6 }); await sleep(20);
    }
    await pointer('touchEnd', b); await painted();
    const afterOrbit = await state();
    assert.notDeepEqual(afterOrbit.camera.position, beforeOrbit.camera.position, 'trusted drag rotates model view');
    preserve(initial, afterOrbit, 'camera rotation');
    await screenshot('rotated');
    await click('#reset-view'); await painted();
    assertLayout(await domSnapshot(), 'reset view');

    if (useTouch) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 640, deviceScaleFactor: 1, mobile: true });
      await painted();
      assertLayout(await domSnapshot(), 'short viewport');
      await screenshot('short');
    }
    const overlap = [];
    for (let i = 0; i < initialDom.labels.length; i++) for (let j = i + 1; j < initialDom.labels.length; j++) {
      const a = initialDom.labels[i], b = initialDom.labels[j], ar = a.rect, br = b.rect;
      const area = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.x, br.x)) * Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.y, br.y));
      const fraction = area / Math.max(1, Math.min(ar.width * ar.height, br.width * br.height));
      if (fraction > .35) overlap.push({ a: a.text, b: b.text, fraction: Number(fraction.toFixed(3)) });
    }
    // Rectangular screen bounds overestimate overlap of slanted glyph planes.
    // Record candidates for image review; do not claim this proves legibility.
    assert.equal(errors.length, 0, 'no runtime exceptions: ' + JSON.stringify(errors));
    assert.equal(failedResponses.length, 0, 'no failed asset responses: ' + JSON.stringify(failedResponses));
    await fs.writeFile(path.join(logs, `visual-grammar-lab-${width}.json`), JSON.stringify({
      width, result: 'pass', fonts, comparisons, initialFit, readingViews, initialLayout: initialDom, initialScreenMetrics: screenMetrics(initialDom, initial), overlapCandidates: overlap,
      selectedId: pick.id, runtimeErrors: errors, failedResponses,
      scope: 'Browser emulation and structural/rendering invariants; overlap candidates require image review; no human-comprehension claim.',
    }, null, 2));
    console.log(`[check:visual-grammar-lab] PASS ${width}px, ${allIds.length} labels, ${overlap.length} bounding-box overlap candidates recorded.`);
  } catch (error) {
    if (ws?.readyState === WebSocket.OPEN) {
      // Successful captures are saved incrementally; the error keeps CDP output.
      await fs.writeFile(path.join(logs, `visual-grammar-lab-failure-${width}.txt`), String(error.stack || error));
    }
    throw error;
  } finally {
    ws?.close(); proc.kill(); server.close();
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
