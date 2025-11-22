// ============================================================
// viewerHub.js  （3DSL Viewer HUB / UI → Core 集線）
//
// 役割：
// - UI から見える API を core.* に一本化する
// - 3DSS 構造データ（読み取り専用）＋ ui_state を管理する
// - CameraEngine / frame / selection / mode / micro / gizmo など
//   内部モジュールの仲介だけを行う（コンタミ防止）
//
// 前提：
// - runtime/core/CameraEngine.js を使う（相対パス ./core/CameraEngine.js）
// - three.js / Renderer には直接触らず、rendererContext 経由でだけ触る
//
// 使い方（viewer_dev.html 側の想定）:
//
//   import { createViewerHub } from './viewerHub.js';
//
//   const rendererContext = {
//     camera,                 // THREE.PerspectiveCamera
//     domElement,             // canvas or container
//     getBoundingBox,         // () => { center:[x,y,z], radius:number } | null
//     setElementVisibility,   // ({ uuid, visible }) => void
//     setHighlight,           // ({ uuid, level }) => void   // 0:none,1:hover,2:selected
//     clearAllHighlights,     // () => void
//     applyFocusFX,           // (state) => void  // micro/meso補助の視覚適用
//   };
//
//   const core = createViewerHub({ data: threeDSS, rendererContext });
//
//   // UI からは：
//   // core.camera.rotate(...)
//   // core.frame.setActive(...)
//   // core.selection.select(uuid)
//   // core.mode.setMode('macro'|'meso'|'micro', uuid)
//   // だけを叩く。
// ====+// CameraEngine は runtime/core 配下

// viewerHub.js からは ./core/CameraEngine.js で解決する
import { CameraEngine } from "./core/CameraEngine.js";
import { CameraInput } from "./core/CameraInput.js";
import { EventPicker } from "./core/EventPicker.js";

// ------------------------------------------------------------
// 型メモ（参考）
// ------------------------------------------------------------
/**
 * @typedef {Object} ViewerHubOptions
 * @property {Object} data           // 3DSS 構造データ（immutable 想定）
 * @property {Object} rendererContext
 * @property {boolean} [exposeGlobal=true] // window.core にぶら下げるか
 * @property {Object}  [viewerSettings]    // 各種フラグ（micro/meso 演出 ON/OFF など）
 */

/**
 * createViewerHub
 * @param {ViewerHubOptions} options
 * @returns {Object} core
 */
