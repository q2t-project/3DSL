// viewer/runtime/renderer/worldAxes.js
//
// ワールド共通の座標軸（背景用）レイヤ。
//
// 3-mode:
// - OFF       : hidden
// - FIXED     : fixed length based on scene radius
// - FULL_VIEW : extend to frustum edge (viewport fill) per camera
//
// NOTE:
// - This is a renderer internal helper. Not tied to 3DSS schema.
// - Axis lines are drawn around origin with ± directions.

import * as THREE from "/vendor/three/build/three.module.js";

export const WORLD_AXES_MODE = {
  OFF: 0,
  FIXED: 1,
  FULL_VIEW: 2,
};

export function createWorldAxesLayer(scene) {
  const group = new THREE.Group();
  group.name = "world-axes";
  group.renderOrder = 9999; // overlay
  group.visible = false;   // デフォルトは非表示（hub 側で mode 管理）
  scene.add(group);

  let mode = WORLD_AXES_MODE.OFF;
  let sceneRadius = 1;

  const origin = new THREE.Vector3(0, 0, 0);

  // Lines are created once; geometry positions are updated when needed.
  const _lines = {
    xPos: null, xNeg: null,
    yPos: null, yNeg: null,
    zPos: null, zNeg: null,
  };

  // camera change tracking for FULL_VIEW
  let _lastCamKey = "";

  function mkLine(color, opacity) {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(6);
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
    const line = new THREE.Line(g, m);
    line.frustumCulled = false;
    line.renderOrder = group.renderOrder;
    return line;
  }

  function ensureLines() {
    if (_lines.xPos) return;
    // X: 赤
    _lines.xPos = mkLine(0xff3366, 0.45);
    _lines.xNeg = mkLine(0x553333, 0.25);
    // Y: 緑
    _lines.yPos = mkLine(0x33ff66, 0.45);
    _lines.yNeg = mkLine(0x115533, 0.25);
    // Z: 青
    _lines.zPos = mkLine(0x3366ff, 0.45);
    _lines.zNeg = mkLine(0x112244, 0.25);

    group.add(
      _lines.xPos, _lines.xNeg,
      _lines.yPos, _lines.yNeg,
      _lines.zPos, _lines.zNeg,
    );
  }

  function setLineSegment(line, dir, len) {
    if (!line) return;
    const a = line.geometry?.attributes?.position?.array;
    if (!a || a.length < 6) return;
    a[0] = origin.x; a[1] = origin.y; a[2] = origin.z;
    a[3] = origin.x + dir.x * len;
    a[4] = origin.y + dir.y * len;
    a[5] = origin.z + dir.z * len;
    line.geometry.attributes.position.needsUpdate = true;
    try { line.geometry.computeBoundingSphere(); } catch (_e) {}
  }

  function updateFixed() {
    ensureLines();
    const base = Number.isFinite(sceneRadius) && sceneRadius > 0 ? sceneRadius : 1;
    const axisLength = base * 3.0;
    setLineSegment(_lines.xPos, new THREE.Vector3( 1, 0, 0), axisLength);
    setLineSegment(_lines.xNeg, new THREE.Vector3(-1, 0, 0), axisLength);
    setLineSegment(_lines.yPos, new THREE.Vector3( 0, 1, 0), axisLength);
    setLineSegment(_lines.yNeg, new THREE.Vector3( 0,-1, 0), axisLength);
    setLineSegment(_lines.zPos, new THREE.Vector3( 0, 0, 1), axisLength);
    setLineSegment(_lines.zNeg, new THREE.Vector3( 0, 0,-1), axisLength);
  }

  // Compute tMax (max forward t) such that origin + t*dir remains inside frustum.
  function rayTMaxInFrustum(frustum, dir) {
    let tMin = 0;
    let tMax = Infinity;
    const eps = 1e-10;
    for (const p of frustum.planes) {
      const d0 = p.distanceToPoint(origin); // <=0 means inside
      const dn = p.normal.dot(dir);
      if (Math.abs(dn) < eps) {
        if (d0 > 0) return null;
        continue;
      }
      const t = -d0 / dn;
      if (dn > 0) {
        if (t < tMax) tMax = t;
      } else {
        if (t > tMin) tMin = t;
      }
      if (tMax < tMin) return null;
    }
    if (!Number.isFinite(tMax)) return null;
    return tMax;
  }

  function updateFullView(camera) {
    ensureLines();
    if (!camera) {
      updateFixed();
      return;
    }

    // ensure matrices are up to date before reading matrixWorldInverse
    try { camera.updateMatrixWorld(true); } catch (_e) {}

    // camera key for throttling
    const pos = camera.position;
    const q = camera.quaternion;
    const key = [
      pos.x.toFixed(4), pos.y.toFixed(4), pos.z.toFixed(4),
      q.x.toFixed(4), q.y.toFixed(4), q.z.toFixed(4), q.w.toFixed(4),
      Number(camera.fov || 0).toFixed(3),
      Number(camera.aspect || 0).toFixed(5),
      Number(camera.near || 0).toFixed(3),
      Number(camera.far || 0).toFixed(0),
    ].join("|");
    if (key === _lastCamKey) return;
    _lastCamKey = key;

    const m = new THREE.Matrix4();
    m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(m);

    const dirs = {
      xPos: new THREE.Vector3( 1, 0, 0),
      xNeg: new THREE.Vector3(-1, 0, 0),
      yPos: new THREE.Vector3( 0, 1, 0),
      yNeg: new THREE.Vector3( 0,-1, 0),
      zPos: new THREE.Vector3( 0, 0, 1),
      zNeg: new THREE.Vector3( 0, 0,-1),
    };

    // For each direction, compute its own tMax and extend slightly beyond to ensure fill.
    const pad = 1.02;
    const txp = rayTMaxInFrustum(frustum, dirs.xPos);
    const txn = rayTMaxInFrustum(frustum, dirs.xNeg);
    const typ = rayTMaxInFrustum(frustum, dirs.yPos);
    const tyn = rayTMaxInFrustum(frustum, dirs.yNeg);
    const tzp = rayTMaxInFrustum(frustum, dirs.zPos);
    const tzn = rayTMaxInFrustum(frustum, dirs.zNeg);

    // If origin is outside frustum (or numeric issues), fall back.
    if ([txp, txn, typ, tyn, tzp, tzn].some((t) => !(typeof t === "number") || !Number.isFinite(t) || t <= 0)) {
      updateFixed();
      return;
    }

    setLineSegment(_lines.xPos, dirs.xPos, txp * pad);
    setLineSegment(_lines.xNeg, dirs.xNeg, txn * pad);
    setLineSegment(_lines.yPos, dirs.yPos, typ * pad);
    setLineSegment(_lines.yNeg, dirs.yNeg, tyn * pad);
    setLineSegment(_lines.zPos, dirs.zPos, tzp * pad);
    setLineSegment(_lines.zNeg, dirs.zNeg, tzn * pad);
  }

  function updateMetrics({ radius }) {
    if (typeof radius === "number" && radius > 0) {
      sceneRadius = radius;
    } else {
      sceneRadius = 1;
    }
    if (mode === WORLD_AXES_MODE.FIXED) {
      updateFixed();
    }
  }

  function setMode(next) {
    const n = Number(next);
    const m = (n === WORLD_AXES_MODE.FULL_VIEW) ? WORLD_AXES_MODE.FULL_VIEW : (n ? WORLD_AXES_MODE.FIXED : WORLD_AXES_MODE.OFF);
    mode = m;
    group.visible = (mode !== WORLD_AXES_MODE.OFF);
    // Reset camera key so that FULL_VIEW updates immediately.
    if (mode !== WORLD_AXES_MODE.FULL_VIEW) _lastCamKey = "";
    if (mode === WORLD_AXES_MODE.FIXED) updateFixed();
  }

  function getMode() {
    return mode;
  }

  function updateCamera(camera) {
    if (mode !== WORLD_AXES_MODE.FULL_VIEW) return;
    updateFullView(camera);
  }

  function setVisible(flag) {
    // backward-compat: visible=true maps to FIXED
    setMode(flag ? WORLD_AXES_MODE.FIXED : WORLD_AXES_MODE.OFF);
  }

  function toggle() {
    // backward-compat: 2-mode toggle
    setVisible(mode === WORLD_AXES_MODE.OFF);
  }

  return {
    group,
    updateMetrics,
    updateCamera,
    setMode,
    getMode,
    setVisible,
    toggle,
  };
}
