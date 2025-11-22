// ============================================================
// structIndex.js
// 3DSS 構造データ用ユーティリティ
//   - uuid → { kind, index, ref } のインデックス
//   - frames から min/max を検出
// ============================================================

/**
 * 3DSS 構造から uuid インデックスを構築
 * @param {Object} struct
 * @returns {Map<string,{kind:'point'|'line'|'aux', index:number, ref:Object}>}
 */
export function buildUUIDIndex(struct) {
  /** @type {Map<string,{kind:'point'|'line'|'aux', index:number, ref:Object}>} */
  const map = new Map();
  if (!struct || typeof struct !== "object") return map;

  if (Array.isArray(struct.points)) {
    struct.points.forEach((p, i) => {
      const uuid = p?.meta?.uuid ?? p?.meta?.uuid_v4;
      if (uuid) {
        map.set(uuid, { kind: "point", index: i, ref: p });
      }
    });
  }

  if (Array.isArray(struct.lines)) {
    struct.lines.forEach((l, i) => {
      const uuid = l?.meta?.uuid;
      if (uuid) {
        map.set(uuid, { kind: "line", index: i, ref: l });
      }
    });
  }

  if (Array.isArray(struct.aux)) {
    struct.aux.forEach((a, i) => {
      const uuid = a?.meta?.uuid;
      if (uuid) {
        map.set(uuid, { kind: "aux", index: i, ref: a });
      }
    });
  }

  return map;
}

/**
 * frames プロパティから min/max を検出
 * frames: number | number[] | undefined
 * @param {Object} struct
 * @returns {{min:number,max:number}}
 */
export function detectFrameRange(struct) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  const scanFrames = (frames) => {
    if (frames == null) return;
    if (typeof frames === "number" && Number.isInteger(frames)) {
      min = Math.min(min, frames);
      max = Math.max(max, frames);
      return;
    }
    if (Array.isArray(frames)) {
      for (const f of frames) {
        if (typeof f === "number" && Number.isInteger(f)) {
          min = Math.min(min, f);
          max = Math.max(max, f);
        }
      }
    }
  };

  (struct?.points || []).forEach((p) => scanFrames(p?.appearance?.frames));
  (struct?.lines || []).forEach((l) => scanFrames(l?.appearance?.frames));
  (struct?.aux || []).forEach((a) => scanFrames(a?.appearance?.frames));

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }
  return { min, max };
}
