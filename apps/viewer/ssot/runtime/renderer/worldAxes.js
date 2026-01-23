// viewer/runtime/renderer/worldAxes.js
//
// ワールド共通の座標軸（背景用）レイヤ。
// - X = 青, Y = 緑, Z = 赤
// - OFF / FIXED / FULL_VIEW の 3 モード
//   - OFF      : 非表示
//   - FIXED    : sceneRadius ベースの固定長（従来互換）
//   - FULL_VIEW: 原点が視野内にあるとき、各軸をフラスタム境界まで伸ばして
//                「ビューポート内いっぱい」に見える長さにする
//
// NOTE:
// - FULL_VIEW は「原点がフラスタム内」のときだけ有効。
//   原点が視野外の場合は FIXED にフォールバック。

import * as THREE from "/vendor/three/build/three.module.js";

export const WORLD_AXES_MODE = /** @type {const} */ ({
  OFF: 0,
  FIXED: 1,
  FULL_VIEW: 2,
});

function clampMode(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return WORLD_AXES_MODE.OFF;
  if (n <= 0) return WORLD_AXES_MODE.OFF;
  if (n >= 2) return WORLD_AXES_MODE.FULL_VIEW;
  return WORLD_AXES_MODE.FIXED;
}

export function createWorldAxesLayer(scene) {
  const group = new THREE.Group();
  group.name = "world-axes";
  group.renderOrder = -10; // なるべく背景側
  group.visible = false;
  scene.add(group);

  const origin = new THREE.Vector3(0, 0, 0);
  const _tmp = new THREE.Vector3();

  let mode = WORLD_AXES_MODE.OFF;
  let sceneRadius = 1;
  const FIXED_MUL = 3.0;

  const frustum = new THREE.Frustum();
  const pv = new THREE.Matrix4();

  function makeLine(color, opacity) {
    const arr = new Float32Array(6);
    const geom = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(arr, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute("position", attr);

    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false; // 背景線はカリングさせない

    group.add(line);
    return { line, geom, attr, arr, mat };
  }

  /** @type {Array<{axis:string, dir:THREE.Vector3, dirNeg:THREE.Vector3, pos:any, neg:any}>} */
  const axes = [];

  function initAxes() {
    group.clear();

    // X=青 / Y=緑 / Z=赤
    const defs = [
      {
        axis: "x",
        dir: new THREE.Vector3(1, 0, 0),
        colorPos: new THREE.Color(0x3366ff),
        colorNeg: new THREE.Color(0x112244),
      },
      {
        axis: "y",
        dir: new THREE.Vector3(0, 1, 0),
        colorPos: new THREE.Color(0x33ff66),
        colorNeg: new THREE.Color(0x115533),
      },
      {
        axis: "z",
        dir: new THREE.Vector3(0, 0, 1),
        colorPos: new THREE.Color(0xff3366),
        colorNeg: new THREE.Color(0x553333),
      },
    ];

    axes.length = 0;
    for (const d of defs) {
      const dirNeg = d.dir.clone().multiplyScalar(-1);
      const pos = makeLine(d.colorPos, 0.45);
      const neg = makeLine(d.colorNeg, 0.25);
      axes.push({ axis: d.axis, dir: d.dir, dirNeg, pos, neg });
    }
  }

  function setSegment(seg, from, to) {
    const a = seg.arr;
    a[0] = from.x;
    a[1] = from.y;
    a[2] = from.z;
    a[3] = to.x;
    a[4] = to.y;
    a[5] = to.z;
    seg.attr.needsUpdate = true;
    // bounding sphere は簡易で良い（表示だけ）
    try {
      seg.geom.computeBoundingSphere();
    } catch (_e) {}
  }

  function fixedLen() {
    const base = Number.isFinite(sceneRadius) && sceneRadius > 0 ? sceneRadius : 1;
    return base * FIXED_MUL;
  }

  function buildFrustum(camera) {
    if (!camera) return false;
    // matrixWorldInverse は renderer 側で更新されるが、保険で呼ぶ
    if (typeof camera.updateMatrixWorld === "function") camera.updateMatrixWorld(true);
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    return true;
  }

  // 原点から dir 方向に進んだとき、最初にフラスタム境界に当たる t を返す
  // - 原点がフラスタム内であることが前提
  function exitT(dir) {
    // Find the nearest frustum plane intersection along `dir` starting from `origin`.
    // Works regardless of the frustum plane sign convention.
    let best = Infinity;
    for (const p of frustum.planes) {
      const d0 = p.distanceToPoint(origin);
      const denom = p.normal.dot(dir);
      if (Math.abs(denom) <= 1e-6) continue;
      const t = -d0 / denom;
      if (t > 1e-6 && t < best) best = t;
    }
    return Number.isFinite(best) ? best : null;
  }

  function updateSegmentsFixed() {
    const L = fixedLen();
    for (const ax of axes) {
      setSegment(ax.pos, origin, _tmp.copy(ax.dir).multiplyScalar(L));
      setSegment(ax.neg, origin, _tmp.copy(ax.dirNeg).multiplyScalar(L));
    }
  }

  function updateSegmentsFullView(camera) {
    const fallback = fixedLen();

    // 原点が視野外ならフォールバック
    if (!buildFrustum(camera) || !frustum.containsPoint(origin)) {
      for (const ax of axes) {
        setSegment(ax.pos, origin, _tmp.copy(ax.dir).multiplyScalar(fallback));
        setSegment(ax.neg, origin, _tmp.copy(ax.dirNeg).multiplyScalar(fallback));
      }
      return;
    }

    for (const ax of axes) {
      const tPos = exitT( ax.dir);
      const tNeg = exitT( ax.dirNeg);
      const Lp = Number.isFinite(tPos) && tPos > 0 ? tPos : fallback;
      const Ln = Number.isFinite(tNeg) && tNeg > 0 ? tNeg : fallback;

      setSegment(ax.pos, origin, _tmp.copy(ax.dir).multiplyScalar(Lp));
      setSegment(ax.neg, origin, _tmp.copy(ax.dirNeg).multiplyScalar(Ln));
    }
  }

  function applyMode() {
    group.visible = mode !== WORLD_AXES_MODE.OFF;
  }

  function setMode(next) {
    const m = clampMode(next);
    if (m === mode) return;
    mode = m;
    applyMode();
  }

  function getMode() {
    return mode;
  }

  function updateMetrics({ radius }) {
    if (typeof radius === "number" && radius > 0) sceneRadius = radius;
    else sceneRadius = 1;

    // モードに応じて反映（FULL_VIEW は updateView でやる）
    if (mode === WORLD_AXES_MODE.FIXED) updateSegmentsFixed();
    if (mode === WORLD_AXES_MODE.OFF) {
      // 何もしない
    }
  }

  function updateView({ camera } = {}) {
    if (mode !== WORLD_AXES_MODE.FULL_VIEW) return;
    updateSegmentsFullView(camera);
  }

  // 互換 API: setVisible / toggle
  function setVisible(flag) {
    setMode(flag ? WORLD_AXES_MODE.FIXED : WORLD_AXES_MODE.OFF);
  }

  function toggle() {
    setVisible(!group.visible);
  }

  // init
  initAxes();
  updateSegmentsFixed();
  applyMode();

  return {
    group,
    setMode,
    getMode,
    updateMetrics,
    updateView,
    // back-compat
    setVisible,
    toggle,
  };
}
