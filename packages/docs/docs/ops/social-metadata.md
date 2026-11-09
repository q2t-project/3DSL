---
title: 共有用メタデータと画像の管理
---

## 共有するページの情報

共通レイアウトを使うトップ・解説・Libraryなどのページは、ページ固有のタイトルと説明、正規URLをOpen Graphに出します。`og:url` は `canonical` と一致させ、Previewでも `https://3dsl.jp/` を正規の配信元とします。検索結果や共有サービスの実表示は、それぞれの取得・更新状況に左右されます。

既定の画像は、既存の3DSLロゴを濃い背景に置いた1200×630ピクセルのPNGです。全ページ共通のサイト識別画像であり、個々の作品の画面例を示すものではありません。画像の内容を表す代替文、MIME、縦横寸法も出します。Twitter Cardには同じ画像と代替文、`summary_large_image` を指定します。

## 画像を作り直す

原本は `apps/viewer/ssot/assets/logo/3DSL.svg`、生成処理は `apps/site/scripts/sync/social-image.mjs` です。追加の書体や外部画像は取得しません。Sharpはビルド時だけ使用し、ブラウザにはPNGを配信します。

```sh
npm --prefix apps/site run sync:social-image
```

通常の `dev` と `build` の前にも自動生成します。出力先 `apps/site/public/assets/social/` は生成物なので直接編集しません。PNGの内容ハッシュをURLに入れ、ロゴや生成条件を変えた場合は新しいURLを参照します。生成した `image.json` は共通レイアウトがサーバー側で読みます。

将来ページ専用画像を指定する場合は、掲載権と実際の画像内容を確認した上で、`Layout` の `ogImage` と `ogImageAlt` にURLと代替文を渡します。専用画像に既定画像の寸法・MIMEを流用しません。

## 公開前後に確認する

`npm --prefix apps/site run build` の公開検査で、生成ページのタイトル・説明・正規URLとOGの一致、画像URL・代替文、PNGの寸法とハッシュを検査します。Previewでサイトマップを省く場合も実行します。

本番反映後はトップと代表解説のHTML、そこに記載されたクエリなしのPNGをGETし、状態200、`image/png`、生成画像とのバイト一致を確認します。共有サービス側の取得・カード表示まで確認できていなければ、画像を配信できることと実表示の確認を区別して記録します。

## 一次資料

- [The Open Graph protocol](https://ogp.me/)
- [Sharp: Composite images](https://sharp.pixelplumbing.com/api-composite/)
