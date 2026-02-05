# `_meta.json` フィールド辞書（SSOT）

（SSOT置き場: `packages/docs/docs/library/meta-fields.md`）

このドキュメントは、`packages/3dss-content/library/<ID>/_meta.json` の **フィールド意味（SSOT）** を固定する。

- コンテンツ本体は `model.3dss.json`（表現データ）
- 出典・権利・参考文献・制作情報などの「台帳」は `_meta.json`
- 読み手には Viewer / Site の **Metaパネル（スクロール + 折りたたみ）** で `_meta.json` を読ませる、という設計でいく

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

## 2. MUST / WANT（MECE）

_meta.json は **台帳**。表示メタ（title/summary/tags）やモデルのタイムライン（created_at/revised_at）を入れない。
それらは `model.3dss.json` の `document_meta` が SSOT。

### 2.1 MUST（公開ライブラリとして成立する最低限）

#### `published` (boolean)
- 公開スイッチ（一覧に出すか）
- `false`：非公開（作業中/検証中/PR preview 用）
- `true`：公開（library 一覧に載る対象）

#### `published_at` (string, ISO 8601)
- **初回公開日（固定）**
- `published:false -> true` の初回遷移でセットし、それ以降は変更しない
- `published:false` の間は **キー自体を持たない**（`null` は作らない）

#### `republished_at` (string, ISO 8601)
- **更新日**
- 公開後に、本文/SEO/権利/参照/添付/導線など「掲載要素」を更新したら更新する
- `published:false` の間は **キー自体を持たない**（`null` は作らない）

### 2.2 WANT（品質・運用・将来拡張）

#### `description` (string)
- 詳細説明（長文OK）
- 表示上は「概要カード」や「説明」に出す用途

#### `hidden` (boolean)
- 「公開扱いだが露出は抑える」ための予約席

#### `recommended` (boolean)
- おすすめ枠/特集枠のためのスイッチ

### 2.3 禁止キー（ドリフト防止）

以下は `_meta.json` に入れたら **NG**（チェックで弾く）：

- `title`
- `summary`
- `tags`
- `created_at`
- `updated_at`

## 3. SEO

### `seo` (object)

#### `seo.title` (string)
- SEO用タイトル（未指定なら `model.document_meta.document_title` を流用してもよい）

#### `seo.description` (string)
- SEO用説明文（未指定なら `model.document_meta.document_summary` を流用してもよい）

#### `seo.og_image` (string)
- OGP画像パス/URL
- 例：同フォルダに `ogp.png` を置くなら `"ogp.png"` のように相対指定でも可（実装側の解釈に合わせる）

---

## 4. Authors（作者）

### `authors` (array)
複数人/複数組織を許容。

- `authors[].name`：作者名（個人名/屋号/チーム名）
- `authors[].role`：役割（例：`author`, `editor`, `translator`, `data-curator`）
- `authors[].url`：作者URL（任意）

---

## 5. Rights（権利）

### `rights` (object)

#### `rights.license` (string)
- このコンテンツ自体のライセンス
- 例：`CC BY 4.0`, `CC0 1.0`, `All rights reserved` など

#### `rights.copyright` (string)
- 著作権表示（例：`© 2026 q2t project`）

#### `rights.attribution_required` (boolean)
- 帰属表示（クレジット）が必要なら `true`

### `rights.third_party` (array)
第三者素材の台帳。使ってないなら空配列でOK。

#### 5.1 1件の必須フィールド（MUST）
各要素は **必ずこの4つ** を埋める（不明は空文字じゃなく `"UNKNOWN"` で明示）。

- `rights.third_party[].name`：素材名/提供者/パッケージ名
- `rights.third_party[].license`：ライセンス名（できれば正式名 or SPDX）
- `rights.third_party[].url`：出典URL（素材ページ or ライセンスページを最低1つ）
- `rights.third_party[].note`：使用箇所（検索できるレベルで具体的に）

#### 5.2 文字列フォーマット（固定）

##### `name`
`"<素材名> — <提供者/サイト>"`

##### `license`
- 可能なら SPDX もしくは一般に通る正式名 + バージョン
- 例：`CC BY 4.0`, `OFL-1.1`, `MIT`, `Apache-2.0`

##### `url`
- 原則：素材ページURL
- 複数URLを入れたい場合は `;` 区切りで1フィールドに入れてよい

##### `note`
`"<category>: <where> — <how>"`

- `category` は次のいずれかに固定（表記ゆれ防止）
  - `og_image`, `thumbnail`, `in_model`, `ui_icon`, `font`, `dataset`, `texture`, `audio`, `other`

#### 5.3 記入例
```json
{
  "name": "Inter — Rasmus Andersson",
  "license": "OFL-1.1",
  "url": "https://rsms.me/inter/ ; https://scripts.sil.org/OFL",
  "note": "font: viewer text — UI font"
}
```

