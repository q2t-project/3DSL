---
title: 公開入力とメッセージの点検
---

## 2026-11-08 の変更

| 入口 | 変更前の不足 | 現在の制限 |
| --- | --- | --- |
| Libraryの作品解説 | Markdownのリンク属性で引用符が未エスケープ。javascriptの拒否が大文字小文字を区別 | 属性中の引用符・HTML特殊文字をエスケープし、URLを解析してHTTP/Sと相対リンクだけを採用。著者・参考・権利のリンクにも同じ判定 |
| 公開ViewerのURL読込 | 全文を取得してから32 MiBを判定 | Content-Lengthの早期拒否に加え、応答ストリームの受信バイト数を数え、32 MiB超で中止。ヘッダーの欠落や過小申告でも制限 |
| debugPoseの診断返信 | 親のオリジンを確かめず、要求元へ返信 | 同一オリジンの親フレームからだけ受付。比較画面も要求先と返信元のフレーム・オリジンを照合。送信先オリジンを固定 |

作品解説は運営者がGitで管理する原稿であり、一般投稿の受付ではない。上記のリンク処理は、将来を含む不適切な原稿の混入に備えるもの。現在の公開作品に攻撃原稿があった、という報告ではない。

## 維持した動作

公開ViewerはHTTP/SのURLと既存の共有パラメーターを受け付ける。外部URLにはCORSの許可が必要で、Cookie等の認証情報は同一オリジンにだけ送る。参照元を送らず、表示する出典URLからクエリとフラグメントを外す。戻り先は同一オリジンに限定する。
容量超過・通信失敗では既存作品を置き換えず、取消後に別のURLを読める。ローカルファイルの容量検査とスキーマ検証、Modelerの保存・Undo/Redoの責務は維持する。

## 検査と限界

本番の実取得では、旧Modelerと旧Peekの未版付JavaScriptに過去のキャッシュが残ることを確認した。公開Viewerの旧HTML入口は現在の読み手へ転送する。ModelerのHTML入口にはno-storeを付け、起動モジュールを内容のSHA-256を含むファイル名で配信する。新しく開く画面が、古い起動モジュールを再利用しないことを実配信で照合する。既に開いている旧タブや、以前保存したファイルの内容まで書き換えるものではない。

`npm run check:public-input` は、実際のMarkdown関数・配布元のメッセージリスナー・URL読込処理を動かす。大小混在・制御文字・属性引用符、不正プロトコル、異なるオリジン・別フレーム、32 MiBの境界・ヘッダーなし・過小申告、UTF-8の分割とBOM、取消・失敗・再読込を検査する。VMと標準Response/ReadableStreamを用いた検査で、外部に要求しない。WebGLやAndroid実機の検査とは区別する。
既存の `check:local-file-size` とサイト全体のビルド・ブラウザ回帰検査も続ける。

## Libraryの添付・素材とアーカイブ

外付け添付は `/_data/library/<id>/attachments/` からバイナリのダウンロードとして配信する。HTMLやSVGを直接指定した場合にも同じ扱いになる。`assets/` の画像やGLBには本来のMIME型を使い、素材を文書として開くときのスクリプト・外部読込みをCSPで制限する。作品内に置くファイル・ディレクトリのリンクはビルド時に拒否する。隔離した旧ビルドで作品外のテストファイルへのリンクが配布物に残る事象を再現した。

2026年11月8日の6作品で、外付け添付は `26020401` の `README.txt` 1件。素材は640×360のPNG 1枚と左右の手のGLB 2本。GLBはそれぞれ4,944バイトの内部バッファを使い、外部バッファや画像の参照はなかった。サンプルの本文は実在する画像を表示する。JSONの作品一式に内包する資料は別経路で、相対パスの検査後にUTF-8の文字列として保持する。

LibraryはZIPをそのままコピーする。作品を開くViewer・ModelerにもZIPの自動展開経路はない。隔離試験では、32 MiBを超える展開内容と `../` を含むZIPをコピーし、出力のバイト一致と展開ファイル0件を検査する。作品一式の絶対パス、親ディレクトリ、空の区間、ドライブ名・制御文字は既存のパス検査で拒否する。`check:local-file-size` はJSONの名前を付けたバイナリZIPで、Viewerと再構築Modelerのファイル選択から現在の作品が置き換わらないことも確かめる。Modelerの未適用編集の確認はファイル本文の解析より先に行われる。

