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
   * @param {import("../../common/types/core.js").Model} _model
   */
  render(_model) {
    if (!this.initialized) return;
    // 実装は後で
  }
}
