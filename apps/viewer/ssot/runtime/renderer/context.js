// viewer/runtime/renderer/context.js

import * as THREE from "/vendor/three/build/three.module.js";
import { applyMicroFX as applyMicroFXImpl, clearMicroFX as clearMicroFXImpl } from "./microFX/index.js";
import { microFXConfig } from "./microFX/config.js";
// NOTE: microFXConfig は profile 切替の“状態置き場”としても使える（存在すれば）
import { buildLabelIndex } from "./labels/labelIndex.js";
import { LabelLayer } from "./labels/LabelLayer.js";
import { createTextSprite } from "./labels/textSprite.js";
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
  // worldAxes helper は ctx に保持（未宣言参照・再宣言事故を防ぐ）
  ctx._worldAxesHelper = ctx._worldAxesHelper || null;
  // sceneMetricsCache は下の minimal runtime セクションで 1 回だけ宣言する（重複防止）

  // picking

  function isObjectVisible(obj) {
    let o = obj;
    while (o) {
      if (o.visible === false) return false;
      o = o.parent || null;
    }
    return true;
  }

  const raycaster = new THREE.Raycaster();
  // 線が拾えん問題の保険（必要なら後で viewerSettings から調整してもええ）
  try { raycaster.params.Line.threshold = 0.5; } catch (_e) {}
  const pickTargets = [];
  let _pickTargetSet = new WeakSet();

  let sceneMetricsCache = null;

  // viewerSettings 適用用のローカル状態（未定義参照を防ぐ）
  let _lastViewerSettingsKey = "";
  // world axes helper は ctx に保持
  if (ctx._worldAxesHelper === undefined) ctx._worldAxesHelper = null;

  function ensureWorldAxesHelper() {
    let h = ctx._worldAxesHelper;
    if (h && h.parent === scene) return h;
    // 古いのが残ってたら remove
    if (h && h.parent) {
      try { h.parent.remove(h); } catch (_e) {}
    }
    h = new THREE.AxesHelper(1);
    h.name = "worldAxes";
    h.renderOrder = 9999;
    h.frustumCulled = false;
    h.visible = false;
    // 常に手前に出す
    try {
      h.traverse((o) => {
        if (o.material) {
          o.material.depthTest = false;
          o.material.depthWrite = false;
          o.material.transparent = true;
        }
      });
    } catch (_e) {}
    scene.add(h);
    ctx._worldAxesHelper = h;
    return h;
  }

  function updateWorldAxesScaleFromMetrics() {
    const h = ctx._worldAxesHelper;
    if (!h) return;
    const r = Number(sceneMetricsCache?.radius);
    const s =
      Number.isFinite(r) && r > 0 ? Math.max(0.6, Math.min(r * 0.25, 50)) : 1.0;
    h.scale.setScalar(s);
  }

  // viewerHub.viewerSettings が直接叩く公開 API
  function setWorldAxesVisible(flag) {
    const on = !!flag;
    if (!on) {
      if (ctx._worldAxesHelper) ctx._worldAxesHelper.visible = false;
      return;
    }
    ensureWorldAxesHelper().visible = true;
    updateWorldAxesScaleFromMetrics();
  }

  function getWorldAxesVisible() {
    return !!ctx._worldAxesHelper?.visible;
  }

  // hub から呼べるように公開（ここ1回だけ）
  ctx.setWorldAxesVisible = setWorldAxesVisible;
  ctx.getWorldAxesVisible = getWorldAxesVisible;

  

