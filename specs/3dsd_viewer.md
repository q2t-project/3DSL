# 3DSD-Viewer


### P1-01 機能スコープ定義（最終修正版／locked）

---

## 1. 目的
3DSD-Viewer は、**3DSS.schema.json に準拠した構造データを一般利用者が理解・確認できるように可視化するモジュール**である。  
Modeler が構築した構造データを読み込み、構造的意味（signification, relation, appearance）を保持したまま、  
**外観層上で直感的に表示・要素単位で可視制御すること**を目的とする。  
操作はあくまで「確認・観察」であり、専門的な編集操作は行わない。

---

## 2. 機能範囲（Scope）

| 区分 | 内容 |
|------|------|
| **入力** | schema-valid な 3DSS JSON（Modeler出力またはValidator検証済ファイル）。 |
| **出力** | three.js ベースの3Dレンダリング（構造の可視化）＋表示状態設定データ（要素ごとの可視状態）。 |
| **主機能** | points / lines / aux / document_meta の表示・非表示切替、選択・ハイライト、ラベル表示。 |
| **可視化制御** | 要素ごとのオン／オフ切替。例：☑ points　☑ lines　☐ aux　☑ document_meta |
| **補助機能** | カメラ操作（OrbitControls）、構造検索、グリッド・座標軸表示、リセットビュー。 |
| **操作系** | シンプルなボタン／トグルUI（一般ユーザが理解しやすい最小構成）。 |
| **依存関係** | three.js, OrbitControls, dat.GUI, ajv（Validator呼出）。 |
| **API出力** | 現在の表示状態（visible elements, camera, selection）を Modeler に返却可能。 |
| **バージョン整合性** | `document_meta.schema_uri` が 3DSS v1.0.0 と一致していること。 |

---

## 3. 機能詳細

### 3.1 表示対象
- **points**：3D空間上に marker として配置。appearance情報で形状・色を決定。  
- **lines**：relation種別ごとに線形状を変化（association=灰線、causal=青線など）。  
- **aux**：注釈・説明線・参照線などの補助要素を透過表示（必要時のみ）。  
- **document_meta**：画面上にファイル名、author、version、schema_uri などの情報をオーバーレイ表示。  

### 3.2 操作体系
- 要素カテゴリごとにチェックボックスで可視・不可視を切替。  
  ```
  [✓] points
  [✓] lines
  [ ] aux
  [✓] document_meta
  ```
- 選択・ハイライト：クリックによる単体選択、Shift＋クリックによる複数選択。  
- カメラリセット／中心合わせなどの基本操作を備える。  
- すべての操作は視認性と単純性を重視（一般ユーザ前提）。

### 3.3 出力構造
```json
{
  "view_state": {
    "visible": {
      "points": true,
      "lines": true,
      "aux": false,
      "document_meta": true
    },
    "camera": { "position": [0, 2, 8], "target": [0, 0, 0] },
    "highlight": ["points[2]", "lines[4]"]
  },
  "meta_info": {
    "validated_by": "Validator v1.0.0",
    "schema_uri": "https://3dsl.io/schema/3DSS.schema.json"
  }
}
```

---

## 4. 除外範囲（Out of Scope）
- データ構造の生成・編集（Modeler 領域）  
- 検証処理そのもの（Validator 領域）  
- 高度なレンダリング（陰影・マテリアル表現など）  
- マルチビュー・複数ウィンドウの同期表示（将来拡張）  

---

## 5. スキーマ対応表（抜粋）

| 3DSSセクション | 表示可否 | 表示方法 |
|----------------|-----------|-----------|
| `lines.*` | ✅ | relationごとに線種・色・矢印方向を制御。 |
| `points.*` | ✅ | marker形状とappearance.colorに基づき描画。 |
| `aux.*` | ✅ | 注釈・参照線として透過表示（既定では非表示）。 |
| `document_meta.*` | ✅ | 画面上部オーバーレイに情報を表示。 |

---

