// /viewer/runtime/viewerHub.js
// ============================================================
// viewerHub.js  （3DSL Viewer HUB / UI → Core 集線）
// ============================================================
//
// 役割：
// - UI から見える API を core.* に一本化する
// - 3DSS 構造データ（読み取り専用）＋ ui_state を管理する
// - CameraEngine / CameraInput / EventPicker と rendererContext の仲介
//
// ロジック本体は /runtime/core/* に逃がして、ここは
// 「組み立て」と「外向き API 定義」だけ担当する。
// ============================================================

import { CameraEngine } from "./core/CameraEngine.js";
import { CameraInput } from "./core/CameraInput.js";
import { EventPicker } from "./core/EventPicker.js";

import { buildUUIDIndex, detectFrameRange } from "./core/structIndex.js";
import { createUiState } from "./core/uiState.js";
import { createFrameController } from "./core/frameController.js";
import { createSelectionController } from "./core/selectionController.js";
import { createMicroVisualController } from "./core/microVisualController.js";
import { createModeController } from "./core/modeController.js";
import { createGizmoController } from "./core/gizmoController.js";

import { loadJSON } from "./core/loader.js";
import { buildState } from "./core/state.js";
import {
  init as initValidator,
  validate3DSS,
  getErrors,
} from "./core/validator.js";

// ============================================================
// createViewerHub 本体
// ============================================================

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
    throw new Error("viewerHub: options.data (3DSS) が必須やで");
  }
  if (
    !rendererContext ||
    !rendererContext.camera ||
    !rendererContext.getBoundingBox
  ) {
    throw new Error(
      "viewerHub: rendererContext の camera / getBoundingBox は必須やで",
    );
  }

  // ----------------------------------------------------------
  // 1. 構造 index ＋ frame range
  // ----------------------------------------------------------
  const struct = Object.freeze(data);
  const indexByUUID = buildUUIDIndex(struct);
  const frameRange = detectFrameRange(struct);

  // ----------------------------------------------------------
  // 2. ui_state
  // ----------------------------------------------------------
  const ui_state = createUiState({ frameRange, viewerSettings });

  // ----------------------------------------------------------
  // 3. CameraEngine / CameraInput
  // ----------------------------------------------------------
  const cameraEngine = new CameraEngine({
    camera: rendererContext.camera,
    domElement: rendererContext.domElement,
    getBoundingBox: rendererContext.getBoundingBox,
    getElementBounds: rendererContext.getElementBounds,
  });

  ui_state.camera_state = cameraEngine.state;

  const cameraInput = new CameraInput({
    domElement: rendererContext.domElement,
    engine: cameraEngine,
    ...(ui_state.viewerSettings.camera || {}),
  });

  // ----------------------------------------------------------
  // 4. Controllers
  // ----------------------------------------------------------
  const frameController = createFrameController({
    struct,
    indexByUUID,
    ui_state,
    rendererContext,
    cameraEngine,
  });

  const selectionController = createSelectionController({
    ui_state,
    indexByUUID,
    rendererContext,
  });

  const microVisualController = createMicroVisualController({
    struct,
    ui_state,
    indexByUUID,
    rendererContext,
  });

  const modeController = createModeController({
    ui_state,
    cameraEngine,
    microVisualController,
    selectionController,
  });

  const gizmoController = createGizmoController({
    cameraEngine,
  });

  // selectionController / modeController を使うクリックピッカー
  const eventPicker = new EventPicker({
    domElement: rendererContext.domElement,
    rendererContext,
    onPick: (uuid) => {
      selectionController.select(uuid);
      modeController.onSelectionChanged(uuid);
    },
  });

  ui_state._cameraInput = cameraInput;
  ui_state._eventPicker = eventPicker;

  // 初期 frame 適用
  frameController.applyFrame(ui_state.activeFrame);

  // ----------------------------------------------------------
  // 5. core.* API（UI から見える唯一の窓口）
  // ----------------------------------------------------------
  const core = {
    // 構造データ（read-only）
    data: struct,

    // 内部 state（読み取り専用用途）
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
        return cameraEngine.getState();
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
    // core.micro.*
    // ------------------------
    micro: {
      enter(uuid) {
        modeController.setMode("micro", uuid);
      },
      exit() {
        modeController.setMode("macro");
      },
      isActive() {
        return ui_state.mode === "micro";
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

  // 既存 UI 互換用にグローバル expose
  if (exposeGlobal && typeof window !== "undefined") {
    window.core = core;
  }

  return core;
}

// ============================================================
// 以降：loader / validator / state ラッパ（STEP2 部分）
// ============================================================

// AJV validator の初期化状態
let validatorReady = false;
let validatorSchemaURL = null;
/** @type {Promise<boolean>|null} */
let validatorInitPromise = null;

/**
 * 指定スキーマ URL の validator を一度だけ初期化する
 * @param {string} schemaURL
 * @returns {Promise<boolean>} true: 利用可能 / false: 使えない（スキップ）
 */
async function ensureValidator(schemaURL) {
  if (!schemaURL) {
    console.warn("[viewerHub] schemaURL が指定されてへんので、バリデーションはスキップするで");
    return false;
  }

  if (validatorReady && validatorSchemaURL === schemaURL) {
    return true;
  }

  if (validatorInitPromise) {
    return validatorInitPromise;
  }

  validatorInitPromise = (async () => {
    const ok = await initValidator(schemaURL);
    if (ok) {
      validatorReady = true;
      validatorSchemaURL = schemaURL;
    } else {
      validatorReady = false;
      validatorSchemaURL = null;
    }
    validatorInitPromise = null;
    return ok;
  })();

  return validatorInitPromise;
}

/**
 * 3DSS を URL からロードし、必要ならスキーマバリデーションと state 構築まで行う。
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {string} [options.schemaURL]  AJV 用 3DSS.schema.json の URL
 * @param {boolean} [options.validate] true なら schema チェック（デフォルト: schemaURL 有りなら true）
 * @param {boolean} [options.buildState] true なら state も構築して返す
 * @returns {Promise<Object>} json または { threeDSS, state }
 */
export async function load3DSS(url, options = {}) {
  const {
    schemaURL,
    validate = !!schemaURL,
    buildState: wantState = false,
  } = options;

  const json = await loadJSON(url);
  if (!json) {
    throw new Error(`[viewerHub] 3DSS load 失敗: ${url}`);
  }

  if (validate && schemaURL) {
    const okInit = await ensureValidator(schemaURL);
    if (okInit) {
      const ok = validate3DSS(json);
      if (!ok) {
        const errors = getErrors();
        console.warn("[viewerHub] 3DSS schema validation NG:", errors);
        throw new Error("[viewerHub] 3DSS schema validation に失敗したで");
      }
    } else {
      console.warn("[viewerHub] validator を初期化できへんかったので、バリデーションはスキップするで");
    }
  }

  if (wantState) {
    const state = buildState(json);
    return { threeDSS: json, state };
  }

  return json;
}

/**
 * すでにロード済みの 3DSS から state だけ構築したいとき用のヘルパ
 * @param {object} json
 * @returns {object} state
 */
export function prepareState(json) {
  return buildState(json);
}
