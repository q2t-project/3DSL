// viewer/runtime/core/normalizeSelection.js
// Phase2: selection normalization (pure)

// kind はこの3つだけ
const ALLOWED_KIND = new Set(["points", "lines", "aux"]);

/**
 * @typedef {'points'|'lines'|'aux'} ElementKind
 * @typedef {{uuid: string|null, kind: ElementKind|null}} SelectionState
 */

/**
 * selection を正規化する（pure）
 *
 * ルール:
 * - uuid が無効 → {uuid:null, kind:null}
 * - visibleSet がある場合:
 *   - uuid が visibleSet 内に無い → {uuid:null, kind:null}
 *   - kind が未指定/不正/不一致なら、visibleSet から推定して付ける
 * - visibleSet が無い場合:
 *   - kind が不正なら structIndex から推定（できなければ kind:null）
 *
 * @param {any} selection
 * @param {object} [ctx]
 * @param {any} [ctx.visibleSet]   // { points:Set, lines:Set, aux:Set } 想定（ReadonlySet でもOK）
 * @param {any} [ctx.structIndex]  // kind 推定用（形いろいろ許容）
 * @returns {SelectionState}
 */
export function normalizeSelection(selection, ctx = {}) {
  const { visibleSet, structIndex } = ctx;

  const { uuid, kind } = coerceSelection(selection);
  if (!isValidUuid(uuid)) return pack(null, null);

  // visibleSet があるなら「見えてるか」を最優先
  if (visibleSet && typeof visibleSet === "object") {
    const hits = kindsInVisibleSet(uuid, visibleSet);
    if (hits.length === 0) return pack(null, null);

    // kind が妥当かつ visibleSet と整合してるならそれを尊重
    if (ALLOWED_KIND.has(kind) && hits.includes(kind)) {
      return pack(uuid, kind);
    }

    // そうでなければ visibleSet から推定（基本は一意のはず）
    return pack(uuid, hits[0]);
  }

  // visibleSet が無い場合：kind が妥当ならそのまま
  if (ALLOWED_KIND.has(kind)) return pack(uuid, kind);

  // 推定（できたら付ける / できなければ kind:null）
  const inferred = inferKindFromStructIndex(uuid, structIndex);
  return pack(uuid, inferred);
}

// ------------------------------------------------------------
// helpers (pure)
// ------------------------------------------------------------

function coerceSelection(selection) {
  // string を直接渡されても救う
  if (typeof selection === "string") {
    return { uuid: selection, kind: null };
  }
  if (!selection || typeof selection !== "object") {
    return { uuid: null, kind: null };
  }
  const uuid = typeof selection.uuid === "string" ? selection.uuid : null;
  const kind = typeof selection.kind === "string" ? selection.kind : null;
  return { uuid, kind };
}

function isValidUuid(uuid) {
  // 厳密 UUID 判定は別レイヤでOK。ここは「文字列として成立」だけ見る。
  return typeof uuid === "string" && uuid.length > 0;
}

function pack(uuid, kind) {
  const u = typeof uuid === "string" && uuid.length ? uuid : null;
  const k = ALLOWED_KIND.has(kind) ? kind : null;
  return { uuid: u, kind: k };
}

function kindsInVisibleSet(uuid, visibleSet) {
  const hits = [];
  if (hasIn(visibleSet.points, uuid)) hits.push("points");
  if (hasIn(visibleSet.lines, uuid)) hits.push("lines");
  if (hasIn(visibleSet.aux, uuid)) hits.push("aux");
  return hits;
}

function hasIn(container, key) {
  if (!container) return false;

  // Set / ReadonlySet / Map
  if (typeof container.has === "function") {
    try {
      return !!container.has(key);
    } catch (_e) {
      return false;
    }
  }

  // plain object map
  if (typeof container === "object") {
    return Object.prototype.hasOwnProperty.call(container, key);
  }

  return false;
}

function inferKindFromStructIndex(uuid, structIndex) {
  if (!structIndex) return null;

  // 1) 関数 API
  if (typeof structIndex.getKind === "function") {
    const k = safeCall(structIndex.getKind, structIndex, uuid);
    return ALLOWED_KIND.has(k) ? k : null;
  }
  if (typeof structIndex.kindOf === "function") {
    const k = safeCall(structIndex.kindOf, structIndex, uuid);
    return ALLOWED_KIND.has(k) ? k : null;
  }

  // 2) uuid→kind (Map / object)
  const u2k = structIndex.uuidToKind;
  if (u2k) {
    if (typeof u2k.get === "function") {
      const k = safeCall(u2k.get, u2k, uuid);
      return ALLOWED_KIND.has(k) ? k : null;
    }
    if (typeof u2k === "object") {
      const k = u2k[uuid];
      return ALLOWED_KIND.has(k) ? k : null;
    }
  }

  // 3) uuid→item record から kind を拾う（Map / object）
  const u2i = structIndex.uuidToItem;
  if (u2i) {
    if (typeof u2i.get === "function") {
      const rec = safeCall(u2i.get, u2i, uuid);
      const k = rec?.kind ?? rec?.type ?? rec?.item?.kind ?? null;
      return ALLOWED_KIND.has(k) ? k : null;
    }
    if (typeof u2i === "object") {
      const rec = u2i[uuid];
      const k = rec?.kind ?? rec?.type ?? rec?.item?.kind ?? null;
      return ALLOWED_KIND.has(k) ? k : null;
    }
  }

  // 4) よくある保持形を推測（Map / object どっちでも）
  if (hasIn(structIndex.pointsByUuid, uuid)) return "points";
  if (hasIn(structIndex.linesByUuid, uuid)) return "lines";
  if (hasIn(structIndex.auxByUuid, uuid)) return "aux";

  if (structIndex.points && hasIn(structIndex.points.byUuid, uuid)) return "points";
  if (structIndex.lines && hasIn(structIndex.lines.byUuid, uuid)) return "lines";
  if (structIndex.aux && hasIn(structIndex.aux.byUuid, uuid)) return "aux";

  if (hasIn(structIndex.points, uuid)) return "points";
  if (hasIn(structIndex.lines, uuid)) return "lines";
  if (hasIn(structIndex.aux, uuid)) return "aux";

  return null;
}

function safeCall(fn, thisArg, arg) {
  try {
    return fn.call(thisArg, arg);
  } catch (_e) {
    return null;
  }
}
