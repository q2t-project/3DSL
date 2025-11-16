# 3DSL リポジトリ収束ゴール一覧（A〜D）

このファイルは「3DSL リポジトリがどこまで出来ているか」を
機能単位（A〜D）で見える化するためのチェックリスト。

- ✅: 仕様と実装と selftest が揃っていて、安心して前提にできる
- ⚠️: 実装 or テストが部分的にあるが、まだ穴がある
- ⬜: ほぼ手つかず / 要設計

このファイル自体は **Human / ChatGPT 専用（手動更新）**。
Codex からは読み取り専用とする。

---

## A. common 層（型・スキーマ・バリデーション）

### A-1: ThreeDSSDocument 型定義

- 状態: ⚠️
- 内容:
  - `code/common/core/modelTypes.js` に ThreeDSSDocument の型が定義されている
  - modeler / viewer / validator がこの型を前提に動いている
- ToDo:
  - [ ] 型定義と `/specs/3DSD-common.md` の差分を確認
  - [ ] 必要なら型レベルの selftest を追加

### A-2: JSON Schema と Ajv バリデーション

- 状態: ✅（common selftest ベース）
- 内容:
  - `code/common/schema/*.schema.json` が Ajv でロードされる
  - `schema_validator` / `validation` utils 経由で
    - metadata / node / scene / transform / 3DSS 本体が検証可能
- 担当 PR:
  - PR3：common schema / validation selftest 追加

### A-3: validation ユーティリティ selftest

- 状態: ✅
- 内容:
  - `code/common/selftest/*.spec.js` で
    - Transform / Metadata / schema_validator / validateSceneStructure などをカバー
  - `node --test code/common/selftest/*.spec.js` が緑になる
- 担当 PR:
  - PR3：test(common)

---

## B. modeler パイプライン

### B-1: core 3DSS importer（3dsl-core-model）

- 状態: # 3DSL リポジトリ収束ゴール一覧（A〜D）

このファイルは「3DSL リポジトリがどこまで出来ているか」を
機能単位（A〜D）で見える化するためのチェックリスト。

- ✅: 仕様と実装と selftest が揃っていて、安心して前提にできる
- ⚠️: 実装 or テストが部分的にあるが、まだ穴がある
- ⬜: ほぼ手つかず / 要設計

このファイル自体は **Human / ChatGPT 専用（手動更新）**。
Codex からは読み取り専用とする。

---

## A. common 層（型・スキーマ・バリデーション）

### A-1: ThreeDSSDocument 型定義

- 状態: ⚠️
- 内容:
  - `code/common/core/modelTypes.js` に ThreeDSSDocument の型が定義されている
  - modeler / viewer / validator がこの型を前提に動いている
- ToDo:
  - [ ] 型定義と `/specs/3DSD-common.md` の差分を確認
  - [ ] 必要なら型レベルの selftest を追加

### A-2: JSON Schema と Ajv バリデーション

- 状態: ✅（common selftest ベース）
- 内容:
  - `code/common/schema/*.schema.json` が Ajv でロードされる
  - `schema_validator` / `validation` utils 経由で
    - metadata / node / scene / transform / 3DSS 本体が検証可能
- 担当 PR:
  - PR3：common schema / validation selftest 追加

### A-3: validation ユーティリティ selftest

- 状態: ✅
- 内容:
  - `code/common/selftest/*.spec.js` で
    - Transform / Metadata / schema_validator / validateSceneStructure などをカバー
  - `node --test code/common/selftest/*.spec.js` が緑になる
- 担当 PR:
  - PR3：test(common)

---

## B. modeler パイプライン

### B-1: core 3DSS importer（3dsl-core-model）

- 状態: # 3DSL リポジトリ収束ゴール一覧（A〜D）

このファイルは「3DSL リポジトリがどこまで出来ているか」を
機能単位（A〜D）で見える化するためのチェックリスト。

- ✅: 仕様と実装と selftest が揃っていて、安心して前提にできる
- ⚠️: 実装 or テストが部分的にあるが、まだ穴がある
- ⬜: ほぼ手つかず / 要設計

このファイル自体は **Human / ChatGPT 専用（手動更新）**。
Codex からは読み取り専用とする。

---

## A. common 層（型・スキーマ・バリデーション）

### A-1: ThreeDSSDocument 型定義

