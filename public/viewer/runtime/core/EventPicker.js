// ============================================================
// EventPicker.js
// クリック位置 → rendererContext.pickObjectAt → selectionCallback
//
// 責務：
// - DOM イベント（クリック）から NDC(-1〜+1) を計算
// - rendererContext.pickObjectAt(ndcX, ndcY) を叩く
// - 取れた uuid を selectionCallback(uuid) に渡す
//
// three.js には触らず、rendererContext に委譲する。
// ============================================================

export class EventPicker {
  /**
   * @param {Object} options
   *  - domElement: rendererContext.domElement（canvas）
   *  - rendererContext: viewerRenderer.createRendererContext の戻り値
   *  - onPick: (uuid: string, info?: {distance:number, point:[x,y,z]}) => void
   */
  constructor({ domElement, rendererContext, onPick } = {}) {
    if (!domElement || !rendererContext || typeof rendererContext.pickObjectAt !== "function") {
      throw new Error("[EventPicker] domElement / rendererContext.pickObjectAt が必須やで");
    }
    if (typeof onPick !== "function") {
      throw new Error("[EventPicker] onPick callback が必須やで");
    }

    this.dom = domElement;
    this.rendererContext = rendererContext;
    this.onPick = onPick;

    this._onClick = this._onClick.bind(this);

    this._addListeners();
  }

  _addListeners() {
    this.dom.addEventListener("click", this._onClick);
  }

  dispose() {
    this.dom.removeEventListener("click", this._onClick);
  }

  _onClick(ev) {
    const rect = this.dom.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    // NDC に変換
    const ndcX = (x / rect.width) * 2 - 1;
    const ndcY = -(y / rect.height) * 2 + 1;

    const pick = this.rendererContext.pickObjectAt(ndcX, ndcY);
    if (!pick || !pick.uuid) return;

    this.onPick(pick.uuid, pick);
  }
}
