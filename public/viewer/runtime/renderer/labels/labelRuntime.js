// runtime/renderer/labels/labelRuntime.js
import * as THREE from "../../../../vendor/three/build/three.module.js";
import { labelConfig } from "./labelConfig.js";

export function createLabelRuntime(scene) {
  const labelSprites = new Map();
  let pointLabelIndex = new Map();

  function clear() {
    for (const sprite of labelSprites.values()) {
      scene.remove(sprite);
    }
    labelSprites.clear();
    pointLabelIndex = new Map();
  }

  function createLabelSprite(label, basePosition) {
    // ★ 今の createLabelSprite 本体をそのままコピペ
    //   - canvas 作成〜texture〜Sprite/Plane の生成
    //   - userData.baseScale / baseOpacity の記録
    //   - 最後に obj を返す
  }

  function rebuild(pointPositionByUuid, pointObjects) {
    for (const sprite of labelSprites.values()) {
      scene.remove(sprite);
    }
    labelSprites.clear();

    if (!pointLabelIndex || pointLabelIndex.size === 0) return;

    for (const [uuid, label] of pointLabelIndex.entries()) {
      const basePos =
        pointPositionByUuid.get(uuid) ||
        pointObjects.get(uuid)?.position?.toArray() ||
        [0, 0, 0];

      const sprite = createLabelSprite(label, basePos);
      if (!sprite) continue;

      labelSprites.set(uuid, sprite);
      scene.add(sprite);
    }
  }

  function applyMicroFX(microState) {
    // ★ 今の applyLabelMicroFX をそのまま移す
    //   - labelSprites を参照
    //   - degreeByUuid / focusUuid / relatedUuids を見て
    //     visible, scale, opacity を調整
  }

  return {
    // state
    labelSprites,
    // operations
    setPointLabelIndex(index) {
      pointLabelIndex = index || new Map();
    },
    clear,
    rebuild,
    applyMicroFX,
  };
}
