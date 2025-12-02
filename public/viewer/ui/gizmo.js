// viewer/ui/gizmo.js

import * as THREE from "../../vendor/three/build/three.module.js";

// 軸カラー設定
//   XY 平面 (Z 軸) = 赤 : existence (上下)
//   YZ 平面 (X 軸) = 青 : quality (左右)
//   ZX 平面 (Y 軸) = 緑 : time   (前後)
const COLOR_AXIS_X = 0x5588ff; // X / YZ plane → blue
const COLOR_AXIS_Y = 0x55ff55; // Y / ZX plane → green
const COLOR_AXIS_Z = 0xff5555; // Z / XY plane → red

// メインカメラ state から「向き」だけをもらって、
// 原点まわりの小さい「リング型 gizmo」を描画するミニ・ビューポート
export function attachGizmo(wrapper, hub) {
  if (!wrapper) return;

  // いったん中身クリア
  while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

  // キャンバス作成
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  // gizmo をドラッグしてカメラ回転させるので pointer 有効
  canvas.style.pointerEvents = "auto";

  wrapper.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0); // 透明
  renderer.autoClear = true;

  // ★ 第1象限用のローカルクリッピングを有効化
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  // viewer 全体と同じく Z-up
  camera.up.set(0, 0, 1);

  // ------------------------------------------------------------
  // ジャイロ風 gizmo 本体（リング 3 本 + 中心球 + Z 軸シャフト）
  //  - 各リングは「断面の円」をその平面法線の +/− で二分して着色
  // ------------------------------------------------------------

  const gyroGroup = new THREE.Group();

  // snap 用：どのメッシュがどの軸かを覚えておく
  const clickableRingMeshes = [];

  const ringRadius = 1.2;
  const ringTube   = 0.12;
  const ringRadialSegments  = 18;
  const ringTubularSegments = 64;

  // 軸ごとにリングを作る
  //  - geometry は軸の法線に合わせて回転
  //  - 頂点 position の「その軸の成分」が + か − かで色を変える
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
    const bright = baseColor.clone();                 // ＋側
    const dark   = baseColor.clone().multiplyScalar(0.3); // −側は暗く

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

    geom.setAttribute(
      "color",
      new THREE.BufferAttribute(colorArray, 3)
    );

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.75,
      roughness: 0.3,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.axis = axis;       // snap 用
    clickableRingMeshes.push(mesh);  // raycast 用
    gyroGroup.add(mesh);
    return mesh;
  }

  // 各軸リング生成（平面意味づけに合わせた色）
  const ringX = createAxisRing("x", COLOR_AXIS_X); // YZ 平面 = 青
  const ringY = createAxisRing("y", COLOR_AXIS_Y); // ZX 平面 = 緑
  const ringZ = createAxisRing("z", COLOR_AXIS_Z); // XY 平面 = 赤

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
  // 第1象限を示す 3 枚の 1/4 円サーフェス（XY, XZ, YZ 面）
  // ------------------------------------------------------------

  // リングの内側に少しだけ収まる半径
  const patchRadius = ringRadius - ringTube * 0.6;

  // XY 平面の +X +Y 側 1/4 円
  const patchGeom = new THREE.CircleGeometry(
    patchRadius,
    48,             // 分割数
    0,              // startAngle
    Math.PI / 2     // thetaLength = 90°
  );

  const basePatchMat = new THREE.MeshStandardMaterial({
    color: 0xffff99,        // ほんのり黄
    emissive: 0x332200,
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false,      // gizmo のリングを邪魔しないように
  });

  // z = 0 平面（XY 面）: +X +Y
  const patchXY = new THREE.Mesh(patchGeom, basePatchMat);
  // rotation ゼロのままで OK（法線 +Z）
  gyroGroup.add(patchXY);

  // y = 0 平面（XZ 面）: +X +Z
  const patchXZ = new THREE.Mesh(patchGeom, basePatchMat.clone());
  patchXZ.rotation.x = Math.PI / 2; // XY 面を XZ 面に倒す（法線 +Y）
  gyroGroup.add(patchXZ);

  // x = 0 平面（YZ 面）: +Y +Z
  const patchYZ = new THREE.Mesh(patchGeom, basePatchMat.clone());
  patchYZ.rotation.y =  -Math.PI / 2; // XY 面を YZ 面に回す（法線 +X）
  gyroGroup.add(patchYZ);

  // ------------------------------------------------------------
  // Z 軸シャフト（リングを上下に突き抜ける黒寄りシルバー）
  // ------------------------------------------------------------
  const rodRadius = 0.32;
  const rodLength = ringRadius * 2.8;
  const rodGeom = new THREE.CylinderGeometry(
    rodRadius,
    rodRadius,
    rodLength,
    32
  );
  const rodMat = new THREE.MeshStandardMaterial({
    color: 0x777777,
    metalness: 0.95,
    roughness: 0.35,
  });
  const zRod = new THREE.Mesh(rodGeom, rodMat);
  zRod.rotation.x = Math.PI / 2;
  gyroGroup.add(zRod);

