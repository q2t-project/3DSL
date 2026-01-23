// viewer/runtime/renderer/context.js

import * as THREE from "/vendor/three/build/three.module.js";
import { applyMicroFX as applyMicroFXImpl, clearMicroFX as clearMicroFXImpl } from "./microFX/index.js";
import { microFXConfig } from "./microFX/config.js";
// NOTE: microFXConfig は profile 切替の“状態置き場”としても使える（存在すれば）
import { buildLabelIndex } from "./labels/labelIndex.js";
import { LabelLayer } from "./labels/LabelLayer.js";
import { createWorldAxesLayer } from "./worldAxes.js";
import { createLineEffectsRuntime } from "./effects/lineEffects.js";
// (removed) shared.js dependency
import {
  updateSelectionHighlight as updateSelectionHighlightImpl,
  clearSelectionHighlight as clearSelectionHighlightImpl,
} from "./selectionHighlight.js";
import {
  END_A_KEYS as END_A_KEYS_COMPAT,
  END_B_KEYS as END_B_KEYS_COMPAT,
  pickLineEndpoint as pickLineEndpointCompat,
  collectStringsShallow as collectStringsShallowCompat,
  readPointPos as readPointPosCompat,
  pickUuidCompat,
} from "./adapters/compat.js";

import {
  resolveAssetUrl,
  loadGltfScene,
  cloneGltfScene,
  applyEulerYawPitchRoll,
  applyScaleVec3,
  applyOffsetVec3,
  applyEmissiveFlagToMaterial,
} from "./gltf/gltfRuntime.js";

// ------------------------------------------------------------
// logging
// ------------------------------------------------------------

const DEBUG_RENDERER = false; // 開発中だけ true にする

function debugRenderer(...args) {
  if (!DEBUG_RENDERER) return;
  console.log(...args);
}

function warnRenderer(...args) {
  if (!DEBUG_RENDERER) return;
  console.warn(...args);
}

/**
 * createRendererContext は viewer runtime の内部 API。
 *
 * - host アプリ（Astro 等）は直接呼び出してはならない。
 * - viewer の起動は bootstrapViewer* のみを入口とする。
 */

// canvas -> ctx（同一canvasで renderer を複数生やすのを禁止）
const _canvasContexts = new WeakMap();

const WEBGL_OPTION_KEYS = new Set([
  "alpha",
  "antialias",
  "premultipliedAlpha",
  "preserveDrawingBuffer",
  "powerPreference",
  "depth",
  "stencil",
  "failIfMajorPerformanceCaveat",
  "logarithmicDepthBuffer",
]);

function isPlainObject(v) {
  return !!v && typeof v === "object" && v.constructor === Object;
}

function pickWebGLOptions(renderSettings) {
  // NOTE:
  // - UI設定(render.minLineWidth等)を WebGLRenderer ctor に流すのは禁止
  // - whitelist だけ拾う（特に `error` は絶対に通さない）
  const src = isPlainObject(renderSettings) ? renderSettings : {};
  const webglSrc = isPlainObject(src.webgl) ? src.webgl : src; // top-level互換
  const out = {};
  for (const k of WEBGL_OPTION_KEYS) {
    if (webglSrc[k] === undefined) continue;
    out[k] = webglSrc[k];
  }
  return out;
}

function attachContextEvents(canvas, ctx, label = "viewer") {
  const onLost = (e) => {
    // preventDefault しないと復帰できない
    try { e.preventDefault(); } catch (_e) {}
    warnRenderer(`[${label}] webglcontextlost`, e);
  };
  const onRestored = (e) => {
    warnRenderer(`[${label}] webglcontextrestored`, e);
  };
  const onCreationError = (e) => {
    warnRenderer(`[${label}] webglcontextcreationerror`, e);
  };

  canvas.addEventListener("webglcontextlost", onLost, { passive: false });
  canvas.addEventListener("webglcontextrestored", onRestored);
  canvas.addEventListener("webglcontextcreationerror", onCreationError);

  ctx._offEvents = () => {
    try { canvas.removeEventListener("webglcontextlost", onLost); } catch (_e) {}
    try { canvas.removeEventListener("webglcontextrestored", onRestored); } catch (_e) {}
    try { canvas.removeEventListener("webglcontextcreationerror", onCreationError); } catch (_e) {}
  };
}

export function disposeRendererContext(target) {
  if (!target) return;
  const ctx = target.renderer ? target : _canvasContexts.get(target);
  if (!ctx || ctx._disposed) return;
  ctx._disposed = true;

  const canvas = ctx.canvas;
  try { ctx._offEvents?.(); } catch (_e) {}
  try { ctx._cleanup?.(); } catch (_e) {}

  const r = ctx.renderer;
   if (r) {
     try { r.setAnimationLoop?.(null); } catch (_e) {}
     try { r.dispose?.(); } catch (_e) {}
    // NOTE:
    // forceContextLoss() は WEBGL_lose_context を叩く＝「ページが意図的に context loss を起こした」扱いになり、
    // 作成回数が多いと、Chrome が新規 WebGL コンテキストの作成をブロックすることがある（"blocked" の主因になりやすい）
   }

  ctx.renderer = null;
  ctx.gl = null;

  if (canvas) {
    try { _canvasContexts.delete(canvas); } catch (_e) {}
  }
}

function readVec3(v, fallback = [0, 0, 0]) {
  if (Array.isArray(v) && v.length >= 3) return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
  if (v && typeof v === "object") return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
  return fallback;
}

// scene bounds などの center を vec3 に正規化
function readCenter(v, fallback = [0, 0, 0]) {
  return readVec3(v, fallback);
}

function readColor(v, fallback = 0xffffff) {
  try {
    if (typeof v === "number") return new THREE.Color(v);
    if (typeof v === "string" && v.trim()) return new THREE.Color(v.trim());
  } catch (_e) {}
  return new THREE.Color(fallback);
}