## 6. Codex Directives 概略（予告）
Codex実装時には以下を含む：
```text
Implement /code/viewer/
  - Language: JavaScript (ESM)
  - Libraries: three.js, OrbitControls, dat.GUI, ajv
  - Features: 要素単位表示切替, 選択・ハイライト, グリッド/軸表示
  - Input: schema-valid 3DSS JSON
  - Output: 3Dレンダリング + 表示状態JSON
```


---
---


# P1-02 I/O 定義（初稿）
## 1. 目的

Codex が誤読なく Viewer を実装できるよう、入出力データ形式・API・表示状態管理構造を厳密化する。

## 2. 入出力概要
種別	内容	形式	備考
入力	3DSS 構造 JSON	JSON（schema-valid）	Modeler 出力または Validator 検証済
内部展開	three.js SceneGraph オブジェクト	JS Object	各要素を Object3D に変換
出力	表示状態 JSON（view_state）	JSON	表示可否・カメラ位置・選択要素など
補助入出力	Validator 呼び出し結果	内部オブジェクト	schema_version・検証状態の記録

## 3. 入力形式（3DSS JSON）

Viewer は /schemas/3DSS.schema.json に完全準拠した JSON を入力とする。

例：

{
  "points": [
    { "appearance": { "position": [0, 0, 0], "marker": { "shape": "sphere" } },
      "meta": { "uuid": "p-001" } }
  ],
  "lines": [
    { "appearance": {
        "end_a": { "ref": "p-001" },
        "end_b": { "coord": [1, 0, 0] },
        "color": "#00ff00"
      },
      "meta": { "uuid": "l-001" } }
  ],
  "aux": [],
  "document_meta": {
    "document_uuid": "doc-001",
    "schema_uri": "https://3dsl.io/schema/3DSS.schema.json",
    "version": "1.0.0",
    "author": "viewer"
  }
}

## 4. 内部展開構造（three.js 準拠）

Viewer 内部では以下のように要素を three.js 構造へ展開する：

要素	three.js 対応	内容
points	THREE.Mesh + THREE.SphereGeometry など	marker 形状・色・位置を反映
lines	THREE.Line + THREE.BufferGeometry	appearance.line_type に基づき生成
aux	THREE.Group + GridHelper / AxesHelper 等	視覚補助要素
document_meta	JS Object（非表示）	メタ情報のみ保持、表示時は Overlay に出力

## 5. 出力構造（view_state JSON）
{
  "view_state": {
    "visible": {
      "points": true,
      "lines": true,
      "aux": false,
      "document_meta": true
    },
    "camera": {
      "position": [2, 3, 6],
      "target": [0, 0, 0],
      "fov": 60
    },
    "highlight": ["p-001", "l-001"],
    "selection": ["p-001"]
  },
  "meta_info": {
    "schema_version": "1.0.0",
    "validated_by": "Validator v1.0.0",
    "generator": "3DSD-Viewer/1.0.0"
  }
}

### 6. API 仕様（ESM 構成）
interface ViewerAPI {
  loadJSON(data: object | string): Promise<void>;
  render(container: HTMLElement): void;
  toggleVisibility(element: 'points'|'lines'|'aux'|'document_meta', visible: boolean): void;
  select(uuid: string): void;
  highlight(uuids: string[]): void;
  exportViewState(): ViewState;
  resetCamera(): void;
}

interface ViewState {
  visible: Record<string, boolean>;
  camera: { position: [number, number, number]; target: [number, number, number]; fov?: number };
  highlight: string[];
  selection: string[];
}

## 7. 制約・前提

入力は常に schema-valid JSON に限る（非整合ファイルは Validator で弾く）。

カメラ・座標系は document_meta.coordinate_system に準拠。

JSON サイズ上限：10MB。

使用ライブラリ：three.js r160 以降、OrbitControls、dat.GUI、ajv。

UTF-8 / NFC 正規化前提。

## 8. 出力例（最小）
{
  "view_state": {
    "visible": { "points": true, "lines": true, "aux": false, "document_meta": true },
    "camera": { "position": [0, 2, 8], "target": [0, 0, 0] },
    "highlight": []
  },
  "meta_info": { "schema_version": "1.0.0" }
}


---
---


