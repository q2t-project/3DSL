PR4：modeler PREP importer 実装（3DSS-prep.json → ThreeDSSDocument）

1. 参照仕様（読み取り専用）

/specs/3DSD-common.md

/specs/3DSD-modeler.md

/schemas/3DSS.schema.json

/schemas/3DSS-prep.schema.json

/AGENTS.md

/repo_structure.txt

Codex はこれらを読み取り専用で参照すること。書き込み禁止。


2. 書き込み許可ディレクトリ（PR4 スコープ）

Codex が 編集・新規作成可能：

code/modeler/io/importer_prep.js（存在しない場合は新規作成可）

code/modeler/io/importer.js（PREP 用の入口を追加する場合のみ最小限の修正を許可）

code/modeler/utils/（PREP 専用の変換ヘルパを置きたい場合のみ）

code/modeler/selftest/importer_prep.spec.js

logs/codex/


読み取り専用（参照のみ、編集禁止）：

code/common/core/modelTypes.js（ThreeDSSDocument など型定義の参照用）

code/common/schema/index.js

code/common/schema/schema_validator.js

code/common/utils/ 以下の既存ユーティリティ（仕様確認のための参照のみ）


変更禁止：

/specs/

/schemas/

/meta/policy/

/meta/tools/（指令書自身を除く）

/docs/

/code/vendor/

/AGENTS.md

package.json の scripts 以外のフィールド（scripts の追加・変更は可）


3. タスク内容（PR4 実装範囲）

3.1 PREP JSON のパースと型チェック

以下のシグネチャを前提とする：

code/modeler/io/importer_prep.js

/**
 * @param {unknown} prepJson
 * @returns {{
 *   ok: boolean,
 *   document?: import("../../common/core/modelTypes.js").ThreeDSSDocument,
 *   errors?: string[]
 * }}
 */
export function importFromPrep(prepJson) { ... }

実装方針：

- prepJson が string の場合：
  - trim して空なら { ok:false, errors:["prep JSON input cannot be empty"] } を返す。
  - それ以外は JSON.parse してオブジェクト化する。
- prepJson が object 以外（null 含む）の場合：
  - { ok:false, errors:["prep JSON must be an object or JSON string"] } を返す。
- ここまでの処理で throw を出さず、必ず { ok:boolean, errors?:string[] } 形式で返すこと。
  - パースエラー時も try/catch で拾い、{ ok:false, errors:["failed to parse prep JSON: ..."] } にまとめること。


3.2 PREP スキーマによるバリデーション

- code/common/schema/schema_validator.js の API を利用すること。
  - validateWithSchema(schemaName, payload)
  - listSchemas() などを参照して、PREP 用スキーマの schemaName（または $id）を特定する。
- 具体的には：
  - schemaRegistry / listSchemas から PREP 用のキーを探し、ハードコードの文字列を想像で決めずに、実際のキー名をコード上で確認して使うこと。
- スキーマ検証の結果：
  - valid === false の場合、AJV の errors を読み、
    - "instancePath message" 形式など、最低限どのフィールドが問題か分かる形の文字列配列に変換して errors として返す。
  - { ok:false, errors:[...converted messages...] } の形で返し、document は付与しない。


3.3 ThreeDSSDocument への変換（ハッピーパス実装）

- PREP JSON がスキーマ的に valid の場合のみ、内部表現 ThreeDSSDocument へ変換する。
- code/common/core/modelTypes.js の定義に沿って、少なくとも以下を満たすこと：
  - document の ID / メタ情報が一意に決まること（必要なら generateId 等の既存ユーティリティを再利用）。
  - PREP 側の主要なエンティティ（点・線・サーフェス等）が ThreeDSSDocument 内の対応する配列にマッピングされること。
- 仕様やスキーマで明確に定義されているフィールドだけを確実にマッピングし、曖昧なフィールドは無理に詰め込まずに：
  - document の aux 的なフィールド（仕様に存在する場合）へそのままコピーする、または
  - // TODO: PREP フィールド xxx のマッピングは仕様確定後に実装、というコメントを残す。
