// =============================================================
// viewer/runtime/renderer/viewerRenderer.js
// three.js ベースの描画ハブ
//
//  - scene / camera / renderer の唯一の入口
//  - 各レイヤ描画（points / lines / aux / gizmo / effects…）の呼び出し元
//  - state.js から渡される "state" を内部保持してレンダラに配布
// =============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";

// three.js コンテキスト
let renderer = null;
let scene = null;
let camera = null;

// ピッキング用 Raycaster（selection 用）
const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

// uuid → Object3D の対応表（viewerHub / CameraEngine 用）
// 実際の登録は drawPoints / drawLines / drawAux 側で行う想定。
export const objectByUUID = new Map();

// シーン全体の境界（必要に応じてキャッシュ）
let sceneBounds = null;

// viewerRenderer 全体の core（canvas / renderer / scene / camera / objectByUUID）
// init() 完了時にセットされる
let _core = null;

// -------------------------------------------------------------
// Focus FX 用内部状態
// -------------------------------------------------------------
const focusState = {
  uuid: null,
  mode: "macro",
};

// 距離計算用テンポラリ
const _focusOrigin = new THREE.Vector3();
const _tmpPos = new THREE.Vector3();

function ensureMaterialBaseProps(mat) {
  const ud = mat.userData || (mat.userData = {});

  if (ud.__baseOpacity == null) {
    ud.__baseOpacity = mat.opacity ?? 1.0;
    ud.__baseTransparent = mat.transparent ?? false;
  }

  if ("emissive" in mat && ud.__baseEmissive == null) {
    // emissive は Color なので clone して退避
    ud.__baseEmissive = mat.emissive.clone();
  }

  if ("emissiveIntensity" in mat && ud.__baseEmissiveIntensity == null) {
    ud.__baseEmissiveIntensity = mat.emissiveIntensity;
  }
}

function restoreMaterial(mat) {
  const ud = mat.userData || {};

  if (ud.__baseOpacity != null) {
    mat.opacity = ud.__baseOpacity;
    mat.transparent = ud.__baseTransparent ?? mat.transparent;
  }

  if ("emissive" in mat && ud.__baseEmissive) {
    mat.emissive.copy(ud.__baseEmissive);
  }

  if ("emissiveIntensity" in mat && ud.__baseEmissiveIntensity != null) {
    mat.emissiveIntensity = ud.__baseEmissiveIntensity;
  }
}

function setMaterialFade(mat, fade) {
  ensureMaterialBaseProps(mat);

  const ud = mat.userData;
  const baseOpacity = ud.__baseOpacity ?? 1.0;

  mat.opacity = baseOpacity * fade;
  mat.transparent = mat.opacity < 1.0 || (ud.__baseTransparent ?? false);
}

function resetFocusFX() {
  for (const obj of objectByUUID.values()) {
    const mats = Array.isArray(obj.material)
      ? obj.material
      : obj.material
      ? [obj.material]
      : [];

    for (const mat of mats) {
      restoreMaterial(mat);
    }
  }

  focusState.uuid = null;
  focusState.mode = "macro";
}

function highlightFocusedObject(obj, mode) {
  const mats = Array.isArray(obj.material)
    ? obj.material
    : obj.material
    ? [obj.material]
    : [];

  for (const mat of mats) {
    ensureMaterialBaseProps(mat);

    if ("emissive" in mat) {
      // ちょっと白寄りに光らせる
      mat.emissive.set(0xffffff);
    }
    if ("emissiveIntensity" in mat) {
      mat.emissiveIntensity =
        mode === "micro"
          ? 1.2
          : mode === "meso"
          ? 0.8
          : mat.userData.__baseEmissiveIntensity ?? mat.emissiveIntensity;
    }
  }
}

// アニメーションループ管理
let animationId = null;

// 外部登録用：レイヤ描画コールバック
//   drawFn(ctx, state)
//   ctx = { scene, camera, renderer, deltaTime, elapsedTime }
const drawLayers = [];

// ============================================
// 追加：現在の state を内部保持
// ============================================
let currentState = null;

// 時間管理（簡易）
let lastTime = 0;
let startTime = 0;

