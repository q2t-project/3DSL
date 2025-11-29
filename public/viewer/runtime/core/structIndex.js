// runtime/core/structIndex.js

// 3DSS ノード共通ヘルパ ------------------------------

function getUuid(node) {
  if (!node || typeof node !== "object") return null;
  if (typeof node.meta?.uuid === "string" && node.meta.uuid) return node.meta.uuid;
  if (typeof node.uuid === "string" && node.uuid) return node.uuid;
  return null;
}

// frames は number か number[] を想定
function normalizeFrames(frames) {
  if (typeof frames === "number" && Number.isFinite(frames)) {
    return [Math.trunc(frames)];
  }
  if (Array.isArray(frames)) {
    const out = [];
    for (const v of frames) {
      if (typeof v === "number" && Number.isFinite(v)) {
        out.push(Math.trunc(v));
      }
    }
    return out;
  }
  return [];
}

function scanFramesFromNode(node, update) {
  if (!node || typeof node !== "object") return;

  if ("frames" in node) {
    update(normalizeFrames(node.frames));
  }
  if (node.appearance && "frames" in node.appearance) {
    update(normalizeFrames(node.appearance.frames));
  }
}

// ----------------------------------------------------
// uuid index 構築
// ----------------------------------------------------

/**
 * 3DSS ドキュメントから uuid index を構築する。
 *
 * 戻り値の shape（現時点の仕様）:
 *
 * {
 *   uuidToKind:   Map<string, "points"|"lines"|"aux">,
 *   pointsByUuid: Map<string, PointNode>,
 *   linesByUuid:  Map<string, LineNode>,
 *   auxByUuid:    Map<string, AuxNode>,
 * }
 *
 * 既存コードは uuidToKind だけ使っているので、
 * 他フィールドは将来用の拡張。
 */
export function buildUUIDIndex(document) {
  const uuidToKind   = new Map();
  const pointsByUuid = new Map();
  const linesByUuid  = new Map();
  const auxByUuid    = new Map();

  function addAll(array, kind, byUuid) {
    if (!Array.isArray(array)) return;

    for (const node of array) {
      const uuid = getUuid(node);
      if (typeof uuid !== "string" || !uuid) continue;

      // 同一 uuid が複数あった場合は最初のものを優先
      if (!uuidToKind.has(uuid)) {
        uuidToKind.set(uuid, kind);
        byUuid.set(uuid, node);
      }
    }
  }

  addAll(document?.points, "points", pointsByUuid);
  addAll(document?.lines,  "lines",  linesByUuid);
  addAll(document?.aux,    "aux",    auxByUuid);

  return {
    uuidToKind,
    pointsByUuid,
    linesByUuid,
    auxByUuid,
  };
}

// ----------------------------------------------------
// frame range 検出
// ----------------------------------------------------

/**
 * ドキュメント全体の frames の最小値・最大値を検出する。
 * frames が一つも無い場合は {min:0, max:0} を返す。
 */
export function detectFrameRange(document) {
  let hasAny = false;
  let min = 0;
  let max = 0;

  function updateFrom(framesArr) {
    for (const v of framesArr) {
      if (!Number.isFinite(v)) continue;
      if (!hasAny) {
        min = max = v;
        hasAny = true;
      } else {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }

  const visitArray = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const node of arr) {
      scanFramesFromNode(node, updateFrom);
    }
  };

  visitArray(document?.points);
  visitArray(document?.lines);
  visitArray(document?.aux);

  if (!hasAny) {
    return { min: 0, max: 0 };
  }

  // 仕様上の推奨範囲に軽くクランプ（-9999〜9999）
  const clamp = (v) => {
    if (!Number.isFinite(v)) return 0;
    if (v < -9999) return -9999;
    if (v >  9999) return  9999;
    return v;
  };

  return {
    min: clamp(min),
    max: clamp(max),
  };
}
