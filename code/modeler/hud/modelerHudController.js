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
  if (verEl) verEl.textContent = meta.version ?? "";

  const unitsEl = get(HUD_FIELDS.units);
  if (unitsEl) unitsEl.textContent = meta.units ?? "";
}
