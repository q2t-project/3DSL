// =============================================================
// runtime/bootstrapViewer.js
// 3DSL Viewer 起動コード（エントリポイント）
//
// 役割：
//  - canvas と 3DSS を受け取って viewer を初期化
//  - viewerRenderer を init
//  - 各描画レイヤ（points / lines / aux …）を登録
//  - rendererContext を構築
//  - viewerHub を初期化（必要なら window.core に expose）
//  - render loop を start
// =============================================================

import {
  init as initRenderer,
  start,
  createRendererContext,
  updateState,
} from "./renderer/viewerRenderer.js";
import { createViewerHub } from "./viewerHub.js";
import { initLinesLayer } from "./renderer/drawLines.js";
import { initPointsLayer } from "./renderer/drawPoints.js";
import { initAuxLayer } from "./renderer/drawAux.js";
import { initGizmo } from "./ui/gizmo.js";

/**
 * @typedef {Object} BootstrapOptions
 * @property {boolean} [exposeGlobal=true]  window.core にぶら下げるかどうか
 * @property {Object}  [renderer]          viewerRenderer.init に渡すオプション
 * @property {Object}  [viewer]            viewerHub 用オプション（将来拡張用）
 */

/**
 * canvas と 3DSS を渡して viewer を立ち上げるメイン関数
 *
 * @param {HTMLCanvasElement|string} canvasOrId  キャンバス要素 or その id
 * @param {Object} threeDSS                      3DSS JSON（検証済み前提）
 * @param {BootstrapOptions} [options]
 * @returns {Object} core  viewerHub が返す core API
 */
export function bootstrapViewer(canvasOrId, threeDSS, options = {}) {
  if (!threeDSS || typeof threeDSS !== "object") {
    throw new Error("[bootstrapViewer] threeDSS が不正や");
  }

  const {
    exposeGlobal = true,
    renderer: rendererOptions = {},
    viewer: viewerOptions = {},
  } = options;

  const canvas = resolveCanvas(canvasOrId);
  if (!canvas) {
    throw new Error("[bootstrapViewer] canvas 見つからんかったで");
  }

  // --- three.js / scene / camera / renderer 初期化 ---
  const ok = initRenderer(canvas, rendererOptions);
  if (!ok) {
    throw new Error("[bootstrapViewer] viewerRenderer.init 失敗しとるで");
  }

  // --- three.js 初期化が済んだタイミングで描画レイヤ登録 ---
  //    （viewerRenderer.registerLayer をここで叩く）
  initPointsLayer();
  initAuxLayer(); // aux 使わんならコメントアウトでも可

  // --- viewerHub に渡す rendererContext を構築 ---
  const rendererContext = createRendererContext();
  if (!rendererContext) {
    throw new Error("[bootstrapViewer] rendererContext を作れへんかった");
  }

  // --- viewerHub（core.* API）初期化 ---
  const core = createViewerHub({
    data: threeDSS,
    rendererContext,
    exposeGlobal,     // true なら window.core にぶら下げる
    ...viewerOptions, // 将来 viewer 側設定を渡したくなったとき用
  });

  // drawPoints / drawLines / drawAux に渡す state として 3DSS を共有
  updateState(threeDSS);

  // --- 描画ループ開始 ---
  start();

  // --- UI ギズモ初期化（viewerRenderer.init / createRendererContext 後） ---
  // viewerRenderer.getContext() 内の renderer / camera を使って
  // gizmo.js が自前でレイキャストと axis 判定をやる。
  initGizmo();

  return core;
}

/**
 * 3DSS を URL から fetch して起動するショートカット
 *
 * @param {HTMLCanvasElement|string} canvasOrId
 * @param {string} url
 * @param {BootstrapOptions} [options]
 * @returns {Promise<Object>} core
 */
export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`[bootstrapViewerFromUrl] fetch 失敗: ${res.status} ${res.statusText}`);
  }
  const threeDSS = await res.json();
  return bootstrapViewer(canvasOrId, threeDSS, options);
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
