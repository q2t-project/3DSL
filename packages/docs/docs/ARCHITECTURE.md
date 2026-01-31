# ARCHITECTURE — 3DSL Project (apps / packages / vendor)

## 0. 目的
本書は 3DSL リポジトリにおける **アプリ分割（apps）** と **共有資産（packages）**、および
外部依存の **同梱配布（/vendor）** の扱いを「契約」として固定する。

- 迷ったら本書を優先する。
- 生成物（mirrored / dist / public 等）を SSOT と取り違えない。
- 「どこを直せば全体が整うか」を常に一意にする。

関連: `packages/docs/policy/SSOT_POLICY.md`

---

## 1. リポジトリの三層

### 1.1 apps = 実行単位（ランタイム）
- `apps/viewer/` : Viewer アプリ（閲覧）
- `apps/modeler/` : Modeler アプリ（編集）
- `apps/site/` : Site（静的サイト / 配布ハブ）

apps は「起動・操作される成果物（runtime）」であり、公開（デプロイ）形態を持つ。

### 1.2 packages = 共有単位（SSOT / 公開単位）
- schema / core / renderer / ui / docs 等の共有資産は `packages/` に集約する。
- 将来的な公開（npm 等）を想定する場合、公開単位は packages とする。
- apps は公開単位ではなく「実行環境（demo / runtime）」とする。

### 1.3 vendor = 外部依存の同梱配布
- three など外部ライブラリは、**同梱（vendoring）** して配布する。
- SSOT は `packages/vendor/**` に一本化し、各 app の `public/vendor/**` はミラー（生成物）とする。

---

## 2. apps の役割分担（確定）

### 2.1 `apps/viewer/`（Viewer）
**役割**
- 3DSS コンテンツを「読む／表示する／操作する」閲覧専用アプリ。

**責務**
- Viewer UI / DOM
- 埋め込み（embed）契約（必要なら最小 UI）
- dev / build / smoke の入口を提供

**非責務**
- 編集（dirty / Save / Export / Undo-Redo 等）

**依存**
- `packages/*`
- `apps/viewer/public/vendor/*`（vendor のミラー）

---

### 2.2 `apps/modeler/`（Modeler）— 方針A【確定】
**役割**
- 3DSS を編集する独立ランタイムアプリ（Viewer / Site から独立して起動できる）。

**責務**
- 編集 UI（Outliner / Property / QuickCheck / Preview）
- dirty state / Undo-Redo
- Save / Save As / Export 3DSS
- 編集体験の一貫性（選択→編集→適用→保存）

**構成ルール（必須）**
- `apps/modeler/package.json` を持つ
- `apps/modeler/src/` を持つ
- `apps/modeler/public/vendor/` を持つ（vendor ミラー）
- `npm --prefix apps/modeler run dev|build|smoke` が成立する

**依存**
- `packages/*`
- `apps/modeler/public/vendor/*`（vendor のミラー）

---

### 2.3 `apps/site/`（Site / 配布ハブ）
**役割**
- 静的サイト（Astro）としての情報提供・配布ハブ。
  - Top / Docs / Library / SEO / AdSense / 公開導線

**責務**
- docs の表示（`packages/docs/docs/**` をミラー）
- library の表示（`packages/3dss-content/dist` を参照）
- Viewer / Modeler への導線提供

**非責務**
- Viewer / Modeler の実装本体を内包しない（site に編集・描画ロジックを閉じ込めない）

---

## 3. vendor の SSOT とミラー（確定）

### 3.1 SSOT（正）
- 外部ライブラリの SSOT は `packages/vendor/<lib>/...` に置く。
- 例（three）:
  - SSOT: `packages/vendor/three/build/three.module.js`

### 3.2 ミラー（生成物）
- 各 app は `public/vendor/**` を持ち、sync により生成する。
- 例（three）:
  - `apps/viewer/public/vendor/three/build/three.module.js`
  - `apps/modeler/public/vendor/three/build/three.module.js`
  - `apps/site/public/vendor/three/build/three.module.js`（必要な場合のみ）

**重要**
- `public/vendor/**` は常に生成物であり、手編集は禁止。
- 編集・更新は必ず `packages/vendor/**` に行い、sync で反映する。

---

## 4. sync の責務（確定）
sync は「SSOT → ミラー」を機械的に再現する。

- `sync:vendor` :
  - `packages/vendor/** → apps/*/public/vendor/**`
- `sync:docs` :
  - `packages/docs/docs/** → apps/site/**`（Site 側の表示用）
- `sync:schemas` :
  - `packages/schemas/** → 必要な配布先`
- `sync:viewer` / `sync:modeler` :
  - SSOT から各 app への最小ミラー（必要物のみ）

---

## 5. 判断に迷ったときの優先順位
1. 本書（ARCHITECTURE）
2. `packages/docs/policy/SSOT_POLICY.md`
3. `packages/docs/docs/**` 内の契約ドキュメント
4. `AGENTS.md`（運用ガイド）