```json
{
  "name": "Unsplash Photo (ID: abcdef) — Unsplash (Author: Jane Doe)",
  "license": "Unsplash License",
  "url": "https://unsplash.com/photos/abcdef ; https://unsplash.com/license",
  "note": "og_image: ogp.png — base photo (cropped + overlay text)"
}
```

---

## 6. References（参考文献・引用元）

### 6.1 方針
- 参考文献は `_meta.json.references[]` に集約（SSOT）
- 1件＝1ソース（本1冊、論文1本、Webページ1つ、データセット1つ）
- **「どの範囲を使ったか」** と **「引用/要約/再構成/数値利用」** を必ず残す

### 6.2 推奨フィールド（拡張込み）
`references[]` は将来の表示/検索のため、次の形を推奨する。

- `type`：`book | paper | web | dataset | other`
- `title`：題名
- `authors`：著者（まずは文字列でOK）
- `year`：年
- `publisher_or_venue`：出版社/掲載誌/会議名/サイト名
- `edition`：版（第◯版/改訂版/Release等）
- `language`：`ja | en | other`
- `translator`：翻訳書の訳者
- `isbn_or_doi`：ISBN/DOI（どちらか、または空）
- `url`：URL（可能なら）
- `accessed_at`：Web参照の参照日（YYYY-MM-DD）
- `used_for`：`model | text | structure | numbers | inspiration`
- `locator`：どの範囲を使ったか（ページ/章/節/図表など）
- `scope_note`：どの部分に効いたか
- `quote_or_derived_note`：逐語引用か、要約/再構成か、数値利用か、派生か

### 6.3 locator（範囲）の書き方（固定）
`locator` は次のように書く。

- ページ：`p.` / `pp.`（例：`pp. 120-138`）
- 章：`ch.`（例：`ch. 3`）
- 節：`sec.`（例：`sec. 2.1`）
- 図：`fig.`（例：`fig. 4`）
- 表：`tbl.`（例：`tbl. 1`）
- 式：`eq.`（例：`eq. (7)`）
- Web：`#anchor` や見出し名（例：`#Connections`）

### 6.4 記入例

#### 日本語の書籍（ページ範囲）
```json
{
  "type": "book",
  "title": "認知科学入門",
  "authors": "山田 太郎",
  "year": "2018",
  "publisher_or_venue": "○○出版社",
  "edition": "第2版",
  "language": "ja",
  "translator": "",
  "isbn_or_doi": "978-4-xxxx-xxxx-x",
  "url": "",
  "accessed_at": "",
  "used_for": "structure",
  "locator": { "kind": "pages", "value": "pp. 120-138" },
  "scope_note": "視覚野の階層関係の説明に使用",
  "quote_or_derived_note": "要約して再構成（逐語引用なし）"
}
```

#### 英語の論文（DOI + 図）
```json
{
  "type": "paper",
  "title": "Title of the Paper",
  "authors": "Smith, J.; Doe, A.",
  "year": "2019",
  "publisher_or_venue": "Journal Name",
  "edition": "",
  "language": "en",
  "translator": "",
  "isbn_or_doi": "doi:10.1234/abcd.2019.001",
  "url": "https://doi.org/10.1234/abcd.2019.001",
  "accessed_at": "2026-01-20",
  "used_for": "numbers",
  "locator": { "kind": "figure", "value": "fig. 2" },
  "scope_note": "数値レンジと傾向の把握",
  "quote_or_derived_note": "図の値を参照し再表現（原図は再掲していない）"
}
```

#### Webページ（見出し/アンカー）
```json
{
  "type": "web",
  "title": "Visual cortex (example page)",
  "authors": "Site/Organization Name",
  "year": "2025",
  "publisher_or_venue": "Example Encyclopedia",
  "edition": "",
  "language": "en",
  "translator": "",
  "isbn_or_doi": "",
  "url": "https://example.org/visual-cortex",
  "accessed_at": "2026-01-20",
  "used_for": "structure",
  "locator": { "kind": "section", "value": "#Connections" },
  "scope_note": "領域間の結線の方向を整理",
  "quote_or_derived_note": "要約して再構成（逐語引用なし）"
}
```

---

## 7. Provenance（制作経緯・再現性）

### `provenance.schema_uri` (string)
- 準拠スキーマURI（例：`.../3DSS.schema.json#v1.1.3`）

### `provenance.tools` (string[])
- 使用ツール列挙（例：`3DSD viewer`, `Excel/VBA`, `Blender`）

### `provenance.generation_note` (string)
- 生成/変換のメモ（例：Excel出力→手修正、ダウンサンプリング等）

---

## 8. Links（外部導線）

- `links.canonical`：正規URL（公開後に入れる用）
- `links.repo`：関連ソース/PR/ブランチ等
- `links.discussion`：議論/ノート/記事URL

---

## 9. Navigation 予約席

> いまは空配列でOK。将来の導線機能に使う。

- `entry_points`：見どころ/推奨視点（内部リンクID等）
- `pairs`：対比で見せたい組
- `related`：関連コンテンツID（`26xxxxxx`）
