// viewer/ui/gizmo.js

import * as THREE from '../../vendor/three/build/three.module.js';
import { teardownPrevHandle } from './handleUtils.js';
import { mapDragToOrbitDelta, ORBIT_SENS } from './orbitMapping.js';
import { createHubFacade } from './hubFacade.js';

// ------------------------------------------------------------
// perf tuning（gizmoだけ軽量化）
// ------------------------------------------------------------
// "phong" が見た目と軽さのバランス良い。さらに軽量化する場合は "lambert"
const GIZMO_MATERIAL_KIND = 'phong'; // "phong" | "lambert" | "standard"

// トーラス分割：ここが頂点数の主因のため削減する（16/48 → 10/32）
const RING_RADIAL_SEGMENTS = 10;
const RING_TUBULAR_SEGMENTS = 32;

// 細部も軽く（必要に応じて）
const SPHERE_SEGMENTS = 16; // 24 -> 16
const PATCH_SEGMENTS = 32; // 48 -> 32
const ROD_SEGMENTS = 20; // 32 -> 20
const LENS_SEGMENTS = 24; // 32 -> 24
const BEAM_SEGMENTS = 12; // 16 -> 12

// viewer/ui/gizmo.js（先頭付近）
let CAMERA_VIEW_DEFS = null;
let CAMERA_VIEW_ALIASES = null;
let CAMERA_VIEW_PRESET_SEQUENCE = null;

function loadViewDefsFromFacade(hf) {
  // view preset 定義（CameraEngine 側の定義）
  // - UI 側は hf.getViewDefs() 以外から参照しない
  const vd = hf?.getViewDefs?.() ?? null;
  if (!vd) return;

  // { defs, aliases } 形式 / 単純配列 どちらも許容
  if (Array.isArray(vd)) {
    viewDefs = vd;
    viewAliases = {};
    return;
  }

  viewDefs = Array.isArray(vd.defs) ? vd.defs : [];
  viewAliases = vd.aliases && typeof vd.aliases === 'object' ? vd.aliases : {};
}

function createLitMaterial(params) {
  const kind = GIZMO_MATERIAL_KIND;

  // StandardMaterial 由来のキーを除去（Phong/Lambert に投げると無駄）
  const {
    metalness: _metalness,
    roughness: _roughness,
    clearcoat: _clearcoat,
    clearcoatRoughness: _clearcoatRoughness,
    ior: _ior,
    transmission: _transmission,
    thickness: _thickness,
    ...rest
  } = params || {};

  if (kind === 'standard') return new THREE.MeshStandardMaterial(params);
  if (kind === 'lambert') return new THREE.MeshLambertMaterial(rest);

  // phong
  const mat = new THREE.MeshPhongMaterial(rest);
  // 既定のテカり（指定が無い時だけ）
  if (!('specular' in rest)) mat.specular = new THREE.Color(0x9aa0aa);
  if (!('shininess' in rest)) mat.shininess = 70;
  return mat;
}

// 軸カラー設定
//   XY 平面 (Z 軸) = 赤 : existence (上下)
//   YZ 平面 (X 軸) = 青 : quality (左右)
//   ZX 平面 (Y 軸) = 緑 : time   (前後)
const COLOR_AXIS_X = 0x5588ff; // X / YZ plane → blue
const COLOR_AXIS_Y = 0x55ff55; // Y / ZX plane → green
const COLOR_AXIS_Z = 0xff5555; // Z / XY plane → red;

// 軸 → view 名ヘルパ（上のほうに置くと見通しが良い）
function axisToViewName(axis) {
  switch (axis) {
    case 'x':
      return 'x+';
    case 'y':
      return 'y+';
    case 'z':
      return 'z+';
    default:
      return null;
  }
}

// ------------------------------------------------------------
// view preset 解決ヘルパ
// ------------------------------------------------------------

// name ("front", "iso-ne", "x+" など) → 正規 key へ
function resolvePresetKey(name) {
  if (!name) return null;
  const raw = String(name);

  let key = raw;
  if (CAMERA_VIEW_ALIASES && Object.prototype.hasOwnProperty.call(CAMERA_VIEW_ALIASES, raw)) {
    key = CAMERA_VIEW_ALIASES[raw];
  }

  if (!CAMERA_VIEW_DEFS || !Object.prototype.hasOwnProperty.call(CAMERA_VIEW_DEFS, key)) {
    return null;
  }

  return key;
}

// name → preset index（0〜N-1）
function resolvePresetIndexByName(name) {
  const key = resolvePresetKey(name);
  if (!key) return null;

  if (!Array.isArray(CAMERA_VIEW_PRESET_SEQUENCE) || CAMERA_VIEW_PRESET_SEQUENCE.length === 0) {
    return null;
  }

  const idx = CAMERA_VIEW_PRESET_SEQUENCE.indexOf(key);
  return idx >= 0 ? idx : null;
}

function stopAuto(cam, hf) {
  if (cam && typeof cam.stopAutoOrbit === 'function') {
    cam.stopAutoOrbit();
    return;
  }
  // fallback: facade command
  hf?.commands?.stopAutoOrbit?.();
}

// setViewPreset(index)
function applyViewPresetIndex(cam, hf, nextIndex) {
  if (!Number.isFinite(nextIndex)) return;
  const i = Math.floor(nextIndex);

  // auto を止めてから適用
  stopAuto(cam, hf);

  if (cam && typeof cam.setViewPreset === 'function') {
    cam.setViewPreset(i);
    return;
  }
  hf?.commands?.setViewPreset?.(i);
}

