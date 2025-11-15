# AGENTS.md（3DSL Codex 運用規約 v2）

## 0. 目的と適用範囲

本書は、3DSL リポジトリにおける **Codex の権限と動作範囲** を定義し、
仕様レイヤと実装レイヤの混在を防ぐことを目的とする。

対象：
- Human（設計・承認・実行）
- ChatGPT（仕様編集・差分整理）
- Codex（コード生成・実装修正）
- GitHub（履歴台帳）

本書は `/meta/policy/3DSL_仕様駆動開発プロセス.md` を前提とする。
詳細なプロセス・UI・vendor の方針は、AGENTS には書かず、各ポリシーファイルで定義する。

---

## 1. 役割分担

### 1.1 Human

- `/specs/`, `/schemas/` の編集・承認を行う。
- Codex 実行指令ファイルを作成し、手動で Codex を起動する。
- Codex 出力のレビュー・commit を行う。

禁止：
- Codex 出力の自動 commit
- Codex を「リポジトリ全域スキャン」モードで常駐させること

### 1.2 ChatGPT

- 仕様文書・スキーマ説明・開発ポリシーの作成／改訂案を出す。
- Codex 実行指令ファイルのドラフトを作成する（Human が最終確認）。

責務：
- `/specs/` と `/schemas/` の整合性をテキストレベルで確認する。
- 仕様変更差分を明示し、どの範囲を Codex に渡すかを分離して提示する。

禁止：
- Codex に対する直接実行命令
- 仕様未定義の概念を、Codex 用タスクに紛れ込ませること

### 1.3 Codex

- `/code/`, `/scripts/` を中心に実装を生成・修正する。
- 仕様やスキーマは **参照のみ** とし、変更しない。

禁止：
- `/specs/`, `/schemas/`, `/meta/policy/`, `/docs/` への書き込み
- 仕様文書の「整合性検証」や「自動レビュー」など、仕様レイヤの職務を肩代わりすること
- GitHub への直接 commit / push

---

## 2. ディレクトリ別アクセス権

### 2.1 読み取り専用

- `/specs/`
- `/schemas/`
- `/code/vendor/`
- `/meta/policy/`
- `/docs/`
- `/repo_structure.txt`
- `/AGENTS.md`

Codex はこれらを参照できるが、書き換えてはならない。

### 2.2 読み書き可能（Codex）

- `/code/`
  - `code/common/`
  - `code/modeler/`
  - `code/viewer/`
  - `code/scripts/`
- `/scripts/`
- `/logs/`
  - `logs/codex/`（検証・実行ログ）
  - `logs/tests/`
  - `logs/runtime/`
- `/data/`
  - `data/imports/`
  - `data/exports/`
  - `data/sample/`

Codex はこれらに対して、新規ファイル生成・既存ファイル更新ができる。
ただし、削除や大規模な構造変更は、明示的な指令がある場合に限る。

### 2.3 Codex が触らない領域

- `.github/`
- `meta/logs/`
- `meta/tools/`（Human/ChatGPT 用のメタツール定義）
- `LICENSE`, `.gitignore`, `.gitattributes`, `README.md`, `package.json` のメタ情報
  - `package.json` の `scripts` 以外のフィールドは、Human/ChatGPT のみ変更可。

---

## 3. Codex 実行指令ファイル

Codex は **必ず指令ファイル経由** で動かす。

### 3.1 位置

- `/meta/tools/codex_orders/` 以下（例）  
  - `/meta/tools/codex_orders/2025-xxxx_modeler-feature-foo.md`

### 3.2 指令ファイルに含める内容（必須）

- 対象仕様：
  - 参照すべき `/specs/*.md` のパス
  - 参照すべき `/schemas/*.json` のパス
- 実装スコープ：
  - 書き込みを許可するディレクトリ（例：`/code/modeler/core/`）
  - 変更禁止ディレクトリのリスト
- タスク内容：
  - 追加・修正すべき機能の説明（仕様差分に対応）
- 出力先：
  - ログファイル例：`/logs/codex/2025MMDD_HHMM_modeler-feature-foo.log`

Codex は、この指令ファイルに書かれた範囲以外を勝手に解析・変更してはならない。

---

## 4. 実行フロー

1. Human＋ChatGPT：
   - `/specs/`, `/schemas/` を更新し、仕様差分を整理する。
   - Codex 実行指令ファイル（`/meta/tools/codex_orders/*.md`）を作成する。

2. Human：
   - 指令ファイルを確認し、Codex を手動で起動する。
   - 出力されたコード／ログをレビューし、問題なければ commit する。

3. ChatGPT：
   - Codex ログを要約し、必要なら仕様へのフィードバックを提案する。
   - 仕様の更新が必要な場合は `/specs/` 側を修正する案を出す。

AGENTS はここまでとし、それ以外のプロセス詳細（UI方針、vendor配置など）は `/meta/policy/*.md` に委ねる。

---

## 5. 禁止事項まとめ

- Codex による `/specs/`, `/schemas/` の書き換え
- Codex による UI / vendor ポリシーの決定・変更
- ChatGPT → Codex の直接実行命令
- Codex → GitHub の直接 commit / push
- 「常駐プロセス」「自動同期」「自動再構成」など、Human 監督外での自律動作

