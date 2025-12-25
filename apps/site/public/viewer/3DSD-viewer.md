================================
3DSD-viewer.md�E�Eiewer�E�E
================================

# 0 目皁E��適用篁E��

## 0.1 viewer の役割

3DSD-viewer�E�以下、viewer�E��E、E 
3DSL プロジェクトにおけめE**構造チE�Eタの閲覧・確認�E体騁E* に特化しぁE 
専用ビューワアプリケーションである、E

viewer は modeler によって生�EされぁE`.3dss.json` を読み取り、次を提供する！E

- 三次允E��造の忠実な可視化
- フレーム�E�時間層�E��E刁E��
- レイヤ�E�Eines / points / aux�E��E表示刁E��
- 構造全体�E俯瞰・ズーム・回転
- name / description / appearance / meta の確認（表示のみ�E�E

### 重要な前提

- viewer は **構造チE�Eタを絶対に変更しなぁE*
- 完�Eな **read-only�E�参照専用�E�アプリ**
- modeler と異なめE**保存�E出力機�Eを持たなぁE*
  �E�EI 状態�E永続化も禁止�E�E

UI 状態（選択�Eカメラ・表示設定）�E session 冁E�Eみ有効で、E 
構造チE�Eタに書き戻されることはなぁE��E


## 0.2 common 仕様との関俁E

viewer は次の斁E��に従う�E�E

- `/schemas/3DSS.schema.json`
- `/specs/3DSD-common.md`

common による規篁E��忠実に解釈して表示する�E�E

- 座標系�E�E+ up / freeXY�E�E
- lines / points / aux の意味
- frames の扱ぁE��表示フィルタ�E�E
- カメラ規篁E��投影・Z+ up・原点�E�E
- 座標変換・単位系

viewer は modeler と対称皁E��あり、E 
**生�E�E�Eodeler�E�Evs 閲覧�E�Eiewer�E�E* の役割刁E��が�E確である、E


## 0.3 適用篁E��

本仕様�E `/code/viewer/` の全モジュールに適用する�E�E

- Core�E�読込・状態管琁E��E
- Renderer�E�三次允E��画�E�E
- UI�E�Eiewer 専用 UI�E�E
- Validator�E�Etrict validation�E�E
- Utils�E�座標変換・色処琁E��E
- HUD�E�Exis / origin など視覚補助�E�E


## 0.4 非対象

viewer は閲覧専用アプリであり、以下�E仕様外！E

- 構造チE�Eタの編雁E
- 構造チE�Eタの保孁E
- UI 状態�E永続化
- annotation / comment / report などの編雁E��機�E
- modeler の冁E��動佁E
- スキーマ�E定義・変換

冁E�� API でめEupdate / remove / patch 等�E語彙�E使用禁止、E


## 0.5 設計方針（閲覧専用アプリとして�E�E

1. **参�E専用**  
   構造チE�Eタは immutable。書き換え禁止、E

2. **忠実表示**  
   modeler 出力�E値を改変せず、可能な篁E��で忠実に表示する、E 
   描画上�E補助は、構造チE�Eタを不変�Eまま扱ぁE��E��に限定する、E

3. **高速応筁E*  
   frame / camera / visibility の UI 操作を即時反映、E

4. **UI 状態と構造チE�Eタの完�E刁E��**  
   UI 状態（選択�Eカメラ・visibility�E��E uiState のみで保持し、E 
   JSON に混入させなぁE��E

5. **外部通信の扱ぁE��スキーマ取得禁止�E�E*

