// modeler 全体の状態をひとまとめに持つコンテキスト

import { createEmptyDocument } from "../../common/core/modelTypes.js";

export class ModelerContext {
  constructor() {
    /** @type {import("../../common/core/modelTypes.js").ThreeDSSDocument} */
    this.document = createEmptyDocument();

    this.viewState = {
      cameraPosition: [0, 0, 1],
      cameraTarget: [0, 0, 0],
      selection: []
    };

    this.dirty = false;
  }

  markDirty() {
    this.dirty = true;
  }

  markClean() {
    this.dirty = false;
  }
}
