# Library 個別ページ方針

## 関連SSOT

- 登録手順（SSOT）: `packages/docs/docs/library/workflow.md`
- `_meta.json` フィールド辞書（SSOT）: `packages/docs/docs/library/meta-fields.md`

このページは **Library 詳細ページの表示方針**（SEO/UX/ページ構造）を固定する。
データ定義や運用手順のSSOTは上のドキュメントに集約する。


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


### 表示メタのSSOT（重要）

- **表示に使うタイトル/要約/タグ/created/revised は `model.3dss.json` の `document_meta` がSSOT**。
- `_meta.json` は「公開台帳（published/published_at/republished_at）」と「出典/権利/制作情報/添付等」を扱う。
- `_meta.json` に表示メタ（title/summary/tags/created_at/updated_at 等）を重複させるのは **コンタミ** として禁止（チェックで弾く）。

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

### メタ情報の SSOT（決定）

#### 背景

`model.3dss.json`（`document_meta`）と `_meta.json` の両方に、タイトル・要約・タグ等の「表示用メタ情報」を持たせると、
どちらが正（SSOT）かが分からなくなり、更新漏れや不整合が発生しやすい。

このため、Library の **表示用メタ情報（カード/詳細ページの見出しに出るもの）** の SSOT を
`model.3dss.json`（`document_meta`）に一本化する。

`_meta.json` は **台帳**として、公開状態・SEO・権利・参考文献・導線・添付の表示設定のみを持つ。

#### ルール（SSOT）

* `model.3dss.json` の `document_meta` は **表示メタ + タイムライン** の SSOT。
  * **フィールド名は固定**（fallback しない）。
  * 公開アイテム（`_meta.json.published:true`）では下記が必須。

必須（published:true のとき）

* `document_title`（string, non-empty）
* `document_summary`（string）
* `tags`（string[]）
* `created_at`（timestamp_utc）
* `revised_at`（timestamp_utc）

* `_meta.json` は **公開台帳・SEO・権利・参照・添付/導線設定** の SSOT。
  * **禁止キー**：`title` / `summary` / `tags` / `created_at` / `updated_at`
  * **許可キー（トップレベル）**：
    `published`, `published_at`, `republished_at`, `description`, `seo`, `rights`, `references`,
    `entry_points`, `pairs`, `related`, `page`, `recommended`, `hidden`, `provenance`, `links`, `authors`
  * 上記以外の未知キーは drift 防止のため **エラー**とする（チェックで弾く）。

#### 公開/更新の運用ルール（published / published_at / republished_at）

Library の公開状態は `_meta.json` 側でのみ管理する。

* `published`（boolean）
  * 現在の公開状態。
* `published_at`（timestamp_utc）
  * **初回公開日（固定）**。`published:false -> true` の初回遷移でセットし、それ以降は変更しない。
* `republished_at`（timestamp_utc）
  * **更新日**。公開後の更新を表す。
  * 公開中（`published:true`）に、`document_title/document_summary/tags/本文/SEO/権利/添付` 等の掲載要素を変更した場合に更新する。

表示上の扱い（/library 一覧など）

* 「公開日」= `published_at`
* 「更新日」= `republished_at`
* 並び替えの基準 = `republished_at ?? published_at`

キー名は JSON の扱いやすさのため **`republished_at`（ハイフン無し）に統一**する。

#### dist（生成物）

dist 生成（`packages/3dss-content/scripts/build-3dss-content-dist.mjs`）では、SSOT の `model.3dss.json` をそのまま配布/サイト用へコピーする。
表示メタは SSOT が `model.document_meta` なので、`_meta.json` から `model` へ注入（merge）しない。

* Library HTML（SEO/UX）: `model.3dss.json`（表示メタ）+ `_meta.json`（台帳）
* Viewer での単体モデル表示: `model.3dss.json` の `document_meta` を利用

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
