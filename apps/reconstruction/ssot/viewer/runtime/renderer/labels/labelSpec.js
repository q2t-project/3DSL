// viewer/runtime/renderer/labels/labelSpec.js
//
// marker.text の解釈仕様（viewer 側）

/**
 * @typedef {Object} MarkerTextFontSpec
 * @property {string} [family]
 * @property {"normal"|"italic"|"oblique"} [style]
 * @property {(
 *   "normal"|"bold"|"bolder"|"lighter"|
 *   "100"|"200"|"300"|"400"|"500"|"600"|"700"|"800"|"900"
 * )} [weight]
 */

/**
 * @typedef {Object} MarkerTextSpec
 * @property {string} [content]
 * @property {number} [size]
 * @property {string} [align]
 * @property {{mode:string, front?:string, up?:string, roll?:number}} [pose]
 * @property {string|MarkerTextFontSpec} [font]
 */

export const LABEL_TEXT_DEFAULTS = {
  size: 8,
  align: "center&middle",
  pose: { mode: "billboard", up: "+z", roll: 0 },
  fontToken: "helvetiker_regular",
};

export const LABEL_FONT_DEFAULT_FAMILY =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const ALIGN_HORIZONTAL = new Map([
  ["left", 0],
  ["center", 0.5],
  ["right", 1],
]);

const ALIGN_VERTICAL = new Map([
  ["top", 1],
  ["middle", 0.5],
  ["baseline", 0],
]);

const AXIS_SIGNED = new Set(["+x", "-x", "+y", "-y", "+z", "-z", "x+", "x-", "y+", "y-", "z+", "z-"]);

const FONT_STYLES = new Set(["normal", "italic", "oblique"]);
const FONT_WEIGHTS = new Set([
  "normal",
  "bold",
  "bolder",
  "lighter",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
]);

function toToken(str) {
  return typeof str === "string" ? str.trim().toLowerCase() : "";
}

export function normalizeTextAlign(raw) {
  const s = typeof raw === "string"
    ? raw
        .trim()
        .toLowerCase()
        .replace(/\s*&\s*/g, "&") // "left & top" -> "left&top"
        .replace(/\s+/g, " ")    // normalize spaces
    : "";
  let h = null;
  let v = null;

  if (s) {
    const direct = s.includes("&")
      ? s.split("&").map((t) => t.trim()).filter(Boolean)
      : s.split(" ").map((t) => t.trim()).filter(Boolean);
    if (direct.length === 1) {
      const hv = direct[0];
      if (ALIGN_HORIZONTAL.has(hv)) {
        h = hv;
        v = "middle";
      }
    } else if (direct.length === 2) {
      const [hRaw, vRaw] = direct;
      if (ALIGN_HORIZONTAL.has(hRaw) && ALIGN_VERTICAL.has(vRaw)) {
        h = hRaw;
        v = vRaw;
      }
    }
  }

  if (!h || !v) {
    const fallback = LABEL_TEXT_DEFAULTS.align.split("&");
    h = fallback[0];
    v = fallback[1];
  }

  return {
    key: `${h}&${v}`,
    horizontal: h,
    vertical: v,
    x: ALIGN_HORIZONTAL.get(h) ?? 0.5,
    y: ALIGN_VERTICAL.get(v) ?? 0.5,
  };
}

function normalizeAxisSigned(raw, fallback = null) {
  const s = toToken(raw);
  return AXIS_SIGNED.has(s) ? s : fallback;
}

function axisTokenToVec3(token) {
  // Accept both legacy (+x) and shorthand (x+) forms.
  switch (toToken(token)) {
    case "+x":
    case "x+":
      return [1, 0, 0];
    case "-x":
    case "x-":
      return [-1, 0, 0];
    case "+y":
    case "y+":
      return [0, 1, 0];
    case "-y":
    case "y-":
      return [0, -1, 0];
    case "+z":
    case "z+":
      return [0, 0, 1];
    case "-z":
    case "z-":
      return [0, 0, -1];
    default:
      return null;
  }
}

function isVec3Array(v) {
  return Array.isArray(v) && v.length === 3;
}