- viewer runtime は **スキーマ取征E* めE��部リソースの自動取得を行わなぁE��Ethree.js` めEschema は vendor/local を参照�E�、E
- `.3dss.json` の取得（ローカル/リモーチE埋め込み�E��E **Host�E�Estro/HTML 側�E�責勁E* とする、E
- runtime ぁEURL を受けて `fetch` する補助 API�E�侁E `bootstrapViewerFromUrl`�E�を持つ場合でも、行うのは **斁E��本体�E取得�Eみ** とし、スキーマ取得�E追跡通信・追加フェチE��は禁止する、E

## 0.6 アーキチE��チャ�E�レイヤと責務！E

viewer は次のレイヤに刁E��する�E�E

- **entry**: Host から叩かれる起動口�E�侁E `bootstrapViewer`�E�E
- **hub**: UI と core/renderer の雁E��（ロジチE��禁止�E�E
- **core**: canonical state とビジネスロジチE���E�EDSS は read-only�E�E
- **renderer**: three.js 描画専用�E�状態�E描画キャチE��ュのみ�E�E
- **ui**: DOM 入劁EↁEhub API への橋渡し！Eev harness / Host 側�E�E

### 依存方向�E規篁E��禁止を含む�E�E

- 許可�E�正方向！E
  - ui ↁEentry / hub
  - entry ↁEhub / core / renderer
  - hub ↁEcore / renderer
- 禁止�E�絶対�E�E
  - core ↁEhub / renderer
  - renderer ↁEcore / hub
  - hub ↁEui
  - ui ↁErenderer�E�Eick も含めE**忁E�� hub 経由**�E�E
  - entry ↁEui�E�EI は Host 側責務！E


## 0.7 依存注入�E�EI�E�と composition root

- **composition root は entry�E�Eootstrap�E�E* とする、E
- core 冁E�Eモジュール同士は **import で結�EなぁE*。忁E��な依存�E `createXxx({ ...deps })` で **引数注入**する、E
- hub は `{ core, renderer }` めEDI で受け取り、`core/*` めE`renderer/*` めEimport しなぁE��E
- helper は **同一ファイル冁E��閉じる純関数**のみ許可�E�別モジュール化して import するのは禁止�E�、E


## 0.8 ライフサイクル規紁E��Etart/stop/dispose�E�E

- `hub.start()/stop()/dispose()` は **idempotent**�E�褁E��回呼んでも安�E�E�とする、E
- `stop()` は RAF 停止のみ�E�EebGL 賁E���E保持�E�、E
- `dispose()` は stop + renderer 賁E��解放。以後�E `start/stop/resize` は no-op、E
- `dispose()` 後�E `pickObjectAt()` は常に `null`�E�例外禁止�E�、E
- `onXChanged` 系は **unsubscribe を返す**�E�積み上げリークを防ぐ）、E


## 0.9 状態所有権�E�Eingle-writer を含む�E�E

- 3DSS document は **immutable**�E�Ealidate 後に deepFreeze し、以後書き換え禁止�E�、E
- canonical state は **core が所朁E*する�E�侁E `uiState`�E�、E
- single-writer:
  - `uiState.visibleSet` は **core.recomputeVisibleSet() のみ**が更新してよい、E
  - `uiState.runtime.isFramePlaying` は **core.frameController のみ**が更新してよい、E
- renderer は three.js オブジェクトと描画キャチE��ュのみを所有し、core state は受け取って反映するだけ、E


---

# 1 シスチE��全体構�E�E��E部アーキチE��チャ�E�E

viewer の冁E��構造は、次の **5レイヤ** と **2種類�EエントリポインチE*から構�Eされる、E

- **entry 層**
  - `bootstrapViewer` / `bootstrapViewerFromUrl`�E�Eomposition root�E�E
- **hub 層**
  - `viewerHub`�E�EI への公閁EAPI 雁E��E��ロジチE��禁止�E�E
- **core 層**
  - canonical state�E�EiState�E�と吁E�� controller / cameraEngine
  - 3DSS document は immutable�E�Eead-only�E�E
- **renderer 層**
  - three.js 描画�E�Ecene/camera/objects�E�！EmicroFX�E�描画専用キャチE��ュ�E�E
- **ui 層�E�Eost / dev harness�E�E*
  - pointerInput / keyboardInput / gizmo / picker / timeline 筁E
  - DOM 入劁EↁE`hub.core.*` / `hub.pickObjectAt` への橋渡ぁE

補助層�E�Eore 冁E��ユーチE��リチE���E�！E
- Validator�E�EJV strict validation�E�E
- structIndex / utils�E�Euid index / frameRange 等！E

エントリポイント！E

- `bootstrapViewer(canvasOrId, document3dss, options?)`
- `bootstrapViewerFromUrl(canvasOrId, url, options?)`

どちらも `viewerHub` を返し、外部操作�E **`hub.core.*` と `hub.pickObjectAt`�E�およ�E `hub.viewerSettings.*`�E�に限宁E*する、E


## 1.1 モジュール構�E

viewer 実裁E�Eおおよそ次のモジュール群に刁E��れる、E

| レイヤ / モジュール | 代表ファイル侁E| 役割 |
|--------------------|----------------|------|
| Boot               | `runtime/bootstrapViewer.js` | canvas と 3DSS を受け取めEruntime を起動し、`viewerHub` を返す。レンダーループ開始や PointerInput / KeyboardInput の接続�E行わず、Host / dev harness 側の責務とする |
| Hub                | `runtime/viewerHub.js` | Core / Renderer をまとめて外部に公開するファサード。`hub.core.*` API と `hub.start/stop` を束ねめE|
| Core               | `runtime/core/*.js` | 3DSS 構造 state�E�Emmutable�E�と uiState�E�Eiewer 専用 state�E��E管琁E��各種 Controller / CameraEngine を含む�E�EointerInput / KeyboardInput は UI レイヤ `ui/*` に刁E���E�E|
| Renderer           | `runtime/renderer/context.js` + `renderer/microFX/*` | three.js による描画、microFX、selection ハイライチE|
| UI�E�Eev harness�E�E | `viewerDevHarness.js` `ui/gizmo.js` `ui/pointerInput.js` `ui/keyboardInput.js` など | dev 用 HTML / HUD / ボタン類。PointerInput / KeyboardInput / gizmo / タイムラインで受けた�Eウス / キー入力を **`hub.core.*` / `hub.pickObjectAt` 経由で** runtime に橋渡しすめE|
| Validator          | `runtime/core/validator.js` | `/schemas/3DSS.schema.json` に対する strict full validation |
| Utils / Index      | `runtime/core/structIndex.js` など | uuid インチE��クス構築、frame 篁E��検�Eなどの補助機�E |
| HUD / 視覚補助     | `renderer/microFX/*` | axis / marker / bounds / glow / highlight 等、構造とは無関係な viewer 専用描画 |

PointerInput / KeyboardInput は `ui/pointerInput.js` / `ui/keyboardInput.js` に置き、UI レイヤ�E�Eost / dev harness�E��E一部とみなす、E 
責務としては「�E力レイヤ」�E一部であり、E*Host / dev harness から `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` で生�E・接続すめE*、E 
`runtime/bootstrapViewer.js` めE`runtime/core/*` からは import / new してはならなぁE��E

※ 実ファイル構�Eは `viewer/runtime/*`・`viewer/ui/*` のスケルトンに準拠する、E 
※ three.js / AJV とぁE��た外部ライブラリは runtime からのみ利用し、UI から直接触らなぁE��E



### 1.1.1 存在しなぁE��ジュール�E��E確に禁止�E�E

viewer には次のモジュールは存在しなぁE��追加も禁止�E�！E

- Exporter�E�構造チE�Eタの保存�E書き�Eし！E
- Editor�E�構造編雁E��E
- Annotation / Report�E�注釈�Eレポ�Eト！E
- Snapshot / Export�E�スクリーンショチE��生�E等、viewer 独自出力！E


## 1.2 Core�E�Eead-only state�E�E

Core は「構造 state」と「UI state (uiState)」�E 2 系列だけを扱ぁE��E

- **構造 state�E�Etruct�E�E*

  - strict validation 済み .3dss.json をそのまま保持する、E
  - トップレベル構造�E�E
    - `lines[]`
    - `points[]`
    - `aux[]`
    - `document_meta`
  - deep-freeze されぁEread-only オブジェクトとして扱ぁE��E 
    要素の add / update / remove / 座標補正などは一刁E��わなぁE��E

- **UI state�E�EiState�E�E*

  - viewer が「どぁE��せてぁE��か」�E状態だけを持つ、E
  - 例！E
    - `selection`�E�選択中 uuid と kind�E�E
    - `frame.current` / `frame.range`
    - `cameraState`�E�位置・向き・FOV 等！E
    - `filters`�E�Eines/points/aux の ON/OFF�E�E
    - `runtime`�E�Erame 再生中か、�E動カメラ中ぁE等！E
    - `mode`�E�Eacro / micro�E�E
     ※ meso は封E��拡張の予紁E��とし、本仕様（現行実裁E��E���E�では扱わなぁE��E
    - `microState`�E�EicroFX の入力！E
    - `viewerSettings`�E�EineWidth めEmicroFX 設定など�E�E
    - `visibleSet`�E�現在描画対象となってぁE�� uuid 雁E���E�E

構造 state と uiState の詳細は第 2 章・第 5 章にて定義する、E 
本章では、E*struct は不変／uiState だけが変化する**」とぁE��関係だけを固定する、E


## 1.3 冁E��依存関俁E

依存方向�E常に「上位レイヤ ↁE下位レイヤ」�E一方向とする、E

- UI / dev harness レイヤ�E�Eviewer_dev.html` / `viewerDevHarness.js` / gizmo / timeline / HUD DOM�E�E
  - ↁE`viewerHub`�E�Ehub.core.*` / `hub.pickObjectAt`�E�E
- runtime Boot / Core�E�EiState / 吁E�� Controller / CameraEngine / Visibility / Selection / Mode / Micro �E�E
  - ↁEstruct�E�Emmutable 3DSS�E�E
  - ↁERenderer�E�EendererContext + microFX�E�E
- three.js / WebGL

PointerInput / KeyboardInput は「�E力イベント集紁E��イヤ」として、E 
window / canvas の DOM イベントを 1 箁E��で受け取り、E 
忁E�� `hub.core.*` だけを叩く！EameraEngine めEthree.js を直接触らなぁE��、E

Validator は「runtime 起動前の読み込みフェーズ」にだけ挿入される！E

- JSON ローチEↁEValidator�E�Etrict full validation�E��E OK のとき�Eみ Core に渡ぁE

HUD / microFX は Renderer の一部として扱ぁE��E 
構造 state には一刁E��存させなぁE��座標参照はしても、構造の変更はしなぁE��、E


## 1.4 吁E��ジュールの責勁E

### 1.4.1 Boot�E�EootstrapViewer.js�E�E

- `bootstrapViewer(canvasOrId, document3dss, options?)`

  - 役割�E�E
    - canvas 解決�E�EOM 要素 or id 斁E���E�E�E
    - **validate3DSS を常に実衁E*�E�EGなめEthrow。hub は生�EしなぁE��E
    - `options.strictValidate === true` また�E `options.validateRefIntegrity === true` の場合�Eみ **validateRefIntegrity** を実行！EGなめEthrow�E�E
    - validate 後に **deep-freeze�E�Emmutable化！E* する
    - structIndex�E�Euid インチE��クス / frame 篁E���E��E構篁E
    - uiState の初期匁E
    - controller 群 / cameraEngine / cameraController / viewerSettingsController の初期化！Eore 冁E��互依存�E import で結�EぁEDI で渡す！E
    - rendererContext 初期匁EↁE`syncDocument(document, indices)` ↁE`getSceneMetrics()`
    - `metrics` から初期カメラ state を決定し、E*`cameraEngine.setState(initialState)`** で確定する！Eetrics ぁEnull の場合�E fallback 規篁E��E
    - `core.recomputeVisibleSet()` めE1 回呼んで初期 visibleSet を確定すめE
    - `createViewerHub({ core, renderer })` を呼び、hub を生成して返す
    - **レンダーループ開始�E行わなぁE*�E�Ehub.start()` は Host / dev harness の責務！E
    - `options.devBootLog === true` の場合、起動ログ�E�EOOT / MODEL / CAMERA / LAYERS / FRAME�E�を 1 回ずつ出力すめE

  - options�E�E
    - `devBootLog?: boolean`
    - `logger?: (line: string) => void`
    - `strictValidate?: boolean`
    - `validateRefIntegrity?: boolean`

- `bootstrapViewerFromUrl(canvasOrId, url, options?)`

  - 役割�E�E
    - `fetch(url)` ↁE`res.ok===false` は throw�E�ETTP status を含める�E�E
    - `res.json()` した document めE`bootstrapViewer(canvasOrId, document, options2)` に渡ぁE
    - `options2.strictValidate` の default は **true**�E�未持E��時は参�E整合性まで含めた strict を優先！E

  - 注意！E
    - schema 取得などの追加通信は禁止�E�Ealidator はローカル同梱 schema を参照して初期化する！E



### 1.4.2 viewerHub�E�Euntime/viewerHub.js�E�E

- runtime 冁E��にある Core / Renderer / CameraEngine 等をまとめて管琁E��、E 
  外部には **hub 1 オブジェクトだぁE* を見せる、E

- 代表皁E��公開インターフェース�E�E

  - `hub.start()` / `hub.stop()` … アニメーションループ開始�E停止
  - `hub.pickObjectAt(ndcX, ndcY)` … NDC 座標から構造要素の uuid を取征E
  - `hub.core.frame.*`
  - `hub.core.camera.*`
  - `hub.core.selection.*`
  - `hub.core.mode.*`
  - `hub.core.micro.*`
  - `hub.core.filters.*`
  - `hub.core.runtime.*`

- UI / dev harness / host アプリは **hub 経由でしか runtime を操作してはならなぁE*、E

- `hub.pickObjectAt` は renderer のヒット結果であっても、E
  `visibilityController.isVisible(uuid) === false` の場合�E **忁E�� null** を返す�E�不可視要素は選択不可を保証�E�、E


### 1.4.3 Core

- strict validation 済み 3DSS めEstruct として保持�E�Eeep-freeze�E�E
- uiState の生�E・更新
- 吁E�� Controller による状態�E移�E�E
  - frameController … frame の刁E��替え�E再生
  - selectionController … selection の唯一の正規ルーチE
  - visibilityController … frame / filter から visibleSet を�E計箁E
  - modeController … macro / meso / micro モード管琁E
  - microController … microFX 用の microState を計箁E
  - CameraEngine … cameraState の唯一のソースオブトゥルース

Core は three.js を直接は知らず、Renderer に対して「状態」を渡すだけとする、E


### 1.4.4 Renderer

- three.js / WebGL による描画処琁E��拁E��E
- 主な責務！E
  - struct + structIndex をもとに Object3D 群を構篁E
  - `applyFrame(visibleSet)` による表示・非表示の刁E��替ぁE
  - `updateCamera(cameraState)` によるカメラ反映
  - `applyMicroFX(microState)` による microFX 適用 / 解除
  - `applySelection(selectionState)` による macro モード用ハイライチE
  - `pickObjectAt(ndcX, ndcY)` によるオブジェクト選択！Eaycasting�E�E

Renderer は構造 state を変更せず、描画属性�E��EチE��アル・visible・renderOrder 等）�Eみを操作する、E


### 1.4.5 UI / dev harness

- 開発用 viewer�E�Eiewer_dev.html�E�や封E��の Astro ペ�Eジなど、E 
  HTML / DOM サイド�E実裁E��拁E��、E

- 代表モジュール�E�E
  - `pointerInput` … canvas 上�Eマウス操佁EↁEhub.core.camera / hub.pickObjectAt
  - `keyboardInput` … keydown ↁEhub.core.frame / hub.core.mode / hub.core.camera
  - `gizmo` … 画面右下�Eカメラギズモ ↁEhub.core.camera.*
  - `picker` … click ↁEhub.pickObjectAt ↁEhub.core.selection.*
  - `timeline` … frame 再生 UI ↁEhub.core.frame.*

UI は viewerHub の公閁EAPI のみを利用し、Core / Renderer に直接触れてはならなぁE��E


### 1.4.6 Validator

- `/schemas/3DSS.schema.json` は **ローカル同梱**を参照し、ネチE��ワーク取得�E行わなぁE��E
- `bootstrapViewer` は validate3DSS を常に実行する、E
- 参�E整合性�E�Euid ref 等）�E `strictValidate` また�E `validateRefIntegrity` 持E��時のみ実行する、E



### 1.4.7 Utils / Index / HUD

- Utils / Index
  - `structIndex` による uuid ↁEkind / element 参�E
  - frame 篁E��検�E�E�Ein / max�E�、座標系ユーチE��リチE��

- HUD / microFX
  - axis / origin / bounds / glow / highlight などの視覚補助
  - すべて Renderer 冁E��の three.js オブジェクトとして実裁E
  - 3DSS 構造には一刁E��き戻さなぁE��「見え方」専用�E�E


## 1.5 I/O�E�Eiewer�E�概要E��E

- 入力！E`.3dss.json`�E�Etrict full validation 済み 3DSS 構造チE�Eタ�E�E
- 出力：無ぁE

UI 状態�Eカメラ・visibility などは **セチE��ョン冁E�E uiState にだけ保持** し、E 
ファイル保存や外部出力�E行わなぁE��E

詳細な I/O ポリシーは第 6 章にて定義する、E


## 1.6 禁止事頁E��Eiewer 全体！E

viewer は次の行為を一刁E��ってはならなぁE��E

1. 構造チE�Eタの変更�E�Edd / update / remove�E�E
2. 構造チE�Eタの保存！Exporter�E�E
3. 編雁E��ベント！Endo / redo / duplicate 等）�E実裁E
4. UI 状態�E JSON 出力�E永続化
5. annotation / comment / report 等�E生�E
6. viewerSettings めEJSON 化して保存（永続化�E�すること
7. extension の意味解釈�E生�E・補完（構造変更に相当！E
8. normalize / 推測 / 補宁E/ prune / reorder 等�E生�E処琁E
9. 未来スキーマ頁E��の推測・解釈！Eemantic inference�E�E

viewer は **完�E read-only の表示裁E��** であり、E 
viewer 独自惁E��は uiState 冁E��にのみ保持してよい�E�構造チE�Eタへの混入禁止�E�、E

## 1.7 起動フロー�E�Eiewer_dev.html ↁEviewerDevHarness.js ↁEbootstrapViewer ↁEviewerHub�E�E

### 1.7.1 エントリ経路の固宁E

`viewerDevHarness.js` ぁE`bootstrapViewerFromUrl` を呼び、得られた `viewerHub` に対して  
`hub.start()` を呼び出し、さらに `PointerInput` / `KeyboardInput` を構築して canvas / window にイベントを接続する、E

1. `viewer_dev.html`  
   - dev 用 DOM 骨格�E�ED canvas・ログ領域・ボタン等）を定義する、E

2. `viewerDevHarness.js`  
   - `window.load`�E�また�E `DOMContentLoaded`�E�後に UI 要素を�Eととおり取得し、E 
     `bootstrapViewerFromUrl(canvasId, jsonUrl, options)` めE1 度だけ呼び出す、E
   - 得られた `viewerHub` をローカル変数およびグローバル�E�Ewindow.hub` 等）に expose して、E 
     dev 用 UI / コンソールから診断できるようにする、E
   - `hub.start()` を呼び出して render loop�E�ErequestAnimationFrame`�E�を開始する、E
   - `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` を生成し、E 
     `attach()`�E�あれ�E�E�を呼んで canvas / window に pointer / key イベントを接続する、E
   - PointerInput / KeyboardInput / gizmo / タイムラインなどで受けた�E力を  
     `hub.core.*` / `hub.pickObjectAt` にマッピングする、E

3. `runtime/bootstrapViewer.js`  
   - 3DSS の strict validation�E�EbootstrapViewerFromUrl` 経由の場合）、E
   - struct の deep-freeze / `structIndex` 構築、E
   - `rendererContext` / `uiState` / `CameraEngine` / 吁E�� Controller の初期化、E
   - `createViewerHub({ core, renderer })` を呼び出し、`hub` を返す、E 
     �E�ここでは `hub.start()` を呼ばず、レンダーループ制御は Host / dev harness 側の責務とする�E�E

4. `viewerHub`  
   - `hub.core.*` と `hub.pickObjectAt` を通じて、E 
     frame / camera / selection / mode / micro / filters / runtime API を�E開する、E
   - `hub.start()` / `hub.stop()` で render loop�E�ErequestAnimationFrame`�E�を開始�E停止する、E

こ�E経路以外かめECore / Renderer / CameraEngine めE`new` / 直接呼び出しすることは禁止とする、E 
PointerInput / KeyboardInput は **UI レイヤ�E�EiewerDevHarness / 本番 Host�E�から�Eみ** `new` してよく、E 
runtime 層�E�Eruntime/*`�E�かめEimport / `new` してはならなぁE��E

忁E�� `bootstrapViewer` / `bootstrapViewerFromUrl` めEruntime の唯一の入口とし、E 
返ってきた `hub` に対して Host 側ぁE`hub.start()` を呼び出すことでレンダーループを開始する、E

---

### 1.7.2 viewerDevHarness.js の責勁E

`viewerDevHarness.js` は「dev 用ホスト」であり、runtime とは明確に刁E��する、E

- 役割�E�E
  - dev 用 HTML�E�Eviewer_dev.html`�E�に配置された各種 DOM�E�Erame スライダ・filter ボタン・HUD・gizmo 等）を取得する、E
  - `bootstrapViewerFromUrl(canvasId, jsonUrl, options)` めE1 回だけ呼び出し、E 
    得られた `viewerHub` をローカル変数および `window.hub` に保持する、E
  - `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` を生成し、E 
    canvas / window に pointer / key イベントを接続する、E
  - `hub.core.frame.*` / `hub.core.filters.*` / `hub.core.mode.*` / `hub.core.selection.*` /  
    `hub.core.camera.*` などめEUI イベント（�Eタン / スライダ / gizmo 等）に接続する、E
  - dev 用 HUD / メタパネル / ログ表示�E�EOOT / MODEL / CAMERA / LAYERS / FRAME�E�を実裁E��る、E
  - `hub.start()` / `hub.stop()` を呼び出し、dev viewer のライフサイクル�E�起勁E/ 再起勁E/ 停止�E�を管琁E��る、E
  - dev viewer�E�Eiewer_dev.html�E��E、E
  fetch 失敗�EJSON パ�Eスエラー・strict validation NG の
  ぁE��れ�E場合も struct を一刁E��持せず hub を生成しなぁE��E
  右ペインにはエラー種別�E�EETWORK_ERROR / JSON_ERROR / VALIDATION_ERROR�E�E
  とメチE��ージを表示し、`(no struct loaded)` と明示する、E


- 制紁E��E
  - `runtime/core/*` / `runtime/renderer/*` を直接 import しなぁE 
    �E�Euntime への入口は `runtime/bootstrapViewer.js` の `bootstrapViewer*` のみとする�E�、E
  - three.js / AJV / CameraEngine を直接触らなぁE��E
  - 3DSS 構造�E�Ecore.data` / `structIndex`�E�を変更しなぁE��EiState の参�Eと表示だけ行う�E�、E
  - PointerInput / KeyboardInput のロジチE��を上書きせず、�E劁EↁE`hub.core.*` / `hub.pickObjectAt` の流れを保つ、E

概略フローは次の通り�E�E

```
viewer_dev.html      �E�開発用 DOM 骨格�E�E
  ↁE
viewerDevHarness.js  �E�Eev 用ハ�Eネス�E�bootstrapViewerFromUrl / hub.start / PointerInput / KeyboardInput�E�E
  ↁE
bootstrapViewerFromUrl(canvas, modelPath, options)
  ↁE
viewerHub�E�Eub�E�E
  ↁE
hub.start()          �E�レンダーループ開始！E
```


## 1.8 dev viewer と本番 viewer の関俁E

viewer runtime 自体�Eホスト非依存�E共通コンポ�Eネントであり、E
dev viewer はそ�E一実裁E��に過ぎなぁE��とを仕様として明示する、E

- 共有するもの�E�E
 - runtime/bootstrapViewer.js
 - runtime/viewerHub.js
 - runtime/core/*
 - runtime/renderer/*
- dev viewer 固有�Eも�E�E�E
 - viewer_dev.html�E�E カラムレイアウト、メタパネル、HUD 等！E
 - viewerDevHarness.js
 - dev 用 HUD / gizmo / 吁E��ボタン類！Ei/gizmo.js など�E�E

### 1.8.1 共通エントリポインチE
すべてのホスト�E、次の 共通エントリ API から viewer runtime を起動する、E
- bootstrapViewer(canvasOrId, threeDSS, options?) ↁEhub
 - strict validation 済みの 3DSS オブジェクトを受け取り、viewerHub を構築して返す、E
- bootstrapViewerFromUrl(canvasOrId, url, options?) ↁEPromise<hub>
 - url から .3dss.json めEfetch し、strict validation を実行したうえで
bootstrapViewer を呼び出すラチE��ー、E

dev viewer も本番 viewer も、これ以外�E経路で runtime を起動してはならなぁE��E

### 1.8.2 dev viewer�E�開発用ハ�Eネス�E��E起動フロー
dev viewer の起動時、viewerDevHarness.js は概�E次のように動く�E�E
1. window.addEventListener('load', boot) で 1 回だぁEboot() を起動する、E
2. boot() 冁E��
 - メタパネル / HUD / frame スライダ / filter ボタン等�E DOM を取得する、E
 - const canvasId = "viewer-canvas";
 - const jsonUrl = "../3dss/sample/core_viewer_baseline.3dss.json";�E�Easeline 確認時�E�E
 - bootstrapViewerFromUrl(canvasId, jsonUrl, { devBootLog:true, devLabel:"viewer_dev", modelUrl:jsonUrl, logger:devLogger }) を呼ぶ、E
3. devLogger(line) は
 - console.log(line) + メタパネルへの追記！EppendModelLog(line)�E�を行う、E

こ�Eように、dev viewer は「ログ・HUD・コントロール類が追加された�Eスト」であり、E
runtime 自体には一刁E��を�EれなぁE��E

### 1.8.3 本番 viewer�E�Estro / 埋め込み�E��E起動フロー

本番 viewer�E�Estro サイトや他�Eストアプリ�E�も、E
基本皁E��は dev viewer と同じエントリ API を用ぁE��、E

Host�E�Estro / React / plain HTML 等！E
  ↁE
bootstrapViewerFromUrl(canvasRef, modelUrl, options)
  ↁE
viewerHub�E�Eub�E�E
  ↁE
host 側から hub.core.* を利用して UI と連携
  ↁE
hub.start()          �E�レンダーループ開始！E


- Host�E�Estro / React / plain HTML 等！E
 - 自身のレイアウト�E中に <canvas> もしく�E canvas を含むコンチE��を�E置する、E
 - マウント完亁E��に bootstrapViewerFromUrl また�E
事前に fetch + validation 済みの 3DSS を用ぁE�� bootstrapViewer を呼ぶ、E
 - 得られた hub の core.* API を、�E前�E UI コンポ�Eネント（タイムライン・レイヤトグルなど�E�に接続する、E
 - fetch 失敁E/ JSON パ�Eスエラー / strict validation NG の
 ぁE��れでも、hub を生成せぁEcanvas を描画しなぁE
 �E�部刁E��画しなぁE��。右ペイン File に `ERROR: <種別>` を表示し、E
 HUD に `ERROR` バッジを�Eすだけとし、E
 struct�E�EDSS document�E��E core に保持しなぁE��E


- 制紁E��E
 - dev harness と同様、runtime には bootstrapViewer* / hub.core.* でのみアクセスする、E
 - 構造チE�Eタ�E�EDSS�E��E strict read-only とし、viewer から書き換えなぁE��E

## 1.9 baseline 起動時の固定条件

本節では、dev viewer�E�Eiewer_dev.html�E�において
core_viewer_baseline.3dss.json を読み込んだときに
「毎回同じ初期画面」が再現されるよぁE��するための条件を定義する、E

### 1.9.1 入力ファイルの固宁E

1. dev 起動時の baseline 入力�E、常に
../3dss/sample/core_viewer_baseline.3dss.json とする�E�実パスはリポジトリ構�Eに追従）、E

2. 他�EサンプルをロードすめEUI があっても、E
「起動直後に自動でロードされるファイル」�E上訁E1 本に限定する、E

3. 読み込んだファイルパスは起動ログに忁E�� 1 行�E力する、E

### 1.9.2 カメラ初期状態�E固宁E

core_viewer_baseline.3dss.json 読み込み直後�Eカメラ状態�E、E
シーン墁E���E�Eounding sphere�E�から算�EされめE決定的な初期値 として固定する、E

- 投影方弁E PerspectiveCamera
- up ベクトル: (0, 0, 1) // Z+ を絶対上とみなぁE
- target: シーン中忁Emetrics.center�E�取得できなぁE��合�E (0, 0, 0)�E�E
- 距離: シーン半征Emetrics.radius の紁E2.4 倍！Eistance = radius * 2.4。radius 不�E時�E 4�E�E
- 視野见E fov = 50�E�Eeg�E�E

初期カメラ state は renderer の `getSceneMetrics()` から算�Eし、E
`cameraEngine.setState(initialState)` により確定される、E

こ�E初期値は 3DSS 構造へ書き戻さず、E
あくまで「viewer runtime 冁E�E uiState�E�EameraState�E�」としてのみ保持される、E


#### 1.9.3 frame / layer 初期状慁E
baseline 起動直後�E frame / layer 状態�E次のとおり固定する、E
- frame
 - detectFrameRange(struct) により {min,max} を求める、E
 - uiState.frame.current = frameRange.min�E�最小フレームから開始）、E
 - uiState.runtime.isFramePlaying = false�E��E甁EOFF�E�、E
- layer / filters
 - filters.types.points = true
 - filters.types.lines = true
 - filters.types.aux = true
 - つまり、�E生やフィルタ操作を行う前�E「�Eレイヤ ON」�E状態から始まる、E

### 1.9.4 起動ログ�E�EOOT / MODEL / CAMERA / LAYERS / FRAME�E�E

viewer runtime は、�E期化完亁E��に options.devBootLog === true の場合、E
次の 5 レコードを 忁E��こ�E頁E��で 1 回だぁE出力する、E
1. BOOT <label>
 - <label> は options.devLabel があれ�Eそれを用ぁE��なければ "viewer_dev" 等�E既定値、E
2. MODEL <modelUrl>
 - <modelUrl> は options.modelUrl があれ�Eそれを用ぁE��なければ url�E�EromUrl の引数�E�、E
3. CAMERA {...}
 - cameraEngine.getState() 相当�E payload めEJSON 斁E���Eとして出力する、E
  - {"position":[x,y,z],"target":[tx,ty,tz],"fov":50} のような形、E
4. LAYERS points=on/off lines=on/off aux=on/off
5. FRAME frame_id=<number>

これら�E「構造化ログイベント」として runtime 冁E��から logger に渡される、E
- options.logger が関数の場吁E
 ↁE吁E��を logger(line) として呼び出す、E

- options.logger が未持E���E場吁E
 ↁE既定で console.log(line) を用ぁE��、E
dev viewer�E�Eiewer_dev.html�E�では通常、E

- logger = devLogger
�E�Eonsole.log + メタパネルへの append�E�E
を指定し、Model パネルに

```text
BOOT  viewer_dev
MODEL ../3dss/sample/core_viewer_baseline.3dss.json
CAMERA {...}
LAYERS points=on lines=on aux=on
FRAME  frame_id=0
```

のような行が並ぶことを確認できる、E

同じビルチE+ 同じ baseline ファイルに対して
これら�Eログ冁E��が毎回一致することをもって「起動条件が固定されてぁE��」とみなす、E


---

# 2 チE�Eタ構造とスキーマ準拠�E�閲覧側視点�E�E

viewer は生�Eアプリである modeler と異なり、E 
入力された 3DSS チE�Eタをそのまま読み取り、可視化するだけ�Eアプリケーションである、E

本章では viewer 側から見た 3DSS チE�Eタの扱ぁE��・準拠篁E��・冁E��保持方式を定義する、E 
viewer は構造編雁E�E補完�E修復を一刁E��わなぁE��E


## 2.1 閲覧対象となめE3DSS チE�Eタ構造

viewer が扱ぁE��造チE�Eタは、E 
**modeler が生成しぁE`.3dss.json` に完�E依孁E* する、E

最上位構造�E�E

1. `lines`�E�関係要素  
2. `points`�E�存在要素  
3. `aux`�E�補助要素  
4. `document_meta`�E�管琁E��報

viewer はこれらを

- 読み取り�E�Etrict validation�E�E
- 可視化

の 2 段階だけを拁E��し、編雁E�E行わなぁE��E

3DSS 自体�E仕様�E別紙、EDSS 仕様書�E�E3DSS.schema.json`�E�」に委�E、E 
viewer はそ�E **閲覧専用クライアンチE* として振る�EぁE��E


## 2.2 チE�Eタ読込時�E処琁E��ロー

viewer は構造チE�Eタの読込時に次の処琁E��行う�E�E

1. JSON 読込�E�EromUrl の場合�E fetch ↁEjson�E�E
2. Validator による validation�E�Ealidate3DSS を常に実行！E
3. �E�指定時のみ�E�参照整合性チェチE���E�EalidateRefIntegrity�E�E
4. Core に immutable state としてロード！Eeep-freeze�E�E
5. structIndex / frameRange を構篁E
6. Renderer による三次允E��ーン構築！EyncDocument�E�とシーンメトリクス算�E�E�EetSceneMetrics�E�E
7. 初期 cameraState を確定し、cameraEngine.setState(initialState) を行う
8. core.recomputeVisibleSet() めE1 回呼び、�E朁EvisibleSet を確定すめE
9. hub を返す�E�描画ループ開始�E行わなぁE��Eost ぁEhub.start() を呼ぶ�E�E


### 2.2.1 strict full validation の冁E��

viewer は `/schemas/3DSS.schema.json`�E�ローカル同梱�E�を正とする Validator�E�EJV�E�により validation を行う、E

- `validate3DSS(document)` は **常に実衁E*�E�EGなめEthrow、hub は生�EしなぁE��E
- `validateRefIntegrity(document)` は **options.strictValidate===true また�E options.validateRefIntegrity===true のとき�Eみ** 実行！EGなめEthrow�E�E
- `bootstrapViewerFromUrl` は `strictValidate` の default めE**true** とする

AJV は少なくとも次を満たす�E�E

- `removeAdditional: false`
- `useDefaults:      false`
- `coerceTypes:      false`

つまり、�E劁EJSON を書き換える方向�Eオプションは一刁E��わなぁE��E


### 2.2.2 バ�Eジョンおよび schema_uri の扱ぁE

- `document_meta.schema_uri`
  - `.../schemas/3DSS.schema.json` を指すことを要求する（ファイル名�E固定！E
  - schema_uri の **MAJOR 不一致**は読込拒否
  - MINOR/PATCH は、strict validation の結果に従う�E�スキーマに反してぁE��ば reject�E�E

- `document_meta.version`
  - ドキュメント（コンチE��チE���E版管琁E��タであり、スキーマ互換判定には用ぁE��ぁE��表示・ログ用途！E


## 2.3 冁E�� state の構造�E�構造 vs uiState�E�E

Core 冁E��で保持する state は「構造チE�Eタ」と「UI state」に完�Eに刁E��される、E

```
{
  // immutable�E�Eeep-freeze 済み�E�E
  document_3dss: {
    document_meta,
    points: [],
    lines: [],
    aux: [],
  },

  // read-only facade�E�Endices 冁E���E�E
  structIndex: { /* getCenter/getKind/getItem ... */ },

  // viewer 専用 uiState�E�Eanonical state�E�E
  uiState: {
    frame: {
      current: number | null,
      range: { min:number, max:number } | null,
    },

    runtime: {
      isFramePlaying: boolean,
      isCameraAuto: boolean,
    },

    mode: "macro" | "micro",

    selection: { kind:"points"|"lines"|"aux"|null, uuid:string|null },
    hover:     { kind:"points"|"lines"|"aux"|null, uuid:string|null },

    filters: {
      points: boolean,
      lines: boolean,
      aux: boolean,
      auxModules: { grid:boolean, axis:boolean, plate:boolean, shell:boolean, hud:boolean, extension:boolean },
    },

    viewerSettings: {
      worldAxesVisible: boolean,
      lineWidthMode: "auto"|"fixed"|"adaptive",
      microFXProfile: "weak"|"normal"|"strong",
    },

    visibleSet: {
      frame: number | null,
      points: Set<string>,
      lines: Set<string>,
      aux: Set<string>,
    } | null,

    cameraState: {
      position: [number,number,number],
      target:   [number,number,number],
      up:       [number,number,number],
      fov: number,
      near: number,
      far: number,
      // 忁E��なめEdistance なども追加�E�ただぁErenderer へ渡す�Eは上�E確定値�E�E
    },

    microState: object | null, // MicroFXPayload
  },
}
```

特徴�E�E

- 構造チE�Eタ�E�Edata`�E��E deep-freeze されており、E 
  どのレイヤからめE**変更禁止**、E
