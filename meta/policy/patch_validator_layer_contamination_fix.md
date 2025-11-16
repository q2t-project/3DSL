## code/common/validator/threeDssValidator.js

```diff
diff --git a/code/common/validator/threeDssValidator.js b/code/common/validator/threeDssValidator.js
index 68eede0..0cc9125 100644
--- a/code/common/validator/threeDssValidator.js
+++ b/code/common/validator/threeDssValidator.js
@@ -1,30 +1,28 @@
-// 3DSS スキーマ検証のためのインターフェースだけ定義したスケルトン。
-// AJV 本体やスキーマのロードは、あとで安全に実装する。
+import Ajv from '../../vendor/ajv/dist/ajv.bundle.js';
+import addFormats from '../../vendor/ajv-formats/dist/index.js';
+import threeDssSchema from '../../../schemas/3DSS.schema.json' with { type: 'json' };
 
-/**
- * @typedef {Object} ValidationResult
- * @property {boolean} ok
- * @property {Array<Object>} [errors]
- */
+const ajv = new Ajv({ allErrors: true, strict: false });
+addFormats(ajv);
 
-/**
- * 外部から渡されたバリデータ関数を使って 3DSS ドキュメントを検証する。
- * @param {import("../core/modelTypes.js").ThreeDSSDocument} doc
- * @param {(doc: unknown) => boolean} validateFn  AJV などで事前にコンパイルした関数
- * @returns {ValidationResult}
- */
-export function validate3DSS(doc, validateFn) {
-  if (typeof validateFn !== "function") {
-    return { ok: false, errors: [{ message: "validateFn is not provided" }] };
-  }
+const validate = ajv.compile(threeDssSchema);
 
-  const ok = validateFn(doc);
-  const errors = ok ? undefined : (validateFn.errors || []).map((e) => ({
-    message: e.message,
-    instancePath: e.instancePath,
-    keyword: e.keyword,
-    params: e.params
-  }));
+function normalizeAjvError(error = {}) {
+  return {
+    message: error.message ?? '3DSS document is invalid',
+    instancePath: error.instancePath ?? '',
+    keyword: error.keyword,
+    params: error.params,
+  };
+}
 
-  return { ok, errors };
+export function validate3Dss(doc) {
+  const payload = doc ?? {};
+  const ok = validate(payload);
+  return {
+    ok,
+    errors: ok ? null : (validate.errors ?? []).map((error) => normalizeAjvError(error)),
+  };
 }
+
+// TODO(spec): /specs/3DSD-common.md に validator 分離の補足を追加する
```

## code/modeler/io/exporter.js

```diff
diff --git a/code/modeler/io/exporter.js b/code/modeler/io/exporter.js
index 29bcedd..76db830 100644
--- a/code/modeler/io/exporter.js
+++ b/code/modeler/io/exporter.js
@@ -1,4 +1,5 @@
-import { validateModelStructure } from '../../common/utils/index.js';
+import { ValidationError } from '../../common/errors/index.js';
+import { validateInternalModel } from '../../common/validator/internalModelValidator.js';
 
 export function exportModelToJSON(model, { space = 2 } = {}) {
   if (!model) {
@@ -6,6 +7,10 @@ export function exportModelToJSON(model, { space = 2 } = {}) {
   }
 
   const serializable = typeof model.toJSON === 'function' ? model.toJSON() : model;
-  validateModelStructure(serializable);
+  const validation = validateInternalModel(serializable);
+  if (!validation.ok) {
+    const reason = validation.errors?.map((error) => error.message).join('; ') ?? 'internal model is invalid';
+    throw new ValidationError(reason);
+  }
   return JSON.stringify(serializable, null, space);
 }
```

## code/modeler/io/importer.js

```diff
diff --git a/code/modeler/io/importer.js b/code/modeler/io/importer.js
index 8d22cd3..39fb9c7 100644
--- a/code/modeler/io/importer.js
+++ b/code/modeler/io/importer.js
@@ -1,2 +1,6 @@
 export { importFromPrep } from './importer_prep.js';
-export { importModelFromJSON } from './importer_core.js';
+export {
+  convert3DssToInternalModel,
+  importModelFrom3DssSource,
+  importModelFromJSON,
+} from './importer_core.js';
```

## code/modeler/io/importer_core.js

