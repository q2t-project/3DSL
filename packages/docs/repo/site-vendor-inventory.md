# 3DSLサイトの手動同梱物

2026-11-08。対象は `apps/site` の Pages ビルドが公開する `/vendor/`、`/preview-reconstruction/vendor/`、見本のフォントです。元配布との比較には npm のリリース情報にある SHA-512 integrity を検算したアーカイブと、上流の固定タグ・コミットのファイルを使いました。Gitで取得した許諾文・配布物は上流のblob SHAとも照合しました。

| 配布元・対象 | 版と利用箇所 | 照合結果 |
| --- | --- | --- |
| three.js 通常配布 | `three@0.181.0`、`/vendor/three/`。従来Modeler等が使用。 | `packages/vendor/three` に当初含まれた1,141ファイルのうち1,140ファイルが公式npmリリースとバイト一致。残る `build/three.module.js` は同梱の `src/Three.js` を再exportする既存の418バイトの入口。MITのLICENSEも配布。fflateの公開時の差分は後述。 |
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

## 追加コーデックの追跡と許諾文（同日追記）

| 配布物 | 確認できた版・一致 | 公開する通知 |
| --- | --- | --- |
| Dracoデコーダー | 1.5.6。通常版・glTF版のWASMとラッパー4本は対応するnpmリリースにバイト一致。asm.js版2本もthree.jsの1.5.6更新コミットとバイト一致。既存エンコーダー2本の個別版は未特定。 | 上流1.5.6のLICENSE全文と著作権表示。 |
| Basis Universal | v1_50_0。JS・WASMの2本が上流タグとバイト一致。Git blob SHAも一致。 | 上流のLICENSE全文とLICENSES内の4ファイル。 |
| rhino3dm | 8.4.0。通常JS・ESM・WASMの3本が同版npmリリースとバイト一致。 | 同版のMIT全文、同版が固定したOpenNURBSとDracoのLICENSE全文。OpenNURBSの文書に付属zlibの表示も含まれる。 |

配布先の `/vendor/three/examples/jsm/libs/THIRD_PARTY_NOTICES.md` から各許諾文と上流の版を辿れます。既存の配布物検査は、これら10件の通知ファイルと原本のバイト一致を検査します。Draco 1.5.6のnpmパッケージ2種とrhino3dm 8.4.0は、今回のnpm Bulk Advisory API照合で該当報告0件でした。

通常のViewer・Modelerの原本から、DRACOLoader、KTX2Loader、Rhino3dmLoader、BasisTextureLoaderを起動する参照は見つかりませんでした。これらを正式な入力経路に追加する場合には、対象形式の実ファイル、コーデックの版、ネイティブコードの脆弱性を改めて検査します。

TroikaのWOFF変換器内のfflateの版は未同定です。変換器はWOFFの圧縮されたフォントテーブルを展開するコードで、公開する関数は `convert_streams`。Troikaの解析入口は `wOFF` の署名で変換器を呼び、`wOF2` は拒否します。今回更新したfflateのZIP64パーサーはこの変換器に含まれません。現行の通常ラベル設定は同梱のTTFを指定しています。

Dracoのエンコーダー2本、および上表以外の追加部品には版や条件を個別に未確認のものが残ります。npm照合の範囲に入らないネイティブコードの脆弱性点検も継続します。

## 出典

- [配布先の第三者通知原本](../../vendor/three/examples/jsm/libs/THIRD_PARTY_NOTICES.md)
- [Draco 1.5.6更新](https://github.com/mrdoob/three.js/commit/a79f0788dced39e925d001a9566931f03d984951)／[Basis v1_50_0](https://github.com/BinomialLLC/basis_universal/tree/v1_50_0)／[rhino3dm 8.4.0](https://registry.npmjs.org/rhino3dm/8.4.0)
- [OpenNURBSの開発元の説明](https://developer.rhino3d.com/guides/opennurbs/what-is-opennurbs/)

- [three 0.181.0](https://registry.npmjs.org/three/0.181.0)／[three.js r181](https://github.com/mrdoob/three.js/tree/r181)
- [troika-three-text 0.52.4](https://registry.npmjs.org/troika-three-text/0.52.4)／[当該ソース](https://github.com/protectwise/troika/tree/728a1780127df0c2509e967b03f17ddc46bbf5d2/packages/troika-three-text)
- [fflateの報告](https://github.com/advisories/GHSA-px8p-9vwx-vf98)／[修正リリース](https://github.com/101arrowz/fflate/releases/tag/v0.8.3)
- [Noto Serif JPの固定版](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notoserifjp)／[OFL 1.1](https://openfontlicense.org/open-font-license-official-text/)
