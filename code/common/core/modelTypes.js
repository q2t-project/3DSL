// 共通の 3DSS データ型（アプリ共通 / 実装非依存）

/**
 * @typedef {Object} DocumentMeta
 * @property {string} document_uuid
 * @property {string} schema_uri
 * @property {string} author
 * @property {string} version
 * @property {string} coordinate_system
 * @property {string} units
 * @property {string} language
 */

/**
 * @typedef {Object} Line
 * @property {string} id
 * @property {string} from
 * @property {string} to
 * @property {string} kind
 * @property {Object} [style]
 */

/**
 * @typedef {Object} Point
 * @property {string} id
 * @property {string} label
 * @property {number[]} position  // [x, y, z]
 * @property {Object} [style]
 */

/**
 * @typedef {Object} Aux
 * @property {string} id
 * @property {string} kind
 * @property {Object} [params]
 */

/**
 * @typedef {Object} ThreeDSSDocument
 * @property {Line[]} lines
 * @property {Point[]} points
 * @property {Aux[]} aux
 * @property {DocumentMeta} document_meta
 */

/**
 * 3DSS ドキュメントの空テンプレートを返す。
 * 実際の初期値は modeler 側で上書きしてよい。
 * @returns {ThreeDSSDocument}
 */
export function createEmptyDocument() {
  return {
    lines: [],
    points: [],
    aux: [],
    document_meta: {
      document_uuid: "",
      schema_uri: "",
      author: "",
      version: "0.0.0",
      coordinate_system: "Z+up/freeXY",
      units: "mm",
      language: "ja"
    }
  };
}
