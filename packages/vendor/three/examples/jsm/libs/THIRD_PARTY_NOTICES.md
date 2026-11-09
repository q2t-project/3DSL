# 追加ローダーの第三者通知

2026-11-09更新。three.js r181とともに配布する以下の部品について、配布元と許諾文を記録します。

| 部品 | 照合した配布元 | 同梱する許諾文 |
| --- | --- | --- |
| Dracoのデコーダー | `draco3d@1.5.6` と `draco3dgltf@1.5.6`。各WASMとNode用ラッパーは上流のnpmアーカイブとバイト一致。各asm.jsデコーダーはthree.jsの更新履歴が1.5.6を指定。 | [DracoのLICENSE](draco/LICENSE) |
| Dracoのエンコーダー | `draco/draco_encoder.js` はDraco 1.3.5、`draco/gltf/draco_encoder.js` は1.3.0・1.3.1両タグの `javascript/draco_encoder.js` とGit blobが一致。後者の取得元リリースは一意に決まりません。 | [エンコーダーのLICENSE](draco/encoder-LICENSE)。3タグの原文が同一。Copyright 2016 The Draco Authors。 |
| Basis Universal | `v1_50_0`。JSとWASMの2本が上流の `webgl/transcoder/build/` とバイト一致。 | [LICENSE](basis/LICENSE)、[Apache-2.0](basis/LICENSES/Apache-2.0.txt)、[BSD-3-clause](basis/LICENSES/BSD-3-clause.txt)、[MIT](basis/LICENSES/MIT.txt)、[Zlib](basis/LICENSES/Zlib.txt) |
| rhino3dm | `rhino3dm@8.4.0`。通常JS、ESM、WASMの3本が上流npmアーカイブとバイト一致。 | [rhino3dmのLICENSE](rhino3dm/LICENSE)、[OpenNURBSのLICENSE](rhino3dm/OpenNURBS-LICENSE)、[組み込まれるDracoのLICENSE](rhino3dm/Draco-LICENSE) |

Dracoは Copyright 2016 The Draco Authors。Basis Universalは Copyright (C) 2019-2024 Binomial LLC. All Rights Reserved。rhino3dmは Copyright (c) 2023 Robert McNeel & Associates。OpenNURBSと付属zlibの著作権表示は同梱のOpenNURBS-LICENSEに含まれます。

## 付属する解析・UIライブラリ

次の6本と上記エンコーダー2本は、`three@0.181.0` のnpmアーカイブとバイト一致します。lil-guiとTween.jsは、それぞれのnpmリリース内の配布ファイルともバイト一致します。他4本の版は配布ファイル内の版表示を照合しました。許諾文は各版のnpmアーカイブから原文のまま同梱しています。

| 部品・版表示 | 許諾文 |
| --- | --- |
| Chevrotain 9.0.1 | [Apache-2.0全文](LICENSES/chevrotain-LICENSE.txt)。補助パッケージの `@chevrotain/types@9.0.1` と `@chevrotain/utils@9.0.0` のLICENSEも同一の本文。組み込まれる [regexp-to-ast 0.5.0](LICENSES/regexp-to-ast-LICENSE) のMIT全文も収録。 |
| ecsy 0.3.1 | [MIT全文・Mozillaの著作権表示](LICENSES/ecsy-LICENSE) |
| lil-gui 0.17.0 | [MIT全文・George Michael Browerの著作権表示](LICENSES/lil-gui-LICENSE.md) |
| opentype.js 1.3.4 | [MIT全文](LICENSES/opentype.js-LICENSE)、内包する [tiny-inflate](LICENSES/tiny-inflate-LICENSE) と [string.prototype.codepointat](LICENSES/string.prototype.codepointat-LICENSE-MIT.txt) のMIT全文・著作権表示。補助部品の本文はそれぞれ1.0.3・0.2.0のnpm配布から取得。 |
| Tween.js 23.1.1 | [MIT全文・Tween.js authorsの著作権表示](LICENSES/tweenjs-tween.js-LICENSE) |
| WebXR motion-controllers 1.0.0 | [MIT全文・Amazonの著作権表示](LICENSES/webxr-input-profiles-motion-controllers-LICENSE.md) |

[照合記録](provenance.json)には、配布ファイルと許諾文のSHA-256、npmアーカイブのSHA-512、固定Gitコミット、照合したファイル名を記載しています。Chevrotain・opentype.jsの補助コードの小版の特定と、上記以外の追加部品の条件・版は継続点検の対象です。

## 出典

- [three.jsのDraco 1.5.6更新](https://github.com/mrdoob/three.js/commit/a79f0788dced39e925d001a9566931f03d984951)／[Draco 1.5.6](https://github.com/google/draco/tree/1.5.6)
- [Draco 1.3.5](https://github.com/google/draco/tree/8833cf878e6fd43c5a3fd6e4231212e25e25e632)／[1.3.0](https://github.com/google/draco/tree/02272a65c72673432a67815d7ba499e6954066ef)／[1.3.1](https://github.com/google/draco/tree/56c2e6b46c65c97bbc82b19b3a22aece4a8dbb23)
- [Basis Universal v1_50_0](https://github.com/BinomialLLC/basis_universal/tree/v1_50_0)／[three.jsの更新](https://github.com/mrdoob/three.js/pull/29418)
- [rhino3dm 8.4.0](https://github.com/mcneel/rhino3dm/tree/8.4.0)／[npm配布](https://registry.npmjs.org/rhino3dm/8.4.0)
- [rhino3dmが指定するOpenNURBS](https://github.com/mcneel/opennurbs/tree/19df20038249fc40771dbd80201253a76100842c)／[Draco](https://github.com/mcneel/draco/tree/9036ecd96bfe9746046117607bc17366894ec8e1)
- [OpenNURBSの利用条件に関する開発元の説明](https://developer.rhino3d.com/guides/opennurbs/what-is-opennurbs/)
