// viewer/runtime/renderer/context.js

import * as THREE from "/vendor/three/build/three.module.js";
import { applyMicroFX as applyMicroFXImpl, clearMicroFX as clearMicroFXImpl } from "./microFX/index.js";
import { microFXConfig } from "./microFX/config.js";
// NOTE: microFXConfig は profile 切替の“状態置き場”としても使える（存在すれば）
import { buildPointLabelIndex } from "./labels/labelIndex.js";
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

  function clearGroup(kind) {
    const g = groups[kind];
    if (!g) return;
    while (g.children.length) {
      const o = g.children[g.children.length - 1];
      g.remove(o);
      try { o.geometry?.dispose?.(); } catch (_e) {}
      try { o.material?.dispose?.(); } catch (_e) {}
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

    // points: small spheres (最小実装)
    if (pts.length) {
      debugRenderer("[renderer] point[0] uuid candidates", {
        uuid: pts[0]?.uuid,
        meta_uuid: pts[0]?.meta?.uuid,
        id: pts[0]?.id,
        picked: pickUuidCompat(pts[0]),
      });
    }
    for (const p of pts) {
      const uuid = pickUuidCompat(p);
      if (!uuid) continue;
      const pos = resolvePointPos(uuid);
      if (!pos) { warnRenderer("[renderer] skip point (no pos)", uuid, p); continue; }

      const col = readColor(p?.appearance?.color ?? p?.color, 0xffffff);
      const op = readOpacity(p?.appearance?.opacity ?? p?.opacity, 1);
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op });
      const baseR =
        sceneRadius != null
          ? Math.max(0.2, Math.min(2.0, sceneRadius * 0.02))
          : 0.6;
      const geo = new THREE.SphereGeometry(baseR, 12, 12);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.userData.uuid = uuid;
      mesh.userData.kind = "points";
      groups.points.add(mesh);
      maps.points.set(uuid, mesh);
      addPickTarget(mesh);
    }

    // labels: points marker.text
    try {
      const labelIndex = buildPointLabelIndex(struct);
      labelLayer.sync(labelIndex, maps.points);
      refreshLabelObjects();
    } catch (_e) {}

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
      const lineStyle =
        (prof && typeof prof.lineStyle === "string" && prof.lineStyle.trim())
          ? prof.lineStyle.trim()
          : "solid";
      if (lineStyle === "none") continue;

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
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        const len = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy + dz * dz));

        let dashSize;
        let gapSize;
        if (lineStyle === "dotted") {
          dashSize = len / 60;
          gapSize = len / 20;
        } else {
          dashSize = len / 12;
          gapSize = dashSize * 0.6;
        }

        dashSize = Math.max(0.02, Math.min(dashSize, len));
        gapSize = Math.max(0.02, Math.min(gapSize, len));

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
      geo.setAttribute("position", new THREE.Float32BufferAttribute([
        a[0], a[1], a[2],
        b[0], b[1], b[2],
      ], 3));
      const seg = new THREE.LineSegments(geo, mat);
      if (mat.isLineDashedMaterial) {
        try { seg.computeLineDistances(); } catch (_e) {}
      }
      seg.userData.uuid = uuid;
      seg.userData.kind = "lines";

      // lineEffectsRuntime が読む
      seg.userData.lineStyle = lineStyle;
      if (prof && typeof prof.sense === "string") seg.userData.sense = prof.sense;
      if (effectType && effect) {
        seg.userData.effectType = effectType;
        seg.userData.effect = effect;
      }

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

    // aux: struct.aux から作る（grid/axis）
    for (const a of axs) {
      const uuid = pickUuidCompat(a);
      if (!uuid) continue;

      const tag = collectStringsShallowCompat(a).join(" ").toLowerCase();
      debugRenderer("[renderer] aux tag haystack", tag);

      let obj = null;
      if (tag.includes("grid")) {
        const size = Number(a?.size ?? a?.appearance?.size ?? a?.params?.size ?? 40);
        const div  = Number(a?.divisions ?? a?.appearance?.divisions ?? a?.params?.divisions ?? 20);
        obj = new THREE.GridHelper(
          Number.isFinite(size) ? size : 40,
          Number.isFinite(div) ? div : 20
        );
        // GridHelper はデフォで Y-up 前提やから、Z-up に合わせて回す
        obj.rotation.x = Math.PI / 2;
      } else if (tag.includes("axis") || tag.includes("axes")) {
        const len = Number(a?.size ?? a?.appearance?.size ?? 12);
        obj = new THREE.AxesHelper(Number.isFinite(len) ? len : 12);
      } else {
        continue;
      }

      obj.userData.uuid = uuid;
      obj.userData.kind = "aux";
      groups.aux.add(obj);
      maps.aux.set(uuid, obj);
      addPickTarget(obj);
    }

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
      Object.assign(labelCameraState, st, { viewport: labelViewport });
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

  ctx.render = (_core) => {
    if (ctx._disposed) return;

    // microFX 有効中/フェード中は lineEffects が baseStyle に戻して上書きしてまうので止める
    if (!_suppressLineEffects) {
      try { lineEffectsRuntime?.updateLineEffects?.(); } catch (_e) {}
    }

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
  };

  _canvasContexts.set(canvas, ctx);
  return ctx;
}

// public/viewer/runtime/renderer/adapters/compat.js
//
// renderer/context.js 本体に「形揺れ吸収」を持ち込まないための隔離層。
// three.js 依存を避けるため、vec3変換は readVec3 を注入で受け取る。
