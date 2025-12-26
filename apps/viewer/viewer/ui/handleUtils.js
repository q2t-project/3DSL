// viewer/ui/handleUtils.js

/**
 * detach 優先、無ければ dispose（例外は握りつぶす）
 * @param {any} h
 */
export function detachOrDispose(h) {
  if (!h) return;
  if (typeof h === 'function') { h(); return; }
  if (typeof h.detach === 'function') { h.detach(); return; }
  if (typeof h.dispose === 'function') { h.dispose(); return; }
}

/**
 * owner[key] の prev を teardown して、参照一致なら null に戻す
 * @param {any} owner
 * @param {string | symbol} key
 * @returns {any} prev
 */
export function teardownPrevHandle(owner, key) {
  if (!owner || !key) return null;

  const prev = owner[key];
  if (!prev) return null;

  try {
    detachOrDispose(prev);
  } catch (_e) {
    // ここで死ぬのだけは避ける（次の attach を進める）
    try { console.warn('[handleUtils] detachOrDispose failed', _e); } catch {}
  }

  if (owner[key] === prev) {
    try { owner[key] = null; } catch (_e) {}
  }
  return prev;
}
