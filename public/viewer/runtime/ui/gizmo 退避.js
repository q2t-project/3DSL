// =============================================================
// viewer/runtime/ui/gizmo.js
// 画面左下付近に出す 3 軸ギズモ（唯一のギズモ）
//
// - three.js の同じ renderer / scene / camera を利用
// - 毎フレーム camera に追従して「左下寄り」に配置（暫定）
// - 軸そのものは「世界軸」を表す（Z+ が絶対上）
//
// HUD 用やから、他の構造(state.points / lines / aux)とは独立。
// =============================================================

import * as THREE from "../../../vendor/three/build/three.module.js";
import { registerLayer, getContext } from "../renderer/viewerRenderer.js";

let gizmoGroup = null;
let initialized = false;

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
let boundPointerHandler = null;

// 使い回し用ベクタ（毎フレーム new しまくらんようにするだけ）
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _center = new THREE.Vector3();
const _offset = new THREE.Vector3();

// -------------------------------------------------------------
// initGizmo: viewerRenderer 初期化後に一回だけ呼ぶ
// viewer.js 側から init 後に叩く想定
// -------------------------------------------------------------
export function initGizmo() {
  if (initialized) return;

  const { scene, camera, renderer } = getContext();
  if (!scene || !camera) {
    console.error("[gizmo] viewerRenderer のコンテキストが未初期化や");
    return;
  }

  // --- ギズモ本体 Group ---
  gizmoGroup = new THREE.Group();
  gizmoGroup.name = "viewer-gizmo";
  scene.add(gizmoGroup);

  // --- 3 軸矢印をつくる ---
  const axisLength = 0.8;
  const coneSize = 0.16;
  const origin = new THREE.Vector3(0, 0, 0);

  // X+（赤）
  const xArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    origin,
    axisLength,
    0xff5555
  );
  yArrow.userData.gizmoAxis = "y";

  // Y+（緑）
  const yArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    origin,
    axisLength,
    0x55ff55
  );
  // Z+（青）…「絶対上」
  const zArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    origin,
    axisLength,
    0x5555ff
  );

  zArrow.userData.gizmoAxis = "z";

  // 原点にホームボタン的な球体（core.gizmo.homeClick 用）
  const homeGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const homeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const homeMesh = new THREE.Mesh(homeGeo, homeMat);
  homeMesh.userData.gizmoHome = true;

  gizmoGroup.add(xArrow, yArrow, zArrow, homeMesh);

  // 全体を少し小さく
  gizmoGroup.scale.setScalar(0.6);

  // いったん原点に置いとく（後で毎フレーム、画面端に動かす）
  gizmoGroup.position.set(0, 0, 0);

  // -----------------------------------------------------------
  // レイヤとして viewerRenderer に登録
  //   - 毎フレーム camera の前方・左下あたりに gizmo を配置
  //   - gizmo 自体の向きは「世界軸」と同じに固定
  // -----------------------------------------------------------
  registerLayer((ctx) => {
    if (!gizmoGroup) return;

    const { camera } = ctx;

    // camera の「前方向」「右方向」「上方向」をワールド空間で取る
    camera.getWorldDirection(_forward); // カメラが向いてる方向（-Z）
    _forward.normalize();

    _up.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    _right.crossVectors(_up, _forward).normalize();

    // カメラの少し前方に基準点をつくる
    const distance = 4; // カメラからの距離（暫定値）
    _center.copy(camera.position).add(
      _forward.clone().multiplyScalar(distance)
    );

    // そこから「左下」にオフセットして、画面端っぽい位置に寄せる
    //   x: 負方向 = 左
    //   y: 負方向 = 下
    _offset.set(-1.0, -1.0, 0);
    _offset.normalize(); // 方向だけにして
    const strength = 1.3; // どれだけ端に寄せるか（暫定）
    _offset.multiplyScalar(strength);

    const pos = new THREE.Vector3();
    pos
      .copy(_center)
      .addScaledVector(_right, _offset.x)
      .addScaledVector(_up, _offset.y);

    gizmoGroup.position.copy(pos);

    // 向きは「世界軸」と揃える（＝ジャイロ的な“絶対軸”）
    gizmoGroup.quaternion.identity();
  });

  // -----------------------------------------------------------
  // マウス／ポインタイベント → core.gizmo.* への配線
  //   - ArrowHelper / home 球体をレイキャストして判定
  //   - axis: x / y / z → core.gizmo.axisClick(axis)
  //   - home 球体      → core.gizmo.homeClick()
  // -----------------------------------------------------------
  if (renderer && renderer.domElement) {
    boundPointerHandler = (ev) => handlePointerDown(ev, renderer.domElement, camera);
    renderer.domElement.addEventListener("pointerdown", boundPointerHandler);
  }

  initialized = true;
  console.log("[gizmo] init 完了");
}

// -------------------------------------------------------------
// getGizmoObject: 必要なら外から直接触れるようにするため
// -------------------------------------------------------------
export function getGizmoObject() {
  return gizmoGroup;
}

// -------------------------------------------------------------
// イベント処理
// -------------------------------------------------------------
function handlePointerDown(event, domElement, camera) {
  if (!gizmoGroup || !domElement || !camera) return;

  const rect = domElement.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  // スクリーン → NDC
  pointerNDC.x = x * 2 - 1;
  pointerNDC.y = -(y * 2 - 1);

  raycaster.setFromCamera(pointerNDC, camera);

  const intersects = raycaster.intersectObjects(gizmoGroup.children, true);
  if (!intersects.length) return;

  let node = intersects[0].object;
  let axis = null;
  let isHome = false;

  // 当たったオブジェクトから親方向へたどって metadata を探す
  while (node) {
    if (node.userData && node.userData.gizmoAxis) {
      axis = node.userData.gizmoAxis;
      break;
    }
    if (node.userData && node.userData.gizmoHome) {
      isHome = true;
      break;
    }
    node = node.parent;
  }

  // window.core.gizmo.* にだけ触る（他レイヤには触らない）
  const core = window.core;
  if (!core || !core.gizmo) return;

  if (isHome && typeof core.gizmo.homeClick === "function") {
    core.gizmo.homeClick();
    return;
  }

  if (axis && typeof core.gizmo.axisClick === "function") {
    core.gizmo.axisClick(axis);
  }
}