// Exercise the shipped file-input and picker handlers. DOM, OS pickers, schema
// validator and WebGL bridge are boundary doubles; no browser/network is used.
// Real File objects supply size/bytes; oversize reads must never be invoked.
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ssot = new URL('../../../reconstruction/ssot/', import.meta.url);
const MAX_BYTES = 32 * 1024 * 1024;
const scene = { document_meta: { title: 'incoming' }, points: [], lines: [], aux: [] };
const json = JSON.stringify(scene);
const exactFile = new File([json, ' '.repeat(MAX_BYTES - Buffer.byteLength(json))], 'boundary.json');
const largeFile = new File([exactFile, ' '], 'oversize.json');
assert.equal(exactFile.size, MAX_BYTES);
assert.equal(largeFile.size, MAX_BYTES + 1);

class Element {
  constructor() {
    this.listeners = {}; this.dataset = {}; this.value = ''; this.files = [];
    this.textContent = ''; this.children = []; this.disabled = false;
    this.classList = { toggle() {} };
  }
  addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); }
  removeEventListener() {}
  setAttribute() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  click() { this.clicked = true; }
  dispatch(type) { for (const listener of this.listeners[type] ?? []) listener({ target: this }); }
}
const plain = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
function observedFile(file, { textOnly = false, rejectReads = false, events = [] } = {}) {
  const reads = { text: 0, arrayBuffer: 0 };
  const result = {
    size: file.size, name: file.name,
    async text() { reads.text++; events.push('text'); assert(!rejectReads, 'oversize .text() called'); return file.text(); },
  };
  if (!textOnly) result.arrayBuffer = async () => {
    reads.arrayBuffer++; events.push('arrayBuffer'); assert(!rejectReads, 'oversize .arrayBuffer() called'); return file.arrayBuffer();
  };
  return { file: result, reads };
}
function globals() {
  const nodes = new Map();
  const document = {
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); },
    createElement: () => new Element(), createTextNode: text => ({ textContent: text }),
  };
  const location = { origin: 'https://example.test', href: 'https://example.test/', search: '' };
  const window = { location, addEventListener() {}, confirm() { throw new Error('unexpected confirmation'); } };
  return {
    module: { exports: {} }, window, document, location, nodes,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout,
    console: { debug() {} }, HTMLElement: Element, HTMLButtonElement: Element, HTMLInputElement: Element,
    HTMLCanvasElement: Element, localStorage: { getItem() { return null; } },
  };
}
async function bundle(entry, plugins = []) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(entry, ssot))], bundle: true,
    format: 'cjs', platform: 'node', write: false, logLevel: 'silent', plugins });
  return result.outputFiles[0].text;
}
const toolbarCode = await bundle('modeler_app/ui/controllers/uiToolbarController.js');

function modeler({ fsa = false, file, cancelPicker = false, draftAllowed = true, discardAllowed = true } = {}) {
  const sandbox = globals(), events = [], hud = [], fileInput = new Element();
  const state = { document: { ...scene, document_meta: { title: 'existing' } }, dirty: true,
    undo: ['existing edit'], redo: ['redo edit'], draft: { title: 'unapplied' },
    saveLabel: 'existing.json', saveHandle: 'existing-handle', workContext: { source: 'retained' } };
  const core = {
    getDocument: () => state.document, getUiState: () => ({}), canUndo: () => true, canRedo: () => true,
    setDocument(doc, meta) {
      events.push('setDocument'); state.document = plain(doc); state.dirty = false;
      state.undo = []; state.redo = []; state.saveLabel = meta.saveLabel; state.saveHandle = meta.saveHandle;
      state.workContext = meta.workContext;
    },
  };
  const handle = { async getFile() { events.push('getFile'); return file; } };
  sandbox.window.showOpenFilePicker = async () => {
    events.push('picker');
    if (cancelPicker) throw Object.assign(new Error('cancel'), { name: 'AbortError' });
    return [handle];
  };
  vm.runInNewContext(toolbarCode, sandbox);
  const toolbar = sandbox.module.exports.createUiToolbarController({
    root: new Element(), core, signal: new AbortController().signal, hub: {}, fileInput,
    propertyController: {
      isDirty: () => !!state.draft,
      ensureEditsAppliedOrConfirm() {
        events.push('draft');
        if (!draftAllowed) return false;
        state.draft = null; state.dirty = true; state.undo.push('applied draft'); return true;
      },
    },
    fileController: {
      canUseOpenFsa: () => fsa, withFocusRestore: fn => fn(), isCoreDirty: () => state.dirty,
      confirmDiscardIfDirty() { events.push('discard'); return discardAllowed; },
      syncTitle() { events.push('title'); },
    },
    prepareOpenedDocument(raw) { events.push('prepare'); return { doc: raw }; },
    selectionController: {}, renderOutliner() {}, setHud: message => hud.push(message),
  });
  return { state, events, hud, fileInput, handle,
    async open() {
      await toolbar.invoke('open');
      if (!fsa) { fileInput.files = file ? [file] : []; fileInput.value = 'selected'; fileInput.dispatch('change'); await settle(); }
    },
  };
}