function normalizeVec3(raw, fallbackVec3) {
  if (isVec3Array(raw)) {
    const x = Number(raw[0]);
    const y = Number(raw[1]);
    const z = Number(raw[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      const len = Math.hypot(x, y, z);
      if (len > 1e-9) return [x / len, y / len, z / len];
    }
  }
  // Allow axis tokens for backwards-compat.
  const fromAxis = axisTokenToVec3(raw);
  if (fromAxis) return fromAxis;

  // fallback is assumed already normalized
  return fallbackVec3;
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize3(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len <= 1e-9) return null;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function round6(n) {
  // stabilize cache keys; avoid noise from float ops
  return Math.round(Number(n) * 1e6) / 1e6;
}

function vecKey(v) {
  return `${round6(v[0])},${round6(v[1])},${round6(v[2])}`;
}

function orthonormalizeFrontUp(front, up, fallbackFront, fallbackUp) {
  // Ensure front/up are unit and non-parallel; produce a right-handed basis.
  const f = normalizeVec3(front, fallbackFront);
  const u0 = normalizeVec3(up, fallbackUp);

  // Reject near-parallel (|dot| ~ 1)
  const d = Math.abs(dot(f, u0));
  if (d > 0.9999) {
    return { front: fallbackFront, up: fallbackUp };
  }

  // right = up x front
  const r = normalize3(cross(u0, f));
  if (!r) {
    return { front: fallbackFront, up: fallbackUp };
  }

  // up = front x right (recompute to ensure orthonormal)
  const u = normalize3(cross(f, r));
  if (!u) {
    return { front: fallbackFront, up: fallbackUp };
  }

  return { front: f, up: u };
}

export function normalizeTextPose(raw) {
  // Canonical runtime shape:
  // - fixed: { mode:"fixed", front:[...], up:[...], key:"fixed|<front>|<up>" }
  // - billboard: { mode:"billboard", up:"+z"|"z+"..., roll:number, key:"billboard|<up>|<roll>" }
  // Stored (3DSS) recommended shape is fixed with vec3 arrays.

  const FIXED_DEFAULT_FRONT = [0, 0, 1];
  const FIXED_DEFAULT_UP = [0, 1, 0];
  const FIXED_DEFAULT = {
    mode: "fixed",
    front: FIXED_DEFAULT_FRONT,
    up: FIXED_DEFAULT_UP,
    key: `fixed|${vecKey(FIXED_DEFAULT_FRONT)}|${vecKey(FIXED_DEFAULT_UP)}`,
  };

  // String presets
  if (typeof raw === "string") {
    const plane = toToken(raw);
    if (plane === "billboard") {
      return { mode: "billboard", up: "+z", roll: 0, key: "billboard|+z|0" };
    }
    if (plane === "xy") {
      return { ...FIXED_DEFAULT };
    }
    if (plane === "yz") {
      const f = [1, 0, 0];
      const u = [0, 1, 0];
      return { mode: "fixed", front: f, up: u, key: `fixed|${vecKey(f)}|${vecKey(u)}` };
    }
    if (plane === "zx") {
      const f = [0, 1, 0];
      const u = [0, 0, 1];
      return { mode: "fixed", front: f, up: u, key: `fixed|${vecKey(f)}|${vecKey(u)}` };
    }
  }

  // Object forms
  if (raw && typeof raw === "object") {
    const mode = toToken(raw.mode);

    // 1) Spec-conform fixed pose: {front:[...], up:[...]} (no mode) も fixed として扱う
    if (!mode && (raw.front != null || raw.up != null)) {
      const { front, up } = orthonormalizeFrontUp(raw.front, raw.up, FIXED_DEFAULT_FRONT, FIXED_DEFAULT_UP);
      return { mode: "fixed", front, up, key: `fixed|${vecKey(front)}|${vecKey(up)}` };
    }

    // 2) Legacy fixed: {mode:"fixed", front:"+z", up:"+y"} or vec3 arrays
    if (mode === "fixed") {
      const { front, up } = orthonormalizeFrontUp(raw.front, raw.up, FIXED_DEFAULT_FRONT, FIXED_DEFAULT_UP);
      return { mode: "fixed", front, up, key: `fixed|${vecKey(front)}|${vecKey(up)}` };
    }

    // 3) Billboard (kept for markers that explicitly want it)
    if (mode === "billboard") {
      const upAxis = normalizeAxisSigned(raw.up, "+z");
      const roll = Number(raw.roll);
      const safeRoll = Number.isFinite(roll) ? Math.round(roll * 1000) / 1000 : 0;
      return { mode: "billboard", up: upAxis, roll: safeRoll, key: `billboard|${upAxis}|${safeRoll}` };
    }
  }

  // Default:
  // - pose omitted: follow viewer default (billboard)
  // - pose provided but invalid: keep it fixed-default to avoid silently switching to billboard
  if (raw == null) {
    return { mode: "billboard", up: "+z", roll: 0, key: "billboard|+z|0" };
  }
  return { ...FIXED_DEFAULT };
}

export function normalizeTextSize(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return LABEL_TEXT_DEFAULTS.size;
  return n;
}

export function normalizeTextFont(raw, fallbackFamily = LABEL_FONT_DEFAULT_FAMILY) {
  if (raw && typeof raw === "object") {
    const fam = typeof raw.family === "string" ? raw.family.trim() : "";
    if (fam) {
      const style = toToken(raw.style) || "normal";
      const weight = toToken(raw.weight) || "normal";
      const normalized = {
        family: fam,
        style: FONT_STYLES.has(style) ? style : "normal",
        weight: FONT_WEIGHTS.has(weight) ? weight : "normal",
      };
      normalized.key = `${normalized.style}|${normalized.weight}|${normalized.family}`;
      return normalized;
    }
  }

  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s || s === LABEL_TEXT_DEFAULTS.fontToken) {
    return {
      family: fallbackFamily,
      style: "normal",
      weight: "normal",
      key: `normal|normal|${fallbackFamily}`,
    };
  }

  let rest = s;
  let style = null;
  let weight = null;
  for (let i = 0; i < 2; i += 1) {
    const match = rest.match(/^(\S+)\s+(.*)$/);
    if (!match) break;
    const token = toToken(match[1]);
    const next = match[2];

    if (!style && FONT_STYLES.has(token)) {
      style = token;
      rest = next;
      continue;
    }
    if (!weight && FONT_WEIGHTS.has(token)) {
      weight = token;
      rest = next;
      continue;
    }
    break;
  }

  const family = rest.trim() || s;
  const normalized = {
    family,
    style: style || "normal",
    weight: weight || "normal",
  };
  normalized.key = `${normalized.style}|${normalized.weight}|${normalized.family}`;
  return normalized;
}

export function buildCanvasFont(fontSpec, fontPx) {
  const style = fontSpec?.style || "normal";
  const weight = fontSpec?.weight || "normal";
  const family = fontSpec?.family || LABEL_FONT_DEFAULT_FAMILY;
  return `${style} ${weight} ${fontPx}px ${family}`;
}
