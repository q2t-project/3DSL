# 3DSLサイトの手動同梱物

2026-11-08。対象は `apps/site` の Pages ビルドが公開する `/vendor/`、`/preview-reconstruction/vendor/`、見本のフォントです。元配布との比較には npm のリリース情報にある SHA-512 integrity を検算したアーカイブを使いました。

| 配布元・対象 | 版と利用箇所 | 照合結果 |
| --- | --- | --- |
| three.js 通常配布 | `three@0.181.0`、`/vendor/three/`。従来Modeler等が使用。 | `packages/vendor/three` 内の1,141ファイルのうち1,140ファイルが公式npmリリースとバイト一致。残る `build/three.module.js` は同梱の `src/Three.js` を再exportする既存の418バイトの入口。MITのLICENSEも配布。fflateの公開時の差分は後述。 |
| three.js 再構築版 | `/preview-reconstruction/vendor/three/`。現行Viewerの描画に使用。 | コア、モジュール、CSS3DRenderer、LICENSEの4ファイルが公式版とバイト一致。残るOrbitControls、GLTFLoader、BufferGeometryUtilsは改行を統一すると一致。 |
| Troika | `troika-three-text@0.52.4`、`/vendor/troika-three-text/`。 | ESM・UMD・minified UMDの3本すべてが公式リリースとバイト一致。0.52.5では2本だけが一致。パッケージのMIT全文と、バンドル中に明記されたTypr.ts、woff2otf／fflate、unicode-font-resolver client 1.0.2の通知をJSの隣に配置。 |
| Noto Sans JP | Regular／BoldのTTF、内部版2.004-H2。 | 両TTFのAdobeの著作権・予約名およびOFL 1.1表示を確認。見本用WOFF2の元ファイルSHA-256とも一致する。TTFの配布先にOFL全文を追加。 |
| 見本のWOFF2 | Noto Sans JP 2本・Noto Serif JP 1本。 | 3本とも既存 `legend_lab/fonts/manifest.json` のSHA-256と一致。Serifの元TTFも同manifestの固定Google Fonts版とSHA-256が一致。見本にはSans・SerifのOFL全文が同梱されている。 |
| Ajv・ajv-formats | `ajv@8.20.0`、`ajv-formats@3.0.1`、`fast-uri@3.1.9`。 | 従来Modeler用・再構築版・独立したformats ESMについて、lockfileから生成した実バンドルを検査。各 `versions.json` に含まれる版・SHA-256を記録。通常配布・formatsにも実際の依存のライセンス全文をコピーする。再構築版のnoticeもnpmの原本と突合。 |
| i18next | `/vendor/i18next/i18next.js` | ファイル内で定義する互換API。Viewerの翻訳辞書の初期化・言語切替で使用。上流i18nextの配布版を示すバージョンは割り当てない。 |
| Chart.js | `/vendor/chart.js/README.md` | このディレクトリの配布物は案内1ファイル。 |

## three.js の追加ローダー

r181の `examples/jsm/libs/` は34ファイル、9,736,787バイト。ソースのfflate 0.8.2には、ZIP64のサイズ情報が欠けたとき `unzipSync()` が停止しなくなる既知の指摘がありました。公開時に `apps/site` のlockfileで固定した `fflate@0.8.3` のブラウザ用ESMを配置し、10個のローダー・エクスポーターが版付きファイルを参照するようにします。旧URLも同じ公開APIを再exportします。日本語を含むZIPの往復、旧版の名前付きexport、異常ZIP64の時間内の拒否を生成物で検査します。MIT全文を同じ配布先へ置きます。

`/vendor/three/examples/jsm/libs/fflate-version.json` に実バンドルのSHA-256・版・参照元を記録します。過去の固定デプロイや既存ブラウザが保存したコピーはそれぞれの時点の状態です。

## アドバイザリの照合範囲

npmレジストリのBulk Advisory APIへ名前と版を指定しました。three 0.181.0、troika-three-text 0.52.4、ajv-formats 3.0.1、unicode-font-resolver client 1.0.2には照合日時点で該当報告0件。追加ローダーで版を確認できたChevrotain 9.0.1、ecsy 0.3.1、lil-gui 0.17.0、opentype.js 1.3.4、tween.js 23.1.1、WebXR motion-controllers 1.0.0、fflate、およびdemuxerが外部URLで指定するmp4box 0.5.3を照合し、該当したのは更新前のfflateでした。更新後の同じ照合は0件でした。

Draco、Basis、Rhino等のJavaScript／WASMには個別リリース番号を確認できていないものがあります。上流r181の配布物との一致を記録し、各コーデックの脆弱性と個別の再配布条件は未確認として残します。TroikaのWOFF変換器に取り込まれているfflateの内部版も未同定です。追加ローダーを3DSLの正式な入力経路に組み込む場合やvendorを更新する場合は、その読み込み経路と第三者通知を再点検します。

## 出典

- [three 0.181.0](https://registry.npmjs.org/three/0.181.0)／[three.js r181](https://github.com/mrdoob/three.js/tree/r181)
- [troika-three-text 0.52.4](https://registry.npmjs.org/troika-three-text/0.52.4)／[当該ソース](https://github.com/protectwise/troika/tree/728a1780127df0c2509e967b03f17ddc46bbf5d2/packages/troika-three-text)
- [fflateの報告](https://github.com/advisories/GHSA-px8p-9vwx-vf98)／[修正リリース](https://github.com/101arrowz/fflate/releases/tag/v0.8.3)
- [Noto Serif JPの固定版](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notoserifjp)／[OFL 1.1](https://openfontlicense.org/open-font-license-official-text/)
