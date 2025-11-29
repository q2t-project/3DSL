// viewer/runtime/renderer/microFX/highlight.js

// micro-highlight:
// 選択対象や relatedUuids を「オーバーレイ用の複製ジオメトリ」でなぞるだけ。
// 長さ単位には一切踏み込まず、元オブジェクトの position/rotation/scale をそのままコピーする。

import * as THREE from "../../../../vendor/three/build/three.module.js";

let highlightGroup = null;

function ensureGroup(scene) {
  // 他 scene の残骸があれば破棄
  if (highlightGroup && highlightGroup.parent !== scene) {
    highlightGroup.parent.remove(highlightGroup);
    highlightGroup = null;
  }

  if (!highlightGroup) {
    highlightGroup = new THREE.Group();
    highlightGroup.name = "micro-highlight";
    highlightGroup.renderOrder = 998;
    scene.add(highlightGroup);
  }
  return highlightGroup;
}

export function applyHighlight(scene, relatedUuids, getObjectByUuid) {
  clearHighlight(scene);

  if (!Array.isArray(relatedUuids) || relatedUuids.length === 0) return;

  const group = ensureGroup(scene);

  for (const uuid of relatedUuids) {
    // getObjectByUuid は indexMaps を閉じ込めた関数を期待している
    const src = getObjectByUuid(uuid);
    if (!src) continue;

    let clone = null;

    if (src.isMesh) {
      clone = new THREE.Mesh(src.geometry, new THREE.MeshBasicMaterial({
        color: "#00ffff",
        opacity: 0.5,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }));
    } else if (src.isLine) {
      clone = new THREE.Line(src.geometry, new THREE.LineBasicMaterial({
        color: "#00ffff",
        opacity: 0.9,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }));
    } else {
      continue;
    }

    clone.position.copy(src.position);
    clone.quaternion.copy(src.quaternion);
    clone.scale.copy(src.scale);

    group.add(clone);
  }
}

export function clearHighlight(scene) {
  if (!highlightGroup) return;
  highlightGroup.clear();
}