```diff
diff --git a/code/modeler/io/importer_core.js b/code/modeler/io/importer_core.js
index 26ae3c8..778c808 100644
--- a/code/modeler/io/importer_core.js
+++ b/code/modeler/io/importer_core.js
@@ -1,24 +1,3 @@
-import { Model } from '../../common/types/index.js';
-import { ValidationError } from '../../common/errors/index.js';
-import { ensureSchemaPresence, validateModelStructure } from '../../common/utils/index.js';
+export { convert3DssToInternalModel, importModelFrom3DssSource } from '../../common/core/importer_core.js';
 
-const DEFAULT_SCHEMA = '3dsl-core-model';
-
-function parseInput(jsonInput) {
-  if (typeof jsonInput === 'string') {
-    const trimmed = jsonInput.trim();
-    if (!trimmed) {
-      throw new ValidationError('JSON input cannot be empty');
-    }
-    return JSON.parse(trimmed);
-  }
-
-  return jsonInput;
-}
-
-export function importModelFromJSON(jsonInput, { schemaName = DEFAULT_SCHEMA } = {}) {
-  const payload = parseInput(jsonInput);
-  ensureSchemaPresence(schemaName, payload);
-  validateModelStructure(payload);
-  return new Model(payload);
-}
+export { importModelFrom3DssSource as importModelFromJSON } from '../../common/core/importer_core.js';
```

## code/modeler/renderer/modelerRenderer.js

```diff
diff --git a/code/modeler/renderer/modelerRenderer.js b/code/modeler/renderer/modelerRenderer.js
index bf7c2bb..83c7dfd 100644
--- a/code/modeler/renderer/modelerRenderer.js
+++ b/code/modeler/renderer/modelerRenderer.js
@@ -15,9 +15,9 @@ export class ModelerRenderer {
   }
 
   /**
-   * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} _doc
+   * @param {import("../../common/types/core.js").Model} _model
    */
-  render(_doc) {
+  render(_model) {
     if (!this.initialized) return;
     // レンダリング処理は後で
   }
```

## code/modeler/selftest/exporter_core.spec.js

```diff
diff --git a/code/modeler/selftest/exporter_core.spec.js b/code/modeler/selftest/exporter_core.spec.js
index 137e7d5..25fdbe7 100644
--- a/code/modeler/selftest/exporter_core.spec.js
+++ b/code/modeler/selftest/exporter_core.spec.js
@@ -2,7 +2,7 @@ import test from 'node:test';
 import assert from 'node:assert/strict';
 
 import { ValidationError } from '../../common/errors/index.js';
-import { importModelFromJSON } from '../io/importer.js';
+import { importModelFrom3DssSource } from '../io/importer.js';
 import { exportToThreeDss } from '../exporter/threeDssExporter.js';
 
 const { deepStrictEqual, strictEqual, throws } = assert;
@@ -76,30 +76,38 @@ test('exportToThreeDss: rejects invalid inputs', () => {
   );
 });
 
-test('exportToThreeDss: round-trips importer_core payloads', () => {
+test('exportToThreeDss: round-trips importer_core payloads', async () => {
   const source = {
-    version: '3.1.4',
+    document_meta: {
+      document_uuid: 'roundtrip-doc',
+      schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0',
+      author: 'exporter-selftest',
+      version: '3.1.4',
+    },
     scene: {
       id: 'round-trip',
       nodes: [
         {
           id: 'node-a',
           type: 'mesh',
+          transform: { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
           metadata: { name: 'primary' },
         },
       ],
     },
-    metadata: { name: 'rt', tags: ['modeler'] },
+    points: [],
+    lines: [],
+    aux: [],
   };
 
-  const model = importModelFromJSON(JSON.stringify(source));
+  const model = await importModelFrom3DssSource(source);
   const exported = exportToThreeDss(model.toJSON());
 
-  strictEqual(exported.version, source.version);
+  strictEqual(exported.version, source.document_meta.version);
   strictEqual(exported.scene.id, source.scene.id);
   strictEqual(exported.scene.nodes.length, source.scene.nodes.length);
   strictEqual(exported.scene.nodes[0].id, source.scene.nodes[0].id);
   strictEqual(exported.scene.nodes[0].type, source.scene.nodes[0].type);
   strictEqual(exported.scene.nodes[0].metadata.name, source.scene.nodes[0].metadata.name);
-  deepStrictEqual(exported.metadata, source.metadata);
+  strictEqual(exported.metadata.name, model.metadata.name);
 });
```

