// modeler 用 HUD の制御スケルトン

import { HUD_FIELDS } from "../../common/ui/domIds.js";

/**
 * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} doc
 * @param {Document} dom
 */
export function updateModelerHud(doc, dom = document) {
  const get = (id) => dom.getElementById(id);

  const meta = doc.document_meta ?? {};

  const uuidEl = get(HUD_FIELDS.documentUuid);
  if (uuidEl) uuidEl.textContent = meta.document_uuid ?? "";

  const verEl = get(HUD_FIELDS.version);
  if (verEl) verEl.textContent = meta.version ?? "";// modeler エントリーポイント用の初期化関数

import { ROOT_IDS } from "../../common/ui/domIds.js";
import { createModelerContext, newDocument } from "../core/modelerCommands.js";
import { ModelerRenderer } from "../renderer/modelerRenderer.js";
import { updateModelerHud } from "../hud/modelerHudController.js";

export function bootstrapModeler(dom = document) {
  const ctx = createModelerContext();

  const canvas = dom.getElementById(ROOT_IDS.modelerCanvas);
  if (!canvas) {
    console.warn("[3DSL modeler] canvas element not found");
    return;
  }

  const renderer = new ModelerRenderer(canvas);
  renderer.init();

  newDocument(ctx);

  renderer.render(ctx.document);
  updateModelerHud(ctx.document, dom);
}


  const unitsEl = get(HUD_FIELDS.units);
  if (unitsEl) unitsEl.textContent = meta.units ?? "";
}