export function createViewerHub(options) {
  const {
    data,
    rendererContext,
    exposeGlobal = true,
    viewerSettings = {},
  } = options || {};

  if (!data) {
    throw new Error('viewerHub: options.data (3DSS) が必須やで');
  }
  if (!rendererContext || !rendererContext.camera || !rendererContext.getBoundingBox) {
    throw new Error('viewerHub: rendererContext の camera / getBoundingBox は必須やで');
  }

  // ----------------------------------------------------------
  // 1. 構造データ index 化（uuid → {kind, index, ref}）
  // ----------------------------------------------------------
  const struct = Object.freeze(data); // 3DSS は読み取り専用
  const indexByUUID = buildUUIDIndex(struct);

  // frame range 検出（frames プロパティから自動）
  const frameRange = detectFrameRange(struct);

  // ----------------------------------------------------------
  // 2. ui_state（唯一の UI 状態）※外部からは直接触らせへん
  // ----------------------------------------------------------
  const ui_state = {
    camera_state: null, // CameraEngine.state を参照で持つ
    activeFrame: frameRange.min ?? 0,
    frameRange,
    selection: {
      uuid: null,
      kind: null, // 'point' | 'line' | 'aux' | null
    },
    mode: 'macro', // 'macro' | 'meso' | 'micro'
    viewerSettings: {
      fx: {
        micro: true,
        meso: true,
        modeTransitions: true,
        ...viewerSettings.fx,
      },
      camera: {
        rotateSpeed: 1.0,
        panSpeed: 1.0,
        zoomSpeed: 1.0,
        invertOrbitY: false,
        ...(viewerSettings.camera || {}),
      },
      ...viewerSettings,
    },
    focus: {
      active: false,
      uuid: null,
    },
  };

  // ----------------------------------------------------------
  // 3. 中核モジュール：CameraEngine
  // ----------------------------------------------------------
  const cameraEngine = new CameraEngine({
    camera: rendererContext.camera,
    domElement: rendererContext.domElement,
    getBoundingBox: rendererContext.getBoundingBox,
    getElementBounds: rendererContext.getElementBounds,
  });

  // CameraEngine の state を ui_state にぶら下げる（参照共有）
  ui_state.camera_state = cameraEngine.state;

  // 入力層（操作感は viewerSettings.camera から上書き可能）
  const cameraInput = new CameraInput({
    domElement: rendererContext.domElement,
    engine: cameraEngine,
    ...(viewerSettings.camera || {}),
  });

  // selection 用のクリックピッカー
  const eventPicker = new EventPicker({
    domElement: rendererContext.domElement,
    rendererContext,
    onPick: (uuid) => {
      selectionController.select(uuid);
      modeController.onSelectionChanged(uuid);
    },
  });

  // 必要ならデバッグ用に保持しとく
  ui_state._cameraInput = cameraInput;
  ui_state._eventPicker = eventPicker;

  // ----------------------------------------------------------
  // 4. Frame Controller
  //    - activeFrame の管理
  //    - frames プロパティに基づく可視制御（rendererContext に委譲）
  // ----------------------------------------------------------
  const frameController = createFrameController({
    struct,
    indexByUUID,
    ui_state,
    rendererContext,
    cameraEngine,
  });

  // 初期 frame 適用
  frameController.applyFrame(ui_state.activeFrame);

  // ----------------------------------------------------------
  // 5. Selection Controller
  // ----------------------------------------------------------
  const selectionController = createSelectionController({
    ui_state,
    indexByUUID,
    rendererContext,
  });

  // ----------------------------------------------------------
  // 6. Micro / Meso Visual Controller（視覚補助アルゴの殻）
//      - 本体ロジックは rendererContext.applyFocusFX に委譲
  // ----------------------------------------------------------
  const microVisualController = createMicroVisualController({
    struct,
    ui_state,
    indexByUUID,
    rendererContext,
  });

  // ----------------------------------------------------------
  // 7. Mode Controller
  //    - macro / meso / micro の切替
  //    - cameraEngine.setMode と microVisualController を仲介
  // ----------------------------------------------------------
  const modeController = createModeController({
    ui_state,
    cameraEngine,
    microVisualController,
    selectionController,
  });

  // ----------------------------------------------------------
  // 8. Gizmo Controller（軸スナップ・HomeView）
  //      - UI 側のギズモイベント → camera API へ
  // ----------------------------------------------------------
  const gizmoController = createGizmoController({
    cameraEngine,
  });

  // ----------------------------------------------------------
  // 9. core.* API の定義（UI から見える唯一の窓口）
  //      camera API は仕様書のシグネチャに一致させる。 
  // ----------------------------------------------------------
  const core = {
    // 構造データ（read-only）
    data: struct,

    // 内部 state（読み取り専用用途だけ）
    get ui_state() {
      return ui_state;
    },

    // ------------------------
    // core.camera.*
    // ------------------------
    camera: {
      rotate(dTheta, dPhi) {
        cameraEngine.rotate(dTheta, dPhi);
      },
      pan(dx, dy) {
        cameraEngine.pan(dx, dy);
      },
      zoom(delta) {
        cameraEngine.zoom(delta);
      },
      reset() {
        cameraEngine.reset();
      },
      setState(partialState) {
        cameraEngine.setState(partialState);
      },
      setMode(mode, uuid) {
        modeController.setMode(mode, uuid);
      },
      focusOn(uuid) {
        modeController.focusOn(uuid);
      },
      snapToAxis(axis) {
        cameraEngine.snapToAxis(axis);
      },
      onFrameChange(activeFrame) {
        frameController.setActiveFrame(activeFrame);
      },
      setFOV(value) {
        cameraEngine.setFOV(value);
      },
      getState() {
        // コピーを返す（外から直接いじらせない）
        return { ...cameraEngine.state };
      },
    },

    // ------------------------
    // core.frame.*
    // ------------------------
    frame: {
      setActive(frame) {
        frameController.setActiveFrame(frame);
      },
      getActive() {
        return ui_state.activeFrame;
      },
      getRange() {
        return { ...ui_state.frameRange };
      },
      next() {
        frameController.setActiveFrame(ui_state.activeFrame + 1);
      },
      prev() {
        frameController.setActiveFrame(ui_state.activeFrame - 1);
      },
    },

    // ------------------------
    // core.selection.*
    // ------------------------
    selection: {
      select(uuid) {
        selectionController.select(uuid);
      },
      clear() {
        selectionController.clear();
      },
      get() {
        return { ...ui_state.selection };
      },
    },

    // ------------------------
    // core.mode.*
    // ------------------------
    mode: {
      setMode(mode, uuid) {
        modeController.setMode(mode, uuid);
      },
      getMode() {
        return ui_state.mode;
      },
    },

    // ------------------------
    // core.micro.* （micro 視覚補助に直接触りたい場合用）
    // ------------------------
    micro: {
      enter(uuid) {
        modeController.setMode('micro', uuid);
      },
      exit() {
        modeController.setMode('macro');
      },
      isActive() {
        return ui_state.mode === 'micro';
      },
    },

    // ------------------------
    // core.gizmo.*
    // ------------------------
    gizmo: {
      axisClick(axis) {
        gizmoController.onAxisClick(axis);
      },
      homeClick() {
        gizmoController.onHomeClick();
      },
    },
  };

  // ----------------------------------------------------------
  // 10. グローバル expose（既存 UI 互換用）
  // ----------------------------------------------------------
  if (exposeGlobal && typeof window !== 'undefined') {
    // 既存の window.core があった場合は上書き注意やけど、
    // viewerHub 前提ならここを正とする。
    window.core = core;
  }

  return core;
}