- 正常系では：

return {
  ok: true,
  document,  // ThreeDSSDocument のインスタンス or 構造体
};

を返すこと。


3.4 既存 importer との関係（必要な最小限の連携）

- code/modeler/io/importer.js に PREP 用の入口が必要な場合のみ、次のような範囲にとどめる：
  - import { importFromPrep } from './importer_prep.js';
  - 既存の importModelFromJSON と競合しない形で、PREP 専用のラッパ関数を追加してよい。
- 既存のモデル importer（3DSS 本体用）の動作やシグネチャを壊さないこと。
- もし importer.js に PREP 用経路を追加しなくても、今回の PR では：
  - importFromPrep(prepJson) 単体で selftest 経由の利用が確認できていればよい。


3.5 selftest（importer_prep.spec.js）の更新

code/modeler/selftest/importer_prep.spec.js を、現在の「スタブが常に失敗する前提」から「実装前提のテスト」に更新する。

テスト観点：

- 正常系：
  - 仕様に沿った最小限の PREP JSON を用意し、
    - result.ok === true
    - result.document が定義されている
    - document 内の主要フィールド（例：lines や points の数、ID の有無など）が期待通りである
- 異常系：
  - 空文字列・null・数値等を渡した場合に ok:false となり、errors 配列に理由が 1 件以上含まれる。
  - PREP スキーマで必須とされているフィールドを意図的に欠落させた場合、ok:false となり、
    - errors のどこかにそのフィールド名（またはパス）が含まれる。


4. テストとログ

Codex は以下を実行・または実行可能な状態にすること：

- 部分テスト（必須）：

node --test code/modeler/selftest/importer_prep.spec.js

- 可能であれば、modeler 全体の selftest をスクリプトでまとめる：

package.json の scripts に、必要なら以下を追加してもよい（既に存在する場合は内容を確認しつつ流用）：

"test:modeler": "node --test code/modeler/selftest/*.spec.js"

- 共通テストと併用したい場合は、既存の test:common を壊さないこと：

"test:common": "node --test code/common/selftest/*.spec.js"

ログ出力：

- Codex は /logs/codex/2025-PR4_modeler-prep-importer.log に、少なくとも次の情報を出力すること：
  - 参照した spec / schema の一覧
  - 追加・修正したファイルの一覧
  - 実行したテストコマンドと結果（成功/失敗）
  - 仕様上あいまいだった点と、その時点の判断（TODO に回した内容を含む）


5. 出力要件

Codex は最終的に、少なくとも以下を満たすこと：

- 新規・更新ファイルの一覧
  - code/modeler/io/importer_prep.js
  - 必要なら code/modeler/io/importer.js の差分
  - code/modeler/selftest/importer_prep.spec.js
- PREP JSON → ThreeDSSDocument の変換実装
  - パース～スキーマ検証～内部表現へのマッピングまで一連の処理が揃っていること。
- selftest：
  - importer_prep.spec.js によって、ハッピーパスと代表的なエラーケースがカバーされていること。
- 任意だが望ましい出力：
  - PREP のサンプル JSON と、変換後 ThreeDSSDocument のサンプル JSON（コメントでもよい）。
- すべてのコードを ESM 準拠（import / export）にすること。
  - JSON 読み込みは既存の schema_validator / index.js の流儀（createRequire 等）に揃えること。
  - CommonJS の require を生で新設しないこと（既存ファイル内での利用に限定）。


6. 禁止事項

- modeler / common / viewer の仕様書（/specs）の改変
- スキーマファイル（/schemas）の改変
- /code/vendor/ 以下の変更
- 既存 importer（3DSS 本体用）のシグネチャや既存テストを壊す変更
- 「全ファイルスキャン」「ディレクトリ走査」「自律的リファクタリング」など、指令書で明示していない範囲への波及
- package.json における scripts 以外のフィールド変更
- GitHub への直接 commit / push


