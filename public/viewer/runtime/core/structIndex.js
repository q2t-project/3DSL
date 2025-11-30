// runtime/core/structIndex.js

// 3DSS ドキュメントから「よく使う索引」をまとめて構築する。
// buildUUIDIndex(document) の返り値（structIndex）の構造：
//
// {
//   // 1) UUID → kind
//   //    - "points" | "lines" | "aux" のいずれか
//   uuidToKind: Map<string, "points" | "lines" | "aux">,
//
//   // 2) UUID → { kind, item }
//   //    - 元の 3DSS 要素本体へのポインタ
//   uuidToItem: Map<string, { kind: "points" | "lines" | "aux", item: any }>,
//
//   // 3) points 用： UUID → position [x,y,z]
//   //    - appearance.position をそのまま格納（数値配列のみ）
//   pointPosition: Map<string, [number, number, number]>,
//
//   // 3b) aux 用： UUID → position [x,y,z]
//   //    - appearance.position をそのまま格納（数値配列のみ）
//   auxPosition: Map<stre.position をそのまま格納（数値配列のみ）
//   auxPosition: Map<string, [number, number, number]>,//
//
//   // 4) lines 用： UUID → { endA, endB }
//   //    - appearance.end_a / end_b をそのまま格納
//   //    - endX.ref / endX.coord などの解決は別レイヤ（microController 等）で行う
//   lineEndpoints: Map<string, { endA: any, endB: any }>,
//
//   // 5) frameIndex: frame → UUID 集合（kind 別）
//   //    - frameIndex.points: Map<frameNumber, Set<uuid>>
//   //    - frameIndex.lines:  Map<frameNumber, Set<uuid>>
//   //    - frameIndex.aux:    Map<frameNumber, Set<uuid>>
//   frameIndex: {
//     points: Map<number, Set<string>>,
//     lines: Map<number, Set<string>>,
//     aux: Map<number, Set<string>>,
//   },
//
//   // 6) adjacency: 隣接情報（points ↔ lines）
//   //    - pointToLines: pointUuid → Set<lineUuid>
//   //    - lineToPoints: lineUuid → [pointAUuid|null, pointBUuid|null]
//   adjacency: {
//     pointToLines: Map<string, Set<string>>,
//     lineToPoints: Map<string, [string | null, string | null]>,
//   },
//
//   // 7) 既存互換用：UUID → frames の集合
//   //    - 旧実装互換のために残してある
//   uuidToFrames: Map<string, Set<number>>,
// }
//
// ※ structIndex 自体は「document を速く引くための只の索引」であり、
//    UI 状態や three.js のシーンには一切関与しない。

// frames 指定（appearance.frames）を正規化して Set<number> にする。
// - 単一整数 or 配列 の両方を許容。
// - 整数かつ [-9999, 9999] のものだけ採用。
function normalizeFrames(raw) {
  if (raw === undefined || raw === null) return null;

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

// [x, y, z] 形式の配列をざっくり数値化する。
// 条件を満たさなければ null を返す。
function sanitizeVec3(raw) {
  if (!Array.isArray(raw) || raw.length < 3) return null;

  const nx = Number(raw[0]);
  const ny = Number(raw[1]);
  const nz = Number(raw[2]);

  if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) {
    return null;
  }

  return [nx, ny, nz];
}

function addFramesToFrameIndex(frameIndexByKind, uuid, framesSet) {
  if (!framesSet || !(framesSet instanceof Set)) return;

  for (const frame of framesSet) {
    let set = frameIndexByKind.get(frame);
    if (!set) {
      set = new Set();
      frameIndexByKind.set(frame, set);
    }
    set.add(uuid);
  }
}

function addToMultiMap(map, key, value) {
  if (!key) return;
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(value);
}

// 3DSS から structIndex を構築するメイン関数。
export function buildUUIDIndex(document) {
  const uuidToKind = new Map();
  const uuidToItem = new Map();
  const pointPosition = new Map();
  const lineEndpoints = new Map();
  const auxPosition = new Map();
  const uuidToFrames = new Map();

  const frameIndex = {
    points: new Map(),
    lines: new Map(),
    aux: new Map(),
  };

  const adjacency = {
    pointToLines: new Map(),
    lineToPoints: new Map(),
  };

  // 不正な document なら空の index を返して終了。
  if (!document || typeof document !== "object") {
    return {
      uuidToKind,
      uuidToItem,
      pointPosition,
      lineEndpoints,
      auxPosition,
      frameIndex,
      adjacency,
      uuidToFrames,
    };
  }

  // ---- points ----
  if (Array.isArray(document.points)) {
    for (const node of document.points) {
      if (!node || typeof node !== "object") continue;

      const uuid = node?.meta?.uuid;
      if (!uuid) continue;

      uuidToKind.set(uuid, "points");
      uuidToItem.set(uuid, { kind: "points", item: node });

      const pos = sanitizeVec3(node?.appearance?.position);
      if (pos) {
        pointPosition.set(uuid, pos);
      }

      const framesSet = normalizeFrames(node?.appearance?.frames);
      if (framesSet) {
        uuidToFrames.set(uuid, framesSet);
        addFramesToFrameIndex(frameIndex.points, uuid, framesSet);
      }
    }
  }

  // ---- lines ----
  if (Array.isArray(document.lines)) {
    for (const node of document.lines) {
      if (!node || typeof node !== "object") continue;

      const uuid = node?.meta?.uuid;
      if (!uuid) continue;

      uuidToKind.set(uuid, "lines");
      uuidToItem.set(uuid, { kind: "lines", item: node });

      const endA = node?.appearance?.end_a ?? null;
      const endB = node?.appearance?.end_b ?? null;
      lineEndpoints.set(uuid, { endA, endB });

      const framesSet = normalizeFrames(node?.appearance?.frames);
      if (framesSet) {
        uuidToFrames.set(uuid, framesSet);
        addFramesToFrameIndex(frameIndex.lines, uuid, framesSet);
      }

      // adjacency: points ↔ lines
      const refA = endA && typeof endA.ref === "string" ? endA.ref : null;
      const refB = endB && typeof endB.ref === "string" ? endB.ref : null;

      if (refA) addToMultiMap(adjacency.pointToLines, refA, uuid);
      if (refB && refB !== refA) {
        addToMultiMap(adjacency.pointToLines, refB, uuid);
      }

      adjacency.lineToPoints.set(uuid, [refA, refB]);
    }
  }

  // ---- aux ----
  if (Array.isArray(document.aux)) {
    for (const node of document.aux) {
      if (!node || typeof node !== "object") continue;

      const uuid = node?.meta?.uuid;
      if (!uuid) continue;

      uuidToKind.set(uuid, "aux");
      uuidToItem.set(uuid, { kind: "aux", item: node });

      const pos = sanitizeVec3(node?.appearance?.position);
      if (pos) {
        auxPosition.set(uuid, pos);
      }

      const framesSet = normalizeFrames(node?.appearance?.frames);
      if (framesSet) {
        uuidToFrames.set(uuid, framesSet);
        addFramesToFrameIndex(frameIndex.aux, uuid, framesSet);
      }
    }
  }

  return {
    uuidToKind,
    uuidToItem,
    pointPosition,
    lineEndpoints,
    auxPosition,
    frameIndex,
    adjacency,
    uuidToFrames,
  };
}

// appearance.frames 全体をスキャンして [min,max] を返す。
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
      if (!node || typeof node !== "object") continue;

      const framesSet = normalizeFrames(node?.appearance?.frames);
      if (!framesSet) continue;

      for (const frame of framesSet) {
        if (frame < min) min = frame;
        if (frame > max) max = frame;
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
