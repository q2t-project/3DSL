# 3DSL Clean Baseline

## Hard Rules (最初に読む)
- ブラウザ実行コードから `../node_modules/**` へ import してはならない。
- 共有ライブラリは `code/common/**` のみを参照する。
- validator は `code/validator/**` だけに存在する。複製禁止。
- three/ajv/i18n の import は下記パスに固定：
  - `../common/vendor/three/three.module.js`
  - `../common/vendor/ajv/ajv2020.mjs`
  - `../common/i18n/i18n.mjs`