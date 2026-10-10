export const OPERATIONS = Object.freeze({
  load: { label: '読込', limitMs: 5000 },
  search: { label: '検索', limitMs: 1000 },
  scope: { label: '範囲変更', limitMs: 1000 },
  selection: { label: '選択', limitMs: 1000 },
  info: { label: '情報確認', limitMs: 1000 },
  related: { label: '接続探索', limitMs: 1000 },
  frame: { label: '表示切替', limitMs: 1000 },
  back: { label: '探索の戻る', limitMs: 1000 },
});
export const HIGH = '81000000-0000-4000-8000-000000000001';
export const TWINS = ['81000000-0000-4000-8000-000000000013', '81000000-0000-4000-8000-000000000713'];
export const FIXTURES = [
  ['F1', '/models/reconstruction_F1.3dsl-work.json'],
  ['F2', '/models/reconstruction_F2.3dsl-work.json'],
  ['F3', '/models/reconstruction_F3.3dsl-work.json'],
  ['F4', '/models/reconstruction_F4.3dsl-work.json'],
  ['legacy', '/models/knowledge_questions.3dsl-work.json'],
  ['scene', '/models/created_3points_2lines.3dss.json'],
];
export class IncompleteError extends Error { constructor(message) { super(message); this.name = 'IncompleteError'; } }
export function assert(condition, message) { if (!condition) throw new Error(message); }
export function equivalent(a, b, tolerance = 0) {
  if (typeof a === 'number' && typeof b === 'number') return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance;
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && equivalent(a[k], b[k], tolerance));
}
export function readingState(state) {
  const { selectedId, query, scope, scopeRootId, frame, filters, camera, historyDepth, format, label } = state;
  return structuredClone({ selectedId, query, scope, scopeRootId, frame, filters, camera, historyDepth, format, label,
    allowedUuids: state.bridgeState?.scope ?? null, rendererSelection: state.bridgeState?.selection ?? null });
}
export function parseSnapshot(value) { return typeof value === 'string' ? JSON.parse(value) : value; }
export function combineStatuses(statuses) {
  if (statuses.includes('FAIL')) return 'FAIL';
  return statuses.length > 0 && statuses.every(s => s === 'PASS') ? 'PASS' : 'INCOMPLETE';
}
export function summarize(samples, expected = 5) {
  return Object.entries(OPERATIONS).map(([operation, { label, limitMs }]) => {
    const rows = samples.filter(row => row.operation === operation);
    const durations = rows.map(row => row.ms).filter(Number.isFinite);
    const worstMs = durations.length ? Math.max(...durations) : null;
    const invalidDuration = rows.some(row => !Number.isFinite(row.ms) || row.ms < 0);
    const failed = rows.some(row => row.status === 'FAIL') || invalidDuration || (worstMs !== null && worstMs > limitMs);
    const completed = rows.length === expected && rows.every(row => row.status === 'PASS');
    return { operation, label, expected, runs: rows.filter(row => row.status === 'PASS' || row.status === 'FAIL').length,
      attempted: rows.length, worstMs, limitMs, status: failed ? 'FAIL' : completed ? 'PASS' : 'INCOMPLETE' };
  });
}
export async function measured(report, operation, round, task, clock = () => performance.now()) {
  const start = clock();
  try {
    const value = await task();
    report.samples.push({ operation, round, ms: clock() - start, status: 'PASS' });
    return value;
  } catch (error) {
    report.samples.push({ operation, round, ms: clock() - start,
      status: error instanceof IncompleteError ? 'INCOMPLETE' : 'FAIL', error: String(error.message || error) });
    throw error;
  }
}
