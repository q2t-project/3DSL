// viewer/runtime/utils/labelIndex.js"
//
// points の「代表ラベル」（テキスト + フォントサイズなど）を
// 3DSS から抜き出して正規化する純ドメイン層。
// three.js など描画実装には依存しない。
// Renderer 側はここで作った index を見て、どう表示するかだけを決めればよい。

import {
  normalizeTextAlign,
  normalizeTextFont,
  normalizeTextPlane,
  normalizeTextSize,
} from "./labelSpec.js";
/**
 * signification.name を現在の言語設定から 1 本の string にする。
 *
 * - string の場合         → そのまま（trim して空なら null）
 * - {ja,en} の場合        → lang → ja → en → 最初の key の順にフォールバック
 */
export function normalizePointName(rawName, lang = "ja") {
  if (!rawName) return null;

  if (typeof rawName === "string") {
    const trimmed = rawName.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof rawName === "object") {
    // まず指定言語
    const fromLang = rawName[lang];
    if (typeof fromLang === "string" && fromLang.trim().length > 0) {
      return fromLang.trim();
    }

    // 次に ja / en の優先フォールバック
    const ja = rawName.ja;
    if (typeof ja === "string" && ja.trim().length > 0) {
      return ja.trim();
    }

    const en = rawName.en;
    if (typeof en === "string" && en.trim().length > 0) {
      return en.trim();
    }

    // それでもダメなら、object 内の最初の string プロパティ
    for (const key of Object.keys(rawName)) {
      const v = rawName[key];
      if (typeof v === "string" && v.trim().length > 0) {
        return v.trim();
      }
    }
  }

  return null;
}

/**
 * marker.text 設定を signification.name とマージして、
 * 「最終的に描画へ渡すラベル情報」に落とし込む。
 *
 * 優先順位:
 *   1) marker.text.content が non-empty ならそれを採用
 *   2) そうでなければ signification.name を normalize したもの
 *
 * size / align / plane / font は marker.text 側を優先し、
 * 無ければ 3DSS 仕様のデフォルトに合わせる。
 *
 * align / font は viewer 内部仕様に沿って正規化されたオブジェクトを返す。
 */
export function buildPointLabelFromPoint(point, lang = "ja") {
  if (!point || typeof point !== "object") return null;

  const uuid = point?.meta?.uuid;
  if (!uuid) return null;

  const signification = point.signification || {};
  const appearance = point.appearance || {};

  const marker = appearance.marker || {};
  const textCfg = marker.text || {};

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

  // 両方空ならラベル無し扱い
  if (!content) return null;

  // 3) size / align / plane / font の決定
  const size = normalizeTextSize(textCfg.size);
  const font = normalizeTextFont(textCfg.font);
  const align = normalizeTextAlign(textCfg.align);
  const plane = normalizeTextPlane(textCfg.plane);

  return {
    uuid,
    kind: "points",
    text: content,
    size,
    font,
    align,
    plane,
  };
}

/**
 * 3DSS ドキュメント全体から
 *   uuid → { text, size, font, align, plane }
 * の Map を構成する。
 *
 * - 対象は points 配列のみ
 * - content / signification.name が何も無い点は index に含めない
 *
 * @param {object} document3dss
 * @returns {Map<string, {uuid,text,size,font,align,plane,kind}>}
 */
export function buildPointLabelIndex(document3dss) {
  const result = new Map();

  if (!document3dss || typeof document3dss !== "object") {
    return result;
  }

  // document_meta.i18n があればそれを優先（schema では 'ja'|'en', default 'ja'）
  const lang =
    (document3dss.document_meta &&
      typeof document3dss.document_meta.i18n === "string" &&
      document3dss.document_meta.i18n) ||
    "ja";

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