## code/modeler/selftest/importer_core.spec.js

```diff
diff --git a/code/modeler/selftest/importer_core.spec.js b/code/modeler/selftest/importer_core.spec.js
index 1b68771..044f58b 100644
--- a/code/modeler/selftest/importer_core.spec.js
+++ b/code/modeler/selftest/importer_core.spec.js
@@ -6,45 +6,56 @@ import assert from 'node:assert/strict';
 
 import { Model } from '../../common/types/index.js';
 import { ValidationError } from '../../common/errors/index.js';
-import { importModelFromJSON } from '../io/importer.js';
+import { importModelFrom3DssSource } from '../io/importer.js';
 
-const { ok, strictEqual, deepStrictEqual, throws } = assert;
+const { ok, strictEqual, deepStrictEqual, rejects } = assert;
 
-const MINIMAL_MODEL = {
-  version: '1.0.0',
-  scene: {
-    id: 'scene-1',
-    nodes: [],
-    metadata: {},
+const MINIMAL_3DSS_DOCUMENT = {
+  document_meta: {
+    document_uuid: 'importer-selftest-doc',
+    schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0',
+    author: 'importer-selftest',
+    version: '1.0.0',
   },
-  metadata: { name: 'selftest' },
+  points: [
+    {
+      id: 'point-root',
+      signification: { name: 'Root point' },
+      appearance: {
+        position: [0, 0, 0],
+        marker: { common: { orientation: [0, 0, 0], scale: [1, 1, 1] } },
+      },
+    },
+  ],
+  lines: [],
+  aux: [],
 };
 
 // ---------------------------------------------------------------------------
 // Normal path: stringified JSON roundtrips into Model instance
 // ---------------------------------------------------------------------------
-test('importModelFromJSON: parses valid JSON and returns a Model', () => {
-  const payload = JSON.stringify(MINIMAL_MODEL);
-  const model = importModelFromJSON(payload);
+test('importModelFrom3DssSource: parses valid JSON and returns a Model', async () => {
+  const payload = JSON.stringify(MINIMAL_3DSS_DOCUMENT);
+  const model = await importModelFrom3DssSource(payload);
 
   ok(model instanceof Model, 'importer should return a Model instance');
-  strictEqual(model.version, MINIMAL_MODEL.version);
-  strictEqual(model.scene.id, MINIMAL_MODEL.scene.id);
-  deepStrictEqual(model.scene.nodes, []);
+  strictEqual(model.version, MINIMAL_3DSS_DOCUMENT.document_meta.version);
+  strictEqual(model.scene.id, 'scene-importer-selftest-doc');
+  deepStrictEqual(model.scene.nodes[0].transform.position, [0, 0, 0]);
 });
 
 // ---------------------------------------------------------------------------
 // Rejection: empty string or undefined payloads
 // ---------------------------------------------------------------------------
-test('importModelFromJSON: rejects empty strings or missing payloads', () => {
-  throws(() => importModelFromJSON('   '), /cannot be empty/i, 'empty string should throw');
-  throws(() => importModelFromJSON(undefined), ValidationError);
+test('importModelFrom3DssSource: rejects empty strings or missing payloads', async () => {
+  await rejects(importModelFrom3DssSource('   '), /cannot be empty/i, 'empty string should throw');
+  await rejects(importModelFrom3DssSource(undefined), ValidationError);
 });
 
 // ---------------------------------------------------------------------------
 // Rejection: schema violations bubble up as ValidationError
 // ---------------------------------------------------------------------------
-test('importModelFromJSON: validates required fields', () => {
-  const missingScene = { version: '1.0.0' };
-  throws(() => importModelFromJSON(missingScene), ValidationError);
+test('importModelFrom3DssSource: validates required fields', async () => {
+  const missingMeta = { points: [] };
+  await rejects(importModelFrom3DssSource(missingMeta), ValidationError);
 });
```

## code/modeler/selftest/modeler_selftest.js

