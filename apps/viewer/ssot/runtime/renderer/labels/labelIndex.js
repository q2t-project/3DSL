// viewer/runtime/utils/labelIndex.js
//
// points/lines の「代表ラベル」（テキスト + フォントサイズなど）を
// 3DSS から抜き出して正規化する純ドメイン層。
// three.js など描画実装には依存しない。
// Renderer 側はここで作った index を見て、どう表示するかだけを決めればよい。

import {
  normalizeTextAlign,
  normalizeTextFont,
  normalizeTextPose,
  normalizeTextSize,
} from "./labelSpec.js";

function normalizeLangCode(raw) {
  // accept legacy-ish shapes too (string or {default_language,...})
  let s = null;
  if (typeof raw === "string") s = raw;
  else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (typeof raw.default_language === "string") s = raw.default_language;
    else if (typeof raw.ja === "string") s = "ja";
    else if (typeof raw.en === "string") s = "en";
  }
  s = typeof s === "string" ? s.trim().toLowerCase() : "";
  // viewer currently expects ja/en (schema too). clamp for safety.
  return (s === "ja" || s === "en") ? s : "ja";
}

function asPlainObject(v) {
  return (v && typeof v === "object" && !Array.isArray(v)) ? v : null;
}

/**
 * localized_string を現在の言語設定から 1 本の string にする。
 *
 * - string の場合         → そのまま（trim して空なら null）
 * - {ja,en} の場合        → lang → ja → en → 最初の key の順にフォールバック
 */
export function normalizeLocalizedString(raw, lang = "ja") {
  if (!raw) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const fromLang = raw[lang];
    if (typeof fromLang === "string" && fromLang.trim().length > 0) {
      return fromLang.trim();
    }

    const ja = raw.ja;
    if (typeof ja === "string" && ja.trim().length > 0) {
      return ja.trim();
    }

    const en = raw.en;
    if (typeof en === "string" && en.trim().length > 0) {
      return en.trim();
    }

    for (const key of Object.keys(raw)) {
      const v = raw[key];
      if (typeof v === "string" && v.trim().length > 0) {
        return v.trim();
      }
    }
  }

  return null;
}

/**
 * signification.name を現在の言語設定から 1 本の string にする。
 */
export function normalizePointName(rawName, lang = "ja") {
  return normalizeLocalizedString(rawName, lang);
}

/**
 * marker.text 設定を signification.name とマージして、
 * 「最終的に描画へ渡すラベル情報」に落とし込む。
 */
export function buildPointLabelFromPoint(point, lang = "ja") {
  if (!point || typeof point !== "object") return null;

  const uuidRaw = point?.meta?.uuid;
  const uuid = (typeof uuidRaw === "string" ? uuidRaw.trim() : "");
  if (!uuid) return null;

  const signification = asPlainObject(point.signification) || {};
  const appearance = asPlainObject(point.appearance) || {};

  const marker = asPlainObject(appearance.marker) || {};
  const textCfg = asPlainObject(marker.text) || {};

  // 1) content
  let content = null;
  if (typeof textCfg.content === "string") {
    const trimmed = textCfg.content.trim();
    if (trimmed.length > 0) {
      content = trimmed;
    }
  }

  // 2) fallback: signification.name
  if (!content) {
    content = normalizePointName(signification.name, lang);
  }

  if (!content) return null;

  // 3) size / align / pose / font の決定
  const size = normalizeTextSize(textCfg.size);
  const font = normalizeTextFont(textCfg.font);
  const align = normalizeTextAlign(textCfg.align);
  const pose = normalizeTextPose(textCfg.pose);

  return {
    uuid,
    kind: "points",
    text: content,
    size,
    font,
    align,
    pose,
  };
}

/**
 * lines の caption を label エントリへ正規化。
 *
 * - content: signification.caption（localized_string）
 * - size: appearance.caption_text.font_size（default 8）
 * - pose: appearance.caption_text.pose（default: schema 既定の fixed front/up）
 * - align: schema に無いので center&middle
 * - font: schema に無いので viewer default
 */
export function buildLineLabelFromLine(line, lang = "ja") {
  if (!line || typeof line !== "object") return null;

  const uuidRaw = line?.meta?.uuid;
  const uuid = (typeof uuidRaw === "string" ? uuidRaw.trim() : "");
  if (!uuid) return null;

  const signification = asPlainObject(line.signification) || {};
  const appearance = asPlainObject(line.appearance) || {};

  const caption = normalizeLocalizedString(signification.caption, lang);
  if (!caption) return null;

  const capText = asPlainObject(appearance.caption_text) || {};

  const size = normalizeTextSize(capText.font_size);
  const font = normalizeTextFont(null);
  const align = normalizeTextAlign(null);

  // schema default (fixed): front:[0,1,0], up:[0,0,1]
  const poseRaw = (capText.pose != null)
    ? capText.pose
    : { front: [0, 1, 0], up: [0, 0, 1] };
  const pose = normalizeTextPose(poseRaw);

  return {
    uuid,
    kind: "lines",
    text: caption,
    size,
    font,
    align,
    pose,
    // lines は midpoint に置く前提やから、デフォの "上に持ち上げ" はせん
    liftFactor: 0,
  };
}

