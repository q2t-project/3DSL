import { createEmptyDocument } from "../../common/core/modelTypes.js";

export class ViewerContext {
  constructor() {
    /** @type {import("../../common/core/modelTypes.js").ThreeDSSDocument} */
    this.document = createEmptyDocument();

    this.viewState = {
      cameraPosition: [0, 0, 1],
      cameraTarget: [0, 0, 0],
      selection: []
    };
  }
}
