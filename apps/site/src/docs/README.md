# Docs 配置ルール（サイト用読み物）

このリポジトリでは、**公開サイトに掲載する読み物（Docs記事）**と、**開発者向けの設計/運用ドキュメント**を混在させないため、配置場所を分けて運用する。

---

## 1. 基本方針

- **公開サイト用の読み物（Docs記事）**は `apps/site/src/content/` 配下で管理する  
- リポジトリ直下の `docs/` は、**開発者向け（設計契約・運用・SSOT・ビルド/デプロイ手順など）**を優先し、思想的読み物は置かない

---

## 2. コンテンツ配置（サイト側）

### 2.1 固定ページ（章・単発ページ）
- 置き場所: `apps/site/src/content/text/`
- 例:
  - `top.md`
  - `concept.md`
  - `viewer.md`
  - `modeler.md`
  - `docs.md`（Docsトップ＝導入・目次として扱う）

`text/` は「サイトの固定ページ」を主用途とし、個別の技術・思想記事を増殖させない。

### 2.2 Docs記事（増えていく読み物）
- 置き場所: `apps/site/src/content/docs/`（新設）
- 用途: 「文字の向き」など、個別テーマの読み物/技術背景/歴史/設計思想を継続的に追加していく領域
- 例:
  - `apps/site/src/content/docs/text-orientation.md`
  - `apps/site/src/content/docs/label-placement.md`
  - `apps/site/src/content/docs/renderer-text.md`

---

## 3. URL（想定）

- `/docs/` : Docsトップ（`apps/site/src/content/text/docs.md`）
- `/docs/:slug` : 個別記事（`apps/site/src/content/docs/*.md`）

※Astro 側は Content Collections + `src/pages/docs/[slug].astro`（または `[...slug].astro`）でレンダリングする想定。

---

## 4. Docs記事の frontmatter（推奨最低限）

個別記事（`apps/site/src/content/docs/*.md`）には、運用上の最低限として以下を推奨する。

```yaml
---
title: 文字の向き
description: 3D空間で2D文字を扱うときに暗黙の前提が崩れる理由と、3DSLでの整理方針
status: draft # or published
order: 20
tags: [text, orientation, rendering]
---