```diff
diff --git a/code/modeler/selftest/modeler_selftest.js b/code/modeler/selftest/modeler_selftest.js
index 6df4057..25c6d9e 100644
--- a/code/modeler/selftest/modeler_selftest.js
+++ b/code/modeler/selftest/modeler_selftest.js
@@ -1,7 +1,7 @@
 import assert from 'node:assert/strict';
 
 import { ROOT_IDS, HUD_FIELDS } from '../../common/ui/domIds.js';
-import { importFromPrep, importModelFromJSON } from '../io/importer.js';
+import { importFromPrep, importModelFrom3DssSource } from '../io/importer.js';
 import { createModelerContext, openDocument } from '../core/modelerCommands.js';
 import { ModelerRenderer } from '../renderer/modelerRenderer.js';
 import { updateModelerHud } from '../hud/modelerHudController.js';
@@ -19,11 +19,12 @@ const SAMPLE_PREP_PAYLOAD = {
   ],
 };
 
-const SAMPLE_CORE_MODEL = {
-  version: '1.4.2-selftest',
-  metadata: {
-    name: 'Modeler Selftest Core Model',
-    tags: ['modeler', 'selftest'],
+const SAMPLE_CORE_DOCUMENT = {
+  document_meta: {
+    document_uuid: '00000000-0000-4000-8000-000000000001',
+    schema_uri: 'https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0',
+    author: 'modeler-selftest',
+    version: '1.4.2-selftest',
   },
   scene: {
     id: 'modeler-core-import-scene',
@@ -42,6 +43,9 @@ const SAMPLE_CORE_MODEL = {
       },
     ],
   },
+  points: [],
+  lines: [],
+  aux: [],
 };
 
 function buildSceneFromPoints(points) {
@@ -139,15 +143,19 @@ function createStubThreeDssValidator() {
   return validator;
 }
 
-function runCoreImporterSmokeTest() {
-  const model = importModelFromJSON(SAMPLE_CORE_MODEL);
-  assert.equal(model.version, SAMPLE_CORE_MODEL.version, 'core importer should preserve version');
-  assert.equal(model.scene.id, SAMPLE_CORE_MODEL.scene.id, 'core importer should hydrate scene id');
-  assert.equal(model.scene.nodes.length, SAMPLE_CORE_MODEL.scene.nodes.length, 'core importer should keep nodes');
+async function runCoreImporterSmokeTest() {
+  const model = await importModelFrom3DssSource(SAMPLE_CORE_DOCUMENT);
+  assert.equal(
+    model.version,
+    SAMPLE_CORE_DOCUMENT.document_meta.version,
+    'core importer should preserve version',
+  );
+  assert.equal(model.scene.id, SAMPLE_CORE_DOCUMENT.scene.id, 'core importer should hydrate scene id');
+  assert.equal(model.scene.nodes.length, SAMPLE_CORE_DOCUMENT.scene.nodes.length, 'core importer should keep nodes');
   return model;
 }
 
-function runSelftest() {
+async function runSelftest() {
   const document = createSelftestDocumentFromPrep();
   assert.equal(document.points.length, SAMPLE_PREP_PAYLOAD.points.length, 'all PREP points should be converted');
   assert.equal(document.scene.id, 'modeler-selftest-scene');
@@ -186,7 +194,7 @@ function runSelftest() {
     'HUD should reflect document units',
   );
 
-  const coreModel = runCoreImporterSmokeTest();
+  const coreModel = await runCoreImporterSmokeTest();
 
   console.log(
     'modeler_selftest summary',
@@ -204,4 +212,7 @@ function runSelftest() {
   );
 }
 
-runSelftest();
+runSelftest().catch((error) => {
+  console.error(error);
+  process.exitCode = 1;
+});
```

## code/modeler/ui/modelerDevHarness.js

