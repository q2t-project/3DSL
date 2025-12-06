// viewer/runtime/bootstrapViewer.js

import { createRendererContext } from "./renderer/context.js";
import { createViewerHub } from "./viewerHub.js";
import { createModeController } from "./core/modeController.js";
import { createCameraEngine } from "./core/cameraEngine.js";
import { createCameraTransition } from "./core/cameraTransition.js";
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
const DEBUG_BOOTSTRAP = false; // 開発中だけ true にして詳細ログを見る

function debugBoot(...args) {
  if (!DEBUG_BOOTSTRAP) return;
  console.log(...args);
}


// ------------------------------------------------------------
// schema / version 情報
// ------------------------------------------------------------

// スキーマ側から取得した情報を保持しておく（1.0.2 以降も共通）
// 例：
//   $id: "https://.../3DSS.schema.json#v1.0.2"
//   → { id: $id, version: "1.0.2", major: 1 }
let schemaInfo = null; // { id, version, major }

function extractSchemaInfo(schemaJson) {
  if (!schemaJson || typeof schemaJson !== "object") return null;

  const id =
    typeof schemaJson.$id === "string" && schemaJson.$id.length > 0
      ? schemaJson.$id
      : null;

  let version = null;
  let major = null;

  if (id) {
    const m = id.match(/#v(\d+\.\d+\.\d+)$/);
    if (m) {
      version = m[1];
    }
  }

  if (version) {
    const m2 = version.match(/^(\d+)\./);
    if (m2) {
      major = Number(m2[1]) || null;
    }
  }

  return { id, version, major };
}

function parseMajorFromSemver(v) {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d+)\./);
  return m ? Number(m[1]) || null : null;
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
    // public/3dss/3dss/release/3DSS.schema.json
    const schemaUrl = "../../3dss/3dss/release/3DSS.schema.json";

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
        schemaInfo = extractSchemaInfo(schemaJson);
        if (DEBUG_BOOTSTRAP) {
          debugBoot("[bootstrap] schema loaded:", schemaInfo);
        }
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
// document_meta / version 整合チェック
//   - schema_uri === schema.$id
//   - document_meta.version.major === schemaVersion.major
// ------------------------------------------------------------
function assertDocumentMetaCompatibility(doc) {
  const meta = doc && doc.document_meta;

  if (!meta || typeof meta !== "object") {
    throw new Error("3DSS document is missing required document_meta");
  }

  const schemaUri = meta.schema_uri;
  if (typeof schemaUri !== "string" || !schemaUri) {
    throw new Error("document_meta.schema_uri must be a non-empty string");
  }

  const version = meta.version;
  if (typeof version !== "string" || !version) {
    throw new Error("document_meta.version must be a non-empty string (SemVer)");
  }

  const info = schemaInfo || {};
  const schemaId = info.id || null;
  const schemaMajor = info.major;

  // viewer 仕様：schema_uri の一致（2.2.1, 6.3）
  if (schemaId) {
    if (schemaUri !== schemaId) {
      throw new Error(
        `Unsupported schema_uri: expected "${schemaId}" but got "${schemaUri}"`
      );
    }
  }

  // viewer 仕様：schema $id と document_meta.version の major 一致（6.3）
  const docMajor = parseMajorFromSemver(version);
  if (schemaMajor != null && docMajor != null && docMajor !== schemaMajor) {
    throw new Error(
      `document_meta.version major (${docMajor}) does not match schema major (${schemaMajor})`
    );
  }
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
      logger("MODEL (unknown)");
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
      `LAYERS points=${pointsOn ? "on" : "off"} lines=${linesOn ? "on" : "off"} aux=${auxOn ? "on" : "off"}`
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

  // ------------------------------------------------------------
  // シーンの worldBounds / メトリクスから
  // 「全部がビューに入る」初期カメラを決める
  // ------------------------------------------------------------
  const sceneBounds =
    // structIndex 側で worldBounds を持っている場合
    (indices && indices.worldBounds) ||
    (indices &&
      typeof indices.getWorldBounds === "function" &&
      indices.getWorldBounds()) ||
    // なければ renderer 側のメトリクスにフォールバック
    (typeof renderer.getSceneMetrics === "function"
      ? renderer.getSceneMetrics()
      : null);

  if (DEBUG_BOOTSTRAP) {
    debugBoot("[bootstrap] sceneBounds =", sceneBounds);
  }

  const initialCameraState = {
    theta: 0,
    phi: 1,
    distance: 4,
    target: { x: 0, y: 0, z: 0 },
    fov: 50,
  };

  if (sceneBounds) {
    const center =
      sceneBounds.center ||
      sceneBounds.centre ||
      sceneBounds.mid ||
      null;
    const size = sceneBounds.size || sceneBounds.extents || null;

    let cx = 0,
      cy = 0,
      cz = 0;
    if (center) {
      cx =
        center.x != null
          ? center.x
          : Array.isArray(center)
          ? center[0] || 0
          : 0;
      cy =
        center.y != null
          ? center.y
          : Array.isArray(center)
          ? center[1] || 0
          : 0;
      cz =
        center.z != null
          ? center.z
          : Array.isArray(center)
          ? center[2] || 0
          : 0;
    }

    // 幅・高さ（Z+ up 想定：横幅= max(x, y), 高さ = z）
    let sx = 0,
      sy = 0,
      sz = 0;
    let radius =
      typeof sceneBounds.radius === "number"
        ? sceneBounds.radius
        : null;

    if (size) {
      sx =
        size.x != null
          ? size.x
          : Array.isArray(size)
          ? size[0] || 0
          : 0;
      sy =
        size.y != null
          ? size.y
          : Array.isArray(size)
          ? size[1] || 0
          : 0;
      sz =
        size.z != null
          ? size.z
          : Array.isArray(size)
          ? size[2] || 0
          : 0;

      if (radius == null) {
        radius = Math.max(sx, sy, sz) * 0.5;
      }
    } else if (radius != null) {
      sx = sy = sz = radius * 2;
    } else {
      // 何も情報ないときはデフォルトのまま
      radius = 1;
      sx = sy = sz = 2;
    }

    const width = Math.max(sx, sy);
    const height = sz || Math.max(sx, sy);

    // ビューポートのアスペクト比
    const canvas =
      renderer.domElement || document.getElementById("viewer-canvas");
    const aspect =
      canvas && canvas.clientHeight > 0
        ? canvas.clientWidth / canvas.clientHeight
        : 16 / 9;

    const fovDeg = initialCameraState.fov;
    const vFov = (fovDeg * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    const halfW = width / 2;
    const halfH = height / 2;

    // 縦横どちらもギリ入る距離
    const distV = halfH / Math.tan(vFov / 2);
    const distH = halfW / Math.tan(hFov / 2);
    const distance = Math.max(distV, distH) * 1.2; // ちょいマージン

    initialCameraState.target = { x: cx, y: cy, z: cz };
    initialCameraState.distance = distance;
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

  // micro⇆macro 専用のトランジション
  const cameraTransition = createCameraTransition(cameraEngine, {
    durationMs: 220,
  });

  // selection の唯一の正規ルート
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
    indices,
  );

  const frameController = createFrameController(uiState, visibilityController);

  // microState 計算は専用モジュールへ委譲
  const microController = createMicroController(uiState, indices);

  const modeController = createModeController(
    uiState,
    selectionController,
    cameraEngine,
    cameraTransition,
    microController,
    frameController,
    visibilityController,
    indices,
  );

  const core = {
    // 仕様上の struct 本体（3DSS 生データ）：immutable
    data: struct,
    uiState,
    cameraEngine,
    cameraTransition,
    selectionController,
    modeController,
    frameController,
    visibilityController,
    microController,
    // ... 省略 ...
    recomputeVisibleSet() {
      let visible = null;

      if (
        visibilityController &&
        typeof visibilityController.recompute === "function"
      ) {
        visible = visibilityController.recompute();
      } else if (uiState && uiState.visibleSet) {
        visible = uiState.visibleSet;
      }

      if (microController && typeof microController.refresh === "function") {
        microController.refresh();
      }

      return visible;
    },
  };

  // ★ visibility 側からも必ず正規ルートを叩く
  if (
    visibilityController &&
    typeof visibilityController.setRecomputeHandler === "function"
  ) {
    visibilityController.setRecomputeHandler(() => core.recomputeVisibleSet());
  }

  // 起動直後の visibleSet / microFX 同期（A-5）
  if (typeof core.recomputeVisibleSet === "function") {
    core.recomputeVisibleSet();
  }

  if (
    frameController &&
    typeof frameController.setRecomputeHandler === "function"
  ) {
    frameController.setRecomputeHandler(() => core.recomputeVisibleSet());
  }

  debugBoot("[bootstrap] creating viewerHub");

  const hub = createViewerHub({ core, renderer });

  // ポインタ（マウス / タッチ）入力
  const pointerInput = new PointerInput(canvasEl, cameraEngine, hub);

  // キーボード入力（Arrow / PgUp / PgDn / Home / Q / W / Esc）
  const keyboardInput = new KeyboardInput(window, hub);

  if (typeof hub.start === "function") {
    debugBoot("[bootstrap] hub.start()");
    hub.start();
  } else {
    console.warn("[bootstrap] hub.start missing");
  }

  // A-9: dev viewer 起動ログ
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

  // schema_uri / version の整合チェック（1.0.2 仕様）
  assertDocumentMetaCompatibility(doc);

  const mergedOptions = {
    ...options,
    modelUrl: options.modelUrl || url,
  };

  return bootstrapViewer(canvasOrId, doc, mergedOptions);
}