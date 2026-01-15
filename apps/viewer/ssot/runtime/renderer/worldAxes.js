// viewer/runtime/renderer/worldAxes.js
//
// ワールド共通の座標軸（背景用）レイヤ。
// - X = 青, Y = 緑, Z = 赤
// - 原点まわりに ±axisLength まで伸ばしたラインを描く
// - axisLength は「シーン半径 sceneRadius × 3」を基本にする
//
// いまのところカメラ依存の処理は入れず、
// context 側から渡される sceneRadius に応じてだけ伸ばす。

import * as THREE from "/viewer/vendor/three/build/three.module.js";

export function createWorldAxesLayer(scene) {
  const group = new THREE.Group();
  group.name = "world-axes";
  group.renderOrder = -10; // なるべく背景側に描画
  group.visible = false;   // デフォルトは非表示（C キー等で toggle 想定）
  scene.add(group);

  let visible = false;
  let sceneRadius = 1;

  function rebuildLines() {
    group.clear();

    // シーン半径ベースで「ほぼ無限長」に見える程度に伸ばす
    const base = Number.isFinite(sceneRadius) && sceneRadius > 0 ? sceneRadius : 1;
    const axisLength = base * 3.0;

    const origin = new THREE.Vector3(0, 0, 0);

    const makeAxis = (axis) => {
      let dirPos, dirNeg, colorPos, colorNeg;

      switch (axis) {
        case "x":
          dirPos = new THREE.Vector3(1, 0, 0);
          dirNeg = new THREE.Vector3(-1, 0, 0);
          // X: 青
          colorPos = new THREE.Color(0x3366ff); // 明るめ
          colorNeg = new THREE.Color(0x112244); // 暗め
          break;
        case "y":
          dirPos = new THREE.Vector3(0, 1, 0);
          dirNeg = new THREE.Vector3(0, -1, 0);
          // Y: 緑
          colorPos = new THREE.Color(0x33ff66);
          colorNeg = new THREE.Color(0x115533);
          break;
        case "z":
        default:
          dirPos = new THREE.Vector3(0, 0, 1);
          dirNeg = new THREE.Vector3(0, 0, -1);
          // Z: 赤
          colorPos = new THREE.Color(0xff3366);
          colorNeg = new THREE.Color(0x553333);
          break;
      }

      const geomPos = new THREE.BufferGeometry().setFromPoints([
        origin,
        origin.clone().addScaledVector(dirPos, axisLength),
      ]);
      const geomNeg = new THREE.BufferGeometry().setFromPoints([
        origin,
        origin.clone().addScaledVector(dirNeg, axisLength),
      ]);

      const matPos = new THREE.LineBasicMaterial({
        color: colorPos,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const matNeg = new THREE.LineBasicMaterial({
        color: colorNeg,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });

      const linePos = new THREE.Line(geomPos, matPos);
      const lineNeg = new THREE.Line(geomNeg, matNeg);

      group.add(linePos);
      group.add(lineNeg);
    };

    makeAxis("x");
    makeAxis("y");
    makeAxis("z");

    group.visible = visible;
  }

  function updateMetrics({ radius }) {
    if (typeof radius === "number" && radius > 0) {
      sceneRadius = radius;
    } else {
      sceneRadius = 1;
    }
    rebuildLines();
  }

  function setVisible(flag) {
    visible = !!flag;
    group.visible = visible;
  }

  function toggle() {
    setVisible(!visible);
  }

  return {
    group,
    updateMetrics,
    setVisible,
    toggle,
  };
}
