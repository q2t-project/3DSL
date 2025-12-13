// viewer/runtime/bootstrapViewer.js

/**
 * @typedef {string} ViewerLogLine
 */

/**
 * @callback ViewerLogger
 * @param {ViewerLogLine} line
 */

/**
 * @typedef {Object} BootstrapOptions
 * @property {boolean} [devBootLog]
 *    dev 起動ログ（BOOT/MODEL/CAMERA/LAYERS/FRAME）を出すかどうか。
 *    true のときだけ emitDevBootLog が動く。未指定なら false 相当。
 * @property {string} [devLabel]
 *    BOOT 行に埋め込むラベル（例: "viewer_dev", "viewer_embed"）。
 * @property {string} [modelUrl]
 *    MODEL 行に埋め込む識別子（URL か "inline" 等のラベル）。
 * @property {ViewerLogger} [logger]
 *    起動ログの出力先。未指定なら console.log にフォールバックしてもよい。
 */

/**
 * NOTE: Public runtime entrypoints
 *
 * ▼ Host（Astro / HTML）から使ってええ公開 API は基本この 2 つだけ。
 *
 * - bootstrapViewerFromUrl(canvasOrId, url, options?)
 *     Host から叩くことを前提にした「標準入口」。
 *     3DSS を fetch → strict validation → bootstrapViewer に渡すまでを内部で完結する。
 *
 * - bootstrapViewer(canvasOrId, document3dss, options?)
 *     すでに strict validation 済みの 3DSS オブジェクトを直接渡すための低レベル入口。
 *     テストコードやツール用途を想定しており、通常の Astro 埋め込みからは使わない。
 *
 * ▼ 禁止事項
 *   - Core / Renderer / CameraEngine など runtime 配下のモジュールを
 *     Host / Astro 側から直接 import / new してはならない。
 *   - 必ず上記 2 関数のどちらかを経由して ViewerHub を取得し、
 *     レンダーループ開始は Host 側で hub.start() を呼ぶことで制御する。
 */

import { createRendererContext } from "./renderer/context.js";
import { createViewerHub } from "./viewerHub.js";
import { createModeController } from "./core/modeController.js";
import { createCameraEngine } from "./core/cameraEngine.js";
import { createCameraTransition } from "./core/cameraTransition.js";
import { createMicroController } from "./core/microController.js";
import { createSelectionController } from "./core/selectionController.js";
import { createUiState } from "./core/uiState.js";
import { buildUUIDIndex, detectFrameRange } from "./core/structIndex.js";
import { createVisibilityController } from "./core/visibilityController.js";
import { createFrameController } from "./core/frameController.js"; 
import { createViewerSettingsController } from "./core/viewerSettingsController.js";
import { createRecomputeVisibleSet } from "./core/recomputeVisibleSet.js";
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
// 多言語テキスト helper（これはそのまま残す）
// ------------------------------------------------------------
function pickLocalizedText(raw, langCode) {
  const norm = (s) => {
    if (typeof s !== "string") return null;
    const t = s.trim();
    return t.length > 0 ? t : null;
  };

  if (raw == null) return null;

  if (typeof raw === "string") {
    return norm(raw);
  }

  if (typeof raw === "object") {
    const primaryLang =
      langCode === "en" || langCode === "ja" ? langCode : "ja";

    const primary = norm(raw[primaryLang]);
    if (primary) return primary;

    const fallbackLang = primaryLang === "ja" ? "en" : "ja";
    const fallback = norm(raw[fallbackLang]);
    if (fallback) return fallback;
  }

  return null;
}

function resolveI18n(value, lang = "ja") {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return value[lang] || value.ja || value.en || "";
  }
  return "";
}