// ------------------------------------------------------------
// 軸端ラベル "x+","y+","z+"（ビルボードせずローカル固定）
// ------------------------------------------------------------
function createAxisLabel(text, axisColorHex, dirVec3, options = {}) {
  const {
    // 原点→ラベル中心の距離スケール（ringRadius * labelRadiusScale）
    labelRadiusScale = 1.4,
    // ラベル平面内での回転量（ラジアン, CW/CCW 調整用）
    rotateInPlaneRad = 0,
    // ラベルの向いている方向を 180° 反転させるか（裏表ひっくり返し）
    flipFacing = false,
    // lookAt 後に X 軸回りに足すチルト量（ラジアン）
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

  // 原点から dirVec3 方向に ringRadius * labelRadiusScale だけオフセット
  const pos = dirVec3.clone().setLength(ringRadius * labelRadiusScale);
  mesh.position.copy(pos);

  // まずラベルの法線を軸の + 方向へ向ける
  mesh.lookAt(dirVec3.clone().multiplyScalar(2));

  // 必要なら裏表を反転
  if (flipFacing) {
    mesh.rotateY(Math.PI);
  }

  // X 軸回りの追加チルト
  if (tiltXRadians !== 0) {
    mesh.rotateX(tiltXRadians);
  }

  // 平面内の微調整回転（CW/CCW）
  if (rotateInPlaneRad !== 0) {
    mesh.rotateZ(rotateInPlaneRad);
  }

  gyroGroup.add(mesh);
}

// 既存リングの色に合わせてラベル作成

// X+: 少し内側寄せ（labelRadiusScale 小さめ）＋ CW90° 回転
createAxisLabel("x+", COLOR_AXIS_X, new THREE.Vector3(0.9, 0, 0), {
  labelRadiusScale: 1.2,          // リング外周ぎりぎりくらい
  rotateInPlaneRad: Math.PI / 2,  // CW 90°
});

// Y+: 少し内側寄せ ＋ 上下反転
createAxisLabel("y+", COLOR_AXIS_Y, new THREE.Vector3(0, 0.9, 0), {
  labelRadiusScale: 1.2,
  rotateInPlaneRad: Math.PI,      // 180° 回転
});

// Z+: ちょい外側寄せ ＋ X 軸回りに −90° チルト
createAxisLabel("z+", COLOR_AXIS_Z, new THREE.Vector3(0, 0, 0.5), {
  labelRadiusScale: 1.5,
  tiltXRadians: -Math.PI / 2,
  // rotateInPlaneRad: 0, // 特になし
});

  
  // 枠から少し余白が出るように全体を縮小
  const GIZMO_SCALE = 0.7; // 0.7〜0.9 くらいで好みに調整
  gyroGroup.scale.set(GIZMO_SCALE, GIZMO_SCALE, GIZMO_SCALE);
  scene.add(gyroGroup);

  // ライティング（上下感の演出はそのまま流用して OK）
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
  // サイズ調整（wrapper の大きさに追従）
  // ------------------------------------------------------------
  function resizeIfNeeded() {
    const rect = wrapper.getBoundingClientRect();
    const size = Math.max(32, Math.min(rect.width || 100, rect.height || 100));
    const dpr = window.devicePixelRatio || 1;

    const w = Math.round(size * dpr);
    const h = Math.round(size * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      renderer.setSize(w, h, false);

      camera.aspect = 1; // 正方形固定
      camera.updateProjectionMatrix();
    }
  }

  // ------------------------------------------------------------
  // メインカメラの state からミニカメラ姿勢を計算
  // ------------------------------------------------------------
  const vPos = new THREE.Vector3();

  function syncCameraFromHub() {
    if (
      !hub ||
      !hub.core ||
      !hub.core.camera ||
      typeof hub.core.camera.getState !== "function"
    ) {
      // hub がまだならデフォルト姿勢
      camera.position.set(3, 3, 3);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0);
      return;
    }

    const state = hub.core.camera.getState();
    if (!state) return;

    // CameraEngine の state: { theta, phi, distance, target, fov }
    const theta =
      typeof state.theta === "number" ? state.theta : 0;
    const phi =
      typeof state.phi === "number" ? state.phi : Math.PI / 2;

    // 距離は gizmo 上では適当な固定値で OK（向きだけ使いたい）
    const distance = 4;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Z-up の球座標:
    // φ: +Z からの極角 [0,π]
    // θ: XY 平面での方位角
    vPos.set(
      distance * sinPhi * cosTheta, // X
      distance * sinPhi * sinTheta, // Y
      distance * cosPhi             // Z
    );

    camera.position.copy(vPos);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    if (typeof state.fov === "number") {
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    }
  }

  // ------------------------------------------------------------
  // gizmo ドラッグ → カメラ回転 ＋ クリック → snapToAxis
  // ------------------------------------------------------------
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragDistSq = 0;

  function snapCameraByRing(ev) {
    if (!hub || !hub.core || !hub.core.camera) return;
    const cam = hub.core.camera;
    if (typeof cam.snapToAxis !== "function") return;

    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);

    const hits = raycaster.intersectObjects(clickableRingMeshes, false);
    if (!hits.length) return;

    const hit = hits[0].object;
    const axis = hit && hit.userData && hit.userData.axis;
    if (!axis) return;

    cam.snapToAxis(axis);
    if (window && window.console) {
      console.log("[gizmo] ring clicked → snapToAxis", axis);
    }
  }

  function handlePointerDown(ev) {
    // 左クリックだけ受ける
    if (ev.button !== 0) return;
    if (!hub || !hub.core || !hub.core.camera) return;

    isDragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    dragDistSq = 0;

    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch (_) {
      // 古いブラウザ用に黙殺
    }
    ev.preventDefault();
  }

  function handlePointerMove(ev) {
    if (!isDragging) return;
    if (!hub || !hub.core || !hub.core.camera) return;

    const cam = hub.core.camera;
    if (typeof cam.rotate !== "function") return;

    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    dragDistSq += dx * dx + dy * dy;

    // 画面座標 → ラジアン換算
    const SENS_THETA = 0.01; // 水平回転
    const SENS_PHI   = 0.01; // 垂直回転

    // メインビューと同じ感覚:
    //  - 右ドラッグ → 右回転（theta +）
    //  - 上ドラッグ → 上向きにチルト（phi -）
    cam.rotate(dx * SENS_THETA, -dy * SENS_PHI);

    ev.preventDefault();
  }

  function handlePointerUp(ev) {
    if (!isDragging) return;

    // ほとんど動いていなければ「クリック」とみなして軸スナップ
    const CLICK_THRESH_SQ = 36; // ≒ 6px
    if (dragDistSq <= CLICK_THRESH_SQ && ev.type === "pointerup") {
      snapCameraByRing(ev);
    }

    isDragging = false;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch (_) {}
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
  function loop() {
    try {
      resizeIfNeeded();
      syncCameraFromHub();
      renderer.render(scene, camera);
    } catch (e) {
      console.warn("[gizmo] loop error", e);
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
