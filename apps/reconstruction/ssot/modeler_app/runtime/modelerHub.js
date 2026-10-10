// modeler/runtime/modelerHub.js
// Hub layer (transaction orchestrator).
// - provides start/stop/dispose/resize
// - provides pickObjectAt (raycast)
// - exposes core controllers to UI (via ui/hubFacade.js only)

import { createCoreControllers } from "./core/coreControllers.js";
import { createRenderer } from "./renderer/modelerRenderer.js";
import { isContractWork, parseContractWork, contractContext, assembleContractWork, operateContractWork, inspectContractWork, readContractMeaning, compareContractWork, createEmptyContractWork } from "./contractWork.js";
import { isWorkPackage, parseWorkPackage, serializeWorkPackage, createWorkReadContext } from "./workPackage.js";

import { createImportReviewWork, getImportReviewInfo, verifyImportReviewOriginal } from "./importReview.js";
import { inspectLegacyDisplayGroups, resolveLegacyDisplayGroup, translateLegacyDisplayGroup } from "./legacyDisplayGroups.js";

function asEl(elOrId) {
  if (!elOrId) return null;
  if (typeof elOrId === "string") return document.getElementById(elOrId);
  return elOrId;
}

function getCanvasFromRoot(root) {
  if (!root) return null;
  const byRole = root.querySelector('[data-role="modeler-canvas"]');
  if (byRole && byRole instanceof HTMLCanvasElement) return byRole;
  const byId = root.querySelector("#modeler-canvas");
  if (byId && byId instanceof HTMLCanvasElement) return byId;
  return null;
}

function makeEmitter() {
  const map = new Map();
  return {
    on(type, fn) {
      if (!map.has(type)) map.set(type, new Set());
      map.get(type).add(fn);
      return () => map.get(type)?.delete(fn);
    },
    emit(type, payload) {
      const set = map.get(type);
      if (!set) return;
      for (const fn of [...set]) {
        try {
          fn(payload);
        } catch (_e) {}
      }
    }
  };
}

function findPathByUuid(doc, uuid, kindHint) {
  if (!doc || !uuid) return null;
  const u = String(uuid);
  const kind = kindHint ? String(kindHint) : null;
  const tryList = (arr, base) => {
    if (!Array.isArray(arr)) return null;
    for (let i = 0; i < arr.length; i += 1) {
      const it = arr[i];
      const id = it?.meta?.uuid || it?.uuid;
      if (id === u) return `${base}/${i}`;
    }
    return null;
  };
  if (kind === 'point') return tryList(doc.points, '/points');
  if (kind === 'line') return tryList(doc.lines, '/lines');
  if (kind === 'aux') return tryList(doc.aux, '/aux');
  return (
    tryList(doc.points, '/points') ||
    tryList(doc.lines, '/lines') ||
    tryList(doc.aux, '/aux') ||
    null
  );
}

/**
 * Port: entry.bootstrapModeler
 * @param {HTMLElement|string} rootElOrId
 * @param {Object} [options]
 * @returns {any} hub
 */
