// ui/ownedHandle.js
// 共通：UI/host で「毎回同じ儀式」に固定するための util
// - handle は実装ごとに detach/dispose/stop の揺れがある前提
// - 二重呼び防止：最初に見つかった 1 メソッドだけ呼ぶ

export function detachOrDispose(handle) {
  if (!handle) return false;
  const order = ["detach", "dispose", "stop"];
  for (const m of order) {
    const fn = handle && handle[m];
    if (typeof fn === "function") {
      try { fn.call(handle); } catch (_e) {}
      return true;
    }
  }
  return false;
}

export function teardownPrev(owner, key) {
  if (!owner || !key) return false;
  const prev = owner[key];
  if (!prev) return false;
  detachOrDispose(prev);
  owner[key] = null;
  return true;
}

export function setOwnedHandle(owner, key, handle) {
  if (!owner || !key) return false;
  teardownPrev(owner, key);
  owner[key] = handle;
  return true;
}
