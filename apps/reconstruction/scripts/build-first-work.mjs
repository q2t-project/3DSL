// Rebuild the small tutorial with the same authoring operations as Modeler.
// node apps/reconstruction/scripts/build-first-work.mjs [--check]
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createEmptyContractWork, operateContractWork, parseContractWork } from '../ssot/modeler_app/runtime/contractWork.js';
import { buildReadModel } from '../ssot/contract_viewer/readModel.js';

const root = new URL('../../../', import.meta.url);
const output = new URL('apps/reconstruction/ssot/models/first_work.3dsl-work.json', root);
const date = '2026-10-10T22:55:40Z';
const title = 'はじめての一作品 — 光速度の二つの回答';
// These coordinates arrange two comparable reading paths, not measured axes.
const points = [
  ['Q', 'Q SIにおける真空中の光速度の値', [0, 30, 0]],
  ['L75', 'L75 1975年：値を勧告する', [-28, 10, 0]],
  ['L83', 'L83 1983年：メートルの定義を決める', [28, 10, 0]],
  ['A75', 'A75 299792458 m/s：不確かさを伴う勧告値', [-28, -12, 0]],
  ['A83', 'A83 299792458 m/s：定義への入力', [28, -12, 0]],
  ['S75', 'S75 1975年CGPM決議2：勧告部分', [-28, -34, 0]],
  ['S83', 'S83 1983年CGPM決議1：定義と1975年値への言及', [28, -34, 0]],
];
const relations = [
  ['Q', 'L75', '問いを扱う', '問い', '活動'],
  ['Q', 'L83', '問いを扱う', '問い', '活動'],
  ['L75', 'A75', '回答', '活動', '回答'],
  ['L83', 'A83', '回答', '活動', '回答'],
  ['A75', 'S75', '根拠を参照', '回答', '資料'],
  ['A83', 'S83', '根拠を参照', '回答', '資料'],
];

let work = createEmptyContractWork();
const occurrences = new Map();
for (const [key, name, position] of points) {
  work = operateContractWork(work, { type: 'create-point', name, position });
  occurrences.set(key, work.contract.occurrences.at(-1).id);
}
for (const [from, to, name, sourceRole, destinationRole] of relations) {
  work = operateContractWork(work, { type: 'create-relation', occurrence: occurrences.get(from), name });
  work = operateContractWork(work, {
    type: 'complete-relation', pending: work.contract.draft.pendingRelations.at(-1).id,
    source: occurrences.get(from), destination: occurrences.get(to), name, sourceRole, destinationRole,
  });
}
const note = `# ${title}

作者表記：q2t。制作日：2026年10月11日。
制作案内：https://3dsl.jp/docs/usage/first-work
元作品：https://3dsl.jp/docs/works/knowledge-questions

既存の「知識と問い」の光速度例を、新しい作品一式の7対象・6関係へ限定して再制作した練習用サンプル。
原作品全体の変換ではない。実際のModelerと同じ作成操作を生成スクリプトで実行し、画面操作をした履歴は捏造していない。
各対象の状態「未判定」は新規作成時のまま。形式検査の合格は史実の判定・証明ではない。

## 読み方
Q→L75→A75→S75、Q→L83→A83→S83を比較する。
共通の数値299792458 m/sを持っていても、1975年の勧告値と1983年の定義への入力は別の回答として置く。
「根拠を参照」は回答から資料を読む方向。資料が回答から生じる因果を表す線ではない。
左右は二記録の比較、並びは参照順。座標・距離・角度に数量・重要度・時間間隔の意味はない。
Z=0の平面配置、表示所属はすべて0。全体を読んだ後、元作品に戻って省略部分を見る。
資料部分と資料全体を今回は一つの表示にまとめ、ラベル内で参照箇所を明記した。
元作品の全体構成・整列例・U/E/J・分類付与・二資料間の継承関係は含まない。

## 参照先
元作品の作者表記：q2t。knowledge_questions.3dsl-work.json の光速度例を参照。
1975年CGPM決議2（BIPM公開英語ページ）：
https://www.bipm.org/en/committees/cg/cgpm/15-1975/resolution-2
1983年CGPM決議1（BIPM公開英語ページ）：
https://www.bipm.org/en/committees/cg/cgpm/17-1983/resolution-1
2026年10月11日、上記ページの数値と決議の区別を確認。原文転載ではなく短い要約。
これは1975年と1983年の歴史例。1983年の定義は2019年に効力を持つ新定義へ移行しており、現行SIの定義を説明する教材ではない。

## 利用条件
https://3dsl.jp/policy/content-usage#practice-samples
自身の端末での操作・学習用の複製・編集・保存・再読込みは、同ページの指定練習サンプル条件に従う。
著作権・出典表示を保持する。第三者への配布・ウェブ公開・再提供には個別の許可が必要。
`;
work.attachments['tutorial/README.md'] = note;
for (const scene of [work.scene, work.baselineScene]) {
  scene.document_meta.document_title = title;
  scene.document_meta.created_at = date;
  scene.document_meta.revised_at = date;
}
// Stable UUIDs make the checked-in tutorial reproducible without replacing the
// production UUID generator or modifying global crypto / date behavior.
const ids = new Map();
const stableId = value => {
  if (!ids.has(value)) {
    const h = createHash('sha256').update(`3dsl:first-work:2026-10-11:${ids.size}`).digest('hex');
    ids.set(value, `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`);
  }
  return ids.get(value);
};
work = JSON.parse(JSON.stringify(work, (_key, value) =>
  typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value) ? stableId(value) : value));
parseContractWork(work);
const readModel = buildReadModel(JSON.stringify(work));
assert.equal(readModel.format, 'contract');
assert.deepEqual(readModel.warnings, []);

// Use the same bundled validator/options as the app; never normalize the model.
const bundle = await readFile(new URL('packages/vendor/ajv/dist/ajv-with-formats.bundle.js', root), 'utf8');
const { default: Ajv } = await import(`data:text/javascript;base64,${Buffer.from(bundle).toString('base64')}`);
const ajv = new Ajv({ allErrors: true, strict: true, strictSchema: false, strictTypes: true,
  strictRequired: false, validateSchema: false, removeAdditional: false, useDefaults: false, coerceTypes: false });
const sceneSchema = JSON.parse(await readFile(new URL('../ssot/schemas/3DSS.schema.json', import.meta.url), 'utf8'));
const workSchema = JSON.parse(await readFile(new URL('../ssot/schemas/3DSL.contract-work.schema.json', import.meta.url), 'utf8'));
ajv.addSchema(sceneSchema);
const validate = ajv.compile(workSchema);
assert.ok(validate(work), JSON.stringify(validate.errors, null, 2));
assert.deepEqual(parseContractWork(JSON.stringify(work)), work);
const text = JSON.stringify(work, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(await readFile(output, 'utf8'), text, 'Regenerate first_work.3dsl-work.json');
else await writeFile(output, text);
console.log(`[first-work] ${process.argv.includes('--check') ? 'checked' : 'wrote'} 7 targets / 6 relations; schema, references, Viewer read model and JSON round-trip passed`);