// -------------------------------------------------------------
// init: canvas を受け取って three.js 初期化
// -------------------------------------------------------------
export function init(canvas, options = {}) {
  console.log("[viewerRenderer] init 入ったで");

  if (!canvas) {
    console.error("[viewerRenderer] canvas が null や");
    return null;
  }

  // すでに初期化済みなら既存 core を返す
  if (_core && renderer && scene && camera) {
    console.warn("[viewerRenderer] 二重 init は既存 core を返すで");
    return _core;
  }

  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height);
  renderer.setClearColor(0x050505, 1.0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const fov = options.fov ?? 45;
  const near = options.near ?? 0.1;
  const far = options.far ?? 2000;
  camera = new THREE.PerspectiveCamera(fov, width / height, near, far);

  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 8);
  scene.add(dir);

  window.addEventListener("resize", handleResize);

  lastTime = performance.now();
  startTime = lastTime;

  // viewerRenderer 全体の core を構成して保持
  _core = {
    canvas,
    renderer,
    scene,
    camera,
    objectByUUID,
  };

  console.log("[viewerRenderer] init 完了");
  return _core;
}

// -------------------------------------------------------------
// updateState: viewer.js → viewerRenderer への state 受け取り口
// -------------------------------------------------------------
export function updateState(state) {
  if (!state || typeof state !== "object") {
    console.error("[viewerRenderer] updateState: state が不正や");
    return;
  }

  // immutable data をそのまま保持
  currentState = state;
}

// -------------------------------------------------------------
// registerLayer: レイヤ描画関数を登録
//   drawFn(ctx, state)
// -------------------------------------------------------------
export function registerLayer(drawFn) {
  if (typeof drawFn !== "function") {
    console.warn("[viewerRenderer] registerLayer: function ちゃうやん");
    return;
  }
  drawLayers.push(drawFn);
}

// -------------------------------------------------------------
// renderOnce
// -------------------------------------------------------------
export function renderOnce() {
  if (!renderer || !scene || !camera) return;

  const now = performance.now();
  const deltaTime = (now - lastTime) / 1000;
  const elapsedTime = (now - startTime) / 1000;
  lastTime = now;

  const ctx = { scene, camera, renderer, deltaTime, elapsedTime };

  for (const draw of drawLayers) {
    try {
      draw(ctx, currentState);   // ← state を渡すのはここだけ
    } catch (err) {
      console.error("[viewerRenderer] drawLayer error:", err);
    }
  }

  renderer.render(scene, camera);
}

// -------------------------------------------------------------
// start / stop
// -------------------------------------------------------------
export function start() {
  if (animationId != null) return;

  const loop = () => {
    animationId = requestAnimationFrame(loop);
    renderOnce();
  };

  lastTime = performance.now();
  startTime = lastTime;
  loop();

  console.log("[viewerRenderer] loop start");}

export function stop() {
  if (animationId != null) {
    cancelAnimationFrame(animationId);
    animationId = null;
    console.log("[viewerRenderer] loop stop");
  }
}

