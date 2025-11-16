// PR8: dev 用の簡易ハーネス。
// three.js 初期化 → 3DSS 読み込み → importer_core → modelerRenderer で表示。

import { importModelFromJSON } from "../io/importer_core.js";
import { ModelerRenderer } from "../renderer/modelerRenderer.js";
// 必要なら validator / paths もここで import する。

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

    // ThreeDSSDocument へ変換
    const doc = importModelFromJSON(json);

    // renderer へ渡す
    renderer.renderDocument(doc);

    if (summaryElem) {
      summaryElem.textContent = JSON.stringify(
        {
          lines: doc.lines?.length ?? 0,
          points: doc.points?.length ?? 0,
          aux: doc.aux?.length ?? 0,
          document_uuid: doc.document_meta?.document_uuid ?? null,
          version: doc.document_meta?.version ?? null,
        },
        null,
        2,
      );
    }

    log("rendered", {
      lines: doc.lines?.length ?? 0,
      points: doc.points?.length ?? 0,
      aux: doc.aux?.length ?? 0,
    });
  }

  return {
    renderer,
    loadDocument,
  };
}