// メインカメラ state から「向き」だけをもらって、
// 原点まわりの小さい「リング型 gizmo」を描画するミニ・ビューポート
export function attachGizmo(wrapper, hub, ctx = {}) {
  if (!wrapper) return null;
  if (!hub) return null;

  const hf = createHubFacade(hub);

  const DEV =
    typeof import.meta !== 'undefined' && import.meta.env && !!import.meta.env.DEV;
  const DEBUG = DEV && !!ctx.debug;

  const doc = ctx.doc || wrapper.ownerDocument || document;
  const win = ctx.win || doc.defaultView || window;
  const getEl = typeof ctx.el === 'function' ? ctx.el : null;

  if (DEBUG) console.log('[gizmo] attach start', wrapper);

  // 既存 gizmo を teardown（参照一致なら null に戻す）
  teardownPrevHandle(wrapper, '__gizmoHandle');

  loadViewDefsFromFacade(hf);

  let mount = wrapper.querySelector?.('[data-role="gizmo-canvas-slot"]') || null;

  if (!mount) {
    mount = doc.createElement('div');
    mount.dataset.role = 'gizmo-canvas-slot';
    mount.style.position = 'absolute';
    mount.style.inset = '0';
    wrapper.appendChild(mount);
  }

  // 既存canvasだけ除去（他DOMは残す）
  Array.from(mount.querySelectorAll?.("canvas[data-role='gizmo-canvas']") || []).forEach((n) =>
    n.remove()
  );

  const canvas = doc.createElement('canvas');
  canvas.dataset.role = 'gizmo-canvas';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'auto';
  mount.appendChild(canvas);

  let handle = null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
  });

  // ★ dispose 用フラグと rAF ハンドル
  let isDisposed = false;

  // ------------------------------------------------------------
  // Render scheduler
  // ------------------------------------------------------------
  let rafId = null;
  let needsRender = false;
  let isInteracting = false;
  let settleTimer = null;

  const DPR_INTERACT = 1.0;
  const DPR_IDLE = Math.min(win.devicePixelRatio || 1, 1.5);
  let desiredDpr = DPR_IDLE;

  // HUD controls（gizmo関連のボタン初期化はここが唯一の正規ルート）
  // ...
  const presetToggleBtn = getEl?.('gizmoPresetsToggle') || null;

  // ★ row-only HUD buttons（X/Y/Z + NE/NW/SW/SE）をここで初期化
  const hudBtnHandle = initGizmoButtons(hub, { doc, el: getEl });

  function setQuality(interacting) {
    desiredDpr = interacting ? DPR_INTERACT : DPR_IDLE;
    // setPixelRatio は resizeIfNeeded() 側で setSize とセットでやる
  }

  function requestRender() {
    if (isDisposed) return;
    needsRender = true;
    if (rafId != null) return;
    rafId = win.requestAnimationFrame(tick);
  }

  function startInteractiveLoop() {
    if (isInteracting) return;
    isInteracting = true;
    if (settleTimer) {
      win.clearTimeout(settleTimer);
      settleTimer = null;
    }
    setQuality(true);
    syncHudFromHub();
    requestRender();
  }

  function stopInteractiveLoop() {
    if (!isInteracting) return;
    isInteracting = false;
    if (settleTimer) win.clearTimeout(settleTimer);
    settleTimer = win.setTimeout(() => {
      setQuality(false);
      requestRender();
    }, 200);
  }

  // ------------------------------------------------------------
  // HUD controls（gizmo関連のボタン初期化はここが唯一の正規ルート）
  // ------------------------------------------------------------
  const camCtrl = hf.getCamera?.() ?? null;
  const viewState = hf.getUiState?.() ?? null;
  const modeAPI = hf.getMode?.() ?? null;

  const elModeText = getEl?.('gizmoModeLabel') || null;
  const elMacroPill = getEl?.('modePillMacro') || null;
  const elMicroPill = getEl?.('modePillMicro') || null;

  const btnAutoToggle = getEl?.('autoOrbitToggle') || null;
  const btnCW = getEl?.('autoOrbitCW') || null;
  const btnCCW = getEl?.('autoOrbitCCW') || null;

  let autoRunning = false;
  let autoDir = 'ccw';
  let autoSpeed = 1;
  const AUTO_MAX_SPEED = 2;

  const readAuto = () => {
    if (camCtrl && typeof camCtrl.isAutoOrbiting === 'function') {
      return !!camCtrl.isAutoOrbiting();
    }
    return !!viewState?.runtime?.isCameraAuto;
  };

  const readMode = () => {
    const st = viewState?.runtime?.status ?? null;
    const eff = st?.effective?.mode;
    if (eff === 'macro' || eff === 'micro') return eff;
    if (modeAPI && typeof modeAPI.get === 'function') {
      const m = modeAPI.get();
      if (m === 'macro' || m === 'micro') return m;
    }
    return 'macro';
  };

  const uiAuto = () => {
    if (!btnCW || !btnCCW) return;
    [btnCW, btnCCW].forEach((b) => b.classList.remove('is-running', 'is-fast'));
    if (!autoRunning) return;
    const b = autoDir === 'cw' ? btnCW : btnCCW;
    b.classList.add('is-running');
    if (autoSpeed === 2) b.classList.add('is-fast');
  };

  const applyAuto = () => {
    if (!camCtrl) return;
    if (!autoRunning) {
      camCtrl.stopAutoOrbit?.();
      return;
    }
    const dirSign = autoDir === 'cw' ? -1 : 1;
    const opts = { direction: dirSign, speedLevel: autoSpeed };
    if (readAuto() && typeof camCtrl.updateAutoOrbitSettings === 'function') {
      camCtrl.updateAutoOrbitSettings(opts);
    } else {
      camCtrl.startAutoOrbit?.(opts);
    }
  };

  const syncHudFromHub = () => {
    // mode
    const m = readMode();
    if (elModeText) elModeText.textContent = m;
    if (elMacroPill && elMicroPill) {
      elMacroPill.classList.toggle('mode-pill-active', m === 'macro');
      elMicroPill.classList.toggle('mode-pill-active', m === 'micro');
    }

    // auto orbit（runtime truth に追従）
    const a = readAuto();
    if (a !== autoRunning) autoRunning = a;
    uiAuto();
  };

  const on = (el, type, fn, opt) => {
    if (!el?.addEventListener) return () => {};
    el.addEventListener(type, fn, opt);
    return () => {
      try {
        el.removeEventListener(type, fn, opt);
      } catch (_e) {}
    };
  };

  const offAutoToggle = on(btnAutoToggle, 'click', (ev) => {
    ev.preventDefault?.();
    autoRunning = !autoRunning;
    if (!autoRunning) {
      uiAuto();
      applyAuto();
      return;
    }
    autoDir = autoDir || 'ccw';
    autoSpeed = autoSpeed || 1;
    uiAuto();
    applyAuto();
  });

  const offCW = on(btnCW, 'click', (ev) => {
    ev.preventDefault?.();
    if (!autoRunning) {
      autoRunning = true;
      autoDir = 'cw';
      autoSpeed = 1;
      uiAuto();
      applyAuto();
      return;
    }
    if (autoDir === 'cw') autoSpeed = autoSpeed === 1 ? AUTO_MAX_SPEED : 1;
    else {
      autoDir = 'cw';
      autoSpeed = 1;
    }
    uiAuto();
    applyAuto();
  });

  const offCCW = on(btnCCW, 'click', (ev) => {
    ev.preventDefault?.();
    if (!autoRunning) {
      autoRunning = true;
      autoDir = 'ccw';
      autoSpeed = 1;
      uiAuto();
      applyAuto();
      return;
    }
    if (autoDir === 'ccw') autoSpeed = autoSpeed === 1 ? AUTO_MAX_SPEED : 1;
    else {
      autoDir = 'ccw';
      autoSpeed = 1;
    }
    uiAuto();
    applyAuto();
  });

  // 初期値
  const width = wrapper.clientWidth || 210;
  const height = wrapper.clientHeight || 210;
  canvas.width = canvas.height = 1;
  renderer.setSize(1, 1, false);

  renderer.setClearColor(0x000000, 0); // 透明
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.up.set(0, 0, 1);
  camera.updateProjectionMatrix();

  const gyroGroup = new THREE.Group();

  // ------------------------------------------------------------
  // ジャイロ本体パラメータ
  // ------------------------------------------------------------
  const ringRadius = 1.3;
  const ringTube = 0.12;
  const ringRadialSegments = RING_RADIAL_SEGMENTS;
  const ringTubularSegments = RING_TUBULAR_SEGMENTS;

  const CAM_DISTANCE = ringRadius * 1.3; // カメラ中心と原点の距離
  const LENS_OFFSET = 0.18; // カメラローカル原点→レンズ中心の距離（-Z 方向）

  const clickableRingMeshes = [];
  const clickablePresetMeshes = [];
  const presetBeams = []; // { key, mesh }
  const presetGroupsByKey = Object.create(null);
  let activePresetKey = null;

  // ------------------------------------------------------------
  // 7 ビュー定義: 3 軸 (+X,+Y,+Z) + アイソメ 4 方
  // 角度(theta,phi)は CAMERA_VIEW_DEFS から取得して一元管理
  // ------------------------------------------------------------

  const RAW_PRESET_DEFS = [
    // 軸 3 面
    { id: 'x+', label: 'X+', kind: 'axis', uiPos: 'right' },
    { id: 'y+', label: 'Y+', kind: 'axis', uiPos: 'top' },
    { id: 'z+', label: 'Z+', kind: 'axis', uiPos: 'top' },

    // アイソメ 4 方（NE / NW / SW / SE）
    { id: 'iso-ne', label: 'ISO NE', kind: 'iso', uiPos: 'ne' },
    { id: 'iso-nw', label: 'ISO NW', kind: 'iso', uiPos: 'nw' },
    { id: 'iso-sw', label: 'ISO SW', kind: 'iso', uiPos: 'sw' },
    { id: 'iso-se', label: 'ISO SE', kind: 'iso', uiPos: 'se' },
  ];

  const PRESET_DEFS = RAW_PRESET_DEFS.map((def) => {
    const key = resolvePresetKey(def.id) || def.id;
    const view = CAMERA_VIEW_DEFS[key];
    return {
      ...def,
      key,
      theta: view ? view.theta : 0,
      phi: view ? view.phi : Math.PI / 2,
    };
  });

  function dirFromAngles(theta, phi, out = new THREE.Vector3()) {
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    out.set(
      sinPhi * cosTheta, // X
      sinPhi * sinTheta, // Y
      cosPhi // Z
    );
    return out;
  }

  PRESET_DEFS.forEach((def) => {
    def.dir = dirFromAngles(def.theta, def.phi, new THREE.Vector3());
  });

  // ------------------------------------------------------------
  // 軸ごとにリングを作る
  // ------------------------------------------------------------
  function createAxisRing(axis, baseHex) {
    const geom = new THREE.TorusGeometry(
      ringRadius,
      ringTube,
      ringRadialSegments,
      ringTubularSegments
    );

    // 平面の向きを axis に合わせる
    switch (axis) {
      case 'x':
        // YZ 平面（法線 +X）
        geom.rotateY(Math.PI / 2);
        break;
      case 'y':
        // ZX 平面（法線 +Y）
        geom.rotateX(Math.PI / 2);
        break;
      case 'z':
      default:
        // XY 平面（法線 +Z）→ そのまま
        break;
    }

    const baseColor = new THREE.Color(baseHex);
    const bright = baseColor.clone(); // ＋側
    const dark = baseColor.clone().multiplyScalar(0.3); // −側は暗く

    const pos = geom.attributes.position;
    const colorArray = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      let coord = 0;
      if (axis === 'x') coord = x;
      else if (axis === 'y') coord = y;
      else coord = z; // "z"

      const c = coord >= 0 ? bright : dark;

      colorArray[i * 3 + 0] = c.r;
      colorArray[i * 3 + 1] = c.g;
      colorArray[i * 3 + 2] = c.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const mat = createLitMaterial({
      vertexColors: true,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.axis = axis; // snap 用
    clickableRingMeshes.push(mesh); // raycast 用 group から子へ recursive で拾う
    gyroGroup.add(mesh);
    return mesh;
  }

  // 各軸リング生成
  createAxisRing('x', COLOR_AXIS_X); // YZ 平面 = 青
  createAxisRing('y', COLOR_AXIS_Y); // ZX 平面 = 緑
  createAxisRing('z', COLOR_AXIS_Z); // XY 平面 = 赤

  // 中心の小さなメタル球
  const centerSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    createLitMaterial({ color: 0xdddddd })
  );
  gyroGroup.add(centerSphere);

  // ------------------------------------------------------------
  // 第1象限サーフェス
  // ------------------------------------------------------------
  const patchRadius = ringRadius - ringTube * 0.6;
  const patchGeom = new THREE.CircleGeometry(
    patchRadius,
    PATCH_SEGMENTS,
    0,
    Math.PI / 2 // 90°
  );

  const basePatchMat = createLitMaterial({
    color: 0xffff99,
    emissive: 0x332200,
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const patchXY = new THREE.Mesh(patchGeom, basePatchMat);
  gyroGroup.add(patchXY);

  const patchXZ = new THREE.Mesh(patchGeom, basePatchMat.clone());
  patchXZ.rotation.x = Math.PI / 2;
  gyroGroup.add(patchXZ);

  const patchYZ = new THREE.Mesh(patchGeom, basePatchMat.clone());
  patchYZ.rotation.y = -Math.PI / 2;
  gyroGroup.add(patchYZ);

  // ------------------------------------------------------------
  // Z 軸シャフト（シルバー）
  // ------------------------------------------------------------
  const rodRadius = 0.32;
  const rodLength = ringRadius * 2.8;
  const rodGeom = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, ROD_SEGMENTS);
  const rodMat = createLitMaterial({
    color: 0x444444,
  });
  const zRod = new THREE.Mesh(rodGeom, rodMat);
  zRod.rotation.x = Math.PI / 2;
  gyroGroup.add(zRod);

  // ------------------------------------------------------------
  // 軸端ラベル "x+","y+","z+"
  // ------------------------------------------------------------
  function createAxisLabel(text, axisColorHex, dirVec3, options = {}) {
    const {
      labelRadiusScale = 1.4,
      rotateInPlaneRad = 0,
      flipFacing = false,
      tiltXRadians = 0,
    } = options;

    const size = 128;
    const canvasLabel = doc.createElement('canvas');
    canvasLabel.width = size;
    canvasLabel.height = size / 2;

    const ctx = canvasLabel.getContext('2d');
    ctx.clearRect(0, 0, canvasLabel.width, canvasLabel.height);

    const basePx = 48;
    ctx.font =
      'italic 600 ' + basePx + 'px ' + "'Cambria Math', 'Cambria', 'Times New Roman', serif";

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvasLabel.width, canvasLabel.height);

    const colorStr = '#' + axisColorHex.toString(16).padStart(6, '0');
    ctx.strokeStyle = colorStr;
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 3;

    const cx = canvasLabel.width / 2;
    const cy = canvasLabel.height / 2;
    ctx.strokeText(text, cx, cy);
    ctx.fillText(text, cx, cy);

    const tex = new THREE.CanvasTexture(canvasLabel);
    tex.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    const planeW = 1.0;
    const planeH = 0.5;
    const geo = new THREE.PlaneGeometry(planeW, planeH);
    const mesh = new THREE.Mesh(geo, mat);

    const pos = dirVec3.clone().setLength(ringRadius * labelRadiusScale);
    mesh.position.copy(pos);

    mesh.lookAt(dirVec3.clone().multiplyScalar(2));

    if (flipFacing) {
      mesh.rotateY(Math.PI);
    }

    if (tiltXRadians !== 0) {
      mesh.rotateX(tiltXRadians);
    }

    if (rotateInPlaneRad !== 0) {
      mesh.rotateZ(rotateInPlaneRad);
    }

    gyroGroup.add(mesh);
  }

  createAxisLabel('x+', COLOR_AXIS_X, new THREE.Vector3(0.9, 0, 0), {
    labelRadiusScale: 1.2,
    rotateInPlaneRad: Math.PI / 2,
  });

  createAxisLabel('y+', COLOR_AXIS_Y, new THREE.Vector3(0, 0.9, 0), {
    labelRadiusScale: 1.2,
    rotateInPlaneRad: Math.PI,
  });

  createAxisLabel('z+', COLOR_AXIS_Z, new THREE.Vector3(0, 0, 0.5), {
    labelRadiusScale: 1.5,
    tiltXRadians: -Math.PI / 2,
  });

  // ------------------------------------------------------------
  // 7 ビュー用ミニカメラ（3D メッシュ）＋ビーム
  // ------------------------------------------------------------
  const camBodyGeo = new THREE.BoxGeometry(0.36, 0.2, 0.26);
  const camBodyMat = createLitMaterial({
    color: 0x999999, // グレー筐体
  });

  const lensGeo = new THREE.CircleGeometry(0.09, LENS_SEGMENTS);
  const lensMat = createLitMaterial({
    color: 0x99c0ff,
    emissive: 0x3355ff,
  });

  const beamRadius = 0.03;

  const beamMatBase = createLitMaterial({
    color: 0x99bbff,
    emissive: 0x3355ff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  function createPresetCamera(def) {
    const group = new THREE.Group();
    const dir = def.dir.clone().normalize();

    // カメラ位置（原点から CAM_DISTANCE の位置）
    const camPos = dir.clone().setLength(CAM_DISTANCE);
    group.position.copy(camPos);

    // 「前方向」(-Z) を原点に向ける
    const forward = new THREE.Vector3(0, 0, -1);
    const toCenter = camPos.clone().multiplyScalar(-1).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(forward, toCenter);
    group.quaternion.copy(q);

    // 本体
    const body = new THREE.Mesh(camBodyGeo, camBodyMat);
    body.position.z = 0;
    group.add(body);

    // レンズ（原点側の面）
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.z = -LENS_OFFSET;
    lens.rotation.y = Math.PI; // 法線を -Z（原点向き）へ
    group.add(lens);

    // 視線ビーム（アイソメ4方のみ）
    if (def.kind === 'iso') {
      const beamLength = CAM_DISTANCE - LENS_OFFSET; // レンズ中心〜原点
      const beamGeom = new THREE.CylinderGeometry(
        beamRadius,
        beamRadius,
        beamLength,
        BEAM_SEGMENTS
      );

      const beam = new THREE.Mesh(beamGeom, beamMatBase.clone());

      // Cylinder は Y 軸方向に伸びるので、Z 軸に合わせる
      beam.rotation.x = Math.PI / 2;

      // レンズ(z = -LENS_OFFSET) と 原点(z = -CAM_DISTANCE) の中点に置く
      const beamCenterZ = -(CAM_DISTANCE + LENS_OFFSET) / 2;
      beam.position.set(0, 0, beamCenterZ);

      group.add(beam);
      presetBeams.push({ key: def.key, mesh: beam });
    }

    group.userData.presetKey = def.key;
    gyroGroup.add(group);

    clickablePresetMeshes.push(group);
    presetGroupsByKey[def.key] = group;
  }

  PRESET_DEFS.forEach(createPresetCamera);

  const ISO_KEYS = new Set(PRESET_DEFS.filter((d) => d.kind === 'iso').map((d) => d.key));

  // 枠から少し余白が出るように全体を縮小
  const GIZMO_SCALE = 0.8;
  gyroGroup.scale.set(GIZMO_SCALE, GIZMO_SCALE, GIZMO_SCALE);
  scene.add(gyroGroup);

  // ライティング
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(3, 4, 6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
  rimLight.position.set(-4, -3, -5);
  scene.add(rimLight);

  // snap 判定用
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  // ------------------------------------------------------------
  // 7ビュー UI 制御（ON/OFF）
  // ------------------------------------------------------------
  let presetsVisible = false;

  function updatePresetVisibility() {
    clickablePresetMeshes.forEach((g) => {
      g.visible = presetsVisible;
    });

    if (presetToggleBtn) {
      presetToggleBtn.setAttribute('aria-pressed', presetsVisible ? 'true' : 'false');
    }
  }

  // ★ リスナを外せるように名前付き関数に
  function handlePresetToggle(ev) {
    if (isDisposed) return;
    ev.preventDefault();
    presetsVisible = !presetsVisible;
    updatePresetVisibility();
    requestRender();
  }

  if (presetToggleBtn) {
    presetToggleBtn.addEventListener('click', handlePresetToggle);
  }

  updatePresetVisibility();

  // ------------------------------------------------------------
  // 角度から最寄りプリセットを探す
  // ------------------------------------------------------------
  // 閾値: theta/phi の二乗和がこれ未満なら「ほぼそのプリセット」
  const ACTIVE_PRESET_MAX_ERR = 0.5; // (rad^2) ざっくり 30° 前後のズレまで

  function findNearestPreset(theta, phi) {
    let bestId = null;
    let bestScore = Infinity;

    PRESET_DEFS.forEach((def) => {
      const dTheta = Math.atan2(Math.sin(theta - def.theta), Math.cos(theta - def.theta));
      const dPhi = phi - def.phi;
      const score = dTheta * dTheta + dPhi * dPhi;
      if (score < bestScore) {
        bestScore = score;
        bestId = def.key;
      }
    });

    return bestScore < ACTIVE_PRESET_MAX_ERR ? bestId : null;
  }

  // ------------------------------------------------------------
  // プリセット適用 → CameraEngine 側へ通知
  // ------------------------------------------------------------
  function applyPresetById(id) {
    if (!camCtrl) return;

    const key = resolvePresetKey(id) || id;
    const index = Array.isArray(CAMERA_VIEW_PRESET_SEQUENCE)
      ? CAMERA_VIEW_PRESET_SEQUENCE.indexOf(key)
      : -1;
    if (index < 0) return;

    stopAuto(camCtrl, hf);
    applyViewPresetIndex(camCtrl, hf, index);

    // beams / スケール制御用
    activePresetKey = key;
    requestRender();
  }

  // ------------------------------------------------------------
  // アクティブビューに応じたビーム演出（アイソメだけ点滅）
  // ------------------------------------------------------------
  function updatePresetBeams(timeSec) {
    presetBeams.forEach(({ key, mesh }) => {
      const mat = mesh.material;
      if (!mat) return;

      if (!presetsVisible || !activePresetKey || key !== activePresetKey) {
        mat.opacity = 0.0;
        return;
      }

      const t = (timeSec * 2.0) % 1.0;
      const pulse = 0.4 + 0.6 * Math.sin(t * Math.PI * 2) * 0.5 + 0.3;
      mat.opacity = pulse;
    });
  }

  // ------------------------------------------------------------
  // サイズ調整（wrapper の大きさに追従）
  // ------------------------------------------------------------
  let lastDisplaySize = 0;
  let lastDpr = 0;

  function resizeIfNeeded() {
    const rect = wrapper.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    const logicalSize = Math.max(32, Math.min(rect.width, rect.height));
    const displaySize = Math.round(logicalSize);

    const dpr = desiredDpr; // ★ window.devicePixelRatio じゃなくこれ

    if (displaySize === lastDisplaySize && dpr === lastDpr) return false;
    lastDisplaySize = displaySize;
    lastDpr = dpr;

    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    renderer.setPixelRatio(dpr);
    renderer.setSize(displaySize, displaySize, false);

    camera.aspect = 1;
    camera.updateProjectionMatrix();
    return true;
  }

  let perfSamplesLeft = 8;

  function tick(now) {
    rafId = null;
    if (isDisposed) return;

    const t0 = performance.now();
    const resized = resizeIfNeeded();
    const t1 = performance.now();

    syncCameraFromHub();
    const t2 = performance.now();

    // iso beam pulse（点滅）
    updatePresetBeams((typeof now === 'number' ? now : performance.now()) / 1000);

    if (needsRender || resized || isInteracting) {
      needsRender = false;
      renderer.render(scene, camera);
    }
    const t3 = performance.now();

    if (isInteracting) rafId = win.requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------
  // メインカメラ state → ミニカメラ姿勢
  // ------------------------------------------------------------
  const vPos = new THREE.Vector3();

  function syncCameraFromHub() {
    const cam = camCtrl || null;
    const hasSnap =
      !!cam &&
      (typeof cam.getCurrentSnapshot === 'function' ||
        typeof cam.getSnapshot === 'function' ||
        typeof cam.getState === 'function');

    if (!hasSnap) {
      camera.position.set(3, 3, 3);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0);
      return;
    }

    const state =
      typeof cam.getCurrentSnapshot === 'function'
        ? cam.getCurrentSnapshot(_camSnap)
        : typeof cam.getSnapshot === 'function'
          ? cam.getSnapshot(_camSnap)
          : cam.getState();
    if (!state) return;

    const theta = typeof state.theta === 'number' ? state.theta : 0;
    const phi = typeof state.phi === 'number' ? state.phi : Math.PI / 2;
    const distance = 4;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    vPos.set(distance * sinPhi * cosTheta, distance * sinPhi * sinTheta, distance * cosPhi);

    camera.position.copy(vPos);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    if (typeof state.fov === 'number') {
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    }

    // まず CameraEngine 側の preset index を優先
    let presetKey = null;
    if (
      cam &&
      typeof cam.getViewPresetIndex === 'function' &&
      Array.isArray(CAMERA_VIEW_PRESET_SEQUENCE)
    ) {
      const idx = cam.getViewPresetIndex();
      if (typeof idx === 'number' && idx >= 0 && idx < CAMERA_VIEW_PRESET_SEQUENCE.length) {
        presetKey = CAMERA_VIEW_PRESET_SEQUENCE[idx];
      }
    }

    // 取れなかったときだけ角度から最近傍を推定
    activePresetKey = presetKey || findNearestPreset(theta, phi);

    // 視点に合わせてプリセットカメラの見た目を更新
    Object.entries(presetGroupsByKey).forEach(([key, group]) => {
      if (!group) return;
      const s = key === activePresetKey ? 1.1 : 1.0;
      group.scale.set(s, s, s);
    });
  }

  // ------------------------------------------------------------
  // gizmo ドラッグ → カメラ回転 ＋ クリック → snapToAxis / 7ビュー
  // ------------------------------------------------------------
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragDistSq = 0;

  function handlePointerDown(ev) {
    if (isDisposed) return;
    if (ev.button !== 0) return;
    if (!camCtrl) return;

    // gizmo ドラッグ開始 = 手動操作 → AutoOrbit 停止
    const cam = camCtrl;

    stopAuto(cam, hf);

    startInteractiveLoop();

    isDragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    dragDistSq = 0;

    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch (_) {}

    ev.preventDefault();
  }

  function handlePointerMove(ev) {
    if (isDisposed) return;
    if (!isDragging) return;
    if (!camCtrl) return;

    const cam = camCtrl;
    if (typeof cam.rotate !== 'function') return;

    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    dragDistSq += dx * dx + dy * dy;

    startInteractiveLoop();

    const { dTheta, dPhi } = mapDragToOrbitDelta(dx, dy, ORBIT_SENS);
    cam.rotate(dTheta, dPhi);

    ev.preventDefault();
  }

  function handleGizmoClick(ev) {
    if (isDisposed) return;
    if (!camCtrl) return;

    const cam = camCtrl;

    stopAuto(cam, hf);

    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ndc.set(x, y);

    raycaster.setFromCamera(ndc, camera);

    // まずリング（軸スナップ）
    const ringHit = raycaster.intersectObjects(clickableRingMeshes, false)[0];
    if (ringHit && ringHit.object) {
      const axis = ringHit.object.userData.axis; // "x" / "y" / "z"

      const viewName = axisToViewName(axis);
      const index = viewName != null ? resolvePresetIndexByName(viewName) : null;

      if (index != null && typeof cam.setViewPreset === 'function') {
        applyViewPresetIndex(cam, hub, index);
      } else if (axis && typeof cam.snapToAxis === 'function') {
        cam.snapToAxis(axis); // フォールバック
      }
      return;
    }

    // 次に 7 ビューカメラ
    if (presetsVisible) {
      const presetHit = raycaster.intersectObjects(clickablePresetMeshes, true)[0];
      if (presetHit && presetHit.object) {
        let g = presetHit.object;
        while (g && !g.userData?.presetKey) g = g.parent;
        const key = g?.userData?.presetKey;
        if (key) applyPresetById(key);
      }
    }
  }

  function handlePointerUp(ev) {
    if (isDisposed) return;
    if (!isDragging) return;

    const CLICK_THRESH_SQ = 36;
    const clicked = dragDistSq <= CLICK_THRESH_SQ && ev.type === 'pointerup';

    isDragging = false;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch (_) {}

    if (clicked) {
      handleGizmoClick(ev);
    }

    stopInteractiveLoop();
    ev.preventDefault();
  }

  // rAF 監視用：snapshot 再利用（GC出さん）
  const _camSnap = { target: { x: 0, y: 0, z: 0 } };
  let _lastTheta = NaN;
  let _lastPhi = NaN;
  let _lastFov = NaN;
  let _lastPresetIdx = null;
  let _lastMode = '';
  let _lastAuto = null;

  function readCameraSnapshot() {
    const cam = camCtrl;
    if (!cam) return null;
    if (typeof cam.getCurrentSnapshot === 'function') return cam.getCurrentSnapshot(_camSnap);
    if (typeof cam.getSnapshot === 'function') return cam.getSnapshot(_camSnap);
    if (typeof cam.getState === 'function') return cam.getState(); // fallback（参照返し）
    return null;
  }

  function detectCameraChange(st) {
    if (!st) return false;
    const theta = Number(st.theta);
    const phi = Number(st.phi);
    const fov = Number(st.fov);
    const idx = camCtrl?.getViewPresetIndex?.() ?? null;
    const mode = readMode();
    const auto = readAuto();

    const eps = 1e-7;
    const changed =
      !Number.isFinite(_lastTheta) ||
      Math.abs(theta - _lastTheta) > eps ||
      Math.abs(phi - _lastPhi) > eps ||
      Math.abs(fov - _lastFov) > 1e-4 ||
      idx !== _lastPresetIdx ||
      mode !== _lastMode ||
      auto !== _lastAuto;

    if (changed) {
      _lastTheta = theta;
      _lastPhi = phi;
      _lastFov = fov;
      _lastPresetIdx = idx;
      _lastMode = mode;
      _lastAuto = auto;
    }
    return changed;
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);

  // 初回だけ：サイズ→同期→1回描画
  resizeIfNeeded();
  syncCameraFromHub();
  syncHudFromHub();
  setQuality(false);

  // ---- warm-up (初回だけ重い compile/render を rAF の外へ) ----
  try {
    // shader compile + CanvasTexture upload をここで終わらせる
    if (typeof renderer.compile === 'function') renderer.compile(scene, camera);
    renderer.render(scene, camera);

    // tick 側で二度描きしないように
    needsRender = false;
  } catch (_e) {}

  // 以後の更新用に rAF 1回だけ回しとく（重くならん）
  requestRender();

  let monitorRafId = null;

  function monitor() {
    if (isDisposed) return;

    const st = readCameraSnapshot();
    const changed = detectCameraChange(st);

    // 変化してたらHUD同期＋描画要求（tick側が syncCameraFromHub して render）
    if (changed) {
      syncHudFromHub();
      requestRender();
    }

    // プリセット表示中のビーム点滅は rAF で回したいならここで requestRender
    if (presetsVisible && activePresetKey && ISO_KEYS.has(activePresetKey)) {
      requestRender();
    }

    monitorRafId = win.requestAnimationFrame(monitor);
  }

  monitorRafId = win.requestAnimationFrame(monitor);
  function dispose() {
    if (DEBUG) console.log('[gizmo] dispose called');
    if (isDisposed) return;
    isDisposed = true;

    if (monitorRafId != null) {
      try {
        win.cancelAnimationFrame(monitorRafId);
      } catch (_e) {}
      monitorRafId = null;
    }
    try {
      offAutoToggle?.();
    } catch (_e) {}
    try {
      offCW?.();
    } catch (_e) {}
    try {
      offCCW?.();
    } catch (_e) {}
    try {
      if (settleTimer) win.clearTimeout(settleTimer);
    } catch (_e) {}
    try {
      hudBtnHandle?.detach?.();
    } catch (_e) {}

    if (wrapper.__gizmoHandle === handle) wrapper.__gizmoHandle = null;

    if (rafId !== null) {
      win.cancelAnimationFrame(rafId);
      rafId = null;
    }

    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
    canvas.removeEventListener('pointerleave', handlePointerUp);

    if (presetToggleBtn) {
      presetToggleBtn.removeEventListener('click', handlePresetToggle);
    }

    // ---- dispose shared resources safely (only once) ----
    const geoms = new Set();
    const mats = new Set();
    const texs = new Set();

    scene.traverse((obj) => {
      if (obj.geometry) geoms.add(obj.geometry);

      const mm = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];

      for (const m of mm) {
        if (!m) continue;
        mats.add(m);
        if (m.map) texs.add(m.map);
      }
    });

    for (const t of texs) t.dispose?.();
    for (const m of mats) m.dispose?.();
    for (const g of geoms) g.dispose?.();

    try {
      renderer.dispose();
    } catch (_e) {}
    try {
      renderer.forceContextLoss?.();
    } catch (_e) {}
    try {
      canvas.remove();
    } catch (_e) {}
  }

  const detach = dispose;
  handle = { detach, dispose };
  wrapper.__gizmoHandle = handle;
  return handle;
}

// ------------------------------------------------------------
// HUD 側 gizmo ボタン初期化（row-only）
//   - contract: gizmoAxisRow / gizmoViewRow のみ
//   - HTML側に個別ボタンは置かない（JSが中身を生成）
// ------------------------------------------------------------
export function initGizmoButtons(hub, ctx = {}) {
  const doc = ctx.doc || document;
  const getEl = typeof ctx.el === 'function' ? ctx.el : null;

  if (!getEl) {
    console.warn('[gizmo] initGizmoButtons: role resolver (ctx.el) missing; disabled');
    return { detach() {}, dispose() {} };
  }

  const cleanup = [];
  const created = [];

  const on = (el, type, fn, opt) => {
    if (!el?.addEventListener) return;
    el.addEventListener(type, fn, opt);
    cleanup.push(() => {
      try {
        el.removeEventListener(type, fn, opt);
      } catch (_e) {}
    });
  };

  const hf = (() => { try { return createHubFacade(hub); } catch { return null; } })();
  const camOf = () => hf?.getCamera?.() ?? null;

  const clearChildren = (parent) => {
    if (!parent) return;
    while (parent.firstChild) parent.removeChild(parent.firstChild);
  };

  const createBtn = (parent, { label, title, className, onClick }) => {
    if (!parent) return null;
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = className || 'keycap';
    b.textContent = label || '';
    if (title) b.title = title;
    parent.appendChild(b);
    created.push(b);
    if (onClick) on(b, 'click', onClick);
    return b;
  };

  // -----------------------------
  // Axis row (X/Y/Z)
  // -----------------------------
  const axisRow = getEl('gizmoAxisRow') || null;
  if (axisRow) {
    clearChildren(axisRow);

    const mkAxis = (axis, label) => {
      createBtn(axisRow, {
        label,
        title: `Snap to ${axis.toUpperCase()} axis`,
        className: 'keycap gizmo-axis-btn',
        onClick: (ev) => {
          ev.preventDefault?.();
          const cam = camOf();
          if (!cam) return;

          stopAuto(cam, hf);

          const viewName = axisToViewName(axis);
          const idx = viewName != null ? resolvePresetIndexByName(viewName) : null;

          if (idx != null && typeof cam.setViewPreset === 'function') {
            applyViewPresetIndex(cam, hub, idx);
          } else if (typeof cam.snapToAxis === 'function') {
            cam.snapToAxis(axis);
          }
        },
      });
    };

    mkAxis('x', 'X');
    mkAxis('y', 'Y');
    mkAxis('z', 'Z');
  }

  // -----------------------------
  // View row (iso NE/NW/SW/SE)
  // -----------------------------
  const viewRow = getEl('gizmoViewRow') || null;
  if (viewRow) {
    clearChildren(viewRow);

    const PRESETS = [
      { name: 'iso-ne', label: 'NE' },
      { name: 'iso-nw', label: 'NW' },
      { name: 'iso-sw', label: 'SW' },
      { name: 'iso-se', label: 'SE' },
    ];

    PRESETS.forEach(({ name, label }) => {
      createBtn(viewRow, {
        label,
        title: `View preset: ${name}`,
        className: 'keycap gizmo-view-btn',
        onClick: (ev) => {
          ev.preventDefault?.();
          const cam = camOf();
          if (!cam) return;

          stopAuto(cam, hf);

          const idx = resolvePresetIndexByName(name);
          if (idx != null && typeof cam.setViewPreset === 'function') {
            applyViewPresetIndex(cam, hub, idx);
            return;
          }

          // legacy fallback（残すなら）
          if (typeof cam.setViewByName === 'function') cam.setViewByName(name);
        },
      });
    });
  }

  return {
    detach() {
      for (let i = cleanup.length - 1; i >= 0; i--) {
        try {
          cleanup[i]();
        } catch (_e) {}
      }
      cleanup.length = 0;

      for (let i = created.length - 1; i >= 0; i--) {
        try {
          created[i]?.remove?.();
        } catch (_e) {}
      }
      created.length = 0;
    },
    dispose() {
      this.detach();
    },
  };
}
