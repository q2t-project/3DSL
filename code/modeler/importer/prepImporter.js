// 3DSS-prep.json を modeler 内部表現に変換する入口だけ用意

/**
 * @param {unknown} prepJson
 * @returns {{ ok: boolean, document?: import("../../common/core/modelTypes.js").ThreeDSSDocument, errors?: string[] }}
 */
export function importFromPrep(prepJson) {
  // ここは後でちゃんと実装する。
  // 今は単に失敗を返しておく。
  return {
    ok: false,
    errors: ["prep importer is not implemented yet"]
  };
}
