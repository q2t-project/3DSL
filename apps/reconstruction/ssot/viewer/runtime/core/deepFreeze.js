// viewer/runtime/core/deepFreeze.js
// 3DSS 構造データ用の再帰 deep-freeze ユーティリティ。
// - 入力は「純 JSON オブジェクト or 配列」を想定
// - ui_state や three.js Object3D には使わないこと

/**
 * 任意の値を deep-freeze する。
 * - 非オブジェクトはそのまま返す
 * - 循環参照があっても安全（WeakSet で検出）
 * - すでに凍結済みのオブジェクトはそのまま返す
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepFreeze(value) {
  return freezeRec(value, new WeakSet());
}

/**
 * 内部用再帰関数
 * @param {*} value
 * @param {WeakSet<object>} seen
 * @returns {*}
 */
function freezeRec(value, seen) {
  if (value === null) return value;
  const t = typeof value;
  if (t !== "object") return value;

  // すでに見た or 凍結済みならスキップ
  if (seen.has(value)) return value;
  seen.add(value);

  if (Object.isFrozen(value)) return value;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      freezeRec(value[i], seen);
    }
  } else {
    // JSON 想定なので own enumerable keys だけで十分
    for (const key of Object.keys(value)) {
      freezeRec(value[key], seen);
    }
  }

  return Object.freeze(value);
}
