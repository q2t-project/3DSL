# 2025-ROOT repo convergence snapshot

## 1. Current status summary

| Section | ✅ | ⚠️ | ⬜ |
| --- | --- | --- | --- |
| A. common | 2 | 1 | 0 |
| B. modeler | 0 | 2 | 2 |
| C. viewer | 2 | 0 | 1 |
| D. repo health | 0 | 0 | 2 |

- ✅ 合計: 4
- ⚠️ 合計: 3
- ⬜ 合計: 5

## 2. 未達（⚠️ / ⬜）項目一覧

### A セクション
- **A-1 (⚠️)**: ThreeDSSDocument 型定義の仕様同期と selftest 拡充が未完。PR 未アサイン。

### B セクション
- **B-1 (⚠️)**: core importer で正常系 / 異常系の selftest が不足。予定 PR: PR5。
- **B-2 (⚠️)**: PREP importer は stub のまま。予定 PR: PR4。
- **B-3 (⬜)**: modeler exporter の仕様確認と selftest が未着手。予定 PR: PR5 or PR6。
- **B-4 (⬜)**: modeler パイプライン selftest コマンド（npm run selftest:modeler）が未整備。予定 PR: PR6。

### C セクション
- **C-3 (⬜)**: viewer パイプライン selftest（npm run selftest:viewer）が未整備。予定 PR: PR6 or PR7。

### D セクション
- **D-1 (⬜)**: リポジトリ統合チェックコマンド `npm run check:repo` の復活が未着手。予定 PR: PR7。
- **D-2 (⬜)**: ROOT codex 指令書は未運用（今回が初期実行）。担当: Human / ChatGPT。

## 3. 既存 PR 指令書との対応

| ゴール項目 | 状態 | 関連 PR 指令書 |
| --- | --- | --- |
| A-2 JSON Schema / Ajv | ✅ | PR3（実施済み） |
| A-3 validation selftest | ✅ | PR3（実施済み） |
| B-1 core importer | ⚠️ | PR5（予定） |
| B-2 PREP importer | ⚠️ | PR4（進行中想定） |
| B-3 modeler exporter | ⬜ | PR5 or PR6（調整中） |
| B-4 modeler selftest | ⬜ | PR6（予定） |
| C-1 model→view 変換 | ✅ | PR2（実施済み） |
| C-2 viewer scene builder selftest | ✅ | PR3（実施済み） |
| C-3 viewer selftest | ⬜ | PR6 or PR7（予定） |
| D-1 repo check command | ⬜ | PR7（予定） |
| D-2 ROOT codex 指令書 | ⬜ | Human / ChatGPT（本ログが初回） |

## 4. 次の PR 候補トップ3

1. **B-2 PREP importer 完成 (提案: `PR4_modeler-prep-importer`)**
   - 触るディレクトリ: `code/modeler/io/`, `code/modeler/selftest/`, `data/sample/prep/`
   - 追加 selftest 案: `code/modeler/selftest/importer_prep.spec.js`
   - 目標コマンド: `node --test code/modeler/selftest/importer_prep.spec.js`
2. **B-1 core importer selftest 拡充 (提案: `PR5_modeler-core-importer-selftest`)**
   - 触るディレクトリ: `code/modeler/io/`, `code/modeler/selftest/`, `data/sample/core/`
   - 追加 selftest 案: `code/modeler/selftest/importer_core.spec.js`
   - 目標コマンド: `node --test code/modeler/selftest/importer_core.spec.js`
3. **D-1 リポジトリ統合チェック (提案: `PR7_repo-check-command`)**
   - 触るディレクトリ: `package.json`（scripts 範囲）, `code/scripts/`, `code/common/selftest/`, `code/modeler/selftest/`, `code/viewer/selftest/`
   - 追加 selftest 案: `code/scripts/selftest/check_repo.spec.js`
   - 目標コマンド: `npm run check:repo`

