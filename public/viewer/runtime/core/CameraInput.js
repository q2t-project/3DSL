// runtime/core/CameraInput.js

// ============================================================
// CameraInput
// - DOM イベント → CameraEngine API への変換だけ担当
// - 操作感は options で調整可能
//   rotateSpeed: 回転速度（1.0 基準）
//   panSpeed   : 平行移動速度
//   zoomSpeed  : ズーム速度
//   invertOrbitY: 縦回転の方向反転フラグ
// ============================================================

export class CameraInput {
  /**
   * @param {Object} options
   *  - domElement: rendererContext.domElement（canvas）
   *  - engine: CameraEngine インスタンス
   *  - rotateSpeed?: number
   *  - panSpeed?: number
   *  - zoomSpeed?: number
   *  - invertOrbitY?: boolean
   */
  constructor({
    domElement,
    engine,
    rotateSpeed = 1.0,
    panSpeed = 1.0,
    zoomSpeed = 1.0,
    invertOrbitY = false,
  } = {}) {
    if (!domElement || !engine) {
      throw new Error("[CameraInput] domElement / engine は必須やで");
    }

    this.dom = domElement;
    this.engine = engine;

    this.rotateSpeed = rotateSpeed;
    this.panSpeed = panSpeed;
    this.zoomSpeed = zoomSpeed;
    this.invertOrbitY = invertOrbitY;

    this.isDragging = false;
    this.button = 0;
    this.lastX = 0;
    this.lastY = 0;

    // バインドしてから登録
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);

    this._addListeners();
  }

  // ----------------------------------------------------------
  // listener 登録 / 解除
  // ----------------------------------------------------------
  _addListeners() {
    this.dom.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mouseup", this._onMouseUp);
    this.dom.addEventListener("wheel", this._onWheel, { passive: false });
    this.dom.addEventListener("contextmenu", this._onContextMenu);
  }

  dispose() {
    this.dom.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mouseup", this._onMouseUp);
    this.dom.removeEventListener("wheel", this._onWheel);
    this.dom.removeEventListener("contextmenu", this._onContextMenu);
  }

  // ----------------------------------------------------------
  // mouse handlers
  // ----------------------------------------------------------
  _onMouseDown(ev) {
    // 左(0) / 中(1) / 右(2) 以外は無視
    if (ev.button !== 0 && ev.button !== 1 && ev.button !== 2) return;

    this.isDragging = true;
    this.button = ev.button;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;

    // キャンバスにフォーカス当てとく
    if (this.dom.focus) {
      this.dom.focus();
    }
  }

  _onMouseMove(ev) {
    if (!this.isDragging) return;

    const dx = ev.clientX - this.lastX;
    const dy = ev.clientY - this.lastY;
    this.lastX = ev.clientX;
    this.lastY = ev.clientY;

    const rect = this.dom.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;

    // 正規化（画面サイズ依存を抑える）
    const ndx = dx / w;
    const ndy = dy / h;

    if (this.button === 0) {
      // 左ドラッグ = orbit
      const ROTATE_2PI = Math.PI * 2.0;
      const sx = this.rotateSpeed * ROTATE_2PI;
      const sy = this.rotateSpeed * ROTATE_2PI * (this.invertOrbitY ? 1 : -1);

      this.engine.rotate(-ndx * sx, ndy * sy);
    } else if (this.button === 1 || this.button === 2) {
      // 中 or 右ドラッグ = pan
      const PAN = this.panSpeed;
      this.engine.pan(ndx * PAN, ndy * PAN);
    }
  }

  _onMouseUp(_ev) {
    this.isDragging = false;
  }

  _onWheel(ev) {
    // デフォルトスクロールを止める
    ev.preventDefault();

    let delta = ev.deltaY;

    // deltaMode 対応（行単位・ページ単位など）
    // 0: pixel, 1: line, 2: page
    if (ev.deltaMode === 1) {
      delta *= 16; // 行 → px 換算のざっくり値
    } else if (ev.deltaMode === 2) {
      delta *= 100; // ページ → px 換算のざっくり値
    }

    this.engine.zoom(delta * this.zoomSpeed);
  }

  _onContextMenu(ev) {
    // 右クリックドラッグ中にメニュー出ないように
    ev.preventDefault();
  }
}
