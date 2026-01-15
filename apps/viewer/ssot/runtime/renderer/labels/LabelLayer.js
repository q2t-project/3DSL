// viewer/runtime/renderer/labels/labelLayer.js
//
// 外部から見えるのはここだけ。
// - scene ノード管理やラベル生成は labelRuntime に閉じ込める。

import { createLabelRuntime } from "./labelRuntime.js";

export class LabelLayer {
  constructor(scene, { renderOrder = 900, camera = null } = {}) {
    this.runtime = createLabelRuntime(scene, { renderOrder, camera });
    this.visibleSet = null;
    this.cameraState = null;
  }

  sync(labelIndex, pointObjects) {
    this.runtime.setPointObjects(pointObjects);
    this.runtime.syncIndex(labelIndex);
  }

  setVisibleSet(visibleSet) {
    this.visibleSet = visibleSet || null;
  }

  setCameraState(cameraState) {
    this.cameraState = cameraState || null;
  }

  applyMicroFX(microState, intensity = 1) {
    this.runtime.applyMicroFX(microState, intensity);
  }

  update() {
    if (!this.cameraState) return;
    this.runtime.update(this.cameraState, this.visibleSet);
  }

  getStats() {
    return this.runtime.getStats?.() ?? null;
  }

  dispose() {
    this.runtime.dispose();
  }
}
