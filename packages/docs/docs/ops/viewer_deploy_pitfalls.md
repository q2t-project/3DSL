# Viewer配備時の注意点

正規の公開入口は `/app/viewer/`。旧URLは同じViewerへ案内する。ローカルで動いても公開ドメインで旧画面が出るときは、ビルドの内容と配信時のキャッシュを順に確認する。

| 配布済みの入口 | ブラウザーで確認すること |
| --- | --- |
| `/viewer`、`/viewer/`、`/viewer/index.html`、`/viewer/viewer_dev.html` | 通常の閲覧は `/app/viewer/` へ移り、旧画面を起動しない |
| `/preview-reconstruction/contract_viewer/`、`/preview-reconstruction/viewer/` とそれぞれの `index.html` | 同じ正規入口に着き、指定された作品が開く |
| `/viewer/peek.html`、`/viewer/peek/`、`/viewer/peek/index.html` | 同じ読取実装を `viewerMode=peek` で開き、埋め込みには図だけを表示する |

Pagesでは `viewer.html` を `/viewer`、`viewer/index.html` を `/viewer/` で開く。それぞれがアドレス欄のパスを基準に作品URLを解決する。たとえば `?model=sample.json` は `/viewer` なら `/sample.json`、`/viewer/` なら `/viewer/sample.json` を指す。

`/preview-reconstruction/` 自体は制作・閲覧の案内ページ。Viewerへ一括転送しない。

## ビルドと本番の切り分け

1. `npm --prefix apps/site run build` の後、`apps/site/dist/viewer/index.html` が旧ランタイムを起動せず、正規入口へ引き継ぐことを確認する。このHTMLの元は `apps/reconstruction/hosting/viewer-entry.html`。同じパスを生成する `apps/site/src/pages/viewer/index.astro` は置かない。
2. Cloudflare Pagesの該当Productionデプロイと、デプロイ固有のURL・公開ドメインそれぞれの `/__deploy_probe.txt` でコミットSHAを照合する。Probeが一致しても、個々の入口の応答は別に確認する。
3. まず、利用者が開いたURLそのものを通常のGETで確認する。たとえば `curl -sS -L -D - https://3dsl.jp/viewer/index.html` で、各段のステータス・`Location`・`ETag`・`Cache-Control`・`Age`・`CF-Cache-Status`（返るもの）と最終HTMLを記録し、デプロイ固有のホストで同じパスと比較する。curlはHTML内のJavaScriptを実行しないので、最終画面はブラウザーで確認する。
4. 同じ公開URLに一度だけ診断用クエリを付けた応答とも比較する。クエリなしだけが古い場合、URLごとに異なるキャッシュが疑われる。クエリ付きの成功を復旧の証拠にしない。デプロイ固有のURLも古ければ、先に配布物とデプロイ対象を調べる。

## 古い応答を取り除く

デプロイ固有のURLが新しく、公開ドメインだけ旧HTMLを返す場合は、Cloudflareの公開ドメインに設定したCache RulesでViewerのHTMLや転送を長時間保持していないか確認する。必要なら当該ルールの対象から該当入口を外す。`_headers` の `no-store` は `/viewer` 配下の旧HTML入口を個別に対象とする。JSやCSSなどの資産を一律に対象にはしない。新しいヘッダーを配信しても、すでに別のキャッシュが返している応答は消えない。

Cloudflareで該当ゾーンの **Caching → Configuration → Purge Cache → Custom Purge → URL** を選び、古い応答を確認した完全なURLを指定する。例は `https://3dsl.jp/viewer/index.html`。転送先の `https://3dsl.jp/viewer/` でも古い応答を確認した場合はそのURLも指定する。クエリ付きの実配布URLが別のキャッシュキーなら、そのクエリまで含めて指定する。フラグメント（`#` 以降）はサーバーに送られない。ヘッダーやCookieを含むカスタムキーの場合、通常のダッシュボードのURL指定だけでは削除できない。[Cloudflareの単一ファイル削除手順](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/)に従い、APIでキーに使う値も指定する。

削除後は診断用クエリを足さず同じURLを開き直す。次に公開作品の例として `/viewer/index.html?model=../_data/library/26020401/model.3dss.json&return=/library/26020401/#sample` を開き、作品・戻り先・フラグメントが引き継がれることを確かめる。最後に同じ作品をpeekで表示し、通常画面と埋め込みの両方を確認する。
