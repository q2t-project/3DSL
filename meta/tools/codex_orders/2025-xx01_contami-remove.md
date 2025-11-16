#codex指令

3DSL リポジトリにおける「3DSS と内部ランタイムモデル（scene graph）」のバリデータ層コンタミを除去し、
以下の方針に沿ってコード構造を修正せよ。

[前提]

- リポジトリ構成は `repo_structure.txt` の内容に従う。
- 3DSS の唯一の正規スキーマは `/schemas/3DSS.schema.json` である。
- `/code/common/validator/` 配下は「common レイヤの validator 実装」を置く場所とする。
- `/code/**/validator/` 配下のスキーマ／バリデータは internal-only（内部モデル専用）とする。

[禁止事項]

- `/schemas/3DSS.schema.json` の内容を変更してはならない。
- `/schemas/` 配下に internal 用のスキーマを新設してはならない。
- 3DSS 用 validator に、`model.scene` や `node.transform` など、3DSS に存在しないキーを要求させてはならない。
- internal-model-validator を `.3dss.json`（生 3DSS）に対して直接適用してはならない。

[作業範囲]

- `/code/common/validator/` 配下
- `/code/common/core/` 配下（importer）
- `modeler_dev.html` / `viewer_dev.html`（dev ハーネス）
- その他 `validateModelStructure` / `model.scene` / `node.transform` など、内部モデルバリデータ／内部モデル構造を参照している箇所（リポジトリ全体）

[タスク 0: 事前解析レポート]

1. リポジトリ全体を検索し、次の識別子を含む箇所を列挙せよ。
   - `validateModelStructure`
   - `model.scene`
   - `scene.children`
   - `node.transform`
2. 各ヒットについて以下を表形式でまとめ、レポートを出力せよ。
   - ファイルパス
   - 行番号
   - 使用目的（3DSS に対する処理か／internal model に対する処理か）
   - 問題があるかどうか（YES/NO と理由）
3. レポートは次のファイルに Markdown で出力せよ。

[出力ファイル 1]

- `/meta/policy/report_validator_layer_contamination.md`

[タスク 1: threeDssValidator の新設]

1. `/code/common/validator/threeDssValidator.js` を新設し、3DSS 専用 validator を実装せよ。
2. 実装要件:
   - AJV + `/schemas/3DSS.schema.json` を用いて 3DSS ドキュメントを検証する。
   - エクスポート関数は以下のシグネチャとする（既存構造に合わせて微調整してよい）:

     ```js
     export function validate3Dss(doc) {
       // doc: 生の 3DSS JSON オブジェクト
       // 戻り値: { ok: boolean, errors: AjvError[] | null }
     }
     ```

   - 3DSS に存在しないキー（`model.scene` 等）を要求してはならない。
   - 3DSS レベルの構造・enum・必須項目など、3DSS.schema.json が定める制約のみをチェックする。

3. 既存の 3DSS 用検証ロジックが他ファイルに分散している場合は、それらを `threeDssValidator.js` に集約し、
   他ファイルからは `validate3Dss` をインポートして利用する形にリファクタせよ。

[タスク 2: internal-model-validator の整理]

1. 内部モデル（scene graph）向け validator を `/code/common/validator/internalModelValidator.js`
   （名前は既存構成に合わせてよいが、internal-only であることが明確な命名とする）として定義・整理せよ。
2. 実装要件:
   - 入力は「importer によって変換された内部モデルオブジェクト」のみとする。
   - 3DSS の JSON を直接受け取らない。
   - `scene.children`, `node.transform` など、内部モデル構造を前提にした検証を行う。
   - エクスポート関数例:

     ```js
     export function validateInternalModel(model) {
       // model: 内部ランタイムモデル
       // 戻り値: { ok: boolean, errors: ValidationError[] | null }
     }
     ```

3. `validateModelStructure` 等、内部モデル専用の検証関数が 3DSS に対して呼ばれている箇所があれば、
   すべて内部モデルに対してのみ呼ばれるように修正せよ。

[タスク 3: importer パイプラインの 2 段階化]

1. `/code/common/core/` 配下にある importer 実装（例: `importer_core.js`）を特定せよ。
   - `importModelFromJSON` や 3DSS 読み込み処理を検索して見つけること。
2. importer の責務を次の 2 段階に明確に分割する:

   1) 3DSS → 内部モデル変換（純粋変換）  
      - 入力: 検証済み 3DSS ドキュメント
      - 出力: 内部モデル（scene / nodes / transforms 等）

   2) 変換前後での検証呼び出しは、importer 外側（呼び出し元）で行うか、
      もしくはまとめ関数として以下のようにラップする:

      ```js
      import { validate3Dss } from "../validator/threeDssValidator.js";
      import { validateInternalModel } from "../validator/internalModelValidator.js";

      export async function importModelFrom3DssSource(source) {
        const doc = await load3DssFromFileOrString(source); // 実装は既存構造に合わせる
        const v1 = validate3Dss(doc);
        if (!v1.ok) throw new Error("3DSS validation failed");

        const model = convert3DssToInternalModel(doc);

        const v2 = validateInternalModel(model);
        if (!v2.ok) {
          // dev 用としては警告ログを出す。throw するかどうかは既存ポリシーに合わせる。
        }

        return model;
      }
      ```

