// viewer/runtime/renderer/context.js

import * as THREE from "../../../vendor/three/build/three.module.js";
import { applyMicroFX as applyMicroFXImpl } from "./microFX/index.js";
import { buildPointLabelIndex } from "../utils/labelIndex.js";
import { createLabelRuntime } from "./labels/labelRuntime.js";
import { createWorldAxesLayer } from "./worldAxes.js";
import {
  getUuid,
  getPointPosition,
  getColor,
  getOpacity,
  clamp01,
} from "./shared.js";
import {
  updateSelectionHighlight as updateSelectionHighlightImpl,
  clearSelectionHighlight as clearSelectionHighlightImpl,
} from "./selectionHighlight.js";

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
    // preventDefault しないと restore されへん
    try { e.preventDefault(); } catch (_e) {}
    console.warn(`[${label}] webglcontextlost`, e);
  };
  const onRestored = (e) => {
    console.warn(`[${label}] webglcontextrestored`, e);
  };
  const onCreationError = (e) => {
    console.warn(`[${label}] webglcontextcreationerror`, e);
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

  const r = ctx.renderer;
   if (r) {
     try { r.setAnimationLoop?.(null); } catch (_e) {}
     try { r.dispose?.(); } catch (_e) {}
    // NOTE:
    // forceContextLoss() は WEBGL_lose_context を叩く＝「ページが意図的に context loss を起こした」扱いになり、
    // 回数が多いと Chrome が新規 WebGL 作成をブロックすることがある（今回の "blocked" に直結しやすい）
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

  // 同一canvasで既に生きてたら必ず殺す（Phase5/HMR対策の本丸）
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
    _forceLoss: !!opts.forceContextLoss, // ★デフォルトfalse
    dispose() { disposeRendererContext(ctx); },
  };

  attachContextEvents(canvas, ctx, label);

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, ...webglOpts });
  } catch (e) {
    // ここで作れへん＝Chromeにブロックされてる可能性大
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

  function clearGroup(kind) {
    const g = groups[kind];
    if (!g) return;
    while (g.children.length) {
      const o = g.children.pop();
      try { o.geometry?.dispose?.(); } catch (_e) {}
      try { o.material?.dispose?.(); } catch (_e) {}
    }
    maps[kind].clear();
  }

  function resolvePointPosByUuid(structIndex, uuid) {
    if (!uuid || !structIndex) return null;
    const item = structIndex.uuidToItem?.get?.(uuid) ?? null;
    const p = item?.item ?? item?.point ?? item?.data ?? item ?? null;
    return readPointPos(p);
  }

function resolveEndpoint(structIndex, ep, resolvePointPos) {
  if (typeof ep === "string") {
    const u = ep.trim();
    if (!u) return null;
    return (resolvePointPos ? resolvePointPos(u) : resolvePointPosByUuid(structIndex, u)) ?? null;
  }

  if (Array.isArray(ep) || (ep && typeof ep === "object" && ("x" in ep || "y" in ep || "z" in ep))) {
    return readVec3(ep, null);
  }

  if (ep && typeof ep === "object") {
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

  return null;
}


function pickUuid(obj) {
  const raw =
    obj?.uuid ??
    obj?.meta?.uuid ??
    obj?.meta_uuid ??
    obj?.id ??
    obj?.meta?.id ??
    obj?.ref_uuid ??
    obj?.meta?.ref_uuid ??
    null;

  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? t : null;
  }
  if (raw != null) {
    const t = String(raw).trim();
    return t ? t : null;
  }
  return null;
}

const END_A_KEYS = [
  "end_a","endA","a","from","source","src","start",
  "point_a","pointA","p0","pA",
  "end_a_uuid","a_uuid","start_uuid","from_uuid","src_uuid"
];
const END_B_KEYS = [
  "end_b","endB","b","to","target","dst","end",
  "point_b","pointB","p1","pB",
  "end_b_uuid","b_uuid","end_uuid","to_uuid","dst_uuid"
];

function pickLineEndpoint(line, keys) {
  if (!line) return undefined;

  // appearance 優先
  for (const k of keys) {
    if (line.appearance && Object.prototype.hasOwnProperty.call(line.appearance, k)) return line.appearance[k];
  }

  // appearance.endpoints が [a,b] みたいな配列のパターン救済
  const aepsAny = line.appearance?.endpoints;
  if (Array.isArray(aepsAny) && aepsAny.length >= 2) {
    // 呼び出し側が A/B どっちの keys を渡してるかで 0/1 を分ける
    const wantsA = keys === END_A_KEYS;
    return wantsA ? aepsAny[0] : aepsAny[1];
  }

  // appearance.endpoints 配下
  const aeps =
    (line.appearance?.endpoints && typeof line.appearance.endpoints === "object")
      ? line.appearance.endpoints
      : null;
  if (aeps) {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(aeps, k)) return aeps[k];
    }
    // よくある a/b
    if (keys === END_A_KEYS && Object.prototype.hasOwnProperty.call(aeps, "a")) return aeps.a;
    if (keys === END_B_KEYS && Object.prototype.hasOwnProperty.call(aeps, "b")) return aeps.b;
    if (keys === END_A_KEYS && Object.prototype.hasOwnProperty.call(aeps, "from")) return aeps.from;
    if (keys === END_B_KEYS && Object.prototype.hasOwnProperty.call(aeps, "to")) return aeps.to;
  }

  // geometry / endpoints 配下も見る
  const geo = line.geometry && typeof line.geometry === "object" ? line.geometry : null;
  const eps = line.endpoints && typeof line.endpoints === "object" ? line.endpoints : null;
  for (const k of keys) {
    if (geo && Object.prototype.hasOwnProperty.call(geo, k)) return geo[k];
    if (eps && Object.prototype.hasOwnProperty.call(eps, k)) return eps[k];
  }

  // top-level
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(line, k)) return line[k];
  }

  return undefined;
}

