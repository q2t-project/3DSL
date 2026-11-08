const el = id => document.getElementById(id);
const fixtures = JSON.parse(el('fixtures').textContent);
const order = ['small','large','large','large','small'];
const nameOf = key => key === 'large' ? '大型' : '小型';
const storageKey = '3dsl.viewerLoad.v1';
const paced = new URLSearchParams(location.search).get('sample') === '1';
let report = null, active = null;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function environment() {
  const ua = navigator.userAgent;
  return {platform: /Android/.test(ua) ? 'Android' : navigator.userAgentData?.platform || navigator.platform,
    browser: ua.match(/(?:Chrome|Chromium|Firefox|Version)\/[\d.]+/)?.[0] || '不明',
    viewport:[innerWidth,innerHeight], dpr:devicePixelRatio};
}
function save() {
  try {localStorage.setItem(storageKey,JSON.stringify(report));} catch { /* Current-tab results still work. */ }
}
function summary() {
  const env = report.environment;
  const phases = report.rows.map(row => nameOf(row.size) + ' ' + (row.renderMs === undefined ? '未計測' : row.renderMs + 'ms'));
  const manual = report.rows.find(row => row.gesture)?.gesture;
  return ['3DSL Viewer連続読込 ' + report.status + ' ' + report.rows.filter(row=>row.done).length + '/5',
    [env.platform,env.browser,env.viewport.join('×'),'DPR '+env.dpr].join(' / '),
    '配信版 ' + (report.sha || '未取得'), phases.join(' → '), '画面操作 ' + (manual ? manual + 'で回転確認' : '未確認'),
    'AndroidプロセスPSSはこの画面では未取得', report.reason || ''].filter(Boolean).join('\n');
}
function showRows() {
  el('steps').replaceChildren(...report.rows.map(row => {
    const li = document.createElement('li');
    li.textContent = nameOf(row.size) + (row.renderMs === undefined ? '　読込中' : '　素材描画 ' + row.renderMs + ' ms')
      + (row.orbit ? '・回転確認' : '') + (row.gesture ? '・指示どおりの操作を確認' : '');
    return li;
  }));
}
function stage(phase, message) {
  report.phase = phase; el('status').textContent = message; showRows(); save();
}
function finish(status, reason) {
  report.status = status; report.reason = reason; report.endedAt = new Date().toISOString();
  stage('end', status + '　' + (reason || '5作品の読込みと回転を確認しました。'));
  el('frame').replaceChildren(); el('run').disabled = false; el('stop').hidden = true; el('next').hidden = true;
  el('copy').hidden = false; el('text').value = summary();
}
async function until(test, signal, label, limitMs=45000) {
  const deadline = performance.now()+limitMs;
  while (performance.now()<deadline) {
    signal.throwIfAborted();
    const result = test();
    if (result) return result;
    await pause(35);
  }
  throw new Error(label + 'を確認できませんでした。');
}
async function awaitViewer(promise, signal, label) {
  let outcome;
  Promise.resolve(promise).then(value=>{outcome={value};},error=>{outcome={error};});
  const result=await until(()=>outcome,signal,label);
  if ('error' in result) throw result.error;
  return result.value;
}
const moved = (a,b) => a && b && (Math.abs(a.theta-b.theta) > .01 || Math.abs(a.phi-b.phi) > .01);