配布物にはthree.jsのフォント見本 `MPLUSRounded1c-Regular.typeface.json.zip` が1件あった。4,522,713バイトのZIPを点検用に上限32 MiBで読み、内部の相対パス2件と実データ合計13,817,976バイトを確認した。各メンバーはディスクへ展開していない。同梱の追加ローダーはそれぞれの形式を扱う。ZIP取込機能を追加する際は、その入口で実際の展開量・件数・書込み先を制限する。

公開検査は生成された画像・添付リンクの実体を検査する。隔離したChromiumでは、同じHTML・SVGを制限なし／生成した配信ヘッダー付きで読み、スクリプトの実行・副資源の要求・SVG画像表示を照合する。任意の画像・3Dデータの復号後メモリ、外部サービス全体の通信、原稿の配布根拠は別の点検範囲として残る。

## Viewerの画像・3D素材の計測

同じ3点・2線の作品に、格子形状とPNGをまとめたGLBを1件付ける。小型は512三角形と256角、大型は131,072三角形と2,048角。同じ生成器をローカル試験と端末検査ページで使う。検査素材は通常の作品一覧に含めず、端末検査を始めたときに読み込む。作品切替時に共有ジオメトリ・テクスチャ・復号された画像を解放する。切替後に旧作品の画像が届く場合も検査する。

`apps/site` でビルド後に `node scripts/check/viewer-assets.mjs` を実行する。新しいChromiumプロセス、390 × 844、DPR 1、ソフトウェアWebGL、ローカルHTTP・圧縮なしで各3回計測する。公開入口のナビゲーションから実際のタッチ回転が反映されるまでの時間、素材の描画、全体の転送バイト数、GC後のJSヒープと外部バッファ、取得可能なLinuxレンダラープロセスのメモリを記録する。RGBA換算は幅×高さ×4の計算値。Android実機のピークや最大受入寸法は、この計測だけでは決まらない。

## Android実機での連続読込

AndroidのChromeで[Viewerの連続読込検査](/diagnostics/viewer-load/)を開き「計測を始める」を押す。小型、大型3回、小型を同じViewerで順に開く。4回目に画面の案内が出たら、図を指で横になぞる。「結果をコピー」で環境、各回の素材描画時間、操作結果を取り出せる。計測結果は端末内に保存される。再読込みや背面への移動で中断した場合はその段階を表示する。

**USBでプロセスメモリも測る場合**は、PCにAndroid SDK Platform-ToolsとNode.js（本リポジトリの指定版）を用意する。端末のUSBデバッグを有効にし、端末に出た確認で計測用PCを許可する。Chromeで検査ページを1タブ開いた状態で、`apps/site` から次を実行する。

```powershell
adb devices
node scripts/check/android-viewer-memory.mjs
```

スクリプトはその検査タブを開き直し、5回の読込みとタッチ入力を自動実行する。PC上の `android-viewer-*.json` に、各標本の開始・終了時刻、段階、端末とChromeの版を記録する。複数台の中から選ぶときは `--serial`、保存先を指定するときは `--out` を使う。

PSSはAndroidの `dumpsys meminfo PID` で取得し、全Chromeレンダラーの合計と、Chromeが列挙した全プロセスの合計をそれぞれKiBで記録する。他のChromeタブの使用分も含む。対象PIDが変わった標本や値を取得できなかった標本は、該当する合計から除く。各段階で完全な標本を取得できないときは途中結果を保存する。観測最大値は採取できた標本の最大で、GPUの専用メモリや標本間の瞬間最大値は未測定。

- [AndroidのPSSとdumpsys meminfo](https://developer.android.com/tools/dumpsys#meminfo)
- [Android端末とPCの接続](https://developer.chrome.com/docs/devtools/remote-debugging/)

## 参照

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [Cloudflare Pagesの配信ヘッダー](https://developers.cloudflare.com/pages/configuration/headers/)
- [Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition)