## Constraints 節（P1-05 修正版）

### 1. 初期化条件

* 起動時に schema-valid な 3DSS JSON を取得済であること（Validator 検証通過済）。
* three.js r160 以降の環境で `Renderer`, `Scene`, `Camera`, `Controls` が初期化済であること。
* OrbitControls が `camera` と `renderer.domElement` に正しくバインドされていること。
* Viewer 設定ファイル（例：`viewer_config.json`）が存在する場合は先にロードし、可視状態を初期化。
* `document_meta` の `schema_uri` が `https://3dsl.io/schema/3DSS.schema.json` に一致していること。
* `UIController.init()` 実行後に描画ループ (`requestAnimationFrame`) が開始されていること。

### 2. 制約条件

| 項目          | 内容                                                           |
| ----------- | ------------------------------------------------------------ |
| JSONサイズ     | 既定で 10MB 以下。超過時は読み込み警告 (VW001)。                              |
| 描画要素数       | `points + lines + aux` の総計が 50,000 を超える場合は警告 (VW002)。        |
| 描画間隔        | `render()` 呼び出しは 16ms 以下間隔を保証（60fps目標）。                      |
| カメラFOV      | 30〜90° に制限。範囲外設定時は自動補正。                                      |
| 座標範囲        | ±10⁶ を超える要素はスケーリング警告 (VW003)。                                |
| UI要素        | 表示制御チェックボックスは最大20項目。超過時はスクロール化。                              |
| ViewState   | `visible` オブジェクトに全要素キー（points/lines/aux/document_meta）を必ず含む。 |
| Validator呼出 | 非同期化（Promise）必須。同期呼出は禁止。                                     |

### 3. 例外条件

* JSONの読み込み失敗／形式不正 → `ViewerLoadError`。
* three.js コンポーネント初期化失敗 → `RenderInitError`。
* OrbitControlsが存在しない／バインド不可 → `ControlsAttachError`。
* `ValidatorBridge` 応答なし → `ValidationTimeoutError`。
* `view_state` の破損（visible欠損・構造不整合） → `ViewStateError`。
* DOM操作で要素が存在しない場合 → `UIBindingError`。

### 4. エラーハンドリング方針

| 区分              | 処理方針                                  |
| --------------- | ------------------------------------- |
| JSON破損／非整合      | 例外スロー → 起動画面に警告モーダルを表示。               |
| three.js初期化失敗   | コンソール出力後、再試行ダイアログ表示。                  |
| 軽微警告（要素超過・描画遅延） | `warnings[]` に記録し処理継続。                |
| Validator連携失敗   | 非同期でリトライ（最大3回）。失敗時は read-only モードに切替。 |
| 内部例外（描画ループ中）    | try/catch で抑止し、フレームスキップ後再描画。          |
| UI例外            | 対応するボタン／チェックボックスを一時無効化して継続。           |

### 5. 安全動作・復旧規約

* すべての例外を `try/catch` で捕捉し、Viewer がクラッシュしないことを保証。
* 描画停止時は最後に成功した `view_state` を保存し、再起動時に自動復元。
* `meta_info.last_event` に `{ type, code, timestamp }` を保存。
* UI は異常発生時に画面上部へ赤帯メッセージ（エラーコード＋説明）を表示。
* 再描画時に `view_state.visible` の状態を尊重し、強制初期化を行わない。
* Validator 再検証ボタン押下時のみ再起動的初期化を許可。


---
---


## Operation 節（P1-06c 初稿）

### 1. 実行モード概要

Viewer は構造データを三次元的に可視化するアプリケーションであり、
環境・利用目的に応じて以下の 3 モードで起動可能。
`process.env.MODE` またはクエリパラメータ `?mode=` で切替。

| モード          | 用途                                      | 実行例                                   |
| ------------ | --------------------------------------- | ------------------------------------- |
| **Localモード** | ローカルでのプレビュー確認                           | `npm run viewer`                      |
| **Codexモード** | Codex 生成コードの動作確認／GitHub CI上のスクリーンショット生成 | Codex実行時に `/code/viewer/` に出力         |
| **Webモード**   | ブラウザ上で配布・閲覧                             | `localhost:5175` または GitHub Pages で公開 |

