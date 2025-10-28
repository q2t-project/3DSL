Qx アクションプラン（再構築版：Proto-Driven）

目的：P 系で得た知見を継承しつつ、プロト主導の短サイクル反復で仕様を固め、Codex 出力の品質と整合性を段階的に上げる。
共通ループ：QP（Quick Prototype）サイクル
入力：最新版 /specs/3DSD_sharedspec.md と各アプリ仕様
出力：/proto/<app>/ に Codex 生成の動作プロト

# 手順
1. Generate（Codex 指令発行）
2. Operate（実機操作評価：指定シナリオ/異常系含む）
3. Record（ログ・不整合・UI/UX 所見を記録）
4. Reflect（仕様への反映・用語/責務の再定義）
5. Lock（差分を sharedspec / 各 spec に反映しマイナー版上げ）

# 完了条件（DoD）
- バリデーション合格率 ≥ 95%（準拠サンプル群）
- 主要ユーザフローの無停止実行（3 回連続）
- 仕様差分が /meta/update_log.md に反映済み

# Q0：Framework（全体整理と土台）
ID	タスク	成果物
Q0-01	ディレクトリ/命名最終確定（sharedspec 中心）	/meta/Q0_folder_structure.md
Q0-02	Q 番号規約とベース用語集（Creator/Reader など）	/meta/Q_numbering_rule.md, /meta/glossary.md
Q0-03	QP サイクルの運用規約（テンプレ/チェックリスト）	/meta/QP_cycle_guide.md（Issue テンプレ含む）
Q1：3DSS Schema 再評価（最小可用単位の確定）
ID	タスク	成果物	QP 適用
Q1-01	現行 3DSS の棚卸し（points/lines/aux/meta）	/specs/Q1_3DSS_analysis.md	–
Q1-02	最小可用構成(MVU) の定義（必須フィールド/列挙/制約）	/specs/Q1_3DSS_MVU.md	–
Q1-03	サンプルセット整備（valid/invalid 各 10 例以上）	/data/samples/…	–
Q1-04	QP-1：Validator ロジック最小版を sharedspec に埋め込み → Codex で Modeler/Viewer 双方へ再生成	/proto/modeler/, /proto/viewer/	✅
Q1-05	ログ/エラー形式の統一（ValidationResult 仕様固定）	sharedspec §2 更新	–

Exit：MVU サンプルに対し Modeler/Viewer の読み書きと再検証が安定（95% 目標）。

# Q2：Shared Specification（共通仕様の骨格確定）
ID	タスク	成果物	QP 適用
Q2-01	旧 validator 仕様の完全吸収（独立文書廃止）	/specs/3DSD_sharedspec.md §2	–
Q2-02	命名規約・Constraints・Directive テンプレ整備	sharedspec §3–§5	–
Q2-03	QP-2：sharedspec のみ改修 → Codex 再生成 → Proto 操作評価（UI 文言/エラー露出のチューニング）	/proto/* 更新	✅
Q2-04	仕様差分→ Codex 指令差分のトレーサビリティ整備	/meta/spec_to_codex_map.md	–

Exit：sharedspec 改訂のみで Proto の挙動が意図通り一貫して変化（Bridge 不要を実証）。

# Q3：Application Responsibilities（Modeler/Viewer 責務固定）
ID	タスク	成果物	QP 適用
Q3-01	Modeler：スプレッドシート様 UI＋内部プレビュー＋Exporter を仕様固定	/specs/3DSD_modeler.md 改訂	–
Q3-02	Viewer：読み取り・3D 表示・再検証・共有 UI を仕様固定	/specs/3DSD_viewer.md 改訂	–
Q3-03	Exporter（Modeler 専属）パイプラインの I/O/例外を厳密化	/specs/Q3_exporter_spec.md	–
Q3-04	QP-3：主要ユーザフロー（Load→Edit→Validate→Export→View）で連続 3 回無停止を実証	テスト記録 /logs/runtime/…	✅

Exit：Creator/Reader 双系のユーザフローが仕様通り動作（フリーズ/保存失敗ゼロ）。

# Q4：Codex Integration（生成と同期の実務化）
ID	タスク	成果物	QP 適用
Q4-01	仕様→実装の展開マップ（親子関係/優先順/除外規則）	/plans/Q4_codex_map.yaml	–
Q4-02	Codex 指令テンプレ（共通 + 各アプリ固有）	/meta/Q4_directive_templates.md	–
Q4-03	QP-4：Pull 一発で code/ を全再生成→ HTTP 起動 → 操作評価 → 差分自動記録	/proto/*, /logs/codex/generation.log	✅
Q4-04	失敗時ロールバックと update_log の自動追記	/meta/update_log.md 運用確立	–

Exit：sharedspec/各 spec を更新→Codex 全再生成→プロト検証→仕様反映の一周が 1 日内で回る。

# Q5：Validation & QA（品質保証と安定化）
ID	タスク	成果物	QP 適用
Q5-01	ValidationResult の固定形式と UI 表示規約（Modeler/Viewer 共通）	sharedspec §2 追補	–
Q5-02	シナリオベース操作試験（正常/準正常/異常）	/plans/Q5_scenario_test.md	–
Q5-03	QP-5：サンプル 30 件スイープ（valid 20 / invalid 10）自動/手動併用	/logs/runtime/*, /logs/codex/selftest.log	✅
Q5-04	エラーメッセージ・用語の一貫化（JP/EN 表記指針）	/meta/terminology_style.md	–

Exit：自動/手動含めた試験で主要ケース網羅、エラーメッセージの一貫性確保。

# Q6：Governance（運用・文書体系）
ID	タスク	成果物
Q6-01	文書インデックスと相互参照（Spec/Schema/UML）	/meta/Q6_doc_index.md
Q6-02	変更管理：バージョン連鎖・差分ポリシー	/meta/Q6_versioning.md
Q6-03	ログポリシー統一（runtime/codex/update）	/meta/Q6_logging_policy.md