- UI state�E�EuiState`�E��E viewer 冁E��変更可能だが、E 
  `.3dss.json` へは書き戻さなぁE��セチE��ョン限定）、E
- `visibleSet` / `microState` は UI state の派生情報として Core が所有し、E 
  Renderer はそれを読み取るだけとする、E


## 2.4 viewer における構造チE�Eタの扱ぁE��

viewer は構造チE�Eタに対して次を一刁E��わなぁE��E

- 加筁E��Edd�E�E
- 変更�E�Epdate�E�E
- 補完！Euto-fill�E�E
- 除去�E�Euto-clean�E�E
- 推測補完！Enference�E�E
- 再構�E�E�Eestructure�E�E
- 自動�Eージ�E�Eerge�E�E

構造チE�Eタは **「読み取るだけ、E* であり、E 
視覚化のための解釈�Eしても、構造自体�E変えなぁE��E

### 2.4.1 不変！Emmutable�E��E維持E

- Core にロードした構造チE�Eタは、deep-freeze により不変とする、E
- 選択�Ehover・camera・フィルタ・再生状態などの変化は  
  すべて `uiState` にのみ反映される、E
- three.js のオブジェクト！ETHREE.Object3D`�E�に允EJSON を直接ぶら下げるなど、E 
  構造チE�Eタへの書き込み経路が生じる設計�E禁止とする、E

### 2.4.2 表示制御のための解釈�E許可されめE

表示制御のための **「解釈、E* は許可される。例！E

- `frame.current` に応じた要素の表示・非表示
- `appearance.*` の描画方式反映�E�色・太さ�E透�E度など�E�E
- `marker.shape` に応じぁEgeometry 生�E
- `aux.module` の種類に応じた表示�E�Erid / axis / label など�E�E

これら�E **表示ロジチE��** であり、構造チE�Eタの変更ではなぁE��E 
viewer は `appearance.visible` などを参照しても、値を書き換えたり上書きしたりしなぁE��E


## 2.5 frame / frames の扱ぁE

3DSS 側の `frames` と viewer 側の `frame.current` の関係�E次の通りとする�E�E

- `uiState.frame.current === null`
  ↁEframes を無視して可視判定する！Erame フィルタ OFF�E�E

- `uiState.frame.current === n`
  ↁE要素の `appearance.frames` ぁE
    - number の場合：n と一致する時だけ可要E
    - number[] の場合：n を含む時だけ可視（空配�Eは常に不可視！E

- `appearance.frames` 未定義
  ↁE全フレームで可視！Erame.current に依存しなぁE��E

frameRange `{min,max}` は `detectFrameRange(document)` で算�Eし、E
frames ぁE1 件も無ぁE��合�E `range=null` とする、E


## 2.6 参�E整合！Eef ↁEuuid�E�E

`ref ↁEuuid` の整合�E **読込時�E Validator が保証** する、E

代表例！E

- `line.end_a.ref` ↁE`points[*].uuid`
- `line.end_b.ref` ↁE`points[*].uuid`
- そ�E他、EDSS 仕様書で定義されてぁE��全ての参�E

不整合がある場合！E

- viewer は読込自体を失敗させる�E�例外発生�EエラーメチE��ージ表示�E�、E
- 冁E��で「できる篁E��だけ描画する」とぁE��た挙動�E行わなぁE 
  �E�Eartial rendering / best-effort 描画はしなぁE��、E

runtime 冁E��の再チェチE��は不要であり、E 
性能面を優先して **validation に一任** する、E


## 2.7 読込禁止・非対象チE�Eタ

viewer は以下を構造チE�Eタとして扱わなぁE��E

- UI 状態（カメラ・選択状態など�E�E
- コメントフィールド！Euthoring 用の free text�E�E
- 注釈�Eメモ・レポ�Eト（構造外�E narrative�E�E
- modeler の冁E��惁E���E�Endo stack など�E�E
- 外部埋め込み glTF / 3D モチE���E�構造層とは別レイヤ�E�E
- viewer 独自形式�E JSON�E��E力�E読込ともに禁止�E�E
- 3DSS-prep�E�Euthoring 用ミニマルスキーマ！E

構造チE�Eタとして扱ぁE�Eは、E 
`/schemas/3DSS.schema.json` に準拠した 3DSS のみとする、E


## 2.8 チE�Eタ構造に関する禁止事頁E��Eiewer�E�E

viewer は構造チE�Eタに対して、次を行わなぁE��E

1. 構造の自動修復
   - 欠損エチE��を�E動補完すめE
   - 参�E刁E��を�E動で削除する
2. 暗黙�E default 付丁E
   - スキーマに `default` があっても、E 
     runtime 側でそれを勝手に適用して JSON を書き換えなぁE��E
3. キー名�E書き換ぁE
   - `name_ja` / `name_en` などを�E勁Emerge / rename しなぁE��E
4. 座標�E丸め�E正規化
   - 小数点桁数の丸めE
   - 特定軸への投影
5. frame 惁E��の自動生戁E
   - `frames` 未定義要素への自動付丁E
   - time-series の補間
6. スキーマ外頁E��の保持
   - `additionalProperties:false` に反する追加キーめE 
     「一旦読んでから捨てる」ことも行わなぁE��Ealidation で reject�E�、E
7. UI 状態�E JSON 保孁E
   - camera / selection / filters / runtime フラグなどめE 
     `.3dss.json` へ書き戻さなぁE��E
8. normalize / resolve / prune / reorder の実衁E
   - JSON の key 頁E��変更
   - 冗長惁E��の削除
   - 別フォーマットへの変換

viewer は構造チE�EタめE 
**“手つかずのまま扱ぁE��と E* が厳寁E��仕様として義務づけられる、E


## 2.9 Runtime API 概要E��最小セチE���E�E

viewer は modeler から完�Eに独立しぁEread-only アプリであるが、E 
UI ハ�Eネス・dev 用チE�Eル・封E��の modeler からの再利用を想定し、E 
外部向けに安定して提供すめE**runtime API の最小セチE��** を定義する、E

詳細な API 仕様�E別紁E`runtime_spec` に委�E、E 
本節では「エントリポイント」と「外部から見えめEhub の骨格」だけを示す、E

### 2.9.1 エントリ API

- `bootstrapViewer(canvasOrId, threeDSS, options?) ↁEhub`
  - validate3DSS を常に実行し、忁E��なめEvalidateRefIntegrity を実行する、E

- `bootstrapViewerFromUrl(canvasOrId, url, options?) ↁEPromise<hub>`
  - fetch ↁEjson ↁEbootstrapViewer に渡す、E
  - strictValidate の default は true、E

options�E�E
- `devBootLog?: boolean`
- `logger?: (line:string)=>void`
- `strictValidate?: boolean`
- `validateRefIntegrity?: boolean`

※ BOOT/MODEL 等�Eログに付与すめElabel めEmodelUrl を持たせたい場合�E、E
runtime_spec.viewer.yaml 側の options 定義に追加し、両仕様を一致させる、E


### 2.9.2 hub の外形

`bootstrapViewer*` の戻り値 `hub` は、少なくとも次のプロパティを持つ�E�E

- `hub.core` … runtime API 名前空間！Erame / camera / selection / mode / micro / filters / runtime / uiState 等！E
- `hub.start()` … requestAnimationFrame ループ開姁E
- `hub.stop()` … ループ停止
- `hub.pickObjectAt(ndcX, ndcY)` … ピッキング�E�EI から selectionController への橋渡し！E

以降�E章�E�E.8 / 7.11 等）およ�E `runtime_spec` において、E 
`hub.core` 以下�E吁E��ソチE���E�Eframe.get/set/step` / `camera.rotate/pan/zoom/reset` など�E�を  
詳細に定義する、E

本章の篁E��では�E�E

- 「構造チE�Eタは 3DSS に完�E依存し read-only、E 
- 「UI から構造へは忁E�� `hub.core.*` 経由でアクセスする、E 

とぁE�� 2 点を仕様上�E紁E��事として明示するにとどめる、E


---

# 3 UI構�Eと操作体系�E�Eiewer�E�E

viewer は構造チE�Eタの編雁E��一刁E��わず、E 
**閲覧・確認�E琁E��** のための UI 構造だけを備える、E

本章では、E��覧専用 UI として忁E��な機�E・レイアウト�E操作体系を定義し、E 
編雁EUI めE��孁EUI が存在しなぁE��とを�E確にする、E

viewer UI は modeler UI と別系統であり、編雁E��彙を含まなぁE��E


## 3.1 UI 全体レイアウチE

viewer_dev�E�開発用 viewer�E��E標準レイアウト�E次の二�E割構�Eとする�E�E

```text
┌─────────────────────────────━E
━E      メインビュー�E�EDプレビュー�E�E      ━E
├──────────────────┬────────────────┤
━E    惁E��パネル     ━E 表示コントロールパネル  ━E
└──────────────────┴──────────────━E
```

- 上段�E�three.js による 3D メインビュー�E�Eanvas�E�E
- 左下：メタ惁E��・ログを表示する「情報パネル、E
- 右下：frame / filter / mode / gizmo などの「表示コントロールパネル、E

本レイアウト�E dev viewer�E�Eviewer_dev.html`�E��E標準とし、E 
本番埋め込み viewer では、�Eスト�E UI 都合に合わせて再構�Eしてよい、E

### 3.1.1 PC 向け dev viewer レイアウト要件

PC 向けの dev viewer では、少なくとも次を満たす�E�E

- メインビュー
  - 3D キャンバス�E�E<canvas id="viewer-canvas">`�E�を 1 枚持つ、E
  - pointerInput�E��Eウス / タチE���E�をキャンバスにだけ�Eら下げる、E
- 惁E��パネル�E�左下！E
  - File 惁E���E�ソースパス / frame range / current frame�E�E
  - Model ログ�E�EevBootLog を含む�E�をスクロール領域として表示、E
- 表示コントロールパネル�E�右下！E
  - frame スライダと再生ボタン群
  - points / lines / aux の表示フィルタ
  - mode HUD�E�Eacro / meso / micro�E�と focus 表示
  - 軸ギズモの DOM ラチE���E�左丁Ecanvas 上に重�EてもよぁE��E

### 3.1.2 本番 viewer 最小要件

本番 viewer�E�Estro 埋め込みなど�E�では、次だけを最低限とする�E�E

- メインビュー�E�ED canvas�E�E
- frame 刁E�� UI�E�スライダ or +/- ボタン or キーボ�Eド！E
- layer 刁E�� UI�E�Eoints / lines / aux の ON/OFF�E�E
- 選択中要素の識別ができる表示�E�例：UUID / name のどちらか�E�E

dev 用 HUD / ログパネル / 詳細なメタ惁E��表示は、E 
本番 viewer では任意とする、E


## 3.2 メインビューと HUD

### 3.2.1 メインビュー�E�ED プレビュー�E�E

メインビューの責務！E

- three.js による 3D 描画�E�Eenderer 層の canvas�E�E
- カメラ操作！Erbit / pan / zoom�E��E視覚的フィードバチE��
- 選択要素のハイライト表示�E�Eelection + microFX の結果�E�E
- frame / filters による表示刁E��の結果を反映

制紁E��E

- メインビューは構造チE�Eタを編雁E��なぁE��E
- UI イベンチEↁEcamera/frame/selection/mode への反映は  
  **すべて PointerInput / KeyboardInput ↁEhub.core.* 経由** とする、E

### 3.2.2 HUD�E�トースチE/ mode ピル / focus ラベル�E�E

dev viewer では、メインビュー上に次の HUD を重ねる！E

- ト�EストメチE��ージ�E�EviewerToast`�E�E
  - `showHudMessage(text, {duration, level})` 由来の簡易通知、E
  - 例：`"Viewer loaded"`, `"Camera: HOME"`, `"MACRO MODE"` など、E
- mode ピル
  - `MACRO / MESO / MICRO` の 3 つの pill を表示、E
  - 現在 mode に対応すめEpill だぁE`mode-pill-active` を付与、E
