// viewer/runtime/renderer/labels/labelSpec.js
//
// marker.text の解釈仕様（viewer 側）

export const LABEL_TEXT_DEFAULTS = {
  size: 8,
  align: "center&middle",
  plane: "zx",
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

const VALID_PLANES = new Set(["xy", "yz", "zx", "billboard"]);

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
  const s = toToken(raw);
  let h = null;
  let v = null;

  if (s) {
    const direct = s.includes("&") ? s.split("&") : [s];
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

export function normalizeTextPlane(raw) {
  const s = toToken(raw);
  return VALID_PLANES.has(s) ? s : LABEL_TEXT_DEFAULTS.plane;
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
