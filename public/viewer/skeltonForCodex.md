==========================================
3DSL Viewer – 初期スケルトン（空の正式APIのみ）
==========================================

以下、viewer/ にそのまま配置してええ。

viewer/
  runtime/
    bootstrapViewer.js
    viewerHub.js
    core/
      CameraEngine.js
      frameController.js
      selectionController.js
      modeController.js
      microController.js
      visibilityController.js
      uiState.js
      structIndex.js
    renderer/
      context.js
  ui/
    pointerInput.js
    keyboardInput.js
    gizmo.js
    picker.js
    timeline.js


すべて 空ロジック・APIだけにしてある。
ここから実装を Codex なり ChatGPT なりにやらせれば、構造が絶対に崩れへん。

==========================================
📁 runtime/bootstrapViewer.js
==========================================
// runtime/bootstrapViewer.js
import { createUiState } from './core/uiState.js';
import { buildUUIDIndex, detectFrameRange } from './core/structIndex.js';
import { CameraEngine } from './core/CameraEngine.js';
import { createFrameController } from './core/frameController.js';
import { createSelectionController } from './core/selectionController.js';
import { createModeController } from './core/modeController.js';
import { createMicroController } from './core/microController.js';
import { createVisibilityController } from './core/visibilityController.js';
import { createRendererContext } from './renderer/context.js';
import { createViewerHub } from './viewerHub.js';

export function bootstrapViewer(canvasOrId, threeDSS, options = {}) {
  // 後で実装
}

export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  // 後で実装
}

==========================================
📁 runtime/viewerHub.js
==========================================
// runtime/viewerHub.js
export function createViewerHub({ core, renderer }) {

  const hub = {
    start() {},
    stop() {},
    pickObjectAt: (ndcX, ndcY) => {},

    core: {
      frame: {
        set: (n) => {},
        get: () => {},
        step: (d) => {},
        range: () => {},
        startPlayback: () => {},
        stopPlayback: () => {},
      },
      selection: {
        select: (uuid) => {},
        clear: () => {},
        get: () => {},
      },
      camera: {
        rotate: (dTheta, dPhi) => {},
        pan: (dx, dy) => {},
        zoom: (delta) => {},
        reset: () => {},
        snapToAxis: (axis) => {},
        focusOn: (uuid) => {},
        setFOV: (v) => {},
        setState: (partial) => {},
        getState: () => {},
      },
      mode: {
        set: (mode, uuid) => {},
        get: () => {},
        canEnter: (uuid) => {},
        exit: () => {},
        focus: (uuid) => {},
      },
      micro: {
        enter: (uuid) => {},
        exit: () => {},
        isActive: () => {},
      },
      filters: {
        setTypeEnabled: (kind, enabled) => {},
        get: () => {},
      },
      runtime: {
        isFramePlaying: () => {},
        isCameraAuto: () => {},
      }
    }
  };

  return hub;
}

==========================================
📁 runtime/core/uiState.js
==========================================
// runtime/core/uiState.js
export function createUiState() {
  return {
    frame: { current: 0, range: { min: 0, max: 0 } },
    selection: { kind: null, uuid: null },
    cameraState: { theta: 0, phi: 0, distance: 10, target: {x:0,y:0,z:0}, fov: 50 },
    mode: 'macro',
    filters: { points: true, lines: true, aux: true },
    runtime: { isFramePlaying: false, isCameraAuto: false },
    microState: null,
    viewerSettings: {},
    visibleSet: new Set(),
  };
}

==========================================
📁 runtime/core/CameraEngine.js
==========================================
// runtime/core/CameraEngine.js
export class CameraEngine {
  constructor(initialState) {
    this.state = { ...initialState };
  }

  rotate(dTheta, dPhi) {}
  pan(dx, dy) {}
  zoom(delta) {}
  reset() {}
  snapToAxis(axis) {}
  setState(partial) {}
  getState() { return this.state; }
  setFOV(value) {}
}

==========================================
📁 runtime/core/frameController.js
==========================================
// runtime/core/frameController.js
export function createFrameController(uiState, visibilityController) {
  return {
    set: (n) => {},
    get: () => {},
    step: (delta) => {},
    range: () => uiState.frame.range,
    startPlayback: () => {},
    stopPlayback: () => {},
  };
}

==========================================
📁 runtime/core/selectionController.js
==========================================
// runtime/core/selectionController.js
export function createSelectionController(uiState, structIndex) {
  return {
    select: (uuid) => {},
    clear: () => {},
    get: () => uiState.selection,
  };
}

==========================================
📁 runtime/core/modeController.js
==========================================
// runtime/core/modeController.js
export function createModeController(uiState, selectionController, microController, frameController, visibilityController, document) {
  return {
    set: (mode, uuid) => {},
    get: () => uiState.mode,
    canEnter: (uuid) => false,
    exit: () => {},
    focus: (uuid) => {},
  };
}

==========================================
📁 runtime/core/microController.js
==========================================
// runtime/core/microController.js
export function createMicroController(structIndex) {
  return {
    compute: (selection, cameraState, document) => null
  };
}

==========================================
📁 runtime/core/visibilityController.js
==========================================
// runtime/core/visibilityController.js
export function createVisibilityController(uiState, document, structIndex) {
  return {
    recompute: () => new Set(),
    isVisible: (uuid) => false,
    getFilters: () => ({ ...uiState.filters }),
    setTypeFilter: (kind, enabled) => {},
  };
}

==========================================
📁 runtime/core/structIndex.js
==========================================
// runtime/core/structIndex.js
export function buildUUIDIndex(document) {
  return new Map();
}

export function detectFrameRange(document) {
  return { min: 0, max: 0 };
}

==========================================
📁 runtime/renderer/context.js
==========================================
// runtime/renderer/context.js
export function createRendererContext(canvas) {
  return {
    syncDocument: (doc, index) => {},
    applyFrame: (visibleSet) => {},
    updateCamera: (cameraState) => {},
    applyMicroFX: (microState) => {},
    applySelection: (selectionState) => {},
    pickObjectAt: (ndcX, ndcY) => null,
    render: () => {},
  };
}

==========================================
📁 ui/pointerInput.js
==========================================
// ui/pointerInput.js
export function createPointerInput(hub) {
  return {
    attach: (dom) => {},
    detach: () => {},
  };
}

==========================================
📁 ui/keyboardInput.js
==========================================
// ui/keyboardInput.js
export function createKeyboardInput(hub) {
  return {
    attach: () => {},
    detach: () => {},
  };
}

==========================================
📁 ui/gizmo.js
==========================================
// ui/gizmo.js
export function initGizmo(hub, overlayElement) {}
export function updateGizmoOrientation(hub, overlayElement) {}

==========================================
📁 ui/picker.js
==========================================
// ui/picker.js
export function createPicker(hub) {
  return {
    attach: (dom) => {},
    detach: () => {},
  };
}

==========================================
📁 ui/timeline.js
==========================================
// ui/timeline.js
export function createTimeline(hub) {
  return {
    goTo: (n) => {},
    play: () => {},
    pause: () => {},
    step: (d) => {},
  };
}