// ------------------------------------------------------------
// document_meta / scene_meta → documentCaption(title/body) 正規化
//   - 新: document_meta.document_title / document_summary
//   - 旧: document_meta.scene_title / scene_body
//   - さらにルート直下の scene_meta.* も全部 fallback として見る
// ------------------------------------------------------------
function deriveDocumentCaptionForViewer(struct) {
  if (!struct || typeof struct !== "object") return null;

  const documentMeta =
    struct.document_meta && typeof struct.document_meta === "object"
      ? struct.document_meta
      : null;

  // 旧フォーマット互換用：ルート直下の scene_meta
  const sceneMetaRoot =
    struct.scene_meta && typeof struct.scene_meta === "object"
      ? struct.scene_meta
      : null;

  // さらに古い「document_meta.scene」みたいなものも一応見る
  const nestedScene =
    documentMeta &&
    documentMeta.scene &&
    typeof documentMeta.scene === "object"
      ? documentMeta.scene
      : null;

  // ---------------- i18n: 言語コード決定 ----------------
  let langCode = "ja";
  const i18nSource =
    (documentMeta && documentMeta.i18n) ||
    (sceneMetaRoot && sceneMetaRoot.i18n) ||
    null;

  if (typeof i18nSource === "string") {
    langCode = i18nSource === "en" || i18nSource === "ja" ? i18nSource : "ja";
  } else if (
    i18nSource &&
    typeof i18nSource.default_language === "string"
  ) {
    langCode = i18nSource.default_language;
  }

  // 候補フィールドを順に試すヘルパ
  const tryFields = (pairs) => {
    for (const [obj, key] of pairs) {
      if (!obj || !key) continue;
      const v = obj[key];
      const t = pickLocalizedText(v, langCode);
      if (t) return t;
    }
    return null;
  };

  const title =
    tryFields([
      // 新
      [documentMeta, "document_title"],
      // 旧 document_meta.*
      [documentMeta, "scene_title"],
      [documentMeta, "title"],
      // ルート scene_meta.*
      [sceneMetaRoot, "scene_title"],
      [sceneMetaRoot, "title"],
      // さらに古い document_meta.scene.*
      [nestedScene, "scene_title"],
      [nestedScene, "title"],
      // おまけ
      [struct, "document_title"],
      [struct, "title"],
    ]) || null;

  const body =
    tryFields([
      // 新
      [documentMeta, "document_summary"],
      [documentMeta, "document_subtitle"],
      // 旧 document_meta.*
      [documentMeta, "scene_body"],
      [documentMeta, "summary"],
      // ルート scene_meta.*
      [sceneMetaRoot, "scene_summary"],
      [sceneMetaRoot, "summary"],
      [sceneMetaRoot, "body"],
      [sceneMetaRoot, "text"],
      // さらに古い document_meta.scene.*
      [nestedScene, "scene_summary"],
      [nestedScene, "summary"],
      [nestedScene, "body"],
      [nestedScene, "text"],
      // おまけ
      [struct, "document_summary"],
      [struct, "summary"],
    ]) || "";

  if (!title && !body) return null;
  return { title, body };
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
    const schemaUrl = "/3dss/3dss/release/3DSS.schema.json";

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

  // viewer 側では schema_uri の「ベース URL」だけ見る。
  // - schema 側: $id = "…/3DSS.schema.json"
  // - ドキュメント側: "…/3DSS.schema.json#v1.0.3" などを許容
  function normalizeSchemaBase(u) {
    if (typeof u !== "string") return null;
    let s = u.trim();
    if (!s) return null;
    const hashIndex = s.indexOf("#");
    if (hashIndex >= 0) s = s.slice(0, hashIndex);
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  }

  if (schemaId) {
    const expectedBase = normalizeSchemaBase(schemaId);
    const actualBase   = normalizeSchemaBase(schemaUri);
    if (expectedBase && actualBase && expectedBase !== actualBase) {
      throw new Error(
        `Unsupported schema_uri: expected base "${expectedBase}" but got "${schemaUri}"`
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
    // 仕様: "BOOT <label>"
    logger(`BOOT ${label}`);

    // 2) MODEL
    if (modelPath) {
      logger(`MODEL ${modelPath}`);
    } else {
      logger("MODEL (unknown)");
    }

    // 3) CAMERA {"position":[...],"target":[...],"fov":50}
    let camState = null;

    // 仕様イメージ: "起動直後の CameraEngine.getState() 相当"
    // core.camera があればそこから getState()、なければ cameraEngine → uiState の順にフォールバック
    const camera =
      core.camera && typeof core.camera.getState === "function"
        ? core.camera
        : core.cameraEngine && typeof core.cameraEngine.getState === "function"
          ? core.cameraEngine
          : null;

    if (camera) {
      camState = camera.getState();
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
      // 仕様: "値が false のときだけ off、それ以外は on"
      pointsOn = t.points !== false;
      linesOn  = t.lines  !== false;
      auxOn    = t.aux    !== false;
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
      typeof core.frameController.getActive === "function"
    ) {
      frameId = core.frameController.getActive();
    }

    // 仕様: "FRAME frame_id=<n>"
    logger(`FRAME frame_id=${frameId}`);
  } catch (e) {
    // dev 用ログなんで、こけても致命傷にはしない
    console.warn("[bootstrap] emitDevBootLog failed:", e);
  }
}

// ------------------------------------------------------------
// 公開エントリポイント
// ------------------------------------------------------------

/**
 * strict validation 済み 3DSS オブジェクトを受け取って viewer を起動する。
 *
 * 通常の Host（Astro / HTML）からは `bootstrapViewerFromUrl` を使うこと。
 * この関数は「すでに validate 済みの 3DSS を渡したい」テスト / ツール用途向けの
 * 低レベル public API としてのみ利用を許可する。
 *
 * @param {string|HTMLCanvasElement} canvasOrId
 * @param {any} threeDSS strict validation 済み 3DSS ドキュメント
 * @param {BootstrapOptions} [options]
 * @returns {import("./viewerHub.js").ViewerHub}
 */

export function bootstrapViewer(canvasOrId, document3dss, options = {}) {
  debugBoot("[bootstrap] bootstrapViewer: start");
  debugBoot("[bootstrap] received 3DSS keys =", Object.keys(document3dss));

  // 3DSS 構造データはここで immutable 化して以降は絶対に書き換えない
  const struct = deepFreeze(document3dss);

  // 3DSS 本体から document_meta / scene_meta を抜き出し、
  // viewer 用に title/body を正規化した documentCaption も作る
  const documentMeta =
    struct &&
    typeof struct === "object" &&
    struct.document_meta &&
    typeof struct.document_meta === "object"
      ? struct.document_meta
      : null;

  // 旧フォーマット互換用の raw scene_meta（v1 ではルート直下にある想定）
  const scene_meta =
    struct &&
    typeof struct === "object" &&
    struct.scene_meta &&
    typeof struct.scene_meta === "object"
      ? struct.scene_meta
      : null;

  const documentCaption = deriveDocumentCaptionForViewer(struct);

  // 互換 alias（当面 core.sceneMeta でも取れるようにする）
  const sceneMeta = documentCaption;

  const canvasEl = resolveCanvas(canvasOrId);
  debugBoot("[bootstrap] canvas resolved =", canvasEl);

  // ★ 3DSS から structIndex を構築
  const structIndex = buildUUIDIndex(struct);

  debugBoot("[bootstrap] createRendererContext");
  const renderer = createRendererContext(canvasEl);

  // 明示同期
  if (typeof renderer.syncDocument === "function") {
    debugBoot("[bootstrap] syncDocument()");
    // ★ 第2引数に structIndex を渡す
    renderer.syncDocument(struct, structIndex);
  } else {
    console.warn("[bootstrap] renderer.syncDocument missing");
  }

  // ------------------------------------------------------------
  // シーンのメトリクス（center / radius）取得
  // ------------------------------------------------------------
  const metrics =
    // structIndex v1: bounds / getSceneBounds()
    (structIndex && structIndex.bounds) ||
    (structIndex &&
      typeof structIndex.getSceneBounds === "function" &&
      structIndex.getSceneBounds()) ||
    // なければ renderer 側のメトリクスにフォールバック
    (typeof renderer.getSceneMetrics === "function"
      ? renderer.getSceneMetrics()
      : null);

  if (DEBUG_BOOTSTRAP) {
    debugBoot("[bootstrap] sceneMetrics =", metrics);
  }

  // ------------------------------------------------------------
  // シーンの worldBounds / メトリクスから
  // 「全部がビューに入る」初期カメラを決める（1.8.2 準拠）
  // ------------------------------------------------------------
  const initialCameraState = {
    theta: 0,
    // 仕様 1.8.2: phi ≒ 1 rad（やや俯瞰）
    phi: 1,
    distance: 4,
    target: { x: 0, y: 0, z: 0 },
    fov: 50,
  };

  const RADIUS_DISTANCE_FACTOR = 2.4;

 if (metrics) {
    const center =
      metrics.center ||
      metrics.centre ||
      metrics.mid ||
      null;
    const size = metrics.size || metrics.extents || null;

    let cx = 0;
    let cy = 0;
    let cz = 0;

    if (center) {
      if (Array.isArray(center)) {
        const [x = 0, y = 0, z = 0] = center;
        cx = Number(x) || 0;
        cy = Number(y) || 0;
        cz = Number(z) || 0;
      } else if (typeof center === "object") {
        cx = center.x != null ? Number(center.x) || 0 : 0;
        cy = center.y != null ? Number(center.y) || 0 : 0;
        cz = center.z != null ? Number(center.z) || 0 : 0;
      }
    }

    // radius 優先、なければ size から最大半径を推定
    let radius =
      typeof metrics.radius === "number"
        ? Number(metrics.radius)
        : null;

    if ((radius == null || !Number.isFinite(radius) || radius <= 0) && size) {
      let sx = 0;
      let sy = 0;
      let sz = 0;

      if (Array.isArray(size)) {
        const [wx = 0, wy = 0, wz = 0] = size;
        sx = Number(wx) || 0;
        sy = Number(wy) || 0;
        sz = Number(wz) || 0;
      } else if (typeof size === "object") {
        sx = size.x != null ? Number(size.x) || 0 : 0;
        sy = size.y != null ? Number(size.y) || 0 : 0;
        sz = size.z != null ? Number(size.z) || 0 : 0;
      }

      radius = Math.max(sx, sy, sz) * 0.5;
    }

    initialCameraState.target = { x: cx, y: cy, z: cz };

    if (Number.isFinite(radius) && radius > 0) {
      initialCameraState.distance = radius * RADIUS_DISTANCE_FACTOR;
    }
    // radius が取れないときは distance=4 のまま
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

  // ★ viewerSettings の正規ルート（renderer には触らない）
  const viewerSettingsController = createViewerSettingsController(uiState, {
    lineWidthMode: "auto",
    microFXProfile: "normal",
  });

  // ★ 初期ビューはアイソメ [+X +Y]（iso_ne）に固定
  // CAMERA_PRESETS: 0=top,1=front,2=right,3=iso_ne,...
  uiState.view_preset_index = 3;

  // metrics.center / radius を CameraEngine にも渡す
  const cameraEngine = createCameraEngine(uiState.cameraState, {
    metrics,
  });

  // 初期ビュー：view preset index（0〜6）を正規ルートで適用
  if (
    uiState &&
    typeof uiState.view_preset_index === "number" &&
    typeof cameraEngine.setViewPreset === "function"
  ) {
    const presetIndex = uiState.view_preset_index;
    cameraEngine.setViewPreset(presetIndex);

    // CameraEngine 側 state を uiState.cameraState に同期
    const camState = cameraEngine.getState();
    if (camState && uiState.cameraState) {
      uiState.cameraState.theta = camState.theta;
      uiState.cameraState.phi = camState.phi;
      uiState.cameraState.distance = camState.distance;
      uiState.cameraState.target = {
        x: camState.target.x,
        y: camState.target.y,
        z: camState.target.z,
      };
      // fov は viewerSettings.camera.fov が正（A案）
    }
  }

  // micro⇆macro 専用のトランジション
  const cameraTransition = createCameraTransition(cameraEngine, {
    durationMs: 220,
  });

  // selection の唯一の正規ルート
  const selectionController = createSelectionController(uiState, structIndex, {
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
    structIndex,
  );

  const frameController = createFrameController(uiState, visibilityController);

  // microState 計算は専用モジュールへ委譲
  const microController = createMicroController(uiState, structIndex);

  const modeController = createModeController(
    uiState,
    selectionController,
    cameraEngine,
    cameraTransition,
    microController,
    frameController,
    visibilityController,
    structIndex,
  );

  // Phase2: 唯一の更新ルート（A+C 適用）
  const recomputeVisibleSet = createRecomputeVisibleSet({
    uiState,
    structIndex,
    getModel: () => struct,
    visibilityController,
    frameController,
    microController,
    selectionController,
    dropSelectionIfHidden: true,
  });

  const core = {
    // 仕様上の struct 本体（3DSS 生データ）：immutable
    data: struct,
    structIndex, // ★ ここで初めて structIndex を載せる

    // 3DSS の document_meta + viewer 用キャプション
    document_meta: documentMeta,   // raw document_meta
    documentMeta,                  // camel alias
    scene_meta,                    // raw scene_meta (旧フォーマット互換用)
    documentCaption,               // viewer 用 { title, body }
    // 互換 alias（現行 Host は core.sceneMeta から読んでいるため）
    sceneMeta,

    uiState,
    viewerSettingsController,
    cameraEngine,
    cameraTransition,
    selectionController,
    modeController,
    frameController,
    visibilityController,
    microController,
    // ... 省略 ...
    recomputeVisibleSet,
  };

  // ★ visibility / frame からは core 経由じゃなくてもええ（未初期化参照を避ける）
  if (visibilityController?.setRecomputeHandler) {
    visibilityController.setRecomputeHandler((...args) => recomputeVisibleSet(...args));
  }

  if (frameController?.setRecomputeHandler) {
    frameController.setRecomputeHandler((...args) => recomputeVisibleSet(...args));
  }

  // 起動直後の visibleSet / microFX 同期（A-5）
  recomputeVisibleSet?.();

  debugBoot("[bootstrap] creating viewerHub");

  // ★ ここで hub を生成
  const hub = createViewerHub({ core, renderer });

  // ★ ここでは hub.start() は呼ばない（render loop は host 側の責任）
  // if (typeof hub.start === "function") {
  //   debugBoot("[bootstrap] hub.start()");
  //   hub.start();
  // } else {
  //   console.warn("[bootstrap] hub.start missing");
  // }

  // dev viewer 起動ログ
  //
  // - options.devBootLog === true なら必ず出す
  // - devBootLog が未指定で logger だけ渡されている場合も、
  //   「dev 用起動ログを出す」前提で true 相当として扱う
  const wantDevBootLog =
    options.devBootLog ||
    (typeof options.logger === "function" && options.devBootLog !== false);

  if (wantDevBootLog) {
    emitDevBootLog(core, options);
  }

  debugBoot("[bootstrap] bootstrapViewer COMPLETE");
  return hub;
}

/**
 * URL から 3DSS を取得し、strict validation してから bootstrapViewer を呼ぶ。
 *
 * Host（Astro / HTML 埋め込み）から viewer runtime を起動するときの
 * 基本的な公開 API は原則としてこちらだけを使う。
 *
 * @param {string|HTMLCanvasElement} canvasOrId
 * @param {string} url
 * @param {BootstrapOptions} [options]
 * @returns {Promise<import("./viewerHub.js").ViewerHub>}
 */

export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  debugBoot("[bootstrap] bootstrapViewerFromUrl:", url);

  let doc;
  try {
    // まず 3DSS 本体をロード
    doc = await loadJSON(url);
  } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
    if (!("kind" in err)) {
      // 簡易判定：SyntaxError 相当なら JSON_ERROR、それ以外は FETCH_ERROR とみなす
      if (err.name === "SyntaxError") {
        err.kind = "JSON_ERROR";
      } else {
        err.kind = "FETCH_ERROR";
      }
    }
    throw err;
  }

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

    const err = new Error(msg);
    err.kind = "VALIDATION_ERROR";
    throw err;
  }
  debugBoot(
    "[bootstrap] document_meta OK:",
    doc && doc.document_meta ? doc.document_meta : "(no document_meta?)"
  );

  // schema_uri / version の整合チェック（1.0.2 仕様）
  try {
    assertDocumentMetaCompatibility(doc);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (!("kind" in err)) {
      // strict validation と同列扱い
      err.kind = "VALIDATION_ERROR";
    }
    throw err;
  }

  const mergedOptions = {
    ...options,
    modelUrl: options.modelUrl || url,
  };

  return bootstrapViewer(canvasOrId, doc, mergedOptions);
}