- focus ラベル
  - 現在 selection�E�EuiState.selection.uuid`�E�を表示、E
  - selection がなぁE��合�E `"-"` を表示、E

HUD は dev viewer 専用の補助 UI とし、E 
本番 viewer では任意機�Eとする、E

### 3.2.3 軸ギズモ�E�Eizmo�E�E

- DOM ベ�Eスの HUD として画面左下に重�Eる、E
- 役割�E�E
  - 現在カメラの向きを示す簡昁E3D axes 表示、E
  - クリチE��でカメラを主要軸方向！EX / +Y / +Z�E�へ snap する、E
  - HOME ボタンでカメラ初期状態へ戻す、E
- 実裁E��E
  - `viewer/ui/gizmo.js`�E�EOM 操作）とし、three.js の scene には入れなぁE��E
  - カメラ操作�E `viewerHub.core.camera.reset` / `.snapToAxis(axis)` 経由で行う、E


## 3.3 惁E��パネル�E�Eile / Model�E�E

惁E��パネルは、主に dev viewer で利用する **チE��スト�Eースのメタ表示領域** とする、E

### 3.3.1 File 惁E��パネル

- 表示冁E���E�例）！E
  - Source: `../3dss/sample/frame_aux_demo.3dss.json`
  - Frame range: `[min, max]`
  - Current frame: `n`
- 惁E��源！E
  - `hub.core.frame.getRange()` / `hub.core.frame.getActive()`
  - `bootstrapViewerFromUrl` に渡した `modelUrl`

### 3.3.2 Model ログパネル

- 初期状態！E
  - `"Model"` 見�Eしと、`(logs will appear here)` のプレースホルダ、E
- devBootLog を有効にした場合！E
  - 起動時に忁E��次の 5 行がこ�Eパネルに並ぶ�E�E

    ```text
    BOOT  <devLabel>
    MODEL <modelUrl or (unknown)>
    CAMERA {"position":[...],"target":[...],"fov":50}
    LAYERS points=on/off lines=on/off aux=on/off
    FRAME  frame_id=<n>
    ```

- 出力経路�E�E
  - `bootstrapViewer` オプション `devBootLog: true` 時、E
  - `options.logger` があれ�Eそれを使ぁE��無ければ `console.log` を用ぁE��、E
  - viewer_dev ハ�Eネスでは `logger: devLogger` を渡し、E 
    `devLogger` ぁE`appendModelLog` を通じて Model パネルへ追記する、E

devBootLog の詳細仕様�E 1.8 節を正とする、E


## 3.4 表示コントロールパネル

表示コントロールパネルは、viewer の **状態を外�Eから操作する唯一の UI 雁E��E* である、E 
ただし本番 viewer では、E�E置めE��た目はホストに任せ、E 
API 呼び出し！Eub.core.*�E�だけを仕様として固定する、E

### 3.4.1 Frame コントロール

dev viewer の frame UI は次の構�Eとする�E�E

- スライダ�E�E#frame-slider`�E�E
  - `input` イベントで `hub.core.frame.setActive(newValue)` を呼ぶ、E

- ラベル�E�E#frame-slider-label`�E�E
  - `hub.core.frame.getActive()` を表示する、E

- ボタン群
  - `btn-rew` … `hub.core.frame.setActive(range.min)`
  - `btn-step-back` … `hub.core.frame.prev()`
  - `btn-home` … `hub.core.frame.setActive(range.min)`
  - `btn-step-forward` … `hub.core.frame.next()`
  - `btn-ff` … `hub.core.frame.setActive(range.max)`
  - `btn-play` … �E�Eev harness 側で再生トグル�E�E


再生トグルは dev viewer 固有�E実裁E��し、E 
冁E��皁E��は `setInterval` 等で `next` を一定間隔で呼び出す、E 
runtime 本体�E仕様としては「frame 再生 API」がなくてもよく、E 
実裁E��る場合�E `hub.core.runtime.*` として別途定義する、E

frame UI の要件�E�E

- frame ID 変更は **常に `hub.core.frame.*` 経由** とする、E
- UI 以外！EeyboardInput�E�から�E変更は、`frameUiLoop` によりスライダ・ラベルへ反映する、E
- マウスホイールは v1 では **Zoom 専用** とし、frame 変更には使わなぁE��E

### 3.4.2 Layer フィルタ

points / lines / aux の表示刁E�� UI を持つ、E

- ボタン�E�E
  - `#filter-points`
  - `#filter-lines`
  - `#filter-aux`
- 表示状態！E
  - `filter-on` / `filter-off` クラスと絵斁E��（👁E/ 🙈�E�で表現、E
- ロジチE���E�E
  - 吁E�Eタンは `filters.setTypeEnabled(kind, enabled)` を呼ぶ、E
  - `filters.get()` の結果から UI 状態を同期する、E

冁E��では�E�E

- `hub.core.filters.setTypeEnabled(kind, enabled)`  
  ↁE`visibilityController.setTypeFilter` ぁE`uiState.filters.types.*` と `visibleSet` を更新する、E
- `hub.core.filters.get()`  
  ↁE現在の `FiltersState` を返す、E

### 3.4.3 Mode / Focus 操作！Eacro / micro + meso optional�E�E

- mode ピル�E�EUD�E�E
  - 表示のみを基本とする�E�クリチE��刁E��は忁E��ではなぁE��、E
  - host / dev harness は `hub.core.mode.getSupported()` を参照し、E
    `meso === false` の場合�E MESO 表示を�EさなぁE��また�E disabled 表示�E�、E

