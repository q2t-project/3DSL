// viewer/runtime/core/normalizeMicro.js
// Phase2: microState normalization (pure)

const ALLOWED_KIND = new Set(["points", "lines", "aux"]);

/**
 * @typedef {'points'|'lines'|'aux'} ElementKind
 * @typedef {{uuid: string|null, kind: ElementKind|null}|null} SelectionState
 */

/**
 * microState を正規化する（pure）
 *
 * B適用（契約固定）:
 * - 戻り値は常に object（null 返さない）
 * - focusUuid は string|null
 * - relatedUuids は 常に配列（string[]）
 * - mode!=="micro" のときは focusUuid を必ず null、relatedUuids は [] に落とす
 * - 可視集合(visibleSet) があるなら、focus/related は visible のみ残す
 * - 重複除去 / focus 自身除外 / 上限 maxRelated
 *
 * @param {any} microState
 * @param {object} [ctx]
 * @param {string} [ctx.mode]                      // "micro" 以外なら focus を落とす
 * @param {SelectionState} [ctx.selection]         // fallback focus source
 * @param {any} [ctx.structIndex]                  // kind 推定用（形いろいろ許容）
 * @param {any} [ctx.visibleSet]                   // {points:Set, lines:Set, aux:Set} 想定
 * @param {number} [ctx.maxRelated=256]
 * @returns {object}                               // 入力 microState をベースに focus/related を整形した object
 */
export function normalizeMicro(microState, ctx = {}) {
  const {
    mode = "macro",
    selection = { uuid: null, kind: null },
    structIndex,
    visibleSet,
    maxRelated = 256,
  } = ctx;

  const m = microState && typeof microState === "object" ? microState : {};

  // micro 以外は強制クリア（契約固定）
  if (mode !== "micro") {
    return { ...m, focusUuid: null, relatedUuids: [] };
  }

  const selUuid = selection && typeof selection === "object" ? selection.uuid : null;

  // focus は microState を優先、無ければ selection
  let focusUuid =
    typeof m.focusUuid === "string" && m.focusUuid ? m.focusUuid : selUuid;

  if (typeof focusUuid !== "string" || !focusUuid) {
    return { ...m, focusUuid: null, relatedUuids: [] };
  }

  // focus の存在/可視整合
  const focusKind = inferKind(focusUuid, visibleSet, structIndex);
  if (!focusKind) return { ...m, focusUuid: null, relatedUuids: [] };

  if (visibleSet && !hasIn(visibleSet[focusKind], focusUuid)) {
    return { ...m, focusUuid: null, relatedUuids: [] };
  }

  // related は存在＆可視のみにフィルタ、重複除去、focus 自身は除外、上限
  const src = Array.isArray(m.relatedUuids) ? m.relatedUuids : [];
  const uniq = [];
  const seen = new Set([focusUuid]);

  const cap = Number.isFinite(maxRelated) ? Math.max(0, Math.trunc(maxRelated)) : 256;

  for (const u of src) {
    if (uniq.length >= cap) break;
    if (typeof u !== "string" || !u) continue;
    if (seen.has(u)) continue;

    const k = inferKind(u, visibleSet, structIndex);
    if (!k) continue;

    if (visibleSet && !hasIn(visibleSet[k], u)) continue;

    seen.add(u);
    uniq.push(u);
  }

  return { ...m, focusUuid, relatedUuids: uniq };
}

// ------------------------------------------------------------
// helpers (pure)
// ------------------------------------------------------------

function inferKind(uuid, visibleSet, structIndex) {
  // 1) visibleSet から推定できるなら最優先（ロード済み＆表示中が真実）
  const k1 = inferKindFromVisibleSet(uuid, visibleSet);
  if (k1) return k1;

  // 2) structIndex から推定
  const k2 = inferKindFromStructIndex(uuid, structIndex);
  return k2;
}

function inferKindFromVisibleSet(uuid, visibleSet) {
  if (!visibleSet || typeof visibleSet !== "object") return null;

  // points/lines/aux の順で見つけたやつを返す（基本一意のはず）
  if (hasIn(visibleSet.points, uuid)) return "points";
  if (hasIn(visibleSet.lines, uuid)) return "lines";
  if (hasIn(visibleSet.aux, uuid)) return "aux";
  return null;
}

function inferKindFromStructIndex(uuid, structIndex) {
  if (!structIndex) return null;

  // 関数 API
  if (typeof structIndex.getKind === "function") {
    const k = safeCall(structIndex.getKind, structIndex, uuid);
    return ALLOWED_KIND.has(k) ? k : null;
  }
  if (typeof structIndex.kindOf === "function") {
    const k = safeCall(structIndex.kindOf, structIndex, uuid);
    return ALLOWED_KIND.has(k) ? k : null;
  }

  // uuid→kind (Map / object)
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

  // uuid→item record から拾う（Map / object）
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

  // よくある保持形（Map / object どっちでも）
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

function hasIn(container, key) {
  if (!container) return false;

  if (typeof container.has === "function") {
    try {
      return !!container.has(key);
    } catch (_e) {
      return false;
    }
  }

  if (typeof container === "object") {
    return Object.prototype.hasOwnProperty.call(container, key);
  }

  return false;
}

function safeCall(fn, thisArg, arg) {
  try {
    return fn.call(thisArg, arg);
  } catch (_e) {
    return null;
  }
}
