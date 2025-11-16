PR5: modeler PREP importer 本実装（3DSS-prep.json → ThreeDSSDocument）

1. 参照情報
- /meta/policy/3DSL_repo-goals.md … B-2「PREP importer」ゴール
- /meta/schemas/3DSS-prep.schema.json … PREP 入力 JSON のスキーマ
- /code/common/core/modelTypes.js … ThreeDSSDocument 定義
- /code/modeler/importer/prepImporter.js … PREP importer 本体（現状は stub）
- /code/modeler/io/importer_prep.js … バリデーション＋入口モジュール
- /code/modeler/selftest/importer_prep.spec.js … PREP importer 用 selftest（現状は stub 的）

2. 期待する成果
- B-2: PREP importer（3DSS-prep.json → ThreeDSSDocument）ゴールを ⚠️ → ✅ にする。
- importFromPrep(prepJson) が、以下の振る舞いを満たすこと：
  - 正常系:
    - 文字列またはオブジェクトの PREP JSON を受け取り、
      - PREP スキーマに合致していれば ThreeDSSDocument へ変換し、
      - `{ ok: true, document }` を返す。
    - ThreeDSSDocument は最低限つぎを満たす：
      - `document_meta.document_uuid` … `crypto.randomUUID()` などで新規発行
      - `document_meta.schema_uri` … PREP 側の `document_meta.schema_uri` をコピー
      - `document_meta.generator` / `source` … PREP からコピー
      - `points` … PREP の `points` 配列を 1:1 で変換
        - name → label
        - position → [x,y,z]（省略時は [0,0,0]）
        - id … `generateId('point')` などで一意な ID 付与
  - 異常系:
    - 空文字列や空白だけの文字列 → ok:false, errors に「JSON input cannot be empty」相当のメッセージ
    - パース不能な JSON 文字列 → ok:false, errors に「failed to parse prep JSON」など原因が分かるメッセージ
    - オブジェクト以外（数値など）を渡した場合 → ok:false, errors に「must be an object」系のメッセージ
    - PREP スキーマ違反（points 欠落など） → ok:false, errors に schema_validator と整合したエラーメッセージ

3. 実装方針（ガイドライン）

3.1 バリデーション
- 既存の schema_validator / validation ユーティリティを尊重すること。
- PREP 用スキーマ取り扱いは、次のいずれかでよい（どちらか選び、コード内コメントで明示）:
  1) `code/common/schema` 側に PREP スキーマを追加して schemaRegistry へ登録し、`validateWithSchema('3dss-prep', payload)` のように利用する。
  2) `code/modeler/io/importer_prep.js` 内で Ajv インスタンスを新規に作成し、`meta/schemas/3DSS-prep.schema.json` をロードして validate する。
- どちらの場合も、エラーメッセージのフォーマットは existing validation ユーティリティに寄せること（可能な範囲で）。

3.2 変換ロジック
- 新規ファイル追加は最小限。基本は次の 2 ファイルを中心に編集する：
  - /code/modeler/importer/prepImporter.js
  - /code/modeler/io/importer_prep.js
- `importFromPrep(prepJson)` は次のステップで構成する：
  1) 文字列入力なら JSON.parse してオブジェクトにする。
  2) PREP スキーマでバリデーションし、失敗したら `{ ok:false, errors:[...] }` を返す（throw しない）。
  3) PREP 構造から ThreeDSSDocument 構造を組み立てるヘルパーを用意する。
     - document_meta の組み立て
     - points の変換（ラベル・位置・ID 付与）
     - その他フィールド（lines, surfaces 等）は今回は未対応でもよいが、将来拡張しやすい形にしておく。
  4) 必要に応じて `validateModelStructure` や modeler 側の validator を呼び、内部構造としておかしくないことを確認する。

4. selftest の更新

- /code/modeler/selftest/importer_prep.spec.js を、次の 3 グループのテストで構成する：
  1) 正常系:
     - 有効な PREP JSON（document_meta + points 2件）を渡すと ok:true かつ document が ThreeDSSDocument になる。
     - points のラベル・位置・ID・配列長が期待どおりか検証する。
     - document_meta.document_uuid が非空文字列であること。
  2) 文字列入力の異常系:
     - 空文字列 / 空白のみ → ok:false, errors[0] に "cannot be empty" を含む
     - 壊れた JSON 文字列 → ok:false, errors[0] に "failed to parse" を含む
  3) 型違い / スキーマ違反:
     - 数値などオブジェクト以外の入力 → ok:false, "must be an object" を含む
     - points 欠落など PREP スキーマ違反 → ok:false, errors のどこかに "points" に関連するメッセージが含まれる

5. 変更対象ファイル

- 編集:
  - /code/modeler/importer/prepImporter.js
  - /code/modeler/io/importer_prep.js
  - /code/modeler/selftest/importer_prep.spec.js
- 必要に応じて編集（PREP スキーマを共有する場合のみ）:
  - /code/common/schema/index.js
  - /code/common/schema/schema_validator.js
- 追加が必要になった場合は、/meta/policy/3DSL_repo-goals.md の B-2 説明と矛盾しないようにすること。

6. テスト

次を必ず実行し、すべてパスした状態でコミットすること：

```bash
node --test code/common/selftest/*.spec.js
node --test code/modeler/selftest/*.spec.js
node --test code/viewer/selftest/*.spec.js
