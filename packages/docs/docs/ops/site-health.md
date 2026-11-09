---
title: 本番の配信点検と障害時の切り分け
---

## 公開後と不具合報告時に確認する

リポジトリのルートから、配信したコミットを指定して実行します。Nodeは `apps/site/.node-version` に合わせます。依存パッケージのインストールは不要です。

```sh
node apps/site/scripts/ops/check-deployed.mjs --expect-sha 383f587 --output site-health.json
```

`383f587` は実際に配信した7桁または40桁のコミットへ置き換えます。指定を省くと配信版は表示しますが、意図した版との一致は判定しません。応答は各15秒、本文は各4 MiB、同時要求は4件までです。すべてGETで、問い合わせは送信しません。失敗項目が一つでもあると終了コードは1になります。

GitHubのActionsでも **Public site health → Run workflow** から実行できます。通常はブランチを `main` にし、Pagesの本番配信が成功した後に実行します。結果は画面と `public-site-health` のJSONに残ります。定期実行や通知設定はこのワークフローには含めていません。

## 点検する範囲

| 対象 | 確認すること |
|---|---|
| 配信プローブ | 期待したコミットとビルド用Nodeの一致 |
| トップ・Library・代表解説 | HTTP応答、正規URL、一覧と作品リンク |
| 「知識と問い」とLibraryの代表JSON | JSONの取得と図の基本構造。スキーマ全体の妥当性や内容の正しさの検査とは別 |
| Viewer・Modeler | 公開ホスト、Reader、Modeler入口のHTMLと操作領域 |
| 選択した実行ファイル | Viewerランタイム・Ajv・調整CSSのMIME、ETag、no-cache |
| 問い合わせ | フォームと送信先の記述。実送信・受領は別に確認 |
| 廃止URL・存在しないURL | 410/noindex/no-storeと404。HTMLを200で返す代替ページを合格扱いしない |

このHTTP点検は、WebGLの描画、回転、保存、全作品・全モジュール、端末内の旧キャッシュ、開いたままのタブを評価しません。HTTPS接続に成功しても、証明書とドメインの将来の期限や更新通知まで確認したことにはなりません。

## 結果から切り分ける

1. **接続失敗・5xxが広く出る**：検査日時、配信版、失敗経路を記録し、Cloudflareの稼働状況とPagesの配信結果を確認します。ログインできない場合は公開応答の記録を残し、管理画面の変更は未実施として扱います。
2. **配信版が違う**：本番ブランチ、Pagesの本番エイリアス、配信完了時刻を確認します。Previewのログイン画面やクエリを付けた応答だけを本番復旧の証拠にしません。
3. **HTMLは正常でJSON・JS・CSSが失敗**：該当経路、MIME、Cache-Control、ETagを確認します。実行ファイルの `no-cache` が消えている場合は、[Browser Cache TTLと個別Cache Rules](/docs/ops/cache-delivery/)を確認します。
4. **HTTPは正常で操作が失敗**：端末・ブラウザ・作品URL・操作と失敗地点を記録し、Viewerの読込・保存回帰検査へ進みます。HTTPの成功を描画・保存の成功と読み替えません。
5. **修正・切り戻し後**：同じコマンドを配信版の指定付きで再実行します。保存したJSONは修正前後を分け、代表作品の読込と操作も確認します。[復元手順](https://github.com/q2t-project/3DSL/blob/main/packages/docs/repo/site-recovery.md)を使う場合は、手元の編集内容を先に保全します。

継続監視を設ける前に、実行頻度、通知先、通知を受け取れること、連続失敗の扱い、DNS・TLS期限の担当を決めます。現在の手動点検から、自動通知や常時監視の成立を推定しません。

## 一次資料

- [GitHub Actionsの手動実行](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-running-a-workflow)
- [GitHub Actionsの権限](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)
- [NodeのfetchとAbortSignal](https://nodejs.org/download/release/latest-v24.x/docs/api/globals.html)
