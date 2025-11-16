# 3DSS sample suite

3D scene schema (3DSS) v1.0.0 用のサンプルを valid / invalid の 2 系統で管理する。ファイル名は
`sampleNN_<type>_<topic>.3dss.json` とし、NN は 2 桁のシナリオ ID を表す。

- **valid/**: Ajv ベースの `validate3Dss` が `ok === true` を返す基底ケース。
- **invalid/**: 想定される入力ミスを再現し、`validate3Dss` が `ok === false` になることを確認するケース。

| File | Type | 狙い / カバーするルール |
| --- | --- | --- |
| valid/sample01_valid_minimal.3dss.json | valid | `document_meta` の必須 4 フィールドのみを満たす最小構成。|
| valid/sample03_valid_20_mix.3dss.json | valid | 2 本の line。`line_type: straight / arc`、`geometry.arc_*`、`effect` の組合せ。|
| valid/sample05_valid_200_points.3dss.json | valid | `line_type: polyline`＋`geometry.polyline_points` と grid/axis HUD を含む `aux.module`。|
| valid/sample07_valid_frames.3dss.json | valid | `frames` を整数／配列で設定し、`lines.appearance.effect` によるアニメ制御を確認。|
| valid/sample09_valid_parametric.3dss.json | valid | `aux.module.extension` の `parametric` / `latex` 拡張を通じた拡張モジュール。|
| invalid/sample02_invalid_missing_meta.3dss.json | invalid | ルートの `document_meta` 欠落。|
| invalid/sample04_invalid_bad_enum.3dss.json | invalid | `document_meta.units` に未定義の値（inch）。|
| invalid/sample06_invalid_selfref.3dss.json | invalid | `line_type: bezier` に必須の `appearance.geometry` 欠落。|
| invalid/sample08_invalid_geometry_missing.3dss.json | invalid | `points[].appearance` に `position` が無いケース。|
| invalid/sample10_invalid_bad_uuid.3dss.json | invalid | `document_meta.document_uuid` のフォーマット違反。|

すべてのサンプルは `package.json` の `selftest:common` で実行される `threeDss_samples.spec.js`
によって自動検証される。