function readOpacity(v, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

// ------------------------------------------------------------
// scene metrics（点座標群から算出：aux除外・生成物依存なし）
// ------------------------------------------------------------
function computeSceneMetricsFromPositions(posList) {
  if (!Array.isArray(posList) || posList.length === 0) return null;
 let minX = +Infinity, minY = +Infinity, minZ = +Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of posList) {
    const x = Number(p?.[0]) || 0;
    const y = Number(p?.[1]) || 0;
    const z = Number(p?.[2]) || 0;
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  let r2 = 0;
  for (const p of posList) {
    const dx = (Number(p?.[0]) || 0) - cx;
    const dy = (Number(p?.[1]) || 0) - cy;
    const dz = (Number(p?.[2]) || 0) - cz;
    const d2 = dx*dx + dy*dy + dz*dz;
    if (d2 > r2) r2 = d2;
  }
  let radius = Math.sqrt(r2);
  if (!Number.isFinite(radius) || radius <= 0) radius = 1; // single-point 対策
  return { center: [cx, cy, cz], radius };
}

// ------------------------------------------------------------
// scene metrics fallback（renderer生成物から算出）
// - aux は除外（grid/axes が bounds を汚す）
// ------------------------------------------------------------
function computeSceneMetricsFromGroups(groups) {
  if (!groups?.points || !groups?.lines) return null;
    try {
      const box = new THREE.Box3().makeEmpty();
      const tmp = new THREE.Box3();
      let any = false;

      tmp.setFromObject(groups.points);
      if (!tmp.isEmpty()) { box.union(tmp); any = true; }

      tmp.setFromObject(groups.lines);
      if (!tmp.isEmpty()) { box.union(tmp); any = true; }

      if (!any || box.isEmpty()) return null;
      const sph = new THREE.Sphere();
      box.getBoundingSphere(sph);
      const r = Number(sph.radius);
      if (!Number.isFinite(r) || r <= 0) return null;
      return { center: [sph.center.x, sph.center.y, sph.center.z], radius: r };
    } catch (_e) {
    return null;
  }
}

let _lastForceLossAt = 0;

function maybeForceContextLoss(renderer, enabled) {
  if (!enabled) return;
  const now = (globalThis.performance?.now?.() ?? Date.now());
  if (now - _lastForceLossAt < 1000) return; // 1秒以内の連打禁止
  _lastForceLossAt = now;
  renderer.forceContextLoss?.();
}

 export function createRendererContext(canvas, viewerSettingsOrRenderSettings = {}, opts = {}) {
  if (!canvas) throw new Error("[renderer] canvas is required");

  // 同一canvasで既に生きてたら必ず破棄する（Phase5/HMR対策の本丸）
  const prev = _canvasContexts.get(canvas);
  if (prev) disposeRendererContext(prev);

  const label = typeof opts.label === "string" ? opts.label : "viewer";
  const modelUrl = typeof opts.modelUrl === "string" ? opts.modelUrl : "";
  const renderSettings =
    (viewerSettingsOrRenderSettings?.render && isPlainObject(viewerSettingsOrRenderSettings.render))
      ? viewerSettingsOrRenderSettings.render
      : viewerSettingsOrRenderSettings;

  const webglOpts = pickWebGLOptions(renderSettings);

  // ctor の error オプション事故防止（混入してても無視）
  // （whitelist方式なので基本来ないが念のため）
  if ("error" in webglOpts) delete webglOpts.error;

  const ctx = {
    canvas,
    renderer: null,
    gl: null,
    _disposed: false,
    _forceLoss: !!opts.forceContextLoss,

    _cleanup: null,
    dispose() { disposeRendererContext(ctx); },
  };

  attachContextEvents(canvas, ctx, label);

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, ...webglOpts });
  } catch (e) {
    // ここで作成できない場合、Chrome にブロックされている可能性が高い
    try { ctx.dispose(); } catch (_e) {}
    throw e;
  }

  ctx.renderer = renderer;
  try { ctx.gl = renderer.getContext?.() ?? null; } catch (_e) { ctx.gl = null; }

  // ------------------------------------------------------------
  // minimal runtime (hub が呼ぶAPIをここで提供)
  // ------------------------------------------------------------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100000);
  camera.up.set(0, 0, 1); // Z-up
  // worldAxes layer は ctx に保持（未宣言参照・再宣言事故を防ぐ）
  // - OFF/FIXED/FULL_VIEW の 3 モード（hub から切替）
  ctx._worldAxesLayer = ctx._worldAxesLayer || null;
  ctx._worldAxesMode = ctx._worldAxesMode ?? 0;

  // sceneMetricsCache は minimal runtime セクションで 1回だけ宣言する（重複防止）
  let sceneMetricsCache = null;

  function ensureWorldAxesLayer() {
    let layer = ctx._worldAxesLayer;
    if (layer && layer.group && layer.group.parent === scene) return layer;

    // もし旧 AxesHelper が残ってたら除去（互換のため）
    if (ctx._worldAxesHelper && ctx._worldAxesHelper.parent) {
      try { ctx._worldAxesHelper.parent.remove(ctx._worldAxesHelper); } catch (_e) {}
    }
    ctx._worldAxesHelper = null;

    layer = createWorldAxesLayer(scene);
    ctx._worldAxesLayer = layer;

    // 初期モード反映
    try { layer.setMode?.(ctx._worldAxesMode); } catch (_e) {}
    try { layer.setVisible?.(ctx._worldAxesMode > 0); } catch (_e) {}
    return layer;
  }

  function setWorldAxesMode(mode) {
    const n = Number(mode);
    const m = n >= 2 ? 2 : n >= 1 ? 1 : 0;
    ctx._worldAxesMode = m;

    const layer = ensureWorldAxesLayer();
    if (!layer) return;

    try { layer.setMode?.(m); } catch (_e) {}
    try { layer.setVisible?.(m > 0); } catch (_e) {}

    // scene radius を反映（FIXED の長さ・FULL_VIEW の fallback に使う）
    if (m > 0) {
      try { layer.updateMetrics?.({ radius: Number(sceneMetricsCache?.radius) || 1 }); } catch (_e) {}
      if (m === 2) {
        try { layer.updateView?.({ camera }); } catch (_e) {}
      }
    }
  }

  function getWorldAxesMode() {
    return Number(ctx._worldAxesMode) || 0;
  }

  // viewerHub.viewerSettings が直接叩く公開 API（互換）
  function setWorldAxesVisible(flag) {
    setWorldAxesMode(flag ? 1 : 0);
  }

  function getWorldAxesVisible() {
    return getWorldAxesMode() > 0;
  }

  ctx.setWorldAxesMode = setWorldAxesMode;
  ctx.getWorldAxesMode = getWorldAxesMode;
  ctx.setWorldAxesVisible = setWorldAxesVisible;
  ctx.getWorldAxesVisible = getWorldAxesVisible;


  const groups = {
    points: new THREE.Group(),
    lines: new THREE.Group(),
    aux: new THREE.Group(),
  };
  scene.add(groups.points, groups.lines, groups.aux);
  const maps = {
    points: new Map(), // uuid -> Object3D
    lines: new Map(),
    aux: new Map(),
  };

  // lineEffects: baseStyle と runtime（flow/glow/pulse/selection 用）
  const baseStyleLines = new Map(); // uuid -> { color: THREE.Color, opacity: number }
  let lineEffectsRuntime = null;
  let _suppressLineEffects = false;

  const labelLayer = new LabelLayer(scene, { renderOrder: 900, camera });
  // viewport is CSS pixels (NOT device pixels). dpr is provided separately.
  const labelViewport = { width: 0, height: 0, dpr: 1 };
  const labelCameraState = { viewport: labelViewport };
  const labelObjects = new Map();
  const lineCaptionAnchors = new Map();
  const auxExtensionAnchors = new Map(); // uuid -> Object3D (world-space anchor for aux.module.extension labels)
  const hudEntries = []; // [{ obj, followCamera, scaleWithDistance, baseOffset, baseQuat, baseScale, baseDistance }]



  const debugMetrics = {
    fps: 0,
    frameMs: 0,
    labelCount: 0,
    labelVisible: 0,
    labelUpdates: 0,
    labelTextRebuilds: 0,
    labelCulledDistance: 0,
    labelCulledScreen: 0,
    labelCulledFrustum: 0,
    labelThrottleSkips: 0,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  };
  let _lastFrameAt = 0;
  let _fpsAvg = 0;
  let _frameAvg = 0;
  const _avgAlpha = 0.12;

  function refreshLabelObjects() {
    labelObjects.clear();
    const src = labelLayer.runtime?.labels;
    if (!src || typeof src.entries !== "function") return;
    for (const [uuid, entry] of src.entries()) {
      if (entry?.obj) labelObjects.set(uuid, entry.obj);
    }
  }

  // selectionHighlight に渡す bundles（labels は LabelLayer で管理）
  const bundles = {
    points: maps.points,
    lines: maps.lines,
    aux: maps.aux,
    labels: labelObjects,
  };

  // microFX/highlight 用：UUID から描画 Object3D を引く。
  // renderer 側で生成した points/lines/aux の描画物は maps.* に登録される前提。
  function getObjectByUuid(uuid) {
    if (!uuid) return null;
    const u = String(uuid);
    return maps.points.get(u) || maps.lines.get(u) || maps.aux.get(u) || null;
  }
  // microFX 中は selection を無効化（microFX > selection、fade-out 中も抑止）
  let _microWasActive = false;
  let _suppressSelectionUntil = 0; // performance.now() 基準
  function _isSelectionSuppressed() {
    const now = (globalThis.performance?.now?.() ?? Date.now());
    return now < _suppressSelectionUntil;
  }
  function _suppressSelectionOn() {
    _microWasActive = true;
    _suppressSelectionUntil = Number.POSITIVE_INFINITY;
  }
  function _suppressSelectionOff() {
    const now = (globalThis.performance?.now?.() ?? Date.now());
    const tr = microFXConfig?.transition || {};
    const enabled = tr.enabled !== undefined ? !!tr.enabled : true;
    const dur = enabled ? Number(tr.durationMs) : 0;
    const ms = Number.isFinite(dur) && dur > 0 ? dur : 0;
    _suppressSelectionUntil = now + ms; // fade-out 中も selection 出さん
    _microWasActive = false;
  }

  function disposeMaterial(mat) {
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) disposeMaterial(m);
      return;
    }
    try { mat.dispose?.(); } catch (_e) {}
  }

  function disposeObjectTree(root) {
    if (!root) return;
    try {
      root.traverse?.((o) => {
        try { o.geometry?.dispose?.(); } catch (_e) {}
        try { disposeMaterial(o.material); } catch (_e) {}
      });
    } catch (_e) {
      // best-effort fallback
      try { root.geometry?.dispose?.(); } catch (_e2) {}
      try { disposeMaterial(root.material); } catch (_e2) {}
    }
  }

  // ------------------------------------------------------------
  // glTF marker support (ctx-scoped)
  // - schema: point.appearance.marker.gltf
  // - async load; attach only if current sync token matches
  // ------------------------------------------------------------

  let _gltfSyncToken = 1;
  /** @type {Map<string, {promise: Promise<THREE.Object3D|null>, scene: THREE.Object3D|null}>} */
  const _gltfTemplateCache = new Map();

  function bumpGltfSyncToken() {
    _gltfSyncToken = (_gltfSyncToken + 1) | 0;
    if (_gltfSyncToken === 0) _gltfSyncToken = 1;
  }

  function clearGltfTemplateCache() {
    for (const entry of _gltfTemplateCache.values()) {
      if (entry?.scene) {
        try { disposeObjectTree(entry.scene); } catch (_e) {}
      }
    }
    _gltfTemplateCache.clear();
  }

  function getGltfTemplate(absUrl) {
    if (!absUrl) return Promise.resolve(null);
    const hit = _gltfTemplateCache.get(absUrl);
    if (hit) return hit.promise;

    const entry = { promise: null, scene: null };
    entry.promise = loadGltfScene(absUrl)
      .then((scene) => {
        entry.scene = scene || null;
        return entry.scene;
      })
      .catch((_e) => {
        _gltfTemplateCache.delete(absUrl);
        return null;
      });
    _gltfTemplateCache.set(absUrl, entry);
    return entry.promise;
  }

  function clearGroup(kind) {
    const g = groups[kind];
    if (!g) return;
    while (g.children.length) {
      const o = g.children[g.children.length - 1];
      g.remove(o);
      disposeObjectTree(o);
    }
    maps[kind].clear();
  }

  // ------------------------------------------------------------
  // picking targets (raycaster)
  // - keep a deduped list of objects that should be raycast targets
  // - avoids intersecting the entire scene graph
  // ------------------------------------------------------------

  /** @type {THREE.Object3D[]} */
  const pickTargets = [];
  /** @type {WeakSet<object>} */
  let _pickTargetSet = new WeakSet();

  function clearPickTargets() {
    pickTargets.length = 0;
    _pickTargetSet = new WeakSet();
  }

  function addPickTarget(obj) {
    if (!obj) return;
    if (_pickTargetSet.has(obj)) return;
    _pickTargetSet.add(obj);
    pickTargets.push(obj);
  }

  function resolvePointPosByUuid(structIndex, uuid) {
    if (!uuid || !structIndex) return null;
    const item = structIndex.uuidToItem?.get?.(uuid) ?? null;
    const p = item?.item ?? item?.point ?? item?.data ?? item ?? null;
    return readPointPosCompat(p, readVec3);
  }

  function resolveEndpoint(structIndex, ep, resolvePointPos) {
  if (typeof ep === "string") {
    const u = ep.trim();
    if (!u) return null;
    return (resolvePointPos ? resolvePointPos(u) : resolvePointPosByUuid(structIndex, u)) ?? null;
  }

  // v1.1.0: endpoint は { ref | coord } を取り得る（coord は直座標）
  if (ep && typeof ep === "object" && ep.coord != null) {
    const c = readVec3(ep.coord, null);
    if (c) return c;
  }

  if (Array.isArray(ep) || (ep && typeof ep === "object" && ("x" in ep || "y" in ep || "z" in ep))) {
    return readVec3(ep, null);
  }

  if (ep && typeof ep === "object") {
    // { coord: [x,y,z] } / { coord: {x,y,z} } を優先で拾う
    if (ep.coord != null) {
      const v = readVec3(ep.coord, null);
      if (v) return v;
    }
    if (typeof ep.ref === "string") {
      const u = ep.ref.trim();
      return (resolvePointPos ? resolvePointPos(u) : resolvePointPosByUuid(structIndex, u)) ?? null;
    }

    // {ref:{uuid|point_uuid|ref_uuid|id:"..."}}
    if (ep.ref && typeof ep.ref === "object") {
      const ru =
        ep.ref.uuid ?? ep.ref.meta?.uuid ??
        ep.ref.point_uuid ?? ep.ref.ref_uuid ?? ep.ref.id ?? null;
      if (typeof ru === "string") {
        const u = ru.trim();
        return (resolvePointPos ? resolvePointPos(u) : resolvePointPosByUuid(structIndex, u)) ?? null;
      }
    }

    // 直下に uuid 系が居るパターン
    const du =
      ep.uuid ?? ep.point_uuid ?? ep.ref_uuid ?? ep.id ?? ep.target_uuid ??
      ep.a_uuid ?? ep.b_uuid ?? ep.end_a_uuid ?? ep.end_b_uuid ??
      ep.from_uuid ?? ep.to_uuid ?? ep.start_uuid ?? ep.end_uuid ?? null;
    if (typeof du === "string") {
      const u = du.trim();
      return (resolvePointPos ? resolvePointPos(u) : resolvePointPosByUuid(structIndex, u)) ?? null;
    }

    // meta.uuid 直下も拾う
    const mu = ep.meta?.uuid;
    if (typeof mu === "string") {
      const u = mu.trim();
      return (resolvePointPos ? resolvePointPos(u) : resolvePointPosByUuid(structIndex, u)) ?? null;
    }
  }

  // NOTE: “形揺れ吸収” は adapters/compat.js に隔離。context.js では再定義しない。

  return null;
}

  ctx.syncDocument = (struct, structIndex) => {
    if (ctx._disposed) return;

    debugRenderer("[renderer] syncDocument input", {
      hasRootPoints: Array.isArray(struct?.points),
      rootPointsLen: struct?.points?.length ?? null,
      hasRootLines: Array.isArray(struct?.lines),
      rootLinesLen: struct?.lines?.length ?? null,
      hasRootAux: Array.isArray(struct?.aux),
      rootAuxLen: struct?.aux?.length ?? null,
      hasFrames: Array.isArray(struct?.frames),
      framesLen: struct?.frames?.length ?? null,
      indexSize: structIndex?.uuidToItem?.size ?? null,
    });

    clearGroup("points");
    clearGroup("lines");
    clearGroup("aux");

    lineCaptionAnchors.clear();
    auxExtensionAnchors.clear();
    hudEntries.length = 0;

    // cancel pending glTF marker loads for previous document
    bumpGltfSyncToken();

    // metrics は毎回作り直し
    sceneMetricsCache = null;

    // rebuild 前に selection を一旦クリア（selectionGroup が module-global で残り得る）
    try { clearSelectionHighlightImpl(scene); } catch (_e) {}
    try { clearMicroFXImpl(scene); } catch (_e) {}
    _microWasActive = false;
    _suppressSelectionUntil = 0;
    _suppressLineEffects = false;

    baseStyleLines.clear();
    lineEffectsRuntime = null;

    clearPickTargets();

    const frames = Array.isArray(struct?.frames) ? struct.frames : [];

    function collect(key) {
      const out = [];
      const seen = new Set();
      const push = (it) => {
        const u = pickUuidCompat(it);
        if (!u || seen.has(u)) return;
        seen.add(u);
        out.push(it);
      };
      if (Array.isArray(struct?.[key])) for (const it of struct[key]) push(it);
      for (const fr of frames) {
        if (Array.isArray(fr?.[key])) for (const it of fr[key]) push(it);
      }
      return out;
    }

    const pts = collect("points");
    const lns = collect("lines");
    const axs = collect("aux");

    const pointPosByUuid = new Map();
    for (const p of pts) {
      const u = pickUuidCompat(p);
      if (!u) continue;
      const pos = readPointPosCompat(p, readVec3);
      if (pos) pointPosByUuid.set(u, pos);
      else warnRenderer("[renderer] point pos missing", u, p);
    }

    // ------------------------------------------------------------
    // scene metrics をここで一度だけ確定（点サイズ/axes/初期カメラで共通）
    //   1) bounds（最優先）
    //   2) 点座標群（生成物に依存しない）
    //   3) groups（最後の保険：線のみ等）
    // ------------------------------------------------------------
    sceneMetricsCache = null;
    try {
      const b = structIndex?.bounds ?? structIndex?.getSceneBounds?.() ?? null;
      const r = Number(b?.radius);
      if (Number.isFinite(r) && r > 0) {
        const cRaw = b?.center ?? b?.centroid ?? b?.origin ?? b?.box?.center ?? null;
        sceneMetricsCache = { center: readCenter(cRaw, [0, 0, 0]), radius: r };
      }
    } catch (_e) {}
    if (!sceneMetricsCache) {
      const m = computeSceneMetricsFromPositions(Array.from(pointPosByUuid.values()));
      if (m && Number(m.radius) > 0) sceneMetricsCache = m;
    }

    function resolvePointPos(uuid) {
      if (!uuid) return null;
      const local = pointPosByUuid.get(uuid);
      if (local) return local;

      // structIndex fallback（形揺れ吸収）
      const hit = structIndex?.uuidToItem?.get?.(uuid) ?? null;
      const p = hit?.item ?? hit?.point ?? hit?.data ?? hit?.value ?? hit ?? null;
      return readPointPosCompat(p, readVec3);
    }

    // ---- scale（点が小さすぎて見えん問題を避ける）----
    let sceneRadius = Number(sceneMetricsCache?.radius);
    if (!Number.isFinite(sceneRadius) || sceneRadius <= 0) sceneRadius = null;

    // points: marker primitives (sphere/box/...) + fallback
    if (pts.length) {
      debugRenderer("[renderer] point[0] uuid candidates", {
        uuid: pts[0]?.uuid,
        meta_uuid: pts[0]?.meta?.uuid,
        id: pts[0]?.id,
        picked: pickUuidCompat(pts[0]),
      });
    }
    const pointSyncToken = _gltfSyncToken;

    function applyCommonToMaterial(mat, { colorHex, opacity, wireframe, emissive }) {
      if (!mat) return;
      if (Array.isArray(mat)) {
        for (const m of mat) applyCommonToMaterial(m, { colorHex, opacity, wireframe, emissive });
        return;
      }
      try {
        if (mat.color && typeof mat.color.set === "function") mat.color.set(colorHex);
      } catch (_e) {}
      try {
        if ("opacity" in mat) {
          const op = Math.max(0, Math.min(1, Number(opacity)));
          if (Number.isFinite(op)) {
            mat.opacity = op;
            if (op < 1) {
              mat.transparent = true;
              mat.depthWrite = false;
            }
          }
        }
      } catch (_e) {}
      try {
        if ("wireframe" in mat) mat.wireframe = !!wireframe;
      } catch (_e) {}
      try { applyEmissiveFlagToMaterial(mat, colorHex, !!emissive); } catch (_e) {}
    }

    function createPyramidGeometry(baseW, baseD, height) {
      const w = Math.max(0.0001, Number(baseW) || 1);
      const d = Math.max(0.0001, Number(baseD) || 1);
      const h = Math.max(0.0001, Number(height) || 1);
      const hw = w / 2;
      const hd = d / 2;
      const hh = h / 2;
      const positions = new Float32Array([
        -hw, -hh, -hd, // 0
         hw, -hh, -hd, // 1
         hw, -hh,  hd, // 2
        -hw, -hh,  hd, // 3
          0,  hh,   0, // 4 apex
      ]);
      const indices = [
        0, 2, 1,
        0, 3, 2,
        0, 1, 4,
        1, 2, 4,
        2, 3, 4,
        3, 0, 4,
      ];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }

    for (const p of pts) {
      const uuid = pickUuidCompat(p);
      if (!uuid) continue;
      const pos = resolvePointPos(uuid);
      if (!pos) { warnRenderer("[renderer] skip point (no pos)", uuid, p); continue; }

      const marker = (p?.appearance?.marker && typeof p.appearance.marker === "object") ? p.appearance.marker : null;
      const common = (marker?.common && typeof marker.common === "object") ? marker.common : null;

      // common (color/opacity/wireframe/emissive)
      const col = readColor(
        common?.color ?? marker?.color ?? p?.appearance?.color ?? p?.color,
        0xffffff,
      );
      const colorHex = (() => { try { return `#${col.getHexString()}`; } catch (_e) { return "#ffffff"; } })();
      const op = readOpacity(
        common?.opacity ?? marker?.opacity ?? p?.appearance?.opacity ?? p?.opacity,
        1,
      );
      const wireframe = !!(common?.wireframe ?? marker?.wireframe);
      const emissive = !!(common?.emissive ?? marker?.emissive);

      // common (scale/orientation)
      const commonScale = readVec3(common?.scale, [1, 1, 1]);
      const commonOri = readVec3(common?.orientation, [0, 0, 0]); // [yaw, pitch, roll] (rad)

      const baseR =
        sceneRadius != null
          ? Math.max(0.15, Math.min(2.5, sceneRadius * 0.02))
          : 0.6;

      const root = new THREE.Group();
      root.position.set(pos[0], pos[1], pos[2]);
      root.userData.uuid = uuid;
      root.userData.kind = "points";
      root.userData.__markerPrimitive = (typeof marker?.primitive === "string" ? marker.primitive.trim().toLowerCase() : "") || "sphere";
      applyScaleVec3(root, commonScale);
      applyEulerYawPitchRoll(root, commonOri);

      // marker primitive
      const prim = root.userData.__markerPrimitive;

      const isTrans = (op < 1) || !!emissive;
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: isTrans,
        opacity: op,
        depthWrite: !isTrans,
        wireframe,
        side: (prim === "corona") ? THREE.DoubleSide : THREE.FrontSide,
      });
      applyCommonToMaterial(mat, { colorHex, opacity: op, wireframe, emissive });

      let mesh = null;
      if (prim === "none") {
        // invisible pick proxy (so the point remains selectable even without a primitive)
        const geo = new THREE.SphereGeometry(Math.max(0.05, baseR * 0.4), 8, 8);
        const pm = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        mesh = new THREE.Mesh(geo, pm);
        mesh.userData.__pickProxy = true;
      } else if (prim === "box") {
        const s = Array.isArray(marker?.size) ? marker.size : null;
        const sx = Number(s?.[0]);
        const sy = Number(s?.[1]);
        const sz = Number(s?.[2]);
        const bx = Number.isFinite(sx) && sx > 0 ? sx : (baseR * 2);
        const by = Number.isFinite(sy) && sy > 0 ? sy : (baseR * 2);
        const bz = Number.isFinite(sz) && sz > 0 ? sz : (baseR * 2);
        mesh = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat);
      } else if (prim === "cone") {
        const rr = Number(marker?.radius);
        const hh = Number(marker?.height);
        const r = (Number.isFinite(rr) && rr > 0) ? rr : baseR;
        const h = (Number.isFinite(hh) && hh > 0) ? hh : (baseR * 2);
        mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 16), mat);
      } else if (prim === "pyramid") {
        const b = Array.isArray(marker?.base) ? marker.base : null;
        const bw0 = Number(b?.[0]);
        const bd0 = Number(b?.[1]);
        const hh = Number(marker?.height);
        const bw = (Number.isFinite(bw0) && bw0 > 0) ? bw0 : (baseR * 2);
        const bd = (Number.isFinite(bd0) && bd0 > 0) ? bd0 : (baseR * 2);
        const h = (Number.isFinite(hh) && hh > 0) ? hh : (baseR * 2);
        mesh = new THREE.Mesh(createPyramidGeometry(bw, bd, h), mat);
      } else if (prim === "corona") {
        const ir0 = Number(marker?.inner_radius);
        const or0 = Number(marker?.outer_radius);
        const ir = (Number.isFinite(ir0) && ir0 > 0) ? ir0 : (baseR * 0.7);
        const or = (Number.isFinite(or0) && or0 > 0) ? or0 : (baseR * 1.0);
        mesh = new THREE.Mesh(new THREE.RingGeometry(ir, or, 32), mat);
      } else {
        // default: sphere
        const rr = Number(marker?.radius);
        const r = (Number.isFinite(rr) && rr > 0) ? rr : baseR;
        mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), mat);
      }

      if (mesh) {
        root.add(mesh);
      }

      // marker.gltf (async)
      const gltfCfg = (marker?.gltf && typeof marker.gltf === "object") ? marker.gltf : null;
      const gltfUrl = (typeof gltfCfg?.url === "string") ? gltfCfg.url : "";
      const absGltfUrl = resolveAssetUrl(gltfUrl, modelUrl);
      if (absGltfUrl) {
        const slot = new THREE.Group();
        slot.userData.__markerGltfSlot = true;
        root.add(slot);

        void getGltfTemplate(absGltfUrl).then((tpl) => {
          if (!tpl) return;
          if (ctx._disposed) return;
          if (pointSyncToken !== _gltfSyncToken) return;
          if (!root.parent) return;

          // clear previous
          while (slot.children.length) {
            const o = slot.children[slot.children.length - 1];
            slot.remove(o);
            disposeObjectTree(o);
          }

          const inst = cloneGltfScene(tpl, { cloneMaterials: true });
          if (!inst) return;

          applyOffsetVec3(inst, readVec3(gltfCfg?.offset, [0, 0, 0]));
          applyScaleVec3(inst, readVec3(gltfCfg?.scale, [1, 1, 1]));
          applyEulerYawPitchRoll(inst, readVec3(gltfCfg?.rotation, [0, 0, 0]));

          // apply common visual flags to glTF materials too
          try {
            inst.traverse((o) => {
              if (!o || !o.isMesh) return;
              applyCommonToMaterial(o.material, { colorHex, opacity: op, wireframe, emissive });
            });
          } catch (_e) {}

          slot.add(inst);
        });
      }

      groups.points.add(root);
      maps.points.set(uuid, root);
      addPickTarget(root);
    }



    // ------------------------------------------------------------
    // lines: appearance.line_type + geometry (schema)
    // ------------------------------------------------------------
    function _normLineType(v) {
      if (typeof v !== "string") return "straight";
      const s = v.trim().toLowerCase();
      return (s === "polyline" || s === "catmullrom" || s === "bezier" || s === "arc") ? s : "straight";
    }

    function _normLineStyle(v) {
      if (typeof v !== "string") return "solid";
      const s = v.trim().toLowerCase();
      return (s === "solid" || s === "dashed" || s === "dotted" || s === "double" || s === "none") ? s : "solid";
    }

    function _clampInt(n, lo, hi) {
      const x = Math.trunc(Number(n));
      if (!Number.isFinite(x)) return lo;
      return Math.max(lo, Math.min(hi, x));
    }

    function _near3(a, b, eps = 1e-6) {
      if (!a || !b) return false;
      const dx = (a[0] - b[0]);
      const dy = (a[1] - b[1]);
      const dz = (a[2] - b[2]);
      return (dx*dx + dy*dy + dz*dz) <= (eps*eps);
    }

    function _normalizeVec3List(raw, dim) {
      const out = [];
      if (!Array.isArray(raw)) return out;
      for (const v of raw) {
        const p = readVec3(v, null);
        if (!p) continue;
        if (dim === 2) p[2] = 0;
        out.push(p);
      }
      return out;
    }

    function _ensureEndpoints(points, a, b) {
      const out = Array.isArray(points) ? points.slice() : [];
      if (!out.length) return [a, b];
      if (!_near3(out[0], a)) out.unshift(a);
      if (!_near3(out[out.length - 1], b)) out.push(b);

      // 連続重複を除去（epsilon）
      const compact = [out[0]];
      for (let i = 1; i < out.length; i++) {
        if (_near3(out[i], compact[compact.length - 1])) continue;
        compact.push(out[i]);
      }
      return compact.length >= 2 ? compact : [a, b];
    }

    function _polylineLength(points) {
      if (!Array.isArray(points) || points.length < 2) return 0;
      let len = 0;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const dz = p1[2] - p0[2];
        len += Math.sqrt(dx*dx + dy*dy + dz*dz);
      }
      return len;
    }

    function _polylineMidpoint(points) {
      if (!Array.isArray(points) || points.length < 2) return [0, 0, 0];
      const total = _polylineLength(points);
      if (!(total > 0)) {
        const p0 = points[0];
        const p1 = points[points.length - 1];
        return [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5, (p0[2] + p1[2]) * 0.5];
      }

      const half = total * 0.5;
      let acc = 0;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const dz = p1[2] - p0[2];
        const seg = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (acc + seg >= half) {
          const t = seg > 0 ? (half - acc) / seg : 0;
          return [p0[0] + dx * t, p0[1] + dy * t, p0[2] + dz * t];
        }
        acc += seg;
      }
      return points[points.length - 1].slice();
    }

    function _estimateCurveLength(curve, samples = 16) {
      try {
        const pts = curve.getPoints(_clampInt(samples, 4, 64));
        let len = 0;
        for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
        return len;
      } catch (_e) {}
      return 0;
    }

    function _chooseCurveSegments(estimatedLen, sceneRadius) {
      const r = (Number.isFinite(sceneRadius) && sceneRadius > 0)
        ? sceneRadius
        : (estimatedLen > 0 ? estimatedLen : 1);
      const rel = estimatedLen / Math.max(1e-6, r);

      // 長さ=radius のとき 24 分割くらい
      return _clampInt(Math.round(24 * rel), 12, 160);
    }

    function _v3(p) {
      return new THREE.Vector3(
        Number(p?.[0]) || 0,
        Number(p?.[1]) || 0,
        Number(p?.[2]) || 0
      );
    }

    function _buildLineVertices({ lineType, geometry, a, b, sceneRadius }) {
      const g = (geometry && typeof geometry === "object") ? geometry : null;
      const dim = (g?.dimension === 2) ? 2 : 3;
      const A = (dim === 2) ? [a[0], a[1], 0] : a;
      const B = (dim === 2) ? [b[0], b[1], 0] : b;

      if (lineType === "polyline") {
        const pts = _normalizeVec3List(g?.polyline_points, dim);
        return _ensureEndpoints(pts, A, B);
      }

      if (lineType === "catmullrom") {
        const pts = _normalizeVec3List(g?.catmullrom_points, dim);
        const anchors = _ensureEndpoints(pts, A, B);
        if (anchors.length < 2) return [A, B];

        const tensionRaw = Number(g?.catmullrom_tension);
        const tension =
          (Number.isFinite(tensionRaw) && tensionRaw >= 0 && tensionRaw <= 1)
            ? tensionRaw
            : 0.5;

        const curve = new THREE.CatmullRomCurve3(anchors.map(_v3));
        curve.curveType = "catmullrom";
        curve.tension = tension;

        const est = _estimateCurveLength(curve, 24);
        const segs = _chooseCurveSegments(est, sceneRadius);
        const ptsOut = curve.getPoints(segs);
        return ptsOut.map((v) => [v.x, v.y, v.z]);
      }

      if (lineType === "bezier") {
        const cs = _normalizeVec3List(g?.bezier_controls, dim);
        if (!cs.length) return [A, B];

        let curve = null;
        if (cs.length >= 2) {
          curve = new THREE.CubicBezierCurve3(_v3(A), _v3(cs[0]), _v3(cs[1]), _v3(B));
        } else {
          curve = new THREE.QuadraticBezierCurve3(_v3(A), _v3(cs[0]), _v3(B));
        }

        const est = _estimateCurveLength(curve, 24);
        const segs = _chooseCurveSegments(est, sceneRadius);
        const ptsOut = curve.getPoints(segs);
        return ptsOut.map((v) => [v.x, v.y, v.z]);
      }

      if (lineType === "arc") {
        const center = readVec3(g?.arc_center, null);
        const rRaw = Number(g?.arc_radius);
        const a0 = Number(g?.arc_angle_start);
        const a1 = Number(g?.arc_angle_end);

        if (!center || !(Number.isFinite(rRaw) && rRaw > 0) || !Number.isFinite(a0) || !Number.isFinite(a1)) {
          return [A, B];
        }
        if (dim === 2) center[2] = 0;

        const clockwise = !!g?.arc_clockwise;
        let sweep = a1 - a0;
        if (clockwise) {
          if (sweep > 0) sweep -= Math.PI * 2;
        } else {
          if (sweep < 0) sweep += Math.PI * 2;
        }

        const est = Math.abs(sweep) * rRaw;
        const segs = _chooseCurveSegments(est, sceneRadius);

        const out = [];
        for (let i = 0; i <= segs; i++) {
          const t = segs > 0 ? (i / segs) : 0;
          const th = a0 + sweep * t;
          out.push([
            center[0] + rRaw * Math.cos(th),
            center[1] + rRaw * Math.sin(th),
            center[2],
          ]);
        }
        return out.length >= 2 ? out : [A, B];
      }

      return [A, B];
    }


    // lines: LineSegments(2pts)
    if (lns.length) {
      debugRenderer("[renderer] line[0] shape", {
        pickedUuid: pickUuidCompat(lns[0]),
        keys: Object.keys(lns[0] || {}),
        appearanceKeys: Object.keys(lns[0]?.appearance || {}),
        geometryKeys: Object.keys(lns[0]?.geometry || {}),
        endpointsKeys: Object.keys(lns[0]?.endpoints || {}),
        aRaw: pickLineEndpointCompat(lns[0], END_A_KEYS_COMPAT),
        bRaw: pickLineEndpointCompat(lns[0], END_B_KEYS_COMPAT),
      });
    }
    for (const line of lns) {
      const uuid = pickUuidCompat(line);
      if (!uuid) continue;
      const aRaw = pickLineEndpointCompat(line, END_A_KEYS_COMPAT);
      const bRaw = pickLineEndpointCompat(line, END_B_KEYS_COMPAT);
      debugRenderer("[renderer] line endpoints raw", aRaw, bRaw);
      const a = resolveEndpoint(structIndex, aRaw, resolvePointPos);
      const b = resolveEndpoint(structIndex, bRaw, resolvePointPos);
      if (!a || !b) {
        warnRenderer("[renderer] skip line (endpoint unresolved)", uuid, { aRaw, bRaw, a, b });
        continue;
      }


// ------------------------------------------------------------
// lineProfile -> renderer.userData （effects/lineEffectsRuntime 用）
// ------------------------------------------------------------
const prof = structIndex?.lineProfile?.get?.(uuid) || null;

// schema: appearance.line_type / appearance.line_style（structIndex の既定値も拾う）
const lineType = _normLineType(
  line?.appearance?.line_type ?? line?.appearance?.lineType ?? prof?.lineType
);
const lineStyle = _normLineStyle(
  line?.appearance?.line_style ?? line?.appearance?.lineStyle ?? prof?.lineStyle
);
if (lineStyle === "none") continue;

// appearance.visible (schema)
const visibleFlag = (line?.appearance?.visible ?? prof?.visible);
if (visibleFlag === false) continue;

const geometryCfg =
  (line?.appearance?.geometry && typeof line.appearance.geometry === "object")
    ? line.appearance.geometry
    : ((line?.geometry && typeof line.geometry === "object") ? line.geometry : null);

const vertices = _buildLineVertices({ lineType, geometry: geometryCfg, a, b, sceneRadius });
const aDraw = (Array.isArray(vertices) && vertices.length) ? vertices[0] : a;
const bDraw = (Array.isArray(vertices) && vertices.length) ? vertices[vertices.length - 1] : b;
const pathLen = Math.max(1e-6, _polylineLength(vertices));

// line caption anchor (path midpoint)
try {
  const mid = _polylineMidpoint(vertices);
  const anchor = new THREE.Object3D();
  anchor.position.set(mid[0], mid[1], mid[2]);
  lineCaptionAnchors.set(uuid, anchor);
} catch (_e) {}

let effectType = null;
let effect = null;
if (prof && prof.effect && typeof prof.effect === "object") {
  const t = prof.effect.effect_type;
  if (typeof t === "string" && t !== "none") {
    effectType = t;
    effect = { ...prof.effect };
    delete effect.effect_type;

    // structIndex 側の easing 名（ease-in/out 系）を runtime 側に寄せる
    if (typeof effect.easing === "string") {
      const ez = effect.easing;
      if (ez === "ease-in") effect.easing = "quad_in";
      else if (ez === "ease-out") effect.easing = "quad_out";
      else if (ez === "ease-in-out") effect.easing = "quad_in_out";
    }

    // flow の向きは sense から推測（明示されてるなら尊重）
    if (effectType === "flow" && !effect.direction) {
      const sense = prof.sense;
      effect.direction = sense === "b_to_a" ? "backward" : "forward";
    }
  }
}

const useDashed =
  lineStyle === "dashed" || lineStyle === "dotted" || effectType === "flow";

const col = readColor(line?.appearance?.color ?? line?.color, 0xffffff);
const op = readOpacity(line?.appearance?.opacity ?? line?.opacity, 1);

let mat;
if (useDashed) {
  let dashSize;
  let gapSize;
  if (lineStyle === "dotted") {
    dashSize = pathLen / 60;
    gapSize = pathLen / 20;
  } else {
    dashSize = pathLen / 12;
    gapSize = dashSize * 0.6;
  }

  dashSize = Math.max(0.02, Math.min(dashSize, pathLen));
  gapSize = Math.max(0.02, Math.min(gapSize, pathLen));

  mat = new THREE.LineDashedMaterial({
    color: col,
    transparent: op < 1,
    opacity: op,
    dashSize,
    gapSize,
  });
} else {
  mat = new THREE.LineBasicMaterial({
    color: col,
    transparent: op < 1,
    opacity: op,
  });
}

const geo = new THREE.BufferGeometry();
try {
  const pos = [];
  if (Array.isArray(vertices)) {
    for (const v of vertices) pos.push(v[0], v[1], v[2]);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
} catch (_e) {
  geo.setAttribute("position", new THREE.Float32BufferAttribute([
    aDraw[0], aDraw[1], aDraw[2],
    bDraw[0], bDraw[1], bDraw[2],
  ], 3));
}

// straight は LineSegments、曲線/ポリラインは Line として連結描画
const seg = (lineType === "straight")
  ? new THREE.LineSegments(geo, mat)
  : new THREE.Line(geo, mat);

if (mat.isLineDashedMaterial) {
  try { seg.computeLineDistances(); } catch (_e) {}
}
seg.userData.uuid = uuid;
seg.userData.kind = "lines";

// appearance.render_order (schema)
try {
  const ro = Number(line?.appearance?.render_order ?? line?.appearance?.renderOrder ?? prof?.renderOrder ?? 0);
  if (Number.isFinite(ro)) seg.renderOrder = ro;
} catch (_e) {}

// lineEffectsRuntime が読む
seg.userData.lineType = lineType;
seg.userData.lineStyle = lineStyle;
if (prof && typeof prof.sense === "string") seg.userData.sense = prof.sense;
if (effectType && effect) {
  seg.userData.effectType = effectType;
  seg.userData.effect = effect;
}
      // arrow (V1): appearance.arrow
      try {
        const ar = (line?.appearance?.arrow && typeof line.appearance.arrow === "object")
          ? line.appearance.arrow
          : null;

        if (ar) {
          const prim = (typeof ar.primitive === "string" ? ar.primitive.trim().toLowerCase() : "") || "cone";
          let placement = (typeof ar.placement === "string" ? ar.placement.trim().toLowerCase() : "");
          if (!placement) placement = (prof?.sense === "b_to_a") ? "end_a" : "end_b";
          if (placement !== "end_a" && placement !== "end_b" && placement !== "both" && placement !== "none") {
            placement = (prof?.sense === "b_to_a") ? "end_a" : "end_b";
          }
          const autoOrient = ar.auto_orient !== undefined ? !!ar.auto_orient : true;

          if (prim !== "none" && placement !== "none") {
            const dx2 = bDraw[0] - aDraw[0];
            const dy2 = bDraw[1] - aDraw[1];
            const dz2 = bDraw[2] - aDraw[2];
            const len2 = Math.max(1e-6, Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2));

            // サイズ（未指定はシーン/線長から推測）
            const hRaw = (prim === "line") ? Number(ar.length) : Number(ar.height);
            let height =
              (Number.isFinite(hRaw) && hRaw > 0)
                ? hRaw
                : (sceneRadius != null ? (sceneRadius * 0.06) : (len2 * 0.22));
            height = Math.max(0.05, Math.min(height, len2 * 0.5));

            const rRaw = (prim === "line") ? (Number(ar.thickness) * 0.5) : Number(ar.radius);
            let radius =
              (Number.isFinite(rRaw) && rRaw > 0)
                ? rRaw
                : Math.max(0.03, height * 0.25);

            // pyramid の base があれば優先（[w,h]）
            if (prim === "pyramid" && Array.isArray(ar.base) && ar.base.length >= 2) {
              const bw = Number(ar.base[0]);
              const bh = Number(ar.base[1]);
              const bmax = Math.max(Number.isFinite(bw) ? bw : 0, Number.isFinite(bh) ? bh : 0);
              if (bmax > 0) radius = Math.max(radius, bmax * 0.5);
            }

            const radialSegments = prim === "pyramid" ? 4 : 16;
            const baseAxis = new THREE.Vector3(0, 1, 0);

            const addArrow = (tipVec, dirVec) => {
              const dir = dirVec.clone();
              const dlen = dir.length();
              if (dlen < 1e-6) return;
              dir.multiplyScalar(1 / dlen);

              // V1: cone を基本形として描く（pyramid は radialSegments=4）
              const geoArrow = new THREE.ConeGeometry(radius, height, radialSegments);
              const matArrow = new THREE.MeshBasicMaterial({
                color: col.clone?.() ?? col,
                transparent: op < 1,
                opacity: op,
              });
              const mesh = new THREE.Mesh(geoArrow, matArrow);
              mesh.userData.kind = "lines";
              mesh.userData.uuid = uuid;

              if (autoOrient) {
                const q = new THREE.Quaternion().setFromUnitVectors(baseAxis, dir);
                mesh.quaternion.copy(q);
              }

              // ConeGeometry は中心原点・先端が +Y 側（= +height/2）
              mesh.position.copy(tipVec);
              mesh.position.addScaledVector(dir, -height * 0.5);

              seg.add(mesh);
            };

            const dirAB = new THREE.Vector3(dx2, dy2, dz2);
            const dirBA = dirAB.clone().multiplyScalar(-1);

            if (placement === "end_b" || placement === "both") addArrow(new THREE.Vector3(bDraw[0], bDraw[1], bDraw[2]), dirAB);
            if (placement === "end_a" || placement === "both") addArrow(new THREE.Vector3(aDraw[0], aDraw[1], aDraw[2]), dirBA);
          }
        }
      } catch (_e) {}
      // NOTE: 必ず scene に追加する（これを忘れると lines が描画されない）
      groups.lines.add(seg);

      // uuid->object / pick
      try { maps.lines.set(uuid, seg); } catch (_e) {}
      try { addPickTarget(seg); } catch (_e) {}

      // lineEffects が base に戻すためのスナップショット（1回だけ記録）
      try {
        baseStyleLines.set(uuid, {
          color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
          opacity: typeof mat.opacity === "number" ? mat.opacity : 1,
          linewidth: typeof mat.linewidth === "number" ? mat.linewidth : 1,
        });
      } catch (_e) {}
    }

    // lines が揃った後で runtime を作る（毎フレーム updateLineEffects で反映）
    try {
      lineEffectsRuntime = createLineEffectsRuntime({
        lineObjects: maps.lines,
        baseStyle: baseStyleLines,
      });
    } catch (_e) {
      lineEffectsRuntime = null;
    }