// -------------------------------------------------------------
// resize
// -------------------------------------------------------------
export function resize(width, height) {
  if (!renderer || !camera) return;

  const w = width || renderer.domElement.clientWidth || window.innerWidth;
  const h = height || renderer.domElement.clientHeight || window.innerHeight;

  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// -------------------------------------------------------------
function handleResize() {
  resize();
}

// -------------------------------------------------------------
// getContext（CameraEngine / Gizmo3D 用）
// -------------------------------------------------------------
export function getContext() {
  return { scene, camera, renderer };
}

// -------------------------------------------------------------
// rendererContext（viewerHub 用）
// -------------------------------------------------------------
function getBoundingBox() {
  if (!scene) return null;

  // キャッシュが有効ならそのまま返してもよいが、
  // ひとまず毎回計算する。
  const box = new THREE.Box3().setFromObject(scene);
  if (box.isEmpty()) return null;

  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = box.getSize(new THREE.Vector3());
  const radius = size.length() * 0.5;

  sceneBounds = {
    center: [center.x, center.y, center.z],
    radius,
  };
  return sceneBounds;
}

function getElementBounds(uuid) {
  const obj = objectByUUID.get(uuid);
  if (!obj) return null;

  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return null;

  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = box.getSize(new THREE.Vector3());
  const radius = size.length() * 0.5;

  return {
    center: [center.x, center.y, center.z],
    radius,
  };
}

function setElementVisibility({ uuid, visible }) {
  const obj = objectByUUID.get(uuid);
  if (!obj) return;
  obj.visible = !!visible;
}

function clearAllHighlights() {
  for (const obj of objectByUUID.values()) {
    const material = obj.material;
    if (!material) continue;
    if ("emissiveIntensity" in material) {
      material.emissiveIntensity = 0.0;
    }
  }
}

function setHighlight({ uuid, level }) {
  const obj = objectByUUID.get(uuid);
  if (!obj) return;
  const material = obj.material;
  if (!material || !("emissiveIntensity" in material)) return;

  const intensity = level === 2 ? 1.0 : level === 1 ? 0.4 : 0.0;
  material.emissiveIntensity = intensity;
}

function applyFocusFX(payload) {
  // payload = null のときは全解除
  if (!payload) {
    resetFocusFX();
    return;
  }

  const { mode, uuid, origin, settings } = payload;
  const fxSettings = settings?.fx || {};

  // macro モード中は Focus FX を使わない
  if (mode === "macro") {
    resetFocusFX();
    return;
  }

  // micro/meso が無効なら何もしない（ただし過去効果は解除）
  if (
    (mode === "micro" && fxSettings.micro === false) ||
    (mode === "meso" && fxSettings.meso === false)
  ) {
    resetFocusFX();
    return;
  }

  if (!uuid || !Array.isArray(origin) || origin.length < 3) {
    resetFocusFX();
    return;
  }

  // いったん前の効果をリセット
  resetFocusFX();

  focusState.uuid = uuid;
  focusState.mode = mode;

  _focusOrigin.set(origin[0], origin[1], origin[2]);

  // シーンのスケールに応じてフェード距離を決める
  const baseRadius = sceneBounds?.radius ?? 10.0;
  const maxDist =
    baseRadius * (mode === "micro" ? 0.8 : 1.2); // micro の方が狭く強く

  // 最低不透明度（遠くの要素）
  const minOpacity = mode === "micro" ? 0.1 : 0.3;

  // まずフォーカス対象をハイライト
  const focusObj = objectByUUID.get(uuid);
  if (focusObj) {
    highlightFocusedObject(focusObj, mode);
  }

  // 残りを距離に応じてフェード
  for (const [id, obj] of objectByUUID.entries()) {
    if (!obj || id === uuid) continue;

    obj.getWorldPosition(_tmpPos);
    const dist = _tmpPos.distanceTo(_focusOrigin);

    // 0 .. maxDist の範囲を 1..minOpacity にマッピング
    let t = dist / maxDist;
    t = THREE.MathUtils.clamp(t, 0, 1);
    const fade = (1 - t) * (1 - minOpacity) + minOpacity;

    const mats = Array.isArray(obj.material)
      ? obj.material
      : obj.material
      ? [obj.material]
      : [];

    for (const mat of mats) {
      setMaterialFade(mat, fade);
    }
  }
}

// -------------------------------------------------------------
// ピッキングヘルパ
//   - NDC 座標（-1〜+1）を受け取って scene 内で Raycast
//   - 最初にヒットした Object3D から userData.uuid を辿る
//   - uuid が取れなければ null
// -------------------------------------------------------------
function pickObjectAt(ndcX, ndcY) {
  if (!scene || !camera) return null;

  _ndc.set(ndcX, ndcY);
  raycaster.setFromCamera(_ndc, camera);

  // true: 子孫まで再帰
  const intersects = raycaster.intersectObjects(scene.children, true);
  if (!intersects || intersects.length === 0) return null;

  const hit = intersects[0];
  let obj = hit.object;

  // 親方向に遡って uuid を探す
  while (obj) {
    const uuid = obj.userData?.uuid;
    if (uuid) {
      return {
        uuid,
        distance: hit.distance,
        point: [hit.point.x, hit.point.y, hit.point.z],
      };
    }
    obj = obj.parent;
  }

  return null;
}

// 
export function createRendererContext() {
  if (!_core) {
    console.error("[viewerRenderer] createRendererContext: _core 未初期化や");
    return null;
  }

  // ★ ここで別名を付けて TDZ 衝突を避ける
  const {
    canvas,
    renderer: r,
    scene: s,
    camera: c,
    objectByUUID: map,
  } = _core;

  if (!r || !s || !c) {
    console.error("[viewerRenderer] createRendererContext: renderer / scene / camera 不正や");
    return null;
  }

  // viewerHub / CameraEngine / CameraInput から見えるインターフェース
  return {
    // three.js 周り
    domElement: canvas,   // ★ CameraInput 用
    canvas,
    renderer: r,
    scene: s,
    camera: c,
    objectByUUID: map,

    // bounds 系
    getBoundingBox: () => getBoundingBox(),
    getElementBounds: (uuid) => getElementBounds(uuid),

    // 可視状態・ハイライト（viewerHub → CameraEngine → ここ）
    setElementVisibility: (payload) => setElementVisibility(payload),
    setHighlight: (payload) => setHighlight(payload),
    clearAllHighlights: () => clearAllHighlights(),

    // Focus / pick
    applyFocusFX: (payload) => applyFocusFX(payload),
    pickObjectAt: (ndcX, ndcY) => pickObjectAt(ndcX, ndcY),
  };
}