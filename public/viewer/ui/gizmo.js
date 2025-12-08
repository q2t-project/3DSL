// viewer/ui/gizmo.js

import * as THREE from "../../vendor/three/build/three.module.js";
import {
   CAMERA_VIEW_DEFS,
   CAMERA_VIEW_ALIASES,
   CAMERA_VIEW_PRESET_SEQUENCE,
   CAMERA_VIEW_PRESET_COUNT,
 } from "../runtime/core/cameraViewDefs.js";

// 軸カラー設定
//   XY 平面 (Z 軸) = 赤 : existence (上下)
//   YZ 平面 (X 軸) = 青 : quality (左右)
//   ZX 平面 (Y 軸) = 緑 : time   (前後)
const COLOR_AXIS_X = 0x5588ff; // X / YZ plane → blue
const COLOR_AXIS_Y = 0x55ff55; // Y / ZX plane → green
const COLOR_AXIS_Z = 0xff5555; // Z / XY plane → red;

// 軸 → view 名ヘルパ（上のほうに置くとスッキリ）
function axisToViewName(axis) {
  switch (axis) {
    case "x":
      return "x+";
    case "y":
      return "y+";
    case "z":
      return "z+";
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
  if (
    CAMERA_VIEW_ALIASES &&
    Object.prototype.hasOwnProperty.call(CAMERA_VIEW_ALIASES, raw)
  ) {
    key = CAMERA_VIEW_ALIASES[raw];
  }

  if (
    !CAMERA_VIEW_DEFS ||
    !Object.prototype.hasOwnProperty.call(CAMERA_VIEW_DEFS, key)
  ) {
    return null;
  }

  return key;
}

// name → preset index（0〜N-1）
function resolvePresetIndexByName(name) {
  const key = resolvePresetKey(name);
  if (!key) return null;

  if (
    !Array.isArray(CAMERA_VIEW_PRESET_SEQUENCE) ||
    !CAMERA_VIEW_PRESET_COUNT
  ) {
    return null;
  }

  const idx = CAMERA_VIEW_PRESET_SEQUENCE.indexOf(key);
  return idx >= 0 ? idx : null;
}

// setViewPreset(index) ＋ uiState.view_preset_index 同期
function applyViewPresetIndex(cam, uiState, index) {
  if (!cam || typeof cam.setViewPreset !== "function") return;
  if (index == null) return;

  const i = Number(index);
  if (!Number.isFinite(i)) return;

  cam.setViewPreset(i);

  if (uiState) {
    const resolved =
      typeof cam.getViewPresetIndex === "function"
        ? cam.getViewPresetIndex()
        : i;
    uiState.view_preset_index = resolved;
  }
}

// メインカメラ state から「向き」だけをもらって、
// 原点まわりの小さい「リング型 gizmo」を描画するミニ・ビューポート
export function attachGizmo(wrapper, hub) {
  if (!wrapper) return null;

  // 二重 attach 対策で一回中身クリアしとく
  wrapper.innerHTML = "";

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.pointerEvents = "auto";
  wrapper.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });

  // ★ dispose 用フラグと rAF ハンドル
  let isDisposed = false;
  let rafId = null;

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
  const ringRadialSegments = 16;
  const ringTubularSegments = 48;

  const CAM_DISTANCE = ringRadius * 1.3; // カメラ中心と原点の距離
  const LENS_OFFSET = 0.18;              // カメラローカル原点→レンズ中心の距離（-Z 方向）

  const clickableRingMeshes = [];
  const clickablePresetMeshes = [];
  const presetBeams = []; // アイソメ4方だけ登録する
  const presetGroupsById = Object.create(null);
  let activePresetId = null;

  // ------------------------------------------------------------
  // 7 ビュー定義: 3 軸 (+X,+Y,+Z) + アイソメ 4 方
  // 角度(theta,phi)は CAMERA_VIEW_DEFS から取得して一元管理
  // ------------------------------------------------------------

  const RAW_PRESET_DEFS = [
    // 軸 3 面
    { id: "x+", label: "X+", kind: "axis", uiPos: "right" },
    { id: "y+", label: "Y+", kind: "axis", uiPos: "top" },
    { id: "z+", label: "Z+", kind: "axis", uiPos: "top" },

    // アイソメ 4 方（NE / NW / SW / SE）
    { id: "iso-ne", label: "ISO NE", kind: "iso", uiPos: "ne" },
    { id: "iso-nw", label: "ISO NW", kind: "iso", uiPos: "nw" },
    { id: "iso-sw", label: "ISO SW", kind: "iso", uiPos: "sw" },
    { id: "iso-se", label: "ISO SE", kind: "iso", uiPos: "se" },
  ];

  const PRESET_DEFS = RAW_PRESET_DEFS.map((def) => {
    const view = CAMERA_VIEW_DEFS[def.id];
    return {
      ...def,
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
      case "x":
        // YZ 平面（法線 +X）
        geom.rotateY(Math.PI / 2);
        break;
      case "y":
        // ZX 平面（法線 +Y）
        geom.rotateX(Math.PI / 2);
        break;
      case "z":
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
      if (axis === "x") coord = x;
      else if (axis === "y") coord = y;
      else coord = z; // "z"

      const c = coord >= 0 ? bright : dark;

      colorArray[i * 3 + 0] = c.r;
      colorArray[i * 3 + 1] = c.g;
      colorArray[i * 3 + 2] = c.b;
    }

    geom.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.75,
      roughness: 0.3,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.axis = axis; // snap 用
    clickableRingMeshes.push(mesh); // raycast 用
    gyroGroup.add(mesh);
    return mesh;
  }

  // 各軸リング生成
  createAxisRing("x", COLOR_AXIS_X); // YZ 平面 = 青
  createAxisRing("y", COLOR_AXIS_Y); // ZX 平面 = 緑
  createAxisRing("z", COLOR_AXIS_Z); // XY 平面 = 赤

  // 中心の小さなメタル球
  const centerSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.5,
      roughness: 0.5,
    })
  );
  gyroGroup.add(centerSphere);

  // ------------------------------------------------------------
  // 第1象限サーフェス
  // ------------------------------------------------------------
  const patchRadius = ringRadius - ringTube * 0.6;
  const patchGeom = new THREE.CircleGeometry(
    patchRadius,
    48,
    0,
    Math.PI / 2 // 90°
  );

  const basePatchMat = new THREE.MeshStandardMaterial({
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
  const rodGeom = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, 32);
  const rodMat = new THREE.MeshStandardMaterial({
    color: 0xb8c8ff,
    metalness: 0.9,
    roughness: 0.35,
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
    const canvasLabel = document.createElement("canvas");
    canvasLabel.width = size;
    canvasLabel.height = size / 2;

    const ctx = canvasLabel.getContext("2d");
    ctx.clearRect(0, 0, canvasLabel.width, canvasLabel.height);

    const basePx = 48;
    ctx.font =
      "italic 600 " +
      basePx +
      "px " +
      "'Cambria Math', 'Cambria', 'Times New Roman', serif";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvasLabel.width, canvasLabel.height);

    const colorStr = "#" + axisColorHex.toString(16).padStart(6, "0");
    ctx.strokeStyle = colorStr;
    ctx.fillStyle = "#ffffff";
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

  createAxisLabel("x+", COLOR_AXIS_X, new THREE.Vector3(0.9, 0, 0), {
    labelRadiusScale: 1.2,
    rotateInPlaneRad: Math.PI / 2,
  });

  createAxisLabel("y+", COLOR_AXIS_Y, new THREE.Vector3(0, 0.9, 0), {
    labelRadiusScale: 1.2,
    rotateInPlaneRad: Math.PI,
  });

  createAxisLabel("z+", COLOR_AXIS_Z, new THREE.Vector3(0, 0, 0.5), {
    labelRadiusScale: 1.5,
    tiltXRadians: -Math.PI / 2,
  });

  // ------------------------------------------------------------
  // 7 ビュー用ミニカメラ（3D メッシュ）＋ビーム
  // ------------------------------------------------------------
  const camBodyGeo = new THREE.BoxGeometry(0.36, 0.2, 0.26);
  const camBodyMat = new THREE.MeshStandardMaterial({
    color: 0x999999, // グレー筐体
    metalness: 0.3,
    roughness: 0.6,
  });

  const lensGeo = new THREE.CircleGeometry(0.09, 32);
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x99c0ff,
    emissive: 0x3355ff,
    metalness: 0.6,
    roughness: 0.1,
  });

  const beamRadius = 0.03;

  const beamMatBase = new THREE.MeshStandardMaterial({
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
    if (def.kind === "iso") {
      const beamLength = CAM_DISTANCE - LENS_OFFSET; // レンズ中心〜原点
      const beamGeom = new THREE.CylinderGeometry(
        beamRadius,
        beamRadius,
        beamLength,
        16
      );

      const beam = new THREE.Mesh(beamGeom, beamMatBase.clone());

      // Cylinder は Y 軸方向に伸びるので、Z 軸に合わせる
      beam.rotation.x = Math.PI / 2;

      // レンズ(z = -LENS_OFFSET) と 原点(z = -CAM_DISTANCE) の中点に置く
      const beamCenterZ = -(CAM_DISTANCE + LENS_OFFSET) / 2;
      beam.position.set(0, 0, beamCenterZ);

      group.add(beam);
      presetBeams.push({ id: def.id, mesh: beam });
    }

    group.userData.presetId = def.id;
    gyroGroup.add(group);

    clickablePresetMeshes.push(group);
    presetGroupsById[def.id] = group;
  }

  PRESET_DEFS.forEach(createPresetCamera);

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
  const presetToggleBtn = document.getElementById("gizmo-presets-toggle");
  let presetsVisible = false;

  function updatePresetVisibility() {
    clickablePresetMeshes.forEach((g) => {
      g.visible = presetsVisible;
    });

    if (presetToggleBtn) {
      presetToggleBtn.setAttribute(
        "aria-pressed",
        presetsVisible ? "true" : "false"
      );
    }
  }

  // ★ リスナを外せるように名前付き関数に
  function handlePresetToggle(ev) {
    if (isDisposed) return;
    ev.preventDefault();
    presetsVisible = !presetsVisible;
    updatePresetVisibility();
  }

  if (presetToggleBtn) {
    presetToggleBtn.addEventListener("click", handlePresetToggle);
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
      const dTheta = Math.atan2(
        Math.sin(theta - def.theta),
        Math.cos(theta - def.theta)
      );
      const dPhi = phi - def.phi;
      const score = dTheta * dTheta + dPhi * dPhi;
      if (score < bestScore) {
        bestScore = score;
        bestId = def.id;
      }
    });

    return bestScore < ACTIVE_PRESET_MAX_ERR ? bestId : null;
  }

  // ------------------------------------------------------------
  // プリセット適用 → CameraEngine 側へ通知
  // ------------------------------------------------------------
  function applyPresetById(id) {
    if (!hub?.core?.camera) return;

    const cam = hub.core.camera;
    const uiState = hub.core.uiState;

   const index = resolvePresetIndexByName(id);
    if (index == null) return;

    // AutoOrbit 中なら先に止める（キーボードと揃える）
    if (typeof cam.stopAutoOrbit === "function") {
      cam.stopAutoOrbit();
    }
    if (uiState?.runtime) {
      uiState.runtime.isCameraAuto = false;
    }

    applyViewPresetIndex(cam, uiState, index);

    // beams / スケール制御用
    activePresetId = resolvePresetKey(id);
  }

  // ------------------------------------------------------------
  // アクティブビューに応じたビーム演出（アイソメだけ点滅）
  // ------------------------------------------------------------
  function updatePresetBeams(timeSec) {
    presetBeams.forEach(({ id, mesh }) => {
      const mat = mesh.material;
      if (!mat) return;

      if (!presetsVisible || !activePresetId || id !== activePresetId) {
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
  function resizeIfNeeded() {
    const rect = wrapper.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // 枠の中で正方形を確保（末広がり前提なので最小辺）
    const logicalSize = Math.max(
      32,
      Math.min(rect.width, rect.height)
    );

    const dpr = window.devicePixelRatio || 1;

    // CSS 上の表示サイズ（px）
    const displaySize = Math.round(logicalSize);

    // 実ピクセルは DPR でスケール
    const renderSize = Math.round(logicalSize * dpr);

    // 既に同じなら何もしない
    if (canvas.width === renderSize && canvas.height === renderSize) return;

    // DOM（見た目）は displaySize の正方形に固定
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;

    // 描画バッファは DPR 倍の正方形
    canvas.width = renderSize;
    canvas.height = renderSize;

    renderer.setPixelRatio(dpr);
    renderer.setSize(renderSize, renderSize, false);

    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------
  // メインカメラ state → ミニカメラ姿勢
  // ------------------------------------------------------------
  const vPos = new THREE.Vector3();

  function syncCameraFromHub() {
    if (
      !hub ||
      !hub.core ||
      !hub.core.camera ||
      typeof hub.core.camera.getState !== "function"
    ) {
      camera.position.set(3, 3, 3);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0);
      return;
    }

    const state = hub.core.camera.getState();
    if (!state) return;

    const theta = typeof state.theta === "number" ? state.theta : 0;
    const phi = typeof state.phi === "number" ? state.phi : Math.PI / 2;
    const distance = 4;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    vPos.set(
      distance * sinPhi * cosTheta,
      distance * sinPhi * sinTheta,
      distance * cosPhi
    );

    camera.position.copy(vPos);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    if (typeof state.fov === "number") {
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    }

    // まず CameraEngine 側の preset index を優先
    let presetKey = null;
    const cam = hub.core.camera;
    if (
      cam &&
      typeof cam.getViewPresetIndex === "function" &&
      Array.isArray(CAMERA_VIEW_PRESET_SEQUENCE)
    ) {
      const idx = cam.getViewPresetIndex();
      if (
        typeof idx === "number" &&
        idx >= 0 &&
        idx < CAMERA_VIEW_PRESET_SEQUENCE.length
      ) {
        presetKey = CAMERA_VIEW_PRESET_SEQUENCE[idx];
      }
    }

    // 取れなかったときだけ角度から最近傍を推定
    activePresetId = presetKey || findNearestPreset(theta, phi);

    // 視点に合わせてプリセットカメラの見た目を更新
    Object.entries(presetGroupsById).forEach(([id, group]) => {
      if (!group) return;
      const s = id === activePresetId ? 1.1 : 1.0;
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
    if (!hub || !hub.core || !hub.core.camera) return;

    // gizmo ドラッグ開始 = 手動操作 → AutoOrbit 停止
    const cam = hub.core.camera;
    if (cam && typeof cam.stopAutoOrbit === "function") {
      cam.stopAutoOrbit();
    }

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
    if (!hub || !hub.core || !hub.core.camera) return;

    const cam = hub.core.camera;
    if (typeof cam.rotate !== "function") return;

    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    dragDistSq += dx * dx + dy * dy;

    const SENS_THETA = 0.01;
    const SENS_PHI = 0.01;

    cam.rotate(dx * SENS_THETA, -dy * SENS_PHI);

    ev.preventDefault();
  }

  function handleGizmoClick(ev) {
    if (isDisposed) return;
    if (!hub || !hub.core || !hub.core.camera) return;

    const cam = hub.core.camera;
    if (cam && typeof cam.stopAutoOrbit === "function") {
      cam.stopAutoOrbit();
    }

    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ndc.set(x, y);

    raycaster.setFromCamera(ndc, camera);

    // まずリング（軸スナップ）
    const ringHit = raycaster.intersectObjects(clickableRingMeshes, false)[0];
    if (ringHit && ringHit.object && hub.core.camera) {
      const cam = hub.core.camera;

      const axis = ringHit.object.userData.axis; // "x" / "y" / "z"
      const uiState = hub.core.uiState;

      const viewName = axisToViewName(axis);
      const index =
        viewName != null ? resolvePresetIndexByName(viewName) : null;

      if (index != null && typeof cam.setViewPreset === "function") {
        applyViewPresetIndex(cam, uiState, index);
      } else if (axis && typeof cam.snapToAxis === "function") {
        cam.snapToAxis(axis); // フォールバック
      }
      return;
    }

    // 次に 7 ビューカメラ
    if (presetsVisible) {
      const presetHit = raycaster.intersectObjects(
        clickablePresetMeshes,
        true
      )[0];
      if (presetHit && presetHit.object && presetHit.object.parent) {
        const g = presetHit.object.parent;
        const id = g.userData.presetId;
        if (id) {
          applyPresetById(id);
        }
      }
    }
  }

  function handlePointerUp(ev) {
    if (isDisposed) return;
    if (!isDragging) return;

    const CLICK_THRESH_SQ = 36;
    const clicked = dragDistSq <= CLICK_THRESH_SQ && ev.type === "pointerup";

    isDragging = false;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch (_) {}

    if (clicked) {
      handleGizmoClick(ev);
    }

    ev.preventDefault();
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);

  // ------------------------------------------------------------
  // ループ: サイズ調整 → カメラ同期 → レンダ
  // ------------------------------------------------------------
  function loop(now) {
    if (isDisposed) return;

    try {
      resizeIfNeeded();
      syncCameraFromHub();
      updatePresetBeams(now * 0.001);
      renderer.render(scene, camera);
    } catch (e) {
      console.warn("[gizmo] loop error", e);
    }

    rafId = requestAnimationFrame(loop);  // ★ id を保持
  }

  rafId = requestAnimationFrame(loop);    // ★ 初回キック

  // ------------------------------------------------------------
  // dispose ハンドルを返す
  // ------------------------------------------------------------
  function dispose() {
    if (isDisposed) return;
    isDisposed = true;

    // rAF 停止
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // イベントリスナ解除
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
    canvas.removeEventListener("pointerleave", handlePointerUp);

    if (presetToggleBtn) {
      presetToggleBtn.removeEventListener("click", handlePresetToggle);
    }

    // three.js リソース破棄
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj.geometry && typeof obj.geometry.dispose === "function") {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m && m.dispose && m.dispose());
        } else if (typeof obj.material.dispose === "function") {
          obj.material.dispose();
        }
      }
    });

    if (typeof renderer.forceContextLoss === "function") {
      renderer.forceContextLoss();
    }

    // DOM から取り外し
    if (canvas.parentElement === wrapper) {
      wrapper.removeChild(canvas);
    }
    wrapper.innerHTML = ""; // 念のため
  }

  return { dispose };                  // ★ ハンドル返却
}

