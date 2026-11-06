# DEVOPS_site.md（SSOT: 3DSL Site / Astro + Tailwind / Cloudflare Pages）

このファイルは「**デプロイまでの正しい手順**」と「**事故りやすいポイントを機械で止めるルール**」のSSOTやで。  
運用の要点は **(1) 正統ルートの固定 / (2) Pagesの制約に合わせる / (3) デプロイ確認を機械化** の3つ。

---

## 目次

- Part I: Site デプロイ SSOT（Cloudflare Pages + Guardrails）
  - 1. Cloudflare Pages 設定（前提）
  - 2. Canonical ルート SSOT（絶対に壊すな）
  - 3. Cloudflare Pages の 404 契約（最大の落とし穴）
  - 4. `_redirects` / `_headers`（Pages側ルーティング制御）
  - 5. Deploy Probe（本番がどのコミットか一発で判別）
  - 6. Guardrails（build前に機械で止める）
  - 7. ローカル→デプロイまでの最短ルート
  - 8. よくある詰まりどころ（まずここ見ろ）
  - 9. AdSense 申請前の最低ライン
- Part II: Viewer 埋め込みと最小ホストの契約（/app/viewer / peek）
  - 10. Viewer Embed Contract（/app/viewer 安定表示の契約）
  - 11. 正規の閲覧入口
  - 12. 互換入口
  - 13. 代表的な症状
  - 14. 埋め込みレイアウトの契約
  - 15. 監視（手動チェック）
  - 16. 受入と切戻し
- Appendix: Viewer 側の実施記録（参考）
  - A. check-forbidden-imports と peekBoot の扱い（メモ）
  - B. 3DSL Viewer: Codex反映分 実施記録（2026-01-11）

---

# Part I: Site デプロイ SSOT（Cloudflare Pages + Guardrails）

## 1) まず前提（Cloudflare Pages 設定）

Cloudflare Pages のプロジェクト設定はこう固定。

- Root directory: `apps/site`
- Build command: `npm run build`
- Build output directory: `dist`
- Variables:
  - `NODE_VERSION`（例: `20.3.0`）
  - `PUBLIC_FORMSPREE_ENDPOINT`（問い合わせフォーム使う場合）

※ Cloudflare Pages は npm ci 相当で lock 厳密一致が要るため、apps/site/package.json の overrides（diff/fast-json-patch の監査対応）を使う場合は apps/site/package-lock.json も必ず更新・コミットする。

---

## 2) Canonical ルート SSOT（絶対に壊すな）

### Viewer の公開入口

- 新規リンク・共有・QR は `/app/viewer/` を使う。Astro のホストは `apps/site/src/pages/app/viewer.astro`。
- `/viewer`、`/viewer/`、`/viewer/index.html` は配布済みリンクの互換入口。同期が生成するため、`src/pages/viewer.astro` や `src/pages/viewer/index.astro` を置かない。
- 再構築版の旧入口と図のみの埋め込みも、同じ閲覧実装を使う（§12）。開発用HTMLから本番で別のViewerを起動しない。

### 理由（事故の仕組み）
- Astro は **Git管理かどうか関係なく** `src/pages/**` にファイルがあるだけでルートを生成する。
- つまり「うっかりファイル残す／untrackedが混入」だけで、ルート二重定義や意図せぬ公開が起きる。

---

## 3) Cloudflare Pages の 404 契約（ここが最大の落とし穴）

Cloudflare Pages は **Astro の `src/pages/404.*` ではなく**、  
**サイト直下の `404.html`（静的ファイル）** を要求する挙動がある（運用的にはこれに合わせる）。

### 正解（これだけ）
- `apps/site/public/404.html` を置く  
  → build後 `dist/404.html` として出る

### 禁止（guardで止める）
- `apps/site/src/pages/404.html.astro`
- `apps/site/src/pages/404.astro`
- 「Astro側で404作ればOK」系の発想（Pages側が期待する形式とズレる）

---

## 4) `_redirects` / `_headers`（Pages側ルーティング制御）

Cloudflare Pages は `public/_redirects` と `public/_headers` を **そのまま配信設定として読み込む**。  
だから **置き場所は `apps/site/public/` 固定**。