- 状態: ⚠️
- 内容:
  - `code/common/core/modelTypes.js` に ThreeDSSDocument の型が定義されている
  - modeler / viewer / validator がこの型を前提に動いている
- ToDo:
  - [ ] 型定義と `/specs/3DSD-common.md` の差分を確認
  - [ ] 必要なら型レベルの selftest を追加

### A-2: JSON Schema と Ajv バリデーション

- 状態: ✅（common selftest ベース）
- 内容:
  - `code/common/schema/*.schema.json` が Ajv でロードされる
  - `schema_validator` / `validation` utils 経由で
    - metadata / node / scene / transform / 3DSS 本体が検証可能
- 担当 PR:
  - PR3：common schema / validation selftest 追加

### A-3: validation ユーティリティ selftest

- 状態: ✅
- 内容:
  - `code/common/selftest/*.spec.js` で
    - Transform / Metadata / schema_validator / validateSceneStructure などをカバー
  - `node --test code/common/selftest/*.spec.js` が緑になる
- 担当 PR:
  - PR3：test(common)

---

## B. modeler パイプライン

### B-1: core 3DSS importer（3dsl-core-model）

- 状態: ✅
- 内容:
  - `importModelFromJSON`（`code/modeler/io/importer_core.js`）で
    - 3DSS モデル JSON → ThreeDSSDocument が構築される
  - スキーマ名 `3dsl-core-model` を前提としたバリデーションが通る
- ToDo:
  - [ ] 正常系／異常系の selftest を追加
  - [ ] 三DSSドキュメント validator と合わせて round-trip ケースを用意
- 担当 PR（予定）:
  - PR5：modeler core importer / validator selftest

### B-2: PREP importer（3DSS-prep.json → ThreeDSSDocument）

- 状態: ✅（stub + selftest stub まで完了）
- 内容:
  - PREP JSON を ThreeDSSDocument に変換するエントリーポイント
    - モジュール: `code/modeler/io/importer_prep.js`
    - エクスポート: `importFromPrep`
  - 現状:
    - stub 実装＋「投げないこと」を確認する selftest あり
    - 実際のマッピング（points 等）は未実装
- ToDo:
  - [ ] PREP スキーマに従った payload 検証
  - [ ] points / その他エンティティを ThreeDSSDocument にマッピング
  - [ ] 正常系／異常系の selftest でカバー
- 担当 PR:
  - PR4：modeler PREP importer（本実装までこの PR 番号で面倒を見る）

### B-3: modeler exporter（ThreeDSSDocument → 3DSS）

- 状態: ⬜
- 内容:
  - ThreeDSSDocument → 3DSS JSON を吐き出す exporter
  - round-trip（import → edit → export）が仕様通りになること
- ToDo:
  - [ ] 仕様と既存コードの差分を確認
  - [ ] selftest を設計・実装
- 担当 PR（予定）:
  - PR5 か PR6 に含める（要調整）

### B-4: modeler selftest（パイプライン一周）

- 状態: ⬜
- 内容:
  - `npm run selftest:modeler` で
    - 代表的な 3DSS / PREP 入力を読み込み
    - ThreeDSSDocument を生成
    - renderer / HUD / validator が最低限動く
- 担当 PR（予定）:
  - PR6：selftest:modeler

---

## C. viewer パイプライン

### C-1: model → view 変換レイヤ（Node → ViewNode / Scene → ViewScene）

- 状態: ✅（PR2）
- 内容:
  - `code/viewer/convert/model_to_view.js`
  - `ViewNode` / `ViewScene`（`code/viewer/types/`）への変換レイヤが存在
- 担当 PR:
  - PR2：viewer/modeler conversion layer

### C-2: viewer scene builder selftest

- 状態: ✅（PR3）
- 内容:
  - `code/viewer/scene/scene_builder.js` が
    - normalize → validateSceneStructure → convertScene のパスで動く
  - `code/viewer/selftest/viewer_scene_builder.spec.js` がグリーン
- 担当 PR:
  - PR3：test(viewer) scene builder selftests

### C-3: viewer selftest（パイプライン一周）

- 状態: ⬜
- 内容:
  - `npm run selftest:viewer` で
    - ThreeDSSDocument か 3DSS/3DSS-prep を元に
    - viewer renderer / HUD が最低限動く
- 担当 PR（予定）:
  - PR6 or PR7：selftest:viewer

---

## D. リポジトリ全体の健康診断

### D-1: 統合チェックコマンド