### 2. 入出力仕様

| チャネル  | 入力                        | 出力                | 備考                                |
| ----- | ------------------------- | ----------------- | --------------------------------- |
| Local | schema-valid `.3dss.json` | `.viewstate.json` | `/data/` 以下に保存。                   |
| Codex | Codex生成の `.3dss.json`     | `.screenshot.png` | GitHub Actions 上で自動生成。            |
| Web   | URL指定または Drag&Drop        | `.viewstate.json` | `/cache/last_viewstate.json` に保存。 |

出力例：

```json
{
  "scene": "THREE.Scene",
  "view_state": {
    "visible": { "points": true, "lines": true, "aux": false, "document_meta": true },
    "camera": { "position": [2,3,6], "target": [0,0,0] }
  },
  "meta_info": {
    "last_event": { "type": "validated", "code": "VW000", "timestamp": "2025-10-23T12:30:00Z" }
  }
}
```

### 3. 環境設定

| 変数名              | 用途            | 既定値                        |
| ---------------- | ------------- | -------------------------- |
| `MODE`           | 実行モード         | `local`                    |
| `DATA_DIR`       | 入出力ディレクトリ     | `/data/`                   |
| `VALIDATOR_PATH` | Validator 呼出先 | `/code/validator/index.js` |
| `MODELER_PATH`   | Modeler 呼出先   | `/code/modeler/index.js`   |
| `LOG_DIR`        | 実行ログ          | `/logs/runtime/`           |
| `CACHE_DIR`      | 一時キャッシュ       | `/cache/`                  |
| `SCREENSHOT_DIR` | スクリーンショット保存先  | `/output/`                 |
| `MAX_FPS`        | 最大フレームレート     | 60                         |

### 4. 運用フロー

```mermaid
flowchart TD
  A1[起動: viewer.js] --> B1[UIController.init()]
  B1 --> B2[loadJSON()]
  B2 --> C1[ValidatorBridge.checkSchema()]
  C1 -->|OK| D1[SceneBuilder.buildScene()]
  C1 -->|NG| D2[エラーメッセージ表示]
  D1 --> D3[RenderEngine.startRenderLoop()]
  D3 --> E1[ユーザ操作 (カメラ, UI)]
  E1 --> E2[ViewStateManager.update()]
  E2 --> E3[exportViewState()]
  E3 --> F1[保存: /data/<uuid>.viewstate.json]
```

### 5. 出力・ログ

| 種別         | 出力先                                   | 説明                       |
| ---------- | ------------------------------------- | ------------------------ |
| ViewState  | `/data/<uuid>.viewstate.json`         | 現在の表示状態を保存。              |
| Screenshot | `/output/<uuid>.png`                  | Codex／CI 用出力。            |
| 実行ログ       | `/logs/runtime/viewer_runtime.log`    | 起動・描画・UIイベントを記録。         |
| バリデーションログ  | `/logs/runtime/viewer_validation.log` | ValidatorBridgeの検証結果を記録。 |

ログフォーマット：

```
[YYYY-MM-DD HH:MM:SS] [Viewer] EVENT:render FRAME:220 STATUS:OK
```

### 6. Codex／GitHub 運用統合

* Codex は Viewer を `/code/viewer/` に生成し、Modeler の出力 `.3dss.json` を読み込んで自動描画を実行。
* GitHub Actions 上では Headless モードでスクリーンショットを生成し、`/output/` に保存。
* CI例：

```bash
node /code/viewer/viewer.js --mode codex --input ./data/*.3dss.json --screenshot ./output/
```

* CI完了後、成果物は Artifacts として格納され、Codexタスクレポートに添付される。

### 7. 異常復旧・再試行設計

* JSON読込失敗時は `/cache/last_viewstate.json` を自動ロード。
* ValidatorBridge 失敗時は非同期で3回リトライ。
* 描画ループ中の例外は try/catch で抑止し、次フレームで再試行。
* `meta_info.last_event` に `{type:"error", code:"VWxxx"}` を記録。
* UI は例外時に赤帯メッセージと「再読み込み」ボタンを表示。


