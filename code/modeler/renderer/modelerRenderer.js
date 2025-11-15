// three.js を使った描画の土台だけ用意（まだ three は import しない）

export class ModelerRenderer {
  /**
   * @param {HTMLElement} canvasElement
   */
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.initialized = false;
  }

  init() {
    // three.js の初期化は後で
    this.initialized = true;
  }

  /**
   * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} _doc
   */
  render(_doc) {
    if (!this.initialized) return;
    // レンダリング処理は後で
  }
}
