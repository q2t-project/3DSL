// runtime/core/structIndex.js

// 3DSS から UUID ベースの index を構築する。
// - uuidToKind: uuid -> "points" | "lines" | "aux"
// - uuidToFrames: uuid -> Set<frameNumber>

function normalizeFrames(raw) {
  if (raw === undefined || raw === null) return null;

  // 単一整数 or 配列 の両方を許容
  const values = Array.isArray(raw) ? raw : [raw];

  const set = new Set();
  for (const v of values) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= -9999 && n <= 9999) {
      set.add(n);
    }
  }
  return set.size > 0 ? set : null;
}

export function buildUUIDIndex(document) {
  const uuidToKind = new Map();
  const uuidToFrames = new Map();

  if (!document || typeof document !== "object") {
    return { uuidToKind, uuidToFrames };
  }

  function scanArray(arr, kind) {
    if (!Array.isArray(arr)) return;

    for (const node of arr) {
      const uuid = node?.meta?.uuid;
      if (!uuid) continue;

      uuidToKind.set(uuid, kind);

      const framesSet = normalizeFrames(node?.appearance?.frames);
      if (framesSet) {
        uuidToFrames.set(uuid, framesSet);
      }
    }
  }

  scanArray(document.points, "points");
  scanArray(document.lines, "lines");
  scanArray(document.aux, "aux");

  return {
    uuidToKind,
    uuidToFrames,
  };
}

// appearance.frames を全部スキャンして [min,max] を返す。
// 何も無ければ {0,0}。
export function detectFrameRange(document) {
  if (!document || typeof document !== "object") {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  function scanArray(arr) {
    if (!Array.isArray(arr)) return;

    for (const node of arr) {
      const frames = node?.appearance?.frames;
      if (frames === undefined || frames === null) continue;

      const values = Array.isArray(frames) ? frames : [frames];
      for (const v of values) {
        const n = Number(v);
        if (!Number.isInteger(n)) continue;
        if (n < -9999 || n > 9999) continue;

        if (n < min) min = n;
        if (n > max) max = n;
      }
    }
  }

  scanArray(document.points);
  scanArray(document.lines);
  scanArray(document.aux);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }

  return { min, max };
}
