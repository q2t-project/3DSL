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

今回の範囲は全経路のセキュリティ監査ではない。添付SVG/HTMLの配信方式、圧縮ファイルの展開後容量・内部パス、全外部サービスへの通信、管理権限・バックアップ復元は継続項目。研究原稿の公開根拠と、追加ライブラリに残る版・許諾の未確認も別途扱う。

## 参照

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