// ============================================================
// 内部ユーティリティ群
// ============================================================

function buildUUIDIndex(struct) {
  /** @type {Map<string,{kind:'point'|'line'|'aux', index:number, ref:Object}>} */
  const map = new Map();

  if (Array.isArray(struct.points)) {
    struct.points.forEach((p, i) => {
    const uuid = p?.meta?.uuid ?? p?.meta?.uuid_v4;
            if (uuid) {
        map.set(uuid, { kind: 'point', index: i, ref: p });
      }
    });
  }

  if (Array.isArray(struct.lines)) {
    struct.lines.forEach((l, i) => {
      const uuid = l?.meta?.uuid;
      if (uuid) {
        map.set(uuid, { kind: 'line', index: i, ref: l });
      }
    });
  }

  if (Array.isArray(struct.aux)) {
    struct.aux.forEach((a, i) => {
      const uuid = a?.meta?.uuid;
      if (uuid) {
        map.set(uuid, { kind: 'aux', index: i, ref: a });
      }
    });
  }

  return map;
}

// frames プロパティから min/max をざっくり検出する。

function detectFrameRange(struct) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  const scanFrames = (frames) => {
    if (frames == null) return;
    if (typeof frames === 'number' && Number.isInteger(frames)) {
      min = Math.min(min, frames);
      max = Math.max(max, frames);
      return;
    }
    if (Array.isArray(frames)) {
      frames.forEach((f) => {
        if (typeof f === 'number' && Number.isInteger(f)) {
          min = Math.min(min, f);
          max = Math.max(max, f);
        }
      });
    }
  };

  (struct.points || []).forEach((p) => scanFrames(p?.appearance?.frames));
  (struct.lines || []).forEach((l) => scanFrames(l?.appearance?.frames));
  (struct.aux || []).forEach((a) => scanFrames(a?.appearance?.frames));

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }
  return { min, max };
}