- focus トグルボタン�E�E#mode-focus-toggle`�E�E
  - クリチE��時！E
    - 現在 selection を取得！Ehub.core.selection.get()`�E�、E
    - `sel.uuid` があれ�E `hub.core.mode.set("micro", sel.uuid)` を呼ぶ、E
    - `set()` ぁE`false` を返した場合�E何もしなぁE��忁E��なめEHUD ト�Eストで通知�E�、E

- MESO pill / ボタン�E�Eptional�E�E
  - `hub.core.mode.getSupported().meso === true` のとき�Eみ UI を�Eしてよい、E
  - クリチE��時！E
    - selection があれ�E `hub.core.mode.set("meso", sel.uuid)` を呼ぶ、E
    - ただぁEv1 実裁E��は meso は **macro 相当！EicroFX 無し！E* として扱ってよく、E
      見た目の差刁E��無くても仕様違反ではなぁE��E
  - `meso === false` の環墁E��は `set("meso", ...)` は `false` を返し、状態�E変えなぁE��E

mode と microFX の詳細ルールは 6.8 節・runtime_spec を正とし、E
本節は「UI から呼ぶ API パターン」と「meso optional」�E条件だけを定義する、E

## 3.5 入力操作！EointerInput / KeyboardInput�E�E

入力操作�E runtime 層ではなぁE**UI レイヤ�E�Eiewer/ui/*�E�E* に雁E��E��る、E

- PointerInput / KeyboardInput は Host / dev harness 側で `new` し、canvas / window にイベントを接続する、E
- runtime 層�E�Euntime/*�E�かめEPointerInput / KeyboardInput めEimport / new することは禁止する、E
- 入力イベント�E忁E�� `hub.core.*` / `hub.pickObjectAt` にマッピングし、CameraEngine めEthree.js を直接触らなぁE��E


### 3.5.1 PointerInput�E��Eウス / タチE���E�E

PointerInput の責務！E

- キャンバス上�Eポインタ操作を一手に雁E��E��る、E
- camera / selection / mode への変更は **hub.core.* 経由** で行う、E
- renderer めEthree.js を直接触らなぁE��E
配置�E�E
- `viewer/ui/pointerInput.js` に置く！EI レイヤ�E�、E
- runtime から参�EしなぁE��接続�E host�E�EiewerDevHarness 等）が行う、E


v1 の標準�EチE��ング�E��Eウス�E�！E

- 左ドラチE���E�orbit�E�カメラ回転�E�E
- 右ドラチE�� or 中ドラチE���E�pan�E�カメラ平行移動！E
- ホイール�E�zoom�E�前後！E
- クリチE���E�E
  - click / pointerup 時に canvas 座樁EↁENDC 変換し、E
  - `hub.pickObjectAt(ndcX, ndcY)` を呼び、E
  - ヒットしぁEuuid があれ�E `hub.core.selection.select(uuid)` を呼ぶ、E
  - そ�E結果、mode / microFX は core 側で再計算される、E

注意！E

- Frame の増減をマウスホイールに割り当てることは禁止�E�E.4.1 参�E�E�、E
- モード�E移条件�E�EanEnter / exit など�E��E core/modeController の責務とし、E 
  PointerInput は「click ↁEselect」までで止める、E

### 3.5.2 KeyboardInput�E�キーボ�Eド！E

KeyboardInput の責務！E
- `window` の `keydown` めE1 箁E��に雁E��E��る、E
- **core.camera / core.frame / core.mode / core.selection のみ** を叩く、E
- UI 要素�E�EOM�E�や CameraEngine には直接触れなぁE��E
配置�E�E
- `viewer/ui/keyboardInput.js` に置く！EI レイヤ�E�、E
- runtime から参�EしなぁE��接続�E host�E�EiewerDevHarness 等）が行う、E


キー入力�E次のルールに従う�E�E

1. 入力欁E��夁E
   - `ev.target.tagName` ぁE`INPUT` / `TEXTAREA` の場合�E無視、E

2. Home�E�カメラ HOME�E�E
   - `ev.code === "Home"` かつ `core.camera.reset` が存在する場合！E
     - `ev.preventDefault()`
     - `core.camera.reset()` を呼ぶ、E

3. Frame 操作！EageUp / PageDown�E�E
   - `core.frame` が存在する場合！E
     - `PageUp` … `next`
     - `PageDown` … `prev`
   - frame 篁E��外へは FrameController 側でクランプする！Euntime_spec 参�E�E�、E

4. Mode 刁E���E�Esc�E�E
   - `Escape`�E�E
     - `mode.set("macro")`

5. カメラ Zoom�E�E / -�E�E
   - `+` / `NumpadAdd`�E�E
     - `camera.zoom(-΁E`�E�前進�E�E
   - `-` / `NumpadSubtract`�E�E
     - `camera.zoom(+΁E`�E�後退�E�E
   - Δ！EOOM_STEP�E��E実裁E�Eの定数�E�例！E.1�E�とする、E

6. カメラ Orbit�E�矢印キー�E�E
   - `ArrowLeft` … `camera.rotate(-step, 0)`
   - `ArrowRight` … `camera.rotate(+step, 0)`
   - `ArrowUp` … `camera.rotate(0, -step)`�E�上にチルト！E
   - `ArrowDown` … `camera.rotate(0, +step)`�E�下にチルト！E
   - `Shift` 押しで step を増やし、早回しとする�E�例！E° ↁE4°�E�、E

dev viewer では、これに加えてハ�Eネス側で次を追加してよい�E�E

- `Space`�E�E
  - 再生ボタン�E�E#btn-play`�E��E click を代琁E��火し、frame 再生をトグルする、E
  - これは **viewer_dev 専用ショートカチE��** とし、runtime 本体仕様には含めなぁE��E


## 3.6 dev viewer 固有�E拡張

viewer_dev�E�開発用 harness�E��E、本番 viewer に含めなぁE��助機�Eを持つ�E�E

- `window.hub` … `viewerHub` へのチE��チE��用参�E
- `window.viewerLog(line)` … Model パネルへのログ追訁E
- `window.viewerToast(text, options)` … HUD ト�Eスト表示
- 起動時 devBootLog
  - `BOOT / MODEL / CAMERA / LAYERS / FRAME` の 5 行を Model パネルへ表示
- gizmo HOME / axis ボタン
  - カメラ操作コマンド�EショートカチE���E�Eeset / snapToAxis�E�E

これら�E **「開発支援機�E、E* として扱ぁE��E 
本番 viewer 仕様（機�E要件�E�には含めなぁE��E 
ただし、封E�� host アプリで再利用したぁE��合に備え、E 
名前・責務�E本章の定義から大きく外れなぁE��ぁE��する、E


---

# 4 三次允E��画とカメラ�E�Eiewer�E�E

viewer の描画シスチE��は modeler と同じ three.js を用ぁE��が、E 
閲覧専用アプリとして **透�E性・忠実性・非編雁E��** を最優先する、E

本章では、renderer 層と CameraEngine を中忁E��、E 
三次允E��画・visibleSet・microFX・カメラ挙動の規篁E��定義する、E

※ 入力レイヤ�E�EointerInput / KeyboardInput�E��E 3 章、およ�E `runtime_spec` を正とする、E 
本章では「�E力済みの状態が renderer にどぁE��映されるか」を扱ぁE��E


## 4.1 描画レイヤ構造

viewer の描画レイヤ構造は次の通りとする�E�E

- Core 層�E�Euntime/core�E�E
  - `uiState` / `CameraEngine` / `frameController`
  - `selectionController` / `modeController`
  - `visibilityController` / `microController`
  - 3DSS 構造�E�Emmutable�E�と吁E�� index を保持
- Renderer 層�E�Euntime/renderer�E�E
  - `createRendererContext(canvas)` ぁEthree.js まわりを一手に拁E��E
  - three.js の Scene / Camera / Renderer / light / Object3D 群を�E部に保持
  - microFX�E�Exes / bounds / glow / marker / highlight�E�を含む
- Hub 層�E�Euntime/viewerHub�E�E
  - `core` と `renderer` をまとめ、E 
    毎フレーム `uiState` のスナップショチE��めErenderer に流す
  - `hub.start()` / `hub.stop()` による render loop を単一箁E��で管琁E

### 4.1.1 所有権と禁止事頁E

- 3DSS document�E�構造チE�Eタ�E�E
  - Core 層ぁEdeep-freeze 済みのオブジェクトとして保持
  - Renderer 層は **参�Eのみ** 許可、書き換え禁止
- uiState / visibleSet / microState / cameraState
  - Core 層が唯一の正規所有老E
  - Renderer 層は hub 経由で **読み取り専用** として受け取り、反映のみ行う
- three.js Object3D 群
  - Renderer 層が所朁E
  - Core / UI / hub は Object3D を直接触らなぁE��EUID 等で参�Eするのみ�E�E

### 4.1.2 frame ↁEvisibleSet ↁErenderer の流れ�E�正規ルート！E

1. Core の frameController ぁE`uiState.frame.current` を更新する、E

2. Core は **忁E��** `core.recomputeVisibleSet()` を呼ぶ、E
   - これぁEvisibleSet 再計算�E **唯一の入口** とする、E
   - 冁E��で frames / appearance.visible / filters�E�Eoints/lines/aux�E�を合�Eし、E
     `uiState.visibleSet: Set<uuid>` を更新する、E

3. hub の 1 フレーム tick で、E
   - `renderer.applyFrame(uiState.visibleSet)`�E�また�E同等API�E�が呼ばれ、E
   - 吁EObject3D の `obj.visible` ぁEUUID ベ�Eスで更新される、E

Renderer は visibleSet 以外�E条件で base object の表示�E�非表示を勝手に決めてはならなぁE��E
�E�Everlay / microFX 用の追加 Object3D はこ�E制紁E�E対象外！E


## 4.2 描画対象要素�E�Eoints / lines / aux�E�E

### 4.2.1 Points

points は「空間上�E代表点」として描画する、E

- 参�E允E��E
  - `points[*].position`
  - `points[*].appearance`�E�Eolor / opacity / marker など�E�E
- 最低要件�E�E
  - 吁Epoint につぁE1 つの Object3D�E�通常は小さな琁Eor billboard�E�を生�Eする、E
  - color / opacity は appearance.* の値をそのまま反映する、E
- 追加表現�E�Eptional�E�！E
  - microFX による glow / marker の上乗せ
  - selection によるハイライト（色�E�太さ／発光！E

points に関して viewer は **位置の補間めE��めを行わなぁE*、E 
position ベクトルは 3DSS JSON の値をそのまま world 座標として用ぁE��、E

### 4.2.2 Lines

lines は「points 同士の接続（�Eクトル�E�」として描画する、E

- 参�E允E��E
  - `lines[*].end_a.ref` / `end_b.ref` から point UUID を解決
  - `lines[*].appearance.shape` / `arrow` / `effect` / `color` / `opacity` など
- 最低要件�E�E
  - ref は strict validation により整合が保証される、E
  - Renderer は `end_a.ref` / `end_b.ref` を忁E��解決できる前提で描画する、E
  - もし解決できなぁE��合、それ�E「読込拒否されるべき�E力」また�E「実裁E��グ」として扱ぁE��E
  - 「解決できた刁E��け描画する�E�Eartial rendering�E�」�E行わなぁE��E
- 箭頭�E�Errow�E�！E
  - `arrow.shape` / `arrow.placement` の値をそのまま反映する、E
  - 仕様としては 3DSS の定義を正とし、viewer 側で勝手に補正・拡張しなぁE��E
- effect:
  - `effect: none | flow | glow | pulse` は **描画限定�E視覚効极E* として扱ぁE��E
  - `none` は追加の視覚効果なしを意味する、E

lineWidth につぁE���E�E

- WebGL 実裁E��より 1px 以下や固定幁E��なる環墁E��存在する、E
- viewer は冁E��に `line_width_mode: auto | fixed | adaptive` の概念を持ってよいが、E
  - v1 実裁E��は **auto 固宁E* とし、E
  - 他モード�E「封E��拡張候補」として本仕様に残すに留める、E

### 4.2.3 Aux

aux は points / lines 以外�E補助皁E��画要素である、E

代表皁E�� module と v1 における扱ぁE��！E

| module 吁E | スキーチE| Viewer v1 の扱ぁE      | 備老E                                     |
|------------|---------|------------------------|-------------------------------------------|
| `grid`     | あり    | 描画忁E��（保証�E�E      | ground グリチE��。基本パラメータのみ対応で可、E|
| `axis`     | あり    | 描画任意�E無視可       | 構造層の軸、EUD の gizmo axis とは別物、E  |
| `plate`    | あり    | 描画任意�E無視可       | 床�Eレート／背景板。v1 では非忁E��、E      |
| `shell`    | あり    | 描画任意�E無視可       | 外皮表現。v1 では非忁E��、E                |
| `hud`      | あり    | 描画任意�E無視可       | 構造側 HUD。Viewer UI で代替する想定、E   |

v1 では grid 以外�E aux module は「存在しても無視可」とし、E 
封E��対応時にのみ本表を更新する、E


## 4.3 frame�E�時間層�E�と表示制御

### 4.3.1 表示ルール

`uiState.frame.current = n` のとき、表示ルールは次の通り�E�E

- uiState.frame.current == n  
  ↁE`frames` に n を含む要素のみ表示
- uiState.frame.current ぁEnull  
  ↁE`frames` を無視して全要素を表示�E�Erame フィルタ OFF�E�E
- frames が未定義また�E空  
  ↁE常時表示�E�EiState.frame.current に依存しなぁE��E
- frame 刁E��は UI 状態！EiState.frame�E��E更新のみで行い、E 
  構造チE�Eタ�E�EDSS JSON�E��E変更しなぁE��E

### 4.3.2 Core / Renderer の責務�E離

- Core�E�E
  - `frameController.set / step / range` により `uiState.frame` を更新する、E
  - `visibilityController.recompute()` で `uiState.visibleSet` を�E計算する、E
- Renderer�E�E
  - `renderer.applyFrame(uiState.visibleSet)` で `obj.visible` を更新する、E
  - frame ID めEframes 配�Eを直接読むことは禁止、E

frames の推測・補完�E補正は行わなぁE��E 
3DSS に入ってぁE�� frames 惁E��のみを正とする、E


## 4.4 microFX レイヤと selection / mode

microFX は「視覚補助レイヤ」であり、構造チE�Eタには一刁E��響しなぁE��E 
renderer 冁E�E `microFX/*` モジュールとして実裁E��れる、E

### 4.4.1 入出力と invariants

- 入力！E
  - `uiState.microState`�E�EicroFXPayload�E�E
  - `uiState.selection`
  - scene metrics�E�中忁E�E半征E��ど�E�E
- 出力！E
  - 既孁EObject3D の color / opacity / scale などの上書ぁE
  - 追加の overlay Object3D�E�Exes / bounds / marker / glow / highlight�E�群
- 不変条件�E�E
  - 3DSS document は決して変更しなぁE��E
  - baseStyle�E��Eの色・不透�E度�E��E忁E��保持し、microFX OFF で完�E復允E��きる、E
  - 座標系は 3DSS と同じ「unitless な world 座標系」とし、px などの画素単位を持ち込まなぁE��E

### 4.4.2 microFX モジュールの役割

代表皁E��モジュールの責務！E

- `axes`�E�E
  - focus 要素まわりのローカル軸を簡易表示する、E
  - scene 半征E��カメラ距離からスケールを決め、常に読みめE��ぁE��きさに保つ、E
- `bounds`�E�E
  - focus クラスタの AABB�E�軸平行墁E��ボックス�E�を描く、E
  - shrinkFactor により少し冁E�Eに縮めて描くことで視認性を上げる、E
- `marker`�E�E
  - focus 位置に小さなマ�Eカーを�E置する�E�点 or 矢印�E�、E
- `glow`�E�E
  - focus 要素に対して halo 皁E�� glow を追加する、E
- `highlight`�E�E
  - `microState.relatedUuids` に含まれる要素群を「なぞる」オーバ�Eレイを描画し、E
  - 構造皁E��係（近傍�E�経路など�E�を強調する、E

microState の詳細な形は 7.11 節および `runtime_spec` の MicroFXPayload を正とする、E 
本章では「renderer が何をしてよいか／してはならなぁE��」だけを定義する、E

### 4.4.3 斜め線シャドウ�E�封E��拡張�E�E

斜め線！Eon-axis-aligned line�E�に対するシャドウ表現�E�Ehadow Convention�E��E、E 
microFX の封E��拡張案として仕様上に保持する�E�E

- 対象�E�E
  - ベクトル v = (dx, dy, dz) において褁E��軸に非ゼロ成�Eを持つ線�E、E
- 方針！E
  - 吁E��成�Eごとに「影線」を落とし、方向感と奥行きを補助する、E
- 実裁E��無�E�E
  - v1 の忁E��要件ではなぁE��E
  - 実裁E��る場合�E 3DSS を一刁E��更せず、microFX だけで完結させる、E

詳細な濁E��めE��向規篁E�E旧 4.7 節の案を参老E��してよいが、E 
本仕様では「任意実裁E��として扱ぁE��E


## 4.5 カメラ仕様（閲覧用 CameraEngine�E�E

カメラは `CameraEngine` によって一允E��琁E��れる、E 
cameraState は Core 層が持ち、renderer は毎フレームそれを受け取って反映する、E

### 4.5.1 空間座標系とカメラ状慁E

空間座標系�E�E

- 右手系を前提とし、E
- `Z+` を絶対上方向とする�E�Erid / axis もこれに従う�E�、E

cameraState の公開形�E�Eub.core.camera.getState / 起動ログ�E��E次を正とする�E�E

```ts
cameraState = {
  position: [number, number, number],  // world
  target:   [number, number, number],  // world
  fov:      number,                    // deg
  // optional: 操作系の冁E��表現�E�実裁E��忁E��なら併記してよい�E�E
  theta?:    number,
  phi?:      number,
  distance?: number,
}
```

- 起動ログ CAMERA {...} は少なくとめEposition/target/fov を含む JSON を�E力する、E
- Renderer は position/target/fov を受け取り、そのまま camera に反映する、E
- theta/phi/distance は CameraEngine の冁E��都合で保持してよいが、�E開形と矛盾させなぁE

### 4.5.2 初期カメラ

bootstrapViewer では、renderer の scene metrics から初期カメラを決める�E�E

1. `renderer.syncDocument()` 後に scene の bounding sphere�E�Eenter, radius�E�を取得する、E
2. `target = center` とする、E
3. `distance ≁Eradius ÁE2.4` 程度離し、構造全体が画面に収まる距離を確保する、E
4. `theta / phi` はわずかに俯瞰�E�やめE��め上）となるよぁE��設定する、E

こ�E初期状態�E `uiState.cameraState` にのみ保持し、E 
3DSS document へ書き戻してはならなぁE��E

### 4.5.3 CameraEngine API

CameraEngine は少なくとも次を提供する（詳細は `runtime_spec`�E�！E

- `rotate(dTheta, dPhi)`  
  - `theta += dTheta`, `phi += dPhi` として orbit を行う、E
  - `phi` は極点付近でクランプし、カメラの裏返り�E�Eimbal lock�E�を避ける、E
- `pan(dx, dy)`  
  - 画面座標系に沿って `target` を平行移動する、E
  - distance / FOV に応じて pan の実距離をスケーリングする、E
- `zoom(delta)`  
  - `distance += delta` として前後移動する、E
  - `MIN_DISTANCE` / `MAX_DISTANCE` でクランプする、E
  - キーボ�Eド／�Eイールの符号規紁E�E「負で前進�E�ズームイン�E�」とする、E
- `reset()`  
  - 初期カメラ状態に戻す！Eootstrap 時に記録しておく�E�、E
- `snapToAxis(axis: 'x' | 'y' | 'z')`  
  - 持E��軸方向から構造を俯瞰する角度�E�Eheta, phi�E�へスナップする、E
  - target / distance は維持する、E
- `setFOV(value)` / `setState(partial)` / `getState()`

Renderer 側では、毎フレーム�E�E

1. `camState = cameraEngine.getState()`
2. `renderer.updateCamera(camState)`
3. `renderer.render()`

とぁE��流れで反映する、E

### 4.5.4 入力レイヤとの関俁E

- Mouse / Wheel / Keyboard / Gizmo などの物琁E�E力�E、E
  - PointerInput / KeyboardInput / gizmo.js が受け取り、E
  - `hub.core.camera.rotate / pan / zoom / reset / snapToAxis` だけを呼び出す、E
- CameraEngine 自体を UI めErenderer から直接叩くことは禁止する、E

入力�EチE��ングの詳細は 3.5 節および `runtime_spec` の KeyboardInput / PointerInput を参照する、E


## 4.6 カメラモード！Eacro / micro + meso optional�E�と描画

mode�E�Emacro" / "micro" / "meso"�E��E「どのスケールで構造を見るか」を表す、E
uiState.mode を唯一の正規状態とし、modeController が管琁E��る、E

ただぁE**meso は optional** とし、v1 実裁E��は **macro 相当！EicroFX 無し！E* として扱ってよい
�E�＝meso を実裁E��なぁE/ 受理しても見た目ぁEmacro と同一、どちらでも仕様違反ではなぁE��、E

### 4.6.1 モード定義

| モーチE| 用送E        | 説昁E|
|--------|--------------|------|
| macro  | 全体俯瞰     | シーン全体を俯瞰する基本モード、E|
| meso   | 近傍クラスタ | **optional**。v1 では macro 相当でも可�E�EicroFX 無し）。封E��、E��択近傍クラスタ観察に拡張してよい、E|
| micro  | 1 要素原点   | 1 要素を原点とみなす近接観察モード、E|

- v1 の忁E��実裁E�E macro / micro、E
- meso は未対応でもよぁE��未対応時、UI は meso を�EさなぁE��また�E無効化）こと、E

### 4.6.2 モードと microFX の関係！E1�E�E

- macro
  - microFX は無効�E�EuiState.microState = null`�E�、E
  - 全オブジェクトを baseStyle のまま表示する、E

- meso�E�Eptional�E�E
  - v1 では **macro と同一挙動**でよい�E�EicroFX 無し、microState は null�E�、E
  - 封E��拡張で microState を計算して近傍強調・遠方フェード等を実裁E��てよい、E

- micro
  - focus 要素を中忁E��して axes / bounds / glow / highlight 等�E microFX を適用する、E
  - 靁Efocus 要素はフェードし、局所構造を読めることを優先する、E

### 4.6.3 モード�E移と selection�E�Eeso optional�E�E

modeController は次のルールを満たす�E�E

- micro に入るとき！E
  - selection に uuid がなければ入れなぁE��E
  - canEnter(uuid) ぁEfalse の場合�E遷移しなぁE��E

- meso に入るとき！Eptional�E�！E
  - `getSupported().meso === false` の場合�E遷移要求を reject する�E�状態�E変えなぁE��、E
  - `getSupported().meso === true` の場合でも、v1 では macro 相当でよい�E�EicroFX 無し）、E

- Esc キー�E�E
  - どのモードからでめEmacro へ戻る！Eelection は維持してよい�E�、E

- frame 再生開始時�E�推奨�E�！E
  - mode めEmacro に戻し、microFX めEOFF にする、E

モード�E移は忁E�� `core.mode.set(mode, uuid?)` を経由し、E
renderer 側で独自に mode を判定してはぁE��なぁE��E


## 4.7 描画パフォーマンス要件

viewer は閲覧専用であり、次を目標とする�E�E

- frame 刁E���E�E00ms 以冁E
- 2000、E000 要素で明確な遁E��なぁE
- カメラ操作！E0fps 以上（実行環墁E��存！E
- aux 刁E���E�ユーザ操作かめE1 フレーム以冁E��反映
- selection / microFX�E�E フレーム以冁E��視覚的変化が見えること

パフォーマンス向上�Eために�E�E

- instancing / LOD / caching / frustum culling などの最適化を行ってよい、E
- ただしこれらは **viewer 冁E��で完絁E* させ、EDSS めEuiState の意味を変えてはならなぁE��E

例えば�E�E

- 遠景では points めEbillboard へ落とぁE
- 長大な polyline を距離に応じて簡略化すめE

とぁE��た最適化�E許容されるが、E 
允E�E構造チE�Eタが「こぁE��ってぁE��」と誤解されるよぁE��描画は避ける、E


## 4.8 描画禁止事頁E��Eiewer�E�E

viewer は次の行為を行ってはならなぁE��E

1. 位置の丸め�E補宁E
   - 例：座標を勝手に整数へ丸める、格子点へスナップする、など、E
2. ジオメトリの推測・補正
   - 例：座標が近いからとぁE��て自動で接続線を追加する、E
3. ref 整合�E修復
   - 例：存在しなぁEUUID に対して「それらしい、Epoint を勝手に補完する、E
4. 構造チE�Eタに存在しなぁE��素の追加
   - 例：線�Eを補完するため�E「仮想ノ�Eド」を 3DSS 上に生やす、E
5. 描画状態を JSON へ書き戻ぁE
   - camera / frame / filters / selection などの UI 状態を 3DSS に保存しなぁE��E
6. カメラ状態�E保存（永続化�E�E
   - session 冁E��保持するのはよいが、構造チE�EタめE��部ストレージに記録しなぁE��E
7. viewer 独自チE�Eタの 3DSS への付丁E
   - 例：viewerConvenience などのフィールドを 3DSS に追記する、E
8. modeler の編雁EUI の混入
   - viewer から構造を編雁E��きるような UI を紛れ込ませなぁE��E
9. 注釈�Eレポ�Eト等を描画へ介�EさせめE
   - チE��ストレポ�Eト生成やコメント�E UI 層で行い、描画規篁E��崩さなぁE��E
10. 曲線�E座標�E「�E動修正、E
    - 例：直線で定義されてぁE��も�EめEspline でスムージングする、など、E

これら�E禁止事頁E��違反する実裁E��見つかった場合、E 
仕様上�E「viewer バグ」として扱ぁE��修正対象とする、E

本章では、描画規篁E��カメラ挙動を定義する、E


---

# 5 UI イベントと状態管琁E��Eiewer�E�E

viewer の UI イベント�E、E 
**構造チE�Eタ�E�EDSS�E�を一刁E��更せず**、E 
冁E��の `uiState` を更新することで完結する、E

本章では、UI イベンチEↁEcore ↁErenderer までの状態�E移と、E 
「どの経路だけが正規ルートか」を整琁E��る、E


## 5.1 uiState の役割と所有権

uiState の目皁E�E次の 2 点�E�E

1. 閲覧体験に忁E��な一時状態！Eelection / frame / filters / mode / runtime / microFX�E�を保持する  
2. 構造チE�Eタ�E�EDSS�E�への変更を防ぐため、構造層と完�E刁E��する  

所有権�E�E

- `data`�E�EDSS 構造�E�：core が保持・deep-freeze 済み・read-only
- `uiState`�E�core が唯一の書き込み権を持つ
- `visibleSet` / `microState` / `cameraState`�E�uiState の一部として core が管琁E
- renderer / ui / hub は uiState めE**読むだぁE*�E�Eore の API 経由�E�E

uiState の詳細構造は 2.3 節および `runtime_spec` の `uiState` 定義を正とする、E


## 5.2 イベントソースと正規ルーチE

UI イベント�E主なソース�E�E

- PointerInput�E��Eウス / タチE���E�E
- KeyboardInput�E�キーボ�Eド！E
- dev ハ�Eネス�E�Erame スライダ / 再生ボタン / filter ボタン / gizmo ボタン�E�E
- 封E��のホストアプリからの直接 API 呼び出し！Ehub.core.*`�E�E

正規ルート（唯一の書き換え経路�E�！E

```text
DOM Event
  ↁE
PointerInput / KeyboardInput / viewerDevHarness
  ↓！Eub.core.* のみ�E�E
Core controllers / CameraEngine�E�状態更新�E�E
  ↁE
core.recomputeVisibleSet()   ↁE派生状態�E唯一の再計算�E口
  - visibleSet 再計算！Erames / appearance.visible / filters 合�E�E�E
  - selection の null 整合維持E��忁E��なめEnull 化！E
  - mode と矛盾しなぁE��ぁE��合（例：micro なのに selection=null を禁止�E�E
  - microState の更新/解除�E�Eode に従う�E�E
  ↁE
hub�E�Eender loop�E�E
  ↁE
renderer.applyFrame / applyMicroFX / applySelection / updateCamera
  ↁE
three.js Scene に反映
```

禁止事頁E��E
- UI 層ぁEuiState を直接書き換えてはならなぁE
- UI 層ぁECameraEngine めEthree.js の camera / scene に直接触れてはならなぁE
- renderer 層ぁEuiState めE3DSS を書き換えてはならなぁE
- visibleSet / microState めEcontroller 側でバラバラに再計算してはならなぁE
 �E��E計算�E忁E�� core.recomputeVisibleSet() に雁E��E��る！E

## 5.3 Frame 系イベンチE

### 5.3.1 イベントソース

- dev viewer の frame スライダ / ボタン
- KeyboardInput�E�EageUp / PageDown�E�E
- 封E���E��Eストアプリからの `hub.core.frame.*` 呼び出ぁE

### 5.3.2 正規ルーチE

例：frame スライダ操作！Eev viewer�E�E

1. `#frame-slider` の `input` イベント発火
2. viewerDevHarness 冁E�E `initFrameControls` ぁE`frameAPI.set(v)` を呼ぶ
   - `frameAPI` は `viewerHub.core.frame` のラチE��
3. `core/frameController.set(v)` が呼ばれる
4. `uiState.frame.current` を更新し、忁E��ならクランチE
5. `frameController` は `uiState.frame.current` を更新し、忁E��ならクランプすめE
6. **忁E��** `core.recomputeVisibleSet()` を呼び、E
   - `uiState.visibleSet` を更新
   - selection / mode / microState の整合を崩さなぁE
7. hub の次フレーム tick で
   - `renderer.applyFrame(uiState.visibleSet)`
   - `renderer.render()`

KeyboardInput�E�EageUp / PageDown�E�も同様に�E�E

- `frame.step(+1)` / `frame.step(-1)` を経由して  
  `frameController.step` ↁE`uiState.frame.current` ↁE`visibleSet` ↁErenderer  
  とぁE��ルート�Eみを使ぁE��E

### 5.3.3 禁止事頁E��Erame�E�E

- renderer ぁE`frames` を直接読んで表示可否を決める
- UI 層ぁE`uiState.frame.current` に直接書き込む
- frame 篁E��外に自由に飛�Eし、その後で勝手にクランプすめE 
  �E�クランプ�E frameController 側の責務とする�E�E


## 5.4 Filter / Layer 系イベンチE

### 5.4.1 イベントソース

- dev viewer の filter ボタン�E�Eoints / lines / aux�E�E
- 封E���E��Eストアプリからの `hub.core.filters.*`

### 5.4.2 正規ルーチE

1. ユーザぁEfilter ボタン�E�例：`#filter-lines`�E�をクリチE��
2. viewerDevHarness の `initFilterControls` ぁE 
   `filtersAPI.setTypeEnabled("lines", enabled)` を呼ぶ
3. `filtersAPI` は `hub.core.filters` のラチE��
4. `visibilityController.setTypeFilter("lines", enabled)` が呼ばれる
5. `uiState.filters.types.lines` を更新したら、E*忁E��** `core.recomputeVisibleSet()` を呼ぶ  
   �E�Eilters / frames / appearance.visible を合成して visibleSet を更新し、整合を保つ�E�E
6. hub の次フレーム tick で `renderer.applyFrame(visibleSet)` が反映
7. `syncFilterUI()` ぁE`filtersAPI.get()` を読んで  
   ボタンのクラス�E�Eilter-on / filter-off�E�と icon�E�👁E/ 🙈�E�を更新

### 5.4.3 禁止事頁E��Eilter�E�E

- renderer ぁE`appearance.visible` めE`frames` を見て独自に filter する
  - filter 合�E�E�Erames / appearance.visible / filters.types�E��E  
    **visibilityController に一允E��** する
- UI 層ぁE`uiState.visibleSet` を直接書き換える


## 5.5 Selection / Picker 系イベンチE

### 5.5.1 イベントソース

- PointerInput による canvas click�E�Eay picking�E�E
- 封E���E�UI から直接 `hub.core.selection.select(uuid)` を呼ぶケース

v1 実裁E��は PointerInput ぁE`hub.pickObjectAt` を使って選択を行う、E

### 5.5.2 正規ルーチE

1. ユーザぁEcanvas 上をクリチE��
2. PointerInput ぁE`pointerup` / `click` をフチE��し、E
   - 画面座樁EↁENDC 座標へ変換
   - `hub.pickObjectAt(ndcX, ndcY)` を呼ぶ
3. viewerHub ぁE`renderer.pickObjectAt` に委譲し、E
   - `userData.uuid` を持つ最前面ヒットを返す�E�なければ null�E�E
4. PointerInput ぁE`uuid` を受け取り、E 
   - `hub.core.selection.select(uuid)` を呼ぶ
5. `selectionController.select(uuid)` ぁE
   - `structIndex` から `kind` を解決
   - `uiState.selection = {kind, uuid}` を更新
6. **忁E��** `core.recomputeVisibleSet()` を呼び、E
   - selection ぁEvisibleSet と矛盾しなぁE��とを保証
   - mode / microState を仕様通りに更新�E�忁E��なめEmicro を解除�E�E
7. hub の次フレーム tick で
   - `renderer.applySelection(uiState.selection)`
   - `renderer.applyMicroFX(uiState.microState)`
   - `renderer.render()`


### 5.5.3 禁止事頁E��Eelection�E�E

- UI 層ぁE`uiState.selection` を直接書ぁE
- renderer が「最後に hit したオブジェクト」を勝手に selection として扱ぁE
- modeController を迂回して microState を直接書き換える


## 5.6 Mode / MicroFX 系イベント！Eeso optional�E�E

### 5.6.1 イベントソース

- KeyboardInput�E�Esc�E�E
- dev viewer の focus トグルボタン�E�クリチE���E�E
- �E�Eptional�E�MESO UI�E�クリチE��。`getSupported().meso === true` のとき�Eみ表示�E�E
- 封E���E��Eストアプリからの `hub.core.mode.*` 呼び出ぁE

### 5.6.2 正規ルーチE

- micro へ�E�E
  1. UI ぁE`selection.get()` で現在 selection を取征E
  2. `sel.uuid` があれ�E `mode.set("micro", sel.uuid)` を呼ぶ
  3. `modeController.set("micro", uuid)` が�E移可否を判定し `uiState.mode` を更新
  4. **忁E��** `core.recomputeVisibleSet()` を呼び、microState を含む派生状態を更新する
  5. 次フレームで `renderer.applyMicroFX(microState)` が反映されめE

- macro 戻り！Esc�E�！E
  - `mode.set("macro")` ↁE`uiState.mode="macro"` ↁE**`core.recomputeVisibleSet()`**  
    �E�EicroState めEnull にして microFX OFF�E�E

- meso�E�Eptional�E�！E
  - `getSupported().meso === false` の環墁E��は `set("meso", ...)` は false を返し何もしなぁE��E
  - v1 実裁E��は meso は **macro 相当！EicroFX 無し！E*でも仕様違反ではなぁE��E

### 5.6.3 禁止事頁E��Eode / MicroFX�E�E

- renderer ぁE`uiState.mode` を独自解釈して microFX ロジチE��を持つことは禁止  
  �E�対象決定�E core 側�E�`recomputeVisibleSet()` に雁E��E��E
- UI 層ぁE`uiState.microState` を直接書き換えるのは禁止
- modeController を経由せず microController を直接叩く�Eは禁止


## 5.7 Camera 系イベンチE

### 5.7.1 イベントソース

- PointerInput�E�ドラチE�� / ホイール�E�E
- KeyboardInput�E�矢印キー / Home / +/-�E�E
- gizmo ボタン�E�EOME / axis�E�E
- dev viewer の追加ショートカチE���E�例：Home キー ↁEreset�E�E

### 5.7.2 正規ルーチE

PointerInput�E�Erbit / zoom / pan�E�！E

- 左ドラチE���E�E
  - ドラチE��量かめE`dTheta` / `dPhi` を算�Eし、`camera.rotate(dTheta, dPhi)`
- 右 or 中ドラチE���E�E
  - 画面座標差刁E��めE`dx` / `dy` を算�Eし、`camera.pan(dx, dy)`
- ホイール�E�E
  - `deltaY` から縮尺を決めて `camera.zoom(delta)`

KeyboardInput�E�E

- `ArrowLeft/Right/Up/Down`�E�E
  - `camera.rotate(±step, 0)` / `camera.rotate(0, ±step)`
- `Home`�E�E
  - `camera.reset()`
- `+` / `-` / `NumpadAdd` / `NumpadSubtract`�E�E
  - `camera.zoom(±ZOOM_STEP)`

gizmo�E�E

- HOME ボタン�E�E
  - `camera.reset()`
- X/Y/Z ボタン�E�E
  - `camera.snapToAxis('x'|'y'|'z')`

ぁE��れも最終的には `CameraEngine` のメソチE��に雁E��E��れ、E 
`uiState.cameraState` を更新する、E

### 5.7.3 禁止事頁E��Eamera�E�E

- UI 層ぁE`uiState.cameraState` を直接書き換える
- renderer ぁE`camera.position` を勝手に動かし、CameraEngine と二重管琁E��めE
- modeController めEmicroController が直接 camera を操作すめE 
  �E�忁E��なめECameraEngine API を通す�E�E


## 5.8 runtime フラグ�E�EsFramePlaying / isCameraAuto�E�E

`uiState.runtime` は、�E生状態�E自動カメラ状態などの  
**ランタイムレベルのフラグ** を保持する、E

```ts
uiState.runtime = {
  isFramePlaying: boolean,
  isCameraAuto:   boolean,
}
```

v1 では�E�E

- dev viewer の再生ボタン�E�Elay/Stop�E��E  
  ハ�Eネス冁E��の `setInterval` で完結しており、E 
  `isFramePlaying` はまだ runtime API からは使用してぁE��ぁE��E
- 封E��、frame 再生ロジチE��めEcore/frameController 側へ移す場合�E、E
  - `hub.core.runtime.startFramePlayback()` / `.stopFramePlayback()` などを追加し、E
  - `uiState.runtime.isFramePlaying` めEcore が唯一の正規ルートとして更新する、E

禁止事頁E��E

- UI 層ぁEruntime フラグを直接書き換え、E 
  core 側のロジチE��と矛盾を起こすこと
- renderer ぁEruntime フラグを見て独自の状態�Eシンを持つこと


## 5.9 dev ハ�Eネス�E�EiewerDevHarness.js�E��E責勁E

viewer_dev 用ハ�Eネスは、E 
UI と hub のブリチE��であり、runtime そ�Eも�EではなぁE��E

責務！E

- 起動！E
  - `window.load` ↁE`boot()` めE1 回だけ実衁E
  - `bootstrapViewerFromUrl(canvasId, modelUrl, options)` を呼び出ぁE
- devBootLog の配線！E
  - `options.devBootLog = true` / `options.logger = devLogger`
  - Model ログパネルへ  
    `BOOT / MODEL / CAMERA / LAYERS / FRAME` を表示
- UI 接続！E
  - frame スライダ / ボタン ↁE`hub.core.frame.*`
  - filter ボタン ↁE`hub.core.filters.*`
  - mode HUD / focus トグル ↁE`hub.core.mode.*` / `hub.core.selection.get()`
  - gizmo ↁE`hub.core.camera.reset / snapToAxis`
  - Keyboard shortcuts�E�Epace ↁEPlay�E�など、E 
    dev 専用ショートカチE��の実裁E
- HUD / メタ惁E��表示�E�E
  - File パネル�E�Eource / frame range / current frame�E�E
  - Model パネル�E�ログ�E�E
  - HUD ト�Eスト！EiewerToast�E�E

制紁E��E

- runtime 層�E�Eore / renderer�E��E冁E��構造には触れなぁE
  - 触ってよいのは `viewerHub` の公閁EAPI�E�Ehub.core.*` / `hub.pickObjectAt` / `hub.start` / `hub.stop`�E��Eみ
- KeyboardInput / PointerInput のロジチE��を上書きしなぁE
  - 例外�E「Space ↁEPlay」など dev 固有ショートカチE��のみ

以上により、UI イベント�Eすべて  
「viewerDevHarness / PointerInput / KeyboardInput ↁEhub.core.* ↁEcore ↁEuiState ↁErenderer、E 
とぁE��一本化された経路を通ることが保証される、E

## 5.10 派生状態�E再計算と整合性�E�忁E��！E

viewer は派生状態！EisibleSet / microState�E�を褁E��箁E��で計算してはならなぁE��E

- `core.recomputeVisibleSet()` ぁE**唯一の再計算�E口**であり、E
  すべての UI イベント後に忁E��に応じてこれを呼ぶ、E

`core.recomputeVisibleSet()` は少なくとも次を保証する�E�E

1. visibleSet は常に  
   `frames` + `appearance.visible` + `filters.types` の合�E結果である
2. selection は常に null-safe である  
   �E�EisibleSet と矛盾する selection は null 化する、など�E�E
3. mode は selection と矛盾しなぁE 
   �E�例：micro なのに selection=null の状態を作らなぁE��E
4. microState は mode に従って更新/解除されめE 
   �E�Eacro では忁E�� null、micro では忁E��再計算！E

これにより、「状態�E二重管琁E��「�E計算漏れ」「mode と selection の矛盾」を仕様上禁止する、E


---

# 6 ログ・診断・外部連携と禁止機�E�E�Eiewer�E�E

viewer は構造チE�Eタを変更しなぁE��覧専用アプリであると同時に、E 
開発・検証のための **診断ログ** を�E力できる dev viewer�E�Eiewer_dev�E�を持つ、E

本章では、E

- ログ�E�特に devBootLog�E��E仕槁E
- エラー報告とユーザ向けメチE��ージ
- runtime API を介した外部連携
- スクリーンショチE���E�エクスポ�Eト機�Eの扱ぁE
- microFX の運用ルール�E�詳細版！E

を定義する、E


## 6.1 ログの基本方釁E

### 6.1.1 ログレイヤ

viewer のログは大きく 3 レイヤに刁E��れる�E�E

1. **dev viewer UI ログ**
   - viewer_devHarness 冁E��扱ぁE��Model パネル」等への出劁E
   - 人間が開発時に確認するため�Eも�E
2. **ブラウザコンソールログ**
   - `console.log` / `console.warn` / `console.error` による出劁E
   - 開発時�EチE��チE��、およ�E本番でも忁E��最小限のエラー通知に利用
3. **ホストアプリ側ログ�E�任意！E*
   - Astro / 外部 JS などぁEviewer のイベントを拾って、E 
     サーバロギングめE��自 UI に出す場吁E
   - viewer 仕様としては「イベント通知の形」までを保証し、E 
     実際のログストレージはホスト�E責務とする

### 6.1.2 ログの目皁E

ログの主目皁E�E次の通りとする�E�E

- 3DSS ロード�E検証・初期化�E成功�E�失敗を可視化する
- frame / filter / selection / mode / camera の挙動を診断する
- microFX めEstructIndex など、�E部処琁E�E不整合を検知する

送E��、E

- エンドユーザ向けの常時ログビューアを提供すめE
- 3DSS の冁E��を「ログとしてエクスポ�Eト」すめE

とぁE��た用途�E viewer 本体�E責務外とする、E


## 6.2 devBootLog�E�起動ログ�E�仕槁E

### 6.2.1 役割

devBootLog は、dev viewer 起動時に **最佁E1 回だぁE* 出力される  
標準形式�E起動ログ群である、E

目皁E��E

- 起動経路が仕様どおりになってぁE��かを確認すめE
- model URL / 初期 camera / layers / frame 状態を一目で把握する
- チE��チE��時に「起動までは正常か」を素早く�Eり�Eける

### 6.2.2 出力形弁E

起動完亁E��、次の 5 レコードをこ�E頁E��出力する！E

```text
BOOT  <devLabel>
MODEL <modelUrl or (unknown)>
CAMERA {"position":[x,y,z],"target":[x,y,z],"fov":number}
LAYERS points=on|off lines=on|off aux=on|off
FRAME  frame_id=<number>
```

- BOOT
  - ラベル斁E���E�E�通常は `"viewer_dev"`�E�を出す、E
- MODEL
  - JSON ロード�Eの URL�E�EmodelUrl`�E�を出す、E 
    未設定�E場合�E `"MODEL (unknown)"` とする、E
- CAMERA
  - `cameraEngine.getState()` などから cameraState を取得し、E
    - position: `[x,y,z]`�E�存在しなぁE��合�E `[0,0,0]`�E�E
    - target: `[x,y,z]`�E�存在しなぁE��合�E `[0,0,0]`�E�E
    - fov: number�E�存在しなぁE��合�E `50`�E�E
  - めEJSON 斁E���Eとして埋め込む、E
- LAYERS
  - `uiState.filters.types.{points,lines,aux}` を優先し、E
- FRAME
  - `uiState.frame.current` また�E `frameController.get()` の値を�Eす、E

### 6.2.3 出力�Eとオプション

`bootstrapViewer` / `bootstrapViewerFromUrl` の `options` として�E�E

- `devBootLog: boolean`  
  - true の場合�Eみ devBootLog を�E力する、E
- `devLabel?: string`  
  - BOOT 行に埋め込むラベル�E�省略晁E`"viewer_dev"`�E�、E
- `modelUrl?: string`  
  - MODEL 行に出ぁEmodel URL、E
- `logger?: (line: string) => void`
  - ログ出力関数。省略時�E `console.log` を用ぁE��、E

viewer_dev ハ�Eネスでは通常�E�E

- `devBootLog: true`
- `devLabel: "viewer_dev"`
- `modelUrl: jsonUrl`
- `logger: devLogger`�E�EevLogger は Model パネルへ追記！E

として呼び出す、E

### 6.2.4 dev / 本番での扱ぁE��E-10 対応！E

- dev viewer�E�Eiewer_dev.html�E�！E
  - 上訁E5 行を **忁E��E* とする、E
  - 出力�Eは UI�E�Eodel パネル�E�！Eコンソールを想定、E
- 本番 viewer�E�E
  - 同じフォーマット�EログめE**任意で** 出力してよい、E
  - 忁E��ではなぁE��、診断上有用なため封E��皁E��再利用を想定する、E

つまめEdevBootLog は「dev viewer で忁E��、本番で任意」�E診断ログとする、E 
フォーマット�E封E��も安�Eに変更しなぁE��E


## 6.3 追加ログカチE��リ�E�開発用�E�E

実裁E��、次のようなカチE��リめEDEBUG フラグ付きで持ってよい�E�E

- HUB (`DEBUG_HUB`)
  - hub のフレームごとの状態スナップショチE��
  - 例：`[hub] frame n { cam, visibleSet, selection }`
- POINTER (`DEBUG_POINTER`)
  - PointerInput の pointerdown / move / up / click イベンチE
- KEYBOARD (`DEBUG_KEYBOARD`)
  - KeyboardInput の keydown イベンチE
- MICROFX (`DEBUG_MICROFX`)
  - microFX 適用前後�E state 変化�E�EocusUuid / relatedUuids / localBounds 等！E

これら�E **チE��ォルチEOFF** とし、E 
開発時にのみ true にして使ぁE��E

禁止事頁E��E

- DEBUG フラグ OFF 時にも大量�Eログを�Eし続けること
- 個人惁E��など 3DSS 外部のチE�Eタを勝手にログへ書き込むこと


## 6.4 エラー処琁E��ユーザメチE��ージ

### 6.4.1 3DSS ロード／検証エラー

`bootstrapViewerFromUrl` は次を行う�E�E

1. `loadJSON(url)` で fetch
2. JSON parse
3. `ensureValidatorInitialized()`�E�EJV にローカルスキーマを読み込む�E�E
4. `validate3DSS(doc)` で strict validation
5. NG の場合�E整形した Error めEthrow�E�Eub は生�EしなぁE��E

エラー種別�E�Eev 表示用�E�！E

- `NETWORK_ERROR` … fetch 失敗！E04 / CORS / offline 等！E
- `JSON_ERROR` … JSON parse 失敁E
- `VALIDATION_ERROR` … strict validation NG

dev viewer では�E�E

- File パネルに
  - `ERROR: <種別>` とメチE��ージ
  - `(no struct loaded)` を�E示
- Model パネルに
  - 詳細�E�Ealidation の `instancePath` / `message` など�E�を `<pre>` で表示

本番 viewer では�E�E

- ユーザには簡易メチE��ージのみ�E�例：`"チE�Eタ読込エラー"`�E�E
- 詳細はコンソール�E��Eスト�Eロギングで扱ぁE
- ぁE��れ�EエラーでめE**hub を生成せぁE* render loop を開始しなぁE


### 6.4.2 ランタイムエラー

ランタイムエラー�E�例：microFX 冁E�� null 参�Eなど�E��E�E�E

- 可能な限り try/catch で握りつつ、E
  - `console.warn` / `console.error` に記録
- viewer 全体�EクラチE��ュを避ける方向でハンドリングする

ただし、カメラめEframe 操作が完�Eに不�EになるよぁE��致命皁E��ラーは、E 
ユーザ UI にも簡易なエラー表示�E�トースト等）を出してよい、E


## 6.5 runtime API と外部連携�E�Eublic surface�E�E

viewer の外部公開面�E�Eublic surface�E��E次の 2 つで構�Eされる！E

1. **runtime entry�E�忁E���E正規！E*
   - `bootstrapViewer(canvasOrId, threeDSS, options?) ↁEhub`
   - `bootstrapViewerFromUrl(canvasOrId, url, options?) ↁEPromise<hub>`
   - 返る `hub` の `hub.core.*` が外部操作�E唯一の入口である

2. **viewerCore�E�任意�Eホスト向け薄ぁE��チE���E�E*
   - 本番ホスト！Estro 等）で使ぁE��すくするための *薁E��ファサーチE として提供してよい
   - viewerCore は冁E��で忁E�� `bootstrapViewer*` を呼び、hub を保持して委譲するだけにする
   - viewerCore を使ぁE��どぁE��はホスト�E合（忁E��ではなぁE��E

レイヤリング規篁E��E

- Host は **bootstrapViewer* もしく�E viewerCore のどちらか**を�E口にする
- Host は `runtime/core/*` / `runtime/renderer/*` を直 import してはならなぁE
- Host は three.js / Object3D に直接触れてはならなぁE��触ってええのは hub の API だけ！E

許可される操作！Eub.core.* 経由�E�！E

- frame / filter / mode / selection / camera / runtime フラグの get / set / step
- pick�E�Ehub.pickObjectAt`�E�による UUID 取征E
- �E�封E���E�イベント購読�E�`onFrameChanged`, `onSelectionChanged` 筁E

禁止される操作！E

- 3DSS document の書き換ぁE
- exporter / 保孁E/ 3DSS への書き戻ぁE
- viewer 冁E��の three.js / Object3D への直接アクセス

### 6.5.1 API レイヤリング

- viewerCore�E�外部公開！E
  - `createViewerCore(canvasOrId, options)` などを通じ、E
  - 冁E��で `bootstrapViewerFromUrl` / `bootstrapViewer` を呼び、E
  - `hub` への安�Eなファサードを提供する、E
- hub�E��E部�E�E
  - `hub.core.*` / `hub.pickObjectAt` / `hub.start` / `hub.stop` を持つ、E
- core / renderer�E�完�E冁E���E�E
  - 外部から直接触らなぁE��E

ホストアプリは **忁E�� viewerCore 経由** で viewer を操作する、E 
hub / core / renderer を直 import してはならなぁE��E

### 6.5.2 許可される操佁E

runtime API を通じて許可される操作�E�E�E

- frame / filter / mode / selection / camera / runtime フラグに関する
  - 読み取り�E�Eet 系�E�E
  - 書き込み�E�Eet / step / next / prev 系�E�E
- pick�E�EpickObjectAt`�E�による UUID 取征E
- イベント購読�E�封E��拡張�E�！E
  - 例：`onFrameChanged`, `onSelectionChanged`

禁止される操作�E�E�E

- 3DSS document の書き換ぁE
- 3DSS の「保存」や「エクスポ�Eト」としての利用
- viewer 冁E��の three.js / Object3D への直接アクセス


## 6.6 スクリーンショチE��・エクスポ�Eト機�E�E�E-11�E�E

### 6.6.1 スクリーンショチE��

viewer 本体！Euntime / viewerCore / hub�E��E、E 
**スクリーンショチE��生�E API を提供してはならなぁE*、E

- `toDataURL` / `toBlob` などで canvas から画像を取る行為は、E
  - ホストアプリ�E�ETML / Astro�E��E責務とする、E
- viewer が独自の「スクショボタン」を持ち、E 
  冁E��で画像生成�Eダウンロードを行うことは禁止、E

琁E���E�E

- viewer は「構造の閲覧・体験」に特化し、E 
  画像生成ツール化を避ける、E
- 専用 API を設計すると、モチE��ごとに仕様が膨ら�Eため、E

### 6.6.2 構造エクスポ�EチE

viewer 本体�E次のエクスポ�Eト機�Eを持ってはならなぁE��E

- glTF / OBJ / FBX 筁E3D モチE��形式へのエクスポ�EチE
- CSV / TSV 等テキスト形式へのエクスポ�EチE
- SVG / PDF / 画像�Eクトル形式へのエクスポ�EチE
- 「現在の filter / selection / frame 状態」を含んだ 3DSS への書き戻ぁE

3DSS から他形式への変換は **modeler めE��用チE�Eルの責勁E* とし、E 
viewer は read-only のまま保つ、E

### 6.6.3 例外：�Eスト�EユーチE��リチE��

ホストアプリが独自に�E�E

- canvas をキャプチャして画像ダウンロード�Eタンを設置
- API から 3DSS を取得して別チE�Eルへ渡ぁE

とぁE��た実裁E��することは許可される、E 
ただしそれ�E viewer 仕様�E一部ではなく、E 
ホスト固有�EユーチE��リチE��として位置づける、E


## 6.7 開発時�EチE��ト�EチE��チE��持E�E�E�非規篁E��E

本節は推奨事頁E��あり、忁E��ではなぁE��E

### 6.7.1 最低限確認すべきルーチE

開発時に最低限確認するべき頁E���E�E

- 起動ルーチE
  - viewer_dev.html ↁEviewerDevHarness ↁEbootstrapViewerFromUrl ↁEhub.start
- 入劁E
  - マウスドラチE���E�orbit / pan / zoom
  - PageUp / PageDown�E�frame ±1�E�Elider / label 追随！E
  - Esc�E�mode 刁E���E�EUD pill / toast�E�E
  - Home�E�camera reset�E�Eizmo HOME と一致�E�E
- devBootLog
  - Model パネルに BOOT / MODEL / CAMERA / LAYERS / FRAME の 5 行が並ぶこと
- filter
  - points / lines / aux の ON/OFF が可視に反映されること
- selection / microFX
  - クリチE��で selection / focus UUID が更新され、E
  - microFX�E�Exes / bounds / marker / glow / highlight�E�が想定どおり出ること

### 6.7.2 DEBUG フラグの運用

- DEBUG_* は git commit 前に false に戻すか、E 
  環墁E��数めE��ルドフラグで刁E��替える、E
- 一時的な `console.log` / `debugger` などは  
  ローカル検証後に削除し、DEBUG フラグ付きロガーへ移す、E


## 6.8 microFX 運用ルール�E�詳細�E�E

本節は、E.4 節で述べぁEmicroFX の補足として、E 
runtime_spec / 7.11 節の MicroFXPayload を踏まえた運用ルールを示す、E

### 6.8.1 microState�E�EicroFXPayload�E��E前提

microState は派生状態であり、E*core が生成�E更新・解除を一允E��琁E*する、E

- microState は `uiState.microState` にのみ保持する
- 生�E・解除の正規ルート�E **`core.recomputeVisibleSet()`** とする
  �E�Eode / selection / visibleSet 整合と同時に更新する�E�E

renderer は microState を読むだけで、書き換えてはならなぁE��E


### 6.8.3 focus / selection / mode との関係！Eeso optional�E�E

- microFX は常に mode に従属する！E

  - mode = macro ↁE`microState = null`�E�EicroFX OFF�E�E
  - mode = micro ↁE`microState != null`�E�忁E��な payload を計算！E
  - mode = meso ↁE**optional**
    - v1 では `meso` めE**macro 相当！EicroFX 無し！E*としても仕様違反ではなぁE
    - meso を実裁E��る場合�Eみ `microState != null` を許可する

- focusUuid は原則 `selection.uuid` と一致する


### 6.8.4 microFX の ON/OFF

ON/OFF は core の責務であり、renderer は `microState === null` かどぁE��だけで判断する、E

- `microState === null`
  - microFX overlay をすべて解除し、baseStyle に完�E復允E��めE
- `microState !== null`
  - focusUuid / relatedUuids / localBounds 等に従って overlay を適用する

注意！E
- microFX の解除�E�復允E�E **常に完�E可送E*であること�E�EaseStyle の保持が忁E��！E
- 解除が忁E��なタイミング�E�例：macro 戻めE/ selection の null 化）�E
  `core.recomputeVisibleSet()` が保証する

### 6.8.5 renderer 冁E��での禁止事頁E

renderer / microFX 実裁E��行ってはならなぁE��と�E�E

- microState を書き換える
- struct�E�EDSS�E�を参�Eせずに独自の「意味」を決める
  - 例：UUID 末尾の記号めE��前に応じて特別扱ぁE��めE
- uiState.mode / selection を直接書き換える
- 構造チE�Eタに依存するよぁE��「恒乁E��な補正」を冁E��にキャチE��ュする

microFX はあくまで「純粋な視覚効果レイヤ」であり、E 
構造チE�EタめE��態�E移ロジチE��には介�EしなぁE��E


---

# 7 拡張・互換性�E�Eiewer�E�schema の変化への追従！E

## 7.1 viewer の拡張方針（基本原則�E�E

viewer は 3DSS に対して、つねに次の原則を守る、E

1. **構造チE�Eタは絶対に変更しなぁE��Etrict read-only�E�E*
   - `.3dss.json` は AJV による strict validation を通過した後、E
     `core.data` / `core.document3dss` として deep-freeze される、E
   - runtime / renderer / UI のぁE��なる層も、この構造めEmutate してはならなぁE��E

2. **スキーマ準拠を最優先し、寛容モードを持たなぁE*
   - 採用中の `3DSS.schema.json` に合�EしなぁE��ァイルは読み込みエラーとする、E
   - `additionalProperties:false` 前提で運用し、未知プロパティの黙認�E行わなぁE��E

3. **“理解はしなくてもよぁE��、壊してはならなぁE��E*
   - viewer が表示めEUI に使わなぁE��E��であっても、構造としてはそ�Eまま保持する、E
   - 不要と見なした頁E��の削除・正規化・補完などは一刁E��わなぁE��E
 �E�補足�E�ここでぁE��「保持」とは、E*スキーマで許可されてぁE��フィールチE*めE
 viewer が利用しなくても破棁E�E正規化しなぁE��とぁE��意味である、E
 スキーマ外頁E��は strict validation により読込拒否する、E


4. **拡張の余地は UI�E�描画補助のみに限定すめE*
   - microFX・HUD・gizmo など、純粋に描画レイヤに閉じた機�Eのみ追加可能、E
   - 構造チE�Eタに影響する拡張�E�保存�E編雁E�Eマイグレーション等）�E全て禁止、E


## 7.2 スキーマ�E封E��拡張への対忁E

3DSS スキーマ�E SemVer�E�EMAJOR.MINOR.PATCH`�E�に従って更新される、E 
viewer は **読み取り専用クライアンチE*として、これにこう追従する、E

### 7.2.1 SemVer と validator

- スキーマファイルは常に単一の `3DSS.schema.json` めEcanonical とする、E
- viewer は起動時にこ�E schema めEAJV へ読み込み、strict モードで validator を構�Eする、E
  - `removeAdditional = false`
  - `useDefaults = false`
  - `coerceTypes = false`
  - `allErrors = true`
  - `strict` 系オプションは警告ではなくエラーとして扱ぁE��E
- 入劁E`.3dss.json` の
  - `document_meta.version`�E�EDSS ドキュメント�Eバ�Eジョン�E�E
  - schema 側 `$id` / `$defs` 筁E 
  を参照し、E*major バ�EジョンぁEschema と一致してぁE��こと**を確認する、E

### 7.2.2 minor / patch での追加・変更

`MAJOR` が一致し、`MINOR/PATCH` の差刁E�� schema 側で吸収可能な場合！E

- viewer が新しい schema に追従済みの場吁E
  - 新規�Eロパティ・enum 値・$defs などは、構造としてそ�Eまま deep-freeze して保持する、E
  - viewer がまだ意味を理解してぁE��ぁE��E��は
    - UI に出さなぁE��もしくは「raw JSON」として補助表示するに留める、E
    - 値の変換めE��完�E行わなぁE��E
- viewer が古ぁEschema のままの場吁E
  - `additionalProperties:false` により未知プロパティは validation NG となる、E
  - こ�E場合、viewer はファイル全体�E読み込みを拒否し、E 
    modeler めEschema 更新側の対応を征E��、E

※「古ぁEviewer が新しい schema を緩く受け�Eれる」挙動�E採用しなぁE��E

### 7.2.3 major バ�Eジョンの非互換変更

- **major 不一致 = 読込不可** とする、E
  - 例：schema `2.x` に対して `1.x` のファイル、もしくはそ�E送E��E
- viewer が行ってよいのは、validation エラーとして報告するところまで、E
- **マイグレーション・自動変換・推測補宁E*は一刁E��止、E
  - 過去 ↁE現行、未来 ↁE現衁EぁE��れ�E方向も同様、E
- 「寛容モード」「�E動アチE�Eグレード」などは  
  modeler めE��用変換チE�Eルの責任篁E��とする、E


## 7.3 aux.extension の扱ぁE

`aux.extension` は、構造チE�Eタ側の拡張用フックであり、viewer は次のように扱ぁE��E

### 7.3.1 extension の存在は許容する

- internal state�E�Eore.data�E�には **そ�Eまま保持** する�E�Eeep-freeze 対象�E�、E
- viewer が理解できる最小単位（例：位置・ベクトル・色など�E��Eみ描画に利用してよい、E
- extension 冁E�E意味論につぁE��
  - 自動補完�E推論生成�E禁止、E
  - 「足りなぁE��報めEAI で埋める」なども禁止、E

### 7.3.2 extension 専用 UI は任意（閲覧限定！E

- 許される�Eは以下�Eような **閲覧補助 UI** に限られる�E�E
  - extension の甁EJSON を表示するインスペクタ
  - extension の一部フィールドをラベルめEtooltip に表示
- extension を編雁E�E保存すめEUI�E�追加 / 削除 / 更新�E��E viewer からは提供しなぁE��E 
  これら�E modeler また�E別チE�Eルの責務とする、E


## 7.4 前方互換性�E�未来バ�Eジョン�E�E

未来の schema に合わせて作られた `.3dss.json` につぁE���E�E

- 現在採用中の `3DSS.schema.json` になぁE��E�� ↁE`additionalProperties:false` により NG、E
- `$defs` などに未知の定義が含まれてぁE��も同様に NG、E
- 「未来バ�Eジョンを緩く読み込む」ことはしなぁE��E

ここでぁE�� viewer とは、本番利用を想定しぁE`runtime/*`�E�Eore / hub / renderer�E�であり、E 
開発老E��け�E実験ローダめE��バッガ�E�Eev-only チE�Eル�E��Eこ�E限りではなぁE��E 
それめEdev 用チE�Eルは viewer 仕様�E対象外とする、E


## 7.5 後方互換性�E�過去バ�Eジョン�E�E

古ぁE3DSS ファイルにつぁE���E�E

- 忁E��頁E��不足 ↁE`required` で NG�E�Eiewer が補完してはならなぁE��、E
- 型不一致 ↁENG�E�数値を文字�Eとして緩和するなどは NG�E�、E
- 古ぁE��造 ↁENG�E�互換レイヤは持たなぁE��、E
- viewer が独自に旧バ�Eジョンを変換・補修することは禁止、E

過去バ�Eジョンから現行バージョンへの移行�E、E 
modeler / 専用変換スクリプト / 人間�E作業篁E��であり、viewer の役割外とする、E


## 7.6 viewer 側の許容される拡張

viewer が拡張してよいのは **UI レイヤと描画補助レイヤのみ**、E

### 許容される拡張侁E

- チE�Eマ�E替�E�ライチE/ ダークなど�E�E
- HUD 要素
  - 軸・グリチE��強調
  - 凡例�Eスケールバ�E
  - モード�Eフレーム・フィルタ状態�E表示
- カメラ操作�E改喁E
  - ease 付き orbit / pan / zoom
  - 視点プリセチE���E�Eront / side / top / iso 等！E
- microFX 系の視覚補助
  - focus 周辺の glow / bounds / axes 表示など
- 表示最適匁E
  - instancing / caching / LOD など、構造不変�E篁E��での最適匁E

ぁE��れも **3DSS の構造�E�Eoints / lines / aux / document_meta�E�を書き換えなぁE*  
とぁE��条件を満たす限り、�E由に拡張してよい、E


## 7.7 禁止される拡張

viewer に対して、次のような拡張を追加してはならなぁE��E

1. **構造チE�Eタの編雁E���E**
   - 頁E��の追加・更新・削除
   - Undo / Redo
   - annotation / comment / note など編雁E��念
2. **構造チE�Eタの修復・補完�Eマイグレーション**
   - 欠損値の推測埋め
   - 未来スキーマ頁E��の推測生�E
   - 「viewer 独自形式」への保孁E
3. **AI 補完�E変換**
   - 意味論に基づく�E動変換・要紁E�E再�E置
   - extension の冁E��めEAI で自動補宁E
4. **viewerSettings の永続化**
   - viewerSettings めEJSON として保存し、�E読み込みすること�E�詳細は 5.x 参�E�E�、E
   - v1 では UI 状態�EセチE��ョン冁E�E一時状態に限定する、E
5. **スクリーンショチE�� / export 機�Eの冁E��**
   - glTF / SVG / CSV などへの構造 export めEviewer runtime に直接持たせること、E
   - Canvas のスクリーンショチE��取征EAPI めEviewer の正式機�Eとして提供すること、E 
     �E�忁E��なめEhost 側がブラウザ標準機�EめE��部チE�Eルで取得する。！E

これら�E禁止事頁E��して明示し、viewer は **純閲覧アプリ** であることを保証する、E


## 7.8 仕様変更時�E viewer 側の対忁E

3DSS スキーマや viewer 仕様が更新された場合、viewer が行うべき対応�E以下に限定される、E

1. **Validator の更新**
   - 採用する `3DSS.schema.json` を差し替え、AJV 初期化を更新する、E
   - validation エラーのログ・メチE��ージ形式を忁E��に応じて調整する、E

2. **描画ロジチE��の最小限の更新**
   - appearance / aux.module など、schema 拡張に応じて renderer の解釈を拡張する、E
   - 既存�E構造解釈を壊さなぁE��E��でのみ変更する、E

3. **UI の調整**
   - 新しい module / signification / tags などをフィルタ・凡例に追加する、E
   - 不要になっぁEUI 要素を削除する、E

4. **構造チE�Eタへの書き戻し�E禁止**
   - 仕様変更を理由に viewer 側が�E動変換を行い、E 
     新しい .3dss.json を書き�Eすことは行わなぁE��E


## 7.9 拡張・互換性に関する禁止事頁E��統合！E

本章の冁E��をまとめると、viewer は次をしてはならなぁE��E

1. 採用中の `3DSS.schema.json` に定義されてぁE��ぁE��E���E�スキーマ外頁E���E��E読込・保持・解釈、E
2. major 不一致の 3DSS ファイルを「寛容モード」で読み込むこと、E
3. 構造チE�Eタの修復・自動補完�Eマイグレーション、E
4. AI による構造推測・追加頁E��の生�E、E
5. 編雁EUI�E�Edd / update / remove / undo / redo�E��E導�E、E
6. viewerSettings を永続化し、次回起動時に自動復允E��ること、E
7. extension の意味解釈�E構造生�E・補完（構造変更に相当するもの�E�、E
8. スクリーンショチE�� / export めEviewer runtime の責務として冁E��すること、E

これらを禁じることで、viewer は **「strict かつ非破壊な閲覧専用クライアント、E* として
長期的な互換性を維持する、E


## 7.10 Frame UI 操作�Eリシー�E�フレーム操作規篁E��E

### 7.10.1 基本方釁E

- frame は一次允E�E整数 ID で管琁E��る！EframeId: number`�E�、E
- `frame.range = {min, max}` を満たす `min ≤ frameId ≤ max` の離散値のみを扱ぁE��E
- viewer コア�E�Ecore.frameController`�E��E **離散スチE��チE* として frame を管琁E��、E 
  連続値めE��間は扱わなぁE��E
- frame 刁E��の責務�E
  - 入力操佁EↁE`activeFrameId` 更新
  - それに伴ぁE`visibleSet` 再計箁E 
  に限定し、ED タイムライン UI の表現めE��E��は UI 層に委�Eる、E

### 7.10.2 操作体系�E�±1 スチE��プ中忁E��E

v1 の基本操作�E、E*±1 スチE��プ�Eペ�Eジ送り** を中忁E��設計する、E

- UI ボタン
  - Step Back: `prev`
  - Step Forward: `next`
  - Rew/Home: `frame.set(range.min)`
  - FF: `frame.set(range.max)`
  - Play: 一定間隔で `next`�E�末尾到達時は `range.min` にループ！E
- スライダ
  - `range.min`〜`range.max` の整数値のみを取る、E
  - `input` / `change` イベントで `frame.set(value)` を呼ぶ、E
- キーボ�Eド（標準ハンドリング�E�E
  - `PageUp`: `next`
  - `PageDown`: `prev`
  - これら�E `KeyboardInput` ↁE`hub.core.frame.next`/`hub.core.frame.prev/` 経由で処琁E��、E 
    UI ハ�Eネス側から直接 frameController を触らなぁE��E

Space ↁEPlay/Pause トグルなど、UI 専用ショートカチE��は  
viewerDevHarness 側でのみ実裁E��てよい�E�本番 viewer では任意）、E

### 7.10.3 mode / microFX との関俁E

- 単発の frame 移動（±1 step / slider�E��E
  macro / meso / micro ぁE��れ�E mode からも実行してよい、E

  - ただし、frame 変更後�E派生状態更新は **忁E��**
    `core.recomputeVisibleSet()` に雁E��E��る、E
    �E�EisibleSet / selection整吁E/ microState の更新/解除を含む�E�E

- **frame 再生�E�Elay�E�中の制紁E*
  - 再生開始時に `uiState.mode` めE`"macro"` に戻す、E
  - `uiState.runtime.isFramePlaying = true` とし、microFX を無効化する、E
  - 再生中は `core.recomputeVisibleSet()` ぁE
    `uiState.microState = null` を保証する、E
  - 再生停止時に `isFramePlaying = false` とし、忁E��なめE
    `core.recomputeVisibleSet()` で microState を�E評価する、E

注記！E
- v1 では `meso` は **optional** とし、実裁E��無ぁE��合�E
  macro 相当！EicroFX無し）として扱ってよい、E


### 7.10.4 camera / filter との関俁E

- frame 操作�Eカメラ state を直接変更しなぁE���E動カメラは封E��拡張�E�、E
- filter�E�Eoints/lines/aux�E�変更時と同様に、frame 変更後�E
  - `visibleSet` を�E計箁E
  - microFX / selection ハイライトを忁E��に応じて再適用  
  するのみとし、構造チE�Eタには介�EしなぁE��E

### 7.10.5 音声ポリシー

viewer / modeler ともに **UI 効果音は採用しなぁE*、E

- コンチE��チE�E�E�動画・3D アニメーション等）が独自に鳴らす音は例外、E
- viewer UI の操作！Erame 移動�E再生ボタン・gizmo 等）�E完�Eサイレントとする、E
- 設定画面にも「Sound」「SFX」などの頁E��は追加しなぁE��E


## 7.11 microFX  Eミクロ視覚補助アルゴリズム�E�Eiewer 専用�E�E

### 7.11.0 概要とモジュール構造

microFX は「構造チE�Eタを一刁E��更せず、micro / meso モード時の局所構造めE 
読み取りめE��くするため�E視覚補助」�E総称とする、E

冁E��皁E��は次の 3 レイヤに刁E��れる、E

1. **microState�E�Eore.microController�E�E*
   - selection / cameraState / structIndex などから、E
     フォーカス UUID・原点座標�E局所バウンチE��ングなどを計算する、E
   - three.js の Object3D には依存しなぁE��ドメイン層、E
2. **microFX-core**
   - `visibleSet` を前提に、フォーカス原点からの距離・接続関係などを評価し、E
     「どの uuid をどの程度強調 / 減衰するか」を決定する、E
   - opacity・color などへの影響度�E�係数�E�を算�Eする、E
3. **microFX-overlays�E�Eenderer 側�E�E*
   - microState と microFX-core の結果を受け取り、E
     three.js シーン冁E�� glow / bounds / axes / highlight などの  
     補助オブジェクトを追加・更新・削除する、E

### 7.11.1 microState の形弁E

microState は `MicroFXPayload` と呼ぶ冁E��オブジェクトで、概�E次の形をとる、E

```ts
type MicroFXPayload = {
  focusUuid: string;                      // フォーカス対象の UUID
  kind: "points" | "lines" | "aux" | null;
  focusPosition: [number, number, number];// マ�Eカー等�E基準位置�E�Eorld 座標！E
  relatedUuids: string[];                 // 1hop 接続など、E��連 UUID 群
  localBounds: {
    center: [number, number, number];
    size:   [number, number, number];
  } | null;
};
```

- `core.microController` は selection / structIndex / cameraState をもとに  
  毎フレームではなく、忁E��なときだぁE`MicroFXPayload | null` を更新する、E
- `uiState.microState` にこ�E payload が保持され、viewerHub ↁErenderer に伝達される、E

### 7.11.2 適用条件�E�Eode・ランタイム状態！E

microFX は次の条件をすべて満たすとき�Eみ有効となる、E

1. `uiState.mode === "micro"`  
   - mode の定義・遷移条件は第 4.6 節�E�カメラモード）を参�E、E
2. `uiState.viewerSettings.fx.micro.enabled === true`
3. `uiState.runtime.isFramePlaying === false`
4. `uiState.runtime.isCameraAuto === false`�E�封E��の自動カメラ用フラグ�E�E

ぁE��れかが満たされなぁE��合、renderer は

- `applyMicroFX(null)` 相当�E処琁E��行い、E
- `visibleSet` 冁E�E全要素の描画属性めEbaseStyle�E�構造に基づくデフォルト）へ戻す、E

### 7.11.3 microFX-overlays�E�Earker / glow / axes / bounds / highlight�E�E

microFX-overlays は、microState を�Eに three.js シーン冁E��追加されめE 
補助オブジェクト群の総称とする、E

v1 では次のモジュールを想定する、E

- **marker**
  - `focusPosition` を基準に、小さなマ�Eカー�E�アイコン�E�を表示する、E
- **glow**
  - フォーカス要素の周辺に琁E�� / チューブ状のハローを重ねる、E
- **axes**
  - microFocus 周辺に局所座標軸�E�E/Y/Z�E�を表示する、E
- **bounds**
  - `localBounds` に基づく局所 bounding box を表示する、E
- **highlight**
  - フォーカス要素に沿ったオーバ�Eレイ線を描画する、E

共通ルール�E�E

- ぁE��れも struct�E�EDSS�E�には一刁E��れず、three.js の Object3D 追加・削除と  
  material�E�Eolor / opacity / transparent 等）�E変更のみで実裁E��る、E
- macro モードでは microFX-overlays は常に無効�E�E.11.7 参�E�E�、E

v1 では **highlight を忁E��E* とし、その他�Eモジュールは optional とする、E

### 7.11.4 距離フェードと接続強調

microFX-core は、フォーカス原点との距離と接続関係に基づぁE 
吁E��素の描画強度を決める、E

1. **距離フェーチE*
   - 任意要素 `u` に対し、その代表位置 `p(u)` と `focusPosition` との距離 `d` を計算する、E
   - 距離 `d` に基づぁE�� 0、E のフェード係数 `fade(d)` を定義する、E
   - 例！E
     - `d ≤ R1` ↁE`fade = 1.0`�E�完�E不透�E�E�E
     - `d ≥ R2` ↁE`fade = minOpacity`�E�遠方は薁E���E�E
     - `R1 < d < R2` ↁE線形補間、もしくは ease 付きカーチE

2. **接続強調�E�E hop 周辺�E�E*
   - フォーカスぁEpoint の場合！E
     - そ�E point を端点に持つ line めE1hop line とする、E
     - それら�E line のもう一方の端点 point めE1hop point とする、E
   - フォーカスぁEline の場合！E
     - そ�E line の端点 point めE1hop point とする、E
     - これらとつながる line めE1hop line とする、E
   - 1hop 要素は距離フェードに加えて、加点�E��Eるさ増し・太さ増しなど�E�で強調してよい、E

具体的な係数めE��ーブ�E `renderer/microFX/config.js` に雁E��E��、E 
数値チューニングはそ�Eファイルのみを変更すればよい設計とする、E

### 7.11.5 パフォーマンスとスコーチE

- microFX は **常に `visibleSet` 冁E�E要素のみ** を対象とする、E
  - 非表示要素に対して距離計算や overlay を行わなぁE��E
- 大規模チE�Eタに対しても破綻しなぁE��ぁE��E
  - per-frame での大釁E`new` を避ける�E��E列�E利用など�E�、E
  - オーバ�Eレイ用 Object3D の再利用�E�Eensure*` パターン�E�を基本とする、E
- frame / filter 変更時�Eみ再評価し、カメラの微小移動ごとに  
  全体を再計算しなぁE��ぁE��実裁E��てよい�E�近似の篁E��で�E�、E

### 7.11.6 renderer とのインタフェース

renderer 側の microFX 関連 API は次のような最小インタフェースとする、E

- `applyMicroFX(microState: MicroFXPayload | null): void`
  - `null` の場合：�Eオーバ�Eレイを削除し、baseStyle に戻す、E
  - payload がある場合！E
    - microFX-overlays めE`ensure*/update*/remove*` で更新、E
    - 対象要素の material をフェード係数に応じて変更、E
- renderer は microState のフィールドを **読み取るだぁE* でよい、E 
  struct に書き戻すことめE��microState めEmutate することは禁止、E

### 7.11.7 mode・他機�Eとの相互作用

- **macro モーチE*
  - microFX は常に無効�E�Eenderer は `applyMicroFX(null)` の状態を保つ�E�、E
  - 局所強調は 7.12 節の selection ハイライトに委�Eる、E

- **meso モード！Eptional�E�E*
  - v1 では meso は **実裁E��なくてよい**、E
  - 実裁E��なぁE��合、meso は macro と同等�E見え方
    �E�EicroFX 無ぁE/ `microState = null`�E�で問題なぁE��E
  - meso を実裁E��る場合�Eみ、meso 専用の microState を導�Eしてよい、E

- **frame 再生**
  - 再生開始時に `uiState.mode = "macro"` とし、microState をクリアする、E
  - 再生中に microFX が�E度有効化されなぁE��とめE
    `uiState.runtime.isFramePlaying` と `core.recomputeVisibleSet()` で保証する、E

- **filter 刁E�� / frame 刁E��**
  - filter / frame の変更後�E、派生状態更新めE**忁E��**
    `core.recomputeVisibleSet()` に雁E��E��る、E
  - renderer は「渡されぁE`visibleSet` と `microState`」だけを反映し、E
    自前で再計算しなぁE��E


## 7.12 Selection ハイライト！Eacro モード用�E�E

### 7.12.1 目皁E

selection ハイライト�E、E*macro モード時に「現在選択中の 1 要素」を明示する**ための  
軽量な強調表現とする、E

- macro�E��E体俯瞰�E�「どれを選んだか」を中忁E�� selection ハイライトを使ぁE��E
- micro�E�microFX を中忁E��し、selection ハイライト�E抑制する、E

こ�E役割刁E��により、同ぁEuuid に対して  
「macro では selection highlight」「micro では microFX」とぁE��  
刁E��りやすい挙動に統一する、E

### 7.12.2 適用条件

selection ハイライト�E、次の条件をすべて満たすときにのみ描画される、E

1. `uiState.mode === "macro"`
2. `uiState.selection` ぁE`{kind, uuid}` で、`uuid` が非 null
3. `uuid` ぁE`visibleSet` に含まれてぁE��

こ�E条件を満たさなぁE��合、renderer は selection ハイライト用オーバ�Eレイを解除し、E 
baseStyle�E�構造に基づくデフォルト）�Eみを表示する、E

### 7.12.3 制御フローと責務�E拁E

- `core.selectionController`
  - selection の唯一の正規ルートとする、E
  - `select(uuid)` / `clear()` / `get()` を提供し、E
    `uiState.selection` を更新する、E
  - selection ぁE`visibleSet` から外れた場合�E整合！Eull化等）も
    `core.recomputeVisibleSet()` が保証する、E

- `viewerHub`
  - render loop の tick で `uiState` のスナップショチE��を読み取り、E
    次をこの頁E�� renderer に適用する�E�E
    - `renderer.applyFrame(uiState.visibleSet)`
    - `renderer.applySelection(uiState.selection)`�E�Eacro のみ有効条件は renderer 側で判定してよい�E�E
    - `renderer.applyMicroFX(uiState.microState)`
    - `renderer.updateCamera(uiState.cameraState)`
    - `renderer.render()`

- renderer
  - `applySelection({kind, uuid} | null)` を受けて
    macro モード用の軽ぁE��調�E�上書き）を行う、E
  - `visibleSet` に含まれなぁEuuid にはハイライトを描画しなぁE��E
  - 解除時�E baseStyle に完�E復允E��きること�E�可送E��を保証する、E

### 7.12.4 microFX / mode 遷移との関俁E

- **macro ↁEmicro への遷移**
  - `modeController.setMode("micro", uuid)` により micro モードへ入るとき、E
    - `uiState.selection` 自体�E保持してよいが、E
    - 描画上�E selection ハイライト�E無効化する！EclearAllHighlights()`�E�、E
  - 同じ `uuid` をフォーカスとした microFX�E�E.11�E�が有効になる、E
- **micro ↁEmacro への遷移**
  - `modeController.setMode("macro")` で戻った時点で、E
    - microFX は `applyMicroFX(null)` により解除、E
    - `selectionController` 側で、現在の selection を基に  
      `setHighlight({kind, uuid})` を�E適用する、E
- **frame / filter 変更晁E*
  - frame / filter の変更で selection の対象が非表示になった場合、E
    - selection を維持するかどぁE��は `selectionController` のポリシーとする、E
    - ぁE��れにせよ、`visibleSet` に含まれなぁE��素への highlight は描画しなぁE��E

### 7.12.5 仕様上�E位置づぁE

- selection ハイライト�E **「macro モード用の最低限の局所強調、E* と位置づける、E
- microFX は 7.11 のとおり、micro モードにおける詳細な局所読解のための  
  視覚補助であり、両老E�E競合せず補完し合うように設計する、E
- どちら�E機構も 3DSS 構造は一刁E��更せず、描画属性と overlay にのみ作用する、E
