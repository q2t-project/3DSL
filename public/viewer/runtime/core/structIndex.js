// runtime/core/structIndex.js

// 3DSS ドキュメントから「よく使う索引」をまとめて構築する。
// buildUUIDIndex(doc) の返り値（structIndex）の構造：
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
//   auxPosition: Map<string, [number, number, number]>,
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
//
//   // 8) シーン全体の境界（points / aux / lines の coord をざっくり全部含めたもの）
//   //    - center: [x,y,z]
//   //    - radius: number（バウンディングボックス対角線の半分）
//   //    - min/max: [x,y,z]
//   //   bounds: {
//   //     center: [number, number, number],
//   //     radius: number,
//   //     min: [number, number, number],
//   //     max: [number, number, number],
//   //   },
//   //
//   //   // 互換 alias（旧 worldBounds / getWorldBounds 呼び出し用）
//   //   worldBounds: bounds,
//   //
//   //   // 9) bounds を取り出すヘルパ
//   //   //    - 将来内部表現を変えてもここから取れば OK
//   //   getSceneBounds(): { center, radius, min, max },
//   //   getWorldBounds(): { center, radius, min, max },
//
//   // 10) lines 用の意味プロファイル
//   //   - relation: { family, kind, raw }
//   //   - sense: "a_to_b" | "b_to_a" | "bidirectional" | "neutral"
//   //   - lineType:  "straight" | "polyline" | ...
//   //   - lineStyle: "solid" | "dashed" | ...
//   //   - effect:    { effect_type, amplitude, speed,... } | null
//   //   - frames:    Set<number> | null
//   lineProfile: Map<string, {
//     relation: { family: string, kind: string | null, raw: any | null } | null,
//     sense: string,
//     lineType: string,
//     lineStyle: string,
//     effect: any | null,
//     frames: Set<number> | null,
//   }>,
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
    if (Number.isInteger(n) && n >= -9999 && n <= 9999) set.add(n);
  }
  return set.size > 0 ? set : null;
}

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