// aux: struct.aux
// schema: aux[].appearance.module (grid / axis / plate / shell / hud / extension)
function _readVec2(v, fallback) {
  if (Array.isArray(v) && v.length >= 2) {
    const x = Number(v[0]);
    const y = Number(v[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
  }
  return fallback;
}


function _asPlainObject(v) {
  return (v && typeof v === "object" && !Array.isArray(v)) ? v : null;
}

function _clampInt(raw, min, max, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
}

function _readNumFromParams(params, key, fallback) {
  if (!params) return fallback;
  const n = Number(params[key]);
  return Number.isFinite(n) ? n : fallback;
}

function _readBoolFromParams(params, key, fallback) {
  if (!params) return fallback;
  const v = params[key];
  if (v === undefined) return fallback;
  return !!v;
}

function _readVec3FromParams(params, key, fallback) {
  if (!params) return fallback;
  return readVec3(params[key], fallback);
}

// module.extension.parametric: safe, no-eval procedural shapes
function buildParametricExtensionObject(parametric, opts) {
  const p = _asPlainObject(parametric);
  if (!p) return null;

  const typeRaw = (typeof p.type === "string") ? p.type.trim().toLowerCase() : "";
  if (!typeRaw) return null;

  const params = _asPlainObject(p.params) || {};

  const defaultOpacity = readOpacity(opts?.defaultOpacity, 0.4);
  const renderOrder = Number.isFinite(Number(opts?.renderOrder)) ? Number(opts.renderOrder) : 0;

  const col = readColor(params.color, 0xffffff);
  const op = readOpacity(params.opacity, defaultOpacity);
  const depthWrite = _readBoolFromParams(params, "depth_write", false);

  const mkLine = (positions) => {
    if (!Array.isArray(positions) || positions.length < 6) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: col,
      transparent: op < 1,
      opacity: op,
    });
    try { mat.depthWrite = depthWrite; } catch (_e) {}
    const ln = new THREE.Line(geo, mat);
    ln.renderOrder = renderOrder;
    return ln;
  };

  const mkPoints = (positions) => {
    if (!Array.isArray(positions) || positions.length < 3) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const size = _readNumFromParams(params, "size", 2);
    const mat = new THREE.PointsMaterial({
      color: col,
      size: Math.max(0.01, size),
      sizeAttenuation: true,
      transparent: op < 1,
      opacity: op,
    });
    try { mat.depthWrite = depthWrite; } catch (_e) {}
    const pts = new THREE.Points(geo, mat);
    pts.renderOrder = renderOrder;
    return pts;
  };

  const mkMesh = (geo) => {
    if (!geo) return null;
    const wireframe = _readBoolFromParams(params, "wireframe", false);
    const sideRaw = (typeof params.side === "string") ? params.side.trim().toLowerCase() : "";
    const side =
      (sideRaw === "front") ? THREE.FrontSide
        : (sideRaw === "back") ? THREE.BackSide
          : THREE.DoubleSide;

    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: op < 1,
      opacity: op,
      side,
      wireframe,
    });
    try { mat.depthWrite = depthWrite; } catch (_e) {}
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = renderOrder;
    return mesh;
  };

  // normalize type (accept curve.polyline / curve:polyline etc.)
  const t = typeRaw.replace(/[^a-z0-9]+/g, "_");

  let obj = null;

  // -----------------------------
  // curve: polyline
  // params.points: flat [x0,y0,z0,x1,y1,z1,...]
  // -----------------------------
  if (t === "polyline" || t === "curve_polyline" || t === "curve_line") {
    const pts = Array.isArray(params.points) ? params.points : (Array.isArray(params.positions) ? params.positions : null);
    if (pts && pts.length >= 6) {
      const closed = _readBoolFromParams(params, "closed", false);
      const positions = pts.map((v) => Number(v) || 0);
      if (closed && positions.length >= 6) {
        positions.push(positions[0], positions[1], positions[2]);
      }
      obj = mkLine(positions);
    }
  }

  // -----------------------------
  // curve: circle
  // params: radius, segments, plane("xy"|"xz"|"yz"), center([x,y,z]), phase
  // -----------------------------
  if (!obj && (t === "circle" || t === "curve_circle")) {
    const r = Math.max(0.0001, Math.abs(_readNumFromParams(params, "radius", 10)));
    const seg = _clampInt(params.segments, 3, 8192, 128);
    const plane = (typeof params.plane === "string" ? params.plane.trim().toLowerCase() : "xy") || "xy";
    const center = _readVec3FromParams(params, "center", [0, 0, 0]);
    const phase = _readNumFromParams(params, "phase", 0);

    const positions = [];
    for (let i = 0; i <= seg; i++) {
      const a = phase + (i / seg) * Math.PI * 2;
      const c = Math.cos(a) * r;
      const s = Math.sin(a) * r;

      let x = 0, y = 0, z = 0;
      if (plane === "xz") { x = c; z = s; y = 0; }
      else if (plane === "yz") { y = c; z = s; x = 0; }
      else { x = c; y = s; z = 0; }

      positions.push(center[0] + x, center[1] + y, center[2] + z);
    }
    obj = mkLine(positions);
  }

  // -----------------------------
  // curve: helix
  // params: radius, pitch, turns, segments, axis("x"|"y"|"z"), center([x,y,z]), phase
  // -----------------------------
  if (!obj && (t === "helix" || t === "curve_helix" || t === "spiral")) {
    const r = Math.max(0.0001, Math.abs(_readNumFromParams(params, "radius", 10)));
    const pitch = _readNumFromParams(params, "pitch", 2);
    const turns = _readNumFromParams(params, "turns", 3);
    const seg = _clampInt(params.segments, 8, 20000, 512);
    const axis = (typeof params.axis === "string" ? params.axis.trim().toLowerCase() : "z") || "z";
    const center = _readVec3FromParams(params, "center", [0, 0, 0]);
    const phase = _readNumFromParams(params, "phase", 0);

    const positions = [];
    const total = pitch * turns;
    for (let i = 0; i <= seg; i++) {
      const t0 = i / seg;
      const a = phase + t0 * Math.PI * 2 * turns;
      const c = Math.cos(a) * r;
      const s = Math.sin(a) * r;
      const along = total * t0;

      let x = 0, y = 0, z = 0;
      if (axis === "x") { x = along; y = c; z = s; }
      else if (axis === "y") { y = along; x = c; z = s; }
      else { z = along; x = c; y = s; }

      positions.push(center[0] + x, center[1] + y, center[2] + z);
    }
    obj = mkLine(positions);
  }

  // -----------------------------
  // points: from flat array
  // type: points
  // -----------------------------
  if (!obj && (t === "points" || t === "pointcloud")) {
    const pts = Array.isArray(params.points) ? params.points : (Array.isArray(params.positions) ? params.positions : null);
    if (pts && pts.length >= 3) {
      const positions = pts.map((v) => Number(v) || 0);
      obj = mkPoints(positions);
    }
  }

  // -----------------------------
  // surface: plane
  // params: size([w,h]) or width/height, seg_x, seg_y, plane("xy"|"xz"|"yz")
  // -----------------------------
  if (!obj && (t === "plane" || t === "surface_plane")) {
    const size = _readVec2(params.size, null);
    const w = Math.max(0.001, Math.abs(Number(size?.[0] ?? _readNumFromParams(params, "width", 64))) || 64);
    const h = Math.max(0.001, Math.abs(Number(size?.[1] ?? _readNumFromParams(params, "height", 64))) || 64);

    const sx = _clampInt(params.seg_x ?? params.segments_x, 1, 2048, 10);
    const sy = _clampInt(params.seg_y ?? params.segments_y, 1, 2048, 10);

    const geo = new THREE.PlaneGeometry(w, h, sx, sy);
    const mesh = mkMesh(geo);
    if (mesh) {
      const plane = (typeof params.plane === "string" ? params.plane.trim().toLowerCase() : "xy") || "xy";
      if (plane === "xz") mesh.rotation.x = Math.PI / 2;
      else if (plane === "yz") mesh.rotation.y = Math.PI / 2;
      obj = mesh;
    }
  }

  // -----------------------------
  // surface: sphere
  // params: radius, wseg, hseg
  // -----------------------------
  if (!obj && (t === "sphere" || t === "surface_sphere")) {
    const r = Math.max(0.001, Math.abs(_readNumFromParams(params, "radius", 32)));
    const ws = _clampInt(params.wseg ?? params.width_segments, 3, 512, 32);
    const hs = _clampInt(params.hseg ?? params.height_segments, 2, 512, 20);
    const geo = new THREE.SphereGeometry(r, ws, hs);
    obj = mkMesh(geo);
  }

  // transform overrides on the generated object
  if (obj) {
    try {
      const off = _readVec3FromParams(params, "offset", null) || _readVec3FromParams(params, "position", null);
      if (off) obj.position.set(off[0], off[1], off[2]);
    } catch (_e) {}
    try {
      const rot = _readVec3FromParams(params, "rotation", null);
      if (rot) applyEulerYawPitchRoll(obj, rot);
    } catch (_e) {}
    try {
      const sc = _readVec3FromParams(params, "scale", null);
      if (sc) applyScaleVec3(obj, sc);
    } catch (_e) {}

    obj.userData.__auxExtensionParametric = { type: typeRaw, version: p.version, params };
  }

  return obj;
}


