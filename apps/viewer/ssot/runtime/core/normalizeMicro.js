// viewer/runtime/core/normalizeMicro.js
//
// 役割：uiState.microState を mode / selection / visibleSet に整合させる。
// ポイント：microState が無い場合でも、micro モード + selection があるなら
//           最低限の microState を生成して “microState missing” を防ぐ。
// 禁止：ここで visibleSet を計算しない（それは recomputeVisibleSet の仕事）。

const KIND_SET = new Set(["points", "lines", "aux"]);

function readVec3(v, fallback = null) {
  if (Array.isArray(v) && v.length >= 3) {
    return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
  }
  if (v && typeof v === "object") {
    if ("x" in v || "y" in v || "z" in v) {
      return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
    }
  }
  return fallback;
}

function hasIn(setLike, uuid) {
  if (!setLike || !uuid) return false;
  try {
    if (setLike instanceof Set) return setLike.has(uuid);
    if (typeof setLike.has === "function") return !!setLike.has(uuid);
  } catch (_e) {}
  return false;
}

function isVisibleUuid(uuid, visibleSet) {
  if (!visibleSet || !uuid) return true; // visibleSet 未設定時は安全側で true

  // legacy: visibleSet が Set の場合
  if (visibleSet instanceof Set) return visibleSet.has(uuid);
  if (typeof visibleSet.has === "function") return !!visibleSet.has(uuid);
  if (typeof visibleSet === "object") {
    return (
      hasIn(visibleSet.points, uuid) ||
      hasIn(visibleSet.lines, uuid) ||
      hasIn(visibleSet.aux, uuid)
    );
  }
  return true;
}

function inferKind(uuid, visibleSet, structIndex) {
  if (!uuid) return null;

  if (visibleSet && typeof visibleSet === "object") {
    if (hasIn(visibleSet.points, uuid)) return "points";
    if (hasIn(visibleSet.lines, uuid)) return "lines";
    if (hasIn(visibleSet.aux, uuid)) return "aux";
  }

  const u2i = structIndex?.uuidToItem;
  if (u2i && typeof u2i.get === "function") {
    try {
      const rec = u2i.get(uuid);
      const k = rec?.kind ?? rec?.type ?? rec?.item?.kind ?? null;
      return KIND_SET.has(k) ? k : null;
    } catch (_e) {}
  }
  return null;
}

function getItemByUuid(structIndex, uuid) {
  const u2i = structIndex?.uuidToItem;
  if (!u2i || typeof u2i.get !== "function") return null;
  try {
    const rec = u2i.get(uuid);
    const node =
      rec?.item ??
      rec?.point ??
      rec?.line ??
      rec?.aux ??
      rec?.data ??
      rec?.value ??
      rec;
    return node && typeof node === "object" ? node : null;
  } catch (_e) {
    return null;
  }
}

function readPointPosFromItem(p) {
  return readVec3(
    p?.geometry?.position ??
    p?.appearance?.position ??
    p?.position ??
    p?.pos ??
    p?.xyz ??
    null,
    null
  );
}

function readEndpointPos(ep, structIndex) {
  if (!ep) return null;
  // UUID 文字列そのまま（end_a_uuid 等の互換）
  if (typeof ep === "string") {
    const u = ep.trim();
    if (!u) return null;
    const p = getItemByUuid(structIndex, u);
    return readPointPosFromItem(p);
  }

  // 直座標優先
  const direct =
    readVec3(ep?.coord ?? ep?.position ?? ep?.pos ?? ep?.xyz ?? null, null);
  if (direct) return direct;

  // ref/uuid 経由
  const ref =
    (typeof ep?.ref === "string" && ep.ref) ||
    (typeof ep?.ref?.uuid === "string" && ep.ref.uuid) ||
    (typeof ep?.uuid === "string" && ep.uuid) ||
    (typeof ep?.id === "string" && ep.id) ||
    null;
  if (!ref) return null;
 const p = getItemByUuid(structIndex, ref);
  return readPointPosFromItem(p);
}

