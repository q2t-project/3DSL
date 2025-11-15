// viewer 側 three.js レンダラーのスケルトン

export class ViewerRenderer {
  /**
   * @param {HTMLElement} canvasElement
   */
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.initialized = false;
  }

  init() {
    this.initialized = true;
  }

  /**
   * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} _doc
   */
  render(_doc) {
    if (!this.initialized) return;
    // 実装は後で
  }
}
