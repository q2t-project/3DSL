# Library 個別ページ方針

## 目的

Library の各コンテンツを **検索エンジンが読める HTML ページ**として公開しつつ、3D モデルの体験（Viewer）も成立させる。

* SEO: タイトル/要約/本文/参考文献/権利情報を HTML に載せる
* UX: 最初の画面で「何のモデルか」が分かり、必要なら Viewer で拡大して見られる
* 運用: 1 つの共通テンプレートで回し、コンテンツごとの差分はメタ情報で制御する

## URL とデータ配置

* 一覧: `/library/`
* 個別ページ: `/library/<id>/`（`<id>` は `packages/3dss-content/library/<id>` のフォルダ名）
* 個別データ: `/_data/library/<id>/...`

個別ページは **HTML（Astro）**で構成し、モデル本体・本文・画像等は `/_data/library/<id>/` から参照する。

## レイアウト思想

Viewer（/viewer/）は「全画面・スクロール無し」が基本設計。
一方、Library 個別ページは **「スクロール前提」**で、情報の階層（概要 → 本文 → 参考/添付）を成立させる。

### ファーストビュー（スクロール無しで把握できる範囲）

* モデルのプレビュー（軽量/簡易 Viewer: peek）
* タイトル・要約・タグ・更新日などの最低限のメタ情報
* 主要アクション
  * `Viewer で開く`（フル機能の /viewer/ へ）
  * `model.3dss.json` を開く/ダウンロード

### スクロール後（深掘り）

* 本文（Markdown）… 画像を挟み込み可能
* 添付ファイル（PDF 等）
* 参考文献/出典/権利情報（_meta.json 由来）

## ページ構成（標準）

1. ヘッダ：パンくず、タイトル、要約
2. （モバイル）上部広告（任意）
3. プレビュー（iframe: `/viewer/peek.html?model=...`）
4. 概要カード：タグ、日付、作者、説明、主要リンク
5. 本文（任意）
6. （任意）インライン広告
7. 添付（任意）
8. 参考文献/権利（任意）
9. （PC）右レール広告（任意・sticky）

## コンテンツの書き方

### ファイル配置（SSOT）

`packages/3dss-content/library/<id>/` に置く。

* `model.3dss.json`（必須）
* `_meta.json`（推奨/実質必須）
* `content.md`（任意…本文）
* `assets/`（任意…本文用の画像など）
* `attachments/`（任意…PDF などの添付）

### メタ情報の SSOT と dist 注入方式（決定）

#### 背景

`model.3dss.json`（`document_meta`）と `_meta.json` の両方に、タイトル・要約・タグ等の「表示用メタ情報」を持たせると、
どちらが正（SSOT）かが分からなくなり、更新漏れや不整合が発生しやすい。

このため、Library の表示用メタ情報の SSOT を `_meta.json` に一本化し、配布/サイト用の dist 生成時に
必要な情報だけを `model.3dss.json` に注入（merge）する運用に統一する。

#### ルール（SSOT）

* `_meta.json` は **表示・公開・SEO・権利情報**の SSOT。
  * 例：`title` / `summary` / `tags` / `published` / `rights` / `references` / `page.*` など。
* SSOT 側の `model.3dss.json` は **モデルそのもの（構造データ）**と、必要最小限の **技術メタ情報**のみを持つ。
  * 例：`document_uuid` / `schema_uri` / `generator` / `coordinate_system` / `units` など。
* SSOT 側の `model.3dss.json` に、表示用メタ（`document_title` / `document_summary` / `tags` 等）を重複して持たせない。


#### 公開/更新の運用ルール（published / published_at / republished_at）

Library の公開状態は `_meta.json` 側でのみ管理し、`model.3dss.json`（3DSS データ本体）には混在させない。

* `published`（boolean）
  * 現在の公開状態。
* `published_at`（timestamp_utc）
  * **初回公開日（固定）**。`published:false -> true` の初回遷移でセットし、それ以降は変更しない。
* `republished_at`（timestamp_utc）
  * **更新日**。公開後の更新を表す。
  * 公開中（`published:true`）に、`title/summary/tags/本文/SEO/権利/添付` 等の **掲載メタ情報のみを変更した場合も更新する**。
  * 再公開（`published:false -> true`、ただし過去に `published_at` が存在）も更新扱いとして `republished_at` をセットする。

表示上の扱い（/library 一覧など）