for (const fsa of [true, false]) {
  const seen = observedFile(largeFile, { rejectReads: true });
  const env = modeler({ fsa, file: seen.file }); const before = plain(env.state);
  await env.open();
  assert.deepEqual(env.state, before, `${fsa ? 'FSA' : 'input'}: oversize preserves work, dirty, history, draft and save target`);
  assert.deepEqual(seen.reads, { text: 0, arrayBuffer: 0 });
  assert(!env.events.includes('draft') && !env.events.includes('discard') && !env.events.includes('prepare'));
  assert.match(env.hud.at(-1), /32 MiB/);
  if (!fsa) assert.equal(env.fileInput.value, '', 'same file can be selected again after refusal');

  const canceled = modeler({ fsa, cancelPicker: fsa }); const canceledBefore = plain(canceled.state);
  await canceled.open();
  assert.deepEqual(canceled.state, canceledBefore, 'picker cancel/no selection preserves unapplied edits');
  assert(!canceled.events.includes('draft') && !canceled.events.includes('discard'));

  const allowed = observedFile(exactFile, { textOnly: !fsa });
  const accepted = modeler({ fsa, file: allowed.file });
  await accepted.open();
  assert.deepEqual(accepted.state.document, scene, 'exactly 32 MiB passes local guard and JSON parse');
  assert.equal(allowed.reads[fsa ? 'arrayBuffer' : 'text'], 1);
  assert.deepEqual(accepted.events.filter(e => ['draft', 'discard', 'prepare', 'setDocument'].includes(e)),
    ['draft', 'discard', 'prepare', 'setDocument'], 'capacity-in-range keeps existing draft/dirty/open order');
  assert.equal(accepted.state.saveHandle, fsa ? accepted.handle : null);

  for (const options of [{ draftAllowed: false }, { discardAllowed: false }]) {
    const small = observedFile(new File([json], 'small.json'));
    const stopped = modeler({ fsa, file: small.file, ...options });
    const currentDocument = plain(stopped.state.document);
    await stopped.open();
    assert.deepEqual(stopped.state.document, currentDocument, 'existing resolution refusal prevents replacement');
    assert.deepEqual(small.reads, { text: 0, arrayBuffer: 0 });
    assert(!stopped.events.includes('prepare'));
    if (options.draftAllowed === false) assert(!stopped.events.includes('discard'));
  }
}

// Keep the actual Viewer boot, read model, reading index, browsing controller
// and controls. Only the expensive renderer/schema boundaries are replaced.
const viewerCode = await bundle('contract_viewer/boot.js', [{
  name: 'renderer-validator-boundaries',
  setup(plugin) {
    plugin.onResolve({ filter: /(?:viewerHost|viewerBridge|coreControllers)\.js$/ }, args => ({ path: args.path, namespace: 'file-size-test' }));
    plugin.onLoad({ filter: /.*/, namespace: 'file-size-test' }, args => ({ loader: 'js', contents:
      args.path.endsWith('coreControllers.js') ? 'export const createCoreControllers = () => globalThis.testCore;'
        : args.path.endsWith('viewerHost.js') ? 'export const mountViewerHost = async () => globalThis.testHost;'
          : 'export const createViewerBridge = () => globalThis.testBridge;' }));
  },
}]);
const viewer = globals();
viewer.testCore = { validator: { ensureInitialized() {}, validate() { return true; } } };
let bridgeState = { frame: 0, filters: { points: true, lines: true, aux: true }, selection: null };
viewer.testBridge = {
  snapshot: () => structuredClone(bridgeState), restore: state => { bridgeState = structuredClone(state); },
  waitForPaint() {}, subscribe() {}, subscribeState() {}, dispose() {},
};
viewer.testHost = { dispose() {} };
vm.runInNewContext(viewerCode, viewer);
await viewer.window.viewerBootReady;
assert.equal((await viewer.window.viewerDiagnostics.openText(JSON.stringify({ ...scene, document_meta: { title: 'existing' } }), 'existing.json')).ok, true);
await viewer.window.viewerDiagnostics.search('retained query');
const beforeModel = plain(viewer.window.contractViewerSnapshot());
const beforeView = plain(viewer.window.viewerDiagnostics.snapshot());
const input = viewer.document.getElementById('contract-open');
const oversize = observedFile(largeFile, { rejectReads: true });
input.files = [oversize.file]; input.value = 'selected'; input.dispatch('change'); await settle();
assert.deepEqual(oversize.reads, { text: 0, arrayBuffer: 0 });
assert.deepEqual(plain(viewer.window.contractViewerSnapshot()), beforeModel, 'Viewer file-input refusal preserves current model');
assert.deepEqual(plain(viewer.window.viewerDiagnostics.snapshot()), beforeView, 'Viewer refusal preserves query and browsing state');
assert.match(viewer.document.getElementById('contract-status').textContent, /32 MiB/);
assert.equal(input.value, '', 'Viewer resets input after refusal');
input.files = []; input.dispatch('change'); await settle();
assert.deepEqual(plain(viewer.window.viewerDiagnostics.snapshot()), beforeView, 'Viewer selection cancel preserves state');

const allowedViewer = observedFile(exactFile);
input.files = [allowedViewer.file]; input.dispatch('change'); await settle();
assert.deepEqual(plain(viewer.window.contractViewerSnapshot()), scene, 'Viewer exact boundary reaches actual parser/controller');
assert.deepEqual(allowedViewer.reads, { text: 1, arrayBuffer: 0 });
assert.equal(input.value, '');

console.log('[check:local-file-size] PASS: 32 MiB boundary; oversize reads=0; Modeler FSA/input and Viewer input; draft/dirty/history/save-target/current-view retention; cancel and existing resolution gates. DOM/renderer/schema boundaries simulated.');
