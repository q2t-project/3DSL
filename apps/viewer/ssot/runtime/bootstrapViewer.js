// viewer/runtime/bootstrapViewer.js

/**
 * @typedef {Object} PeekCamera
 * @property {(dx:number, dy:number)=>void} rotate
 * @property {(dx:number, dy:number)=>void} pan
 * @property {(delta:number)=>void} zoom
 * @property {()=>any} [getState]
 */

/**
 * @typedef {Object} PeekHandle
 * @property {PeekCamera} camera
 * @property {()=>void} [start]
 * @property {()=>void} [stop]
 * @property {()=>void} [dispose]
 * @property {(w:number, h:number, dpr?:number)=>void} [resize]
 */

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
 *
 * @property {boolean} [strictValidate]
 *   default: true（AJV + meta compatibility を実行）
 * @property {boolean} [validateRefIntegrity]
 *   default: false（重いので任意。trueならref整合も落とす）
 *
 * @property {number} [dpr]
 *   optional: renderer pixelRatio の上限用（peek 等）
 * @property {boolean} [autoStart]
 *   peek 系のときに entry 側で start を host 側で自動実行
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
 * - bootstrapPeekFromUrl(canvasOrId, url, options?) -> Promise<PeekHandle>
 *     A分類（No-UI Host）向けの最小入口。Hub を返さず PeekHandle を返す。
 *     Host は hub/core/renderer を一切触らず、PeekHandle.camera のみ使用する。
 *
 * - bootstrapPeek(canvasOrId, document3dss, options?) -> Promise<PeekHandle>
 *
 * ▼ 禁止事項
 *   - Core / Renderer / CameraEngine など runtime 配下のモジュールを
 *     Host / Astro 側から直接 import / new してはならない。
 *   - 必ず上記 2 関数のどちらかを経由して ViewerHub を取得し、
 *     レンダーループ開始は Host 側で hub の start を host 側で呼ぶ。
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

const _warnOnceSet = new Set();

