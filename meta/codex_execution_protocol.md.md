# codex_execution_protocol.md  
**3DSL Codex 実行プロトコル（正式運用指針）**  
version: 1.0 date: 2025-10-24  

---

## 1. 目的
Codex による自動コーディングを安全かつ再現的に行うため、  
仕様書内「Codex Directives」節の扱い方・実行手順・修正ルールを定義する。  

---

## 2. 運用対象

| 対象フェーズ | ファイル群 | 内容 |
|---------------|-------------|------|
| **P1-06** | `/specs/3DSD_*.md` | Codex Directives（生成指令文） |
| **P2** | `/code/*/` | Codex 出力コード |
| **P3** | `/logs/runtime/`, `/data/` | 実行検証結果 |
| **P4** | `/specs/3DSD_*.md`（改訂版） | 指令修正・再整合 |

---

## 3. 役割分担

| 役割 | 主担当 | 機能 |
|------|--------|------|
| **人間** | 仕様確認者・進行管理者 | 実行順序の判断・出力レビュー・修正承認 |
| **ChatGPT** | 仕様整理者・指令整形者 | P1-06 の Directives 作成・修正版生成 |
| **Codex** | コーディング実行者 | Directives に基づくファイル生成とビルド |
| **Validator** | 自動検証者 | 出力コードと JSON の整合確認 |

---

## 4. 実行手順（逐次実行プロトコル）

### Step 1️⃣ — 指令単位で実行  
- P1-06 に記載された **Directive 01 → 02 → 03 …** の順に進行。  
- 一括実行は禁止。各 Directive ごとに **「Codex 実行指令文」** を明示的に送信。  
- 実行単位は *1 Directive = 1 タスク*。

### Step 2️⃣ — 出力確認  
- Codex の生成結果を人間がレビューし、  
  `/code/<module>/` 以下の構成・依存・I/O を `/specs/` と照合。  
- Validator が schema-valid を確認。

### Step 3️⃣ — 問題発生時の修正  
- 軽微な誤差：ChatGPT が当該 Directive 内の修正版を生成。  
- 構造的誤り：該当フェーズを「rollback」として `/meta/update_log.md` に記録。  
- 重大エラー時は「Directive 再設計」扱いとし、P1-06 を再編集。

### Step 4️⃣ — 検証ログ化  
- 各実行結果を `/logs/runtime/codex_exec_YYYYMMDD.log` に記録。  
- 書式例：  
  ```
  [2025-10-24 18:32:00] [Codex] MODULE:validator DIRECTIVE:02 RESULT:OK DURATION:12s
  ```

### Step 5️⃣ — 次指令への移行  
- 直前の Directive が **“Validated OK”** 状態になってから次へ。  
- 未承認のまま進むことは禁止。

---

## 5. フィードバックループ

| 段階 | 内容 |
|------|------|
| **P2→P3** | 出力コードを実行・検証。結果をログ化。 |
| **P3→P4** | ログをもとに Codex Directives を改訂。 |
| **P4→P2** | 改訂指令を再投入し再生成。 |

このループを **1 Directive 単位** で回すことで、  
Codex 出力の学習的精度と再現性を高める。

---

## 6. 命名・ブランチ運用
- Codex 出力は `task/<module>-directiveXX` ブランチで管理。  
- マージ後は main に自動テストを走らせる。  
- Directive 修正版は `_v2`, `_v3` サフィックスで保存。

---

## 7. 禁則事項
- 一括「すべての Directive 実行」コマンドの発行。  
- `/specs/` を Codex に直接上書きさせる操作。  
- 未レビュー状態で次 Directive へ進むこと。  
- ChatGPT 側で Codex 出力を“推定補完”する行為。  

---

## 8. 終了条件
- 最終 Directive が **Validated OK** かつ  
  `/specs/` 内が **locked** 状態になった時点で完了。  
- 以降は P2 実装完了 → P3 検証 → P4 改訂 に自動遷移。

---

## 9. 改訂履歴

| 日付 | Ver | 内容 | 担当 |
|------|-----|------|------|
| 2025-10-24 | 1.0 | 初版作成（P1-06正式対応） | ChatGPT＋人間 |