* 「公開日」= `published_at`
* 「更新日」= `republished_at`（無い場合は表示しない、または `published_at` を代替表示）
* 並び替えの基準 = `republished_at ?? published_at`

キー名は JSON の扱いやすさのため **`republished_at`（ハイフン無し）に統一**する。


#### dist 注入（生成物）

`packages/3dss-content/scripts/build-3dss-content-dist.mjs` による dist 生成では、
`_meta.json` 由来の表示用メタを、配布/サイト用の `model.3dss.json`（dist 側）へ注入して出力してよい。

* dist 側 `model.3dss.json` の `document_meta` に注入してよいもの（例）
  * `document_title` ← `_meta.json:title`
  * `document_summary` ← `_meta.json:summary`（または派生）
  * `tags` ← `_meta.json:tags`
* dist 側に注入される値は **SSOT の `_meta.json` が正**であり、手編集してはならない。

この方式により、

* Library HTML（SEO/UX）: `_meta.json` を参照
* Viewer での単体モデル表示: dist 側 `model.3dss.json` に注入済みメタが利用可能

を両立しつつ、SSOT の二重管理を避ける。

### Markdown に画像を混ぜる

本文は通常の Markdown を使う。

```md
本文…

![説明文](/_data/library/<id>/assets/figure-01.png)

本文…
```

推奨は **絶対パス**（`/_data/library/<id>/...`）。
相対パスは URL 解決が紛れやすいので避ける。

## 広告の方針

「枠を多めに用意し、個別コンテンツで使う枠を選ぶ」方式。

* デフォルト: `mobile_top` と `desktop_rail`（必要ならテンプレ側で変更）
* コンテンツごとの上書き: `_meta.json` の `page.ads` でスロット名を allowlist

例：広告ゼロ

```json
{
  "page": {
    "ads": []
  }
}
```

例：モバイル上部＋PC右レール＋インライン 1つ

```json
{
  "page": {
    "ads": ["mobile_top", "desktop_rail", "inline_1"]
  }
}
```

## 実装とビルド手順

### dist 生成（packages/3dss-content）

`packages/3dss-content/scripts/build-3dss-content-dist.mjs` が以下を生成する。

* `packages/3dss-content/dist/library/<id>/...`（サイト用: _meta/content/assets/attachments/model）
* `packages/3dss-content/dist/3dss/library/<id>/model.3dss.json`（互換用: 既存の viewer リンク維持）
* `packages/3dss-content/dist/library/library_index.json`

### サイトへ同期（apps/site）

`apps/site/scripts/sync/3dss-content.mjs` が以下を行う。

* `apps/site/public/_data/library/...` にコピー
* `apps/site/src/content/library_items/<id>.md` を生成（`content.md` がある場合のみ）

Astro は `library_items` コレクションを通じて Markdown を HTML 化し、個別ページに埋め込む。


---

## model.document_meta（表示系SSOT）

Library の一覧カード/個別ページが表示する **core（タイトル・要約・タグ・作成/改訂日）** は、`packages/3dss-content/library/<id>/model.3dss.json` の `document_meta` を **唯一のSSOT** とする。

### 必須フィールド（公開/非公開に関わらず）

- `document_title` (string) もしくは `title` (string)
- `document_summary` (string) もしくは `summary` (string)
- `tags` (string[])
- `created_at` (string, ISO8601)
- `revised_at` (string, ISO8601)

### 表示・並び替えの読み取り優先順位（core）

- title: `document_title ?? title`
- summary: `document_summary ?? summary`
- tags: `tags`
- created: `created_at`
- revised: `revised_at`

---

## _meta.json（公開台帳・権利・参照・添付）

`packages/3dss-content/library/<id>/_meta.json` は **台帳**。公開状態と周辺情報のみを持つ。

### 許可キー（トップレベル）

- `published` (boolean)
- `published_at` (string, ISO8601) ※ `published:true` のとき必須
- `republished_at` (string, ISO8601) ※ `published:true` のとき必須
- `description` (string)
- `hidden` (boolean)
- `recommended` (boolean)
- `seo` (object)
- `authors` (array)
- `rights` (object)
- `references` (array)
- `provenance` (object)
- `links` (object)
- `page` (object) ※ 添付/本文などを置く
- `entry_points` / `pairs` / `related` (array)

### 禁止キー（機械的に弾く）

- `title`
- `summary`
- `tags`
- `created_at`
- `updated_at`

これらは `model.3dss.json` の `document_meta` にのみ置く。