// ============================================================
// Frame Controller
// ============================================================
function createFrameController({ struct, indexByUUID, ui_state, rendererContext, cameraEngine }) {
  const { setElementVisibility } = rendererContext;

  const appliesFrame = typeof setElementVisibility === 'function';

  function elementVisibleInFrame(frames, active) {
    if (frames == null) return true;
    if (typeof frames === 'number') return frames === active;
    if (Array.isArray(frames)) return frames.includes(active);
    return true;
  }

  function applyFrame(frame) {
    ui_state.activeFrame = frame;

    if (appliesFrame) {
      (struct.points || []).forEach((p) => {
        const uuid = p?.meta?.uuid;
        if (!uuid) return;
        const visible = elementVisibleInFrame(p?.appearance?.frames, frame);
        setElementVisibility({ uuid, visible });
      });

      (struct.lines || []).forEach((l) => {
        const uuid = l?.meta?.uuid;
        if (!uuid) return;
        const visible = elementVisibleInFrame(l?.appearance?.frames, frame);
        setElementVisibility({ uuid, visible });
      });

      (struct.aux || []).forEach((a) => {
        const uuid = a?.meta?.uuid;
        if (!uuid) return;
        const visible = elementVisibleInFrame(a?.appearance?.frames, frame);
        setElementVisibility({ uuid, visible });
      });
    }

    // camera 側への通知（仕様どおり）
    cameraEngine.onFrameChange(frame);
  }

  function setActiveFrame(frame) {
    const { min, max } = ui_state.frameRange;
    let clamped = frame;
    if (min != null && max != null) {
      clamped = Math.max(min, Math.min(max, frame));
    }
    applyFrame(clamped);
  }

  return {
    setActiveFrame,
    applyFrame,
  };
}

// ============================================================
// Selection Controller
// ============================================================
function createSelectionController({ ui_state, indexByUUID, rendererContext }) {
  const {
    setHighlight = null,
    clearAllHighlights = null,
  } = rendererContext;

  function select(uuid) {
    const info = indexByUUID.get(uuid);
    if (!info) {
      // 不明な uuid → 選択解除扱い
      clear();
      return;
    }

    ui_state.selection.uuid = uuid;
    ui_state.selection.kind = info.kind;

    if (typeof clearAllHighlights === 'function') {
      clearAllHighlights();
    }
    if (typeof setHighlight === 'function') {
      setHighlight({ uuid, level: 2 }); // 2 = selected
    }
  }

  function clear() {
    ui_state.selection.uuid = null;
    ui_state.selection.kind = null;

    if (typeof clearAllHighlights === 'function') {
      clearAllHighlights();
    }
  }

  return { select, clear };
}

