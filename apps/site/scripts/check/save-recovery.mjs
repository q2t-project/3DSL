import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { serveBuild, waitFor, withBrowser } from './site-browser.mjs';

const server = await serveBuild();
try {
  for (const legacy of [false, true]) await withBrowser(async ({ cmd, evaluate, downloads, events }) => {
    const base = legacy ? '/modeler_app/' : '/preview-reconstruction/modeler_app/';
    const model = '/preview-reconstruction/models/' + (legacy ? 'created_3points_2lines.3dss.json' : 'first_work.3dsl-work.json');
    await cmd('Page.navigate', { url: server.origin + base + '?model=' + model });
    await waitFor(() => evaluate("!!document.querySelector('#modeler-root')?.__ownedUi"), base);
    await evaluate(`(async()=>{
      const root = document.querySelector('#modeler-root');
      window.hub = root.__ownedHub;
      const {createHubCoreControllers} = await import('${base}ui/hubFacade.js');
      window.core = createHubCoreControllers(hub);
      await core.ensureValidatorInitialized();
      if (!core.isValidatorReady()) throw Error('validator unavailable');
      if (!core.getDocument()?.points?.length) core.setDocument(await (await fetch('${model}')).json(), { intent:'open', label:'test.json' });
      window.form = () => document.querySelector('[data-role=hud]').textContent;
      window.opfs = await navigator.storage.getDirectory();
      window.old = await opfs.getFileHandle('previous.json',{create:true});
      const stream = await old.createWritable(); await stream.write('previous bytes'); await stream.close();
      core.setSaveHandle(old);
      window.edit = value => {
        if (hub.isContractWork?.()) hub.setContractDraft('recovery-test',value);
        else core.updateDocument(doc => ({...doc,document_meta:{...doc.document_meta,document_summary:value}}));
      };
      window.snapshot = () => JSON.stringify([core.getDocument(),hub.getWorkPackage?.() ?? null,core.canUndo(),core.canRedo()]);
      window.output = () => hub.prepareWorkPackage && hub.getWorkPackage() ? hub.prepareWorkPackage(core.getDocument()) : core.getDocument();
      edit('未保存の編集'); window.before = snapshot();
      window.state = () => ({same:snapshot()===before,dirty:core.isDirty(),destination:core.getSaveHandle()?.name,undo:core.canUndo()});
    })()`);
    if (legacy) {
      const check = await evaluate(`(async()=>{
        const doc=structuredClone(core.getDocument());
        const [a,b] = doc.lines;
        const ref=a.appearance.end_a.ref;
        a.end_a=ref;delete a.appearance.end_a;
        b.appearance.end_b={coord:[4,5,6]};
        doc.unknownProbe='kept in extras';
        const {strictDoc,extras}=await core.importNormalize(doc);
        return [strictDoc.lines[0].appearance.end_a,ref,strictDoc.lines[1].appearance.end_b,extras?.removedCount,doc.unknownProbe];
      })()`);
      assert.deepEqual(check,[{ref:check[1]},check[1],{coord:[4,5,6]},1,'kept in extras']);
    }
    const initial = { same: true, dirty: true, destination: 'previous.json', undo: true };
    assert.deepEqual(await evaluate('state()'), initial);
    const click = () => evaluate("document.querySelector('[data-action=saveas]').click()");
    const inject = mode => evaluate(`(async()=>{
      const mode = ${JSON.stringify(mode)};
      const destination = await opfs.getFileHandle('candidate.json',{create:true});
      window.writes = 0; window.aborts = 0; window.pickers = 0;
      window.showSaveFilePicker = async () => {
        pickers++;
        if(mode==='cancel') throw new DOMException('cancel','AbortError');
        if(mode==='deny-picker') throw new DOMException('denied','NotAllowedError');
        return {
          name:destination.name,
          async createWritable(options) {
            writes++;
            const writer=await destination.createWritable(options);
            return {
              async write(value) {
                if(mode==='deny-write') throw new DOMException('denied','NotAllowedError');
                if(mode==='late-edit') edit('保存中の追記');
                if(mode==='replace') core.setDocument(structuredClone(core.getDocument()),{intent:'open',source:'file',label:'other.json'});
                if(mode==='zero' && writes===1) return;
                if(mode==='wrong') return writer.write(typeof value==='string'?value.replace('{','['):(await value.text()).replace('{','['));
                return writer.write(value);
              },
              close:()=>{if(mode==='deny-close') throw new DOMException('denied','NotAllowedError'); return writer.close();}, abort:()=>{aborts++;return writer.abort();}
            };
          },
          getFile() {
            if(mode==='deny-read') throw new DOMException('denied','NotAllowedError');
            return destination.getFile();
          }
        };
      };
    })()`);
    const settled = () => waitFor(() => evaluate("!document.querySelector('[data-action=saveas]').disabled"), 'file action to settle');
    const listed = () => readdir(downloads);
    await inject('cancel'); await click();
    await waitFor(() => evaluate('/取消|cancelled/i.test(form())'), 'cancelled');
    await settled();
    assert.deepEqual(await evaluate('state()'), initial);
    assert.deepEqual(await listed(), []);
    assert.equal(await evaluate('writes'), 0);

    // A real navigation opens Chromium's beforeunload dialog. Choose Stay.
    const dialog = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('no beforeunload dialog')), 10000);
      events.addEventListener('Page.javascriptDialogOpening', ({ detail }) => {
        clearTimeout(timer);
        cmd('Page.handleJavaScriptDialog', { accept: false }).then(() => resolve(detail.type), reject);
      }, { once: true });
    });
    await cmd('Runtime.evaluate', { expression: "setTimeout(()=>location.assign('/'),0)", userGesture: true });
    assert.equal(await dialog, 'beforeunload');
    assert.deepEqual(await evaluate('state()'), initial);

    let downloaded, downloadedWork;
    for (const mode of ['deny-read','wrong','deny-write','deny-close','deny-picker','no-picker']) {
      const prior = new Set(await listed());
      await inject(mode);
      if (mode==='no-picker') await evaluate('window.showSaveFilePicker=undefined');
      await click();
      const filename = await waitFor(async () => (await listed()).find(f => !prior.has(f) && /^[a-f\d-]{36}$/.test(f)), mode + ' download', 12000)
        .catch(async error => { throw new Error(error.message + ': ' + JSON.stringify(await evaluate('({hud:form(),writes,pickers})')), {cause:error}); });
      await settled();
      const copy = JSON.parse(await readFile(path.join(downloads, filename), 'utf8'));
      downloaded = path.join(downloads, filename); downloadedWork = copy;
      assert.deepEqual(copy, await evaluate('output()'), mode + ' downloaded JSON');
      assert.deepEqual(await evaluate('state()'), initial, mode + ' retained document, history and target');
      assert.equal(await evaluate('writes'), ['deny-picker','no-picker'].includes(mode) ? 0 : 1, mode + ' must not retry writing to the candidate');
      assert.equal(await evaluate('aborts'), ['deny-write','deny-close'].includes(mode) ? 1 : 0);
      assert.equal(await evaluate('(async()=>(await old.getFile()).text())()'), 'previous bytes');
    }
    await inject('zero'); await click();
    await waitFor(() => evaluate("!core.isDirty() && core.getSaveHandle()?.name==='candidate.json'"), 'verified retry');
    await settled();
    assert.equal(await evaluate('writes'), 2, 'retry a measured empty file once');
    assert.deepEqual(await evaluate("(async()=>JSON.parse(await (await (await opfs.getFileHandle('candidate.json')).getFile()).text()))()"), await evaluate('output()'));
    await evaluate("edit('上書き保存'); document.querySelector('[data-action=save]').click()");
    await waitFor(() => evaluate('!core.isDirty() && writes===3'), 'overwrite verified destination');
    await settled();
    assert.equal(await evaluate('pickers'), 1, 'overwrite needs no further picker');
    assert.deepEqual(await evaluate("(async()=>JSON.parse(await (await (await opfs.getFileHandle('candidate.json')).getFile()).text()))()"), await evaluate('output()'));
    await evaluate("edit('次の編集')");
    await inject('late-edit'); await click();
    await waitFor(() => evaluate("writes===1 && /保存完了|Saved As/.test(form()) && !document.querySelector('[data-action=saveas]').disabled"), 'late edit write');
    assert.equal(await evaluate('core.isDirty()'), true, 'a subsequent edit is still dirty');
    await inject('replace'); await click();
    await waitFor(() => evaluate("core.getDocumentLabel()==='other.json'"), 'replacement while writing');
    await settled();
    assert.equal(await evaluate('core.getSaveHandle()?.name??null'), null, 'newly opened file cannot inherit an old target');
    // Reopen the actual file Chromium downloaded using the normal file-input path.
    await evaluate("window.reopenChanges=0; document.querySelector('[data-role=file-input]').addEventListener('change',()=>window.reopenChanges++)");
    const {root} = await cmd('DOM.getDocument');
    const {nodeId} = await cmd('DOM.querySelector', {nodeId:root.nodeId,selector:'[data-role=file-input]'});
    await cmd('DOM.setFileInputFiles', {nodeId,files:[downloaded]});
    await waitFor(() => evaluate('core.getDocumentLabel()===' + JSON.stringify(path.basename(downloaded))), 'reopen downloaded work',10000)
      .catch(async error => {throw new Error(error.message + ': ' + JSON.stringify(await evaluate("({hud:form(),label:core.getDocumentLabel(),state:state(),input:document.querySelector('[data-role=file-input]').value,changes:window.reopenChanges})")))});
    assert.deepEqual(await evaluate('output()'), downloadedWork, 'reopened document and drafts');
    assert.equal(await evaluate('core.isDirty()'), false);
    console.log('[save-recovery] PASS ' + base + ' picker cancel/deny/missing, write and close abort, read denial, wrong bytes, actual download and reopen, real Stay, zero retry, overwrite and late edit/replacement');
  });
} finally { await server.close(); }
