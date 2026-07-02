# Repo 再構築アクションプラン（2026-07）

このrepoを「コピーして警察する」構造から「import してビルドする」構造へ段階移行するための実行計画。
評価の要旨: sync/check 機構の大半は「ビルドステップなし・npm 依存解決なし」という制約への対症療法であり、
根本（workspaces + バンドラ導入）を直すことで機構ごと削減する。

- 方針決定日: 2026-07-03
- 基点ブランチ: `fix/vendor-ajv`（origin/main より 16 コミット先行。origin/main 固有コミットはマージコミットのみ）
- 進め方: 1 フェーズ = 1 ブランチ = 1 PR。各フェーズ末尾の合格基準を満たしてから次へ。

---

## 共通の合格基準（全フェーズ）

1. `apps/site` の `ci:dod` 相当（チェック + ビルド）がグリーン。
2. `dist/` 出力が Phase 0 で取得したベースラインと一致、または差分が意図したもののみ（差分は PR に記載）。
3. モデラー・ビューアの手動スモーク: 起動 / シーン読込 / 選択 / 保存。

## ロールバック方針

各フェーズは独立ブランチなので、問題があれば PR を revert して前フェーズ状態に戻る。
Phase 3（コピー削除）のみ、削除前に 3 重コピー間の diff を精査した記録を PR に残すこと。

---

## Phase 0 — 安全網の敷設（ブランチ: `chore/restructure-phase0`）

- [ ] `apps/site` で `npm ci` + `ci:dod` をローカル実行しグリーン確認
- [ ] `dist/` のファイル一覧 + SHA-256 スナップショットを `_tmp/restructure-baseline/` に保存（gitignore 済み領域）
- [ ] ルート掃除
  - [ ] `linkcheck*.txt` 削除（検査結果の成果物）
  - [ ] `make-repo-zip0.ps1` 削除（旧版バックアップ）
  - [ ] `apps/site/src/pages/_disabled_*.bak` 削除
  - [ ] `AGENTS.proposed.md` の内容を `AGENTS.md` に反映して削除
  - [ ] `apps/site/mirror_left.mjs` → `apps/site/scripts/tool/` へ移動
- [ ] 壊れた参照の修正
  - [ ] `packages/docs/repo/MAP.md` の `AGENTS_MODELER.md`（実体なし）→ `packages/docs/docs/ops/agent-workflow.md` に修正
- [ ] Phase 0 実施中に発見した問題の修正
  - [ ] CI の偽グリーン: `npm run ci:dod | tee` が pipefail なしで終了コードを握りつぶしていた → `set -o pipefail` 追加
  - [ ] DoD 失敗（既存バグ）: `/library` に canonical link がない → astro.config に `site` を設定し、Layout でデフォルト canonical を導出
- [ ] 記録: 当初評価の訂正
  - `packages/vendor`（49MB / 1,286 ファイル）は **実在し git 追跡済み**（zip 作成スクリプトが除外していたため評価時に不可視だった）。vendor ツリーは `packages/vendor` と `apps/modeler/public/vendor` の **2 本** → Phase 2 の対象を両方に拡大
  - `.gitignore` の `!packages/vendor/**/dist/` は有効（stale ではない）
  - `apps/modeler/public/vendor` の `ajv/dist` / `ajv-formats/dist` / `troika-three-text` は `**/dist/` に食われて **未追跡**（フレッシュクローンでは modeler スタンドアロンが不完全）。Phase 2 で vendor ごと廃止するためトラッキング追加はしない
- [ ] git 衛生（ユーザー判断事項）
  - [ ] `fix/vendor-ajv` → `main` の同期（PR）
  - [ ] `rescue/*` / `restore/*` / `redo/*` 系ブランチの棚卸しリストを提示、削除可否を確認
  - [ ] ローカル `master` と `main` の併存解消

## Phase 1 — pnpm workspaces 導入（ブランチ: `chore/workspaces`）✅ 完了

- [x] ルート `package.json` + `pnpm-workspace.yaml` 作成（site / modeler / viewer を登録。3dss-content は package.json 自体が無いため Phase 3 で判断）
- [x] lockfile をルート 1 本に統合（`pnpm import` で npm lockfile から変換、`apps/site/package-lock.json` 削除）
- [x] `scripts/check/no-root-npm.*` / `site-npm-sanity.*` ガード撤去（workspaces 導入により役目終了）
- [x] site の `check:modeler:*` / `check:viewer:*` を各パッケージの `package.json` へ移動（`apps/modeler/package.json`・新規 `apps/viewer/package.json` に `check:ssot` 追加、site からは `pnpm --filter modeler/viewer run check:ssot` で呼ぶ）
- [x] `pnpm --filter modeler run check:ssot` / `pnpm --filter viewer run check:ssot` で横断実行できることを確認（exit 0）
- [x] `.github/workflows/ci.yml` を pnpm + ルート実行に更新
- [x] `packages/docs/docs/ops/DEVOPS_site.md` の Cloudflare Pages 設定を更新（下記）
- [x] `overrides` は npm 形式（package.json）から `pnpm-workspace.yaml` の `overrides` へ移行（pnpm はこの形式のみ読む）
- [x] `esbuild` / `sharp` の postinstall を `pnpm-workspace.yaml` の `allowBuilds` で明示許可