// ------------------------------------------------------------
// HUD 側 gizmo ボタン初期化
//   - data-view-preset="front" / "top" / "right" / "iso-ne" ...
//   - data-axis-snap="x" / "y" / "z"
// ------------------------------------------------------------
export function initGizmoButtons(hub) {
  if (!hub || !hub.core || !hub.core.camera) {
    console.warn("[viewer-dev gizmo] initGizmoButtons: camera not ready");
    return;
  }

  const cam = hub.core.camera;
  console.log("[viewer-dev gizmo] initGizmoButtons start", cam);

  const root = document;

  // 例: <button data-view-preset="front">FRONT</button>
  const viewButtons = root.querySelectorAll("[data-view-preset]");
  viewButtons.forEach((btn) => {
    const name = btn.dataset.viewPreset;
    if (!name) return;

    btn.addEventListener("click", (ev) => {
      ev.preventDefault();

      if (typeof cam.stopAutoOrbit === "function") {
        cam.stopAutoOrbit();
      }

      const uiState = hub.core && hub.core.uiState;
      const idx = resolvePresetIndexByName(name);

      if (idx != null && typeof cam.setViewPreset === "function") {
        applyViewPresetIndex(cam, uiState, idx);
      } else if (typeof cam.setViewByName === "function") {
        // 古い実装用フォールバック
        cam.setViewByName(name);
      } else if (
        CAMERA_VIEW_DEFS &&
        Object.prototype.hasOwnProperty.call(CAMERA_VIEW_DEFS, name) &&
        typeof cam.setState === "function"
      ) {
        // さらに古い実装用の最後の保険
        const def = CAMERA_VIEW_DEFS[name];
        const cur =
          typeof cam.getState === "function" ? cam.getState() : {};
        cam.setState({
          ...cur,
          theta: def.theta,
          phi: def.phi,
        });
      }
    });
  });

  // 例: <button data-axis-snap="z">Z</button>
  const axisButtons = root.querySelectorAll("[data-axis-snap]");
  axisButtons.forEach((btn) => {
    const axis = btn.dataset.axisSnap; // "x" / "y" / "z"
    if (!axis) return;

    btn.addEventListener("click", (ev) => {
      ev.preventDefault();

      if (typeof cam.stopAutoOrbit === "function") {
        cam.stopAutoOrbit();
      }
        const uiState = hub.core && hub.core.uiState;
        const viewName = axisToViewName(axis);
        const idx =
          viewName != null ? resolvePresetIndexByName(viewName) : null;

        if (idx != null && typeof cam.setViewPreset === "function") {
          applyViewPresetIndex(cam, uiState, idx);
        } else if (typeof cam.snapToAxis === "function") {
          // 古い CameraEngine 実装用に一応残す
        cam.snapToAxis(axis);
      }
    });
  });
}
