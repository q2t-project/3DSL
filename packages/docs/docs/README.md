# packages/docs/docs

サイト公開向け **Docs コレクション**（設計・運用・契約など）の SSOT。

`apps/site/scripts/sync/docs.mjs` が、次を mirror する。

- `packages/docs/docs` -> `apps/site/src/content/docs`

関連コレクションは **別ディレクトリが SSOT**。

- FAQ: `packages/docs/faq` -> `apps/site/src/content/faq`
- Policy: `packages/docs/policy` -> `apps/site/src/content/policy`

※昔の名残で `packages/docs/docs/faq` や `packages/docs/docs/policy` を作ると、
sync 時に余計なルートや衝突の元になるので作らんようにしてな。

## ガード

- `apps/site/scripts/sync/docs.mjs` は、`packages/docs/docs/{policy,faq}` を検出したら **NGで停止**する（混入禁止）


## Library

- 方針（詳細ページ）: `packages/docs/docs/library/page-policy.md`
- 登録手順: `packages/docs/docs/library/workflow.md`
- `_meta.json` フィールド辞書: `packages/docs/docs/library/meta-fields.md`
- 運用 Cheatsheet: `packages/docs/docs/library/ops-cheatsheet.md`
