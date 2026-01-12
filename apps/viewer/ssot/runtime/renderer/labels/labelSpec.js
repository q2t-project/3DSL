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

const AXIS_SIGNED = new Set(["+x", "-x", "+y", "-y", "+z", "-z"]);

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

function isAxisPairValid(front, up) {
  if (!front || !up) return false;
  return front[1] !== up[1];
}

export function normalizeTextPose(raw) {
  const FIXED_DEFAULT = {
    mode: "fixed",
    front: "+z",
    up: "+y",
    key: "fixed|+z|+y",
  };
  if (typeof raw === "string") {
    const plane = toToken(raw);
    if (plane === "billboard") {
      return {
        mode: "billboard",
        up: "+z",
        roll: 0,
        key: "billboard|+z|0",
      };
    }
    if (plane === "xy") {
      return {
        mode: "fixed",
        front: "+z",
        up: "+y",
        key: "fixed|+z|+y",
      };
    }
    if (plane === "yz") {
      return {
        mode: "fixed",
        front: "+x",
        up: "+y",
        key: "fixed|+x|+y",
      };
    }
    if (plane === "zx") {
      return {
        mode: "fixed",
        front: "+y",
        up: "+z",
        key: "fixed|+y|+z",
      };
    }
  }

  if (raw && typeof raw === "object") {
    const mode = toToken(raw.mode);
    if (mode === "fixed") {
      const front = normalizeAxisSigned(raw.front, FIXED_DEFAULT.front);
      const up = normalizeAxisSigned(raw.up, FIXED_DEFAULT.up);
      if (!isAxisPairValid(front, up)) return FIXED_DEFAULT;
      return {
        mode: "fixed",
        front,
        up,
        key: `fixed|${front}|${up}`,
      };
    }

    if (mode === "billboard") {
      const up = normalizeAxisSigned(raw.up, "+z");
      const roll = Number(raw.roll);
      // key の揺れを抑えて無駄な貼り替えを減らす
      const safeRoll = Number.isFinite(roll) ? Math.round(roll * 1000) / 1000 : 0;
      return {
        mode: "billboard",
        up,
        roll: safeRoll,
        key: `billboard|${up}|${safeRoll}`,
      };
    }
  }

  return {
    mode: "billboard",
    up: "+z",
    roll: 0,
    key: "billboard|+z|0",
  };
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
