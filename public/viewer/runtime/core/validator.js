// ============================================================
// runtime/core/validator.js
// AJV (strict) による 3DSS schema validator
// index.htm 側で window.Ajv が読み込まれている前提
// ============================================================

let ajv = null;
let validateFn = null;
let lastErrors = null;

/**
 * 3DSS schema を fetch し、AJV validator を初期化する
 * @param {string} schemaURL - スキーマの絶対パス
 * @returns {Promise<boolean>} - 初期化成功かどうか
 */
export async function init(schemaURL) {

  if (!window.Ajv) {
    console.warn("[validator] AJV が window から見つからんので、当面バリデーションはスキップするで");
    // validator 未使用モードにして成功扱いで返す
    ajv = null;
    validateFn = null;
    lastErrors = null;
    return true;
  }

    try {
        const res = await fetch(schemaURL, { cache: "no-cache" });

        if (!res.ok) {
            console.error(`[validator] schema fetch失敗: ${schemaURL}, status=${res.status}`);
            return false;
        }

        const schema = await res.json();

        ajv = new window.Ajv({
            strict: true,
            allErrors: true,
            validateFormats: true
        });

        validateFn = ajv.compile(schema);

        console.log("[validator] schema loaded:", schemaURL);
        return true;

    } catch (err) {
        console.error("[validator] init() 例外:", err);
        return false;
    }
}

/**
 * 3DSS データを strict schema でバリデートする
 * @param {object} json - 構造データ
 * @returns {boolean}
 */
export function validate3DSS(json) {
    if (!validateFn) {
        // AJV が無効なときは素通し
        return true;
    }

    const ok = validateFn(json);

    if (!ok) {
        lastErrors = validateFn.errors;
        console.warn("[validator] schema NG");
    } else {
        lastErrors = null;
    }

    return ok;
}

/**
 * 直近の AJV エラーを返す
 * @returns {Array|null}
 */
export function getErrors() {
    return lastErrors;
}
