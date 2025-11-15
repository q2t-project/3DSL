PR2：viewer/modeler conversion layer（Node→ViewNode / Scene→ViewScene）

1. 参照仕様（読み取り専用）

/specs/3DSD-common.md

/specs/3DSD-modeler.md

/specs/3DSD-viewer.md

/schemas/3DSS.schema.json

/schemas/3DSS-prep.schema.json

/schemas/3DSS_spec.md

/AGENTS.md

Codex はこれらを読み取り専用で参照すること。書き込み禁止。

2. 書き込み許可ディレクトリ（PR2 スコープ）

Codex が 編集・新規作成可能：

code/viewer/convert/

code/viewer/types/

code/viewer/utils/

code/viewer/builder/

code/modeler/

logs/codex/

既存ファイル編集可：

code/viewer/builder/viewer_scene_builder.js（存在する場合）

code/viewer/scene/*

code/common/types/*（読み取りのみ、編集は禁止）

変更禁止：

/specs/

/schemas/

/meta/policy/

/meta/tools/（指令書自身を除く）

/docs/

/code/vendor/

3. タスク内容（PR2 実装範囲）
3.1 viewer 専用タイプの追加

次の軽量構造を code/viewer/types/ に新規追加：

ViewNode

viewerが必要とする最小限のフィールドのみ

id: string

pos: {x,y,z}

visible: boolean（デフォルト true）

tags: string[]（デフォルト空配列）

extras: object（任意）

ViewScene

nodes: ViewNode[]

environment: { background, gridEnabled, axisEnabled }

viewer専用フィールドのみ保持

3.2 model → viewer 変換レイヤーの新規実装

code/viewer/convert/model_to_view.js を追加せよ。

関数：

convertNode(modelNode) → ViewNode
convertScene(modelScene) → ViewScene


変換規則：

modeler の不要プロパティを除去

viewer に必要なデフォルト値付加

node のフィールドを map して追加軽量構造へ変換

scene-level metadata を viewer 用構造に変換

visible と tags を必ず付与

environment（背景・グリッド・軸）を生成

3.3 viewer-side builder の改修

code/viewer/builder/ 内の builder を修正：

直接 model ノードを使うのを廃止

必ず convertScene(...) を経由して ViewScene を構築するように変更

SceneObject / CoreNode の参照を削除し viewer 専用構造へ統一

4. テストとログ

Codex はログを /logs/codex/2025-PR2_viewer-modeler-conversion.log に書くこと

viewer 自己診断（npm run selftest:viewer）が最低限動作するようにする

失敗してもよいが、テストファイルの雛形を生成してよい

5. 出力要件

Codex は以下を必ず出力せよ：

新規ファイル一覧

既存ファイルの修正 diff

convert レイヤーの実装

builder の統合修正

変換前後のサンプル JSON（任意）

すべてのコードを ESM 準拠にすること（export / import）

6. 禁止事項

modeler / viewer / common の仕様書の改変

スキーマの改変

vendor フォルダの変更

「全ファイルスキャン」「ディレクトリ走査」「自律的リファクタリング」

実行手順（Human用）

このファイルを保存する

Codex を open

モードは 実装修正 ON（生成モード）

この指令書を渡して実行

出力コードをレビューし commit