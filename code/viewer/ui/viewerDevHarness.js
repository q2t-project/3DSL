// PR8: viewer 用 dev ハーネス。
// .3dss.json → （必要なら importer_core）→ scene_builder → viewerRenderer。

import { convert3DssToInternalModel } from "../../common/core/importer_core.js";
import { validate3Dss } from "../../common/validator/threeDssValidator.js";
import { validateInternalModel } from "../../common/validator/internalModelValidator.js";
import { createScene } from "../scene/scene_builder.js";
import { ViewerRenderer } from "../renderer/viewerRenderer.js";

export function bootstrapViewerDev(opts) {
  const { mountViewport, summaryElem, logElem } = opts;

  const renderer = new ViewerRenderer(mountViewport);

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

    const viewScene = createScene(model.scene);
    const sceneInfo = { viewScene };
    // sceneInfo: { viewScene, threeScene, camera, ... } を想定

    renderer.renderScene(sceneInfo);

    if (summaryElem) {
      summaryElem.textContent = JSON.stringify(
        {
          nodesInScene: sceneInfo.viewScene?.nodes?.length ?? null,
          sceneId: model.scene?.id ?? null,
          version: model.version ?? null,
        },
        null,
        2,
      );
    }

    log("rendered viewer scene", {
      nodes: sceneInfo.viewScene?.nodes?.length ?? 0,
    });
  }

  return {
    renderer,
    loadDocument,
  };
}
