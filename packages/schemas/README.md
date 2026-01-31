# packages/schemas (SSOT)

このフォルダを **スキーマと仕様書の正本（SSOT）** とする。

## 正本
- `packages/schemas/3DSS.schema.json` … 3DSS JSON Schema（最新版）
- `packages/schemas/3DSS_spec.md` … 仕様書（最新版）

## リリーススナップショット
- `packages/schemas/release/vX.Y.Z/` … その版の凍結コピー（編集禁止）

## 運用ルール
- 編集するのは **正本だけ**。
- `apps/*/public/**` に置くスキーマは **sync で生成**（直編集しない）。
- 構造ドキュメントは `document_meta.schema_uri` に `.../3DSS.schema.json#vX.Y.Z` を入れて版を固定する。

## リリース手順（例: v1.1.4）
1. 正本の `3DSS.schema.json` を更新（`$anchor` を `v1.1.4` に、必要なら仕様追記）
2. `3DSS_spec.md` を更新（同版に合わせる）
3. 既存の検証（例: `npm run check:release`）で NG=0 を確認
4. `packages/schemas/release/v1.1.4/` を作成して正本をコピー
5. リポジトリにタグを打つ（例: `schema-v1.1.4`）
6. `sync:schemas` で `apps/site/public` 等へ配布
