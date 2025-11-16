# バリデータ層コンタミ調査レポート（2025-xx01）

指定された識別子（`validateModelStructure`, `model.scene`, `scene.children`, `node.transform`）をリポジトリ全体で検索し、
ヒット箇所を整理しました。各行の「用途」欄には 3DSS（外部ドキュメント）を扱うのか、internal model（scene graph）を扱うのかを明記し、
問題有無を YES/NO で付記しています。

| Identifier | File | Line(s) | 用途 / コンテキスト | 問題? |
| --- | --- | --- | --- | --- |
| `validateModelStructure` | `code/modeler/utils/model_validation.js` | 1-6 | modeler ユーティリティで internal model のスキーマ確認を行う入口。呼び出し側が限定されておらず、3DSS に適用される恐れがある。 | YES（呼び出し用途が不明瞭で、3DSS に対しても使えるように見える） |
| `validateModelStructure` | `code/modeler/io/importer_core.js` | 3,22 | `.3dss.json` を読み込む importer で、payload に直接 internal-model validator を当てている。 | YES（生 3DSS への internal validator 適用） |
| `validateModelStructure` | `code/modeler/io/exporter.js` | 1,9 | internal model を JSON へ書き出す前の整合性チェック。 | NO（internal model 用） |
| `validateModelStructure` | `code/common/utils/validation.js` | 114-135 | internal model validator 本体。`model.scene` 等を要求するのは仕様通り。 | NO（internal model 用定義） |
| `model.scene` | `specs/3DSD-common.md` | 816-824 | 仕様書で「3DSS validator は `model.scene` を要求してはならない」と規範を提示。 | NO（仕様上の注意喚起） |
| `model.scene` | `code/modeler/selftest/importer_core.spec.js` | 32-33 | importer で返す internal model の scene ノードを検証。 | NO（internal model 用） |
| `model.scene` | `code/modeler/selftest/modeler_selftest.js` | 145-146 | internal model smoke test。 | NO（internal model 用） |
| `model.scene` | `code/common/utils/validation.js` | 119,127 | internal validator が scene を必須にしている。 | NO（internal model 用） |
| `scene.children` | `code/vendor/three/examples/jsm/webxr/XRHandMeshModel.js` | 57 | three.js サンプル内で GLTF scene を巡回。 | NO（vendor / external） |
| `scene.children` | `code/vendor/three/examples/jsm/exporters/GLTFExporter.js` | 2478-2511 | three.js GLTF exporter。 | NO（vendor / external） |
| `scene.children` | `code/vendor/three/examples/jsm/controls/ArcballControls.js` | 2611 | three.js ArcballControls。 | NO（vendor / external） |
| `node.transform` | `code/vendor/three/examples/jsm/loaders/FBXLoader.js` | 2697,2705 | three.js FBX loader。 | NO（vendor / external） |
| `node.transform` | `meta/tools/codex_orders/2025-xx01_contami-remove.md` | 17,33,72 | 指令書内の説明。 | NO（仕様 / 手順のみ） |

## まとめ

- 実際に internal-model validator を 3DSS 読み込みに使っているのは `code/modeler/io/importer_core.js`（およびそれを再輸出している呼び出し元）だけでした。
- `modeler_dev` / `viewer_dev` ハーネスは `.3dss.json` をそのまま importer_core に渡しているため、3DSS → internal model の分離ができていません。
- vendor/仕様ファイル内のヒットは参照のみであり、今回の修正範囲（internal model validator 分離）の対象外です。