// Instruments only this check's iframe. Counts the actual decoded square PNGs,
// not the unrelated label textures registered by the renderer.
function trackBitmaps(reader) {
  const create=reader.createImageBitmap, close=reader.ImageBitmap?.prototype.close;
  if (!create || !close) throw new Error('このブラウザでは画像の復号・解放を確認できません。');
  const widths=new Set(Object.values(fixtures).map(f=>f.textureWidth));
  const observed=new WeakSet(), counts={decoded:0,closed:0,lastWidth:0};
  reader.createImageBitmap=async function(...args) {
    const image=await create.apply(this,args);
    if (image.height===image.width && widths.has(image.width)) {
      observed.add(image);counts.decoded++;counts.lastWidth=image.width;
    }
    return image;
  };
  reader.ImageBitmap.prototype.close=function() {
    if (observed.delete(this)) counts.closed++;
    return close.call(this);
  };
  return counts;
}
async function openModel(reader, spec, bitmaps, signal) {
  let reply;
  function message(event) {
    if (event.source !== reader || event.origin !== location.origin) return;
    if (event.data?.type === '3dsl.viewer.loadOk') reply = {ok:true};
    if (event.data?.type === '3dsl.viewer.loadFail') reply = {error:event.data.message || '作品の読込に失敗しました。'};
  }
  addEventListener('message',message);
  try {
    const previous = reader.viewerHub, initialDecoded=bitmaps.decoded;
    reader.postMessage({type:'3dsl.viewer.loadUrl',modelUrl:new URL(spec.model,location.href).href},location.origin);
    await until(()=>reply,signal,'作品の応答');
    if (reply.error) throw new Error(reply.error);
    return await until(()=>{
      const hub = reader.viewerHub, metrics = hub?.getRenderDiagnostics?.();
      if (hub !== previous && reader.viewerDiagnostics.snapshot().renderAvailable &&
          metrics?.triangles >= spec.triangles && metrics.textures > 0 &&
          bitmaps.decoded>initialDecoded && bitmaps.lastWidth===spec.textureWidth && bitmaps.decoded-bitmaps.closed===1) return metrics;
    },signal,'新しい作品の素材描画');
  } finally {removeEventListener('message',message);}
}
async function waitForDrag(reader, signal) {
  const canvas = reader.document.getElementById('viewer-canvas');
  let start = null, dragged = null, released = false;
  const camera = () => reader.viewerDiagnostics.snapshot().camera;
  function down(e) {
    if (!e.isTrusted || !e.isPrimary) return;
    dragged=null;released=false;
    start = {id:e.pointerId,x:e.clientX,y:e.clientY,pose:camera()};
  }
  function move(e) {
    if (e.isTrusted && start?.id === e.pointerId && Math.hypot(e.clientX-start.x,e.clientY-start.y)>=7) {
      dragged={pose:start.pose,type:e.pointerType};
    }
  }
  function up(e) {if (e.isTrusted && start?.id===e.pointerId) released=true;}
  function cancel() {start=null;dragged=null;released=false;}
  canvas.addEventListener('pointerdown',down,true); canvas.addEventListener('pointermove',move,true);
  canvas.addEventListener('pointerup',up,true);canvas.addEventListener('pointercancel',cancel,true);
  try {return await until(()=>released && dragged && moved(dragged.pose,camera()) && dragged.type,signal,'図のドラッグ',120000);}
  finally {canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel,true);}
}
async function holdForSample(signal, message) {
  if (!paced) return;
  stage('sample',message);
  el('next').hidden=false;
  try {await until(()=>el('next').hidden,signal,'USB計測の続行',120000);}
  finally {el('next').hidden=true;}
}
async function start() {
  if (active) return;
  active = new AbortController();
  const signal = active.signal;
  report = {version:1,runId:crypto.randomUUID(),status:'計測中',startedAt:new Date().toISOString(),
    sha:null,environment:environment(),phase:'setup',paced,rows:[]};
  el('run').disabled = true;el('stop').hidden=false;el('copy').hidden=true;el('fallback').hidden=true;
  stage('setup','Viewerを開いています。');
  try {
    const frame = document.createElement('iframe');
    frame.title='検査用の3DSL Viewer';
    frame.src='/preview-reconstruction/contract_viewer/reader.html?dbgHub=1';
    el('frame').replaceChildren(frame);
    const probe = fetch('/__deploy_probe.txt',{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(6000)])}).then(r=>r.ok?r.json():null)
      .then(v=>{if (!signal.aborted) report.sha=v?.sha || null;}).catch(()=>{});
    const reader = frame.contentWindow;
    await until(()=>typeof reader.viewerBootReady!=='undefined',signal,'Viewerの起動');
    const ready=await awaitViewer(reader.viewerBootReady,signal,'Viewerの起動');
    if (!ready?.ok) throw new Error('Viewerを起動できませんでした。');
    await probe;
    const bitmaps=trackBitmaps(reader);
    reader.document.addEventListener('webglcontextlost',e=>{
      if (e.target?.id==='viewer-canvas') active?.abort(new Error('Viewerの描画接続が失われました。'));
    },{capture:true,signal});
    await holdForSample(signal,'USB計測の開始待ちです。');
    for (const [i,size] of order.entries()) {
      const spec=fixtures[size], row={stage:i+1,size,glbHash:spec.glbHash,triangles:spec.triangles,textureWidth:spec.textureWidth};
      report.rows.push(row);
      stage('load',(i+1)+'/5　'+nameOf(size)+'の素材を読み込んでいます。');
      const time=performance.now();
      const metrics=await openModel(reader,spec,bitmaps,signal);
      row.decodedBitmaps=bitmaps.decoded;row.closedBitmaps=bitmaps.closed;
      row.renderMs=Math.round(performance.now()-time);row.drawnTriangles=metrics.triangles;
      const before=reader.viewerDiagnostics.snapshot().camera;
      await awaitViewer(reader.viewerDiagnostics.cameraOrbit(.15,.03),signal,'回転');
      await until(()=>moved(before,reader.viewerDiagnostics.snapshot().camera),signal,'回転');
      row.orbit=true;
      if (i===3) {
        stage('gesture',paced?'4/5　大型の図でUSBからの回転入力を待っています。':'4/5　下の図を指で横になぞって回してください。');
        row.gesture=await waitForDrag(reader,signal);
      }
      await holdForSample(signal,'USB計測中です。');
      row.done=true;showRows();save();
    }
    signal.throwIfAborted();finish('完了');
  } catch (error) {
    finish(signal.aborted && signal.reason?.name==='AbortError' ? '中断' : '失敗',String(error?.message||error));
  } finally {active.abort();active=null;}
}
function interrupt(reason) {active?.abort(new DOMException(reason,'AbortError'));}
el('run').addEventListener('click',start);
el('stop').addEventListener('click',()=>interrupt('操作で中止しました。'));
el('next').addEventListener('click',()=>{el('next').hidden=true;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt('計測中に画面が背面に移りました。');});
addEventListener('pagehide',()=>{if(active){save();interrupt('計測中にページを離れました。');}});
el('copy').addEventListener('click',async()=>{
  el('text').value=summary();
  try {await navigator.clipboard.writeText(el('text').value);el('status').textContent='結果をコピーしました。';}
  catch {el('fallback').hidden=false;el('text').focus();el('text').select();}
});
try {
  const previous = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (previous?.version===1 && previous.environment && Array.isArray(previous.rows)) {
    report=previous;
    if (report.status==='計測中') finish('中断','前回の計測が途中で終了しました。');
    else {showRows();el('status').textContent='前回の結果　'+report.status;el('text').value=summary();el('copy').hidden=false;}
  }
} catch { /* An unavailable or invalid local record does not block a new run. */ }
window.readViewerLoadReport = () => structuredClone(report);
