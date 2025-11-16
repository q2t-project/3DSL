PR7: viewer selftest（C-3）

この PR は C-3「viewer selftest（パイプライン一周）」を緑に寄せるためのタスク。

- 対象: `code/viewer/**`
- ゴール: `npm run selftest:viewer` で
  - ThreeDSSDocument を起点に
  - viewer の scene builder / context / renderer / HUD までを「最低限一周」させる selftest が通る状態にする。

前提:
- A セクション（型・スキーマ・validation）は PR3 までで ✅ 済み
- B セクション（importer / PREP / exporter）は PR4〜PR6 でほぼ ✅
- viewer の変換レイヤ（C-1）と scene builder selftest（C-2）は PR2/PR3 で ✅ 済み

---

## 1. ゴール（Done の定義）

1. `npm run selftest:viewer` がローカルでグリーンになること。
2. selftest 内で、少なくとも次のパスが 1 回は通っていること。
   - ThreeDSSDocument（またはそれと等価なオブジェクト）を準備
   - viewer の scene builder（`code/viewer/scene/scene_builder.js`）で ViewScene を構築
   - viewer context / commands / renderer / HUD（必要な範囲）を初期化
3. selftest の中で、最低限のアサーションが入っていること。
   - ViewScene に root scene が 1 つある
   - 可視ノード数（または points / meshes 数）が期待値と一致する
   - renderer / HUD の初期化で例外を投げないこと
4. C-3 の状態を `meta/policy/3DSL_repo-goals.md` 上で ⚠️→✅ に更新できるだけの根拠が selftest として揃っていること。

---

## 2. 変更範囲と方針

### 2-1. viewer selftest エントリ

- 対象ファイル（既存 or 新規）:
  - `code/viewer/selftest/viewer_selftest.js`
- 方針:
  - 既存の viewer selftest があれば、内容を整理して「パイプライン一周」のテストに寄せる。
  - なければ新規で作成する。

selftest エントリは「Node を立ち上げて 1 回実行するスクリプト」としてシンプルに実装する。

例イメージ（あくまで方針、実装詳細はリポジトリの API に合わせて調整）:

- ThreeDSSDocument 相当のオブジェクトを用意
  - 可能なら `code/common/core/modelTypes.js` の工場関数を使う
  - なければ selftest 用の最小サンプルをスクリプト内にベタ書きしてもよい
- viewer の scene builder で ViewScene に変換
  - `import { createScene } from '../scene/scene_builder.js';`
- viewerContext / viewerRenderer / viewerHudController を最小限初期化
  - DOM 依存がきつければ、テスト用のダミーコンテナやモックを用意して「例外を出さない」ことだけを確認
- 最後に `console.log` で簡単なサマリ（ノード数など）を出す

### 2-2. selftest サンプルデータ

- 必要に応じて、viewer 専用のミニマルな ThreeDSSDocument サンプルを用意する。
  - 候補:
    - 既存の modeler exporter / importer selftest の MINIMAL_SCENE 相当を再利用
    - 共通化できそうなら `code/data/` や `code/common/testdata/` 的な場所に切り出してもよい（今回は無理にやらなくてもよい）

要件:
- 少なくとも 1 シーン、1〜2 ノード（point / mesh など）がある
- metadata / transform などが現実的な値になっている（スキーマ validation に通る）

### 2-3. viewer 用の補助 selftest（必要なら）

- すでに `code/viewer/selftest/viewer_scene_builder.spec.js` などの node:test ベース selftest がある。
- それとは別に、次のような「統合寄り selftest」を追加してもよい（必須ではないが余裕があれば）:
  - `code/viewer/selftest/viewer_pipeline.spec.js`
    - scene builder → context → renderer 初期化までを node:test で検証
    - DOM 依存が強ければ、renderer / HUD の一部はモックや no-op 実装に差し替えてもよい

---

## 3. タスク一覧（Codex / ChatGPT 用）

### T-1: 現状調査

- [ ] `code/viewer/selftest/` 配下の既存 selftest を確認
  - どこまでパイプラインをカバーしているか把握する
- [ ] viewer のエントリポイント〜パイプラインをざっとトレース
  - `viewerBootstrap.js`
  - `viewerContext.js`
  - `viewerRenderer.js`
  - `viewerHudController.js`
  - `scene/scene_builder.js`
- [ ] ThreeDSSDocument を前提にしている箇所（型コメントや validator）をメモる

### T-2: selftest 用サンプルドキュメントの用意

- [ ] 既存 selftest / spec / exporter から再利用可能な最小 ThreeDSSDocument を探す
- [ ] 見つからなければ、selftest 内に最小の ThreeDSSDocument オブジェクトを定義する
  - version / scene / nodes / metadata など、スキーマ的に必要なフィールドを満たす

### T-3: `npm run selftest:viewer` 実装

- [ ] `code/viewer/selftest/viewer_selftest.js` を実装 or 更新
  - 三DSSドキュメントを生成
  - scene builder → viewer context / renderer → HUD の順に呼び出す
  - 途中で例外を投げないことを確認する
  - 最低限のアサーション（ノード数など）を行う
- [ ] `package.json` の `"scripts"` を確認
  - 既存の `"selftest:viewer": "node code/viewer/selftest/viewer_selftest.js"` をそのまま利用
  - なければ追加する

### T-4: 追加 selftest（あれば）

- [ ] 余裕があれば、`code/viewer/selftest/viewer_pipeline.spec.js` のような node:test ベースのテストを追加
  - scene builder → context → renderer を 1 ファイルで薄く検証

### T-5: repo-goals 更新

- [ ] `meta/policy/3DSL_repo-goals.md` の C-3 行を更新
  - 状態: ⬜ or ⚠️ → ✅
  - 担当 PR: PR7: viewer selftest（C-3）

---

## 4. テストコマンド

この PR で最低限回すべきコマンド。

```sh
# common / modeler / viewer の selftest（既存）
node --test code/common/selftest/*.spec.js
node --test code/modeler/selftest/*.spec.js
node --test code/viewer/selftest/*.spec.js

# viewer パイプライン一周 selftest
npm run selftest:viewer
