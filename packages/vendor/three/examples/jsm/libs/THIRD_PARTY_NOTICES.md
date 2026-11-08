# 追加ローダーの第三者通知

2026-11-08。three.js r181とともに配布する以下の部品について、配布元と許諾文を記録します。

| 部品 | 照合した配布元 | 同梱する許諾文 |
| --- | --- | --- |
| Dracoのデコーダー | `draco3d@1.5.6` と `draco3dgltf@1.5.6`。各WASMとNode用ラッパーは上流のnpmアーカイブとバイト一致。各asm.jsデコーダーはthree.jsの更新履歴が1.5.6を指定。 | [DracoのLICENSE](draco/LICENSE) |
| Basis Universal | `v1_50_0`。JSとWASMの2本が上流の `webgl/transcoder/build/` とバイト一致。 | [LICENSE](basis/LICENSE)、[Apache-2.0](basis/LICENSES/Apache-2.0.txt)、[BSD-3-clause](basis/LICENSES/BSD-3-clause.txt)、[MIT](basis/LICENSES/MIT.txt)、[Zlib](basis/LICENSES/Zlib.txt) |
| rhino3dm | `rhino3dm@8.4.0`。通常JS、ESM、WASMの3本が上流npmアーカイブとバイト一致。 | [rhino3dmのLICENSE](rhino3dm/LICENSE)、[OpenNURBSのLICENSE](rhino3dm/OpenNURBS-LICENSE)、[組み込まれるDracoのLICENSE](rhino3dm/Draco-LICENSE) |

Dracoは Copyright 2016 The Draco Authors。Basis Universalは Copyright (C) 2019-2024 Binomial LLC. All Rights Reserved。rhino3dmは Copyright (c) 2023 Robert McNeel & Associates。OpenNURBSと付属zlibの著作権表示は同梱のOpenNURBS-LICENSEに含まれます。

Dracoの既存エンコーダー2本の個別リリース番号と、上記以外の追加部品の条件・版は引き続き点検対象です。npmのアーカイブは配布メタデータのSHA-512を検算しました。上流のGitファイルは固定コミット・タグのGit blob SHAで照合しました。

## 出典

- [three.jsのDraco 1.5.6更新](https://github.com/mrdoob/three.js/commit/a79f0788dced39e925d001a9566931f03d984951)／[Draco 1.5.6](https://github.com/google/draco/tree/1.5.6)
- [Basis Universal v1_50_0](https://github.com/BinomialLLC/basis_universal/tree/v1_50_0)／[three.jsの更新](https://github.com/mrdoob/three.js/pull/29418)
- [rhino3dm 8.4.0](https://github.com/mcneel/rhino3dm/tree/8.4.0)／[npm配布](https://registry.npmjs.org/rhino3dm/8.4.0)
- [rhino3dmが指定するOpenNURBS](https://github.com/mcneel/opennurbs/tree/19df20038249fc40771dbd80201253a76100842c)／[Draco](https://github.com/mcneel/draco/tree/9036ecd96bfe9746046117607bc17366894ec8e1)
- [OpenNURBSの利用条件に関する開発元の説明](https://developer.rhino3d.com/guides/opennurbs/what-is-opennurbs/)
