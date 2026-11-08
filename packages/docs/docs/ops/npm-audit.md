---
title: npm audit と配布依存の点検
---

## 監査する範囲

`npm audit --omit=dev` は npm の依存分類による絞り込みであり、ブラウザに届くコードの一覧ではありません。
3DSL では `devDependencies` の Ajv と ajv-formats をビルドして `/vendor/ajv/` に配布します。
さらに、公開 Viewer / Modeler の `/preview-reconstruction/vendor/ajv/` は独立した同梱物です。
逆に `dependencies` の Astro、TypeScript、言語サーバーにはビルド・開発時だけ使う部分もあります。
必ず全依存の報告と、読み込むコード・生成処理・公開経路を照合します。

## 2026-11-08 の点検

対象は `apps/site/package-lock.json` と再構築版の同梱 Ajv です。
全依存の `npm audit` で指摘されたパッケージ数は、更新前27、更新後4でした。
これは脆弱性の件数や実際に悪用できる経路の数ではありません。報告日時やデータベースの更新により変わります。

| 対象 | 更新と確認 |
| --- | --- |
| Astro | 5.17.1 → 5.18.2。5系の互換範囲内の更新。下表の指摘は残っています。 |
| Ajv | 8.17.1 → 8.20.0。通常配布と再構築版のブラウザ用バンドルを更新。 |
| fast-uri | 3.1.0 → 3.1.9。Ajv に同梱する依存も更新。 |
| 開発・ビルド依存 | 言語サーバー、YAML、Vite、Rollup、PostCSS、devalue 等をロックファイルの互換範囲内で更新。 |
| CSS セレクタ解析 | postcss-selector-parser 6.1.5 以上を指定し、typography の依存経由の指摘を解消。 |
| esbuild | 再構築版の生成には既存の 0.27.2 を固定し、Vite 7 も同版を使用。Astro 5.18 が要求する 0.27.3 系は既知の指摘があるため、この経路だけ修正版 0.28.1 を指定してビルドを検証。Vite 6 の 0.25 系は変更しません。 |

Ajv の報告 GHSA-2g4f-4pwh-qvx6 は `$data` を有効にした動的パターン検証が条件です。
現在の再構築版 Modeler の初期化では `$data` を有効にしていませんが、配布する依存自体も更新しました。
再構築版の Draft 2020-12 と format 検証を維持し、既存の実バンドルを使う検査で確かめます。

## 残る指摘と次の更新

| 報告対象 | 今回確認した構成と残作業 |
| --- | --- |
| astro — critical | AVIF の処理、SSR、server islands、動的 script/style・属性等に複数の指摘。公開サイトは静的出力で、Astro の SSR アダプター・server islands・Image/Picture・JSX/MDX は現状使用していません。Pages Function は廃止済み解説の2URLだけに固定応答を返します。`define:vars` の使用箇所は Library の固定ルートから作る pagePath です。外部からの値を許可する変更時は再判定が必要です。 |
| sharp — high | 画像変換用の依存。現状のソースに Astro の画像最適化呼び出しはありません。悪意ある画像をビルド時に処理させる経路も導入時に確認します。 |
| zod — high | 過大なコレクションの検証に関する指摘。Astro 等のツール側に残存。ブラウザの3DSS検証は Ajv を使用します。 |
| zod-to-ts — high | 上記 zod を参照するツール側の依存。Astro の更新と合わせて解消する対象です。 |

この4パッケージは未解消です。静的配信だけを理由に全体を安全とは判定しません。
次の作業は、Astro 7 の修正版へ上げる独立ブランチで、Node の要件・コンテンツコレクション・生成ルートを検証することです。
残る指摘の一括除去には大きな版変更を含むため、互換更新と分けて差分を確認します。

今回の npm 監査には、`packages/vendor/three`、Chart.js、フォント等の手動同梱物は含まれません。
それらの独立した版・利用箇所・ライセンス・アドバイザリの照合は別の残作業です。

## 再現と更新手順

リポジトリのルートでは npm install を実行せず、次を使います。

```bash
npm ci --prefix apps/site
npm --prefix apps/site run audit:report
npm --prefix apps/site run check:reconstruction-ajv
npm --prefix apps/site run ci:build
```

`audit:report` は全依存を検査し `apps/site/ci-logs/npm-audit.json` に結果を保存します。
既知の指摘がある場合は警告します。これは監査結果を残す工程であり、セキュリティ合格判定ではありません。
通信エラーや不正な応答を「指摘0件」と扱わず、工程を失敗させます。
GitHub CI はこの報告と再構築版バンドルの一致検査を行い、ビルドログと同じ成果物に報告を保存します。
CI のリポジトリ権限は contents の読み取りだけとし、checkout に認証情報を残しません。

Ajv または同梱する依存を更新した時は、次を実行します。

```bash
npm --prefix apps/site run build:reconstruction-ajv
npm --prefix apps/site run check:reconstruction-ajv
npm --prefix apps/site run ci:build
```

再構築版の `vendor/ajv/versions.json` に実際にバンドルへ含めた版と SHA-256 を記録します。
`dist/ajv.js` と `versions.json` を同時にコミットし、既存のライセンスファイルも保持します。
公開前には CI のブラウザ検査と Preview の主要ページ・保存・再読込を確認します。
問題が出た場合は、依存定義・lockfile・同梱バンドル・版記録を一緒に直前の検証済みコミットへ戻します。

## 一次資料

- [npm audit の仕様](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [Ajv の $data に関する報告](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
- [Astro の AVIF 最適化に関する報告](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2)
- [Astro の JSX / MDX に関する報告](https://github.com/withastro/astro/security/advisories/GHSA-98hj-9722-w3j8)
- [esbuild の Windows 開発サーバーに関する報告](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)
- [CSS セレクタ解析に関する報告](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)

## 版番号のない vendor URL のキャッシュ（2026-11-08）

本番の `/vendor/ajv/dist/ajv.bundle.js` は旧バンドルを返し、新固定デプロイとクエリ付きURLは更新版を返すことを確認しました。
従来の `/vendor/*` に付いていた `max-age=31536000, immutable` を、版番号のないファイルには再検証する設定へ変更します。
すでに保存された旧キャッシュに新しいヘッダーが遡って作用するとは扱いません。

従来 Modeler の生成HTMLは、バンドルのSHA-256を付けた shim URL を先に読み、ハッシュをファイル名に含む新しいバンドルを取得します。
その後で従来の起動モジュールを実行します。キャッシュされたコントローラーにも、format を登録する既存factoryを渡します。
旧バンドルのURLは互換用として残し、通常の起動経路では新しいURLを使用します。
配信ヘッダーの正本は `apps/site/config/pages-headers.txt`、`public/_headers` はビルド時の生成物です。

## 手動同梱ライブラリの点検（2026-11-08）

three.js両配布、Troika、Notoフォント、Ajv関連の版と配布物を照合しました。追加ローダーのfflateは0.8.3に更新し、版付きURLと既存の公開APIを検査します。Ajv系の通常配布・formats用ESM、TTF、Troikaにライセンス全文を同梱します。各コンポーネントの範囲と個別版を未確認のコーデックは、[同梱物の点検記録](https://github.com/q2t-project/3DSL/blob/main/packages/docs/repo/site-vendor-inventory.md)に記載しています。
