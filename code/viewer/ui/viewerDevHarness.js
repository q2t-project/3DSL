// PR8: viewer 用 dev ハーネス。
// .3dss.json → （必要なら importer_core）→ scene_builder → viewerRenderer。

import { importModelFromJSON } from "../../modeler/io/importer_core.js"; // もし共通 importer を使うなら
import { buildSceneFromDocument } from "../scene/scene_builder.js";     // 実際の API 名に合わせて修正
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

    // ThreeDSSDocument に変換（または既に ThreeDSSDocument ならそのまま）
    const doc = importModelFromJSON(json);

    // viewer 用 Scene 構築
    const sceneInfo = buildSceneFromDocument(doc);
    // sceneInfo: { viewScene, threeScene, camera, ... } を想定

    renderer.renderScene(sceneInfo);

    if (summaryElem) {
      summaryElem.textContent = JSON.stringify(
        {
          nodesInScene: sceneInfo.viewScene?.nodes?.length ?? null,
          document_uuid: doc.document_meta?.document_uuid ?? null,
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
