// Reading views of the embedded edition. Each caption names an existing directed edge.
const textReading = [
  '文書を蓄積する', '資料を開ける', '離れた記述を結び直す', '見取りを得る', '次に持ち越す',
];
const structuralReading = [
  '境界と軸を選ぶ', '概念と関係を配置する', '画面に描く', '全体を提示', '寄る', '捉え直す',
];
const sharedReading = [
  '文から指す', '図から指す', '再び開く', '後から注を読む', '参照を継ぐ', '参加の道を開く',
];
const society = [...sharedReading, '応答を重ねる', '対象を指す', '見取りを共有する'];
const overview = [
  ...textReading, '蓄積の差が続くとき', '再構成を分担する',
  ...structuralReading, '領域へ展開',
  '文から指す', '図から指す', '再び開く', '後から注を読む', '応答を重ねる', '参加の道を開く',
];

// Each local view follows a single reader's task, using the original endpoints.
const textFocus = [
  '順序を編む', '文書を蓄積する', '資料を開ける', '前提を順に読む', '離れた記述を結び直す', '見取りを得る',
];
const structureFocus = [...structuralReading, '眺める', '結び方をたどる'];
const annotationExchange = ['後で見に来る', '解釈を書き添える', '応答を読む'];
const sharingFocus = ['根拠と異論を添える', '対象を指す', '後から注を読む', '再び開く'];

export function createReadingViews(model) {
  const byCaption = new Map(model.lines.map(line => [line.signification.caption, line]));
  const edges = captions => captions.map(caption => byCaption.get(caption));
  const ids = captions => edges(captions).map(line => line.meta.uuid);
  const withEndpoints = captions => [...new Set(edges(captions).flatMap(line =>
    [line.meta.uuid, line.appearance.end_a.ref, line.appearance.end_b.ref]))];

  return {
    annotationExchange: withEndpoints(annotationExchange),
    annotationPeople: new Set([
      byCaption.get('解釈を書き添える').appearance.end_a.ref,
      byCaption.get('応答を読む').appearance.end_b.ref,
    ]),
    overview: ids(overview),
    phaseBridges: ids(['再構成を分担する', '領域へ展開']),
    text: ids(textReading),
    receiver: ids(structuralReading),
    commons: ids(society),
    textLegacy: withEndpoints(textFocus),
    socialEffect: withEndpoints(sharingFocus),
    structureWork: withEndpoints(structureFocus),
  };
}

// These labels already exist in the model. Use its axis-aligned type and its anchor.
// Sizes are in model space, so orbiting never moves text to seek a gap on screen.
const labels = new Map([
  ['テキスト/0', 32], ['再構成/0', 16], ['知の偏在/24', 16],
  ['3DSL/320', 32], ['全体/320', 16], ['部分/320', 16],
  ['コモンズ/640', 32], ['箇所/640', 16], ['読者/688', 16],
  ['アーカイブ/0', 16],
]);
const compactReading = new Set(['再構成/0', '全体/320', '箇所/640']);
export function overviewSize(label, compact) {
  if (label.kind === 'line') {
    const caption = label.e.signification.caption;
    if (caption === '再構成を分担する') return compact ? 32 : 16;
    return caption === '次に持ち越す' || caption === '応答を重ねる' ? 16 : 0;
  }
  const key = label.e.signification.name + '/' + label.e.appearance.position[1];
  if (compact && compactReading.has(key)) return 32;
  return labels.get(key) || 0;
}

export function setOverviewSize(label, size, blend) {
  const scale = (label.viewScale ?? 1) * (1 - blend) + (size / label.size) * blend;
  label.viewScale = scale;
  label.object.scale.setScalar(scale * label.size / 64);
  label.object.position.copy(label.position).lerp(label.baseCenter, scale);
}


// A and B denote the same people in later scenes. Name the roles at the introduction.
export function introductoryRole(point) {
  const tags = point.meta.tags ?? [];
  const name = point.signification.name;
  if (name === '個人 A' && tags.includes('m:sender')) {
    return tags.includes('m:phase-traditional') ? '書き手 A' : '作り手 A';
  }
  if (name === '個人 B' && tags.includes('m:receiver')) return '読み手 B';
  return null;
}
