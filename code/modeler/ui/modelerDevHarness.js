// PR8: dev 用の簡易ハーネス。
// three.js 初期化 → 3DSS 読み込み → importer_core → modelerRenderer で表示。

import { convert3DssToInternalModel } from "../../common/core/importer_core.js";
import { validate3Dss } from "../../common/validator/threeDssValidator.js";
import { validateInternalModel } from "../../common/validator/internalModelValidator.js";
import { ModelerRenderer } from "../renderer/modelerRenderer.js";

export function bootstrapModelerDev(opts) {
  const { mountViewport, summaryElem, logElem } = opts;

  const renderer = new ModelerRenderer(mountViewport);

  function log(msg, obj) {
    if (!logElem) return;
    const line =
      "[dev] " + msg + (obj ? " " + JSON.stringify(obj) : "");
    logElem.textContent += (logElem.textContent ? "\n" : "") + line;
  }

  async function loadDocument(url) {
    log("fetch " + url);
    const res = await fetch(url);
    const json = await res.json();

    const docValidation = validate3Dss(json);
    if (!docValidation.ok) {
      log("3DSS validation failed", docValidation.errors);
      throw new Error(docValidation.errors?.[0]?.message ?? "3DSS validation failed");
    }

    const model = convert3DssToInternalModel(json);
    const internalValidation = validateInternalModel(model);
    if (!internalValidation.ok) {
      log("internal model warnings", internalValidation.errors);
    }

    renderer.render(model);

    if (summaryElem) {
      summaryElem.textContent = JSON.stringify(
        {
          sceneId: model.scene?.id ?? null,
          nodes: model.scene?.nodes?.length ?? 0,
          version: model.version ?? null,
        },
        null,
        2,
      );
    }

    log("rendered", {
      sceneId: model.scene?.id ?? null,
      nodes: model.scene?.nodes?.length ?? 0,
    });
  }

  return {
    renderer,
    loadDocument,
  };
}
