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
