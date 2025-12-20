// public/viewer/ui/handleUtils.js

/**
 * detach 優先、無ければ dispose（例外は握りつぶす）
 * @param {any} h
 */
export function detachOrDispose(h) {
  if (!h) return;
  try {
    if (typeof h.detach === "function") return h.detach();
    if (typeof h.dispose === "function") return h.dispose();
  } catch (_e) {}
}

/**
 * owner[key] の prev を teardown して、参照一致なら null に戻す
 * @param {any} owner
 * @param {string | symbol} key
 * @returns {any} prev
 */
export function teardownPrevHandle(owner, key) {
  if (!owner) return null;
  const prev = owner[key];
  if (!prev) return null;

  detachOrDispose(prev);

  // ★ 参照一致だけでOK（別 handle が入ってたら触らん）
  if (owner[key] === prev) owner[key] = null;

  return prev;
}
