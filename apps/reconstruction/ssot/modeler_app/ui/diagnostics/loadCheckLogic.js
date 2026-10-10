export const TARGETS = { load: 5000, search: 1000, scope: 1000, selection: 1000, related: 1000, frame: 1000, back: 1000, save: 5000 };
export const LABELS = { load: "読込", search: "検索", scope: "範囲変更", selection: "選択", related: "接続探索", frame: "表示切替", back: "探索の戻る", save: "保存" };
export function summarize(samples, expected = 5) {
  return Object.entries(TARGETS).map(([operation, limitMs]) => {
    const runs = samples.filter(row => row.operation === operation);
    const failed = runs.some(row => row.ok !== true || !Number.isFinite(row.ms) || row.ms < 0);
    const worstMs = runs.length ? Math.max(...runs.map(row => Number.isFinite(row.ms) ? row.ms : Infinity)) : null;
    return { operation, label: LABELS[operation], runs: runs.length, expected, limitMs, worstMs,
      status: failed || (worstMs !== null && worstMs > limitMs) ? "FAIL" : runs.length !== expected ? "INCOMPLETE" : "PASS" };
  });
}
export function assert(condition, message) { if (!condition) throw new Error(message); }
export function equivalent(a, b, tolerance = 0) {
  if (typeof a === "number" && typeof b === "number") return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equivalent(a[key], b[key], tolerance));
}
// Compare against a fixed observation-window anchor, not the previous sample:
// tiny continuous movement must not accumulate into a false "stationary" result.
export function createViewStability({ tolerance = 1e-7, stableMs = 80 } = {}) {
  let anchor = null, since = null, stableForMs = 0;
  const valid = view => view && ["position", "target", "up"].every(key =>
    Array.isArray(view[key]) && view[key].length === 3 && view[key].every(Number.isFinite)) &&
    ["fov", "near", "far"].every(key => Number.isFinite(view[key]));
  return {
    observe(view, busy, now) {
      if (busy || !valid(view) || !Number.isFinite(now)) {
        anchor = null; since = null; stableForMs = 0; return false;
      }
      if (!anchor || now < since || !equivalent(view, anchor, tolerance)) {
        anchor = JSON.parse(JSON.stringify(view)); since = now;
      }
      stableForMs = now - since;
      return stableForMs >= stableMs;
    },
    state: () => ({ tolerance, stableMs, stableForMs }),
  };
}
export async function timed(samples, operation, round, task, settle, clock = () => performance.now()) {
  const start = clock();
  try {
    await task(); await settle();
    const row = { operation, round, ms: clock() - start, ok: true }; samples.push(row); return row;
  } catch (error) {
    samples.push({ operation, round, ms: clock() - start, ok: false, error: String(error?.message || error) }); throw error;
  }
}
