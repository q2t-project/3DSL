PR-ROOT：3DSL リポジトリ収束タスク（ゴール状態の可視化）

1. 参照仕様（読み取り専用）

/AGENTS.md
/meta/policy/3DSL_仕様駆動開発プロセス.md
/meta/policy/3DSL_repo-goals.md

/specs/3DSD-common.md
/specs/3DSD-modeler.md
/specs/3DSD-viewer.md

/schemas/3DSS.schema.json
/schemas/3DSS-prep.schema.json
/schemas/3DSS_spec.md

Codex はこれらを読み取り専用で参照すること。書き込み禁止。

2. 書き込み許可ディレクトリ（ROOT スコープ）

Codex が 編集・新規作成可能：

logs/codex/

※ この ROOT 指令書ではコード変更を行わない。
※ 実装変更は各 PR 指令書（PR2〜PR7 等）側で行う。

3. タスク内容（ROOT の責務）

3.1 ゴール一覧の現状スナップショット出力

- `/meta/policy/3DSL_repo-goals.md` を読み、
  - A〜D 各セクションの項目を列挙
  - 各項目の状態（✅ / ⚠️ / ⬜）と、関連 PR 番号（あれば）を整理する。

- 出力フォーマット（例）を `/logs/codex/2025-ROOT_repo-convergence.md` に Markdown で書き出すこと：

  - 「現在の状態サマリ」（A〜D ごとの ✅ / ⚠️ / ⬜ の個数）
  - 「まだ赤い（⚠️ / ⬜）項目一覧」
  - 「既に存在する PR 指令書との対応関係（例：B-2 ←→ PR4）」


3.2 次の PR 候補の提案（テキストのみ）

- コード変更は行わず、テキストとして以下を提案すること：

  - 優先度が高いと判断されるゴール項目 上位 3 件
  - それぞれについて
    - 対応する（または新規に必要な） PR 名（例：PR5_modeler-core-import-selftest）
    - 触るべきディレクトリ候補
    - 作るべき selftest ファイルパス案

- これらも `/logs/codex/2025-ROOT_repo-convergence.md` に追記する。

3.3 禁止事項

- `/specs/`, `/schemas/`, `/meta/policy/`, `/meta/tools/` への書き込み
  - ※ この指令書自身も含め、Codex からは完全読み取り専用
- `/code/` 以下のあらゆるファイル編集
- テストコード・実装コードの自動生成

4. テストとログ

- Codex は実行後、少なくとも以下をログに含めること：

  - 「A〜D の各セクションで、✅ / ⚠️ / ⬜ がそれぞれ何個か」
  - 「次に人間が作るべき PR 指令書の候補一覧（3 件以内）」
  - 「想定される selftest コマンド（例：node --test ... / npm run selftest:*）」

- ログ出力先：

  - `/logs/codex/2025-ROOT_repo-convergence.log`（テキスト）
  - 必要に応じて `/logs/codex/2025-ROOT_repo-convergence.md`（Markdown）

5. 実行手順（Human 用）

1. `/meta/policy/3DSL_repo-goals.md` を最新状態に更新する
2. Codex を open
3. この指令書（PR-ROOT）を渡して実行
4. `/logs/codex/2025-ROOT_repo-convergence.*` を確認し、
   - 次に取り組むゴール項目
   - 作成すべき PR 指令書（PR5〜）を決める
5. 個別 PR 指令書を作成・実行し、再度 ROOT を回すことで収束させる
