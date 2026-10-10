# 再構築 r0.5 Preview の公開準備

更新: 2026-10-10。対象は独立 Preview の配布確認。本番既定画面への置換は含めない。

## 配信先と変更範囲

- ブランチ: `preview/reconstruction-r05-20261010`
- 入口: https://preview-reconstruction-r05-2.3dsl.pages.dev/preview-reconstruction/
- 本番基準コミット: `3d4edddfa07a974a88a20820c5947a868597c062`
- 配布元: `apps/reconstruction/ssot/`。HTML/JS/CSS の既知のルートだけをビルド時に書き換える。
- JSON の作品・原文・スキーマ内容を変換しない。ユーザーが開くファイルも変更しない。
- 既存 `/viewer/`、`/modeler_app/`、Astro の既定導線は維持する。

## 今回の修正

1. Git の `**/dist/` 除外に掛かっていた `vendor/ajv/dist/ajv.js` を明示収録。
   受入済み r0.5 の同一ファイル（Git blob `0f014c015543070f306f61fbc4b0b6878e39f648`）を使用する。
2. 従来 Viewer の importmap を収録済み AJV モジュールに合わせる。
3. `viewer_tuning.css` も Preview 配下へ参照を寄せる。
4. ローカル Python サーバーの保存口を必要とする Modeler 自動検査は、公開版で案内ページを出す。
   ローカル配布元の検査は保持。公開版の通常のファイル保存はブラウザの保存機能を使用する。
5. `/preview-reconstruction/` からも入口を開けるよう `index.html` を生成する。
6. ビルド時に HTML・importmap・JS literal imports の参照先を検査する。

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
| 公開URLの実画面・新タブ・OS保存 | 未確認 | 下記三点の実ブラウザ確認が残る |

再現コマンド:

```sh
npm --prefix apps/site run build
npm --prefix apps/site run check:reconstruction-preview
```

Cloudflare のビルド成功と、公開ページの実画面確認は別の証拠として記録する。
この実行環境から pages.dev への直接通信・ブラウザ確認は未完了。

## 残る公開環境の確認

既受入のドラッグ・Undo・1,000点/2,000線検査などの全面再実行は求めない。

1. 公開入口から「知識と問い」を Modeler で開き、初期描画とラベルを確認。
2. 「Viewerで読む」で新タブが開き、現在の作品の写しを読めることを確認。
3. 公開URLで別名保存し、そのファイルを開き直す操作を一度確認。

この三点の確認後、本番サイトのどの入口を新 Modeler/Viewer に向けるかを具体的な差分で決める。
この Preview ブランチを単に main へマージしても、既定の入口は新画面には切り替わらない。

## 本番反映と戻し方

本番反映前に既定経路・既存深いリンク・保存形式の互換範囲を固定し、対象コミットと確認結果を揃える。
Production へ自動マージしない。既存本番基準は上記コミット。
Preview の修正を戻す場合は対象修正の revert コミットを作り、同じ Preview ブランチで確認する。
Production を更新した場合は Cloudflare の直前の成功した Production デプロイを戻し先として記録する。
