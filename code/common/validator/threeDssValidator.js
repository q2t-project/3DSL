// 3DSS スキーマ検証のためのインターフェースだけ定義したスケルトン。
// AJV 本体やスキーマのロードは、あとで安全に実装する。

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {Array<Object>} [errors]
 */

/**
 * 外部から渡されたバリデータ関数を使って 3DSS ドキュメントを検証する。
 * @param {import("../core/modelTypes.js").ThreeDSSDocument} doc
 * @param {(doc: unknown) => boolean} validateFn  AJV などで事前にコンパイルした関数
 * @returns {ValidationResult}
 */
export function validate3DSS(doc, validateFn) {
  if (typeof validateFn !== "function") {
    return { ok: false, errors: [{ message: "validateFn is not provided" }] };
  }

  const ok = validateFn(doc);
  const errors = ok ? undefined : (validateFn.errors || []).map((e) => ({
    message: e.message,
    instancePath: e.instancePath,
    keyword: e.keyword,
    params: e.params
  }));

  return { ok, errors };
}