Pages は静的ファイル `viewer.html` を `/viewer`、`viewer/index.html` を `/viewer/` で配信する。この2ファイルは同じ互換HTMLから生成する。互換ページは元のURLを基準に相対作品URLを解決する。配布済みの作品指定や埋め込みを壊さないよう、`/viewer/*` を一括で `/app/viewer/` に転送しない。ビルド後の旧入口とブラウザーでの期待値は[Viewer配備時の注意点](/docs/ops/viewer_deploy_pitfalls/)を参照。

---

## 5) Deploy Probe（いま本番がどのコミットかを一発で判別）

`/__deploy_probe.txt` は **本番で「今のデプロイがどのshaか」を判別するためのファイル**。
これが無いと「デプロイ反映したか分からん」で永久に詰む。

### ルール（固定）

* `apps/site/public/__deploy_probe.txt` は **コミットしない**（ダミーが残ると混乱する）
* `scripts/guard/prebuild.mjs` が build 前に **public にJSONを書く**。既存の dist がある場合はそこも更新し、ビルド時には Astro が public から dist にコピーする

  * これで「本番URLを見てもcommitが分かる」状態になる

### 確認（Probeで見る）

* Preview（デプロイID付きURL）：

```ps1
curl.exe -s https://<deploy-id>.3dsl.pages.dev/__deploy_probe.txt
```

* Production：

```ps1
curl.exe -s https://3dsl.pages.dev/__deploy_probe.txt
```

期待される形（例）：

```json
{
  "sha": "c04ca23",
  "builtAt": "2026-01-02T03:36:28.419Z"
}
```

---

## 6) Guardrails（build前に機械で止める）

`apps/site/scripts/guard/prebuild.mjs` が **Astro 実行前に止める**対象：

* 禁止ルートの存在

  * `src/pages/viewer.astro`
  * `src/pages/404.*`（Pagesは `public/404.html` 方式に寄せる）
* 事故りやすいファイル混入（SSOT違反）
* `__deploy_probe.txt` の整合（public/dist）

### コマンド

* 手動チェック：

```ps1
npm --prefix apps/site run check:guards
```

* build入口（必ずguardが走る）：

```ps1
npm --prefix apps/site run build
```

* 自動修復（危険物の削除＋必要物の生成）：

```ps1
npm --prefix apps/site run fix:guards
```

---

## 7) ローカル → デプロイまでの手順（最短ルート）

### (A) ローカルでビルド確認（まずここ）

リポジトリルートで：

```ps1
npm --prefix apps/site run check:guards
npm --prefix apps/site run build
```

成果物確認：

```ps1
Test-Path .\apps\site\dist\404.html
Test-Path .\apps\site\dist\_redirects
Test-Path .\apps\site\dist\__deploy_probe.txt
Get-Content .\apps\site\dist\__deploy_probe.txt
```

### (B) PRとProductionの確認

1. 対象の変更を作業ブランチからPRでmainに統合し、配信対象のコミットSHAを控える。
2. CloudflareのWorkers & Pages → `3dsl` → Deploymentsで、そのコミットのProductionが成功していることを確認する。
3. デプロイ固有のURLと公開ドメイン（`https://3dsl.jp`）で `/__deploy_probe.txt` の `sha` を照合する。さらに公開ドメインの `/app/viewer/` と、クエリなしの `/viewer/index.html` を直接開き、同じViewerに着くことを確認する。

デプロイ固有のURLは新しく公開ドメインの旧入口だけが古い場合、空コミットや再デプロイを重ねる前に、[旧入口のキャッシュを切り分ける](/docs/ops/viewer_deploy_pitfalls/)。

---

## 8) よくある詰まりどころ（これだけ見とけばだいたい抜ける）

### 404でguardに止められる

* `src/pages/404.html.astro` が残ってる
  → **消す**、`public/404.html` に寄せる

### 旧URLだけ以前のViewerが表示される

- 同じURLについてデプロイ固有のホストと公開ドメインの応答本文を比較する。クエリ付きだけが正しくても、配布済みのクエリなしURLの確認にはならない。
- 旧入口が `200` の互換HTMLを返してからブラウザーで移動する場合もある。HTTPステータスだけで合否を判定しない。

### 本番の `__deploy_probe.txt` が古い／ダミーっぽい

* `public/__deploy_probe.txt` をコミットしてしまってる（ダミー固定で上書きされない）
  → 追跡を外す（例：`git rm --cached apps/site/public/__deploy_probe.txt`）
  → `.gitignore` で無視
  → buildで `scripts/guard/prebuild.mjs` が生成する形に統一

### PowerShellのパス事故（apps/site/apps/site を作るやつ）

