// renderer/adapters/compat.js
// 目的: 形揺れ吸収（入力の揺れ）を renderer 本体から隔離する

export const END_A_KEYS = [
  "end_a","endA","a","from","source","src","start",
  "point_a","pointA","p0","pA",
  "end_a_uuid","a_uuid","start_uuid","from_uuid","src_uuid",
];

export const END_B_KEYS = [
  "end_b","endB","b","to","target","dst","end",
  "point_b","pointB","p1","pB",
  "end_b_uuid","b_uuid","end_uuid","to_uuid","dst_uuid",
];

export function pickLineEndpoint(line, keys) {
  if (!line) return undefined;

  // appearance 優先
  for (const k of keys) {
    if (line.appearance && Object.prototype.hasOwnProperty.call(line.appearance, k)) {
      return line.appearance[k];
    }
  }

  // appearance.endpoints が [a,b] みたいな配列のパターン救済
  const aepsAny = line.appearance?.endpoints;
  if (Array.isArray(aepsAny) && aepsAny.length >= 2) {
    const wantsA = keys === END_A_KEYS;
    return wantsA ? aepsAny[0] : aepsAny[1];
  }

  // appearance.endpoints 配下
  const aeps =
    (line.appearance?.endpoints && typeof line.appearance.endpoints === "object")
      ? line.appearance.endpoints
      : null;
  if (aeps) {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(aeps, k)) return aeps[k];
    }
    // よくある a/b
    if (keys === END_A_KEYS && Object.prototype.hasOwnProperty.call(aeps, "a")) return aeps.a;
    if (keys === END_B_KEYS && Object.prototype.hasOwnProperty.call(aeps, "b")) return aeps.b;
    if (keys === END_A_KEYS && Object.prototype.hasOwnProperty.call(aeps, "from")) return aeps.from;
    if (keys === END_B_KEYS && Object.prototype.hasOwnProperty.call(aeps, "to")) return aeps.to;
  }

  // geometry / endpoints 配下
  const geo = (line.geometry && typeof line.geometry === "object") ? line.geometry : null;
  const eps = (line.endpoints && typeof line.endpoints === "object") ? line.endpoints : null;
  for (const k of keys) {
    if (geo && Object.prototype.hasOwnProperty.call(geo, k)) return geo[k];
    if (eps && Object.prototype.hasOwnProperty.call(eps, k)) return eps[k];
  }

  // top-level
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(line, k)) return line[k];
  }

  return undefined;
}

export function collectStringsShallow(obj, max = 64) {
  const out = [];
  const stack = [obj];
  while (stack.length && out.length < max) {
    const v = stack.pop();
    if (typeof v === "string") { out.push(v); continue; }
    if (!v || typeof v !== "object") continue;
    if (Array.isArray(v)) { for (const it of v) stack.push(it); continue; }
    for (const k of Object.keys(v)) stack.push(v[k]);
  }
  return out;
}

export function readPointPos(p, readVec3) {
  // readVec3 は context.js 側から注入（three依存をここに持ち込まん）
  return readVec3(
    p?.appearance?.position ??
    p?.position ??
    p?.pos ??
    p?.xyz ??
    p?.geometry?.position ??
    p?.geometry?.pos ??
    p?.meta?.position ??
    p?.meta?.pos ??
    null,
    null
  );
}

export function pickUuidCompat(obj) {
  const raw =
    obj?.uuid ??
    obj?.meta?.uuid ??
    obj?.meta_uuid ??
    obj?.id ??
    obj?.meta?.id ??
    obj?.ref_uuid ??
    obj?.meta?.ref_uuid ??
    null;

  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? t : null;
  }
  if (raw != null) {
    const t = String(raw).trim();
    return t ? t : null;
  }
  return null;
}
