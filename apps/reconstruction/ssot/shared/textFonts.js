// Font parsing and canvas CSS shared by both reconstruction renderers.
export const LABEL_FONT_DEFAULT_FAMILY =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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
  const token = /^(helvetiker|noto_sans_jp|noto_serif_jp)(?:_(regular|bold))?$/.exec(s.replaceAll("-", "_").toLowerCase());
  if (token) {
    const family = token[1] === "noto_serif_jp" ? '"Noto Serif JP", "Noto Serif CJK JP", serif' :
      token[1] === "noto_sans_jp" ? '"Noto Sans JP", "Noto Sans CJK JP", sans-serif' : fallbackFamily;
    const weight = token[2] === "bold" ? "700" : "normal";
    return { family, style: "normal", weight, key: `normal|${weight}|${family}` };
  }
  if (!s) {
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

export function resolveTextFont(style) {
  const font = normalizeTextFont(style?.font);
  return style?.font_weight == null ? font :
    normalizeTextFont({ ...font, weight: String(style.font_weight) });
}