* いまいるディレクトリに対して、さらに `apps/site/...` を付け足してる
  → 「**今どこにいるか**」で相対パスを変える（基本はリポジトリルートから実行）

---

## 9) AdSense 申請前の最低ライン（現状ページ構成のまま）

* `/policy` にプライバシー・Cookie・広告（AdSense）・問い合わせ先が明示されてる
* `/docs` に「このサイトの目的／使い方／コンテンツの説明」が一定量ある（薄い判定回避）
* `/modeler` は「未完成です」感を抑えつつ、現状できること・予定を明記

#### Modeler ルーティング決定（重要）
（移行ワンショット：`node apps/site/scripts/migrate/modeler-route-migration.mjs`）
- **bundle base**: `/modeler/`（静的アプリ本体。`apps/modeler/ssot` が SSOT）
- **embed host**: `/app/modeler`（サイト側レイアウトから隔離して表示するホスト）
- **暫定**: `/modeler_app/` は `/modeler/` への寄せのための一時ルート（将来削除）
* 壊れたリンクや 405/500 を残さない（フォーム送信先など）

---

以上を守れば、「デプロイされたか分からん」「Pagesの404で沼る」「余計なルートが残る」系の事故は潰せる。

---

# Part II: Viewer 埋め込みと最小ホストの契約（/app/viewer / peek）

## 10) Viewer Embed Contract（/app/viewer 安定表示の契約）

### 目的

`/app/viewer` は 3DSL Viewer を **サイト側レイアウトから隔離して**表示するための専用ホストページ。
ここが site の wrapper / flex / grid / 余白 / overflow / 広告枠 などの影響を受けると、
iframe が「縮められない状態」になり、**左半分が空く**など致命的な崩れが再発する。

---

## 11) 正規の閲覧入口

新規リンク・共有・QRは `/app/viewer/` を使う。親ホストは既存の作品への戻り先と画像保存を扱い、閲覧操作を子のメニューにまとめる。受渡し元ウィンドウの識別が必要なModelerの写しは同じタブで読取実装へ渡す。

## 12) 互換入口

`/viewer`、`/viewer/`、`/viewer/index.html`、`/preview-reconstruction/contract_viewer/` と同配下の `index.html`、`/preview-reconstruction/viewer/` は同じ公開Viewerへ案内する。既存の相対作品URLは移動前の位置で解決する。埋込専用の `/viewer/peek.html` と `/viewer/peek/` は同じ実装の図のみの表示へ渡す。開発用HTMLは本番で別のViewerを起動しない。配布元は `apps/reconstruction/ssot/contract_viewer/`、サイトの変換は `apps/site/scripts/sync/reconstruction-preview.mjs` および `sync/viewer.mjs`。

## 13) 代表的な症状（致命）

* `window.innerWidth` と `iframe.getBoundingClientRect().width` が一致しない
  例: `innerW=430` なのに `iframeW=946` のように膨らむ／縮まらない
* viewer が左半分に押し込まれる／余白が固定化される

---

## 14) 契約（破ったらバグ扱い）

1. `/app/viewer` はサイト共通レイアウトから隔離する

   * wrapper の flex/grid 配下に置かない
   * 広告枠・2カラム・コンテナ幅の影響を受けないこと
2. iframe は viewport 固定（親CSS非依存）

   * `position: fixed; inset: 0; width: 100vw; height: 100dvh; border:0;`
   * `100dvh` 非対応環境の fallback として `100vh` を許容
3. 親要素由来の幅膨張要因を作らない

   * flex item 化する場合は必ず `min-width: 0` を保証
   * 親に `overflow`, `transform`, `zoom` 等を入れない（入れるなら契約更新）
4. "frame-fit" 等の JS 吸収策は持ち込まない

   * その場しのぎの倍率/変形ロジックは環境依存で再発要因になる

---

## 15) 監視（手動チェック）

DevTools Console で以下を実行し、差分が 1px 以内であること。

```js
const f = document.getElementById('app-viewer-iframe');
({ innerW: window.innerWidth, iframeW: f?.getBoundingClientRect()?.width })
```

---

## 16) 受入と切戻し

