// viewer/runtime/bootstrapViewer.js

import { createRendererContext } from "./renderer/context.js";
import { createViewerHub } from "./viewerHub.js";
import { createModeController } from "./core/modeController.js";
import { createCameraEngine } from "./core/CameraEngine.js";
import { PointerInput } from "./core/pointerInput.js";
import { KeyboardInput } from "./core/keyboardInput.js";
import { createMicroController } from "./core/microController.js";
import { createSelectionController } from "./core/selectionController.js";
import { createUiState } from "./core/uiState.js";
import { buildUUIDIndex, detectFrameRange } from "./core/structIndex.js";
import { createVisibilityController } from "./core/visibilityController.js";
import { createFrameController } from "./core/frameController.js"; 
import { deepFreeze } from "./core/deepFreeze.js";
import { init as initValidator, validate3DSS, getErrors } from "./core/validator.js";

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------
const DEBUG_BOOTSTRAP = true; // 開発中だけ true にして詳細ログを見る

function debugBoot(...args) {
  if (!DEBUG_BOOTSTRAP) return;
  console.log(...args);
}

// ------------------------------------------------------------
// validator 初期化（1 回だけ）
// ------------------------------------------------------------
let validatorInitialized = false;
let validatorInitPromise = null;

function ensureValidatorInitialized() {
  if (validatorInitialized) {
    return Promise.resolve();
  }

  if (!validatorInitPromise) {
    const schemaUrl = "../3dss/3dss/release/3DSS.schema.json"; // public/3dss/release/3DSS.schema.json

    validatorInitPromise = fetch(schemaUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `validator.init: failed to load schema JSON (${schemaUrl} ${res.status})`
          );
        }
        return res.json();
      })
      .then((schemaJson) => {
        initValidator(schemaJson);
        validatorInitialized = true;
      });
  }

  return validatorInitPromise;
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
// A-9: dev viewer 起動ログ（BOOT / MODEL / CAMERA / LAYERS / FRAME）
// ------------------------------------------------------------
function emitDevBootLog(core, options = {}) {
  try {
    const label = options.devLabel || "viewer_dev";
    const modelPath = options.modelUrl || "";
    const logger =
      typeof options.logger === "function" ? options.logger : console.log;

    // 1) BOOT
    logger(`BOOT  ${label}`);

    // 2) MODEL
    if (modelPath) {
      logger(`MODEL ${modelPath}`);
    } else {
      console.log("MODEL (unknown)");
    }

    // 3) CAMERA {"position":[...],"target":[...],"fov":50}
    let camState = null;

    if (core.cameraEngine && typeof core.cameraEngine.getState === "function") {
      camState = core.cameraEngine.getState();
    } else if (core.uiState && core.uiState.cameraState) {
      camState = core.uiState.cameraState;
    }

    const toVec3Array = (v) => {
      if (!v) return [0, 0, 0];
      if (Array.isArray(v)) {
        const [x = 0, y = 0, z = 0] = v;
        return [Number(x) || 0, Number(y) || 0, Number(z) || 0];
      }
      if (typeof v === "object") {
        const x = Number(v.x) || 0;
        const y = Number(v.y) || 0;
        const z = Number(v.z) || 0;
        return [x, y, z];
      }
      return [0, 0, 0];
    };

    let camPayload = { position: [0, 0, 0], target: [0, 0, 0], fov: 50 };

    if (camState) {
      const pos =
        camState.position || camState.eye || camState.cameraPosition || null;
      const tgt = camState.target || camState.lookAt || null;
      const fov =
        camState.fov != null
          ? Number(camState.fov) || 50
          : core.uiState &&
            core.uiState.cameraState &&
            core.uiState.cameraState.fov != null
          ? Number(core.uiState.cameraState.fov) || 50
          : 50;

      camPayload = {
        position: toVec3Array(pos),
        target: toVec3Array(tgt),
        fov,
      };
    }

    logger("CAMERA " + JSON.stringify(camPayload));

    // 4) LAYERS points/lines/aux
    let pointsOn = true;
    let linesOn = true;
    let auxOn = true;

    const uiState = core.uiState || {};

    // uiState.filters.types を優先
    if (uiState.filters && uiState.filters.types) {
      const t = uiState.filters.types;
      pointsOn = !!t.points;
      linesOn = !!t.lines;
      auxOn = !!t.aux;
    } else if (uiState.visibility_state) {
      // 古い/別フォーマットへのフォールバック
      const v = uiState.visibility_state;
      if (typeof v.points === "boolean") pointsOn = v.points;
      if (typeof v.lines === "boolean") linesOn = v.lines;
      if (typeof v.aux === "boolean") auxOn = v.aux;
    }

    logger(
      `LAYERS points=${pointsOn ? "on" : "off"} ` +
        `lines=${linesOn ? "on" : "off"} aux=${auxOn ? "on" : "off"}`
    );

    // 5) FRAME  frame_id=...
    let frameId = 0;
    if (uiState.frame && typeof uiState.frame.current === "number") {
      frameId = uiState.frame.current;
    } else if (
      core.frameController &&
      typeof core.frameController.get === "function"
    ) {
     frameId = core.frameController.get();
    }

    logger(`FRAME  frame_id=${frameId}`);
  } catch (e) {
    // dev 用ログなんで、こけても致命傷にはしない
    console.warn("[bootstrap] emitDevBootLog failed:", e);
  }
}

