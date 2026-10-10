import { plateRenderSpec } from '../shared/renderConventions.js';

// Read-only browsing state bridge. No document, renderer or semantic mutator is exposed.
const KINDS = ['points', 'lines', 'aux'];
const copy = value => value == null ? value : structuredClone(value);
const xyz = value => Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(Number.isFinite) ? value.slice(0, 3) : null;

export function createViewerBridge(mountedViewer, { scene = null, timeoutMs = 15000 } = {}) {
  const hub = mountedViewer?.hub;
  if (!hub?.browsing?.apply) throw new Error('Viewer bridge requires readOnlyBrowsing: true');
  const core = hub.core;
  let disposed = false;
  const listeners = new Set();
  const stateListeners = new Set();
  const records = new Map();
  for (const kind of KINDS) for (const item of scene?.[kind] ?? []) {
    const uuid = item.meta?.uuid;
    if (uuid) records.set(uuid, { kind, item });
  }
  const lookup = uuid => records.get(uuid) ?? core.structIndex?.uuidToItem?.get?.(uuid) ?? null;
  const isVisible = uuid => KINDS.some(kind => core.uiState?.visibleSet?.[kind]?.has?.(uuid));
  function getSelection() {
    const selected = core.selection?.get?.();
    if (!selected?.uuid) return null;
    const kind = lookup(selected.uuid)?.kind ?? selected.kind ?? null;
    return { uuid: selected.uuid, kind, visible: isVisible(selected.uuid) };
  }
  const initialCamera = copy(core.camera.getState());
  let scopeReference = core.filters.get().allowedUuids, scopeRevision = 0;
  function stateKey() {
    const filters = core.filters.get(), controls = hub.browsing.getControls();
    if (filters.allowedUuids !== scopeReference) { scopeReference = filters.allowedUuids; scopeRevision++; }
    // Camera coordinates are deliberately excluded: a running orbit must not
    // rebuild reading panels on every animation frame. History snapshots still
    // take an exact camera copy when requested.
    const { microReturnCamera: _returnCamera, ...visibleControls } = controls;
    return JSON.stringify({frame:core.frame.getActive(),selection:getSelection(),scopeRevision,
      filters:KINDS.map(kind=>filters.types?.[kind] ?? filters[kind] ?? true),controls:visibleControls});
  }
  let previousSelection = JSON.stringify(getSelection());
  let previousState = stateKey();
  const unsubscribe = hub.onAfterRender(() => {
    if (disposed) return;
    const selection = getSelection(), key = JSON.stringify(selection);
    if (key !== previousSelection) {
      previousSelection = key;
      for (const listener of listeners) listener(copy(selection));
    }
    const nextState = stateKey();
    if (nextState !== previousState) {
      previousState = nextState;
      if (stateListeners.size) {
        const state = snapshot();
        for (const listener of stateListeners) listener(copy(state));
      }
    }
  });
  const requireAlive = () => { if (disposed) throw new Error('Viewer bridge has been disposed'); };
  const waitForPaint = () => { requireAlive(); return hub.whenPainted({ timeoutMs }); };
  async function apply(state, restore = false) {
    requireAlive();
    if (!hub.browsing.apply(state, { restore })) throw new Error('Viewer did not accept browsing state');
    await waitForPaint();
    return snapshot();
  }
  async function control(action, value) {
    requireAlive();
    if (!hub.browsing.control(action, value)) throw new Error('Viewerが操作を受け付けませんでした。');
    await waitForPaint();
    return snapshot();
  }
  function snapshot() {
    requireAlive();
    const filters = core.filters.get();
    const scope = filters.allowedUuids;
    return {
      frame: core.frame.getActive(),
      filters: Object.fromEntries(KINDS.map(kind => [kind, filters.types?.[kind] ?? filters[kind] ?? true])),
      scope: scope == null ? null : Array.from(scope),
      selection: getSelection(),
      camera: copy(core.camera.getState()),
      controls: copy(hub.browsing.getControls()),
    };
  }
  function select(uuid, kind) {
    const record = uuid ? lookup(uuid) : null;
    if (uuid && !record) return Promise.reject(new Error(`Unknown scene element: ${uuid}`));
    return apply({ selection: record ? { uuid, kind: record.kind ?? kind } : null });
  }
  function setFrame(frame) {
    if (!Number.isInteger(frame)) return Promise.reject(new Error('Frame must be an integer'));
    return control('setFrame', frame);
  }
  function setFilters(filters) {
    const clean = {};
    for (const kind of KINDS) if (typeof filters?.[kind] === 'boolean') clean[kind] = filters[kind];
    return apply({ filters: clean });
  }
  function setScope(uuids) {
    if (uuids != null && !Array.isArray(uuids) && !(uuids instanceof Set)) return Promise.reject(new Error('Scope must be UUIDs or null'));
    return apply({ scope: uuids == null ? null : [...new Set(uuids)].filter(uuid => lookup(uuid)) });
  }
  function restore(state) {
    if (!state || typeof state !== 'object') return Promise.reject(new Error('Browsing snapshot is required'));
    // Clone before queueing: subsequent caller edits cannot alter the pending restoration.
    const saved = copy(state);
    return apply({ frame: saved.frame, filters: saved.filters, scope: saved.scope ?? null, selection: saved.selection ?? null, camera: saved.camera, controls: saved.controls }, true);
  }
  function frameStep(delta) {
    if (!Number.isInteger(delta)) return Promise.reject(new Error('表示の移動量は整数で指定してください。'));
    return control('frameStep', delta);
  }
  function setPlaying(playing) {
    if (typeof playing !== 'boolean') return Promise.reject(new Error('再生または停止を指定してください。'));
    return control('setPlaying', playing);
  }
  function cameraPreset(index) {
    if (!Number.isInteger(index) || index < 0 || index > 6) return Promise.reject(new Error('視点は0から6の番号で指定してください。'));
    return control('cameraPreset', index);
  }
  // Zoom is fractional: distance *= clamp(1 + delta, .05, 20).
  // A negative delta approaches; a positive delta retreats.
  function cameraZoom(delta) {
    if (!Number.isFinite(delta)) return Promise.reject(new Error('拡大・縮小の量は有限の数値で指定してください。'));
    return control('cameraZoom', delta);
  }
  // Orbit deltas are radians, with the same signs as core.camera.rotate.
  function cameraOrbit(dTheta, dPhi) {
    if (!Number.isFinite(dTheta) || !Number.isFinite(dPhi)) return Promise.reject(new Error('回転量は有限の数値で指定してください。'));
    return control('cameraOrbit', [dTheta, dPhi]);
  }
  function setAutoOrbit(options = {}) {
    if (!options || typeof options !== 'object') return Promise.reject(new Error('自動周回の設定を指定してください。'));
    const clean = {};
    if (options.enabled !== undefined) {
      if (typeof options.enabled !== 'boolean') return Promise.reject(new Error('自動周回の開始または停止を指定してください。'));
      clean.enabled = options.enabled;
    }
    if (options.direction !== undefined) {
      if (![1,-1].includes(options.direction)) return Promise.reject(new Error('自動周回の方向は正転または逆転を指定してください。'));
      clean.direction = options.direction;
    }
    if (options.speedLevel !== undefined) {
      if (![1,2,3].includes(options.speedLevel)) return Promise.reject(new Error('自動周回の速さは1から3で指定してください。'));
      clean.speedLevel = options.speedLevel;
    }
    return control('setAutoOrbit', clean);
  }
  function enterMicro() {
    const selection = getSelection();
    if (!selection?.visible) return Promise.reject(new Error('局所表示にする、画面に表示された要素を選んでください。'));
    return control('enterMicro');
  }
  function setViewerSettings(settings = {}) {
    if (!settings || typeof settings !== 'object') return Promise.reject(new Error('表示設定を指定してください。'));
    const validators = {
      worldAxesMode: value => [0,1,2].includes(value),
      microFXProfile: value => ['weak','normal','strong'].includes(value),
      lineWidthMode: value => ['auto','fixed','adaptive'].includes(value),
      fov: value => Number.isFinite(value) && value >= 1 && value <= 179,
    };
    const clean = {};
    for (const [key,value] of Object.entries(settings)) {
      if (!validators[key]?.(value)) return Promise.reject(new Error(`表示設定の値が正しくありません: ${key}`));
      clean[key] = value;
    }
    return control('setViewerSettings', clean);
  }
  function coordinates(uuid) {
    const record = lookup(uuid), item = record?.item, appearance = item?.appearance ?? {};
    if (!item) return [];
    if (record.kind !== 'lines') {
      const plate = appearance.module?.plate;
      const spec = plate ? plateRenderSpec(plate) : null;
      const center = xyz(spec?.position ?? appearance.position);
      if (spec && center) {
        const axes = { xy: [0,1], yz: [1,2], zx: [2,0] }[spec.plane];
        return [-1,1].flatMap(a=>[-1,1].map(b=>{
          const p=[...center]; p[axes[0]]+=a*spec.size[0]/2; p[axes[1]]+=b*spec.size[1]/2; return p;
        }));
      }
      return center ? [center] : [];
    }
    const endpoint = value => xyz(value?.coord) ?? xyz(lookup(value?.ref)?.item?.appearance?.position);
    const points = [endpoint(appearance.end_a), endpoint(appearance.end_b)];
    for (const p of appearance.geometry?.polyline_points ?? appearance.vertices ?? appearance.path?.points ?? []) points.push(xyz(p));
    return points.filter(Boolean);
  }
  function fit(uuids) {
    const points = Array.from(uuids).flatMap(coordinates);
    if (!points.length) return Promise.resolve(false);
    const min = [0,1,2].map(i => Math.min(...points.map(p=>p[i])));
    const max = [0,1,2].map(i => Math.max(...points.map(p=>p[i])));
    const center = min.map((value,i) => (value+max[i])/2);
    const radius = Math.max(0.7, Math.hypot(...max.map((value,i)=>(value-min[i])/2)));
    const camera = copy(core.camera.getState());
    // Keep viewing direction. A sphere fit covers portrait canvases as well as landscape ones.
    const canvas = globalThis.document?.getElementById?.('viewer-canvas');
    const aspect = canvas?.clientWidth > 0 && canvas?.clientHeight > 0 ? canvas.clientWidth/canvas.clientHeight : 1;
    const halfFov = Math.atan(Math.tan((camera.fov ?? 50)*Math.PI/360)*Math.min(1,aspect));
    camera.target = { x:center[0], y:center[1], z:center[2] };
    camera.distance = Math.min(1000, Math.max(2, radius/Math.sin(halfFov)*1.2));
    return apply({ camera }, true);
  }
  return Object.freeze({
    getSelection, snapshot, restore, select, setFrame, setFilters, setScope, waitForPaint,
    subscribe(listener) { requireAlive(); listeners.add(listener); return () => listeners.delete(listener); },
    subscribeState(listener) { requireAlive(); stateListeners.add(listener); return () => stateListeners.delete(listener); },
    frameFirst() { return control('frameFirst'); },
    frameLast() { return control('frameLast'); },
    frameStep, setPlaying,
    cameraReset() { return control('cameraReset', copy(initialCamera)); },
    cameraPreset, cameraZoom, cameraOrbit, setAutoOrbit, enterMicro,
    exitMicro() { return control('exitMicro'); },
    setViewerSettings,
    fitSelection(uuids) { requireAlive(); const id=getSelection()?.uuid; return fit(uuids ?? (id?[id]:[])); },
    fitAll() { requireAlive(); return fit(KINDS.flatMap(kind=>Array.from(core.uiState?.visibleSet?.[kind] ?? []))); },
    isVisible,
    dispose() { if (disposed) return; disposed=true; unsubscribe(); listeners.clear(); stateListeners.clear(); },
  });
}
