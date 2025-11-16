# 2025-PRX_3DSS-sample-suite.md

[目的]
- 3DSS.schema.json v1.0.0 用の検証サンプルを体系的に整備する。
- valid/invalid 双方の .3dss.json を用意し、`validate3Dss` の selftest に組み込む。

[入力]
- /schemas/3DSS.schema.json
- /specs/3DSS_spec.md
- /specs/3DSD-common.md （5.4〜5.5 の validator 規範）

[出力物]
1. サンプルファイル
   - /data/sample/3dss/valid/sampleNN_valid_*.3dss.json
   - /data/sample/3dss/invalid/sampleNN_invalid_*.3dss.json
   - 上記マトリクスに列挙したケースを最低限カバーすること。
   - 各ファイル先頭のコメント（JSON なので別ファイルでも可）として、
     「狙い / どのルールを検証するか」を README にまとめる:
     - /data/sample/3dss/README.md

2. 自動テスト
   - /code/common/selftest/threeDss_samples.spec.js
   - 内容:
     - valid/* は `validate3Dss(doc).ok === true`
     - invalid/* は `validate3Dss(doc).ok === false`
     - 代表的な invalid ケースについては keyword / instancePath の期待値も確認。

3. npm スクリプト
   - package.json の "scripts" に以下を追加/更新:
     - "selftest:common" に threeDss_samples.spec.js が含まれることを確認。

[制約]
- 必ず /schemas/3DSS.schema.json を単一の真理源とし、
  スキーマに無いキーはサンプルに含めない（invalid ケースで intentionally 追加する場合を除く）。
- internal-model-validator (`validateInternalModel`) はこの selftest では使用しない。
  3DSS-validator (`validate3Dss`) だけを対象とする。