// ------------------------------------------------------------
// すでに 3DSS オブジェクトを持っている場合
// ------------------------------------------------------------
export function bootstrapViewer(canvasOrId, document3dss, options = {}) {
  debugBoot("[bootstrap] bootstrapViewer: start");
  debugBoot("[bootstrap] received 3DSS keys =", Object.keys(document3dss));

  // 3DSS 構造データはここで immutable 化して以降は絶対に書き換えない
  const struct = deepFreeze(document3dss);

  const canvasEl = resolveCanvas(canvasOrId);
  debugBoot("[bootstrap] canvas resolved =", canvasEl);

  const indices = buildSimpleIndices(struct);

  debugBoot("[bootstrap] createRendererContext");
  const renderer = createRendererContext(canvasEl);


  

  // 明示同期
  if (typeof renderer.syncDocument === "function") {
    debugBoot("[bootstrap] syncDocument()");
    renderer.syncDocument(struct, indices);
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

  const frameRange = detectFrameRange(struct);

  const uiState = createUiState({
    cameraState: initialCameraState,
    frame: {
      current: frameRange.min,
      range: frameRange,
    },
    runtime: {
      isFramePlaying: false,
      isCameraAuto: false,
    },
  });

  const cameraEngine = createCameraEngine(uiState.cameraState);

  // selection の唯一の正規ルート（uiState.selection は selectionController 経由でのみ更新）
  // A-7: macro 専用 selection ハイライト用に renderer の API を渡す
  const selectionController = createSelectionController(uiState, indices, {
    setHighlight:
      typeof renderer.setHighlight === "function"
        ? (payload) => renderer.setHighlight(payload)
        : undefined,
    clearAllHighlights:
      typeof renderer.clearAllHighlights === "function"
        ? () => renderer.clearAllHighlights()
        : undefined,
  });

  const visibilityController = createVisibilityController(
    uiState,
    struct,
    indices
  );

const frameController = createFrameController(uiState, visibilityController);

  // microState 計算は専用モジュールへ委譲
  const microController = createMicroController(uiState, indices);

  const modeController = createModeController(
    uiState,
    selectionController,
    microController,
    frameController,
    visibilityController,
    indices
  );

  const core = {
    // 仕様上の struct 本体（3DSS 生データ）：immutable
    data: struct,
    uiState,
    cameraEngine,
    selectionController,
    modeController,
    frameController,
    visibilityController,
    microController,
    // 互換用エイリアス（既存コードが使っている可能性があるので当面残す）
    document3dss: struct,
    indices,

    // A-5: frame / filter 変更時の唯一の正規ルート
    // - visibleSet は必ず visibilityController.recompute() 経由で更新
    // - microFX は常に「visibleSet 内だけ」を対象に再評価
    recomputeVisibleSet() {
      let visible = null;

      if (
        visibilityController &&
        typeof visibilityController.recompute === "function"
      ) {
        // ここで uiState.visibleSet も更新される想定
        visible = visibilityController.recompute();
      } else if (uiState && uiState.visibleSet) {
        visible = uiState.visibleSet;
      }

      // microController 側に再評価フックがあれば呼ぶ（なければ無視）
      if (microController && typeof microController.refresh === "function") {
        microController.refresh();
      }

      return visible;
    },
  };

  // 起動直後の visibleSet / microFX 同期（A-5）
  if (typeof core.recomputeVisibleSet === "function") {
    core.recomputeVisibleSet();
  }

  debugBoot("[bootstrap] creating viewerHub");

  const hub = createViewerHub({ core, renderer });

  // ポインタ（マウス / タッチ）入力
  const pointerInput = new PointerInput(canvasEl, cameraEngine, hub);

  // キーボード入力（Arrow / PgUp / PgDn / Home / Q / W / Esc）
  const keyboardInput = new KeyboardInput(window, hub);

  // クリック → pick → selection → mode.focus → microFX は
  // pointerInput.onPointerUp 内のロジックに一本化済み

  if (typeof hub.start === "function") {
    debugBoot("[bootstrap] hub.start()");
    hub.start();
  } else {
    console.warn("[bootstrap] hub.start missing");
  }

  // A-9: dev viewer 起動ログ（BOOT / MODEL / CAMERA / LAYERS / FRAME）
  if (options.devBootLog) {
    emitDevBootLog(core, options);
  }

  debugBoot("[bootstrap] bootstrapViewer COMPLETE");
  return hub;
}

// ------------------------------------------------------------
// URL から読む標準ルート
// ------------------------------------------------------------
export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  debugBoot("[bootstrap] bootstrapViewerFromUrl:", url);

  // まず 3DSS 本体をロード
  const doc = await loadJSON(url);

  // strict full validation（A-4）
  await ensureValidatorInitialized();

  const isValid = validate3DSS(doc);
  if (!isValid) {
    const errors = getErrors() || [];
    console.error("[bootstrap] 3DSS validation failed", errors);

    const msg =
      "3DSS validation failed:\n" +
      errors
        .map(
          (e) =>
            `${e.instancePath || ""} ${
              e.message || e.keyword || "validation error"
            }`
        )
        .join("\n");

    throw new Error(msg);
  }

  debugBoot(
    "[bootstrap] document_meta OK:",
    doc && doc.document_meta ? doc.document_meta : "(no document_meta?)"
  );

  const mergedOptions = {
    ...options,
    modelUrl: options.modelUrl || url,
  };

  return bootstrapViewer(canvasOrId, doc, mergedOptions);
}