```diff
diff --git a/code/modeler/ui/modelerDevHarness.js b/code/modeler/ui/modelerDevHarness.js
index 9db8e24..a19ea9b 100644
--- a/code/modeler/ui/modelerDevHarness.js
+++ b/code/modeler/ui/modelerDevHarness.js
@@ -1,9 +1,10 @@
 // PR8: dev 用の簡易ハーネス。
 // three.js 初期化 → 3DSS 読み込み → importer_core → modelerRenderer で表示。
 
-import { importModelFromJSON } from "../io/importer_core.js";
+import { convert3DssToInternalModel } from "../../common/core/importer_core.js";
+import { validate3Dss } from "../../common/validator/threeDssValidator.js";
+import { validateInternalModel } from "../../common/validator/internalModelValidator.js";
 import { ModelerRenderer } from "../renderer/modelerRenderer.js";
-// 必要なら validator / paths もここで import する。
 
 export function bootstrapModelerDev(opts) {
   const { mountViewport, summaryElem, logElem } = opts;
@@ -22,20 +23,26 @@ export function bootstrapModelerDev(opts) {
     const res = await fetch(url);
     const json = await res.json();
 
-    // ThreeDSSDocument へ変換
-    const doc = importModelFromJSON(json);
+    const docValidation = validate3Dss(json);
+    if (!docValidation.ok) {
+      log("3DSS validation failed", docValidation.errors);
+      throw new Error(docValidation.errors?.[0]?.message ?? "3DSS validation failed");
+    }
+
+    const model = convert3DssToInternalModel(json);
+    const internalValidation = validateInternalModel(model);
+    if (!internalValidation.ok) {
+      log("internal model warnings", internalValidation.errors);
+    }
 
-    // renderer へ渡す
-    renderer.renderDocument(doc);
+    renderer.render(model);
 
     if (summaryElem) {
       summaryElem.textContent = JSON.stringify(
         {
-          lines: doc.lines?.length ?? 0,
-          points: doc.points?.length ?? 0,
-          aux: doc.aux?.length ?? 0,
-          document_uuid: doc.document_meta?.document_uuid ?? null,
-          version: doc.document_meta?.version ?? null,
+          sceneId: model.scene?.id ?? null,
+          nodes: model.scene?.nodes?.length ?? 0,
+          version: model.version ?? null,
         },
         null,
         2,
@@ -43,9 +50,8 @@ export function bootstrapModelerDev(opts) {
     }
 
     log("rendered", {
-      lines: doc.lines?.length ?? 0,
-      points: doc.points?.length ?? 0,
-      aux: doc.aux?.length ?? 0,
+      sceneId: model.scene?.id ?? null,
+      nodes: model.scene?.nodes?.length ?? 0,
     });
   }
 
```

## code/modeler/utils/model_validation.js

```diff
diff --git a/code/modeler/utils/model_validation.js b/code/modeler/utils/model_validation.js
index 591f0e5..5ecff49 100644
--- a/code/modeler/utils/model_validation.js
+++ b/code/modeler/utils/model_validation.js
@@ -1,6 +1,12 @@
-import { ensureSchemaPresence, validateModelStructure } from '../../common/utils/index.js';
+import { ValidationError } from '../../common/errors/index.js';
+import { ensureSchemaPresence } from '../../common/utils/index.js';
+import { validateInternalModel } from '../../common/validator/internalModelValidator.js';
 
 export function assertModelSchema(payload, { schemaName = '3dsl-core-model' } = {}) {
   ensureSchemaPresence(schemaName, payload);
-  return validateModelStructure(payload);
+  const result = validateInternalModel(payload);
+  if (!result.ok) {
+    throw new ValidationError(result.errors?.[0]?.message ?? 'internal model is invalid');
+  }
+  return true;
 }
```

## code/modeler/validator/modelerValidator.js

```diff
diff --git a/code/modeler/validator/modelerValidator.js b/code/modeler/validator/modelerValidator.js
index 33b4910..7b4cf87 100644
--- a/code/modeler/validator/modelerValidator.js
+++ b/code/modeler/validator/modelerValidator.js
@@ -1,11 +1,11 @@
 // common の validator をラップするだけのスケルトン
 
-import { validate3DSS } from "../../common/validator/threeDssValidator.js";
+import { validate3Dss } from "../../common/validator/threeDssValidator.js";
 
-/**
- * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} doc
- * @param {(doc: unknown) => boolean} validateFn
- */
-export function validateModelerDocument(doc, validateFn) {
-  return validate3DSS(doc, validateFn);
+export function validateModelerDocument(doc, overrideValidator) {
+  if (typeof overrideValidator === 'function') {
+    const ok = overrideValidator(doc);
+    return { ok, errors: ok ? null : overrideValidator.errors ?? [] };
+  }
+  return validate3Dss(doc);
 }
```

