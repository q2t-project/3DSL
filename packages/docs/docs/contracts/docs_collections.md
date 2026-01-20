# Docs Collections Contract (SSOT)
version: 2026-01-20

このドキュメントは **packages/docs/** 配下の配置規約（＝SSOT）を固定するための契約である。

目的：
- 「置き場の恣意性」を禁止し、同じ内容が複数箇所に生える事故を物理的に潰す。
- apps/site は **packages/docs/** を唯一の入力として mirror 生成する。

---

## 1. 大原則（SSOT）

1) **SSOT は packages/docs/**
- 公開文書（Docs / FAQ / Policy）の原本はここに置く。

2) **apps/site/src/content/** は生成物
- `npm --prefix apps/site run sync:docs` 等で **mirror 生成**される。
- 原則として手で編集しない。

3) **「同じ種類の文書」は1箇所にしか置かない**
- 同名・同趣旨の文書が 2 箇所に存在した時点で SSOT が壊れる。

---

## 2. コレクションと配置（固定）

| 種別 | SSOT 置き場 | サイト側の出力 | ルート |
|---|---|---|---|
| Docs | `packages/docs/docs/**` | `apps/site/src/content/docs/**` | `/docs/*` |
| FAQ | `packages/docs/faq/**` | `apps/site/src/content/faq/**` | `/faq/*` |
| Policy | `packages/docs/policy/**` | `apps/site/src/content/policy/**` | `/policy/*`（補助） |

補足：
- `/policy`（プライバシー等のトップ）は Astro の固定ページで管理する場合がある。
- ただし「コンテンツ利用条件」等、**markdown で管理したいポリシー文章**は policy コレクション側に置く。

---

## 3. 禁止（Fail-fast）

次のディレクトリは **存在してはいけない**（作った瞬間に SSOT が崩れるため）。

- `packages/docs/docs/faq/**`  （FAQ は `packages/docs/faq/**`）
- `packages/docs/docs/policy/**`（Policy は `packages/docs/policy/**`）

理由：
- `docs` コレクション配下に `faq` / `policy` を混ぜると、どちらが原本か判別できなくなる。
- sync スクリプトが「救済」し始めると、最終的に運用が恣意的になる。

---

## 4. 既存資産の移動指針（迷ったらこれ）

- 「Q&A形式／導入的」→ `packages/docs/faq/**`
- 「仕様・契約・運用・開発者向け」→ `packages/docs/docs/**`
- 「法務・利用条件・免責・第三者サービス」→ `packages/docs/policy/**`