// ============================================================
// Micro / Meso Visual Controller
//   - micro/meso 視覚補助は「構造不変・描画のみ変更」。
//   - 具体処理は rendererContext.applyFocusFX(state) に委譲。
// ============================================================
// 参照仕様：ミクロ視覚補助アルゴ／micro/meso assistance など。
function createMicroVisualController({ struct, ui_state, indexByUUID, rendererContext }) {
  const { applyFocusFX } = rendererContext;

  function computeFocusOrigin(uuid) {
    const info = indexByUUID.get(uuid);
    if (!info) return null;

    if (info.kind === 'point') {
      const p = info.ref;
      const pos = p?.appearance?.position;
      if (Array.isArray(pos) && pos.length >= 3) return [...pos];
      return [0, 0, 0];
    }

    if (info.kind === 'line') {
      const l = info.ref;
      const a = l?.appearance?.end_a;
      const b = l?.appearance?.end_b;

      const getCoord = (end) => {
        if (!end) return null;
        if (end.ref) {
          // point参照の場合：pointの position を参照
          const pInfo = indexByUUID.get(end.ref);
          if (pInfo && pInfo.kind === 'point') {
            const pos = pInfo.ref?.appearance?.position;
            if (Array.isArray(pos) && pos.length >= 3) return pos;
          }
          return null;
        }
        if (Array.isArray(end.coord) && end.coord.length >= 3) {
          return end.coord;
        }
        return null;
      };

      const ca = getCoord(a) || [0, 0, 0];
      const cb = getCoord(b) || [0, 0, 0];
      return [
        (ca[0] + cb[0]) / 2,
        (ca[1] + cb[1]) / 2,
        (ca[2] + cb[2]) / 2,
      ];
    }

    if (info.kind === 'aux') {
      const a = info.ref;
      const pos = a?.appearance?.position;
      if (Array.isArray(pos) && pos.length >= 3) return [...pos];
      return [0, 0, 0];
    }

    return null;
  }

  function applyFocusState() {
    if (typeof applyFocusFX !== 'function') return;

    if (!ui_state.focus.active || !ui_state.focus.uuid) {
      applyFocusFX(null); // 全解除
      return;
    }

    const origin = computeFocusOrigin(ui_state.focus.uuid);
    if (!origin) {
      applyFocusFX(null);
      return;
    }

    const payload = {
      mode: ui_state.mode,        // 'macro' | 'meso' | 'micro'
      uuid: ui_state.focus.uuid,  // 選択要素
      origin,                     // フォーカス原点
      activeFrame: ui_state.activeFrame,
      settings: ui_state.viewerSettings,
    };

    applyFocusFX(payload);
  }

  function enter(uuid) {
    ui_state.focus.active = true;
    ui_state.focus.uuid = uuid;
    applyFocusState();
  }

  function exit() {
    ui_state.focus.active = false;
    ui_state.focus.uuid = null;
    applyFocusState();
  }

  function update() {
    applyFocusState();
  }

  return { enter, exit, update };
}

// ============================================================
// Mode Controller
// ============================================================
// 参照仕様：camera.setMode / フォーカス ON/OFF 視覚遷移 / モード切替演出。
function createModeController({ ui_state, cameraEngine, microVisualController, selectionController }) {
  function setMode(mode, uuid) {
    // mode 正規化
    if (!['macro', 'meso', 'micro'].includes(mode)) {
      mode = 'macro';
    }

    ui_state.mode = mode;

    // micro/meso 補助のフォーカス対象
    if (mode === 'macro') {
      microVisualController.exit();
      cameraEngine.setMode('macro');
      return;
    }

    // uuid 明示指定優先、なければ現 selection
    const focusUUID = uuid || ui_state.selection.uuid;
    if (!focusUUID) {
      // フォーカス対象なければ macro に戻す
      ui_state.mode = 'macro';
      microVisualController.exit();
      cameraEngine.setMode('macro');
      return;
    }

    microVisualController.enter(focusUUID);
    cameraEngine.setMode(mode, focusUUID);
  }

  function focusOn(uuid) {
    if (!uuid) {
      selectionController.clear();
      microVisualController.exit();
      ui_state.mode = 'macro';
      cameraEngine.reset();
      return;
    }

    selectionController.select(uuid);
    ui_state.mode = 'micro';
    microVisualController.enter(uuid);
    cameraEngine.focusOn(uuid);
  }
  // selection が変わったときの通知
  function onSelectionChanged(uuid) {
    if (!uuid) return;
    if (ui_state.mode === 'micro' || ui_state.mode === 'meso') {
      // 今のモードを維持したまま、対象だけ差し替え
      setMode(ui_state.mode, uuid);
    }
  }

  return { setMode, focusOn, onSelectionChanged };
}

// ============================================================
// Gizmo Controller
// ============================================================
// 参照仕様：snapToAxis, HomeView（macro）など。
function createGizmoController({ cameraEngine }) {
  function onAxisClick(axis) {
    cameraEngine.snapToAxis(axis);
  }

  function onHomeClick() {
    cameraEngine.reset();
  }

  return { onAxisClick, onHomeClick };
}