function readLineMidpointFromItem(line, structIndex, lineUuid) {
  if (!line) return null;

  // structIndex が lineEndpoints を持ってるなら最優先（microController と揃える）
  if (lineUuid && structIndex?.lineEndpoints instanceof Map) {
    const ep = structIndex.lineEndpoints.get(lineUuid);
    if (ep) {
      const pa = readEndpointPos(ep.endA ?? ep.end_a ?? ep.a ?? ep.start ?? ep.from ?? null, structIndex);
      const pb = readEndpointPos(ep.endB ?? ep.end_b ?? ep.b ?? ep.end ?? ep.to   ?? null, structIndex);
      if (pa && pb) return [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
    }
  }

  const a =
    line?.end_a ??
    line?.endA ??
    line?.a ??
    line?.start ??
    line?.from ??
    line?.end_a_uuid ??
    line?.endAUuid ??
    line?.a_uuid ??
    line?.aUuid ??
    null;
  const b =
    line?.end_b ??
    line?.endB ??
    line?.b ??
    line?.end ??
    line?.to ??
    line?.end_b_uuid ??
    line?.endBUuid ??
    line?.b_uuid ??
    line?.bUuid ??
    null;
  const pa = readEndpointPos(a, structIndex);
  const pb = readEndpointPos(b, structIndex);
  if (!pa || !pb) return null;
  return [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
}

function computeFallbackLocalBounds(center, structIndex) {
  if (!center) return null;
  const r =
    Number(structIndex?.sceneRadius) ||
    Number(structIndex?.metrics?.radius) ||
    10;
  const s = Math.max(0.25, r * 0.05);
  return { center, size: [s, s, s] };
}

export function normalizeMicro(microState, ctx = {}) {
  const mode = ctx?.mode;
  if (mode !== "micro") return null;

  const selection =
    ctx?.selection && typeof ctx.selection === "object" ? ctx.selection : null;
  const selUuid =
    typeof selection?.uuid === "string" ? selection.uuid.trim() : "";

  const m = microState && typeof microState === "object" ? microState : {};

  const focusUuidRaw =
    typeof m.focusUuid === "string" && m.focusUuid ? m.focusUuid : selUuid;
  const focusUuid = typeof focusUuidRaw === "string" ? focusUuidRaw.trim() : "";
  if (!focusUuid) return null;

  const visibleSet = ctx?.visibleSet ?? null;
  if (!isVisibleUuid(focusUuid, visibleSet)) return null;

  const structIndex = ctx?.structIndex ?? null;

  // microState が無い場合でも生成して返す（ここが今回の詰まり解消ポイント）
  const out =
    microState && typeof microState === "object" ? { ...microState } : {};

  out.focusUuid = focusUuid;

  // kind（任意だが、あると downstream が楽）
  const k0 = selection?.kind;
  const focusKind = KIND_SET.has(k0) ? k0 : inferKind(focusUuid, visibleSet, structIndex);
  if (focusKind) {
    out.focusKind = focusKind;
    if (!out.kind) out.kind = focusKind;
  }

  // relatedUuids を整形（重複除去 + visibleSet filter）
  const relRaw = Array.isArray(out.relatedUuids)
    ? out.relatedUuids
    : Array.isArray(out.related)
      ? out.related
      : [];

  const rel = [];
  const seen = new Set([focusUuid]);
  for (const u0 of relRaw) {
    if (typeof u0 !== "string") continue;
    const u = u0.trim();
    if (!u) continue;
    if (seen.has(u)) continue;
    if (!isVisibleUuid(u, visibleSet)) continue;
    seen.add(u);
    rel.push(u);
  }
  out.relatedUuids = [focusUuid, ...rel];

  // focusPosition を補完
  let pos = readVec3(out.focusPosition, null);

  // points: structIndex.pointPosition を最優先（microController と同じルート）
  if (!pos && focusKind === "points") {
    const pm = structIndex?.pointPosition;
    if (pm instanceof Map) {
      pos = readVec3(pm.get(focusUuid), null);
    }
  }

  if (!pos) {
    const item = getItemByUuid(structIndex, focusUuid);
    pos = readPointPosFromItem(item);
  }

  // lines: structIndex.lineEndpoints から中点（microController と同じルート）
  if (!pos && focusKind === "lines") {
    const lm = structIndex?.lineEndpoints;
    if (lm instanceof Map) {
      const ep = lm.get(focusUuid);
      const a = ep?.endA ?? ep?.end_a ?? ep?.a ?? ep?.start ?? ep?.from ?? null;
      const b = ep?.endB ?? ep?.end_b ?? ep?.b ?? ep?.end   ?? ep?.to   ?? null;
      const pa = readEndpointPos(a, structIndex);
      const pb = readEndpointPos(b, structIndex);
      if (pa && pb) {
        pos = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
      }
    }
  }

  // line の場合は midpoint を試す
  if (!pos && focusKind === "lines") {
    const item = getItemByUuid(structIndex, focusUuid);
    pos = readLineMidpointFromItem(item, structIndex, focusUuid);
  }
  if (pos) out.focusPosition = pos;

  // localBounds を補完（最低限 camera preset が動くよう size を入れる）
  const lb = out.localBounds;
  const hasSize =
    lb &&
    typeof lb === "object" &&
    Array.isArray(lb.size) &&
    lb.size.length >= 3;
  if (!hasSize) {
    const b = computeFallbackLocalBounds(pos, structIndex);
    if (b) out.localBounds = b;
  }

  return out;
}
