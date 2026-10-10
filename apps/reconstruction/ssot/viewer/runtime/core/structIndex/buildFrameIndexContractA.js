// viewer/runtime/core/structIndex/buildFrameIndexContractA.js
//
// Contract A:
// - frameIndex[kind]: Map<frame:number, Set<uuid>>
//   -> frames 指定（配列 or 単一 or frame）で「index 可能」な対象だけ入れる
// - uuidsWithoutFramesByKind[kind]: Set<uuid>
//   -> 「frameIndexに載せない」対象をすべて（frames 未指定 / 空配列 / 無効値 / range 系など）
//
// これで computeVisibleSet の fast path が range 系を落とさない。

const KINDS = ["points", "lines", "aux"];

export function buildFrameIndexContractA(model, structIndex = {}) {
  // 必須コンテナ（computeVisibleSet fast path 条件を満たす）
  structIndex.byUuid ||= new Map();          // uuid -> node
  structIndex.uuidToKind ||= new Map();      // uuid -> kind
  structIndex.frameIndex ||= {
    points: new Map(),
    lines: new Map(),
    aux: new Map(),
  };
  structIndex.uuidsWithoutFramesByKind ||= {
    points: new Set(),
    lines: new Set(),
    aux: new Set(),
  };

  // 既存を作り直すなら一旦クリア（増分更新したいならここは調整）
  for (const k of KINDS) {
    structIndex.frameIndex[k].clear();
    structIndex.uuidsWithoutFramesByKind[k].clear();
  }

  // model 配列を走査して index 構築
  for (const kind of KINDS) {
    const arr = Array.isArray(model?.[kind]) ? model[kind] : [];
    for (const node of arr) {
      const uuid = getUuid(node);
      if (!uuid) continue;

      structIndex.byUuid.set(uuid, node);
      structIndex.uuidToKind.set(uuid, kind);

      const spec = classifyFrameSpec(node);

      if (spec.mode === "indexed") {
        for (const f of spec.frames) {
          let set = structIndex.frameIndex[kind].get(f);
          if (!set) {
            set = new Set();
            structIndex.frameIndex[kind].set(f, set);
          }
          set.add(uuid);
        }
      } else {
        // ★ ここが契約A：range 系も含めて「nonIndexed 枠」にまとめて入れる
        structIndex.uuidsWithoutFramesByKind[kind].add(uuid);
      }
    }
  }

  // 任意：互換API（normalizeSelection/normalizeMicro/旧コードが使うなら）
  if (typeof structIndex.getItem !== "function") {
    structIndex.getItem = (uuid) => structIndex.byUuid.get(uuid) || null;
  }
  if (typeof structIndex.getKind !== "function") {
    structIndex.getKind = (uuid) => structIndex.uuidToKind.get(uuid) || null;
  }

  return structIndex;
}

// ------------------------------------------------------------
// helpers
// ------------------------------------------------------------

function getUuid(node) {
  const u = node?.meta?.uuid ?? node?.uuid;
  return typeof u === "string" && u ? u : null;
}

/**
 * index できるのは「frames指定が “離散フレーム集合” として取れる」場合だけ。
 * range 系は index 不可扱い（= withoutFrames枠へ）
 */
function classifyFrameSpec(node) {
  const app = (node && typeof node === "object" && node.appearance) || {};
  const framesRaw = app.frames ?? node.frames;

  // 1) frames（配列）
  if (Array.isArray(framesRaw)) {
    // 空配列は「指定無し」扱い（全フレーム表示）→ index 不可 → withoutFrames
    if (framesRaw.length === 0) return { mode: "nonIndexed" };

    const frames = new Set();
    let hasValid = false;

    for (const v of framesRaw) {
      const n = toIntOrNull(v);
      if (n === null) continue;
      hasValid = true;
      frames.add(n);
    }

    // 全部無効値なら「指定無し」扱い → withoutFrames
    if (!hasValid) return { mode: "nonIndexed" };

    return { mode: "indexed", frames };
  }

  // 2) frames（単一値）
  if (framesRaw !== undefined && framesRaw !== null) {
    const n = toIntOrNull(framesRaw);
    if (n === null) return { mode: "nonIndexed" }; // 無効値は指定無し扱い
    return { mode: "indexed", frames: new Set([n]) };
  }

  // 3) frame（単一）
  const single = app.frame ?? node.frame;
  if (single !== undefined && single !== null) {
    const n = toIntOrNull(single);
    if (n !== null) return { mode: "indexed", frames: new Set([n]) };
    // 無効値は指定無し扱い
    return { mode: "nonIndexed" };
  }

  // 4) range 系（index 不可）→ 契約Aでは withoutFrames へ
  const fr =
    app.frame_range ||
    app.frameRange ||
    node.frame_range ||
    node.frameRange ||
    null;

  if (fr && typeof fr === "object") return { mode: "nonIndexed" };

  const a0 = app.frame_start ?? node.frame_start;
  const b0 = app.frame_end ?? node.frame_end;
  if (a0 !== undefined || b0 !== undefined) return { mode: "nonIndexed" };

  // 5) 何も指定無し → 全フレーム表示 → withoutFrames
  return { mode: "nonIndexed" };
}

function toIntOrNull(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}