- 状態: ⬜
- 内容:
  - `npm run check:repo` などで
    - common / modeler / viewer の selftest
    - 簡易な lint / スキーマ整合チェック
    - を一括で実行
- 担当 PR（予定）:
  - PR7：check:repo 復活＆整理

### D-2: ROOT codex 指令書

- 状態: ✅
- 内容:
  - `/meta/tools/codex_orders/2025-ROOT_repo-convergence.md`
  - このファイル（3DSL_repo-goals.md）を参照し、
    - 「どのゴール項目を今回の codex 実行で緑に近づけるか」を限定
    - 出力として「どの項目が何色か」をログに残す
- 担当:
  - Human / ChatGPT が作成し、Codex は読み取り実行のみ

- 内容:
  - `importModelFromJSON`（`code/modeler/io/importer_core.js`）で
    - 3DSS モデル JSON → ThreeDSSDocument が構築される
  - スキーマ名 `3dsl-core-model` を前提としたバリデーションが通る
- ToDo:
  - [ ] 正常系／異常系の selftest を追加
  - [ ] 三DSSドキュメント validator と合わせて round-trip ケースを用意
- 担当 PR（予定）:
  - PR5：modeler core importer / validator selftest

### B-2: PREP importer（3DSS-prep.json → ThreeDSSDocument）

- 状態: ⚠️（stub + selftest stub まで完了）
- 内容:
  - PREP JSON を ThreeDSSDocument に変換するエントリーポイント
    - モジュール: `code/modeler/io/importer_prep.js`
    - エクスポート: `importFromPrep`
  - 現状:
    - stub 実装＋「投げないこと」を確認する selftest あり
    - 実際のマッピング（points 等）は未実装
- ToDo:
  - [ ] PREP スキーマに従った payload 検証
  - [ ] points / その他エンティティを ThreeDSSDocument にマッピング
  - [ ] 正常系／異常系の selftest でカバー
- 担当 PR:
  - PR4：modeler PREP importer（本実装までこの PR 番号で面倒を見る）

### B-3: modeler exporter（ThreeDSSDocument → 3DSS）

- 状態: ⬜
- 内容:
  - ThreeDSSDocument → 3DSS JSON を吐き出す exporter
  - round-trip（import → edit → export）が仕様通りになること
- ToDo:
  - [ ] 仕様と既存コードの差分を確認
  - [ ] selftest を設計・実装
- 担当 PR（予定）:
  - PR5 か PR6 に含める（要調整）

### B-4: modeler selftest（パイプライン一周）

- 状態: ⬜
- 内容:
  - `npm run selftest:modeler` で
    - 代表的な 3DSS / PREP 入力を読み込み
    - ThreeDSSDocument を生成
    - renderer / HUD / validator が最低限動く
- 担当 PR（予定）:
  - PR6：selftest:modeler

---

## C. viewer パイプライン

### C-1: model → view 変換レイヤ（Node → ViewNode / Scene → ViewScene）

- 状態: ✅（PR2）
- 内容:
  - `code/viewer/convert/model_to_view.js`
  - `ViewNode` / `ViewScene`（`code/viewer/types/`）への変換レイヤが存在
- 担当 PR:
  - PR2：viewer/modeler conversion layer

### C-2: viewer scene builder selftest

- 状態: ✅（PR3）
- 内容:
  - `code/viewer/scene/scene_builder.js` が
    - normalize → validateSceneStructure → convertScene のパスで動く
  - `code/viewer/selftest/viewer_scene_builder.spec.js` がグリーン
- 担当 PR:
  - PR3：test(viewer) scene builder selftests

### C-3: viewer selftest（パイプライン一周）

- 状態: ⬜
- 内容:
  - `npm run selftest:viewer` で
    - ThreeDSSDocument か 3DSS/3DSS-prep を元に
    - viewer renderer / HUD が最低限動く
- 担当 PR（予定）:
  - PR6 or PR7：selftest:viewer

---

## D. リポジトリ全体の健康診断

### D-1: 統合チェックコマンド

- 状態: ⬜
- 内容:
  - `npm run check:repo` などで
    - common / modeler / viewer の selftest
    - 簡易な lint / スキーマ整合チェック
    - を一括で実行
- 担当 PR（予定）:
  - PR7：check:repo 復活＆整理

### D-2: ROOT codex 指令書

