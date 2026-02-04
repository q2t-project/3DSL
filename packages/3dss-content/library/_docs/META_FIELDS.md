# _meta.json フィールド辞書（SSOT）

このドキュメントは、`packages/3dss-content/library/<ID>/_meta.json` の **フィールド意味（SSOT）** を固定する。

- **表示系SSOT（title/summary/tags/created_at/revised_at）** は `model.3dss.json` の `document_meta`
- `_meta.json` は **台帳**（公開状態・権利・参考文献・添付/導線・SEO など）だけを持つ
- `_meta.json` に **title/summary/tags/created_at/updated_at** を入れるのは禁止（混入＝コンタミ源）

---

## 1. 原則

### 1.1 SSOT
- **意味のSSOTはこの `META_FIELDS.md`**。
- UI（Metaパネル）の見せ方は変わっても、フィールドの意味は変えへん。

### 1.2 「references」と「rights.third_party」の使い分け
- `references[]`：文献・Web・データセットなど、**知識/根拠/説明の参照元**
- `rights.third_party[]`：画像・フォント・3Dモデル等、成果物に含まれる/由来する **第三者素材の権利台帳**

> 目安：その素材が無いと同じ見た目/同じ情報にならん → `rights.third_party`。  
> 参考に読んだだけ → `references`。

---

## 2. MUST / WANT

### 2.1 MUST（公開ライブラリとして成立する最低限）

#### `published` (boolean)
- 公開フラグ
- `true` のときは `published_at` と `republished_at` が必須

#### `published_at` (string, ISO8601)
- **初回公開日（固定）**
- `published:false -> true` の初回にセット
- `published:false` の間は **キー自体を持たない**（`null` で置かない）

#### `republished_at` (string, ISO8601)
- **再公開/更新日（可変）**
- 公開中に「掲載情報（本文/権利/SEO/添付/導線）」を触ったら更新
- 一覧の並び替えや “更新日表示” は `republished_at` を使う

#### `description` (string)
- 個別ページに載せる説明文（Markdown ではなくプレーンテキスト想定）
- 図やPDF等の添付は `page.attachments[]` で扱う（下記）

---

### 2.2 WANT（あると良い）

#### `hidden` (boolean)
- 公開中でも一覧から隠す（直リンクのみ）

#### `recommended` (boolean)
- おすすめ表示用（UI側で任意利用）

#### `seo` (object)
- `seo.title` / `seo.description` / `seo.og_image`
- 未設定なら UI 側で `model.document_meta` をフォールバックにして良い

#### `rights` (object)
- `license` / `copyright` / `attribution_required`
- `third_party[]`（第三者素材の台帳）

#### `references` (array)
- 参照文献・Web・データセット等

#### `authors` (array)
- 表示・権利表記のための著者/制作者情報

#### `page` (object)
- 個別ページの本文/添付/セクション制御
- 例：
  - `page.body`（長文の本文。Markdown 可）
  - `page.attachments[]`（PDF/画像など）
  - `page.sections[]`（任意の章立て）

#### `links` (object)
- `canonical` / `repo` / `discussion` など

#### `provenance` (object)
- 生成ツール・スキーマURI・生成メモ

#### `entry_points` / `pairs` / `related` (array)
- 画面導線・関連コンテンツリンク等（UI側で任意利用）

---

## 3. 禁止キー（コンタミ対策）

`_meta.json` に次のキーが入ってたら **エラー**（機械的に弾く）：

- `title`
- `summary`
- `tags`
- `created_at`
- `updated_at`

これらは **`model.3dss.json` の `document_meta` にのみ置く**。
