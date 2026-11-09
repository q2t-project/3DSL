---
title: 更新時のキャッシュと実行ファイルの点検
---

## 2026-11-09の確認

本番の現行Viewerランタイム、Ajvの入口、Modelerの調整CSSには `max-age=14400` が付いていました。元の設定やPages既定値の `max-age=0` より長い応答です。CloudflareのBrowser Cache TTLは、元のmax-ageより長い値を返す場合があります。管理画面の現在値の確認とは区別して記録します。

更新されるJS・CSSには `no-cache` を指定します。名前が同じファイルを再利用する前に検証させる設定で、内容の保存は許されます。内容が変わらなければETagと304を使い、本文の再転送を省けます。HTMLの既存の扱い、退役URLのno-store、作品・添付の公開範囲はそれぞれ別の設定です。

正本は `apps/site/config/pages-headers.txt`。JSとCSSのルールが経路別ルールにも一致した場合は、Cache-Controlの全項目を合わせて評価します。`no-cache` がある応答はmax-ageの数値だけで鮮度を判断しません。内容が固定されたハッシュ付きURLを長期保存する最適化は、版付きURLの範囲と実測を確認してから進めます。

## ブラウザで再現する検査

`node scripts/check/cache-delivery.mjs` は、隔離したHTTPサーバーとChromiumで通常のページ遷移を行います。

1. HTML AとコードAを読み込む。
2. HTMLとコードをBへ変え、新しい文書を開く。HTML BとコードBが揃うことを確認。
3. コードBを変えずに別の文書を開く。条件付き要求と304で本文を再利用することを確認。

変更前のModeler用キャッシュ設定では、2でHTML BとコードAの組合せを再現しました。これは小さな検査用モジュールによる再現であり、本番の作品破損を観測したという記録ではありません。

## 公開時の確認と残る範囲

本番のクエリなしURLで、Cache-Controlの全値、ETag、Age、CF-Cache-Status、本文のハッシュを記録します。現在のViewer・Modeler・vendorの実行経路と、旧Viewer入口・退役URLを分けます。Preview URLはCloudflare Accessへ転送される場合があり、ログイン画面のヘッダーをサイト本体の証拠に使いません。

新しいヘッダーは、ブラウザがすでに保存した古い応答を書き換えません。Cloudflareのパージもブラウザ内の保存には作用しません。開いたままのタブ、旧応答の期限、遅延読込とデプロイの同時発生、Cloudflare側で強制する個別ルールは追加点検の対象です。診断用クエリ付きの成功だけを復旧の証拠にはしません。

## 一次資料

- [Cloudflare Pagesの配信とETag](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [CloudflareのBrowser Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/set-browser-ttl/)
- [CloudflareのOrigin Cache Control](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [HTTP Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