function collectStringsShallow(obj, max = 64) {
  const out = [];
  const stack = [obj];
  while (stack.length && out.length < max) {
    const v = stack.pop();
    if (typeof v === "string") { out.push(v); continue; }
    if (!v || typeof v !== "object") continue;
    if (Array.isArray(v)) { for (const it of v) stack.push(it); continue; }
    for (const k of Object.keys(v)) stack.push(v[k]);
  }
  return out;
}

function readPointPos(p) {
  return readVec3(
    // top-level
    p?.position ?? p?.pos ?? p?.xyz ?? p?.point ??
    // geometry
    p?.geometry?.position ?? p?.geometry?.pos ?? p?.geometry?.xyz ?? p?.geometry?.point ??
    // appearance（ここに座標が入ってる個体も救う）
    p?.appearance?.position ?? p?.appearance?.pos ?? p?.appearance?.xyz ?? p?.appearance?.point ??
    // signification（今回ログ的にここが怪しい）
    p?.signification?.position ?? p?.signification?.pos ?? p?.signification?.xyz ?? p?.signification?.point ??
    // meta fallback
    p?.meta?.position ?? p?.meta?.pos ?? p?.meta?.xyz ?? p?.meta?.point ??
    null,
    null
  );
}

  ctx.syncDocument = (struct, structIndex) => {

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

    const frames = Array.isArray(struct?.frames) ? struct.frames : [];

    function collect(key) {
      const out = [];
      const seen = new Set();
      const push = (it) => {
        const u = pickUuid(it);
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
      const u = pickUuid(p);
      if (!u) continue;
      const pos = readPointPos(p);
      if (pos) pointPosByUuid.set(u, pos);
      else warnRenderer("[renderer] point pos missing", u, p);
    }

    function resolvePointPos(uuid) {
      if (!uuid) return null;
      const local = pointPosByUuid.get(uuid);
      if (local) return local;

      // structIndex fallback（形揺れ吸収）
      const hit = structIndex?.uuidToItem?.get?.(uuid) ?? null;
      const p = hit?.item ?? hit?.point ?? hit?.data ?? hit?.value ?? hit ?? null;
      return readPointPos(p);
    }

    // ---- scale（点が小さすぎて見えん問題を避ける）----
    let sceneRadius = null;
    try {
      const b = structIndex?.bounds ?? structIndex?.getSceneBounds?.() ?? null;
      const r = Number(b?.radius);
      if (Number.isFinite(r) && r > 0) sceneRadius = r;
    } catch (_e) {}
    
    // points: small spheres (最小実装)
    for (const p of pts) {
      if (pts.length) {
        debugRenderer("[renderer] point[0] uuid candidates", {
          uuid: pts[0]?.uuid,
          meta_uuid: pts[0]?.meta?.uuid,
          id: pts[0]?.id,
          picked: pickUuid(pts[0]),
        });
      }
      const uuid = pickUuid(p);
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
    }

    // lines: LineSegments(2pts)
    for (const line of lns) {
      if (lns.length) {
        debugRenderer("[renderer] line[0] shape", {
          pickedUuid: pickUuid(lns[0]),
          keys: Object.keys(lns[0] || {}),
          appearanceKeys: Object.keys(lns[0]?.appearance || {}),
          geometryKeys: Object.keys(lns[0]?.geometry || {}),
          endpointsKeys: Object.keys(lns[0]?.endpoints || {}),
          aRaw: pickLineEndpoint(lns[0], END_A_KEYS),
          bRaw: pickLineEndpoint(lns[0], END_B_KEYS),
        });
      }
      const uuid = pickUuid(line);
      if (!uuid) continue;
      const aRaw = pickLineEndpoint(line, END_A_KEYS);
      const bRaw = pickLineEndpoint(line, END_B_KEYS);
      debugRenderer("[renderer] line endpoints raw", aRaw, bRaw);
      const a = resolveEndpoint(structIndex, aRaw, resolvePointPos);
      const b = resolveEndpoint(structIndex, bRaw, resolvePointPos);
      if (!a || !b) {
        warnRenderer("[renderer] skip line (endpoint unresolved)", uuid, { aRaw, bRaw, a, b });
        continue;
      }
      const col = readColor(line?.appearance?.color ?? line?.color, 0xffffff);
      const op = readOpacity(line?.appearance?.opacity ?? line?.opacity, 1);
      const mat = new THREE.LineBasicMaterial({ color: col, transparent: op < 1, opacity: op });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([
        a[0], a[1], a[2],
        b[0], b[1], b[2],
      ], 3));
      const seg = new THREE.LineSegments(geo, mat);
      seg.userData.uuid = uuid;
      seg.userData.kind = "lines";
      groups.lines.add(seg);
      maps.lines.set(uuid, seg);
   }

    // aux: struct.aux から作る（grid/axis）
    for (const a of axs) {
      const uuid = pickUuid(a);
      if (!uuid) continue;

      const tag = collectStringsShallow(a).join(" ").toLowerCase();
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
    }

    debugRenderer("[renderer] syncDocument built", {
      points: maps.points.size,
      lines: maps.lines.size,
      aux: maps.aux.size,
    });
  };

  ctx.applyFrame = (visibleSet) => {
    const vs = visibleSet && typeof visibleSet === "object" ? visibleSet : null;
    for (const kind of ["points", "lines", "aux"]) {
      const set = vs?.[kind];
     const hasSet = set instanceof Set;
      for (const [uuid, obj] of maps[kind]) {
        obj.visible = hasSet ? set.has(uuid) : false; // kindのSet無し => 全OFF（契約どおり）
      }
      if (kind === "aux") groups.aux.visible = true;
    }
  };

  ctx.updateCamera = (camState) => {
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
  };

  ctx.resize = (w, h, dpr = 1) => {
    const cw = Math.max(1, Math.floor(Number(w) || canvas.clientWidth || canvas.width || 1));
    const ch = Math.max(1, Math.floor(Number(h) || canvas.clientHeight || canvas.height || 1));
    const pr = Math.max(1, Math.min(4, Number(dpr) || 1));
    renderer.setPixelRatio(pr);
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  };

  ctx.render = (_core) => {
    renderer.render(scene, camera);
  };

  // micro/selection/viewerSettings は最小は no-op（真っ黒回避が先）
  ctx.applyMicroFX = () => {};
  ctx.applySelectionHighlight = () => {};
  ctx.clearSelectionHighlight = () => {};
  ctx.applyViewerSettings = () => {};

  // 初期サイズだけ合わせとく（0サイズ事故も防ぐ）
  try { ctx.resize(canvas.clientWidth, canvas.clientHeight, globalThis.devicePixelRatio || 1); } catch (_e) {}

  _canvasContexts.set(canvas, ctx);
  return ctx;
}