/**
 * 3DSS ドキュメント全体から
 *   uuid → { text, size, font, align, pose, kind }
 * の Map を構成する。
 *
 * - 対象は points 配列のみ
 */
export function buildPointLabelIndex(document3dss) {
  const result = new Map();

  if (!document3dss || typeof document3dss !== "object") {
    return result;
  }

  const meta = asPlainObject(document3dss.document_meta) || null;
  const lang = normalizeLangCode(meta?.i18n);

  const frames = Array.isArray(document3dss.frames)
    ? document3dss.frames
    : [];

  const points = [];
  const seen = new Set();
  const push = (point) => {
    const uuid = point?.meta?.uuid;
    if (!uuid || seen.has(uuid)) return;
    seen.add(uuid);
    points.push(point);
  };

  if (Array.isArray(document3dss.points)) {
    for (const point of document3dss.points) push(point);
  }
  for (const frame of frames) {
    if (!Array.isArray(frame?.points)) continue;
    for (const point of frame.points) push(point);
  }

  for (const point of points) {
    const label = buildPointLabelFromPoint(point, lang);
    if (!label) continue;
    result.set(label.uuid, label);
  }

  return result;
}

/**
 * lines.caption の index。
 */
export function buildLineCaptionIndex(document3dss) {
  const result = new Map();

  if (!document3dss || typeof document3dss !== "object") {
    return result;
  }

  const meta = asPlainObject(document3dss.document_meta) || null;
  const lang = normalizeLangCode(meta?.i18n);

  const frames = Array.isArray(document3dss.frames)
    ? document3dss.frames
    : [];

  const lines = [];
  const seen = new Set();
  const push = (line) => {
    const uuid = line?.meta?.uuid;
    if (!uuid || seen.has(uuid)) return;
    seen.add(uuid);
    lines.push(line);
  };

  if (Array.isArray(document3dss.lines)) {
    for (const line of document3dss.lines) push(line);
  }
  for (const frame of frames) {
    if (!Array.isArray(frame?.lines)) continue;
    for (const line of frame.lines) push(line);
  }

  for (const line of lines) {
    const label = buildLineLabelFromLine(line, lang);
    if (!label) continue;
    result.set(label.uuid, label);
  }

  return result;
}

/**
 * points + lines をマージしたラベル index（uuid 衝突は points 優先）
 */

function buildAuxExtensionLabelIndex(document3dss) {
  const out = new Map();
  const auxNodes = Array.isArray(document3dss?.aux) ? document3dss.aux : [];

  // default style
  const defaultAlign = normalizeTextAlign("center&middle");
  const defaultPose = normalizeTextPose(null);
  const defaultFont = normalizeTextFont(null);

  for (const aux of auxNodes) {
    if (!aux || typeof aux !== "object") continue;

    const uuidRaw = aux?.meta?.uuid;
    const uuid = (typeof uuidRaw === "string" ? uuidRaw.trim() : "");
    if (!uuid) continue;

    const appearance = asPlainObject(aux.appearance) || {};
    const mod = asPlainObject(appearance.module) || null;
    const ext = mod ? asPlainObject(mod.extension) : null;
    if (!ext) continue;

    let text = null;
    let size = null;
    let pose = defaultPose;
    let align = defaultAlign;
    let font = defaultFont;
    let style = null;

    const latex = asPlainObject(ext.latex);
    const param = asPlainObject(ext.parametric);

    if (latex) {
      const c = latex.content;
      if (typeof c === "string" && c.trim().length > 0) {
        text = c.trim();
        size = normalizeTextSize(latex.font_size);
        pose = normalizeTextPose(latex.pose);
        // schema has no align/font here; keep defaults.
        if (typeof latex.color === "string" && latex.color.trim().length > 0) {
          style = { color: latex.color.trim() };
        }
      }
    } else if (param) {
      const t = (typeof param.type === "string" && param.type.trim()) ? param.type.trim() : null;
      const v = (typeof param.version === "string" && param.version.trim()) ? param.version.trim() : null;
      text = t ? `parametric:${t}${v ? `@${v}` : ""}` : "parametric";
      size = normalizeTextSize(8);
      pose = defaultPose;
    } else if (typeof ext.type === "string" && ext.type.trim().length > 0) {
      text = `extension:${ext.type.trim()}`;
      size = normalizeTextSize(8);
      pose = defaultPose;
    }

    if (!text) continue;

    out.set(uuid, {
      kind: "aux",
      uuid,
      text,
      size,
      font,
      align,
      pose,
      // aux.extension.* は指定座標に置きたいので、既定の “上に持ち上げ” を止める
      liftFactor: 0,
      style,
    });
  }

  return out;
}

export function buildLabelIndex(document3dss) {
  const points = buildPointLabelIndex(document3dss);
  const lines = buildLineCaptionIndex(document3dss);
  const aux = buildAuxExtensionLabelIndex(document3dss);

  const merged = new Map(points);
  for (const [uuid, entry] of lines.entries()) {
    if (merged.has(uuid)) continue;
    merged.set(uuid, entry);
  }
  for (const [uuid, entry] of aux.entries()) {
    if (merged.has(uuid)) continue;
    merged.set(uuid, entry);
  }
  return merged;
}

