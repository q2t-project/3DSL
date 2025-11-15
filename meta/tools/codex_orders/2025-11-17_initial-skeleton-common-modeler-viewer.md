2025-11-17_initial-skeleton-common-modeler-viewer.md
■ 対象仕様（読み取り専用）

参照すべき仕様およびスキーマ：

/specs/3dsl/（全体構造・AST・モデル定義周り）

/schemas/3dsl/*.json（3DSL 基本構造スキーマ）

/repo_structure.txt（ディレクトリの責務定義）

/AGENTS.md（本タスクの権限境界の保持）

Codex は 仕様の変更を行わないこと。

■ 実装スコープ（Codex が書き込んでよい場所）

/code/common/

/code/modeler/

/code/viewer/

/logs/codex/

■ 変更禁止領域（明示）

以下は 絶対に書き換え禁止：

/specs/

/schemas/

/meta/policy/

/docs/

/AGENTS.md

/repo_structure.txt

.github/

LICENSE, .gitignore, .gitattributes, package.json（scripts 以外）

■ タスク内容（最低限の初期スケルトン構築）
1. /code/common/ の最初の基盤生成

目的：modeler/viewer が依存する共通型・ユーティリティの 最小セット を作る。

生成内容（例）：

types/base.ts

AST ノードの基底型

utils/logger.ts

開発用の軽量 logger（console ベース）

utils/id.ts

UUID 生成ユーティリティ（既存 npm 利用可）

※ 実体は最小限。未定義の仕様は仮実装せず、全て TODO コメントで明示。

2. /code/modeler/ の初期スケルトン生成

目的：3DSL モデル構築レイヤの最低限の骨格。

生成内容：

core/modeler.ts

モデラ全体のエントリポイント

core/node_factory.ts

AST ノード生成のスタブ（仕様未確定部分は TODO）

loader/parser_stub.ts

パーサの受け口だけ定義（内部は空）

3. /code/viewer/ の初期スケルトン生成

目的：3D 表示レイヤの入り口だけ作る。

生成内容：

core/viewer.ts

viewer の初期化入り口

renderer/renderer_stub.ts

将来の WebGL/Three.js レンダラ呼び出しのスタブ

ui/panel_stub.ts

最小 UI フック（空関数）

■ コーディング方針

全ファイルに「初期スケルトンであること」「仕様が未確定のためスタブであること」をコメントとして入れる

未定義の構造・アルゴリズムを勝手に補完しない

明確な TODO コメントを配置する

仕様矛盾がある場合はログに書き出す（ファイルに書き換えはしない）

■ 出力ログ

出力ファイル：

/logs/codex/20251117_initial_skeleton_generation.log


内容：

実行開始/終了時刻

生成したファイル一覧

TODO 箇所の要約

仕様未確定による保留点リスト

■ 注意事項

既存ファイルは上書きしない（存在する場合はログに警告を出すだけ）

仕様外の概念追加は禁止