// ------------------------------------------------------------
// simple envMap (no external assets)
// - used by MeshBasicMaterial reflectivity (plate/shell) without lights
// ------------------------------------------------------------
let _defaultEnvMap = null;
function getDefaultEnvMap() {
  if (_defaultEnvMap) return _defaultEnvMap;
  try {
    const mkFace = (fill) => {
      const c = document.createElement("canvas");
      c.width = 16; c.height = 16;
      const g = c.getContext("2d");
      g.fillStyle = fill;
      g.fillRect(0, 0, 16, 16);
      // subtle diagonal highlight
      const grad = g.createLinearGradient(0, 0, 16, 16);
      grad.addColorStop(0, "rgba(255,255,255,0.25)");
      grad.addColorStop(1, "rgba(0,0,0,0.15)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 16, 16);
      return c;
    };
    const faces = [
      mkFace("#d9ddff"), // +X
      mkFace("#cfd4ff"), // -X
      mkFace("#d9ffd9"), // +Y
      mkFace("#ffd9d9"), // -Y
      mkFace("#d9ffff"), // +Z
      mkFace("#e5e5e5"), // -Z
    ];
    const ct = new THREE.CubeTexture(faces);
    ct.needsUpdate = true;
    ct.mapping = THREE.CubeReflectionMapping;
    try { ct.colorSpace = THREE.SRGBColorSpace; } catch (_e) {}
    try {
      ct.magFilter = THREE.LinearFilter;
      ct.minFilter = THREE.LinearMipmapLinearFilter;
    } catch (_e) {}
    _defaultEnvMap = ct;
    return _defaultEnvMap;
  } catch (_e) {
    return null;
  }
}

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


function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

function makeXorShift32(seed) {
  // eslint-disable-next-line no-bitwise
  let x = (seed >>> 0) || 0x12345678;
  return function rand01() {
    // xorshift32
    // eslint-disable-next-line no-bitwise
    x ^= (x << 13) >>> 0;
    // eslint-disable-next-line no-bitwise
    x ^= (x >>> 17) >>> 0;
    // eslint-disable-next-line no-bitwise
    x ^= (x << 5) >>> 0;
    // eslint-disable-next-line no-bitwise
    return ((x >>> 0) / 4294967296);
  };
}

function tokenizeExpr(src) {
  const s = String(src ?? "");
  const out = [];
  let i = 0;
  const isWS = (c) => c === " " || c === "\t" || c === "\n" || c === "\r";
  const isNum = (c) => (c >= "0" && c <= "9") || c === ".";
  const isIdStart = (c) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  const isId = (c) => isIdStart(c) || (c >= "0" && c <= "9");

  while (i < s.length) {
    const c = s[i];
    if (isWS(c)) { i++; continue; }

    // number
    if (isNum(c)) {
      let j = i + 1;
      while (j < s.length && isNum(s[j])) j++;
      if (j < s.length && (s[j] === "e" || s[j] === "E")) {
        j++;
        if (j < s.length && (s[j] === "+" || s[j] === "-")) j++;
        while (j < s.length && (s[j] >= "0" && s[j] <= "9")) j++;
      }
      const raw = s.slice(i, j);
      const v = Number(raw);
      out.push({ t: "num", v });
      i = j;
      continue;
    }

    // identifier / keywords
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < s.length && isId(s[j])) j++;
      const id = s.slice(i, j);
      out.push({ t: "id", v: id });
      i = j;
      continue;
    }

    // operators / punctuation
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    if (c === ",") { out.push({ t: "comma" }); i++; continue; }

    // ** operator
    if (c === "*" && s[i + 1] === "*") { out.push({ t: "op", v: "**" }); i += 2; continue; }

    if ("+-*/%^".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }

    // unknown -> skip
    i++;
  }
  out.push({ t: "eof" });
  return out;
}