export function buildUUIDIndex(doc) {
  const uuidToKind = new Map();
  const uuidToItem = new Map();
  const byUuid = new Map();

  const pointPosition = new Map();
  const lineEndpoints = new Map();
  const auxPosition = new Map();
  const uuidToFrames = new Map();

  const frameIndex = {
    points: new Map(),
    lines: new Map(),
    aux: new Map(),
  };


  // ★ frameIndex の全フレーム union（kind別）
  // computeVisibleSet(activeFrame=null) の高速化用
  const allFrameIndexUuidsByKind = {
    points: new Set(),
    lines: new Set(),
    aux: new Set(),
  };

  // ★ kind を知ってる側から呼ぶラッパ（union も同時に積む）
  function indexFrames(kind, uuid, framesSet) {
    if (!framesSet || !(framesSet instanceof Set)) return;
    addFramesToFrameIndex(frameIndex[kind], uuid, framesSet);
    allFrameIndexUuidsByKind[kind].add(uuid);
  }

  // ★ frames 未指定（= 全フレーム共通）を高速に足せるようにする
  const uuidsWithoutFrames = new Set(); // union
  const uuidsWithoutFramesByKind = {
    points: new Set(),
    lines: new Set(),
    aux: new Set(),
  };

  const adjacency = {
    pointToLines: new Map(),
    lineToPoints: new Map(),
  };
  const lineProfile = new Map();

  // bounds 用
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  function expandBounds(pos) {
    if (!pos || pos.length < 3) return;
    const x = pos[0], y = pos[1], z = pos[2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  // ------------------------------------------------------------
  // lines 用 normalize ヘルパ
  // ------------------------------------------------------------
  const SENSE_VALUES = new Set(["a_to_b", "b_to_a", "bidirectional", "neutral"]);
  const LINE_TYPE_VALUES = new Set([
    "straight",
    "polyline",
    "catmullrom",
    "bezier",
    "arc",
  ]);
  const LINE_STYLE_VALUES = new Set(["solid", "dashed", "dotted", "double", "none"]);
  const EFFECT_TYPE_VALUES = new Set(["none", "pulse", "flow", "glow"]);
  const EASING_VALUES = new Set(["linear", "ease-in", "ease-out", "ease-in-out"]);

  function normalizeSense(raw) {
    if (typeof raw !== "string") return "a_to_b";
    return SENSE_VALUES.has(raw) ? raw : "a_to_b";
  }

  function extractRelationInfo(signification) {
    const rel = signification && signification.relation;
    if (!rel || typeof rel !== "object") {
      return { raw: rel || null, family: null, kind: null };
    }
    const families = ["structural", "dynamic", "logical", "temporal", "meta"];
    for (const f of families) {
      const v = rel[f];
      if (typeof v === "string" && v.length > 0) {
        return { raw: rel, family: f, kind: v };
      }
    }
    return { raw: rel, family: null, kind: null };
  }

  function inferDefaultEffectType(family, kind) {
    if (family === "dynamic") {
      if (kind === "flow") return "flow";
      if (kind === "causal") return "glow";
      if (kind === "feedback" || kind === "recursion") return "pulse";
    }
    if (family === "temporal") {
      if (kind === "precedence" || kind === "succession") return "flow";
    }
    return "none";
  }

  function normalizeLineType(raw) {
    if (typeof raw !== "string") return "straight";
    return LINE_TYPE_VALUES.has(raw) ? raw : "straight";
  }

  function normalizeLineStyle(raw) {
    if (typeof raw !== "string") return "solid";
    return LINE_STYLE_VALUES.has(raw) ? raw : "solid";
  }

  function normalizeEffect(rawEffect, relationInfo) {
    const base = {
      effect_type: "none",
      amplitude: 1,
      speed: 1,
      duration: 1,
      loop: true,
      phase: 0,
      easing: "linear",
      width: 1,
    };

    if (rawEffect && typeof rawEffect === "object") {
      if (
        typeof rawEffect.effect_type === "string" &&
        EFFECT_TYPE_VALUES.has(rawEffect.effect_type)
      ) {
        base.effect_type = rawEffect.effect_type;
      }

      if (typeof rawEffect.amplitude === "number") {
        base.amplitude = rawEffect.amplitude;
      }
      if (typeof rawEffect.speed === "number") {
        base.speed = rawEffect.speed;
      }
      if (typeof rawEffect.duration === "number") {
        base.duration = rawEffect.duration;
      }
      if (typeof rawEffect.loop === "boolean") {
        base.loop = rawEffect.loop;
      }
      if (typeof rawEffect.phase === "number") {
        base.phase = rawEffect.phase;
      }
      if (
        typeof rawEffect.easing === "string" &&
        EASING_VALUES.has(rawEffect.easing)
      ) {
        base.easing = rawEffect.easing;
      }
      if (typeof rawEffect.width === "number") {
        base.width = rawEffect.width;
      }
    } else if (relationInfo) {
      const t = inferDefaultEffectType(relationInfo.family, relationInfo.kind);
      base.effect_type = t;
    }

    return base;
  }

  // ------------------------------------------------------------
  // 本体スキャン
  // ------------------------------------------------------------
 // ----（lines normalize ヘルパ群はそのまま）----

  if (doc && typeof doc === "object") {
    // ---- points ----
    if (Array.isArray(doc.points)) {
      for (const node of doc.points) {
        if (!node || typeof node !== "object") continue;

        const uuid = node?.meta?.uuid;
        if (typeof uuid !== "string" || !uuid) continue;

        uuidToKind.set(uuid, "points");
        uuidToItem.set(uuid, { kind: "points", item: node });
        byUuid.set(uuid, node);

        const pos = sanitizeVec3(node?.appearance?.position);
        if (pos) {
          pointPosition.set(uuid, pos);
          expandBounds(pos);
        }

        const framesSet = normalizeFrames(node?.appearance?.frames ?? node?.frames);
        if (framesSet) {
          uuidToFrames.set(uuid, framesSet);
          indexFrames("points", uuid, framesSet);
        } else {
          uuidsWithoutFrames.add(uuid);
          uuidsWithoutFramesByKind.points.add(uuid);
        }
      }
    }

    // ---- aux ----
    if (Array.isArray(doc.aux)) {
      for (const node of doc.aux) {
        if (!node || typeof node !== "object") continue;

        const uuid = node?.meta?.uuid;
        if (typeof uuid !== "string" || !uuid) continue;

        uuidToKind.set(uuid, "aux");
        uuidToItem.set(uuid, { kind: "aux", item: node });
        byUuid.set(uuid, node);

        const pos = sanitizeVec3(node?.appearance?.position);
        if (pos) {
          auxPosition.set(uuid, pos);
          expandBounds(pos);
        }

        const framesSet = normalizeFrames(node?.appearance?.frames ?? node?.frames);
        if (framesSet) {
          uuidToFrames.set(uuid, framesSet);
          indexFrames("aux", uuid, framesSet);
        } else {
          uuidsWithoutFrames.add(uuid);
          uuidsWithoutFramesByKind.aux.add(uuid);
        }
      }
    }

    // ---- lines ----
    if (Array.isArray(doc.lines)) {
      for (const node of doc.lines) {
        if (!node || typeof node !== "object") continue;

        const uuid = node?.meta?.uuid;
        if (typeof uuid !== "string" || !uuid) continue;

        uuidToKind.set(uuid, "lines");
        uuidToItem.set(uuid, { kind: "lines", item: node });
        byUuid.set(uuid, node);

        const endA = node?.appearance?.end_a ?? null;
        const endB = node?.appearance?.end_b ?? null;
        lineEndpoints.set(uuid, { endA, endB });

        const framesSet = normalizeFrames(node?.appearance?.frames ?? node?.frames);
        if (framesSet) {
          uuidToFrames.set(uuid, framesSet);
          indexFrames("lines", uuid, framesSet);
        } else {
          uuidsWithoutFrames.add(uuid);
          uuidsWithoutFramesByKind.lines.add(uuid);
        }

        const refA = endA && typeof endA.ref === "string" ? endA.ref : null;
        const refB = endB && typeof endB.ref === "string" ? endB.ref : null;

        if (refA) addToMultiMap(adjacency.pointToLines, refA, uuid);
        if (refB && refB !== refA) addToMultiMap(adjacency.pointToLines, refB, uuid);
        adjacency.lineToPoints.set(uuid, [refA, refB]);

        const coordA = endA && sanitizeVec3(endA.coord);
        if (coordA) expandBounds(coordA);
        const coordB = endB && sanitizeVec3(endB.coord);
        if (coordB) expandBounds(coordB);


        // ★ lineProfile 構築
        const sig = node.signification || {};
        const relationInfo = extractRelationInfo(sig);
        const sense = normalizeSense(sig.sense);
        const lineType = normalizeLineType(node?.appearance?.line_type);
        const lineStyle = normalizeLineStyle(node?.appearance?.line_style);
        const effect = normalizeEffect(node?.appearance?.effect, relationInfo);

        lineProfile.set(uuid, {
          relation: relationInfo,
          sense,
          lineType,
          lineStyle,
          effect,
          frames: framesSet || null,
        });
      }
    }
  }

  // ★ min/max から bounds を確定
  let bounds;
  if (
    Number.isFinite(minX) &&
    Number.isFinite(minY) &&
    Number.isFinite(minZ) &&
    Number.isFinite(maxX) &&
    Number.isFinite(maxY) &&
    Number.isFinite(maxZ)
  ) {
    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    const centerZ = (minZ + maxZ) * 0.5;

    const dx = maxX - minX;
    const dy = maxY - minY;
    const dz = maxZ - minZ;
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;

    bounds = {
      center: [centerX, centerY, centerZ],
      radius: radius > 0 ? radius : 1,
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    };
  } else {
    // ジオメトリがまったく無い場合のフォールバック
    bounds = {
      center: [0, 0, 0],
      radius: 1,
      min: [0, 0, 0],
      max: [0, 0, 0],
    };
  }

  function getSceneBounds() {
    return bounds;
  }

return {
    uuidToKind,
    uuidToItem,
    byUuid,
    pointPosition,
    lineEndpoints,
    auxPosition,
    frameIndex,
    allFrameIndexUuidsByKind, // ★ 追加
    uuidsWithoutFrames,
    uuidsWithoutFramesByKind,
    adjacency,
    uuidToFrames,
    bounds,
    getSceneBounds,
    worldBounds: bounds,
    getWorldBounds: getSceneBounds,
    lineProfile,
    getKind(uuid) {
      const k = uuidToKind.get(uuid);
      return k === "points" || k === "lines" || k === "aux" ? k : null;
    },
    getItem(uuid) {
      return byUuid.get(uuid) || null;
    },
  };
}

// appearance.frames 全体をスキャンして [min,max] を返す。
// 何も無ければ {0,0}。
export function detectFrameRange(doc) {
  if (!doc || typeof doc !== "object") {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  function scanArray(arr) {
    if (!Array.isArray(arr)) return;

    for (const node of arr) {
      if (!node || typeof node !== "object") continue;

      const framesSet = normalizeFrames(node?.appearance?.frames ?? node?.frames);
      if (!framesSet) continue;

      for (const frame of framesSet) {
        if (frame < min) min = frame;
        if (frame > max) max = frame;
      }
    }
  }

  scanArray(doc.points);
  scanArray(doc.lines);
  scanArray(doc.aux);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }

  return { min, max };
}
