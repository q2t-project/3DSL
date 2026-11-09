import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { once } from 'node:events';
import { withBrowser, waitFor } from './site-browser.mjs';

const rules = await readFile(process.argv[2] || new URL('../../dist/_headers',import.meta.url),'utf8');
function cacheFor(pathname) {
  let rule = ''; const values = [];
  for (const line of rules.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) { rule=line;continue; }
    if (!line.trim().toLowerCase().startsWith('cache-control:')) continue;
    const pattern='^'+rule.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$';
    if (new RegExp(pattern).test(pathname)) values.push(line.trim().slice('cache-control:'.length).trim());
  }
  return values.join(', ');
}
let release='A'; const seen=[];
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/entry.html') {
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(`<!doctype html><script type="module">import {value} from '/modeler_app/__cache_ci__/controller.js';window.pair={shell:'${release}',code:value};</script>`);
    return;
  }
  if(url.pathname==='/modeler_app/__cache_ci__/controller.js') {
    const body=`export const value=${JSON.stringify(release)};`;
    const etag='"'+createHash('sha256').update(body).digest('hex')+'"';
    const status=req.headers['if-none-match']===etag?304:200;
    seen.push({release,status,conditional:!!req.headers['if-none-match']});
    res.writeHead(status,{'Content-Type':'text/javascript','Cache-Control':cacheFor(url.pathname),'ETag':etag}).end(status===304?'':body);
    return;
  }
  res.writeHead(404).end();
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin='http://127.0.0.1:'+server.address().port;
try {
  await withBrowser(async ({cmd,evaluate})=>{
    async function open(label) {
      await cmd('Page.navigate',{url:origin+'/entry.html?navigation='+label});
      await waitFor(()=>evaluate(`window.pair?.shell===${JSON.stringify(release)} && location.search==='?navigation=${label}'`),'new document '+label);
      return await evaluate('window.pair');
    }
    assert.deepEqual(await open('first'),{shell:'A',code:'A'});
    release='B';
    assert.deepEqual(await open('changed'),{shell:'B',code:'B'},'fresh HTML must not reuse an earlier controller');
    assert.deepEqual(await open('unchanged'),{shell:'B',code:'B'});
  });
  assert.deepEqual(seen.map(x=>x.status),[200,200,304],'changed code is fetched; unchanged code revalidates without a body');
  assert(seen[2].conditional);
  for(const pathname of ['/preview-reconstruction/viewer/runtime/viewerHub.js','/vendor/ajv/dist/ajv.js','/modeler_tuning.css','/viewer_tuning.css']) {
    assert(cacheFor(pathname).split(',').some(x=>x.trim()==='no-cache'),'revalidate mutable code: '+pathname);
  }
} finally {await new Promise(resolve=>server.close(resolve));}
console.log('[check:cache-delivery] PASS normal navigations: changed controller matches fresh HTML; unchanged controller uses ETag/304; JS/CSS rules require revalidation. Existing stored responses are not retroactively purged.');
