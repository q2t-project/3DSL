// renderer/adapters/compat.js
//
// 目的: 入力データの「形揺れ吸収（互換）」を renderer 本体から隔離する。
//       three.js 依存は持ち込まず、必要なら呼び出し側から関数注入する。

const hasOwn = (obj, key) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);

function pickOwn(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    if (hasOwn(obj, k)) return obj[k];
  }
  return undefined;
}

function isEndAKeys(keys) {
  // 参照一致が基本（呼び出し側が END_A_KEYS を渡す前提）。
  // 万一別配列が来ても、Aっぽい特徴キーで推定する。
  if (keys === END_A_KEYS) return true;
  if (!Array.isArray(keys)) return false;
  return (
    keys.includes("end_a") ||
    keys.includes("endA") ||
    keys.includes("point_a") ||
    keys.includes("p0") ||
    keys.includes("end_a_uuid")
  );
}

function isEndBKeys(keys) {
  if (keys === END_B_KEYS) return true;
  if (!Array.isArray(keys)) return false;
  return (
    keys.includes("end_b") ||
    keys.includes("endB") ||
    keys.includes("point_b") ||
    keys.includes("p1") ||
    keys.includes("end_b_uuid")
  );
}

function pickFirstDefined(...values) {
  for (const v of values) {
    if (v !== undefined) return v;
  }
  return undefined;
}

function asNonEmptyString(v) {
  if (v == null) return null;
  const s = typeof v === "string" ? v : String(v);
  const t = s.trim();
  return t ? t : null;
}

export const END_A_KEYS = [
  "end_a",
  "endA",
  "a",
  "from",
  "source",
  "src",
  "start",
  "point_a",
  "pointA",
  "p0",
  "pA",
  "end_a_uuid",
  "a_uuid",
  "start_uuid",
  "from_uuid",
  "src_uuid",
];

export const END_B_KEYS = [
  "end_b",
  "endB",
  "b",
  "to",
  "target",
  "dst",
  "end",
  "point_b",
  "pointB",
  "p1",
  "pB",
  "end_b_uuid",
  "b_uuid",
  "end_uuid",
  "to_uuid",
  "dst_uuid",
];

// line から endpoint を拾う（形揺れ吸収）
export function pickLineEndpoint(line, keys) {
  if (!line || typeof line !== "object") return undefined;

  const wantsA = isEndAKeys(keys);
  const wantsB = isEndBKeys(keys);

  // 1) appearance 直下（優先）
  const v0 = pickOwn(line.appearance, keys);
  if (v0 !== undefined) return v0;

  // 2) appearance.endpoints が配列パターン（[a,b]）
  const epsAny = line.appearance?.endpoints;
  if (Array.isArray(epsAny) && epsAny.length >= 2) {
    if (wantsA) return epsAny[0];
    if (wantsB) return epsAny[1];
    // 推定不能なら何も返さない（安全側）
  }

  // 3) appearance.endpoints が object パターン
  const aeps =
    line.appearance?.endpoints && typeof line.appearance.endpoints === "object"
      ? line.appearance.endpoints
      : null;

  if (aeps) {
    const v1 = pickOwn(aeps, keys);
    if (v1 !== undefined) return v1;

    // よくある互換キー
    if (wantsA) {
      if (hasOwn(aeps, "a")) return aeps.a;
      if (hasOwn(aeps, "from")) return aeps.from;
      if (hasOwn(aeps, "start")) return aeps.start;
    } else if (wantsB) {
      if (hasOwn(aeps, "b")) return aeps.b;
      if (hasOwn(aeps, "to")) return aeps.to;
      if (hasOwn(aeps, "end")) return aeps.end;
    }
  }

  // 4) geometry / endpoints 配下
  const geo = line.geometry && typeof line.geometry === "object" ? line.geometry : null;
  const eps = line.endpoints && typeof line.endpoints === "object" ? line.endpoints : null;

  const v2 = pickOwn(geo, keys);
  if (v2 !== undefined) return v2;

  const v3 = pickOwn(eps, keys);
  if (v3 !== undefined) return v3;

  // 5) top-level
  const v4 = pickOwn(line, keys);
  if (v4 !== undefined) return v4;

  return undefined;
}

// shallow に文字列だけ集める（循環安全 + 上限つき）
export function collectStringsShallow(obj, max = 64) {
  const limit = Math.max(0, Number(max) || 0);
  const out = [];
  if (limit === 0) return out;

  const stack = [obj];
  const visited = typeof WeakSet !== "undefined" ? new WeakSet() : null;

  // 探索ノード数の安全弁（巨大オブジェクトでの暴走防止）
  let steps = 0;
  const stepLimit = Math.max(256, limit * 64);

  while (stack.length && out.length < limit && steps < stepLimit) {
    steps++;
    const v = stack.pop();

    if (typeof v === "string") {
      out.push(v);
      continue;
    }
    if (!v || typeof v !== "object") continue;

    if (visited) {
      if (visited.has(v)) continue;
      visited.add(v);
    }

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) stack.push(v[i]);
      continue;
    }

    // object
    const ks = Object.keys(v);
    for (let i = 0; i < ks.length; i++) {
      stack.push(v[ks[i]]);
    }
  }

  return out;
}

// point の position 系を形揺れ込みで読む
export function readPointPos(p, readVec3) {
  // readVec3 は呼び出し側から注入（three.js 依存をここに入れない）
  return readVec3(
    pickFirstDefined(
      p?.appearance?.position,
      p?.position,
      p?.pos,
      p?.xyz,
      p?.geometry?.position,
      p?.geometry?.pos,
      p?.meta?.position,
      p?.meta?.pos,
      null
    ),
    null
  );
}

// uuid / id の形揺れ吸収
export function pickUuidCompat(obj) {
  const raw = pickFirstDefined(
    obj?.uuid,
    obj?.meta?.uuid,
    obj?.meta_uuid,
    obj?.id,
    obj?.meta?.id,
    obj?.ref_uuid,
    obj?.meta?.ref_uuid,
    null
  );
  return asNonEmptyString(raw);
}
