export function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function createUuid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(16).slice(2, 10);
  const random2 = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${random}${random2}`;
}

export function arrayMove(array, from, to) {
  const arr = [...array];
  const startIndex = from < 0 ? arr.length + from : from;
  if (startIndex >= 0 && startIndex < arr.length) {
    const [item] = arr.splice(startIndex, 1);
    const targetIndex = to < 0 ? arr.length + to : to;
    arr.splice(targetIndex, 0, item);
  }
  return arr;
}

export function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function parseNumber(value, fallback = 0) {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? num : fallback;
}

export function toPrecision(value, decimals = 4) {
  return parseFloat(Number(value).toFixed(decimals));
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeArray3(values, fallback = 0) {
  if (!Array.isArray(values)) {
    return [fallback, fallback, fallback];
  }
  const [x = fallback, y = fallback, z = fallback] = values;
  return [Number(x) || fallback, Number(y) || fallback, Number(z) || fallback];
}

export function padArray3(values, fill = 0) {
  const arr = Array.isArray(values) ? [...values] : [];
  while (arr.length < 3) arr.push(fill);
  return arr.slice(0, 3);
}

export function downloadBlob(data, filename, mime = 'application/json') {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function formatAjvError(error) {
  const path = error.instancePath?.replace(/^\//, '') ?? '';
  return `${path}: ${error.message}`;
}

export function getColumnStatus(value, required = false) {
  if (!required) {
    return 'optional';
  }
  if (value === undefined || value === null || value === '') {
    return 'missing';
  }
  return 'filled';
}

export function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}
