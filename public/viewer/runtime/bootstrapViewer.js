// /viewer/runtime/bootstrapViewer.js
// =============================================================
// 3DSL Viewer 起動コード（エントリポイント：renderer プロトコル版）
////
//
// 役割：
//   - canvas と 3DSS を受け取って runtime/renderer パイプラインで起動
//   - viewerRenderer.init → 各レイヤ登録 → updateState → start
//   - rendererContext を viewerHub.createViewerHub に渡して core を作る
//   - 3DSS ロードは viewerHub.load3DSS（loader / validator）経由
// =============================================================

import { createViewerHub, load3DSS } from "./viewerHub.js";

import {
  init as initRenderer,
  start as startRenderer,
  updateState as updateRendererState,
  createRendererContext,
} from "./renderer/viewerRenderer.js";

import { initPointsLayer } from "./renderer/drawPoints.js";
import { initLinesLayer } from "./renderer/drawLines.js";
import { initAuxLayer } from "./renderer/drawAux.js";

/**
 * canvas と 3DSS を渡して viewer を立ち上げるメイン関数
 *
 * @param {HTMLCanvasElement|string} canvasOrId  キャンバス要素 or その id
 * @param {Object} threeDSS                      3DSS JSON（検証済み前提 or 信頼入力）
 * @param {Object} [options]
 * @param {Object} [options.renderer]            viewerRenderer.init に渡すオプション
 * @param {Object} [options.viewerSettings]      createViewerHub に渡す viewerSettings
 * @param {boolean} [options.exposeGlobal=true]  window.core へ expose するか
 * @returns {Object} core  viewerHub が返す core
 */
export function bootstrapViewer(canvasOrId, threeDSS, options = {}) {
  if (!threeDSS || typeof threeDSS !== "object") {
    throw new Error("[bootstrapViewer] threeDSS が不正や");
  }

  const canvas = resolveCanvas(canvasOrId);
  if (!canvas) {
    throw new Error("[bootstrapViewer] canvas 見つからんかったで");
  }

  const {
    renderer: rendererOptions = {},
    viewerSettings = {},
    exposeGlobal = true,
  } = options;

  console.log("[runtime] start (renderer-protocol)");

  // --- three.js / scene / camera / renderer 初期化 ---
  const rendererCore = initRenderer(canvas, rendererOptions);
  if (!rendererCore) {
    throw new Error("[bootstrapViewer] viewerRenderer.init 失敗しとるで");
  }
  console.log("[runtime] rendererCore =", rendererCore);

  // --- 描画レイヤ登録（points / lines / aux）---
  initPointsLayer();
  initLinesLayer();
  initAuxLayer();

  // --- 3DSS を renderer の state として渡す ---
  updateRendererState(threeDSS);

  // --- 描画ループ開始 ---
  startRenderer();

  // --- rendererContext を取得して viewerHub に渡す ---
  const rendererContext = createRendererContext();
  if (!rendererContext) {
    throw new Error("[bootstrapViewer] rendererContext 取れへんかったで");
  }

  const viewerCore = createViewerHub({
    data: threeDSS,
    rendererContext,
    viewerSettings,
    exposeGlobal,
  });

  // デバッグ用に rendererCore もぶら下げておく
  viewerCore._rendererCore = rendererCore;

  console.log("[runtime] viewerCore =", viewerCore);

  return viewerCore;
}

/**
 * 3DSS を URL からロードして起動するショートカット
 *
 * @param {HTMLCanvasElement|string} canvasOrId
 * @param {string} url
 * @param {Object} [options]
 * @param {string} [options.schemaURL]   3DSS.schema.json の URL（あれば AJV 検証）
 * @param {boolean} [options.validate]   true なら schema 検証（デフォルト: schemaURL 有りなら true）
 * @param {boolean} [options.buildState] true なら state も構築して core にぶら下げる（renderer には未使用）
 * @param {Object}  [options.renderer]   viewerRenderer.init に渡すオプション
 * @param {Object}  [options.viewerSettings] createViewerHub に渡す viewerSettings
 * @returns {Promise<Object>} core
 */
export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  const {
    schemaURL,
    validate,
    buildState = false,
    renderer: rendererOptions = {},
    viewerSettings = {},
    exposeGlobal = true,
  } = options;

  console.log("[runtime] load3DSS via viewerHub.load3DSS", {
    url,
    schemaURL,
    validate,
    buildState,
  });

  const result = await load3DSS(url, {
    schemaURL,
    validate,
    buildState,
  });

  let threeDSS;
  let state = null;

  if (buildState && result && result.threeDSS) {
    threeDSS = result.threeDSS;
    state = result.state;
    console.log("[runtime] state built", state);
  } else {
    threeDSS = result;
  }

  const core = bootstrapViewer(canvasOrId, threeDSS, {
    renderer: rendererOptions,
    viewerSettings,
    exposeGlobal,
  });

  if (buildState && core) {
    core._3dss_state = state;
  }

  return core;
}

// -------------------------------------------------------------
// 内部ユーティリティ
// -------------------------------------------------------------

/**
 * canvasOrId が要素 or id どちらでも取れるように解決する
 * @param {HTMLCanvasElement|string} canvasOrId
 * @returns {HTMLCanvasElement|null}
 */
function resolveCanvas(canvasOrId) {
  if (canvasOrId instanceof HTMLCanvasElement) {
    return canvasOrId;
  }
  if (typeof canvasOrId === "string") {
    const el = document.getElementById(canvasOrId);
    if (el instanceof HTMLCanvasElement) return el;
    return null;
  }
  return null;
}
