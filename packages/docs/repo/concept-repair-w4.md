# W4: Concept ルート復元の比較（採用判断前）

2026-10-10。作品 `26010501` の元データと推薦設定を変更せず、作者が復元意図と表示を判断するための Preview を作る。計画 v1.3 §8.1 に対応する。比較ページは `/review/concept-repair/`。採用・3D実描画は未確認で、修復完了とはしない。

## 正本と配布

- 元作品：`packages/3dss-content/library/26010501/model.3dss.json`。SHA256 `925d26405c140a4a22391567b6c88815e64d62bb246b248ade488ff643581db5`、38点・41線。
- 履歴抜粋と候補組立：`packages/3dss-content/review/concept-repair/{evidence.json,cases.mjs}`。
- 検査：`apps/site/scripts/check/concept-repair-data.mjs`。正式 Schema `packages/schemas/3DSS.schema.json`（v1.1.4）、元ファイルのハッシュ、UUID、参照、不変部分の厳密比較。
- `sync:concept-repair` は検査成功後だけ `apps/site/.generated/concept-repair.json` を生成する。これは正本ではなく、git管理しない。
- Astro は site 内の生成manifestを fs で読み、比較ページと3つの `.3dss.json` GET endpointを静的生成する。`src` から content package を直接参照せず、public JSONもimportしない。
- Cloudflare `CF_PAGES_ENV=production` または `CF_PAGES_BRANCH=main` ではページ・JSONを生成しない。識別済みPreviewとローカルでのみ生成し、識別できないCloudflare環境では無効にする。
- 一般一覧・推薦・sitemapへ追加しない。HTMLは `noindex, nofollow`、Layoutの広告資格はfalse。Viewerリンクは `from=review`、`return=/review/concept-repair/` を使う。GETの `X-Robots-Tag` は静的配信で保持されるとは限らないため、JSONの配信ヘッダーがnoindexになるとは断定しない。

## 履歴の証拠

GitHubの読み取りで次を照合した。点の完全な抜粋を `evidence.json` に保存している。

|根拠|内容|
|---|---|
|[2026-01-12 / 23026cef](https://github.com/q2t-project/3DSL/blob/23026cefe412555e2a2094946e3809b763291d1a/packages/3dss-content/library/26010501/model.3dss.json)|名称Concept、位置[0,0,0]、球半径0.6、文字Concept、サイズ8、旧plane:zx、メモ「3DSL Concept の全体ルート」|
|[削除直前 / c4536fc7](https://github.com/q2t-project/3DSL/blob/c4536fc7cc2ad62decc98b35710c805b9c185239/packages/3dss-content/library/26010501/model.3dss.json)|同UUID・名称・位置。文字topHello 3DSL、サイズ64、現行pose、align center&middle、font helvetiker_regular|
|[削除 / 920b9198](https://github.com/q2t-project/3DSL/commit/920b919854c3ae7377870ed3a8a1beeb45be8aa8)|2026-01-20T03:13:52Z、message troika-scale。点1件を削除、41線は維持。周囲の多くの文字サイズ8→4も同時変更|

復元対象 UUID は `b1cbe02d-7219-4a16-8bee-4652e46e38bc`。次の3本の `end_a.ref` が同じ欠落点を指す。線の意味はすべて `structural: containment`、`sense: a_to_b`。既存点への付替えはしない。

|線UUID|接続先の名称|接続先UUID|位置|
|---|---|---|---|
|7a928352-e1fd-4162-8de4-bc068971996e|表現の限界と要請|8dffb04e-0b02-402f-a816-293af8e1cf8a|[-22,10,0]|
|bdf41859-f40f-44d2-a1ba-24f9b3463b3d|新しい表現の実験|5100c528-f0be-4d6c-b8ae-0d4f026b583b|[22,10,0]|
|59985c63-3d79-49a6-96cb-af09a3ee31c9|宣言|c2dba50c-826a-4826-8480-893473240e42|[0,-18,0]|

構造を復元する根拠は強いが、削除の意図は履歴だけから決めない。点を戻す意図と表示は作者判断を要する。

## 3ケースと表示の対応

|配布名|点/線|欠落/重複UUID|復元点|
|---|---|---|---|
|current.3dss.json|38/41|3/0|なし。現行比較|
|concept.3dss.json|39/41|0/0|Concept、サイズ8。推奨・未採用|
|tophello.3dss.json|39/41|0/0|削除直前のtopHello 3DSL、サイズ64。比較用|

Concept案だけ旧 `plane:zx` を `pose:{front:[0,1,0],up:[0,0,1]}` に対応させる。この対応は Viewer の `runtime/renderer/labels/labelSpec.js` および `runtime/bootstrapViewer.js` の既存変換と一致する。それ以外の復元点項目は各履歴抜粋と同じ。文字サイズ8を4へ再推定するなどの変更はしていない。過去と現在では描画方式が異なる可能性があり、数値を維持しても見た目の同一性は保証しない。

既存38点・41線・document_meta・auxは両候補で厳密同一。document_uuidも元と同じであり、別作品としてLibrary登録する候補ではない。推薦への復帰は行わない。

原点には `視点/手順共有`（UUID 2e7dd29f-e703-4987-a6e5-519476a9805f）と名称なし（UUID b437f61d-8c31-4a71-b714-8a8104da0c9a）の既存boxがある。両方ともsize[4,4,4]。復元球半径0.6が内部に隠れる可能性があるため、球の露出だけを成功条件にしない。確認対象はラベル・対象3本・原点の重なり・全体の読みやすさ。他点の移動は含めない。

ページの静的SVGは候補と現行データに基づくXY投影で、原点の重なりと3接続を説明する。対象点はZ=0。記号サイズとラベル位置は説明用であり、3D実描画の代替ではない。

## 確認と残件

実行コマンド：

```sh
npm --prefix apps/site run build
node apps/site/scripts/check/concept-repair.mjs
```

production除外は、`CF_PAGES_ENV=production CF_PAGES_BRANCH=main` を付けたsyncとAstro buildの後、同じ環境変数付きのcheckで確認する。Previewへ戻すときはsyncから行う。

データ検査は3ケースのSchema適合、UUID重複0、修復2案の欠落0、元の38点41線等の不変性、元データSHA一致を確認する。配布検査は生成JSONと候補の一致、3本のViewerリンクとreturn、HTMLのnoindex・広告資格false、一般入口への非掲載を確認する。WebGL実描画・作者の採用判断は別の確認であり、未実施。

今回の実行結果：通常の全build（prebuild、既存publication検査を含む）成功。比較データ・配布検査成功。production/main環境でsync→Astro build→配布検査を行い、比較ページ・JSON計4件が存在しないことを確認した。その後Preview/localとして再生成し、同じ配布検査を再度通過。boundary guardも成功。原本SHAは作業前後で一致。ブラウザ/WebGLを使った描画検査は行っていない。

採用時は元作品を直す前に、この38点固定・SHA固定の比較検査を更新または撤去する。既存38点を移動したい場合は、具体的な追加差分を比較にして別途判断する。本番の推薦復帰は修復箇所と全体の可読性確認後に判断する。
