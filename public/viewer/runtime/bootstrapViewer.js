// viewer/runtime/bootstrapViewer.js

// ★ いま使うのはこの 2 つだけ
import { createRendererContext } from "./renderer/context.js";
import { createViewerHub } from "./viewerHub.js";
import { createModeController } from "./core/modeController.js";
import { createCameraEngine } from "./core/CameraEngine.js";
import { CameraInput } from "./core/CameraInput.js";
import { createMicroController } from "./core/microController.js";

// canvas id / 要素を正規化
function resolveCanvas(canvasOrId) {
  console.log("[bootstrap] resolveCanvas: input =", canvasOrId);

  if (canvasOrId instanceof HTMLCanvasElement) {
    console.log("[bootstrap] resolved: HTMLCanvasElement");
    return canvasOrId;
  }

  if (typeof canvasOrId === "string") {
    const el = document.getElementById(canvasOrId);
    console.log("[bootstrap] querySelector result =", el);

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
  console.log("[bootstrap] loadJSON:", url);

  const res = await fetch(url);
  console.log("[bootstrap] fetch status =", res.status);

  if (!res.ok) {
    throw new Error(`failed to load JSON: ${url} (${res.status})`);
  }

  const json = await res.json();
  console.log("[bootstrap] loaded JSON keys =", Object.keys(json));
  return json;
}


// 3DSS から最低限の index（uuid → kind）だけ作る
function buildSimpleIndices(document3dss) {
  console.log("[bootstrap] buildSimpleIndices: start");

  const uuidToKind = new Map();

  if (Array.isArray(document3dss.points)) {
    console.log("[bootstrap] indexing points:", document3dss.points.length);
    for (const p of document3dss.points) {
      const uuid = p?.meta?.uuid;
      if (uuid) uuidToKind.set(uuid, "points");
    }
  }

  if (Array.isArray(document3dss.lines)) {
    console.log("[bootstrap] indexing lines:", document3dss.lines.length);
    for (const l of document3dss.lines) {
      const uuid = l?.meta?.uuid;
      if (uuid) uuidToKind.set(uuid, "lines");
    }
  }

  if (Array.isArray(document3dss.aux)) {
    console.log("[bootstrap] indexing aux:", document3dss.aux.length);
    for (const a of document3dss.aux) {
      const uuid = a?.meta?.uuid;
      if (uuid) uuidToKind.set(uuid, "aux");
    }
  }

  console.log("[bootstrap] index size =", uuidToKind.size);
  return { uuidToKind };
}



// ------------------------------------------------------------
// すでに 3DSS オブジェクトを持っている場合
// ------------------------------------------------------------
export function bootstrapViewer(canvasOrId, document3dss, options = {}) {
  console.log("[bootstrap] bootstrapViewer: start");
  console.log("[bootstrap] received 3DSS keys =", Object.keys(document3dss));

  const canvasEl = resolveCanvas(canvasOrId);
  console.log("[bootstrap] canvas resolved =", canvasEl);

  const indices = buildSimpleIndices(document3dss);

  // three.js 周りの初期化
  console.log("[bootstrap] createRendererContext");
  const renderer = createRendererContext(canvasEl);

  // 明示同期
  if (typeof renderer.syncDocument === "function") {
    console.log("[bootstrap] syncDocument()");
    renderer.syncDocument(document3dss, indices);
  } else {
    console.warn("[bootstrap] renderer.syncDocument missing");
  }


  const uiState = {
    cameraState: {
      theta: 0,
      phi: 1,
      distance: 4,
      target: { x: 0, y: 0, z: 0 },
      fov: 50,
    },
    visibleSet: null,
    selection: null,
    microState: null,
    runtime: {
      isFramePlaying: false,
      isCameraAuto: false,
    },
  };

  const cameraEngine = createCameraEngine(uiState.cameraState);

  const selectionController = {
    select: (uuid) => {
      uiState.selection = { uuid };
      return uiState.selection;
    },
    clear: () => {
      uiState.selection = null;
      return null;
    },
    get: () => uiState.selection,
  };

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
  const microController = createMicroController(indices);

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
  console.log("[bootstrap] creating viewerHub");

  const hub = createViewerHub({ core, renderer });

  const cameraInput = new CameraInput(canvasEl, cameraEngine, hub);

  if (typeof hub.start === "function") {
    console.log("[bootstrap] hub.start()");
    hub.start();
  } else {
    console.warn("[bootstrap] hub.start missing");
  }

  console.log("[bootstrap] bootstrapViewer COMPLETE");
  return hub;
}



// ------------------------------------------------------------
// URL から読む標準ルート
// ------------------------------------------------------------
export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  console.log("[bootstrap] bootstrapViewerFromUrl:", url);

  const doc = await loadJSON(url);
  if (!doc?.document_meta) {
    console.warn("[bootstrap] WARNING: document_meta missing (3DSS invalid)");
  } else {
    console.log("[bootstrap] document_meta OK:", doc.document_meta);
  }

  return bootstrapViewer(canvasOrId, doc, options);
}