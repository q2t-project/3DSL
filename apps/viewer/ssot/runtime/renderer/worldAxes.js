// viewer/runtime/renderer/worldAxes.js
//
// ワールド共通の座標軸（gizmo 左下の worldaxis トグルで表示）
// - X = 青, Y = 緑, Z = 赤
// - 3モード: OFF -> FIXED -> FULL_VIEW -> OFF
//   - FIXED: シーン半径から決めた固定長
//   - FULL_VIEW: ビューポート内一杯（カメラのフラスタム境界まで）

import * as THREE from "/vendor/three/build/three.module.js";

export function createWorldAxesLayer(scene) {
  const group = new THREE.Group();
  group.name = "world-axes";
  // overlay 的に常に見える方が UX が良いので最前面寄りに寄せる
  group.renderOrder = 9999;
  group.visible = false;
  scene.add(group);

  // 0: off, 1: fixed, 2: full_view
  let mode = 0;
  let sceneRadius = 1;

  const origin = new THREE.Vector3(0, 0, 0);

  const _tmpMat = new THREE.Matrix4();
  const _frustum = new THREE.Frustum();
  const _tmpP = new THREE.Vector3();
  const _dx = new THREE.Vector3(1, 0, 0);
  const _dy = new THREE.Vector3(0, 1, 0);
  const _dz = new THREE.Vector3(0, 0, 1);
  const _dxn = new THREE.Vector3(-1, 0, 0);
  const _dyn = new THREE.Vector3(0, -1, 0);
  const _dzn = new THREE.Vector3(0, 0, -1);

  function _makeLine(color, opacity) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(6);
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false;
    line.renderOrder = group.renderOrder;
    return { line, geom, pos };
  }

  // X=青 / Y=緑 / Z=赤
  const lines = {
    xPos: _makeLine(new THREE.Color(0x3366ff), 0.55),
    xNeg: _makeLine(new THREE.Color(0x112244), 0.30),
    yPos: _makeLine(new THREE.Color(0x33ff66), 0.55),
    yNeg: _makeLine(new THREE.Color(0x115533), 0.30),
    zPos: _makeLine(new THREE.Color(0xff3366), 0.55),
    zNeg: _makeLine(new THREE.Color(0x553333), 0.30),
  };
  for (const k of Object.keys(lines)) group.add(lines[k].line);

  function _setSegment(buf, x1, y1, z1, x2, y2, z2) {
    buf[0] = x1; buf[1] = y1; buf[2] = z1;
    buf[3] = x2; buf[4] = y2; buf[5] = z2;
  }

  function _applyFixedLength() {
    const r = Number.isFinite(sceneRadius) && sceneRadius > 0 ? sceneRadius : 1;
    // 旧 AxesHelper スケールの感覚に合わせて固定長を決める
    const len = Math.max(0.6, Math.min(r * 0.25, 50));
    _applyLengths({
      xPos: len,
      xNeg: len,
      yPos: len,
      yNeg: len,
      zPos: len,
      zNeg: len,
    });
  }

  function _applyLengths(L) {
    _setSegment(lines.xPos.pos, 0, 0, 0,  L.xPos, 0, 0);
    _setSegment(lines.xNeg.pos, 0, 0, 0, -L.xNeg, 0, 0);
    _setSegment(lines.yPos.pos, 0, 0, 0, 0,  L.yPos, 0);
    _setSegment(lines.yNeg.pos, 0, 0, 0, 0, -L.yNeg, 0);
    _setSegment(lines.zPos.pos, 0, 0, 0, 0, 0,  L.zPos);
    _setSegment(lines.zNeg.pos, 0, 0, 0, 0, 0, -L.zNeg);
    for (const k of Object.keys(lines)) {
      lines[k].geom.attributes.position.needsUpdate = true;
      lines[k].geom.computeBoundingSphere();
    }
  }

  function updateMetrics({ radius }) {
    if (typeof radius === "number" && radius > 0) {
      sceneRadius = radius;
    } else {
      sceneRadius = 1;
    }
    if (mode === 1) _applyFixedLength();
  }

  function setMode(m) {
    let mm = Number(m);
    if (!Number.isFinite(mm)) mm = 0;
    mm = (mm === 2) ? 2 : ((mm === 1) ? 1 : 0);
    mode = mm;
    group.visible = mode !== 0;
    if (mode === 1) _applyFixedLength();
  }

  function getMode() {
    return mode;
  }

  function _rayToFrustumDistance(dir) {
    // origin がフラスタム外なら「ビュー内一杯」の定義が破綻するので null
    if (!_frustum.containsPoint(origin)) return null;

    let best = Infinity;
    for (const plane of _frustum.planes) {
      const denom = plane.normal.dot(dir);
      if (Math.abs(denom) < 1e-6) continue;
      const t = -(plane.distanceToPoint(origin)) / denom;
      if (!(t > 0)) continue;
      _tmpP.copy(origin).addScaledVector(dir, t);
      if (_frustum.containsPoint(_tmpP)) {
        if (t < best) best = t;
      }
    }
    return Number.isFinite(best) ? best : null;
  }

  function updateView({ camera }) {
    if (mode !== 2) return;
    if (!camera) return;

    try { camera.updateMatrixWorld?.(); } catch (_e) {}

    // フラスタム更新
    _tmpMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_tmpMat);

    const txp = _rayToFrustumDistance(_dx);
    const txn = _rayToFrustumDistance(_dxn);
    const typ = _rayToFrustumDistance(_dy);
    const tyn = _rayToFrustumDistance(_dyn);
    const tzp = _rayToFrustumDistance(_dz);
    const tzn = _rayToFrustumDistance(_dzn);

    // fallback: どれか取れないなら固定長へ
    if (
      txp === null || txn === null ||
      typ === null || tyn === null ||
      tzp === null || tzn === null
    ) {
      _applyFixedLength();
      return;
    }

    const k = 0.985; // 端ぴったりはクリップしやすいので少し内側
    _applyLengths({
      xPos: txp * k,
      xNeg: txn * k,
      yPos: typ * k,
      yNeg: tyn * k,
      zPos: tzp * k,
      zNeg: tzn * k,
    });
  }

  // 初期化
  setMode(0);
  _applyFixedLength();

  return {
    group,
    updateMetrics,
    setMode,
    getMode,
    updateView,
  };
}
