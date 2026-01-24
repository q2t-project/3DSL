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

### 3.4 UI 状態 / 作業状態
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
