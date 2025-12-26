// viewer/runtime/renderer/selectionHighlight.js

import * as THREE from "../../../vendor/three/build/three.module.js";

// シーン内に 1 個だけ持つ selection ハイライト用グループ
let selectionGroup = null;
let lastUuid = null;

function ensureGroup(scene) {
  if (selectionGroup && selectionGroup.parent === scene) {
    return selectionGroup;
  }

  if (selectionGroup && selectionGroup.parent) {
    selectionGroup.parent.remove(selectionGroup);
  }

  selectionGroup = new THREE.Group();
  selectionGroup.name = "selectionHighlight";
  selectionGroup.renderOrder = 9999;

  scene.add(selectionGroup);
  return selectionGroup;
}

function disposeGroup() {
  if (!selectionGroup) return;

  selectionGroup.traverse((obj) => {
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

  if (selectionGroup.parent) {
    selectionGroup.parent.remove(selectionGroup);
  }

  selectionGroup = null;
  lastUuid = null;
}

export function clearSelectionHighlight(scene) {
  // scene が渡されてきたら念のため紐も切っておく
  if (scene && selectionGroup && selectionGroup.parent === scene) {
    scene.remove(selectionGroup);
  }
  disposeGroup();
}

// uuid → Object3D を引く（microFX と同じ思想）
function getObjectByUuid(uuid, bundles) {
  if (!uuid || !bundles) return null;
  const { points, lines, aux, labels } = bundles;

  return (
    (points && points.get && points.get(uuid)) ||
    (lines && lines.get && lines.get(uuid)) ||
    (aux && aux.get && aux.get(uuid)) ||
    (labels && labels.get && labels.get(uuid)) ||
    null
  );
}

/**
 * selection: { uuid, kind? }
 * bundles : { points, lines, aux, labels } いずれも Map<uuid, Object3D>
 */
export function updateSelectionHighlight(scene, bundles, selection) {
  const uuid = selection && selection.uuid;
  if (!uuid) {
    clearSelectionHighlight(scene);
    return;
  }

  const src = getObjectByUuid(uuid, bundles);
  if (!src) {
    clearSelectionHighlight(scene);
    return;
  }

  // 同じ uuid ならとりあえずそのまま（将来、カメラ距離依存で太さ変えたいならここで）
  if (selectionGroup && lastUuid === uuid) {
    selectionGroup.visible = true;
    return;
  }

  // uuid が変わったので作り直し
  disposeGroup();
  const group = ensureGroup(scene);
  lastUuid = uuid;

  // バウンディングボックスから枠線を作る
  const box = new THREE.Box3().setFromObject(src);
  if (box.isEmpty()) {
    // サイズがゼロなら軽くスキップ
    return;
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // あまりに小さいと見えにくいので最低サイズを確保
  const MIN_SIZE = 0.1;
  size.x = Math.max(size.x, MIN_SIZE);
  size.y = Math.max(size.y, MIN_SIZE);
  size.z = Math.max(size.z, MIN_SIZE);

  const geomBox = new THREE.BoxGeometry(size.x, size.y, size.z);
  const geomEdges = new THREE.EdgesGeometry(geomBox);

  const mat = new THREE.LineBasicMaterial({
    color: 0xffff66, // 選択ハイライト用の淡い黄色
    linewidth: 2,    // WebGL1 ではあまり効かないが一応
  });

  const outline = new THREE.LineSegments(geomEdges, mat);
  outline.position.copy(center);

  // 手前に出るように
  outline.renderOrder = 9999;
  mat.depthTest = true;
  mat.depthWrite = false;
  mat.transparent = true;

  group.add(outline);
}