function warnOnce(key, message) {
  if (_warnOnceSet.has(key)) return;
  _warnOnceSet.add(key);
  try {
    console.warn(message);
  } catch (_e) {}
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

  const anchor =
    typeof schemaJson.$anchor === "string" && schemaJson.$anchor.length > 0
      ? schemaJson.$anchor
      : null;

  let version = null;
  let major = null;

  // 優先: $anchor = "v1.1.3"
  if (anchor) {
    const m = anchor.match(/^v(\d+\.\d+\.\d+)$/);
    if (m) version = m[1];
  }

  // 次: $id に "/v1.1.3/" が含まれるケース（現在の release パス想定）
  if (!version && id) {
    const m = id.match(/\/v(\d+\.\d+\.\d+)\//);
    if (m) version = m[1];
  }

  // 旧: $id の末尾 "#v1.0.2"
  if (!version && id) {
    const m = id.match(/#v(\d+\.\d+\.\d+)$/);
    if (m) version = m[1];
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

// dev-only (optional): <pre id="scene-metrics-pre">
// Host(/viewer) には存在しないことがあるので null 前提で扱う。
// ※これが未宣言のまま参照されると ReferenceError で boot が止まる。
let sceneMetricsPreEl = null;

function resolveSceneMetricsPre() {
  if (sceneMetricsPreEl) return sceneMetricsPreEl;
  if (typeof document === "undefined") return null;
  sceneMetricsPreEl = document.getElementById("scene-metrics-pre");
  return sceneMetricsPreEl;
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
    // public/schemas/3DSS.schema.json
    const schemaUrl = "/schemas/3DSS.schema.json";

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
// legacy normalization
//   - Some older templates emitted a top-level "frames" (often empty array).
//     This key is not part of the current 3DSS root schema, and will fail strict validation.
//     When it is empty/null, we can safely strip it as a no-op canonicalization.
// ------------------------------------------------------------
function normalizeLegacyTopLevelFrames(doc, options = {}) {
  if (!doc || typeof doc !== "object") return doc;
  if (Object.prototype.hasOwnProperty.call(doc, "frames")) {
    const v = doc.frames;
    const isEmptyArray = Array.isArray(v) && v.length === 0;
    const isNullish = v == null;
    if (isEmptyArray || isNullish) {
      const out = { ...doc };
      delete out.frames;
      try {
        if (options?.warnLegacy !== false) {
          console.warn('[bootstrap] stripped empty legacy top-level "frames"');
        }
      } catch (_e) {}
      return out;
    }
  }
  return doc;
}

// ------------------------------------------------------------
// legacy canonicalization (strictValidate=false only)
// ------------------------------------------------------------
function canonicalizeLegacyDoc(doc, options = {}) {
  if (!doc || typeof doc !== "object") return doc;

  let didUuid = false;
  let didPosition = false;
  let didPose = false;
  let didI18n = false;

  const legacyWarnEnabled = options?.warnLegacy !== false;

  const warnIfNeeded = () => {
    if (!legacyWarnEnabled) return;
    if (didUuid) {
      warnOnce("[legacy.uuid]", "[bootstrap] legacy uuid moved to meta.uuid");
    }
    if (didPosition) {
      warnOnce("[legacy.position]", "[bootstrap] legacy position moved to appearance.position");
    }
    if (didPose) {
      warnOnce("[legacy.textPose]", "[bootstrap] legacy marker.text.plane moved to marker.text.pose");
    }
    if (didI18n) {
      warnOnce("[legacy.i18n]", "[bootstrap] legacy document_meta.i18n object normalized to string");
    }
  };

  const isVec3Like = (v) => {
    if (Array.isArray(v) && v.length >= 3) return true;
    if (v && typeof v === "object") {
      return "x" in v || "y" in v || "z" in v;
    }
    return false;
  };

  const pickLegacyPosition = (p) =>
    p?.position ??
    p?.pos ??
    p?.xyz ??
    p?.geometry?.position ??
    p?.geometry?.pos ??
    p?.meta?.position ??
    p?.meta?.pos ??
    null;

  const ensureMetaUuid = (entity) => {
    if (!entity || typeof entity !== "object") return entity;
    const metaUuid = entity?.meta?.uuid;
    if (typeof metaUuid === "string" && metaUuid.trim()) return entity;
    const rawUuid = entity?.uuid;
    if (typeof rawUuid !== "string" || !rawUuid.trim()) return entity;
    const nextMeta = entity.meta && typeof entity.meta === "object"
      ? { ...entity.meta, uuid: rawUuid }
      : { uuid: rawUuid };
    didUuid = true;
    return { ...entity, meta: nextMeta };
  };

  const ensureAppearancePosition = (point) => {
    if (!point || typeof point !== "object") return point;
    if (point.appearance && typeof point.appearance === "object" && "position" in point.appearance) {
      return point;
    }
    const legacyPos = pickLegacyPosition(point);
    if (!isVec3Like(legacyPos)) return point;
    const nextAppearance = point.appearance && typeof point.appearance === "object"
      ? { ...point.appearance, position: legacyPos }
      : { position: legacyPos };
    didPosition = true;
    return { ...point, appearance: nextAppearance };
  };

  const planeToPose = (planeRaw) => {
    if (typeof planeRaw !== "string") return null;
    const plane = planeRaw.trim().toLowerCase();
    if (plane === "billboard") return { mode: "billboard" };
    if (plane === "xy") return { mode: "fixed", front: "+z", up: "+y" };
    if (plane === "yz") return { mode: "fixed", front: "+x", up: "+y" };
    if (plane === "zx") return { mode: "fixed", front: "+y", up: "+z" };
    return null;
  };

  const ensureTextPose = (point) => {
    if (!point || typeof point !== "object") return point;
    const marker = point?.appearance?.marker;
    const text = marker?.text;
    if (!text || typeof text !== "object") return point;
    if (text.pose && typeof text.pose === "object") return point;
    const pose = planeToPose(text.plane);
    if (!pose) return point;
    const nextText = { ...text, pose };
    if ("plane" in nextText) delete nextText.plane;
    const nextMarker = { ...(marker || {}), text: nextText };
    const nextAppearance = point.appearance && typeof point.appearance === "object"
      ? { ...point.appearance, marker: nextMarker }
      : { marker: nextMarker };
    didPose = true;
    return { ...point, appearance: nextAppearance };
  };

  const normalizePoint = (point) => {
    let next = point;
    const nextUuid = ensureMetaUuid(next);
    if (nextUuid !== next) next = nextUuid;
    const nextPos = ensureAppearancePosition(next);
    if (nextPos !== next) next = nextPos;
    const nextPose = ensureTextPose(next);
    if (nextPose !== next) next = nextPose;
    return next;
  };

  const normalizeLine = (line) => ensureMetaUuid(line);
  const normalizeAux = (aux) => ensureMetaUuid(aux);

  const mapArrayIfChanged = (arr, mapper) => {
    if (!Array.isArray(arr)) return arr;
    let changed = false;
    const nextArr = arr.map((item, i) => {
      const nextItem = mapper(item, i);
      if (nextItem !== item) changed = true;
      return nextItem;
    });
    return changed ? nextArr : arr;
  };

  let nextDoc = doc;

  const nextPoints = mapArrayIfChanged(doc.points, normalizePoint);
  if (nextPoints !== doc.points) {
    nextDoc = { ...nextDoc, points: nextPoints };
  }

  const nextLines = mapArrayIfChanged(doc.lines, normalizeLine);
  if (nextLines !== doc.lines) {
    nextDoc = { ...nextDoc, lines: nextLines };
  }

  const nextAux = mapArrayIfChanged(doc.aux, normalizeAux);
  if (nextAux !== doc.aux) {
    nextDoc = { ...nextDoc, aux: nextAux };
  }

  const nextFrames = mapArrayIfChanged(doc.frames, (frame) => {
    if (!frame || typeof frame !== "object") return frame;
    let nextFrame = frame;
    const framePoints = mapArrayIfChanged(frame.points, normalizePoint);
    const frameLines = mapArrayIfChanged(frame.lines, normalizeLine);
    const frameAux = mapArrayIfChanged(frame.aux, normalizeAux);
    if (framePoints !== frame.points) nextFrame = { ...nextFrame, points: framePoints };
    if (frameLines !== frame.lines) nextFrame = { ...nextFrame, lines: frameLines };
    if (frameAux !== frame.aux) nextFrame = { ...nextFrame, aux: frameAux };
    return nextFrame;
  });
  if (nextFrames !== doc.frames) {
    nextDoc = { ...nextDoc, frames: nextFrames };
  }

  const documentMeta = nextDoc.document_meta;
  if (documentMeta && typeof documentMeta === "object") {
    const i18n = documentMeta.i18n;
    if (i18n && typeof i18n === "object" && !Array.isArray(i18n)) {
      let nextLang = null;
      if (typeof i18n.default_language === "string" && i18n.default_language.trim()) {
        nextLang = i18n.default_language.trim();
      } else if (typeof i18n.ja === "string") {
        nextLang = "ja";
      } else if (typeof i18n.en === "string") {
        nextLang = "en";
      } else {
        nextLang = "ja";
      }
      if (nextLang) {
        didI18n = true;
        nextDoc = {
          ...nextDoc,
          document_meta: { ...documentMeta, i18n: nextLang },
        };
      }
    }
  }

  warnIfNeeded();
  return nextDoc;
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
    const logger = typeof options.logger === "function" ? options.logger : console.log;

    logger(`BOOT ${label}`);
    logger(modelPath ? `MODEL ${modelPath}` : "MODEL (unknown)");

    // CAMERA
    const camera =
      core.camera && typeof core.camera.getState === "function"
        ? core.camera
        : core.cameraEngine && typeof core.cameraEngine.getState === "function"
          ? core.cameraEngine
          : null;

    const camState = camera ? camera.getState() : core.uiState?.cameraState || null;

    const toVec3Array = (v) => {
      if (!v) return [0, 0, 0];
      if (Array.isArray(v)) return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
      if (typeof v === "object") return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
      return [0, 0, 0];
    };

    // 追加：position が無い場合のフォールバック
    const derivePosFromOrbit = (st) => {
      const theta = Number(st?.theta);
      const phi = Number(st?.phi);
      const dist = Number(st?.distance);
      const t0 = st?.target || st?.lookAt || null;

      if (!Number.isFinite(theta) || !Number.isFinite(phi) || !Number.isFinite(dist)) return null;

      const tx = Array.isArray(t0) ? (Number(t0[0]) || 0) : (Number(t0?.x) || 0);
      const ty = Array.isArray(t0) ? (Number(t0[1]) || 0) : (Number(t0?.y) || 0);
      const tz = Array.isArray(t0) ? (Number(t0[2]) || 0) : (Number(t0?.z) || 0);

      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      return [
        // Z-up（renderer.updateCamera と同じ）
        tx + dist * sinPhi * Math.cos(theta),
        ty + dist * sinPhi * Math.sin(theta),
        tz + dist * cosPhi,
      ];
    };


    const posRaw = camState?.position || camState?.eye || camState?.cameraPosition || null;
    const tgtRaw = camState?.target || camState?.lookAt || null;

    const posForLog = posRaw ?? (camState ? derivePosFromOrbit(camState) : null);
    const fov = Number(camState?.fov ?? core.uiState?.cameraState?.fov ?? 50) || 50;

    logger("CAMERA " + JSON.stringify({
      position: toVec3Array(posForLog),
      target: toVec3Array(tgtRaw),
      fov
    }));

    // LAYERS
    const t = core.uiState?.filters?.types || {};
    const pointsOn = t.points !== false;
    const linesOn  = t.lines  !== false;
    const auxOn    = t.aux    !== false;
    logger(`LAYERS points=${pointsOn ? "on" : "off"} lines=${linesOn ? "on" : "off"} aux=${auxOn ? "on" : "off"}`);

    // FRAME
    const frameId =
      typeof core.uiState?.frame?.current === "number"
        ? core.uiState.frame.current
        : core.frameController?.getActive?.() ?? 0;

    logger(`FRAME frame_id=${frameId}`);
  } catch (e) {
    console.warn("[bootstrap] emitDevBootLog failed:", e);
  }
}

function applyInitialCameraFromMetrics(uiState, cameraEngine, metrics, fovFallback = 50) {
  const st = uiState.cameraState;
  st.target = st.target || { x: 0, y: 0, z: 0 };

  st.theta = 0;
  st.phi = 1;
  st.distance = 4;
  st.fov = Number.isFinite(fovFallback) ? fovFallback : (st.fov ?? 50);

  const RADIUS_DISTANCE_FACTOR = 2.4;

  if (metrics) {
    const c = metrics.center || metrics.centre || null;
    const s = metrics.size || metrics.extents || null;

    const cx = Array.isArray(c) ? (Number(c[0]) || 0) : (Number(c?.x) || 0);
    const cy = Array.isArray(c) ? (Number(c[1]) || 0) : (Number(c?.y) || 0);
    const cz = Array.isArray(c) ? (Number(c[2]) || 0) : (Number(c?.z) || 0);

    st.target = { x: cx, y: cy, z: cz };

    let radius = Number.isFinite(metrics.radius) ? Number(metrics.radius) : null;
    if ((!radius || radius <= 0) && s) {
      const sx = Array.isArray(s) ? (Number(s[0]) || 0) : (Number(s?.x) || 0);
      const sy = Array.isArray(s) ? (Number(s[1]) || 0) : (Number(s?.y) || 0);
      const sz = Array.isArray(s) ? (Number(s[2]) || 0) : (Number(s?.z) || 0);
      radius = Math.max(sx, sy, sz) * 0.5;
    }
    if (Number.isFinite(radius) && radius > 0) st.distance = radius * RADIUS_DISTANCE_FACTOR;
  }

  if (cameraEngine?.setState) cameraEngine.setState(st);
}

function validateRefIntegrityMinimal(struct, options = {}) {
  const errors = [];

  const points = Array.isArray(struct?.points) ? struct.points : [];
  const lines  = Array.isArray(struct?.lines)  ? struct.lines  : [];
  const aux    = Array.isArray(struct?.aux)    ? struct.aux    : [];
  const allowLegacyUuid = options.allowLegacyUuid === true;

  const pickUuidWithPath = (obj, basePath) => {
    const metaUuid = obj?.meta?.uuid;
    if (typeof metaUuid === "string" && metaUuid.trim()) {
      return { uuid: metaUuid.trim(), path: `${basePath}.meta.uuid` };
    }
    if (allowLegacyUuid) {
      const raw = obj?.uuid;
      if (typeof raw === "string" && raw.trim()) {
        return { uuid: raw.trim(), path: `${basePath}.uuid` };
      }
    }
    return { uuid: null, path: `${basePath}.meta.uuid` };
  };

  // --- uuid set（重複＆存在チェック用）---

const seen = new Map(); // uuid -> first path
const pointUuid = new Set();

const addUuid = (u, path) => {
  if (typeof u !== "string" || !u.trim()) {
    errors.push({ path, msg: "uuid is missing/empty" });
    return;
  }
  const key = u.trim();
  const prev = seen.get(key);
  if (prev) {
    errors.push({ path, msg: `duplicate uuid: ${key} (first: ${prev})` });
    return;
  }
  seen.set(key, path);
};

  points.forEach((p, i) => {
    const got = pickUuidWithPath(p, `points[${i}]`);
    addUuid(got.uuid, got.path);
    if (got.uuid) pointUuid.add(got.uuid);
  });

  lines.forEach((l, i) => {
    const got = pickUuidWithPath(l, `lines[${i}]`);
    addUuid(got.uuid, got.path);
  });
  aux.forEach((a, i) => {
    const got = pickUuidWithPath(a, `aux[${i}]`);
    addUuid(got.uuid, got.path);
  });

// --- line endpoint ref ---
  const extractRefUuid = (v) => {
    if (typeof v === "string") return v.trim() || null;
    if (v && typeof v === "object") {
      const cand =
        v.ref ??
        v.uuid ??
        v.point_uuid ??
        v.ref_uuid ??
        v.id ??
        v.target_uuid ??
        v.a_uuid ?? v.b_uuid ??
        v.end_a_uuid ?? v.end_b_uuid ??
        v.from_uuid ?? v.to_uuid ??
        v.start_uuid ?? v.end_uuid ??
        null;
      return typeof cand === "string" ? (cand.trim() || null) : null;
    }
    return null;
  };

  const pickEndpoint = (line, keys) => {
    // 実データは appearance.* が基本。念のため直下も見る。
    const a = (line && typeof line === "object") ? line.appearance : null;
    for (const k of keys) {
      if (a && Object.prototype.hasOwnProperty.call(a, k)) return a[k];
    }
    for (const k of keys) {
      if (line && Object.prototype.hasOwnProperty.call(line, k)) return line[k];
    }
    return undefined;
  };

  const END_A_KEYS = ["end_a", "end_a_uuid", "a", "a_uuid", "from", "source", "start", "start_uuid"];
  const END_B_KEYS = ["end_b", "end_b_uuid", "b", "b_uuid", "to", "target", "end", "end_uuid"];

  lines.forEach((line, i) => {
    const aRaw = pickEndpoint(line, END_A_KEYS);
    const bRaw = pickEndpoint(line, END_B_KEYS);

    const aUuid = extractRefUuid(aRaw);
    const bUuid = extractRefUuid(bRaw);

    // 端点が uuid として解釈できる場合だけ「存在チェック」する（座標直書き等はスルー）
    if (aUuid && !pointUuid.has(aUuid)) {
      errors.push({ path: `lines[${i}]`, msg: `missing endpoint A point uuid: ${aUuid}` });
    }
    if (bUuid && !pointUuid.has(bUuid)) {
      errors.push({ path: `lines[${i}]`, msg: `missing endpoint B point uuid: ${bUuid}` });
    }
  });

  return errors;
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
 * @returns {Promise<import("./viewerHub.js").ViewerHub>}
 */

export async function bootstrapViewer(canvasOrId, document3dss, options = {}) {
  resolveSceneMetricsPre();
  debugBoot("[bootstrap] bootstrapViewer: start");
  // bootstrapViewer() 直叩きでも safe canonicalization を効かせる
  document3dss = normalizeLegacyTopLevelFrames(document3dss, options);
  debugBoot("[bootstrap] received 3DSS keys =", Object.keys(document3dss || {}));

  const strictValidate = options.strictValidate !== false;
  const validateRefIntegrity = options.validateRefIntegrity === true;

  if (strictValidate) {
    await ensureValidatorInitialized();

    const isValid = validate3DSS(document3dss);
    if (!isValid) {
      const errors = getErrors() || [];
      const formatAjvError = (e) => {
        const path = (e && typeof e.instancePath === "string" && e.instancePath.length) ? e.instancePath : "/";
        let msg = (e && typeof e.message === "string" && e.message.length) ? e.message : (e?.keyword || "validation error");
        const p = e?.params || {};
        if (e?.keyword === "additionalProperties" && typeof p.additionalProperty === "string") {
          msg += ` (additionalProperty: ${p.additionalProperty})`;
        } else if (e?.keyword === "required" && typeof p.missingProperty === "string") {
          msg += ` (missing: ${p.missingProperty})`;
        } else if (e?.keyword === "type" && typeof p.type === "string") {
          msg += ` (expected: ${p.type})`;
        }
        return `${path} ${msg}`.trim();
      };

      const msg =
        "3DSS validation failed:\n" +
        errors.map(formatAjvError).join("\n");
      const err = new Error(msg);
      err.kind = "VALIDATION_ERROR";
      throw err;
    }

    assertDocumentMetaCompatibility(document3dss);
  }

  // 1) legacy canonicalize (strictValidate=false only) + freeze
  if (!strictValidate) {
    document3dss = canonicalizeLegacyDoc(document3dss, options);
  }
  const struct = deepFreeze(document3dss);

  // meta/caption
  const documentMeta = struct?.document_meta && typeof struct.document_meta === "object" ? struct.document_meta : null;
  const scene_meta   = struct?.scene_meta   && typeof struct.scene_meta   === "object" ? struct.scene_meta   : null;
  const documentCaption = deriveDocumentCaptionForViewer(struct);
  const sceneMeta = documentCaption;

  if (validateRefIntegrity) {
    const refErrors = validateRefIntegrityMinimal(struct, {
      allowLegacyUuid: !strictValidate,
    });
    if (refErrors.length) {
      const msg =
        "3DSS ref integrity failed:\n" +
        refErrors.map((e) => `${e.path} ${e.msg}`).join("\n");
      const err = new Error(msg);
      err.kind = "REF_INTEGRITY_ERROR";
      err.details = refErrors;
      throw err;
    }
  }

  // 2) canvas + renderer(context only)
  const canvasEl = resolveCanvas(canvasOrId);
  const renderer = createRendererContext(canvasEl);

  // optional DPR clamp (host が renderer 内部を触らなくて済むように entry 側で吸収)
  try {
    const raw = options?.dpr;
    const dpr =
      (typeof raw === "number" && Number.isFinite(raw))
        ? Math.max(0.5, Math.min(raw, 2))
        : null;
    if (dpr != null) {
      const r = renderer?.renderer ?? renderer ?? null;
      if (r && typeof r.setPixelRatio === "function") {
        r.setPixelRatio(dpr);
      }
    }
  } catch (_e) {}

  // 3) index/range
  const structIndex = buildUUIDIndex(struct);
  const frameRange = detectFrameRange(struct);

  // 後で renderer.syncDocument 後に確定させる。とりあえず先に宣言だけする（TDZ回避）
  const sceneMetrics =
   (typeof structIndex?.getSceneBounds === "function"
     ? structIndex.getSceneBounds()
     : null) ||
   structIndex?.metrics ||
   null;

  // 4) controllers
  // input preset:
  //   - options.viewerSettings.inputPreset
  //   - options.inputPreset
  //   - URL query: ?preset=
  let inputPreset = options?.viewerSettings?.inputPreset ?? options?.inputPreset ?? null;
  if (inputPreset == null) {
    try {
      inputPreset = new URL(window.location.href).searchParams.get('preset');
    } catch (_eU) {}
  }

  const initialViewerSettings =
    options?.viewerSettings && typeof options.viewerSettings === 'object' ? options.viewerSettings : {};

  const uiState = createUiState({
    view_preset_index: 3, // iso_ne
    frame: { current: frameRange.min, range: frameRange },
    runtime: { isFramePlaying: false, isCameraAuto: false },
    cameraState: { theta: 0, phi: 1, distance: 4, target: { x: 0, y: 0, z: 0 }, fov: 50 },
    viewerSettings: {
      ...initialViewerSettings,
      inputPreset,
    },
  });

 const initialCameraState =
   (uiState && uiState.cameraState && typeof uiState.cameraState === "object")
     ? uiState.cameraState
     : {};

  // modeController は後で代入する（forceMacro の参照を安全に）
  let modeController = null;

  // viewerSettings（ここで必ず生成）
  const viewerSettingsController = createViewerSettingsController(uiState, {
    lineWidthMode: "auto",
    microFXProfile: "normal",
    fov: options?.viewerSettings?.camera?.fov,
  });

  // engine は純粋に cameraState 更新だけ（runtime/mode は触らん）
  const cameraEngine = createCameraEngine(initialCameraState, { metrics: sceneMetrics });
  const cameraTransition = createCameraTransition(cameraEngine, { durationMs: 220 });

  const selectionController = createSelectionController(uiState, structIndex, {
    setHighlight: typeof renderer.setHighlight === "function" ? (p) => renderer.setHighlight(p) : undefined,
    clearAllHighlights: typeof renderer.clearAllHighlights === "function" ? () => renderer.clearAllHighlights() : undefined,
    onChanged: (_reason) => {
    uiState._dirtyVisibleSet = true;
    },
  });

  const visibilityController = createVisibilityController(uiState, struct, structIndex);
  const frameController = createFrameController(uiState, visibilityController);
  const microController = createMicroController(uiState, structIndex);

  modeController = createModeController(
    uiState,
    selectionController,
    cameraEngine,
    cameraTransition,
    microController,
    frameController,
    visibilityController,
    structIndex
  );

  // ★ core.camera は façade（ここが runtime.isCameraAuto を一元管理）
  const camera = createCoreCamera(uiState, cameraEngine, modeController);

  // 5) renderer.syncDocument
  if (typeof renderer.syncDocument === "function") {
    renderer.syncDocument(struct, structIndex);
  }

  // 6) metrics → initial camera（syncDocument 後の renderer 由来が取れるなら優先）
  const sceneMetricsFinal =
    (typeof renderer.getSceneMetrics === "function" ? renderer.getSceneMetrics() : null) ||
    sceneMetrics ||
    null;

  applyInitialCameraFromMetrics(
    uiState,
    cameraEngine,
    sceneMetricsFinal,
    viewerSettingsController?.getFov?.()
  );

  // iso preset は「角度だけ」採用して target/distance は metrics を優先
  if (typeof cameraEngine.setViewPreset === "function") {
    const keepTarget = uiState.cameraState.target;
    const keepDist = uiState.cameraState.distance;

    cameraEngine.setViewPreset(uiState.view_preset_index);

    const cam = cameraEngine.getState?.();
    if (cam) {
      uiState.cameraState.theta = cam.theta;
      uiState.cameraState.phi = cam.phi;
      uiState.cameraState.target = keepTarget;
      uiState.cameraState.distance = keepDist;
      cameraEngine.setState?.(uiState.cameraState);
    }
  }

  // 7) recomputeVisibleSet → hub
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

  // 初期可視集合を確定（契約チェック用＆初回描画の安定化）
  recomputeVisibleSet?.();

  // ------------------------------------------------------------------
  // Phase2: recompute handler injection（これが無いと mode/micro が絶対に動かん）
  // ------------------------------------------------------------------
  // Phase2: recompute handler injection
  //   - Controllers request "recompute" but do NOT execute it directly.
  //   - Actual recompute+commit is centralized in viewerHub loop.
  const markDirtyVisibleSet = (_reason) => {
    if (uiState && typeof uiState === "object") uiState._dirtyVisibleSet = true;
  };

  try {
    modeController?.setRecomputeHandler?.(markDirtyVisibleSet);
  } catch (_e) {}

  try {
    frameController?.setRecomputeHandler?.(markDirtyVisibleSet);
  } catch (_e) {}

  try {
    visibilityController?.setRecomputeHandler?.(markDirtyVisibleSet);
  } catch (_e) {}

  // ------------------------------------------------------------------
  // DEBUG: uiState の同一性チェック用（複数 uiState 混在したら一発でバレる）
  // ------------------------------------------------------------------
  try {
    if (uiState && typeof uiState === "object") {
      if (!uiState.__dbgId) {
        Object.defineProperty(uiState, "__dbgId", {
          value: `ui@${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          configurable: true,
        });
      }
      let _wantDbgIdLog = false;
      try {
        const sp = new URLSearchParams(globalThis.location?.search ?? "");
        _wantDbgIdLog = sp.get("dbgHub") === "1";
      } catch (_e) {}
      if (_wantDbgIdLog) console.log("[boot] uiState.__dbgId =", uiState.__dbgId);
    }
  } catch (_e) {}


  // camera はすでに createCoreCamera で確定（ここで再定義しない）

  const core = {
    data: struct,
    structIndex,

    document_meta: documentMeta,
    documentMeta,
    scene_meta,
    documentCaption,
    sceneMeta,

    uiState,
    camera,
    viewerSettingsController,
    cameraEngine,
    cameraTransition,
    selectionController,
    modeController,
    frameController,
    visibilityController,
    microController,
    recomputeVisibleSet,
  };

  if (!core.frameController && core.frame) {
    core.frameController = core.frame; // 互換alias（最終的にはframeController本体に寄せる）
  }

  core.runtime = core.runtime || {};
  if (typeof core.runtime.isFramePlaying !== "function") {
    core.runtime.isFramePlaying = () => !!core.uiState?.runtime?.isFramePlaying;
  }
  if (typeof core.runtime.isCameraAuto !== "function") {
    core.runtime.isCameraAuto = () => !!core.uiState?.runtime?.isCameraAuto;
  }

  const hub = createViewerHub({ core, renderer });
  const wantDevBootLog = options.devBootLog === true;
  if (wantDevBootLog) emitDevBootLog(core, options);

  // ------------------------------------------------------------
  // DEV: expose hub to global for console debugging
  // - enable by: ?dbgHub=1
  // ------------------------------------------------------------
  try {
    const sp = new URLSearchParams(globalThis.location?.search ?? "");
    if (sp.get("dbgHub") === "1") {
      globalThis.viewerHub = hub;
      console.log("[boot] dbgHub=1 -> globalThis.viewerHub exposed", hub);
    }
  } catch (_e) {}


  return hub;
}

function createPeekHandle(hub, options = {}) {
  if (!hub) throw new Error("[bootstrapPeek] hub is missing");

  // 可能なら core.camera façade を優先（autoOrbit停止などがここで担保される）
  const camSrc =
    hub?.core?.camera ??
    hub?.camera ??
    null;

  if (!camSrc) throw new Error("[bootstrapPeek] camera is missing");

  const missing = ["rotate", "pan", "zoom"].filter((k) => typeof camSrc?.[k] !== "function");
  if (missing.length) throw new Error(`[bootstrapPeek] camera missing methods: ${missing.join(", ")}`);

  /** @type {PeekCamera} */
  const camera = {
    rotate: (dx, dy) => camSrc.rotate(dx, dy),
    pan: (dx, dy) => camSrc.pan(dx, dy),
    zoom: (delta) => camSrc.zoom(delta),
    getState: typeof camSrc.getState === "function" ? () => camSrc.getState() : undefined,
  };

  /** @type {PeekHandle} */
  const handle = {
    camera,
    start: typeof hub.start === "function" ? hub.start.bind(hub) : undefined,
    stop: typeof hub.stop === "function" ? hub.stop.bind(hub) : undefined,
    dispose: typeof hub.dispose === "function" ? hub.dispose.bind(hub) : undefined,
    resize: typeof hub.resize === "function" ? hub.resize.bind(hub) : undefined,
  };

  return handle;
}

export async function bootstrapPeek(canvasOrId, document3dss, options = {}) {
  const hub = await bootstrapViewer(canvasOrId, document3dss, options);
  return createPeekHandle(hub, options);
}

export async function bootstrapPeekFromUrl(canvasOrId, url, options = {}) {
  const hub = await bootstrapViewerFromUrl(canvasOrId, url, options);
  return createPeekHandle(hub, options);
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

// ------------------------------------------------------------
// core.camera façade（uiState.runtime.isCameraAuto は core が管理）
//   - 手動操作が入ったら必ず autoOrbit を止める
//   - startAutoOrbit は必ず macro に戻す（micro 中 auto 禁止）
// ------------------------------------------------------------
function createCoreCamera(uiState, cameraEngine, modeController) {
  const rt = uiState.runtime || (uiState.runtime = {});
 if (typeof rt.isCameraAuto !== "boolean") rt.isCameraAuto = false;

  const setAuto = (v) => { rt.isCameraAuto = !!v; };
  const api = {};

  const stopAutoIfRunning = () => {
    if (!rt.isCameraAuto) return;
    try { api.stopAutoOrbit?.(); } catch (_e) {}
    setAuto(false);
  };

  Object.assign(api, {
    // viewerHub render loop 用
    update: (dtSeconds) => cameraEngine.update?.(dtSeconds),

    // 手動操作は auto を止める
    rotate: (dTheta, dPhi) => (stopAutoIfRunning(), cameraEngine.rotate(dTheta, dPhi)),
    pan:    (dx, dy)       => (stopAutoIfRunning(), cameraEngine.pan(dx, dy)),
    zoom:   (delta)        => (stopAutoIfRunning(), cameraEngine.zoom(delta)),
    setState: (partial)    => (stopAutoIfRunning(), cameraEngine.setState(partial)),

    reset: () => {
      stopAutoIfRunning();
      setAuto(false);
      return cameraEngine.reset();
    },

    snapToAxis:    (axis) => (stopAutoIfRunning(), cameraEngine.snapToAxis(axis)),
    setViewByName: (name) => (stopAutoIfRunning(), cameraEngine.setViewByName(name)),
    setViewPreset: (i, o) => (stopAutoIfRunning(), cameraEngine.setViewPreset(i, o)),

    startAutoOrbit: (opts = {}) => {
      // micro 中 autoOrbit を禁止 → 必ず macro に戻す
      try { modeController?.set?.("macro"); } catch (_e) {}
      try { modeController?.forceMacro?.(); } catch (_e) {}
      setAuto(true);
      return cameraEngine.startAutoOrbit?.(opts);
    },
    updateAutoOrbitSettings: (opts = {}) => cameraEngine.updateAutoOrbitSettings?.(opts),
    stopAutoOrbit: () => {
      setAuto(false);
      return cameraEngine.stopAutoOrbit?.();
    },

    // 状態参照
    getState: () => cameraEngine.getState(),
    getViewPresetIndex: () => cameraEngine.getViewPresetIndex?.(),
  });
  return api;
}

export async function bootstrapViewerFromUrl(canvasOrId, url, options = {}) {
  debugBoot("[bootstrap] bootstrapViewerFromUrl:", url);

  let doc;
  try {
    doc = await loadJSON(url);
    doc = normalizeLegacyTopLevelFrames(doc, options);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (!("kind" in err)) {
      err.kind = err.name === "SyntaxError" ? "JSON_ERROR" : "FETCH_ERROR";
    }
    throw err;
  }

  const mergedOptions = { ...options, modelUrl: options.modelUrl || url };
  return await bootstrapViewer(canvasOrId, doc, mergedOptions);
}
