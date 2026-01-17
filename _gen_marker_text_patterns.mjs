import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const basePath = "apps/site/public/3dss/scenes/default/default.3dss.json";
const outPath  = "apps/site/public/3dss/sample/marker_text_patterns.3dss.json";
const base = JSON.parse(fs.readFileSync(basePath, "utf8"));
// schema-valid な marker.text 形を default から借りる（これが一番安全）
const tplPoint = (base.points || []).find(p => p?.appearance?.marker?.text);
if (!tplPoint) throw new Error("default.3dss.json に appearance.marker.text を持つ point が見つからん");
const clone = (o) => JSON.parse(JSON.stringify(o));
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const doc = {
  document_meta: clone(base.document_meta),
  points: [],
  lines: [],
  aux: [],
};
// required がうるさいので default の形を保ちつつ差分だけ
doc.document_meta.document_uuid  = crypto.randomUUID();
doc.document_meta.document_title = "marker.text patterns (schema-valid)";
doc.document_meta.creator_memo   = "marker.text の解釈確認用（align/size/font/content）";
// テンプレ（勝手にプロパティ増やさない）
const tplAppearance = clone(tplPoint.appearance);
const tplMarker     = clone(tplPoint.appearance.marker);
const tplText       = clone(tplPoint.appearance.marker.text);
function makePoint(x, y, z, label, alignToken, fontStr) {
  const ap = clone(tplAppearance);
  ap.position = [x, y, z];
  ap.marker = clone(tplMarker);
  // marker.text: 既存の型（string/object/oneOf）を壊さない
  if (typeof tplText === "string") {
    ap.marker.text = label;
  } else {
    const t = clone(tplText);
    // 既存キーがある場合だけ上書き（追加キーは作らない）
    if (hasOwn(t, "content")) t.content = label;
    if (hasOwn(t, "align"))   t.align = alignToken;      // データは & 形式に固定（spaceはschemaで落ちがち）
    if (hasOwn(t, "size"))    t.size = 0.6;
    if (hasOwn(t, "font") && typeof fontStr === "string") t.font = fontStr;
    ap.marker.text = t;
  }
  return {
    meta: { uuid: crypto.randomUUID() }, // meta は uuid のみにする（name入れると schema で死ぬ）
    appearance: ap,
  };
}
const H = ["left", "center", "right"];
const V = ["top", "middle", "baseline"];
let idx = 0;
for (const v of V) {
  for (const h of H) {
    const x = (idx % 3) * 3;
    const y = Math.floor(idx / 3) * 2.2;
    const align = `${h}&${v}`;
    const label = align;
    const font  = (idx % 2 === 0) ? "italic 700 serif" : "700 monospace";
    doc.points.push(makePoint(x, y, 0, label, align, font));
    idx++;
  }
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log("wrote", outPath);
