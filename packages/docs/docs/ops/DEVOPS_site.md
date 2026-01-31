````md
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
    - 6.1 vendor 更新（three/ajv）の固定手順
  - 7. ローカル→デプロイまでの最短ルート
  - 8. よくある詰まりどころ（まずここ見ろ）
  - 9. AdSense 申請前の最低ライン
- Part II: Viewer 埋め込みと最小ホストの契約（/app/viewer / peek）
  - 10. Viewer Embed Contract（/app/viewer 安定表示の契約）
  - 11. ホスト分類（固定）
  - 12. Minimal Host（peekBoot）の位置づけ
  - 13. 監視（手動チェック）
  - 14. Peek viewer（Home埋め込み）: 最小ホスト契約
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

### /viewer（正統ルート）
- `/viewer` は **`apps/site/src/pages/viewer/index.astro` だけ**で定義する（これが正統）
- `apps/site/src/pages/viewer.astro` は **禁止**
- `/viewer/dev` `/viewer/run` のようなデバッグ用ページは **本番からは削除**
  - 置くなら「別ブランチ・別プロジェクト」でやる（prod に混ぜない）

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

### /viewer/dev と /viewer/run を潰す（本番でアクセスされても正統へ寄せる）

`apps/site/public/_redirects` にこれを入れる：

```txt
/viewer/dev    /viewer  301
/viewer/dev/   /viewer  301
/viewer/dev/*  /viewer  301
/viewer/run    /viewer  301
/viewer/run/   /viewer  301
/viewer/run/*  /viewer  301
````

確認（期待値: `301` で `/viewer` に飛ぶ）：

```ps1
curl.exe -I https://3dsl.pages.dev/viewer/dev
curl.exe -I https://3dsl.pages.dev/viewer/run
```

---

## 5) Deploy Probe（いま本番がどのコミットかを一発で判別）

`/__deploy_probe.txt` は **本番で「今のデプロイがどのshaか」を判別するためのファイル**。
これが無いと「デプロイ反映したか分からん」で永久に詰む。

### ルール（固定）

* `apps/site/public/__deploy_probe.txt` は **コミットしない**（ダミーが残ると混乱する）
* `guard-prebuild.mjs` が build 前に **同じJSONを public と dist の両方へ書く**

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

### 6.1) vendor 更新（three/ajv）の固定手順

vendor 更新はここに固定：

- `packages/docs/docs/ops/vendor_update.md`


`apps/site/scripts/guard-prebuild.mjs` が **Astro 実行前に止める**対象：

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

### (B) 変更をコミットして push

```ps1
git status
git add -A
git commit -m "chore(site): <変更内容>"
git push origin main
```

### (C) Cloudflare Pages 側でデプロイ確認（最重要）

1. Dashboard → Workers & Pages → `3dsl` → Deployments
2. 一番上の Production が最新コミットになってるか見る
3. **Probeで最終確認**（これが最重要）：

```ps1
curl.exe -s https://3dsl.pages.dev/__deploy_probe.txt
```

### (D) 反映が怪しい時（強制再デプロイ）

* 空コミットで押し込む：

```ps1
git commit --allow-empty -m "chore: redeploy"
git push origin main
```

* その後 Probe を見る：

```ps1
curl.exe -s https://3dsl.pages.dev/__deploy_probe.txt
```

---

## 8) よくある詰まりどころ（これだけ見とけばだいたい抜ける）

### 404でguardに止められる

* `src/pages/404.html.astro` が残ってる
  → **消す**、`public/404.html` に寄せる

### /viewer/dev や /viewer/run が 200 で返ってしまう

* `_redirects` が `public` に無い、または `dist` に出てない
  → `apps/site/public/_redirects` を確認
  → `npm --prefix apps/site run build` 後に `apps/site/dist/_redirects` を確認

### 本番の `__deploy_probe.txt` が古い／ダミーっぽい

* `public/__deploy_probe.txt` をコミットしてしまってる（ダミー固定で上書きされない）
  → 追跡を外す（例：`git rm --cached apps/site/public/__deploy_probe.txt`）
  → `.gitignore` で無視
  → buildで `guard-prebuild.mjs` が生成する形に統一

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

## 11) ホスト分類（固定）

* Full App Host: `/viewer/index.html` などの UI 付き通常ホスト（UI 層を含む）
* Minimal Host: `/viewer/peekBoot.js` を唯一の入口とする UI なしホスト（renderer + orbit input）
* Embed Host: `/app/viewer` のように site 側から iframe 経由で埋め込むホスト（DOM 契約あり）
* Dev Host: `/viewer/viewer_dev.html` や `viewerDevHarness.js`（開発専用、prod での利用禁止）

---

## 12) Minimal Host（peekBoot）の位置づけ

* 目的: UI を持たない “最小ホスト” を **例外として許可**（増殖防止のため入口固定）
* 入口: `/viewer/peekBoot.js` のみ（新規追加は契約更新が必須）
* 起動 API: `bootstrapViewerFromUrl(canvasOrId, url, options?)` を使用（`bootstrapViewer` 直叩きは例外扱い）
* 依存方向: **entry 以外に依存しない**（UI/hub/core/renderer を直接 import しない）
* DOM 契約: UI の DOM 契約は不要、必須なのは

  * `<canvas data-role="viewer-canvas">` または `#viewer-canvas` を 1 つ置くこと
  * canvas 以外の UI レイヤは持ち込まない

#### peekBoot import 連鎖（entry 起点）

```txt
peekBoot.js
└─ runtime/bootstrapViewer.js
   ├─ runtime/core/* (internal)
   ├─ runtime/renderer/* (internal)
   └─ runtime/viewerHub.js (internal)
```

---

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

## 16) Peek viewer（Home 埋め込み）: 最小ホスト契約

Home 等に埋め込む “UI なし” の Viewer は、`peekBoot.js` を **最小ホスト**として扱う。

### ルール（固定）

* `peekBoot.js` が import してよいのは **`runtime/bootstrapViewer.js` のみ**
* UI レイヤ（例: `ui/*`）や、その他の任意モジュールの import は禁止
* 違反した場合、SSOT チェックで `MINIMAL_HOST_FORBIDDEN_IMPORT` として検出される

### 目的

* 埋め込み用途で **UI/DOM を引き込まない**こと（ゾンビUI再発の封じ込め）
* “最小ホスト → runtime に委譲” の一本化で、構造の汚染を防ぐ

### 変更が必要になったら

* `peekBoot.js` に import を増やすのではなく、

  * `runtime/bootstrapViewer.js` 側へ機能を寄せる
  * どうしても例外が必要なら、SSOT の最小ホスト許可リスト（`minimalHostEntries`）を更新する

---

# Appendix: Viewer 側の実施記録（参考）

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

```

