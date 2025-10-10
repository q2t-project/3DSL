| 種別                              | 目的           | ファイル例                             | 備考                                      |
| ------------------------------- | ------------ | --------------------------------- | --------------------------------------- |
| **① Spec Sheet（JS用）**           | ロジックと構造の指示書  | `/specs/codex_spec_xxx.md`        | 「何をどう処理するか」を定義。ChatGPTがここに準拠して書く。       |
| **② JSON Schema**               | データ構造の定義     | `/schemas/3DSS_point.schema.json` | 「どんなデータを扱うか」を定義。Ajvなどで検証可能。             |
| **③ README / 補助ファイル**           | コンテキスト・使い方説明 | `/README.md` or `/docs/usage.md`  | Codexが参照するガイドラインやディレクトリ構造の概要。           |
| **④ 指示文ファイル（命令書）**              | タスク実行指示      | `/plans/implement_xxx.plan.md`    | 「どのSpecをもとにコードを書くか」を明示。Codexのエントリーポイント。 |
| **⑤ スクリプト or GitHub Action 設定** | 実行自動化        | `.github/workflows/specsync.yml`  | Spec Sheet監視・SpecSyncトリガーに使える。          |
