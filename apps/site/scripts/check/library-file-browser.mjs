// Loopback-only documents. Use the generated Pages header values and the
// existing Chromium session; production contains no synthetic work or payload.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function libraryFileBrowserFixture(dist) {
  const headersText = await readFile(path.join(dist, '_headers'), 'utf8');
  function headersFor(rule) {
    const lines = headersText.split(/\r?\n/);
    const start = lines.indexOf(rule);
    assert.notEqual(start, -1, 'missing Pages rule ' + rule);
    const result = {};
    for (const line of lines.slice(start + 1)) {
      if (!/^\s+\S/.test(line)) break;
      const split = line.indexOf(':');
      result[line.slice(0, split).trim().toLowerCase()] = line.slice(split + 1).trim();
    }
    return result;
  }
  const root = '/__library_file_ci__';
  const work = '/_data/library/00000001';
  const documents = new Map();
  const requests = new Set();
  const beacons = new Set();
  for (const kind of ['control','attachments','assets']) {
    for (const format of ['html','svg']) {
      const id = `${kind}-${format}`;
      // The extensionless HTML spelling models the URL Pages serves after normalization.
      const url = kind === 'control' ? `${root}/${format}` : `${work}/${kind}/資料/${format==='html'?'example':'example.svg'}`;
      const headers = kind === 'control' ? {} : headersFor(`/_data/library/:id/${kind}/*`);
      if (kind !== 'control') {
        assert.equal(headers['x-content-type-options'], 'nosniff');
        assert.deepEqual(headersFor(`/_data/library/:id/${kind}`), headers, 'directory index alias has the same policy');
        if (kind === 'attachments') {
          assert.equal(headers['content-disposition'], 'attachment');
          assert.equal(headers['content-type'], 'application/octet-stream');
        }
      }
      const script = `parent.postMessage('${id}', '*')`;
      const beacon = root + '/beacon/' + id;
      const body = format === 'html' ? `<!doctype html><script>${script}</script><img src="${beacon}">`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="19" height="11"><rect width="19" height="11"/><script>${script}</script><image href="${beacon}" width="1" height="1"/></svg>`;
      documents.set(url, {id,body,headers:{'content-type':format==='html'?'text/html':'image/svg+xml', ...headers}});
    }
  }
  function serve(url, res) {
    if (url === root + '/') {
      const frames = [...documents.keys()].map(u => `<iframe src="${u}"></iframe>`).join('');
      res.writeHead(200, {'content-type':'text/html; charset=utf-8'}).end(`<!doctype html><body><script>window.seen=[];window.addEventListener('message',e=>window.seen.push(e.data));</script>${frames}<img id="asset" src="${work}/assets/資料/example.svg"></body>`);
      return true;
    }
    if (url.startsWith(root+'/beacon/')) {
      beacons.add(url.slice((root+'/beacon/').length));
      res.writeHead(204).end(); return true;
    }
    const doc = documents.get(url);
    if (!doc) return false;
    requests.add(doc.id);
    res.writeHead(200,doc.headers).end(doc.body);
    return true;
  }
  async function check({cmd,evaluate,origin}) {
    await cmd('Browser.setDownloadBehavior',{behavior:'deny'});
    await cmd('Page.navigate',{url:origin+root+'/'});
    for(let i=0;i<100;i++) {
      if(await evaluate(`location.pathname==='${root}/' && document.readyState==='complete' && window.seen?.includes('control-html') && window.seen?.includes('control-svg')`)) break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(requests.size,documents.size,'every document was requested');
    assert.deepEqual((await evaluate('window.seen.slice()')).sort(),['control-html','control-svg']);
    assert.deepEqual([...beacons].sort(),['control-html','control-svg'],'only unrestricted controls request an external resource');
    assert.equal(await evaluate('document.querySelector("#asset").naturalWidth'),19,'SVG can still be displayed as an image');
    console.log('[check:library-file-browser] PASS generated headers in Chromium: HTML/SVG controls execute and request a resource; attachment/asset probes do neither; inline SVG image loads. Loopback fixtures.');
  }
  return {serve,check};
}
