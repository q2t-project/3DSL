# Library 登録手順（SSOT）

このドキュメントは、`packages/3dss-content/library/<ID>/` へ **公開コンテンツを登録**し、Site の Library 一覧・詳細ページへ反映するための **手順SSOT**。

- 表示方針（ページ構造/SEO/UX）は `packages/docs/docs/library/page-policy.md`（SSOT）
- `_meta.json` のフィールド意味は `packages/docs/docs/library/meta-fields.md`（SSOT）

---

## 0. 固定ルール（コンタミ防止）

- **WIP は repo 外**（別フォルダ/別repo）。repo 内に未完成物を置かない。
- repo 内の `packages/3dss-content/library/` は **公開SSOT**。ここに入ったものは公開され得る前提で扱う。
- 表示メタ（title/summary/tags/created/revised）は **`model.3dss.json` の `document_meta` がSSOT**。
  - `_meta.json` に同種のキーを重複させるのは禁止（チェックで弾く）。
- 画像/添付は **フォルダ配置**をSSOTにする（一覧汚染を避け、機械処理しやすくする）。

---

## 1. フォルダ構成（公開SSOT）

`packages/3dss-content/library/<ID>/` の標準構成:

```
<ID>/
  model.3dss.json          # 必須（表示メタSSOT: document_meta）
  _meta.json               # 必須（公開台帳 + 出典/権利/制作情報など）
  content.md               # 任意（本文。無い場合は本文なし）
  assets/                  # 任意（本文中で参照する画像、OGP等）
  attachments/             # 任意（PDF等の添付。詳細ページで列挙表示）
```

---

## 2. 新規アイテム作成（ID 採番）

Site 側スクリプトで雛形とIDを生成する。

```
npm --prefix apps/site run new:library-item -- --title "..."
```

生成後、`packages/3dss-content/library/<ID>/` が作られる。

---

## 3. `model.3dss.json`（表示メタ SSOT）

`model.3dss.json` の `document_meta` を必ず埋める（例）:

- `document_title`
- `document_summary`
- `tags`
- `created_at`
- `revised_at`

※ ここが **一覧カード/詳細ページの表示**に使われるSSOT。

---

## 4. `_meta.json`（公開台帳 + 台帳情報）

### 4.1 公開フラグと日付（台帳SSOT）

- WIP/非公開の間:
  - `published: false`
  - `published_at` / `republished_at` は **持たない（または未設定）**
- 公開するタイミング:
  - `published: true`
  - `published_at: <初回公開日時>`（固定）
  - `republished_at: <更新公開日時>`（更新のたびに更新）

### 4.2 出典・権利・制作情報

`rights` / `references` / `authors` / `provenance` / `links` などは
`packages/docs/docs/library/meta-fields.md` をSSOTとして埋める。

---

## 5. `content.md` の書き方（本文 + 画像 + 添付リンク）

### 5.1 本文

`content.md` は通常の Markdown。見出し・本文・箇条書き等を使える。

### 5.2 画像（PNG/JPG/SVG 等）

画像は原則 `assets/` に置き、Markdown から相対参照する。

例:

```md
![図: 全体構造](./assets/overview.png)
```

### 5.3 添付（PDF 等）

添付は `attachments/` に置く。
詳細ページは `attachments/` を列挙して「添付ファイル」として表示する設計。

本文中からリンクも貼れる（相対パス）。

例:

```md
- 詳細資料: [whitepaper.pdf](./attachments/whitepaper.pdf)
```

---

## 6. チェックと反映（必須）

```
npm --prefix apps/site run check:library
npm --prefix apps/site run sync:3dss-content
```

- `check:library` が通ること（コンタミや必須不足をここで止める）
- sync 後、Site 側のプレビューで `/library/<id>/` を確認

---

## 7. 公開フロー（PR）

- PR 作成（アイテム追加/更新）
- Cloudflare Pages preview で確認
- merge 後に本番へ反映
