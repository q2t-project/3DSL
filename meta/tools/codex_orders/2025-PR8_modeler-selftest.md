PR8: modeler selftest（B-4 パイプライン一周）

---

## 0. ゴール位置づけ

- 対応ゴール: `/meta/policy/3DSL_repo-goals.md` の **B-4: modeler selftest（パイプライン一周）**
- 目標状態:
  - `npm run selftest:modeler` で
    - 代表的な 3DSS / PREP 入力から ThreeDSSDocument を生成し
    - modeler のコンテキスト / renderer / HUD / validator まで一通り動かして
    - パイプラインの「煙テスト」が毎回できるようにする
  - 既存の importer / exporter / validator / viewer 側 selftest と整合が取れていること

---

## 1. 現状の確認（着手前に軽く見るだけで OK）

- `/meta/policy/3DSL_repo-goals.md`
  - B-4 の状態が ⬜（未着手）になっていることを確認
- `package.json`
  - `"selftest:modeler": "node code/modeler/selftest/modeler_selftest.js"` が定義済み or 定義予定か確認
- `code/modeler/selftest/`
  - 既存の `modeler_selftest.js` があれば中身をざっと確認（古いスケルトンかどうか）
- modeler パイプラインの主な部品（読むだけ）
  - importer:
    - `code/modeler/io/importer_core.js`（`importModelFromJSON`）
    - `code/modeler/io/importer_prep.js`（`importFromPrep`）
  - exporter:
    - `code/modeler/exporter/threeDssExporter.js`（PR6）
  - validator / context / renderer / HUD など:
    - `code/modeler/validator/modelerValidator.js`
    - `code/modeler/core/modelerContext.js`
    - `code/modeler/renderer/modelerRenderer.js`
    - `code/modeler/hud/modelerHudController.js`

---

## 2. やること全体像

1. **modeler_selftest エントリの再構築**
   - `code/modeler/selftest/modeler_selftest.js` を
     - ThreeDSSDocument を組み立てるところから
     - modeler のコンテキスト初期化 → renderer / HUD 起動 → validator 実行
     - まで一周させる自己完結スクリプトにする
2. **PREP / core importer をパイプラインに組み込む**
   - できるだけ
     - PREP → `importFromPrep` → ThreeDSSDocument
     - もしくは 3DSS core → `importModelFromJSON`
     - を経由するようにして、インポータの実コードを通す
3. **selftest 用の最小シーン & アサーション整備**
   - 「最小だけどそれっぽい」 ThreeDSSDocument（or PREP JSON）を 1〜2 ケース用意
   - ノード数や座標、メタデータ、HUD 表示テキストなどを軽く assert
4. **スクリプト統合**
   - `package.json` の `"scripts"` を整理し、
     - `selftest:common`
     - `selftest:modeler`
     - `selftest:viewer`
     - （あれば `selftest:*`）を一箇所にまとめる
5. **codex ログとのひも付け**
   - 実行結果のサマリを `console.log` で 1 行 JSON にして吐く
   - 後で ROOT 収束ログ（D 系）から拾いやすい形を意識する

---

## 3. 詳細タスク

### 3-1. modeler_selftest.js の実装

対象: `code/modeler/selftest/modeler_selftest.js`

やりたいこと:

1. **インポータ経由でドキュメント生成**

   パターン A: PREP 経由（推奨）

   - PREP 用サンプル JSON をローカルの定数として定義
     - `document_meta`（schema_uri / generator / source など）
     - `points` / `lines` など最小限
   - `import { importFromPrep } from '../io/importer.js'` を使い、
     - `const result = importFromPrep(samplePrepJson);`
     - `result.ok === true` と `result.document` の存在を assert
     - `const doc = result.document;`

   パターン B: 既存 ThreeDSSDocument 直書き or `importModelFromJSON` 経由
   - 必要に応じて、core importer も 1 ケース混ぜても OK
     - `import { importModelFromJSON } from '../io/importer.js';`

2. **validator / context / renderer / HUD を通す**

   - `import { validateThreeDssDocument } from '../../common/validator/threeDssValidator.js';`  
     （正確な名前は実コードに合わせて調整）
   - `validateThreeDssDocument(doc)` が落ちないことを確認
   - `import { createModelerContext } from '../core/modelerContext.js';`
   - `const ctx = createModelerContext(doc, { ...options });`
   - `import { ModelerRenderer } from '../renderer/modelerRenderer.js';`
   - `import { ModelerHudController } from '../hud/modelerHudController.js';`
   - モック DOM or シンプルなダミー DOM を使って renderer / HUD を初期化
     - PR7 の `code/viewer/selftest/viewer_selftest.js` を参考に、
       - `createMockDom()`
       - `getElementById()` などを modeler 用 ID に合わせてコピー or 再利用

3. **クリティカルパスの assert**

   例（イメージ、実装時は実 ID / フィールド名に合わせて調整）:

   - `doc.scene.id === 'modeler-selftest-scene'`
   - `doc.points.length === 2`
   - `ctx.document === doc`
   - renderer の内部フラグ:
     - `renderer.initialized === true`
   - HUD:
     - `mockDom.getElementById(HUD_FIELDS.documentUuid).textContent === doc.document_meta.document_uuid`
     - `HUD_FIELDS.documentUnits` など、1〜2 箇所表示を確認

4. **selftest サマリのログ**

   - 最後に
     ```js
     console.log(
       'modeler_selftest summary',
       JSON.stringify(
         {
           nodesInScene: doc.scene.nodes.length,
           points: doc.points.length,
           documentUuid: doc.document_meta.document_uuid,
           rendererInitialized: renderer.initialized,
         },
         null,
         2,
       ),
     );
     ```
   - を出しておく（内容は調整可）

5. **エントリポイント**

   - ファイル末尾で `runSelftest();` を呼ぶ構造にしておく（viewer_selftest と同じノリ）

---

### 3-2. package.json の scripts 整理

対象: `package.json`

- `"scripts"` セクションを以下イメージに揃える（既存とマージしつつ調整）:

  ```jsonc
  "scripts": {
    "selftest:common": "node --test code/common/selftest/*.spec.js",
    "selftest:modeler": "node code/modeler/selftest/modeler_selftest.js",
    "selftest:viewer": "node code/viewer/selftest/viewer_selftest.js"
    // 必要なら他の helper もここに集約
  }
