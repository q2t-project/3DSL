---
title: 配信ヘッダーと公開埋込の点検
---

## 共通の防御設定

`apps/site/config/document-security.mjs` を、静的Pages応答と公開終了の410応答で共有します。ビルド時には共通ルールと `config/pages-headers.txt` の経路別ルールから `_headers` を生成します。

- `base-uri 'self'`：基準URLを同じオリジンに限定。Viewerの既存の相対baseを使用できます。
- `object-src 'none'`：文書内のobject・embedを制限。
- `form-action 'self' https://formspree.io`：フォーム送信先を同じオリジンと既存の受付サービスに限定。
- `nosniff`：MIME型に基づいて読み込みます。
- `strict-origin-when-cross-origin`：別オリジンへ渡す参照元情報をオリジンまでに制限。

公開Viewer・Modelerのiframe埋込を利用できます。添付文書・作品素材には、共通CSPに加えて既存のsandboxと `default-src 'none'` が適用されます。Cloudflare Pagesは一致するルールの同名ヘッダーをカンマで結合し、ブラウザは各CSPを適用します。

## 検査

`node scripts/check/web-defense.mjs` は生成済みヘッダーと410応答を検査します。隔離したChromiumで基準URLの外部指定、object、外部フォームを拒否し、実際の問い合わせページのネイティブPOSTがCSPで許されることを確認します。受付サービス向けの試験POSTはブラウザの通信遮断で止め、外部へ送信しません。別オリジンからのViewerの作品読込とModelerの起動も検査します。

既存の添付HTML・SVG検査では、共通ルールと経路別ルールを結合して検査します。公開時には本番のMIME・CORS・CSP・参照元ヘッダーを別途照合します。

## 継続点検

このCSPの制限対象はbase・object・フォームです。インラインスクリプト、Worker、フォント、QR、今後の広告配信を含む `script-src`・`connect-src` 等の許可先は追加調査の対象です。HTTPS応答の確認と、HTTPからの転送・HSTS設定の確認も区別します。外部埋込、受付サービスや広告の変更時に再検査します。

## 一次資料

- [Cloudflare Pagesのヘッダー設定](https://developers.cloudflare.com/pages/configuration/headers/)
- [CSP base-uri](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/base-uri)
- [CSP form-action](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/form-action)
- [CSP object-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/object-src)
