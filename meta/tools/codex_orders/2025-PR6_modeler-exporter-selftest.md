PR6: modeler exporter selftest（ThreeDSSDocument → 3DSS）

---

## 0. 文脈とゴール

- 関連ポリシー:
  - `/meta/policy/3DSL_repo-goals.md` の **B-3: modeler exporter（ThreeDSSDocument → 3DSS）**
- 直近 PR との関係:
  - PR3: common / viewer の selftest 基盤整備 済
  - PR4–PR5: importer_core / PREP importer とその selftest 済
- この PR で「緑」にしたい項目:
  - B-3: modeler exporter（ThreeDSSDocument → 3DSS）

### ゴール状態（Done 定義）

- `code/modeler/exporter/threeDssExporter.js` に、
  - ThreeDSSDocument → 3DSS JSON（3dsl-core-model）へ変換するエクスポート関数が実装されている。
- exporter 用の selftest が追加されている:
  - 正常系: ThreeDSSDocument → 3DSS JSON → Ajv schema でバリデーション OK
  - 異常系: 不正な入力に対しては ValidationError / 想定されたエラーが返る
- importer_core と組み合わせた簡単な round-trip が selftest で確認できる:
  - 3DSS JSON → importModelFromJSON → ThreeDSSDocument → exporter → 3DSS JSON
  - 少なくとも「必須フィールドが失われていない」ことを確認
- `node --test code/modeler/selftest/*.spec.js` を単体で叩いても、modeler 側の selftest がすべてグリーン。

---

## 1. 事前調査

### 1-1. 型と仕様の確認

1. ThreeDSSDocument の実体を確認
   - `code/common/core/modelTypes.js`
     - `ThreeDSSDocument` typedef のフィールド一覧
     - `createEmptyDocument()` などのヘルパがあれば挙動を確認

2. 3DSS モデル JSON 側の仕様を確認
   - `/specs/3DSS-modeler.md`（存在すれば）および
   - `code/common/schema/*.schema.json` のうち core-model 関連
   - 3dsl-core-model 用の JSON Schema がどこで定義されているかを確認する

3. 既存 importer から、どのフィールドが必須か把握
   - `code/modeler/io/importer_core.js`
   - `code/modeler/selftest/importer_core.spec.js`
   - ここで使っている schema 名（`3dsl-core-model`）と、scene / metadata / version の扱いを押さえる

### 1-2. 既存ユーティリティの確認

- バリデーション関連:
  - `code/common/utils/validation.js`
  - `code/common/schema/schema_validator.js`
- modeler 用バリデータ（あれば）:
  - `code/modeler/validator/modelerValidator.js`
- これらを exporter 側から再利用できるかを確認する。

---

## 2. exporter 実装方針

### 2-1. エクスポート関数のインターフェース

`code/modeler/exporter/threeDssExporter.js` を以下の方針で整理する：

- 入力:
  - `ThreeDSSDocument` またはそれと同等構造の plain object
- 出力:
  - 3DSS モデル JSON（`3dsl-core-model` のスキーマに準拠した plain object）
  - 呼び出し側で `JSON.stringify()` できる形

- 推奨シグネチャ案:
  - `export function exportToThreeDss(doc) { ... }`
  - すでに関数が存在する場合は、既存の公開 API を優先して中身を整理する

### 2-2. マッピング仕様（最低限）

最低限、次を満たすようにマッピングする：

- ルートレベル
  - `version`: ThreeDSSDocument 側の version をそのまま書き戻す
  - `scene`: ThreeDSSDocument の scene をそのまま or schema に合わせて変形して出力
  - `metadata`: ドキュメントメタ情報（`document_meta` 等）があれば 3DSS 側の想定フィールドに落とす

- 配列系:
  - scene 内の nodes / points / surfaces など、ThreeDSSDocument 側に存在しているコア要素は、可能な範囲でそのままエクスポート
  - PREP importer で追加したフィールドとの整合は将来的な課題とし、今回の PR では **core 3DSS モデル** にフォーカスする

- バリデーション:
  - エクスポート後のオブジェクトに対して、`validateWithSchema('3dsl-core-model', exported)`（または相当する呼び出し）で検証できるようにしておく
    - schema 名は実際の `schema_registry` / `listSchemas()` の結果を見て決めること

---

## 3. 実装タスク

### 3-1. threeDssExporter.js の整備

1. 既存コードの確認
   - 現状の `threeDssExporter.js` にどこまでロジックがあるかを確認
   - dead code / 未使用の引数があれば整理

2. 変換ロジックの実装
   - 入力チェック:
     - Object 以外が来た場合は `ValidationError` かそれに準じたエラーを投げる
   - 必須フィールド:
     - `version`, `scene` が無ければエラーにするか、デフォルト値で補う方針を決める
       - importer_core / schema と整合を取る
   - scene / metadata のマッピング:
     - ThreeDSSDocument のフィールドを 3DSS schema に合わせてコピー
     - 将来の拡張に備えて、変換処理は小さめの helper 関数に分割しておくとよい

3. schema バリデーションの組み込み（任意だが推奨）
   - exporter 内部、もしくは selftest 側で、
     - `validateWithSchema('<core-model-schema-name>', exportedPayload)` を走らせる
   - エラー内容を `ValidationError` のメッセージに取り込める形にしておくと追い込みやすい

---

## 4. selftest 設計

### 4-1. exporter 単体 selftest

新規ファイル案：

- `code/modeler/selftest/exporter_core.spec.js`

テストケース案：

1. 正常系: 最小限の ThreeDSSDocument から 3DSS JSON へ
   - `createEmptyDocument()` か selftest 用の最小 doc を手書き
   - exporter を通して
   - `version` / `scene` の必須フィールドが期待通り出力されているか確認
   - `validateWithSchema` でエラーにならないことを確認

2. 正常系: 代表的なシーン（ノードが複数あるケース）
   - importer_core の selftest で使っている 3DSS JSON Fixture があれば、それを doc に変換してから exporter に回す
   - ポイント: ノード配列の長さ・代表的なフィールドが維持されていること

3. 異常系: 不正入力
   - `null` / `undefined` / number / string などを渡したときに `ValidationError` になる
   - 必須フィールド欠如（version / scene など）でエラーになる

### 4-2. importer + exporter round-trip selftest

同じく `exporter_core.spec.js` か、別ファイル `import_export_roundtrip.spec.js` でカバー：

1. 入力 JSON（3DSS core モデル）を 1 つ用意
2. `importModelFromJSON` → `Model` → ThreeDSSDocument を取得
   - ここは既存 selftest や Model の API を参照しつつ、実際の取り出し方に合わせて調整
3. そのドキュメントを exporter に通して 3DSS JSON を得る
4. 少なくとも次を確認:
   - `version` が変わっていない
   - scene のノード数が変わっていない
   - Ajv の schema 検証が通る

---

## 5. 実行コマンド（Codex / 手動用）

開発サイクル中に回すべきコマンド：

```sh
# common 側 selftest（回帰チェック）
node --test code/common/selftest/*.spec.js

# modeler 側 selftest（importer_core + prep + exporter）
node --test code/modeler/selftest/*.spec.js

# viewer 側 selftest（念のため現状維持確認）
node --test code/viewer/selftest/*.spec.js