### Cloudflare Pages 設定変更（本番環境・ユーザー実施）

pnpm workspace 化により Root directory を `apps/site` のままにするとロックファイル（リポジトリルートの `pnpm-lock.yaml`）が見えなくなるため、Cloudflare Pages ダッシュボードの設定変更が必要:

- Root directory: `apps/site` → **`/`**（リポジトリルート）
- Build command: `npm run build` → **`corepack enable && pnpm install --frozen-lockfile && pnpm --filter awesome-altitude run build`**
- Build output directory: `dist` → **`apps/site/dist`**
- `NODE_VERSION`: `22.12.0` 系に更新推奨（`engines` と一致）

DEVOPS_site.md に現行設定として反映済み、旧設定は `<details>` で参考保持。

### 検証結果
- `pnpm install --frozen-lockfile` → OK（node_modules 全消去からの再インストールでも再現）
- `apps/site` で `pnpm run ci:dod` → exit 0（69 ページビルド）
- dist 差分: baseline との差分は `__deploy_probe.txt`（ビルド時刻+sha）、`library_index.json`（generated_at）、本計画書自身のページの3件のみ。すべてビルド時刻由来で構造的差分なし

## Phase 2 — vendor 依存の npm 化（ブランチ: `chore/vendor-to-npm`）

対象は 2 本の vendor ツリー: `packages/vendor/`（49MB, sync:vendor の SSOT）と `apps/modeler/public/vendor/`（modeler スタンドアロン用）。

- [ ] 各ライブラリの実バージョン特定（three / ajv / ajv-formats / i18next / chart.js / troika-three-text）
- [ ] npm 依存として宣言し、import を bare specifier に置換
- [ ] modeler / viewer に最小の Vite ビルドを追加（自己ホスト方針は維持: バンドルするので CDN 不要）
- [ ] vendor ツリー削除（約 1,270 ファイル）
- [ ] `check:vendor-required` 廃止
- [ ] フォント（noto-sans-jp）は vendor 継続 or `@fontsource` 化を判断

## Phase 3 — sync コピー機構の廃止（ブランチ: `chore/remove-sync`）

- [ ] viewer / modeler を site のビルドから直接取り込む構成へ（Astro/Vite 統合 or ビルド時出力）
- [ ] 3 重コピーの diff 精査（`apps/*/ssot` が正であることの確認、差分があれば取り込み判断）
- [ ] コミット済みコピー削除: `apps/site/public/{modeler_app,viewer_app,viewer_app_premium,premium_app}`、`apps/modeler/public/modeler_app`
- [ ] `scripts/sync/*` 7 本削除、`predev` / `prebuild` から sync を除去
- [ ] `check:*generated-clean*` 系削除（コピーが消えるため役目終了）
- [ ] 開発ループ所要時間の before/after を記録

## Phase 4 — テスト基盤導入（ブランチ: `chore/vitest`）

- [ ] Vitest 導入（ルート devDependency）
- [ ] 既存の実行時チェックを移植: `viewer-hub-dispose-safety.mjs`、modeler smoke（`minimal-selection.mjs`）
- [ ] core 層の純粋ロジックから単体テスト追加（`structIndex` / `recomputeVisibleSet` / `normalizeMicro` など）
- [ ] regex ベース contract check は、対応する設計変更（例: single-writer → 書き込み API の専有モジュール化）が済んだものから削除
- [ ] CI にテストジョブ追加

## Phase 5 — 型付けとファイル分割（継続、ブランチ: 都度）

- [ ] 全 JS に `// @ts-check` + JSDoc で型エラーを可視化（コード変更なし）
- [ ] エラーの少ないファイルから `.ts` 化
- [ ] 優先順（変更頻度 × サイズ）: `viewerHub.js`(2,079 行) → `uiPropertyController.js`(1,783 行) → `gizmo.js`(1,507 行)
- [ ] 巨大ファイルの分割は型化・テスト整備の **後**（順序厳守）

---

## 廃止予定の一覧（完了時点）

| 対象 | 廃止フェーズ | 理由 |
| --- | --- | --- |
| `scripts/check/no-root-npm.*` | 1 | workspaces で構造的に解決 |
| `packages/vendor/` + `apps/modeler/public/vendor/` | 2 | npm 依存化 |
| `check:vendor-required` | 2 | 同上 |
| `scripts/sync/*`（7 本） | 3 | ビルド統合で不要 |
| `check:*generated-clean*` | 3 | コピー消滅で不要 |
| コミット済み public コピー群 | 3 | ビルド出力化 |
| regex 系 contract check | 4〜 | テスト + 言語機構で代替 |
| `make-repo-zip.ps1` / `_out` zip 運用 | 任意 | git push + CI で代替 |
