// ============================================================
// runtime/core/loader.js
// JSON を単純に fetch して返すだけの最小ローダ
// ============================================================

/**
 * 指定 URL から JSON を取得する（最小で堅牢）
 * @param {string} url - fetch する URL（絶対または相対）
 * @returns {Promise<any|null>} - JSON オブジェクト or null
 */
export async function loadJSON(url) {
    try {
        const res = await fetch(url, { cache: "no-cache" });

        if (!res.ok) {
            console.error(`[loader] fetch失敗: ${url}, status=${res.status}`);
            return null;
        }

        const json = await res.json();
        return json;

    } catch (err) {
        console.error(`[loader] fetch例外: ${url}`, err);
        return null;
    }
}
