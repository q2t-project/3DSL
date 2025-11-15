import { ViewerContext } from "./viewerContext.js";

export function createViewerContext() {
  return new ViewerContext();
}

/**
 * @param {ViewerContext} ctx
 * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} doc
 */
export function loadDocument(ctx, doc) {
  ctx.document = doc;
}
