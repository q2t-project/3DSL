# 再構築 r0.5 Preview の公開準備

更新: 2026-10-10。独立 Preview の配布・本人確認は完了。サイトから入口を追加する公開候補を準備。本番既定画面への置換は含めない。

## 配信先と変更範囲

- ブランチ: `preview/reconstruction-r05-20261010`
- 入口: https://preview-reconstruction-r05-2.3dsl.pages.dev/preview-reconstruction/
- 本番基準コミット: `3d4edddfa07a974a88a20820c5947a868597c062`
- 配布元: `apps/reconstruction/ssot/`。HTML/JS/CSS の既知のルートだけをビルド時に書き換える。
- JSON の作品・原文・スキーマ内容を変換しない。ユーザーが開くファイルも変更しない。
- 既存 `/viewer/`、`/modeler_app/`、`/app/viewer`、`/app/modeler`、Library の作品導線は維持する。
- 今回追加するサイト導線: トップの入口カード、共通メニュー、フッターの「作品を開く」から `/preview-reconstruction/` へ。

## 今回の修正

1. Git の `**/dist/` 除外に掛かっていた `vendor/ajv/dist/ajv.js` を明示収録。
   受入済み r0.5 の同一ファイル（Git blob `0f014c015543070f306f61fbc4b0b6878e39f648`）を使用する。
2. 従来 Viewer の importmap を収録済み AJV モジュールに合わせる。
3. `viewer_tuning.css` も Preview 配下へ参照を寄せる。
4. ローカル Python サーバーの保存口を必要とする Modeler 自動検査は、公開版で案内ページを出す。
   ローカル配布元の検査は保持。公開版の通常のファイル保存はブラウザの保存機能を使用する。
5. `/preview-reconstruction/` からも入口を開けるよう `index.html` を生成する。
6. ビルド時に HTML・importmap・JS literal imports の参照先を検査する。
7. サイト入口追加に伴い、狭い画面でもフッターの先頭リンクへ移動できるよう横スクロールの整列を調整。
   空き幅がある場合の右寄せは先頭リンクの自動マージンで保持する。
8. 実装状況レポートから本書へのリンクを、公開Docsの実際の経路に合わせる。

## 検証と受入の範囲

Modeler r0.3 の通常制作と Viewer r0.4.2 の機能・操作性は本人受入済み。
r0.5 の受渡しは既存の代替 Window/DOM 検査69件 PASS を継承する。
これらを実 GPU・ポップアップ・公開環境の保存操作の合格へ読み替えない。

今回の配布検査は、Git に含まれるファイルだけを展開したクリーンなソースに対して行う。
依存パッケージは同一 `package-lock.json` のインストール済みセットを使用する。

2026-10-10 の結果:

| 検査 | 結果 | 範囲 |
|---|---|---|
| Git の収録済みソースからのビルド | PASS、61ページ | ローカルの未追跡AJVに依存しない |
| 配布参照検査 | PASS、9 HTML・126 JS・320参照 | HTML、importmap、modelクエリ、JS literal imports |
| 生成物のローカルHTTP | PASS、181件 | 200、ファイル内容一致、HTML/JS/JSON/CSSのMIME |
| 欠落・逸脱の検出 | 想定どおりFAIL | AJV、vendor依存、model先、dynamic import、prefix外参照、ローカル診断の再混入 |
| コメント中のimport例 | 誤検知なし | 実importとして数えない |
| 公開URLの実画面・新タブ・別名保存と開き直し | 本人確認 PASS、3/3 | `d69ab11` / `b7d06ff5`、2026-10-10の本人報告と添付画面 |

再現コマンド:

```sh
npm --prefix apps/site run build
npm --prefix apps/site run check:reconstruction-preview
```

Cloudflare のビルド成功と、公開ページの実画面確認は別の証拠として記録する。
この実行環境から pages.dev への直接通信・ブラウザ確認は未完了だが、上記公開環境の確認は本人が実施した。

## 公開環境の本人確認（完了）

既受入のドラッグ・Undo・1,000点/2,000線検査などの全面再実行は求めない。

1. PASS: 公開入口から「知識と問い」を Modeler で開き、初期描画を確認。
2. PASS: 「Viewerで読む」で新タブが開き、現在の作品の写しを読めることを確認。
3. PASS: 公開URLで別名保存し、そのファイルを開き直す操作を確認。

本人報告: 「１から３まで全て問題なし」。対象は https://b7d06ff5.3dsl.pages.dev/preview-reconstruction/ 。
後続のサイト入口追加ではアプリ・作品・スキーマ・配信パスを変更しないため、この受入を継承する。

## 公開する導線の差分

| 入口 | 公開後の動作 |
|---|---|
| トップの「作品を開く — 制作・閲覧」 | `/preview-reconstruction/` を開く |
| 共通メニューとフッターの「作品を開く」 | 同じ入口を開く |
| 新入口の Modeler / Viewer / サンプル | 本人確認済みのアプリを開く |
| 既存の Viewer、Library の作品、共有・埋め込みURL | 従来の経路とパラメータを保持 |

画面の変更元は `apps/site/src/pages/index.astro`、`apps/site/src/layouts/Layout.astro`、`apps/site/src/styles/global.css`。
`/preview-reconstruction/` をそのまま本番でも使い、既確認の参照先を変えない。
URL名の整理や既存Viewerの一括置換は、この公開差分に含めない。
既存 `/app/viewer` は model/from/return/title 等のホスト契約を持つため、独立Viewerへ単純転送しない。

作品一式 `.3dsl-work.json` は新入口の対応済み Modeler / Viewer で使用する。
図だけの3DSSは対応スキーマの範囲で読み込む。新しい作品一式を旧Viewerへ渡せるとは扱わない。

### 入口追加候補の点検（2026-10-10）

- リモートの受入対象 `d69ab11b0a2c5df2aaceed412fc21133238c8ba9` と、Git管理ファイル3,289件を照合。
  今回送信する差分は上記サイト側3ファイルと、この公開準備・実装状況の文書2ファイルのみ。
- `apps/reconstruction/` の配布元180ファイルは受入対象とGit blob一致。
  既存Viewer・Modeler・Libraryの作品導線、作品データ、スキーマの変更なし。
- ローカルビルドは61ページで成功。配布参照検査は9 HTML・126 JS・320参照で成功。
- 生成HTMLのトップ3か所、Libraryの共通入口2か所、本書への文書リンク、既存・追加の8経路を確認。
  これを実ブラウザの画面幅・表示操作の測定とは扱わない。
- 新しいHEADのCloudflare Pages・GitHub site-ci結果はPR #61で確認する。旧HEADの成功を新HEADへ流用しない。

## 本番反映と戻し方

1. PR #61 の対象HEADで Cloudflare Pages / GitHub site-ci が成功していること、main が上記本番基準のままであることを確認する。
2. 本番公開の承認後、PR #61 を main へマージし、Production ビルドの成功と公開コミットを記録する。
3. 本番トップの追加入口と、Modeler / Viewer の配布ファイルを確認する。既受入の通常操作を全面再検査しない。
4. 問題があれば Cloudflare Pages の直前の成功した Production へロールバックする。
   既存画面の記録では `265f2491.3dsl.pages.dev` / `3d4edddfa07a974a88a20820c5947a868597c062` が戻し先。実行直前に再確認する。
5. main にも公開PRの revert を作り、次の自動デプロイで意図せず新入口が戻らないようコードと配信を揃える。

本番公開の承認は未取得。Production へ自動マージしない。
今回、DNS・有料プラン・Cloudflare設定の変更は含めない。