---
---


## Codex Directives 節（P1-06c 正規初稿）

以下は Codex に対して発行する Viewer 生成命令文 である。
出力対象は /code/viewer/ 配下。参照仕様は /schemas/3DSS.schema.json、
および本ファイル内「I/O定義」「Constraints」「Operation」節。

### Directive 01 — コアモジュール構成

目的: Viewer の三次元描画・UI・検証連携を包括する基本構成を自動生成。
出力場所: /code/viewer/

生成するモジュール:
  - index.js            → 起動エントリーポイント（mode判定含む）
  - viewerCore.js       → three.js 初期化とレンダリングループ
  - sceneBuilder.js     → points/lines/aux 描画要素生成
  - uiController.js     → dat.GUI / チェックボックスUI管理
  - validatorBridge.js  → Validator呼出ラッパ
  - modelerBridge.js    → Modeler連携インタフェース
  - logger.js           → 共通ログ出力
  - screenshot.js       → 画面キャプチャ保存


ES Module 構文を使用。index.js は MODE（local/codex/web）を環境変数で切替。

### Directive 02 — three.js 初期化・描画処理

目的: 3Dシーン構築と描画制御を定義。

viewerCore.js:
  - initRenderer(container)
  - initCamera()
  - initControls()
  - buildScene(data)
  - animate()


OrbitControls を導入し、カメラ操作を許可。
シーン構築は sceneBuilder.js に委譲し、animate() 内で requestAnimationFrame ループを管理。

### Directive 03 — SceneBuilder 実装

目的: points / lines / aux / document_meta を three.js オブジェクトとして構築。

sceneBuilder.buildScene(data):
  1. 各 point を SphereGeometry + MeshBasicMaterial で生成
  2. 各 line を BufferGeometry + LineBasicMaterial で生成
  3. aux 要素を Sprite または PlaneGeometry で表示
  4. document_meta の title を dat.GUI タイトルバーに反映


Z軸方向 ±10⁶ を超える要素はスケーリング警告を出す (VW003)。

### Directive 04 — UI 実装

目的: 表示制御パネルと表示要素切替を管理。

uiController.js:
  - initUI()
  - toggleVisibility(key)
  - updateStatus(info)


dat.GUI を使用し、visible.points visible.lines visible.aux visible.document_meta のチェックボックスを生成。
UI変更は viewerCore.updateVisibility() を呼ぶ。

### Directive 05 — Validator / Modeler 連携

目的: schema検証とプレビュー同期。

validatorBridge.validate(data):
  - import('/code/validator/index.js')
  - validateJSON(data)
  - 結果をUI上に表示（警告：黄、エラー：赤）

modelerBridge.receiveMessage(msg):
  - ModelerからのpostMessage(JSON)
  - parse → buildScene(data)


通信は postMessage ベースで非同期処理。

### Directive 06 — スクリーンショット保存

目的: GitHub Actions／Codex テスト用にスクリーンショットを保存。

screenshot.save(filePath):
  - renderer.domElement.toDataURL('image/png')
  - fs.writeFileSync(filePath)


CLIオプション --screenshot により /output/<uuid>.png へ保存。

### Directive 07 — エラー処理とログ出力

目的: 例外・警告を統一フォーマットで記録。

logger.log(level, message, context)
  - level: INFO/WARN/ERROR
  - 出力先: /logs/runtime/viewer_runtime.log


内部例外は try/catch で抑止し、UIへ赤帯メッセージを表示。
meta_info.last_event に {type:"error", code:"VWxxx"} を記録。

### Directive 08 — テスト・検証

目的: Codex生成後の自動テスト。

テスト仕様:
  - sample_valid.3dss.json を読み込み → OK
  - sample_invalid.3dss.json → NG
  - Modeler出力ファイルのプレビュー表示を確認
  - スクリーンショット生成成功を確認


---
# locked: true
# locked_date: 2025-10-24
# phase: P1-08 (承認済)
# modification_rule: 改訂はP4で `.rev1.md` として作成すること
---