function evalParamExpr(expr, ctx) {
  const tokens = tokenizeExpr(expr);
  let k = 0;
  const peek = () => tokens[k] || { t: "eof" };
  const next = () => tokens[k++] || { t: "eof" };

  const getVar = (name) => {
    if (name === "true") return 1;
    if (name === "false") return 0;
    const v = ctx?.vars?.[name];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const callFn = (name, args) => {
    const fn = ctx?.fns?.[name];
    if (typeof fn === "function") {
      const r = fn(...args);
      const n = Number(r);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const parsePrimary = () => {
    const t = peek();
    if (t.t === "op" && t.v === "-") {
      next();
      return -parsePrimary();
    }
    if (t.t === "num") {
      next();
      return Number.isFinite(t.v) ? t.v : 0;
    }
    if (t.t === "id") {
      next();
      const id = t.v;
      if (peek().t === "lp") {
        next(); // (
        const args = [];
        if (peek().t !== "rp") {
          while (true) {
            args.push(parseAdd());
            if (peek().t === "comma") { next(); continue; }
            break;
          }
        }
        if (peek().t === "rp") next();
        return callFn(id, args);
      }
      return getVar(id);
    }
    if (t.t === "lp") {
      next();
      const v = parseAdd();
      if (peek().t === "rp") next();
      return v;
    }
    // fallback
    next();
    return 0;
  };

  const parsePow = () => {
    let left = parsePrimary();
    while (peek().t === "op" && (peek().v === "^" || peek().v === "**")) {
      next();
      const right = parsePow(); // right-assoc
      left = Math.pow(left, right);
    }
    return left;
  };

  const parseMul = () => {
    let left = parsePow();
    while (peek().t === "op" && (peek().v === "*" || peek().v === "/" || peek().v === "%")) {
      const op = next().v;
      const right = parsePow();
      if (op === "*") left *= right;
      else if (op === "/") left /= right;
      else left %= right;
    }
    return left;
  };

  const parseAdd = () => {
    let left = parseMul();
    while (peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = next().v;
      const right = parseMul();
      if (op === "+") left += right;
      else left -= right;
    }
    return left;
  };

  try {
    const v = parseAdd();
    return Number.isFinite(v) ? v : 0;
  } catch (_e) {
    return 0;
  }
}

function buildParametricExtensionObject(parametric, opts) {
  const p = _asPlainObject(parametric);
  if (!p) return null;

  const typeRaw = (typeof p.type === "string") ? p.type.trim().toLowerCase() : "";
  if (!typeRaw) return null;

  const params = _asPlainObject(p.params) || {};

// ------------------------------------------------------------
// parametric.seed / parametric.bindings
// - bindings apply expressions to params (best-effort)
// - expression is a simple math DSL (no-eval)
// ------------------------------------------------------------
const seedRaw = Number(p.seed);
const seed =
  Number.isFinite(seedRaw)
    ? (seedRaw | 0)
    : (fnv1a32(`${String(p.type ?? "")}:${JSON.stringify(params)}`) | 0);

const rand01 = makeXorShift32(seed);

let exprCtx = {
  vars: {
    ...params,
    seed,
    pi: Math.PI,
    tau: Math.PI * 2,
    e: Math.E,
  },
  fns: {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sqrt: Math.sqrt,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
    log: Math.log,
    exp: Math.exp,
    clamp: (v, a, b) => Math.min(Math.max(v, a), b),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => {
      const r = rand01();
      if (a === undefined) return r;
      if (b === undefined) return r * Number(a);
      return Number(a) + (Number(b) - Number(a)) * r;
    },
  },
};

function setPathValue(obj, pathStr, value) {
  const raw = String(pathStr ?? "").trim();
  if (!raw) return false;
  const parts = raw.split(/[./]/g).filter(Boolean);
  if (!parts.length) return false;

  // allow "params.x" or "x"
  let cur = obj;
  let startIdx = 0;
  if (parts[0] === "params") startIdx = 1;
  if (startIdx >= parts.length) return false;

  for (let i = startIdx; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return true;
}

// apply bindings sequentially (later bindings can use updated params)
if (Array.isArray(p.bindings)) {
  for (const b of p.bindings) {
    const target = b?.target;
    const expr = b?.expression;
    if (typeof target !== "string" || typeof expr !== "string") continue;
    try {
      // refresh vars from current params each time
      exprCtx = { ...exprCtx, vars: { ...exprCtx.vars, ...params } };
      const v = evalParamExpr(expr, exprCtx);
      if (Number.isFinite(v)) {
        setPathValue({ params }, target, v);
      }
    } catch (_e) {}
  }
}

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

    obj.userData.__auxExtensionParametric = { type: typeRaw, version: p.version, seed, params };
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
  const hudCfg = (mod?.effect && typeof mod.effect === "object") ? mod.effect : ((mod?.hud && typeof mod.hud === "object") ? mod.hud : null);

  const rootOpacity = readOpacity(app.opacity, 0.4);

  // ------------------------------------------------------------
  // module.grid
  // schema: aux.module.grid (grid_type/subdivisions/major_step/minor_step/color_major/color_minor)
  // compat: legacy {length, step, color, opacity}
  // ------------------------------------------------------------
  if (gridCfg) {
    const g = gridCfg;

    const gridTypeRaw = (typeof g.grid_type === "string") ? g.grid_type.trim().toLowerCase() : null;
    const gridType = (gridTypeRaw === "polar") ? "polar" : "cartesian";

    const majorStepRaw = Number(g.major_step);
    const legacyStepRaw = Number(g.step); // legacy
    const majorStep =
      (Number.isFinite(majorStepRaw) && majorStepRaw > 0) ? majorStepRaw
      : ((Number.isFinite(legacyStepRaw) && legacyStepRaw > 0) ? legacyStepRaw : 4);

    const minorStepRaw = Number(g.minor_step);
    const minorStep = (Number.isFinite(minorStepRaw) && minorStepRaw > 0) ? minorStepRaw : 1;

    const subdivisionsRaw = Number(g.subdivisions);
    let subdivisions = (Number.isFinite(subdivisionsRaw) && subdivisionsRaw > 0)
      ? Math.max(1, Math.min(4096, Math.trunc(subdivisionsRaw)))
      : 8;

    // legacy: infer subdivisions from length/step
    if (!(Number.isFinite(subdivisionsRaw) && subdivisionsRaw > 0)) {
      const legacyLengthRaw = Number(g.length);
      const legacyLength = (Number.isFinite(legacyLengthRaw) && legacyLengthRaw > 0) ? legacyLengthRaw : null;
      const legacyStep = (Number.isFinite(legacyStepRaw) && legacyStepRaw > 0) ? legacyStepRaw : null;
      if (legacyLength && legacyStep) subdivisions = Math.max(1, Math.min(4096, Math.trunc((legacyLength / legacyStep) / 2)));
    }

    const colMajor = readColor(g.color_major ?? g.colorMajor ?? g.color, 0x666666);
    const colMinor = readColor(g.color_minor ?? g.colorMinor ?? g.color, 0x333333);

    // schema: use aux.appearance.opacity. legacy: g.opacity
    const op = readOpacity(g.opacity ?? rootOpacity, rootOpacity);

    const applyHelperStyle = (helper, col, opacity) => {
      const mats = Array.isArray(helper.material) ? helper.material : [helper.material];
      for (const mm of mats) {
        if (!mm) continue;
        try { if (mm.color) mm.color.set(col); } catch (_e) {}
        try {
          mm.transparent = opacity < 1;
          mm.opacity = opacity;
          mm.depthWrite = false;
        } catch (_e) {}
      }
    };

    if (gridType === "polar") {
      const radius = Math.max(0.0001, subdivisions * majorStep);
      const radials = Math.max(8, Math.min(64, Math.trunc(subdivisions * 2)));
      const divisions = 64;

      const circlesMajor = Math.max(1, subdivisions);
      const circlesMinor = Math.max(1, Math.min(8192, Math.trunc(radius / Math.max(0.0001, minorStep))));

      // minor
      try {
        const helperMinor = new THREE.PolarGridHelper(radius, radials, circlesMinor, divisions);
        helperMinor.rotation.x = Math.PI / 2; // Y-up -> Z-up
        applyHelperStyle(helperMinor, colMinor, op);
        helperMinor.renderOrder = root.renderOrder;
        root.add(helperMinor);
      } catch (_e) {}

      // major
      try {
        const helperMajor = new THREE.PolarGridHelper(radius, radials, circlesMajor, divisions);
        helperMajor.rotation.x = Math.PI / 2;
        applyHelperStyle(helperMajor, colMajor, op);
        helperMajor.renderOrder = root.renderOrder + 0.0001;
        root.add(helperMajor);
      } catch (_e) {}
    } else {
      const size = Math.max(0.0001, subdivisions * majorStep * 2);
      const divisionsMajor = Math.max(1, Math.min(8192, Math.trunc(size / Math.max(0.0001, majorStep))));
      const divisionsMinor = Math.max(1, Math.min(8192, Math.trunc(size / Math.max(0.0001, minorStep))));

      // minor
      try {
        const helperMinor = new THREE.GridHelper(size, divisionsMinor);
        helperMinor.rotation.x = Math.PI / 2; // Y-up -> Z-up
        applyHelperStyle(helperMinor, colMinor, op);
        helperMinor.renderOrder = root.renderOrder;
        root.add(helperMinor);
      } catch (_e) {}

      // major
      try {
        const helperMajor = new THREE.GridHelper(size, divisionsMajor);
        helperMajor.rotation.x = Math.PI / 2;
        applyHelperStyle(helperMajor, colMajor, op);
        helperMajor.renderOrder = root.renderOrder + 0.0001;
        root.add(helperMajor);
      } catch (_e) {}
    }
  }

  // ------------------------------------------------------------
  // module.axis
  // schema: aux.module.axis (length/labels/arrow)
  // compat: legacy {position,bothDir,color,opacity,arrowCfg}
  // ------------------------------------------------------------
  if (axisCfg) {
    const a = axisCfg;

    const lengthRaw = Number(a.length);
    const length = (Number.isFinite(lengthRaw) && lengthRaw > 0) ? lengthRaw : 64;

    // schema: labels boolean (default true)
    const showLabels = (a.labels !== undefined) ? !!a.labels : true;

    // legacy: position = end|both
    const posModeRaw = (typeof a.position === "string") ? a.position.trim().toLowerCase() : null;
    const bothDir = (posModeRaw === "both");

    const axes = [
      { label: "X", dir: new THREE.Vector3(1, 0, 0), color: 0xff5555 },
      { label: "Y", dir: new THREE.Vector3(0, 1, 0), color: 0x55ff55 },
      { label: "Z", dir: new THREE.Vector3(0, 0, 1), color: 0x5588ff },
    ];

    // schema arrow
    const arrowSpec = _asPlainObject(a.arrow);
    let arrowPrim = (typeof arrowSpec?.primitive === "string") ? arrowSpec.primitive.trim().toLowerCase() : "none";

    // legacy arrowCfg
    const arrowCfg = _asPlainObject(a.arrowCfg) || _asPlainObject(a.arrow_config) || null;
    if ((!arrowSpec || !arrowSpec.primitive) && arrowCfg && typeof arrowCfg.type === "string") {
      const t = arrowCfg.type.trim().toLowerCase();
      if (t === "cone" || t === "pyramid" || t === "line") arrowPrim = t;
    }
    if (!["none", "line", "cone", "pyramid"].includes(arrowPrim)) arrowPrim = "none";

    const arrowLenRaw = Number(arrowSpec?.length ?? arrowCfg?.length);
    const arrowLength = (Number.isFinite(arrowLenRaw) && arrowLenRaw > 0) ? arrowLenRaw : 6;

    const arrowThickRaw = Number(arrowSpec?.thickness ?? arrowCfg?.thickness);
    const arrowThickness = (Number.isFinite(arrowThickRaw) && arrowThickRaw > 0) ? arrowThickRaw : 1;

    const arrowRadiusRaw = Number(arrowSpec?.radius ?? arrowCfg?.radius);
    const arrowRadius = (Number.isFinite(arrowRadiusRaw) && arrowRadiusRaw > 0) ? arrowRadiusRaw : 2;

    const arrowHeightRaw = Number(arrowSpec?.height ?? arrowCfg?.height);
    const arrowHeight = (Number.isFinite(arrowHeightRaw) && arrowHeightRaw > 0) ? arrowHeightRaw : 6;

    const arrowBaseRaw = Array.isArray(arrowSpec?.base ?? arrowCfg?.base) ? (arrowSpec?.base ?? arrowCfg?.base) : null;
    const arrowBase = (arrowBaseRaw && arrowBaseRaw.length >= 2)
      ? [Number(arrowBaseRaw[0]), Number(arrowBaseRaw[1])]
      : [4, 4];

    // schema: no axis color/opacity (use per-axis defaults). legacy: a.color/a.opacity
    const colOverride = (a.color !== undefined) ? readColor(a.color, null) : null;
    const op = readOpacity(a.opacity ?? rootOpacity, rootOpacity);

    const group = new THREE.Group();
    group.name = "aux.axis";

    // lines
    for (const ax of axes) {
      const col = (colOverride !== null) ? colOverride : ax.color;
      const mat = new THREE.LineBasicMaterial({ color: col, transparent: op < 1, opacity: op });
      mat.depthWrite = false;

      const pts = [new THREE.Vector3(0, 0, 0), ax.dir.clone().multiplyScalar(length)];
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, mat);
      line.renderOrder = root.renderOrder;
      group.add(line);

      if (bothDir) {
        const pts2 = [new THREE.Vector3(0, 0, 0), ax.dir.clone().multiplyScalar(-length)];
        const geom2 = new THREE.BufferGeometry().setFromPoints(pts2);
        const line2 = new THREE.Line(geom2, mat.clone());
        line2.renderOrder = root.renderOrder;
        group.add(line2);
      }

      // arrows (schema: only +end. legacy bothDir -> also -end)
      const addArrowAt = (dir, col2) => {
        if (arrowPrim === "none") return 0;
        let extra = 0;
        let mesh = null;
        try {
          if (arrowPrim === "line") {
            const r = Math.max(0.0001, arrowThickness * 0.5);
            const geomA = new THREE.CylinderGeometry(r, r, arrowLength, 6, 1, true);
            const matA = new THREE.MeshBasicMaterial({ color: col2, transparent: op < 1, opacity: op });
            matA.depthWrite = false;
            mesh = new THREE.Mesh(geomA, matA);
            extra = arrowLength;
          } else if (arrowPrim === "cone") {
            const geomA = new THREE.ConeGeometry(Math.max(0.0001, arrowRadius), Math.max(0.0001, arrowHeight), 12, 1, true);
            const matA = new THREE.MeshBasicMaterial({ color: col2, transparent: op < 1, opacity: op });
            matA.depthWrite = false;
            mesh = new THREE.Mesh(geomA, matA);
            extra = arrowHeight;
          } else if (arrowPrim === "pyramid") {
            const w = Math.max(0.0001, Number(arrowBase[0]) || 4);
            const d = Math.max(0.0001, Number(arrowBase[1]) || 4);
            const h = Math.max(0.0001, arrowHeight);
            const geomA = new THREE.ConeGeometry(1, h, 4, 1, true);
            const matA = new THREE.MeshBasicMaterial({ color: col2, transparent: op < 1, opacity: op });
            matA.depthWrite = false;
            mesh = new THREE.Mesh(geomA, matA);
            mesh.scale.set(w * 0.5, 1, d * 0.5);
            extra = h;
          }
        } catch (_e) {
          mesh = null;
        }
        if (!mesh) return 0;

        // orient: cone/cylinder default along +Y. rotate so +Y -> dir
        try {
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
          mesh.quaternion.copy(q);
        } catch (_e) {}

        // position: center at axis end + extra/2
        try {
          const offset = dir.clone().normalize().multiplyScalar(length + (extra * 0.5));
          mesh.position.copy(offset);
        } catch (_e) {}

        mesh.renderOrder = root.renderOrder + 0.0002;
        group.add(mesh);
        return extra;
      };

      const arrowExtra = addArrowAt(ax.dir, col);

      if (bothDir) addArrowAt(ax.dir.clone().multiplyScalar(-1), col);

      // labels
      if (showLabels) {
        try {
          const labelSize = Math.max(10, Math.min(18, length * 0.2));
          const spr = createTextSprite(ax.label, { fontSize: labelSize, color: `#${col.toString(16).padStart(6, "0")}` });
          spr.name = `aux.axis.label.${ax.label}`;
          spr.renderOrder = root.renderOrder + 0.0003;
          spr.frustumCulled = false;
          try {
            spr.traverse((o) => {
              if (o.material) {
                o.material.depthTest = false;
                o.material.depthWrite = false;
                o.material.transparent = true;
              }
            });
          } catch (_e) {}

          const p = ax.dir.clone().normalize().multiplyScalar(length + arrowExtra + (labelSize * 0.6));
          spr.position.copy(p);
          group.add(spr);
        } catch (_e) {}
      }
    }

    root.add(group);
  }

  // ------------------------------------------------------------
  // module.plate
  // schema: aux.module.plate (plane/size/position/opacity/reflectivity)
  // compat: legacy {size,color,opacity}
  // ------------------------------------------------------------
  if (plateCfg) {
    const p = plateCfg;

    const size = readVec2(p.size, [32, 32]);
    const planeRaw = (typeof p.plane === "string") ? p.plane.trim().toLowerCase() : "xy";
    const plane = (planeRaw === "yz" || planeRaw === "zx") ? planeRaw : "xy";

    const localPos = readVec3(p.position, [0, 0, 0]);

    const op = readOpacity(p.opacity ?? rootOpacity, rootOpacity);
    const reflRaw = Number(p.reflectivity);
    const reflectivity = (Number.isFinite(reflRaw)) ? Math.max(0, Math.min(1, reflRaw)) : 0.5;

    // schema doesn't define color, but keep legacy support
    const col = readColor(p.color, 0xffffff);

    const geom = new THREE.PlaneGeometry(size[0], size[1]);
    const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: op < 1, opacity: op });
    mat.depthWrite = false;

    // reflectivity on MeshBasicMaterial needs envMap
    if (reflectivity > 0.001) {
      const env = getDefaultEnvMap();
      if (env) {
        try { mat.envMap = env; } catch (_e) {}
        try { mat.combine = THREE.MixOperation; } catch (_e) {}
        try { mat.reflectivity = reflectivity; } catch (_e) {}
      }
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = "aux.plate";
    mesh.position.set(localPos[0], localPos[1], localPos[2]);

    // plane orientation
    if (plane === "yz") {
      mesh.rotation.y = Math.PI / 2;
    } else if (plane === "zx") {
      mesh.rotation.x = Math.PI / 2;
    }

    mesh.renderOrder = root.renderOrder;
    root.add(mesh);
  }

  // ------------------------------------------------------------
  // module.shell
  // schema: aux.module.shell (shell_type/opacity/reflectivity/effect)
  // note: radius is derived from scene metrics (schema doesn't expose it)
  // compat: legacy {radius,color,opacity,shell_type,shellType}
  // ------------------------------------------------------------
  if (shellCfg) {
    const s = shellCfg;

    const shellTypeRaw = (typeof s.shell_type === "string") ? s.shell_type.trim().toLowerCase()
      : ((typeof s.shellType === "string") ? s.shellType.trim().toLowerCase() : "sphere");
    const shellType = ["sphere", "box", "hemisphere", "quarter_sphere", "eighth_sphere"].includes(shellTypeRaw) ? shellTypeRaw : "sphere";

    const op = readOpacity(s.opacity ?? rootOpacity, rootOpacity);
    const reflRaw = Number(s.reflectivity);
    const reflectivity = (Number.isFinite(reflRaw)) ? Math.max(0, Math.min(1, reflRaw)) : 0.5;

    // legacy color support
    const col = readColor(s.color, 0xffffff);

    // derive size
    let sceneR = Number(sceneMetricsCache?.radius);
    if (!Number.isFinite(sceneR) || sceneR <= 0) sceneR = 64;
    const radius = Math.max(0.0001, sceneR * 1.05);

    let geom = null;
    try {
      if (shellType === "box") {
        const d = radius * 2;
        geom = new THREE.BoxGeometry(d, d, d);
      } else {
        // SphereGeometry is Y-up; rotate -90deg around X to align pole with Z-up for partials
        const wSeg = 48;
        const hSeg = 24;
        if (shellType === "hemisphere") {
          geom = new THREE.SphereGeometry(radius, wSeg, hSeg, 0, Math.PI * 2, 0, Math.PI * 0.5);
        } else if (shellType === "quarter_sphere") {
          geom = new THREE.SphereGeometry(radius, wSeg, hSeg, 0, Math.PI, 0, Math.PI * 0.5);
        } else if (shellType === "eighth_sphere") {
          geom = new THREE.SphereGeometry(radius, wSeg, hSeg, 0, Math.PI * 0.5, 0, Math.PI * 0.5);
        } else {
          geom = new THREE.SphereGeometry(radius, wSeg, hSeg);
        }
      }
    } catch (_e) {
      geom = new THREE.SphereGeometry(radius, 32, 16);
    }

    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: op < 1,
      opacity: op,
      side: THREE.BackSide,
    });
    mat.depthWrite = false;

    if (reflectivity > 0.001) {
      const env = getDefaultEnvMap();
      if (env) {
        try { mat.envMap = env; } catch (_e) {}
        try { mat.combine = THREE.MixOperation; } catch (_e) {}
        try { mat.reflectivity = reflectivity; } catch (_e) {}
      }
    }

    const shell = new THREE.Mesh(geom, mat);
    shell.name = "aux.shell";
    shell.renderOrder = root.renderOrder;
    shell.frustumCulled = false;

    // rotate for partial spheres so "upper" means +Z
    if (shellType !== "sphere" && shellType !== "box") {
      shell.rotation.x = -Math.PI / 2;
    }

    root.add(shell);

    // shell.effect (schema)
    const eff = (s.effect && typeof s.effect === "object") ? s.effect : null;
    if (eff) {
      const edgeIntensity = Number(eff.edge_intensity ?? eff.edgeIntensity);
      const glowColorHex = readColor(eff.glow_color ?? eff.glowColor, null);

      if (Number.isFinite(edgeIntensity) && edgeIntensity > 0) {
        // edge highlight: backface wireframe
        try {
          const edgeMat = new THREE.MeshBasicMaterial({
            color: glowColorHex ?? col,
            transparent: true,
            opacity: Math.max(0, Math.min(1, edgeIntensity)),
            wireframe: true,
            side: THREE.BackSide,
          });
          edgeMat.depthWrite = false;
          const edge = new THREE.Mesh(geom, edgeMat);
          edge.renderOrder = root.renderOrder + 0.0001;
          edge.frustumCulled = false;
          edge.rotation.copy(shell.rotation);
          root.add(edge);
        } catch (_e) {}
      }

      // rimlight: subtle inner glow via FrontSide copy
      try {
        const rimMat = new THREE.MeshBasicMaterial({
          color: glowColorHex ?? col,
          transparent: true,
          opacity: 0.15,
          side: THREE.FrontSide,
        });
        rimMat.depthWrite = false;
        const rim = new THREE.Mesh(geom, rimMat);
        rim.renderOrder = root.renderOrder + 0.00015;
        rim.frustumCulled = false;
        rim.rotation.copy(shell.rotation);
        root.add(rim);
      } catch (_e) {}
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
          defaultOpacity: rootOpacity,
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

    // world axes が表示中なら最新 metrics でスケール更新
    try {
      if (ctx._worldAxesHelper?.visible) updateWorldAxesScaleFromMetrics();
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