export function createModelerHub(rootElOrId, options = {}) {
  const root = asEl(rootElOrId);
  if (!root) throw new Error("bootstrapModeler: root element not found");
  const canvas = getCanvasFromRoot(root);
  if (!canvas) throw new Error("bootstrapModeler: canvas not found");

  const emitter = makeEmitter();
  const core = createCoreControllers(emitter);
  const renderer = createRenderer(canvas, emitter);
  // Immutable authoring context. The editable scene remains owned by core.
  // Sources describe baselineScene; scene changes remain comparison drafts.
  let workPackage = null;
  let workReadContext = null;
  let correspondingUuids = new Map();
  let legacyDisplayInspection = null;
  let loadDiagnostics = null;
  // These are read-only derived views, not save/validation results. UI-only
  // selection/scope changes must not serialize the complete authoring envelope.
  let derivedDocument = null;
  let derivedViews = new Map();
  const invalidateDerived = () => { derivedDocument = null; derivedViews.clear(); };
  const readDerived = (key, compute) => {
    const doc = core.document.get();
    if (derivedDocument !== doc) { derivedDocument = doc; derivedViews.clear(); }
    if (!derivedViews.has(key)) derivedViews.set(key, compute(doc));
    // Callers receive independent values, as before; they cannot poison the cache.
    return JSON.parse(JSON.stringify(derivedViews.get(key)));
  };

  // Preload schema validator early so Save/SaveAs/Export can do a synchronous strict gate
  // without breaking File System Access user-activation requirements.
  // If this fails, UI will block strict-gated actions and show the reason.
  try {
    const p = core?.validator?.ensureInitialized?.();
    if (p && typeof p.then === "function") p.catch(() => {});
  } catch (_) {}

  // wire: when doc changes -> renderer
  let lastVisibility = { hidden: [], solo: null };
  emitter.on("document", (doc) => {
    invalidateDerived();
    renderer.setDocument(doc);
    // Re-apply UI-only visibility after rebuild.
    renderer.applyVisibility(lastVisibility);
  });

  // wire: UI-only visibility -> renderer
  emitter.on("visibility", (payload) => {
    lastVisibility = payload || { hidden: [], solo: null };
    renderer.applyVisibility(lastVisibility);
  });

  // wire: UI state (frameIndex) -> renderer
  emitter.on("uistate", (st) => {
    try { renderer.setFrameIndex?.(st?.frameIndex ?? 0); } catch {}
    try { renderer.setInteractionState?.({activeTool: st?.activeTool, orbitEnabled: st?.orbitEnabled}); } catch {}
    try { renderer.setWorldAxisMode?.(st?.worldAxisMode ?? "fixed"); } catch {}
    try { renderer.setExplorationScope?.(st?.explorationScope ?? null); } catch {}
  });

  emitter.on("selection", (ids) => renderer.setSelection?.(ids || []));
  emitter.on("document-replaced", () => {
    renderer.fitDocument?.();
  });


  

  // wire: focus (QuickCheck jump) -> renderer camera focus
  emitter.on("focus", (issue) => {
    try {
      const uuid = issue && typeof issue === "object" ? issue.uuid : null;
      if (uuid) renderer.focusOnUuid?.(uuid, { smooth: true, durationMs: 260 });
    } catch {}
  });

let disposed = false;

  const hub = {
    core,

    on: emitter.on,

    getLoadDiagnostics() { return loadDiagnostics ? structuredClone(loadDiagnostics) : null; },
    async prepareOpenedDocument(raw) {
      const started = performance.now();
      let previous = started;
      const counts = scene => ({points:scene?.points?.length || 0, lines:scene?.lines?.length || 0, aux:scene?.aux?.length || 0});
      const diagnostics = {scope:'prepare-open CPU/wait phases; renderer startup is reported separately',
        sceneCounts:counts(raw?.scene || raw), baselineCounts:raw?.baselineScene ? counts(raw.baselineScene) : null,
        phases:[], complete:false};
      loadDiagnostics = diagnostics;
      const phase = name => { const now=performance.now(); diagnostics.phases.push({name,ms:now-previous}); previous=now; };
      const complete = () => { diagnostics.complete=true; diagnostics.totalMs=performance.now()-started; };

      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("文書はJSONオブジェクトである必要があります");
      if (isContractWork(raw)) {
        const work = parseContractWork(raw);
        phase("contract-parse");
        if (getImportReviewInfo(work) && !await verifyImportReviewOriginal(work)) throw new Error("保持した原文の照合に失敗しました。作品は切り替えていません。");
        phase("retained-source-verify");
        await core.validator.ensureWorkInitialized();
        phase("contract-validator-ready");
        if (!core.validator.validateWork(work)) throw new Error('作品の形式に不正な項目があります。' + JSON.stringify(core.validator.getWorkErrors()));
        if (!core.validator.validate(work.scene) || !core.validator.validate(work.baselineScene)) throw new Error("作品契約の図が3DSS検査に合格しません。原文を変更せず読込みを中止しました。");
        phase("contract-and-scene-validation");
        const result = { doc: work.scene, extras: null, work, workContext: contractContext(work) };
        phase("contract-context"); complete();
        return result;
      }
      let work = null;
      let candidate = raw;
      if (isWorkPackage(raw)) {
        work = parseWorkPackage(raw);
        phase("legacy-work-parse");
        candidate = JSON.parse(JSON.stringify(work.scene));
      } else if (raw.format || raw.profile || (!raw.document_meta && !Array.isArray(raw.points) && !Array.isArray(raw.lines) && !Array.isArray(raw.aux))) {
        throw new Error("この一式形式は通常Modelerで未対応です。対応する入口で開いてください");
      }
      phase("scene-copy");
      const normalized = await core.import.normalize(candidate);
      phase("scene-normalize");
      // Legacy import may add defaults, but it must not erase/coerce received
      // values behind the user's back. Unhandled migration remains explicit.
      const preserved = (before, after) => {
        if (before === null || typeof before !== 'object') return Object.is(before, after);
        if (!after || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after)) return false;
        return Object.keys(before).every(k => Object.hasOwn(after,k) && preserved(before[k],after[k]));
      };
      if (!preserved(candidate, normalized?.strictDoc)) throw new Error("旧形式・未対応項目を変更する取込みは停止しました。元ファイルは変更していません。現行3DSSとしての修正か、原資料を保持する明示的な移行が必要です。");
      if (!normalized?.strictDoc) throw new Error("3DSS文書を読み取れませんでした");
      phase("original-values-preserved");
      const legacyDisplayInspection = work ? await inspectLegacyDisplayGroups(work) : null;
      phase("display-group-eligibility"); complete();
      return { doc: normalized.strictDoc, extras: normalized.extras || null, work, legacyDisplayInspection };
    },

    async prepareUninterpretedImport(rawText, meta = {}, error) {
      const work = await createImportReviewWork(rawText, {filename: meta.label || 'import.json', diagnostics: [String(error?.message || error || '形式を解釈できません')]});
      return {...await hub.prepareOpenedDocument(work), recoveredImport: true};
    },

    acceptOpenedDocument(result) {
      const context = result?.work && !isContractWork(result.work) ? createWorkReadContext(result.work) : null;
      workReadContext = context;
      legacyDisplayInspection = result?.legacyDisplayInspection || null;
      workPackage = context?.work || null;
      invalidateDerived();
      correspondingUuids = new Map();
      if (workPackage) {
        for (const group of context.getOccurrenceGroups()) {
          for (const uuid of group.uuids) correspondingUuids.set(uuid, group.uuids);
        }
      }
    },

    clearWorkPackage() { legacyDisplayInspection = null; workPackage = null; workReadContext = null; correspondingUuids = new Map(); invalidateDerived(); },
    getLegacyDisplayGroup(uuid) { return resolveLegacyDisplayGroup(legacyDisplayInspection, uuid); },
    applyLegacyDisplayGroupMove(uuid, position) {
      const group = hub.getLegacyDisplayGroup(uuid);
      if (!group) throw new Error('この要素の表示まとまりは検査されていません。');
      const scene = core.document.get();
      const anchor = scene.points.find(p => p.meta?.uuid === group.anchor)?.appearance?.position;
      if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite) || !anchor) throw new Error('移動位置が不正です。');
      const affected = new Set(group.uuids);
      for (const line of scene.lines || []) if (affected.has(line.appearance?.end_a?.ref) || affected.has(line.appearance?.end_b?.ref)) affected.add(line.meta?.uuid);
      if (core.lock.list().some(id => affected.has(id))) throw new Error('表示部品または接続線がロックされています。');
      const delta = position.map((v,i) => v - anchor[i]);
      core.edit.updateDocument(current => translateLegacyDisplayGroup(current, group, delta));
      return core.document.get();
    },
    getWorkPackage() { return core.work.getContext() ? hub.getContractWork() : workPackage; },
    prepareWorkPackage(scene, work = hub.getWorkPackage()) { return isContractWork(work) ? assembleContractWork(scene, contractContext(work)) : serializeWorkPackage(work, scene); },
    validateWorkPackage(work) {
      if (isContractWork(work)) {
        parseContractWork(work);
        if (!core.validator.validateWork(work)) throw new Error('作品の形式検査に合格しません。' + JSON.stringify(core.validator.getWorkErrors()));
      } else parseWorkPackage(work);
      return true;
    },
    getWorkComparison() { return hub.isContractWork() ? compareContractWork(hub.getContractWork()) : workReadContext ? readDerived("comparison", workReadContext.getWorkComparison) : null; },
    isContractWork() { return !!core.work.getContext(); },
    getContractWork() { const context = core.work.getContext(); return context ? assembleContractWork(core.document.get(), context) : null; },
    getContractInspection(uuid) { return hub.isContractWork() ? inspectContractWork(hub.getContractWork(), uuid) : null; },
    resolveContractSelection(uuid) { return hub.getContractInspection(uuid); },
    getContractMeaning() { return hub.isContractWork() ? readContractMeaning(hub.getContractWork()) : null; },
    applyContractOperation(operation) {
      core.work.update(state => {
        const updated = operateContractWork(assembleContractWork(state.scene, state.workContext), operation);
        return { scene: updated.scene, workContext: contractContext(updated) };
      }, {operation});
      return hub.getContractWork();
    },
    setContractDraft(key, raw) { return hub.applyContractOperation({type:'draft-input',key,value:raw}); },
    discardContractDraft(key) { return hub.applyContractOperation({type:'discard-draft',key}); },
    createContractPoint(options = {}) {
      const work = hub.applyContractOperation({type:'create-point',...options});
      const occurrence = work.contract.occurrences.at(-1);
      core.selection.set([occurrence.anchor]);
      return { uuid: occurrence.anchor, occurrence: occurrence.id, target: occurrence.target };
    },
    createContractRelation(options = {}) {
      const work = hub.applyContractOperation({type:'create-relation',...options});
      return work.contract.draft.pendingRelations.at(-1);
    },
    newContractWork() {
      core.validator.ensureWorkInitialized().catch(error => console.error(error));
      const work = createEmptyContractWork();
      hub.clearWorkPackage();
      core.document.set(work.scene,{source:'memory',intent:'new',label:'新しい作品',workContext:contractContext(work)});
      return hub.getContractWork();
    },
    getUnplacedSourceRecords() { return workReadContext ? readDerived("unplaced", workReadContext.getUnplacedSourceRecords) : []; },
    getCorrespondingUuids(uuid) {
      if(hub.isContractWork()) {
        const c=hub.getContractWork().contract;
        const o=c.occurrences.find(o=>[o.anchor,o.label,o.port].includes(uuid));
        if(o) return c.occurrences.filter(x=>x.target===o.target).flatMap(x=>[x.anchor,x.label,x.port]);
      }
      return [...(correspondingUuids.get(uuid) || [uuid])];
    },

    getViewState() { return renderer.getViewState?.() ?? null; },
    setViewState(state) { return renderer.setViewState?.(state) ?? false; },
    fitDocument() { return renderer.fitDocument?.() ?? false; },

    start() {
      if (disposed) return;
      renderer.start();
    },

    stop() {
      if (disposed) return;
      renderer.stop();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.dispose();
    },

    resize(width, height, dpr) {
      if (disposed) return;
      renderer.resize(width, height, dpr);
    },

    pickObjectAt(ndcX, ndcY) {
      if (disposed) return null;
      return renderer.pickObjectAt(ndcX, ndcY);
    },

    worldPointOnPlaneZ(ndcX, ndcY, planeZ) {
      if (disposed) return null;
      return renderer.worldPointOnPlaneZ?.(Number(ndcX), Number(ndcY), Number(planeZ));
    },


    projectToNdc(worldPos) {
      if (disposed) return null;
      try { return renderer.projectToNdc?.(worldPos) ?? null; } catch { return null; }
    },


    getDebugPoseSnapshot(opts = {}) {
      if (disposed) return null;
      try { return renderer.getDebugPoseSnapshot?.(opts) ?? null; } catch (_e) { return null; }
    },

    previewPositions(entries) { if (!disposed) return renderer.previewPositions?.(entries); },
    clearPositionPreview() { if (!disposed) return renderer.clearPositionPreview?.(); },
    setInteractionState(state) { if (!disposed) return renderer.setInteractionState?.(state); },
    getRenderDiagnostics() { return renderer.getRenderDiagnostics?.(); },
    previewSetPosition(uuid, pos) {
      if (disposed) return;
      renderer.previewSetPosition?.(uuid, pos);
    },

    previewSetLineEnds(uuid, endA, endB) {
      if (disposed) return;
      renderer.previewSetLineEnds?.(uuid, endA, endB);
    },

    previewSetCaptionText(uuid, captionText, fallbackText) {
      if (disposed) return;
      renderer.previewSetCaptionText?.(uuid, captionText, fallbackText);
    },

    previewSetOverride(kind, uuid, payload) {
      if (disposed) return;
      renderer.previewSetOverride?.(kind, uuid, payload);
    },

    // UI-oriented pick helper: raycast + resolve into an issue-like selection object
    applyPickAt({ ndcX, ndcY } = {}) {
      if (disposed) return null;
      const hit = renderer.pickObjectAt(Number(ndcX), Number(ndcY));
      if (!hit || !hit.uuid) return null;
      const doc = core.document.get();
      const path = findPathByUuid(doc, hit.uuid, hit.kind) || null;
      return { uuid: hit.uuid, kind: hit.kind, path };
    }
  };

  // dev boot log
  if (options && options.devBootLog) {
    console.log("[BOOT] modeler bootstrap ok");
  }

  return hub;
}

/**
 * Convenience helper used by entry.bootstrapModelerFromUrl (declared in manifest.yaml):
 * bootstrap + fetch document + set core.document
 */
export async function createModelerHubFromUrl(rootElOrId, url, options = {}) {
  let phaseStart = performance.now();
  const recordPhase = (phase) => {
    const now = performance.now();
    try { options.onStartupPhase?.(phase, now - phaseStart); } catch {}
    phaseStart = now;
  };
  const hub = createModelerHub(rootElOrId, options);
  recordPhase("hub-init");
  if (url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`fetch failed ${r.status} ${url}`);
    const raw = await r.json();
    recordPhase("fetch-json");
    const result = await hub.prepareOpenedDocument(raw);
    recordPhase("normalize");
    hub.acceptOpenedDocument(result);
    recordPhase("work-context");
    hub.core.document.set(result.doc, { source: "url", intent: "open", label: url, extras: result.extras, workContext: result.workContext });
    recordPhase("document-render");
  }
  return hub;
}