## code/viewer/renderer/viewerRenderer.js

```diff
diff --git a/code/viewer/renderer/viewerRenderer.js b/code/viewer/renderer/viewerRenderer.js
index 33cea6f..49f5624 100644
--- a/code/viewer/renderer/viewerRenderer.js
+++ b/code/viewer/renderer/viewerRenderer.js
@@ -14,9 +14,9 @@ export class ViewerRenderer {
   }
 
   /**
-   * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} _doc
+   * @param {import("../../common/types/core.js").Model} _model
    */
-  render(_doc) {
+  render(_model) {
     if (!this.initialized) return;
     // 実装は後で
   }
```

## code/viewer/ui/viewerDevHarness.js

```diff
diff --git a/code/viewer/ui/viewerDevHarness.js b/code/viewer/ui/viewerDevHarness.js
index 95b2cbf..414f95d 100644
--- a/code/viewer/ui/viewerDevHarness.js
+++ b/code/viewer/ui/viewerDevHarness.js
@@ -1,8 +1,10 @@
 // PR8: viewer 用 dev ハーネス。
 // .3dss.json → （必要なら importer_core）→ scene_builder → viewerRenderer。
 
-import { importModelFromJSON } from "../../modeler/io/importer_core.js"; // もし共通 importer を使うなら
-import { buildSceneFromDocument } from "../scene/scene_builder.js";     // 実際の API 名に合わせて修正
+import { convert3DssToInternalModel } from "../../common/core/importer_core.js";
+import { validate3Dss } from "../../common/validator/threeDssValidator.js";
+import { validateInternalModel } from "../../common/validator/internalModelValidator.js";
+import { createScene } from "../scene/scene_builder.js";
 import { ViewerRenderer } from "../renderer/viewerRenderer.js";
 
 export function bootstrapViewerDev(opts) {
@@ -22,11 +24,20 @@ export function bootstrapViewerDev(opts) {
     const res = await fetch(url);
     const json = await res.json();
 
-    // ThreeDSSDocument に変換（または既に ThreeDSSDocument ならそのまま）
-    const doc = importModelFromJSON(json);
+    const docValidation = validate3Dss(json);
+    if (!docValidation.ok) {
+      log("3DSS validation failed", docValidation.errors);
+      throw new Error(docValidation.errors?.[0]?.message ?? "3DSS validation failed");
+    }
+
+    const model = convert3DssToInternalModel(json);
+    const internalValidation = validateInternalModel(model);
+    if (!internalValidation.ok) {
+      log("internal model warnings", internalValidation.errors);
+    }
 
-    // viewer 用 Scene 構築
-    const sceneInfo = buildSceneFromDocument(doc);
+    const viewScene = createScene(model.scene);
+    const sceneInfo = { viewScene };
     // sceneInfo: { viewScene, threeScene, camera, ... } を想定
 
     renderer.renderScene(sceneInfo);
@@ -35,7 +46,8 @@ export function bootstrapViewerDev(opts) {
       summaryElem.textContent = JSON.stringify(
         {
           nodesInScene: sceneInfo.viewScene?.nodes?.length ?? null,
-          document_uuid: doc.document_meta?.document_uuid ?? null,
+          sceneId: model.scene?.id ?? null,
+          version: model.version ?? null,
         },
         null,
         2,
```

## code/viewer/validator/viewerValidator.js

```diff
diff --git a/code/viewer/validator/viewerValidator.js b/code/viewer/validator/viewerValidator.js
index 04a22d1..1304607 100644
--- a/code/viewer/validator/viewerValidator.js
+++ b/code/viewer/validator/viewerValidator.js
@@ -1,9 +1,9 @@
-import { validate3DSS } from "../../common/validator/threeDssValidator.js";
+import { validate3Dss } from "../../common/validator/threeDssValidator.js";
 
-/**
- * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} doc
- * @param {(doc: unknown) => boolean} validateFn
- */
-export function validateViewerDocument(doc, validateFn) {
-  return validate3DSS(doc, validateFn);
+export function validateViewerDocument(doc, overrideValidator) {
+  if (typeof overrideValidator === 'function') {
+    const ok = overrideValidator(doc);
+    return { ok, errors: ok ? null : overrideValidator.errors ?? [] };
+  }
+  return validate3Dss(doc);
 }
```