- 状態: ⬜
- 内容:
  - `/meta/tools/codex_orders/2025-ROOT_repo-convergence.md`
  - このファイル（3DSL_repo-goals.md）を参照し、
    - 「どのゴール項目を今回の codex 実行で緑に近づけるか」を限定
    - 出力として「どの項目が何色か」をログに残す
- 担当:
  - Human / ChatGPT が作成し、Codex は読み取り実行のみ

- 内容:
  - `importModelFromJSON`（`code/modeler/io/importer_core.js`）で
    - 3DSS モデル JSON → ThreeDSSDocument が構築される
  - スキーマ名 `3dsl-core-model` を前提としたバリデーションが通る
- ToDo:
  - [ ] 正常系／異常系の selftest を追加
  - [ ] 三DSSドキュメント validator と合わせて round-trip ケースを用意
- 担当 PR（予定）:
  - PR5：modeler core importer / validator selftest

### B-2: PREP importer（3DSS-prep.json → ThreeDSSDocument）

- 状態: ⚠️（stub + selftest stub まで完了）
- 内容:
  - PREP JSON を ThreeDSSDocument に変換するエントリーポイント
    - モジュール: `code/modeler/io/importer_prep.js`
    - エクスポート: `importFromPrep`
  - 現状:
    - stub 実装＋「投げないこと」を確認する selftest あり
    - 実際のマッピング（points 等）は未実装
- ToDo:
  - [ ] PREP スキーマに従った payload 検証
  - [ ] points / その他エンティティを ThreeDSSDocument にマッピング
  - [ ] 正常系／異常系の selftest でカバー
- 担当 PR:
  - PR4：modeler PREP importer（本実装までこの PR 番号で面倒を見る）

### B-3: modeler exporter（ThreeDSSDocument → 3DSS）

- 状態: ⬜
- 内容:
  - ThreeDSSDocument → 3DSS JSON を吐き出す exporter
  - round-trip（import → edit → export）が仕様通りになること
- ToDo:
  - [ ] 仕様と既存コードの差分を確認
  - [ ] selftest を設計・実装
- 担当 PR（予定）:
  - PR5 か PR6 に含める（要調整）

### B-4: modeler selftest（パイプライン一周）

- 状態: ⬜
- 内容:
  - `npm run selftest:modeler` で
    - 代表的な 3DSS / PREP 入力を読み込み
    - ThreeDSSDocument を生成
    - renderer / HUD / validator が最低限動く
- 担当 PR（予定）:
  - PR6：selftest:modeler

---

## C. viewer パイプライン

### C-1: model → view 変換レイヤ（Node → ViewNode / Scene → ViewScene）

- 状態: ✅（PR2）
- 内容:
  - `code/viewer/convert/model_to_view.js`
  - `ViewNode` / `ViewScene`（`code/viewer/types/`）への変換レイヤが存在
- 担当 PR:
  - PR2：viewer/modeler conversion layer

### C-2: viewer scene builder selftest

- 状態: ✅（PR3）
- 内容:
  - `code/viewer/scene/scene_builder.js` が
    - normalize → validateSceneStructure → convertScene のパスで動く
  - `code/viewer/selftest/viewer_scene_builder.spec.js` がグリーン
- 担当 PR:
  - PR3：test(viewer) scene builder selftests

### C-3: viewer selftest（パイプライン一周）

- 状態: ⬜
- 内容:
  - `npm run selftest:viewer` で
    - ThreeDSSDocument か 3DSS/3DSS-prep を元に
    - viewer renderer / HUD が最低限動く
- 担当 PR（予定）:
  - PR6 or PR7：selftest:viewer

---

## D. リポジトリ全体の健康診断

### D-1: 統合チェックコマンド

- 状態: ⬜
- 内容:
  - `npm run check:repo` などで
    - common / modeler / viewer の selftest
    - 簡易な lint / スキーマ整合チェック
    - を一括で実行
- 担当 PR（予定）:
  - PR7：check:repo 復活＆整理

### D-2: ROOT codex 指令書

- 状態: ⬜
- 内容:
  - `/meta/tools/codex_orders/2025-ROOT_repo-convergence.md`
  - このファイル（3DSL_repo-goals.md）を参照し、
    - 「どのゴール項目を今回の codex 実行で緑に近づけるか」を限定
    - 出力として「どの項目が何色か」をログに残す
- 担当:
  - Human / ChatGPT が作成し、Codex は読み取り実行のみ
