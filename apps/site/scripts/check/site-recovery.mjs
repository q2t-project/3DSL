// Exercise the static directory copied from a verified snapshot, through the
// real guide/Library links. Only the loopback server may deliver HTTP content.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

if (![3,4].includes(process.argv.length)) throw new Error('Usage: node scripts/check/site-recovery.mjs <restored site directory> [local server port]');
const root = path.resolve(process.argv[2]);
const port = process.argv[3];
if (port && (!/^\d+$/.test(port) || Number(port)<1 || Number(port)>65535)) throw new Error('Invalid loopback server port');
const server = port ? {origin:'http://127.0.0.1:'+port,close:async()=>{}} : await serveBuild(new Map(), root);
const hash = data => createHash('sha256').update(data).digest('hex');
const results = [];
try {
  await withBrowser(async ({cmd,evaluate,events,downloads}) => {
    const blocked = new Set(), received = new Set(), errors = [];
    events.addEventListener('Fetch.requestPaused', ({detail}) => {
      const url = new URL(detail.request.url);
      const local = url.origin === server.origin;
      if (!local) blocked.add(url.origin);
      const action = local ? cmd('Fetch.continueRequest',{requestId:detail.requestId})
        : cmd('Fetch.failRequest',{requestId:detail.requestId,errorReason:'BlockedByClient'});
      action.catch(error => errors.push(error.message));
    });
    events.addEventListener('Network.responseReceived', ({detail}) => {
      const url = new URL(detail.response.url);
      if (/^https?:$/.test(url.protocol)) received.add(url.origin);
    });
    await cmd('Network.enable');
    await cmd('Fetch.enable',{patterns:[{urlPattern:'https://*'},{urlPattern:'http://*'}]});
    async function go(url) {
      const nav = await cmd('Page.navigate',{url});
      assert(!nav.errorText, nav.errorText);
      await waitFor(()=>evaluate('location.href === ' + JSON.stringify(url) + " && document.readyState==='complete'"),url);
    }
    async function readFromLink(modelPath) {
      const href = await evaluate(`Array.from(document.links).map(link=>new URL(link.href)).find(u=>
        u.origin===location.origin && u.pathname==='/app/viewer/' && u.searchParams.get('model')===${JSON.stringify(modelPath)})?.href`);
      assert(href, 'page links to the actual model at ' + modelPath);
      await go(href);
      const inner="document.getElementById('app-viewer-iframe')?.contentWindow";
      await waitFor(()=>evaluate('!!'+inner+'?.viewerBootReady'),'public Viewer');
      const boot=await evaluate(inner+'.viewerBootReady');
      assert(boot.ok,JSON.stringify(boot));
      const read=code=>evaluate(`(w=>${code})(${inner})`);
      const bytes=await readFile(path.join(root,modelPath));
      const expected=JSON.parse(bytes);
      assert.deepEqual(await read('w.viewerDiagnostics.rawSnapshot()'),expected);
      const initial=await read('w.viewerDiagnostics.snapshot()');
      assert(initial.renderAvailable && initial.entryCount>0 && initial.camera && initial.resultIds.length);
      const id=initial.resultIds[0];
      await read('w.viewerDiagnostics.select('+JSON.stringify(id)+')');
      await read('w.viewerDiagnostics.cameraOrbit(.15,.03)');
      const moved=await read('w.viewerDiagnostics.snapshot()');
      assert.equal(moved.selectedId,id);
      assert(Math.abs(moved.camera.theta-initial.camera.theta)>.01);
      assert.deepEqual(await read('w.viewerDiagnostics.rawSnapshot()'),expected);
      results.push({path:modelPath,kind:'Viewer',bytes:bytes.length,sha256:hash(bytes),entries:initial.entryCount});
    }
    await go(server.origin+'/docs/works/knowledge-questions/');
    await readFromLink('/preview-reconstruction/models/knowledge_questions.3dsl-work.json');

    await go(server.origin+'/library/26020401/');
    const base='/_data/library/26020401/';
    const imagePath=base+'assets/財産法.png';
    const dimensions=await waitFor(()=>evaluate(`(() => {
      const img=[...document.querySelectorAll('img[src]')].find(i=>decodeURIComponent(new URL(i.src,document.baseURI).pathname)===${JSON.stringify(imagePath)});
      return img?.complete && img.naturalWidth && [img.naturalWidth,img.naturalHeight];
    })()`),'restored image');
    assert.deepEqual(dimensions,[640,360]);
    const png=await readFile(path.join(root,imagePath));
    results.push({path:imagePath,kind:'image',bytes:png.length,sha256:hash(png),dimensions});
    const attachment=base+'attachments/README.txt';
    let download, completed;
    events.addEventListener('Browser.downloadWillBegin',({detail})=>{download=detail;});
    events.addEventListener('Browser.downloadProgress',({detail})=>{if(detail.state==='completed')completed=detail.guid;});
    await evaluate(`document.querySelector('a[download="README.txt"]').click()`);
    await waitFor(()=>completed && download?.guid===completed,'attachment download');
    assert.equal(new URL(download.url).pathname,attachment);
    assert.equal(download.suggestedFilename,'README.txt');
    const bytes=await readFile(path.join(downloads,completed));
    assert.deepEqual(bytes,await readFile(path.join(root,attachment)));
    results.push({path:attachment,kind:'download',bytes:bytes.length,sha256:hash(bytes)});
    await readFromLink(base+'model.3dss.json');
    for(const privatePath of ['/source.zip','/snapshot.json','/operator/pages-observed.json']) {
      assert.equal((await fetch(server.origin+privatePath)).status,404,privatePath);
    }
    assert.deepEqual([...received],[server.origin]);
    assert.deepEqual(errors,[]);
    console.log('[site-recovery] PASS '+JSON.stringify({results,blockedOrigins:[...blocked],externalHttpResponses:0}));
  });
} finally {await server.close();}