同じ作品を正規入口・旧URL・埋込から読み、対象と明示接続、戻り先、パラメータを比較する。制作中の作品の受渡しはModelerと組にして検査する。小型ギズモ56 CSS px、展開152 CSS pxをAndroid実機で受け入れた。縦360・390 CSS pxのモデル直接操作面積と既配布経路を検査済み。受入記録と公開対象の確認を揃え、GitHubの作業ブランチをPRでmainへ統合し、Cloudflare PagesのProduction成功と配信コミットを確認する。配信を戻す場合は入口、生成物、リンク、説明を同じ直前リリースへ一括で戻す。

# Appendix: Viewer 側の実施記録（参考）

以下は旧ランタイムの実装履歴。現在の公開入口・埋め込みの判定には§11–12を使う。

## A) check-forbidden-imports と peekBoot の扱い（メモ）

* `check-forbidden-imports.mjs` は manifest.yaml の依存ルール＋グローバル参照禁止を検査する
* `peekBoot.js` は “minimal host entry” として特別扱い

  * 許可 import: `runtime/bootstrapViewer.js` のみ
  * UI レイヤや他モジュールを直接 import したら CI で落ちる（ホストを最小に保つため）

---

## B) 3DSL Viewer: Codex反映分 実施記録（2026-01-11）

### 状況（開始時点）

* 対象: `apps/viewer/ssot` を中心とした Viewer 実装・SSOT統治・site同期・schema更新
* 目的:

  * Peek（No-UI Host）を SSOT ルールに沿った形へ整理（host が hub を触らない）
  * marker.text / label 表示の改善（品質・パフォーマンス）
  * SSOTドキュメント整備（hosting分類、解釈表、検証メモ）
  * schema v1.1.3 反映＋サンプル更新
  * site 側 docs 追加・viewer ページ同期

---

### 変更概要（成果物の塊）

この作業でローカル `main` は **origin/main より 6 commits ahead**。

直近コミット（新しい順）:

1. `15e59d8` viewer: fix spec path for viewer_interpretation_spec
2. `0486e68` schema: update 3DSS + refresh samples
3. `01aa3bf` site: sync viewer + update viewer page/docs
4. `e4e4a21` viewer: add/update SSOT docs
5. `db01e29` viewer: improve label rendering + perf/orbit HUD
6. `832915a` viewer: add PeekHandle entry APIs (bootstrapPeek*)

---

### A) PeekHandle 化（最重要・設計統治）

#### ねらい

* host が `hub.*` を直接触らない（`host -> hub` 禁止を守る）
* Peek（UI無しホスト）向けに **返り値を Hub ではなく PeekHandle** にする
* entry が `hub.start()` を自動実行できるようにして host を非特権化

#### 実装（entry）

* `runtime/bootstrapViewer.js`

  * `bootstrapPeekFromUrl(canvasOrId, url, options?) -> Promise<PeekHandle>`
  * `bootstrapPeek(canvasOrId, document3dss, options?) -> Promise<PeekHandle>`
  * `createPeekHandle(hub, options?)` を追加

    * `PeekHandle.camera.rotate/pan/zoom` を提供
    * `autoStart`（default true）で entry 側が `hub.start()` を呼ぶ

#### manifest ports 追加（越境口の明文化）

* `apps/viewer/ssot/manifest.yaml`

  * `entry.bootstrapPeekFromUrl`（stable）
  * `entry.bootstrapPeek`（experimental）
  * ※既存 `entry.bootstrapViewer*` と並ぶ host->entry の公開口として追加

#### ports generated 更新

* `apps/viewer/ssot/_generated/PORTS.md` を `gen-ports.mjs` で再生成し差分反映

#### host 側の規約強化（静的監査）

* `scripts/check-ports-conformance.mjs`

  * Host ファイルに `peekBoot.js` を追加し、

    * `hub.*` を触ったら即違反（HOST_TOUCHED_HUB）
  * UI 側は `hub.<prop>` トークンスキャンで ports 許可リストと突合

#### host shell コメントの明確化

* `peek.html` / `peek/index.html`

  * `SSOT_EXCEPTION_HOST: A. UI無し (No-UI Host)` を明記
  * 禁止事項（ui import / hub/core/renderer 直参照）をコメント化

#### コミット

* `832915a viewer: add PeekHandle entry APIs (bootstrapPeek*)`

---

### B) Label 描画改善 + HUD（操作・性能の体感改善）

#### ねらい

* marker.text 系の見た目・安定性改善
* label 増加時の体感劣化に対するパフォーマンス監視導線
* Orbit の誤解（モデルが回る/カメラが回る）を UI で最小ヒント化

#### 変更範囲（主要）

