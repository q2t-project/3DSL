// viewer/runtime/bootstrapViewer.js

import { createRendererContext } from "./renderer/context.js";
import { createViewerHub } from "./viewerHub.js";
import { createModeController } from "./core/modeController.js";
import { createCameraEngine } from "./core/CameraEngine.js";
import { CameraInput } from "./core/CameraInput.js";
import { createMicroController } from "./core/microController.js";
import { createSelectionController } from "./core/selectionController.js";
import { createUiState } from "./core/uiState.js";
import { buildUUIDIndex } from "./core/structIndex.js";

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------
const DEBUG_BOOTSTRAP = false; // 開発中だけ true にして詳細ログを見る

function debugBoot(...args) {
  if (!DEBUG_BOOTSTRAP) return;
  console.log(...args);
}


// canvas id / 要素を正規化
function resolveCanvas(canvasOrId) {
  debugBoot("[bootstrap] resolveCanvas: input =", canvasOrId);

  if (canvasOrId instanceof HTMLCanvasElement) {
    debugBoot("[bootstrap] resolved: HTMLCanvasElement");
    return canvasOrId;
  }

  if (typeof canvasOrId === "string") {
    const el = document.getElementById(canvasOrId);
    debugBoot("[bootstrap] querySelector result =", el);

    if (!el) throw new Error(`canvas element not found: #${canvasOrId}`);
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error(`element #${canvasOrId} is not <canvas>`);
    }
    return el;
  }

  throw new Error("canvas must be <canvas> element or element id string");
}

// シンプル JSON ローダ
async function loadJSON(url) {
  debugBoot("[bootstrap] loadJSON:", url);

  const res = await fetch(url);
  debugBoot("[bootstrap] fetch status =", res.status);

  if (!res.ok) {
    throw new Error(`failed to load JSON: ${url} (${res.status})`);
  }

  const json = await res.json();
  debugBoot("[bootstrap] loaded JSON keys =", Object.keys(json));
  return json;
}


// 3DSS から uuid index を構築（互換ラッパ）
function buildSimpleIndices(document3dss) {
  // 既存コードは indices.uuidToKind だけを使っているので、
  // structIndex の戻り値をそのまま渡して問題ない。
  return buildUUIDIndex(document3dss);
}



// ------------------------------------------------------------
// すでに 3DSS オブジェクトを持っている場合
// ------------------------------------------------------------
export function bootstrapViewer(canvasOrId, document3dss, options = {}) {
  debugBoot("[bootstrap] bootstrapViewer: start");
  debugBoot("[bootstrap] received 3DSS keys =", Object.keys(document3dss));

  const canvasEl = resolveCanvas(canvasOrId);
  debugBoot("[bootstrap] canvas resolved =", canvasEl);

  const indices = buildSimpleIndices(document3dss);

  debugBoot("[bootstrap] createRendererContext");
  const renderer = createRendererContext(canvasEl);

  // 明示同期
  if (typeof renderer.syncDocument === "function") {
    debugBoot("[bootstrap] syncDocument()");
    renderer.syncDocument(document3dss, indices);
  } else {
    console.warn("[bootstrap] renderer.syncDocument missing");
  }

  // シーンメトリクスから初期カメラ状態を決める
  const metrics =
    typeof renderer.getSceneMetrics === "function"
      ? renderer.getSceneMetrics()
      : null;

  const initialCameraState = {
    theta: 0,
    phi: 1,
    distance: 4,
    target: { x: 0, y: 0, z: 0 },
    fov: 50,
  };

  if (metrics && metrics.radius > 0 && metrics.center) {
    initialCameraState.target = {
      x: metrics.center.x,
      y: metrics.center.y,
      z: metrics.center.z,
    };
    // シーン半径のだいたい 2.4 倍くらい離せば「全体が入る」目安
    initialCameraState.distance = metrics.radius * 2.4;
  }

  const uiState = createUiState({
    cameraState: initialCameraState,
    // visibleSet / selection / microState はデフォルトに任せる
    runtime: {
      isFramePlaying: false,
      isCameraAuto: false,
    },
  });

  const cameraEngine = createCameraEngine(uiState.cameraState);

  // selection の唯一の正規ルート（uiState.selection は selectionController 経由でのみ更新）
  const selectionController = createSelectionController(uiState, indices);

  const frameController = {
    set: () => {},
    get: () => {},
    step: () => {},    range: () => {},
    startPlayback: () => {},
    stopPlayback: () => {},
  };

  const visibilityController = {
    isVisible: () => true,
  };

  // microState 計算は専用モジュールへ委譲
  const microController = createMicroController(uiState, indices);

  const modeController = createModeController(
    uiState,
    selectionController,
    microController,
    frameController,
    visibilityController,
    document3dss,
    indices
  );

  const core = {
    uiState,
    cameraEngine,
    selectionController,
    modeController,
    frameController,
    visibilityController,
    microController,
    document3dss,
    indices
  };
  debugBoot("[bootstrap] creating viewerHub");

  const hub = createViewerHub({ core, renderer });

  const cameraInput = new CameraInput(canvasEl, cameraEngine, hub);

  // クリック → pick → selection → mode.focus → microFX は
  // CameraInput.onPointerUp 内のロジックに一本化済み

  if (typeof hub.start === "function") {
    debugBoot("[bootstrap] hub.start()");
    hub.start();
  } else {
    console.warn("[bootstrap] hub.start missing");
  }

  debugBoot("[bootstrap] bootstrapViewer COMPLETE");
  return hub;
}



// ------------------------------------------------------------
// URL から読む標準ルート
// ------------------------------------------------------------
export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  debugBoot("[bootstrap] bootstrapViewerFromUrl:", url);

  const doc = await loadJSON(url);
  if (!doc?.document_meta) {
    console.warn("[bootstrap] WARNING: document_meta missing (3DSS invalid)");
  } else {
     debugBoot("[bootstrap] document_meta OK:", doc.document_meta);
  }

  return bootstrapViewer(canvasOrId, doc, options);
}