3. 重要: 3DSS ドキュメントに対して internal-model-validator を直接呼ぶ構造は完全に排除すること。

[タスク 4: dev ハーネス（modeler_dev / viewer_dev）の修正]

1. `modeler_dev.html` / `viewer_dev.html`（または同等の dev 用エントリポイント）を特定し、
   3DSS ファイル読込時の処理フローを確認せよ。
2. 次の NG パターンが存在する場合は修正せよ。

   ```js
   const json = JSON.parse(fileContents);
   validateModelStructure(json); // 内部モデル前提の validator を生 3DSS に適用している
   const model = importModelFromJSON(json);
修正後の基本パターンは以下の通りとする（既存構造に合わせて調整してよいが、データ流れは同じにすること）。

js
コードをコピーする
import { validate3Dss } from "./code/common/validator/threeDssValidator.js";
import { validateInternalModel } from "./code/common/validator/internalModelValidator.js";
import { importModelFrom3DssSource } from "./code/common/core/importer_core.js";

async function loadDocument(file) {
  const internalModel = await importModelFrom3DssSource(file);
  startRenderLoop(internalModel);
}
もしくは loadDocument 内で validate3Dss → convert3DssToInternalModel → validateInternalModel → startRenderLoop

の順に明示する形でもよい。

dev ハーネスを含むすべてのコードパスにおいて、

3DSS データに internal-model-validator を直接適用していないことを確認せよ。

[タスク 5: 仕様書との整合コメント（任意だが推奨）]

/specs/3DSD-common.md に記載されている「Validator の抽象責務」節を確認し、

可能であれば「3DSS-validator と internal-model-validator の分離規範（コンタミ防止）」に関する

短いコメントを追記するための差分を提案せよ。

（実際の仕様書編集は別プロセスで行うため、ここではコードコメント等で「仕様側に追記すべき内容」を

TODO として残すだけでもよい。）

[出力ファイル 2: 差分パッチ]

以下の 1 ファイルに、今回の修正で変更・追加したすべてのファイルの unified diff をまとめて出力せよ。

/meta/policy/patch_validator_layer_contamination_fix.md

フォーマット要件:

ファイルごとに見出しとしてパスを記載し、その下に ```diff コードブロックで unified diff を記述する。

例:

markdown
コードをコピーする
## code/common/validator/threeDssValidator.js

```diff
--- /dev/null
+++ b/code/common/validator/threeDssValidator.js
@@ -0,0 +1,120 @@
+// 実装...
コードをコピーする
既存ファイルの変更も同様に --- a/… +++ b/… 形式の unified diff で記載すること。

実際の diff は、現在のリポジトリ状態を前提として適用可能なものとすること。

diff
コードをコピーする


---

## 2. 差分パッチフォーマットのサンプルだけ欲しい場合

指令とは別に、パッチファイルの中身イメージだけ抜き出すと、こんな感じで書かせる想定や：

```markdown
# /meta/policy/patch_validator_layer_contamination_fix.md

## code/common/validator/threeDssValidator.js

```diff
--- /dev/null
+++ b/code/common/validator/threeDssValidator.js
@@ -0,0 +1,120 @@
+import Ajv from "ajv";
+import addFormats from "ajv-formats";
+import threeDssSchema from "../../../schemas/3DSS.schema.json" assert { type: "json" };
+
+const ajv = new Ajv({ allErrors: true, strict: false });
+addFormats(ajv);
+
+const validate = ajv.compile(threeDssSchema);
+
+export function validate3Dss(doc) {
+  const ok = validate(doc);
+  return {
+    ok,
+    errors: ok ? null : validate.errors ?? [],
+  };
+}
code/common/core/importer_core.js
diff
コードをコピーする
--- a/code/common/core/importer_core.js
+++ b/code/common/core/importer_core.js
@@ -1,20 +1,42 @@
-import { validateModelStructure } from "../validator/validateModelStructure.js";
+import { validate3Dss } from "../validator/threeDssValidator.js";
+import { validateInternalModel } from "../validator/internalModelValidator.js";
@@
-export async function importModelFromJSON(json) {
-  validateModelStructure(json);
-  const model = convertToInternalModel(json);
-  return model;
-}
+export async function importModelFrom3DssSource(source) {
+  const doc = await load3DssFromSource(source);
+  const v1 = validate3Dss(doc);
+  if (!v1.ok) {
+    throw new Error("3DSS validation failed");
+  }
+
+  const model = convertToInternalModel(doc);
+
+  const v2 = validateInternalModel(model);
+  if (!v2.ok) {
+    console.warn("Internal model validation warnings:", v2.errors);
+  }
+
+  return model;
+}