* runtime:

  * `runtime/renderer/context.js`
  * `runtime/renderer/labels/*`（LabelLayer / labelConfig / labelRuntime / labelSpec / textSprite 等）
  * `runtime/viewerHub.js`
  * `runtime/core/contracts.js`
* ui:

  * `ui/domContract.js`
  * `ui/attachUiProfile.js`
  * 新規: `ui/orbitHint.js`
  * 新規: `ui/perfHud.js`
* css:

  * `viewer.css`

#### コミット

* `db01e29 viewer: improve label rendering + perf/orbit HUD`

---

### C) SSOTドキュメント整備（統治の文章化）

#### 追加/更新

* `apps/viewer/ssot/SSOT_HOSTING_POLICY.md`（例外ホスト分類・境界）
* `apps/viewer/ssot/MARKER_TEXT_INTERP.md`（marker.text の解釈表）
* `apps/viewer/ssot/violations.md`（違反サンプル/運用メモ）
* `apps/viewer/ssot/test/viewer_label_performance.md`（性能確認メモ）
* `apps/viewer/ssot/DEVOPS_site.md` / `viewer_dom_contract.md` など更新

#### manifest docs 参照追加

* `docs.human_specs` に以下を追記:

  * hosting-policy: `/viewer/SSOT_HOSTING_POLICY.md`
  * viewer-interpretation-spec: `/viewer/spec/viewer_interpretation_spec.md`

#### コミット

* `e4e4a21 viewer: add/update SSOT docs`

---

### D) site 同期（viewerページ + docs 追加）

#### 変更

* `apps/site/scripts/sync-viewer.mjs`
* `apps/site/src/pages/app/viewer.astro`
* `apps/site/src/content/text/viewer.md`
* 新規 docs:

  * `.frontmatter`

#### コミット

* `01aa3bf site: sync viewer + update viewer page/docs`

---

### E) schema v1.1.3 更新 + サンプル更新

#### 変更

* `packages/schemas/3DSS.schema.json` / `3DSS_spec.md`
* `packages/schemas/releases/v1.1.3/*` 更新
* 新規: `packages/schemas/releases/v1.1.3/*`

  * `3DSS.schema.json`
  * `3DSS_spec.v1.1.3.pose.md`
* `packages/3dss-content` サンプル類更新

  * canonical/valid, sample など

#### コミット

* `0486e68 schema: update 3DSS + refresh samples`

---

### F) spec パスの修正（迷子解消）

#### 背景

* `viewer_interpretation_spec.md` が誤って深いパスに置かれていた

  * `apps/viewer/ssot/spec/apps/viewer/ssot/spec/viewer_interpretation_spec.md`

#### 対応

* 正しい位置へ移動:

  * `apps/viewer/ssot/spec/viewer_interpretation_spec.md`
* `manifest.yaml` 参照:

  * `path: "/viewer/spec/viewer_interpretation_spec.md"`（整合確認済）

#### コミット

* `15e59d8 viewer: fix spec path for viewer_interpretation_spec`

---

### 実行したチェック（最終確認）

* `node apps/viewer/ssot/scripts/check-forbidden-imports.mjs` -> OK
* `node apps/viewer/ssot/scripts/check-single-writer.mjs` -> OK
* `node apps/viewer/ssot/scripts/check-ports-conformance.mjs` -> OK
* `node apps/viewer/ssot/scripts/gen-ports.mjs` -> _generated/PORTS.md 更新
* `node apps/viewer/ssot/scripts/check-generated-clean.mjs` -> 差分なし
* `node apps/viewer/ssot/scripts/check-host-asset-paths.mjs` -> OK

---

### 既知の残作業（git status 由来）

push 前に整理が必要なもの。

#### 未ステージの変更

* `apps/viewer/ssot/scripts/check-forbidden-imports.mjs`
* `apps/viewer/ssot/viewerDevHarness.js`
* `apps/viewer/ssot/viewer_dev.html`

→ 意図した変更なら追加コミット、不要なら restore。

#### Untracked

* `"(bootstrapPeek※)・"`（文字化けしたゴミっぽいファイル/フォルダ）

→ 削除推奨（意図が無ければ確実にノイズ）。

---

### push 前の推奨手順

1. 未ステージ3ファイルの扱い決定（commit するか捨てる）
2. 文字化け untracked を削除
3. `git status` が clean になったら
4. `git push`（6 commits を publish）

