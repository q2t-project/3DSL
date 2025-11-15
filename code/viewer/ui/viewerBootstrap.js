import { ROOT_IDS } from "../../common/ui/domIds.js";
import { createViewerContext, loadDocument } from "../core/viewerCommands.js";
import { ViewerRenderer } from "../renderer/viewerRenderer.js";
import { updateViewerHud } from "../hud/viewerHudController.js";

export function bootstrapViewer(initialDoc, dom = document) {
  const ctx = createViewerContext();
  loadDocument(ctx, initialDoc);

  const canvas = dom.getElementById(ROOT_IDS.viewerCanvas);
  if (!canvas) {
    console.warn("[3DSL viewer] canvas element not found");
    return;
  }

  const renderer = new ViewerRenderer(canvas);
  renderer.init();

  renderer.render(ctx.document);
  updateViewerHud(ctx.document, dom);
}
