const counters = new Map();
const DEFAULT_WIDTH = 4;

function nextValue(prefix) {
  const next = (counters.get(prefix) || 0) + 1;
  counters.set(prefix, next);
  return next;
}

export function generateId(prefix = 'node') {
  const normalizedPrefix = typeof prefix === 'string' && prefix.trim().length ? prefix.trim() : 'id';
  const value = nextValue(normalizedPrefix);
  return `${normalizedPrefix}-${String(value).padStart(DEFAULT_WIDTH, '0')}`;
}

export function resetIdCounters() {
  counters.clear();
}