for (const aux of axs) {
  const uuid = aux?.signification?.uuid || pickUuidCompat(aux) || crypto.randomUUID();
  const app = (aux?.appearance && typeof aux.appearance === "object") ? aux.appearance : {};

  // appearance.visible (schema)
  if (app.visible === false) continue;

  const root = new THREE.Group();
  root.userData.uuid = uuid;
  root.userData.kind = "aux";

  // spatial
  const pos = readVec3(app.position, [0, 0, 0]);
  root.position.set(pos[0], pos[1], pos[2]);

  const orient = readVec3(app.orientation, null);
  if (orient) applyEulerYawPitchRoll(root, orient);

  const sc = readVec3(app.scale, null);
  if (sc) applyScaleVec3(root, sc);

  // appearance.render_order (schema)
  try {
    const ro = Number(app.render_order ?? app.renderOrder ?? 0);
    if (Number.isFinite(ro)) root.renderOrder = ro;
  } catch (_e) {}

  const mod = (app.module && typeof app.module === "object") ? app.module : null;

  // backward-compat: tags (aux:grid / aux:axis / aux:plane / aux:shell)
  const tags = readTags(aux?.meta?.tags);
  const hasTag = (t) => tags.includes(t);

  const gridCfg = (mod?.grid && typeof mod.grid === "object") ? mod.grid : (hasTag("aux:grid") ? {} : null);
  const axisCfg = (mod?.axis && typeof mod.axis === "object") ? mod.axis : (hasTag("aux:axis") ? {} : null);
  const plateCfg = (mod?.plate && typeof mod.plate === "object") ? mod.plate : (hasTag("aux:plane") ? {} : null);
  const shellCfg = (mod?.shell && typeof mod.shell === "object") ? mod.shell : (hasTag("aux:shell") ? {} : null);
  const hudCfg = (mod?.hud && typeof mod.hud === "object") ? mod.hud : null;

  // ------------------------------------------------------------
  // module.grid
  // ------------------------------------------------------------
  if (gridCfg) {
    const g = gridCfg;
    const lengthRaw = Number(g.length);
    const stepRaw = Number(g.step);
    const length = (Number.isFinite(lengthRaw) && lengthRaw > 0) ? lengthRaw : 64;
    const step = (Number.isFinite(stepRaw) && stepRaw > 0) ? stepRaw : 4;
    const divisions = Math.max(1, Math.round(length / step));
    const helper = new THREE.GridHelper(length, divisions);

    // GridHelper defaults Y-up (grid on XZ), rotate to Z-up (grid on XY)
    helper.rotation.x = Math.PI / 2;

    const col = readColor(g.color, 0xc8c8ff);
    const op = readOpacity(g.opacity, 0.4);

    // GridHelper.material は配列（中心線/格子線）
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material];
    for (const m of mats) {
      if (m && m.color) m.color.set(col);
      m.transparent = op < 1;
      m.opacity = op;
      m.depthWrite = false;
    }

    helper.renderOrder = root.renderOrder;
    root.add(helper);
  }

  // ------------------------------------------------------------
  // module.axis
  // ------------------------------------------------------------
  if (axisCfg) {
    const a = axisCfg;
    const lengthRaw = Number(a.length);
    const length = (Number.isFinite(lengthRaw) && lengthRaw > 0) ? lengthRaw : 64;

    const axisGroup = new THREE.Group();

    const arrowCfg = (a.arrow && typeof a.arrow === "object") ? a.arrow : {};
    const arrowsVisible = (arrowCfg.visible !== false);
    const arrowPos = (typeof arrowCfg.position === "string") ? arrowCfg.position : "end"; // end | both
    const arrowStyle = (typeof arrowCfg.style === "string") ? arrowCfg.style : "cone"; // cone | sphere
    const arrowSizeRaw = Number(arrowCfg.size);
    const arrowSize = (Number.isFinite(arrowSizeRaw) && arrowSizeRaw > 0) ? arrowSizeRaw : 2;

    const arrowOpacity = readOpacity(arrowCfg.opacity, 1);

    // base axis lines
    const bothDir = (arrowPos === "both");
    const x0 = bothDir ? -length : 0;
    const x1 = length;
    const y0 = bothDir ? -length : 0;
    const y1 = length;
    const z0 = bothDir ? -length : 0;
    const z1 = length;

    const mkLine = (from, to, colorHex) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([
        from[0], from[1], from[2],
        to[0], to[1], to[2],
      ], 3));
      const mat = new THREE.LineBasicMaterial({ color: colorHex });
      const ln = new THREE.LineSegments(geo, mat);
      ln.renderOrder = root.renderOrder;
      return ln;
    };

    axisGroup.add(mkLine([x0, 0, 0], [x1, 0, 0], 0xff0000));
    axisGroup.add(mkLine([0, y0, 0], [0, y1, 0], 0x00ff00));
    axisGroup.add(mkLine([0, 0, z0], [0, 0, z1], 0x0000ff));

    // arrows
    if (arrowsVisible) {
      const colorX = readColor(arrowCfg.color_x, 0xff8080);
      const colorY = readColor(arrowCfg.color_y, 0x80ff80);
      const colorZ = readColor(arrowCfg.color_z, 0x8080ff);

      const mkArrow = (dir, tip, colorHex) => {
        let geom;
        if (arrowStyle === "sphere") {
          geom = new THREE.SphereGeometry(arrowSize, 12, 8);
        } else {
          geom = new THREE.ConeGeometry(arrowSize * 0.6, arrowSize * 1.8, 10);
        }

        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: arrowOpacity < 1,
          opacity: arrowOpacity,
          depthWrite: false,
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(tip[0], tip[1], tip[2]);

        if (arrowStyle !== "sphere") {
          // cone: +Y を向くので dir に合わせる
          const q = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(dir[0], dir[1], dir[2]).normalize()
          );
          mesh.setRotationFromQuaternion(q);
        }

        mesh.renderOrder = root.renderOrder;
        return mesh;
      };

      const pushAxisArrows = (dir, tipPos, tipNeg, col) => {
        axisGroup.add(mkArrow(dir, tipPos, col));
        if (bothDir) axisGroup.add(mkArrow([-dir[0], -dir[1], -dir[2]], tipNeg, col));
      };

      pushAxisArrows([1, 0, 0], [length, 0, 0], [-length, 0, 0], colorX);
      pushAxisArrows([0, 1, 0], [0, length, 0], [0, -length, 0], colorY);
      pushAxisArrows([0, 0, 1], [0, 0, length], [0, 0, -length], colorZ);
    }

    axisGroup.renderOrder = root.renderOrder;
    root.add(axisGroup);
  }

  // ------------------------------------------------------------
  // module.plate
  // ------------------------------------------------------------
  if (plateCfg) {
    const p = plateCfg;
    const size = _readVec2(p.size, [1024, 1024]);
    const w = Math.max(0.001, Math.abs(Number(size[0])) || 1024);
    const h = Math.max(0.001, Math.abs(Number(size[1])) || 1024);

    const col = readColor(p.color, 0xffffff);
    const op = readOpacity(p.opacity, 0.2);

    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: op < 1,
      opacity: op,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = root.renderOrder;
    root.add(mesh);
  }

  // ------------------------------------------------------------
  // module.shell
  // ------------------------------------------------------------
  if (shellCfg) {
    const s = shellCfg;

    // schema: shell_type (compat: type)
    let type = "sphere";
    try {
      const t = (typeof s.shell_type === "string" ? s.shell_type
        : (typeof s.shellType === "string" ? s.shellType
        : (typeof s.type === "string" ? s.type : "sphere")));
      const tt = (t || "").trim().toLowerCase();
      if (tt) type = tt;
    } catch (_e) {}

    const col = readColor(s.color, 0xffffff);
    const op = readOpacity(s.opacity, 0.25);

    // if size/radius is omitted, derive from scene radius
    const sr = (sceneRadius != null && Number.isFinite(sceneRadius) && sceneRadius > 0) ? sceneRadius : 512;

    let geo = null;
    if (type === "box") {
      const size = readVec3(s.size, [sr * 2, sr * 2, sr * 2]);
      geo = new THREE.BoxGeometry(
        Math.max(0.001, Math.abs(size[0])),
        Math.max(0.001, Math.abs(size[1])),
        Math.max(0.001, Math.abs(size[2]))
      );
    } else {
      const rRaw = Number(s.radius);
      const r = (Number.isFinite(rRaw) && rRaw > 0) ? rRaw : (sr * 1.05);
      geo = new THREE.SphereGeometry(r, 32, 20);
    }

    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: op < 1,
      opacity: op,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = root.renderOrder;
    root.add(mesh);

    // module_shell_effect (edge/rim glow)
    const eff = (s.effect && typeof s.effect === "object") ? s.effect : null;
    if (eff) {
      // Keep raw effect for future UI/debug
      try { mesh.userData.effect = { ...eff }; } catch (_e) {}

      const edgeRaw = Number(eff.edge_intensity);
      const edgeIntensity = (Number.isFinite(edgeRaw) ? Math.max(0, Math.min(1, edgeRaw)) : 0.5);
      const rimlight = eff.rimlight !== undefined ? !!eff.rimlight : false;
      const glowCol = readColor(eff.glow_color, 0xff0000);

      // outline edges
      if (edgeIntensity > 0.001) {
        try {
          const eg = new THREE.EdgesGeometry(geo);
          const em = new THREE.LineBasicMaterial({
            color: glowCol,
            transparent: true,
            opacity: Math.max(0.05, Math.min(1, 0.15 + 0.85 * edgeIntensity)),
          });
          try {
            em.depthWrite = false;
            em.blending = THREE.AdditiveBlending;
          } catch (_e) {}
          const edges = new THREE.LineSegments(eg, em);
          edges.renderOrder = root.renderOrder + 2;
          try { edges.frustumCulled = false; } catch (_e) {}
          root.add(edges);
        } catch (_e) {}
      }

      // rim/glow (approx.)
      if (rimlight || edgeIntensity > 0.001) {
        try {
          const gm = new THREE.MeshBasicMaterial({
            color: glowCol,
            transparent: true,
            opacity: Math.max(0.02, Math.min(1, (rimlight ? 0.12 : 0.06) * edgeIntensity)),
            side: THREE.BackSide,
          });
          try {
            gm.depthWrite = false;
            gm.blending = THREE.AdditiveBlending;
          } catch (_e) {}
          const glow = new THREE.Mesh(geo, gm);
          glow.renderOrder = root.renderOrder + 1;
          const s0 = 1 + Math.max(0.005, Math.min(0.08, 0.03 * edgeIntensity));
          glow.scale.set(s0, s0, s0);
          try { glow.frustumCulled = false; } catch (_e) {}
          root.add(glow);
        } catch (_e) {}
      }
    }
  }

  // ------------------------------------------------------------
  // module.hud
  // ------------------------------------------------------------
  if (hudCfg) {
    const h = hudCfg;
    const followCamera = (h.follow_camera !== undefined) ? !!h.follow_camera : true;
    const scaleWithDistance = (h.scale_with_distance !== undefined) ? !!h.scale_with_distance : true;

    // HUD entries are updated every render tick (camera follow + distance scaling)
    try {
      hudEntries.push({
        obj: root,
        followCamera,
        scaleWithDistance,
        baseOffset: root.position.clone(),
        baseQuat: root.quaternion.clone(),
        baseScale: root.scale.clone(),
        baseDistance: null,
      });
      root.userData.hud = { followCamera, scaleWithDistance };
      if (followCamera) root.frustumCulled = false;
    } catch (_e) {}
  }

  // ------------------------------------------------------------
  // module.extension
  // - extension.latex: LaTeX 文字列をそのままテキストラベルとして表示（組版は未対応）
  // - extension.parametric: 安全な手続き生成（no-eval）
  //   - polyline / circle / helix / plane / sphere / points
  // ------------------------------------------------------------
  const extCfg = (mod?.extension && typeof mod.extension === "object") ? mod.extension : null;
  if (extCfg) {
    const latex = (extCfg?.latex && typeof extCfg.latex === "object") ? extCfg.latex : null;
    const param = (extCfg?.parametric && typeof extCfg.parametric === "object") ? extCfg.parametric : null;

    // build parametric object (best-effort)
    if (param) {
      try {
        const gen = buildParametricExtensionObject(param, {
          defaultOpacity: app.opacity,
          renderOrder: root.renderOrder,
        });
        if (gen) root.add(gen);
      } catch (_e) {}
    }

    let makeAnchor = false;
    let offset = [0, 0, 0];

    try {
      const hasLatex = !!(latex && typeof latex.content === "string" && latex.content.trim().length > 0);
      const hasParam = !!param;
      const hasType = (typeof extCfg.type === "string" && extCfg.type.trim().length > 0);

      if (hasLatex) {
        makeAnchor = true;
        offset = readVec3(latex.position, [0, 0, 0]);
      } else if (hasParam) {
        makeAnchor = true;
        const params = (param && typeof param === "object" && param.params && typeof param.params === "object")
          ? param.params
          : null;
        // label_offset は parametric 専用（生成物とは別の、ラベルの置き場所）
        offset = readVec3(params?.label_offset ?? params?.labelOffset, [0, 0, 0]);
      } else if (hasType) {
        makeAnchor = true;
      }
    } catch (_e) {}

    if (makeAnchor && !auxExtensionAnchors.has(uuid)) {
      try {
        const anchor = new THREE.Object3D();
        anchor.userData.__auxExtOffset = offset;

        // initial world position (updated each render tick)
        const off = new THREE.Vector3(Number(offset?.[0] ?? 0), Number(offset?.[1] ?? 0), Number(offset?.[2] ?? 0));
        off.multiply(root.scale);
        off.applyQuaternion(root.quaternion);
        anchor.position.copy(root.position).add(off);

        auxExtensionAnchors.set(uuid, anchor);
      } catch (_e) {}
    }
  }




  groups.aux.add(root);
  maps.aux.set(uuid, root);
  // aux は pick 対象にしない（裏の点/線を拾いたい）
}

    // labels: points.marker.text + lines.signification.caption + aux.module.extension
    try {
      const labelIndex = buildLabelIndex(struct);
      labelLayer.sync(labelIndex, { points: maps.points, lines: lineCaptionAnchors, aux: auxExtensionAnchors });
      refreshLabelObjects();
    } catch (_e) {}


    debugRenderer("[renderer] syncDocument built", {
      points: maps.points.size,
      lines: maps.lines.size,
      aux: maps.aux.size,
    });

    // 線のみ等で positions から決められない場合の最終手段
    if (!sceneMetricsCache) sceneMetricsCache = computeSceneMetricsFromGroups(groups);

    // world axes が有効なら最新 metrics を反映（FIXED の長さ / FULL_VIEW の fallback 用）
    try {
      const layer = ctx._worldAxesLayer;
      const mode = Number(ctx._worldAxesMode) || 0;
      if (layer && mode > 0) layer.updateMetrics?.({ radius: Number(sceneMetricsCache?.radius) || 1 });
    } catch (_e) {}
  };

  ctx.getSceneMetrics = () => {
    if (ctx._disposed) return null;
    let m = sceneMetricsCache;
    // cache が無い/壊れてるなら、その場で 1 回算出して cache する
    if (
      !m ||
      !Array.isArray(m.center) || m.center.length < 3 ||
      !Number.isFinite(Number(m.radius)) || Number(m.radius) <= 0
    ) {
      const m2 = computeSceneMetricsFromGroups(groups);
      if (m2) {
        sceneMetricsCache = m2;
        m = m2;
      } else {
        return null;
      }
    }

    const c = m.center;
    const r = Number(m.radius);

    return {
      center: [Number(c[0]) || 0, Number(c[1]) || 0, Number(c[2]) || 0],
      radius: r,
    };
  };

  ctx.applyFrame = (visibleSet) => {
    if (ctx._disposed) return;
    const vs = visibleSet && typeof visibleSet === "object" ? visibleSet : null;
    for (const kind of ["points", "lines", "aux"]) {
      const set = vs?.[kind];
      // Set-like（ReadonlySet / custom Set）も許可
      const hasSet = !!set && typeof set.has === "function";
      for (const [uuid, obj] of maps[kind]) {
        obj.visible = hasSet ? set.has(uuid) : false; // kindのSet無し => 全OFF（契約どおり）
      }
      if (kind === "aux") groups.aux.visible = true;
    }
    try { labelLayer.setVisibleSet(vs); } catch (_e) {}
  };

  ctx.updateCamera = (camState) => {
    if (ctx._disposed) return;
    const st = camState || {};
    const fov = Number(st.fov);
    if (Number.isFinite(fov)) camera.fov = fov;

    const tgt = readVec3(st.target ?? st.lookAt ?? [0, 0, 0]);
    let pos = null;
    if (st.position || st.eye) {
      pos = readVec3(st.position ?? st.eye, null);
    } else {
      const theta = Number(st.theta);
      const phi = Number(st.phi);
      const dist = Number(st.distance);
      if (Number.isFinite(theta) && Number.isFinite(phi) && Number.isFinite(dist)) {
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        pos = [
          tgt[0] + dist * sinPhi * Math.cos(theta),
          tgt[1] + dist * sinPhi * Math.sin(theta),
          tgt[2] + dist * cosPhi,
        ];
      }
    }
    if (pos) camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(tgt[0], tgt[1], tgt[2]);
    camera.updateProjectionMatrix();
    try {
      Object.assign(labelCameraState, st, {
        viewport: labelViewport,
        sceneRadius: Number(sceneMetricsCache?.radius) || null,
        sceneCenter: sceneMetricsCache?.center || null,
      });
      labelLayer.setCameraState(labelCameraState);
    } catch (_e) {}
  };

  ctx.resize = (w, h, dpr = 1) => {
    if (ctx._disposed) return;
    const cw = Math.max(1, Math.floor(Number(w) || canvas.clientWidth || canvas.width || 1));
    const ch = Math.max(1, Math.floor(Number(h) || canvas.clientHeight || canvas.height || 1));
    const pr = Math.max(1, Math.min(4, Number(dpr) || 1));
    renderer.setPixelRatio(pr);
    renderer.setSize(cw, ch, false);
    // CSS px unified: screen-size culling uses CSS pixels.
    labelViewport.width = cw;
    labelViewport.height = ch;
    labelViewport.dpr = pr;
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  };

  // ------------------------------------------------------------
  // HUD runtime (aux.module.hud)
  // - follow_camera: position/orientation follows camera (offset is aux.appearance.position/orientation)
  // - scale_with_distance: scales with camera distance to keep apparent size
  // ------------------------------------------------------------
  const _tmpHudV = new THREE.Vector3();
  const _tmpHudQ = new THREE.Quaternion();

  function updateHudObjects() {
    if (!hudEntries.length) return;
    const camPos = camera.position;
    const camQ = camera.quaternion;

    for (const e of hudEntries) {
      const obj = e?.obj;
      if (!obj) continue;
      if (obj.visible === false) continue;

      // follow camera: treat baseOffset/baseQuat as camera-local transform
      if (e.followCamera) {
        _tmpHudV.copy(e.baseOffset).applyQuaternion(camQ);
        obj.position.copy(camPos).add(_tmpHudV);

        _tmpHudQ.copy(camQ).multiply(e.baseQuat);
        obj.quaternion.copy(_tmpHudQ);
      }

      // distance scaling: scale proportionally to distance from camera (relative to first frame)
      if (e.scaleWithDistance) {
        const dist = camPos.distanceTo(obj.position) || 1;
        if (!e.baseDistance || !Number.isFinite(e.baseDistance) || e.baseDistance <= 0) {
          e.baseDistance = dist;
        }
        const factor = dist / (e.baseDistance || 1);
        obj.scale.copy(e.baseScale).multiplyScalar(factor);
      } else {
        obj.scale.copy(e.baseScale);
      }
    }
  }

  // ------------------------------------------------------------
  // aux.module.extension anchors (world-space)
  // ------------------------------------------------------------
  const _tmpAuxExtOff = new THREE.Vector3();

  function updateAuxExtensionAnchors() {
    if (!auxExtensionAnchors.size) return;

    for (const [uuid, anchor] of auxExtensionAnchors.entries()) {
      const root = maps.aux.get(uuid);
      if (!root) continue;

      const offArr = anchor?.userData?.__auxExtOffset;
      const ox = Number(offArr?.[0] ?? 0) || 0;
      const oy = Number(offArr?.[1] ?? 0) || 0;
      const oz = Number(offArr?.[2] ?? 0) || 0;

      _tmpAuxExtOff.set(ox, oy, oz);
      _tmpAuxExtOff.multiply(root.scale);
      _tmpAuxExtOff.applyQuaternion(root.quaternion);

      anchor.position.copy(root.position).add(_tmpAuxExtOff);
    }
  }



  ctx.render = (_core) => {
    if (ctx._disposed) return;

    // microFX 有効中/フェード中は lineEffects が baseStyle に戻して上書きしてまうので止める
    if (!_suppressLineEffects) {
      try { lineEffectsRuntime?.updateLineEffects?.(); } catch (_e) {}
    }

    try { updateHudObjects(); } catch (_e) {}

    try { updateAuxExtensionAnchors(); } catch (_e) {}

    try { labelLayer.update(); } catch (_e) {}
    // world axes FULL_VIEW: カメラフラスタムに追随（毎フレーム更新）
    if (ctx._worldAxesLayer && Number(ctx._worldAxesMode) === 2) {
      try { ctx._worldAxesLayer.updateView?.({ camera }); } catch (_e) {}
    }

    renderer.render(scene, camera);

    const now = (globalThis.performance?.now?.() ?? Date.now());
    if (_lastFrameAt > 0) {
      const dt = Math.max(0.001, now - _lastFrameAt);
      const fps = 1000 / dt;
      _fpsAvg = _fpsAvg ? (_fpsAvg + (fps - _fpsAvg) * _avgAlpha) : fps;
      _frameAvg = _frameAvg ? (_frameAvg + (dt - _frameAvg) * _avgAlpha) : dt;
      debugMetrics.fps = _fpsAvg;
      debugMetrics.frameMs = _frameAvg;
    }
    _lastFrameAt = now;

    const info = renderer.info || {};
    const renderInfo = info.render || {};
    const memoryInfo = info.memory || {};
    debugMetrics.calls = renderInfo.calls || 0;
    debugMetrics.triangles = renderInfo.triangles || 0;
    debugMetrics.geometries = memoryInfo.geometries || 0;
    debugMetrics.textures = memoryInfo.textures || 0;

    const labelStats = labelLayer.getStats?.();
    if (labelStats) {
      debugMetrics.labelCount = labelStats.labelCount || 0;
      debugMetrics.labelVisible = labelStats.labelVisible || 0;
      debugMetrics.labelUpdates = labelStats.updateCalls || 0;
      debugMetrics.labelTextRebuilds = labelStats.textRebuilds || 0;
      debugMetrics.labelCulledDistance = labelStats.labelCulledDistance || 0;
      debugMetrics.labelCulledScreen = labelStats.labelCulledScreen || 0;
      debugMetrics.labelCulledFrustum = labelStats.labelCulledFrustum || 0;
      debugMetrics.labelThrottleSkips = labelStats.throttleSkips || 0;
    }

  };

  // ------------------------------------------------------------
  // viewer settings receivers (hub bridge targets)
  // ------------------------------------------------------------
  let _lineWidthMode = "auto";       // "auto" | "fixed" | "adaptive"
  let _microFXProfile = "normal";    // "weak" | "normal" | "strong"

  function _normLineWidthMode(v) {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return (s === "auto" || s === "fixed" || s === "adaptive") ? s : null;
  }
  function _normMicroFXProfile(v) {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return (s === "weak" || s === "normal" || s === "strong") ? s : null;
  }
  function _clampFov(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, Math.min(179, n));
  }

  // hub から呼ばれる受け口
  function setLineWidthMode(mode) {
    if (ctx._disposed) return;
    const m = _normLineWidthMode(mode);
    if (!m) return;
    if (m === _lineWidthMode) return;
    _lineWidthMode = m;
    try { lineEffectsRuntime?.setLineWidthMode?.(m); } catch (_e) {}
  }

  function setMicroFXProfile(profile) {
    if (ctx._disposed) return;
    const p = _normMicroFXProfile(profile);
    if (!p) return;
    if (p === _microFXProfile) return;
    _microFXProfile = p;
    // microFX 側が microFXConfig.profile を見てる実装ならこれで効く
    try {
      if (microFXConfig && typeof microFXConfig === "object") {
        microFXConfig.profile = p;
        if (microFXConfig.profileFactors && typeof microFXConfig.profileFactors === "object") {
          const f = Number(microFXConfig.profileFactors[p]);
          if (Number.isFinite(f) && f > 0) microFXConfig.profileFactor = f;
        }
      }
    } catch (_e) {}
    try { lineEffectsRuntime?.setMicroFXProfile?.(p); } catch (_e) {}
  }

  function setFov(v) {
    if (ctx._disposed) return;
    const f = _clampFov(v);
    if (f == null) return;
    if (Number(camera.fov) === f) return;
    camera.fov = f;
    camera.updateProjectionMatrix();
  }

  // 公開（hub bridge が呼べるように）
  ctx.setLineWidthMode = setLineWidthMode;
  ctx.setMicroFXProfile = setMicroFXProfile;
  ctx.setFov = setFov;
  ctx.getDebugMetrics = () => debugMetrics;

  // micro/selection/viewerSettings
  ctx.applyMicroFX = (microState, camState, visibleSet) => {
    if (ctx._disposed) return;

    // entering/leaving 判定は“更新前”の _microWasActive で見る
    const entering = !!microState && !_microWasActive;
    const leaving  = !microState && _microWasActive;

    // microFX が有効な間 + fade-out 中は selection を抑止
    if (entering) {
      _suppressSelectionOn();
      // micro 侵入時だけ selection を即消す（毎フレーム消すのはムダ）
      try { ctx.clearSelectionHighlight?.(); } catch (_e) {}
    } else if (leaving) {
      _suppressSelectionOff();
    }

    const suppressed = _isSelectionSuppressed();
    // microFX 有効中＋fade-out 中は、lineEffects が上書きせんよう止める
    _suppressLineEffects = !!microState || suppressed;

    // NOTE:
    // microFX は renderer 側の Object3D と camera が必要。
    // 以前の旧 signature（getObjectByUuid, visibleSet, camera, intensity）とも互換のある
    // deps-object 形式で渡す。
    const intensity = Number.isFinite(Number(microFXConfig?.profileFactor))
      ? Number(microFXConfig.profileFactor)
      : 1;

    try {
      applyMicroFXImpl(scene, microState || null, {
        getObjectByUuid,
        visibleSet: visibleSet || null,
        camera,
        renderer,
        intensity,
      });
    } catch (_e) {}
    try { labelLayer.applyMicroFX(microState || null, intensity); } catch (_e) {}

    // fade-out 終了後に microFX の残骸を確実に掃除（microFX 実装が clear しない場合の安全弁）
    if (!microState && !suppressed) {
      try { clearMicroFXImpl(scene); } catch (_e) {}
    }
  };

  function _hasIn(setLike, uuid) {
    if (!setLike || !uuid) return false;
    try {
      return typeof setLike.has === "function" ? !!setLike.has(uuid) : false;
    } catch (_e) {
      return false;
    }
  }

  function _isSelectionVisible(sel, visibleSet) {
    const uuid = sel && sel.uuid;
    if (!uuid) return false;
    if (!visibleSet) return false;

    // legacy: visibleSet が Set そのもの
    if (visibleSet instanceof Set) return visibleSet.has(uuid);
    if (typeof visibleSet.has === "function") return !!visibleSet.has(uuid);

    if (typeof visibleSet === "object") {
      const kind = sel && sel.kind; // 'points'|'lines'|'aux' 想定
      if (kind && _hasIn(visibleSet[kind], uuid)) return true;
      return (
        _hasIn(visibleSet.points, uuid) ||
        _hasIn(visibleSet.lines, uuid) ||
        _hasIn(visibleSet.aux, uuid)
      );
    }
    return false;
  }

  // selectionHighlight（bbox枠） + lineEffects selection（線の明度ブースト等）
  ctx.applySelectionHighlight = (selectionState, _camState, visibleSet) => {
    if (_isSelectionSuppressed()) {
      // microFX 優先：selection は出さない（線効果も含めて解除）
      try { ctx.clearSelectionHighlight?.(); } catch (_e) {}
      return;
    }
    const sel = _isSelectionVisible(selectionState, visibleSet) ? (selectionState || null) : null;
    try { lineEffectsRuntime?.applySelection?.(sel); } catch (_e) {}
    try { updateSelectionHighlightImpl(scene, bundles, sel); } catch (_e) {}
  };

   ctx.clearSelectionHighlight = () => {
     if (ctx._disposed) return;
     try { lineEffectsRuntime?.applySelection?.(null); } catch (_e) {}
     try { clearSelectionHighlightImpl(scene); } catch (_e) {}
   };

  ctx.applyViewerSettings = (viewerSettings) => {
    if (ctx._disposed) return;

    const vs = viewerSettings && typeof viewerSettings === "object" ? viewerSettings : {};

    // NOTE:
    // - worldAxes は hub 管理（ctx.setWorldAxesVisible 経由）なので、ここでは触らない。

    // viewerSettings の shape 揺れ吸収：
    // - 正規: viewerSettings.render.lineWidthMode / microFXProfile
    // - 互換: viewerSettings.lineWidthMode / microFXProfile
    const rs = (vs.render && typeof vs.render === "object") ? vs.render : vs;
    const nextLwm = _normLineWidthMode(rs.lineWidthMode);
    const nextMfx = _normMicroFXProfile(rs.microFXProfile);

    // 変更があれば setter 経由で反映（入口を一本化）
    if (nextLwm) setLineWidthMode(nextLwm);
    if (nextMfx) setMicroFXProfile(nextMfx);

    const key = `${_lineWidthMode}|${_microFXProfile}`;
    if (key !== _lastViewerSettingsKey) {
      _lastViewerSettingsKey = key;
    } else {
    // no-op
    }
  };

  // spec 名（applySelection）とのズレ吸収：まずは alias（中身は後で戻す）
  ctx.applySelection = (selectionState, camState, visibleSet) =>
    ctx.applySelectionHighlight(selectionState, camState, visibleSet);
  ctx.pickObjectAt = (ndcX, ndcY) => {
    if (ctx._disposed) return null;
    const x = Number(ndcX);
    const y = Number(ndcY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    try {
      // matrix が古いと当たらんことある
      try { camera.updateMatrixWorld(true); } catch (_e) {}
      try { scene.updateMatrixWorld(true); } catch (_e) {}

      raycaster.setFromCamera({ x, y }, camera);
      const targets = (pickTargets && pickTargets.length)
        ? pickTargets
        : [groups.points, groups.lines, groups.aux].filter(Boolean);
      if (!targets.length) return null;

      const hits = raycaster.intersectObjects(targets, true);
      if (!hits || !hits.length) return null;

      const inferKindFromAncestors = (obj) => {
        let cur = obj;
        while (cur) {
          const k = cur.userData?.kind;
          if (k === "points" || k === "lines" || k === "aux") return k;
          if (cur === groups.points) return "points";
          if (cur === groups.lines) return "lines";
          if (cur === groups.aux) return "aux";
          cur = cur.parent ?? null;
        }
        return null;
      };

      for (const hit of hits) {
        let o = hit?.object ?? null;
          while (o && !o.userData?.uuid) o = o.parent ?? null;
          if (!o) continue;
          if (!isObjectVisible(o)) continue;
            const uuid = o.userData.uuid;
            let kind = o.userData.kind;
          if (kind !== "points" && kind !== "lines" && kind !== "aux") {
            kind = inferKindFromAncestors(o);
          }
        if (typeof uuid !== "string" || !uuid.trim()) continue;
        if (kind !== "points" && kind !== "lines" && kind !== "aux") continue;
        const p = hit?.point;
        const point = (p && typeof p.x === "number")
          ? [p.x, p.y, p.z]
          : [0, 0, 0];
        const dist = Number(hit?.distance);
        return {
          uuid: uuid.trim(),
          kind,
          distance: Number.isFinite(dist) ? dist : 0,
          point,
        };
      }
    } catch (_e) {}
    return null;
  };

  // 初期サイズだけ合わせとく（0サイズ事故も防ぐ）
  try { ctx.resize(canvas.clientWidth, canvas.clientHeight, globalThis.devicePixelRatio || 1); } catch (_e) {}

  // dispose 時の後始末（module-global group が旧 scene に残るのを防ぐ）
  ctx._cleanup = () => {
    try { clearSelectionHighlightImpl(scene); } catch (_e) {}
    try { clearMicroFXImpl(scene); } catch (_e) {}
    try { labelLayer.dispose(); } catch (_e) {}
    // cancel pending glTF marker loads and free cached templates
    try { bumpGltfSyncToken(); } catch (_e) {}
    try { clearGltfTemplateCache(); } catch (_e) {}
  };

  _canvasContexts.set(canvas, ctx);
  return ctx;
}

// public/viewer/runtime/renderer/adapters/compat.js
//
// renderer/context.js 本体に「形揺れ吸収」を持ち込まないための隔離層。
// three.js 依存を避けるため、vec3変換は readVec3 を注入で受け取る。
