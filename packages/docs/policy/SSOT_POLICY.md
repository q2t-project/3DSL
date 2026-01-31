# SSOT_POLICY — 3DSL Project

## 0. 目的
このドキュメントは 3DSL プロジェクトにおける **SSOT（Single Source of Truth）** と
**生成物 / 仕様 / 実装の境界**、および **依存方向（layer / ports）** を固定する。

最重要目的は次の3つ：
- **コンタミ防止**（生成物やUI状態が契約データへ混入しない）
- **依存方向の固定**（設計が崩れてバグ・改修地獄になるのを防ぐ）
- **検証可能性**（check により機械的に守れる状態にする）

---

## 1. 用語
- **SSOT**：唯一の正とみなす情報源。ここを直せば全体が整合する。
- **Contract SSOT**：外部／他モジュールと合意された契約（例：schema）
- **Human Spec**：人間向け仕様（設計意図・操作・ルール）
- **Generated**：自動生成物。手で編集しない。
- **IR**：Import/permissive のための中間表現。strict 出力へ混入させない。

---

## 2. SSOT の階層（優先順位）
優先順位が高いほど “正” とする。

1) **Schema / Contract SSOT**
   - `schemas/**/3DSS.schema.json`（例：3DSS.schema.json）
2) **Spec（Human Spec / Contractの解説）**
   - `packages/docs/**` および 各アプリ `apps/*/ssot/*.md`
3) **Generated**
   - `**/_generated/**`（PORTS.md 等）
4) **Implementation**
   - `apps/*/src/**`, `packages/*/src/**`

矛盾が出たら **上位が正**。Spec と schema が食い違うなら **schema が正**。

---

## 3. ファイル種別と編集権限
### 3.1 Schema（契約）
- `schemas/**` は **Contract SSOT**
- 変更は **互換性・影響範囲・移行**を必ず伴う（PRで明示）

### 3.2 Spec（仕様）
- `packages/docs/**` は共通の仕様・概念・規約の SSOT
- アプリ固有の仕様は `apps/<app>/ssot/*.md` に置く
- spec は実装詳細ではなく **契約・挙動・禁止事項**を優先して書く

### 3.3 Generated（生成物）
- `_generated/**` は **直接編集禁止**
- 編集したくなったら generator を直す（生成ロジックがSSOT）



### 3.4 Mirrored（site/public へのミラー）
- `apps/site/public/**` のうち、下記は **sync により生成されるミラー**（作業ツリー上に存在しても **Git 追跡しない**）：
  - `apps/site/public/viewer/`（SSOT: `apps/viewer/ssot`）
  - `apps/site/public/modeler_app/`（SSOT: `apps/modeler/ssot`）
  - `apps/site/public/vendor/`（SSOT: `packages/vendor`）
  - `apps/site/public/schemas/`（SSOT: `packages/schemas`）
  - `apps/site/public/_data/`（SSOT: `packages/3dss-content/dist` 等）
  - `apps/site/public/fixtures/`（SSOT: `packages/3dss-content`）

- Vendor 更新の作業手順は `packages/docs/docs/ops/vendor_update.md` を参照。

- これらが Git で追跡されると **SSOT が二重化**し、差分・レビュー・CI を破壊するため禁止。
- 検知は `apps/site/scripts/check/generated-clean.mjs`（`npm run check:generated-clean`）で **必ず落とす**。

**復旧手順（誤って追跡した場合）**
- index から外す（作業ツリーは残す）：
  - `git rm -r --cached apps/site/public/modeler_app apps/site/public/_data apps/site/public/vendor apps/site/public/schemas apps/site/public/fixtures apps/site/public/viewer`
- `.gitignore` に上記ミラーを追加
- `npm run sync:all` → `npm run check:ssot` で整合確認

### 3.5 UI 状態 / 作業状態
- UI状態（選択、列構成、ロック等）は **契約データへ混入禁止**
- 永続が要る場合は sidecar（`.sidecar.json` 等）へ隔離

---

## 4. コン タ ミ 禁 止（最重要）
- strict 出力（例：`.3dss.json`）へ次を混入させない：
  - UI状態（選択、列、カメラ、ロック）
  - Import 由来の unknown fields / コメント / 目印
  - 自動補完の痕跡（ログ・診断）
- 痕跡の置き場は **IR / sidecar / ログ**に分離する（各アプリ仕様に従う）

---

## 5. layer / dependency / ports（越境口）
各アプリは `apps/<app>/ssot/manifest.yaml` を SSOT とし、
以下を必ず持つ：
- layer 定義
- 依存方向（allowed / forbidden）
- ports（越境口）
- checks（機械的強制）

**越境は ports に限定**。例外を作らない。

---

## 6. check の原則
- check は “推奨” ではなく **落ちる（enforced）** を基本とする
- 落ちる check を増やすのはOK（安全性UP）
- 落ちる check を弱めるのは原則NG（やるなら理由と代替を明記）

---

## 7. 変更フロー（最小）
- Schema 変更：spec更新、互換/移行の説明、必要なら compat レイヤ
- Spec 変更：manifest（ports/checks）と齟齬が無いか確認
- Generated 変更：generator 更新 → 再生成 → 差分0確認

---

## 8. このポリシーの適用範囲
このポリシーはプロジェクト全体に適用する。
アプリ固有の例外・追加ルールは `apps/<app>/ssot/SSOT_POLICY.md` に記載する。

---

## X. apps / packages / vendor の確定契約（2026-01-31）
本プロジェクトの **実行単位（apps）**、**共有単位（packages）**、**外部依存（vendor）** の扱いは次で固定する。

### X.1 apps（ランタイム）
- `apps/viewer/` : 閲覧専用の Viewer アプリ
- `apps/modeler/` : 編集用の Modeler アプリ（方針A：独立アプリとして復活【確定】）
- `apps/site/` : 静的サイト（配布ハブ / docs / library / SEO）

`apps/site` は Viewer / Modeler の実装本体を内包しない（導線と表示に専念）。

### X.2 packages（共有・公開単位）
- schema / renderer / core / ui / docs など共有資産は `packages/` に集約する。
- 公開単位（将来の npm 等）は packages を想定し、apps は実行・デモ用途に留める。

### X.3 vendor（外部依存の同梱）
- three 等の外部ライブラリは **同梱配布**とし、SSOT は `packages/vendor/**` に一本化する。
- `apps/*/public/vendor/**` は sync により生成されるミラー（生成物）であり、手編集は禁止。

### X.4 public（配信用ミラー）

- `apps/site/public/**` は配布用のミラーであり、SSOT から sync で生成される（手編集は禁止）。
- `apps/modeler/public/**` は Modeler standalone dev/build 用の配信用ミラーであり、
  SSOT（`apps/modeler/ssot/**` と `packages/vendor/**`）から sync で生成される（手編集は禁止）。

詳細は `packages/docs/docs/ARCHITECTURE.md` を参照。

