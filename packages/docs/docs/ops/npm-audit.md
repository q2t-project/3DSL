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

対象は `apps/site/package-lock.json` と、ビルドして配布する Ajv です。全 npm 依存の `npm audit` が指摘したパッケージ数は、互換更新で27から4へ、Astro 7への移行後に4から0へ減りました。この数は照合日のアドバイザリに基づきます。

| 対象 | 互換更新後 | 移行後 |
| --- | --- | --- |
| Astro | 5.18.2 | 7.4.7 |
| sharp | 0.34.5 | 0.35.5 |
| zod | 3.25.76 | 4.6.7 |
| zod-to-ts | Astro 5の依存 | lockfileから解消 |
| ブラウザの3DSS検証 | Ajv 8.20.0／fast-uri 3.1.9 | 同じ版と同じ同梱バンドルを使用 |

CIは `apps/site/.node-version` の24.22.2を読み、`apps/site` のlockfileからインストールします。PagesではPreview・Productionのビルド用環境変数 `NODE_VERSION` に同じ値を設定し、次のビルドで実際のNode.js版を確認します。2026-11-08の診断用Previewでは、版指定ファイルを置いても22.12.0で起動しました。
Docs・FAQ・PolicyはMarkdownをContent Layerのローダーで読み込み、従来の公開URLを維持します。仕様やコマンド中の引用符・ハイフンは原文どおりに表示します。

## 残る指摘と次の更新

Astro、画像処理、検証ツールを変更したら、全npm依存の監査と静的ビルドを再実行します。Docs・FAQ・PolicyのURL、作品6件のデータ、サイトマップ、広告の除外、Viewer・Modelerの入口をPreviewと本番で確認します。
`packages/vendor` からコピーするライブラリ、フォント、再構築版に同梱するファイルは、配布するバイト列・版・ライセンスを別に確認します。

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

## 追加コーデックの通知（2026-11-08）

Dracoのデコーダー、Basis Universal、rhino3dmの配布元を追跡し、許諾文を追加しました。[配布物の第三者通知](/vendor/three/examples/jsm/libs/THIRD_PARTY_NOTICES.md)から各原文へ進めます。照合した版・バイト一致・未確認の範囲は[同梱物の点検記録](https://github.com/q2t-project/3DSL/blob/main/packages/docs/repo/site-vendor-inventory.md)に記録しています。

## 追加エンコーダーと付属部品の通知（2026-11-09）

Dracoエンコーダー2本の上流を追跡し、対応するLICENSEを追加しました。通常版は1.3.5と一致し、glTF用ファイルは1.3.0・1.3.1の両タグと一致します。Chevrotain・ecsy・lil-gui・opentype.js・Tween.js・WebXR motion-controllersについても許諾文を同梱しました。[照合記録](/vendor/three/examples/jsm/libs/provenance.json)に8本の配布ファイルと許諾文10本のハッシュ・出所を記録し、生成後の検査で照合します。補助コードの小版や、その他の追加部品・ネイティブコードの脆弱性には未確認が残っています。
