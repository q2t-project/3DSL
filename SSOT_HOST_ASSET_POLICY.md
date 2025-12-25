# SSOT: Astro host integration / asset path rule

## 目的

viewer の公開物（`astro/public/viewer/` に配置される一式）を **`/viewer/` 名前空間に閉じた自己完結な配布物**として扱う。

- Host（Astro）側のページ実装がどこに置かれていても参照先が一意になる
- `astro/public/viewer/` の同期（コピー）だけで viewer が動く
- `/assets/` などサイト共通資産への依存・衝突を避ける

## 固定ルール

### 1) viewer 公開資産は `/viewer/` から参照する

Host のページ（`src/pages/viewer.astro`）から参照する **viewer 関連の CSS/JS/画像**は、すべて以下を満たすこと。

- `href="/viewer/..."` / `src="/viewer/..."` の **絶対参照**
- `../` や `/assets/` への参照は禁止（viewer が host 共通資産に依存しない）

例（OK）

- `/viewer/viewer.css`
- `/viewer/viewerHostBoot.js`
- `/viewer/assets/icons/frame-play.svg`
- `/viewer/assets/logo/3DSD-viewer.svg`

例（NG）

- `../assets/...`
- `/assets/...`
- `./something.svg`

### 2) Host 側の SSOT は viewer リポジトリに置く

Astro の `src/pages/viewer.astro` は **コピー先**であり、SSOT はこのリポジトリ側に置く。

- SSOT（正）：`/viewer/host/astro/pages/viewer.astro`
- 同期先：`astro/src/pages/viewer.astro`

Host 側を直接編集した場合は、必ず SSOT 側へ取り込み、チェックを通す。

### 3) viewer 向け UI 画像は `/viewer/assets/` に置く

viewer 画面内で使う UI 用の SVG（視認性トグル、フレーム操作、autoOrbit など）は `viewer/assets/` 配下に置く。

- SSOT（正）：`/viewer/assets/icons/*.svg` / `/viewer/assets/logo/*.svg`
- 同期先：`astro/public/viewer/assets/...`（`public/viewer` へコピーされるため自動）

## チェック

`manifest.yaml` の `host-asset-paths` がこのルールを静的に検査する。

- 対象：`viewer/host/` 配下の `*.astro` / `*.html`
- 禁止：`/assets/` と `../assets/` を含む参照（例外は明示的にホワイトリスト）
