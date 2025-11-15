// modeler → .3dss.json へのエクスポート窓口

/**
 * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} doc
 * @returns {string} JSON string
 */
export function exportTo3DSS(doc) {
  // pretty-print かどうかなどのポリシーはあとで決める
  return JSON.stringify(doc, null, 2);
}
