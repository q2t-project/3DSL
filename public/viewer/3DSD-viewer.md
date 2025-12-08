================================
3DSD-viewer.md（viewer）
================================

# 0 目的と適用範囲

## 0.1 viewer の役割

3DSD-viewer（以下、viewer）は、  
3DSL プロジェクトにおける **構造データの閲覧・確認・体験** に特化した  
専用ビューワアプリケーションである。

viewer は modeler によって生成された `.3dss.json` を読み取り、次を提供する：

- 三次元構造の忠実な可視化
- フレーム（時間層）の切替
- レイヤ（lines / points / aux）の表示切替
- 構造全体の俯瞰・ズーム・回転
- name / description / appearance / meta の確認（表示のみ）

### 重要な前提

- viewer は **構造データを絶対に変更しない**
- 完全な **read-only（参照専用）アプリ**
- modeler と異なり **保存・出力機能を持たない**
  （UI 状態の永続化も禁止）

UI 状態（選択・カメラ・表示設定）は session 内のみ有効で、  
構造データに書き戻されることはない。


## 0.2 common 仕様との関係

viewer は次の文書に従う：

- `/schemas/3DSS.schema.json`
- `/specs/3DSD-common.md`

common による規範を忠実に解釈して表示する：

- 座標系（Z+ up / freeXY）
- lines / points / aux の意味
- frames の扱い（表示フィルタ）
- カメラ規範（投影・Z+ up・原点）
- 座標変換・単位系

viewer は modeler と対称的であり、  
**生成（modeler） vs 閲覧（viewer）** の役割分担が明確である。


## 0.3 適用範囲

本仕様は `/code/viewer/` の全モジュールに適用する：

- Core（読込・状態管理）
- Renderer（三次元描画）
- UI（viewer 専用 UI）
- Validator（strict validation）
- Utils（座標変換・色処理）
- HUD（axis / origin など視覚補助）


## 0.4 非対象

viewer は閲覧専用アプリであり、以下は仕様外：

- 構造データの編集
- 構造データの保存
- UI 状態の永続化
- annotation / comment / report などの編集系機能
- modeler の内部動作
- スキーマの定義・変換

内部 API でも update / remove / patch 等の語彙は使用禁止。


## 0.5 設計方針（閲覧専用アプリとして）

1. **参照専用**  
   構造データは immutable。書き換え禁止。

2. **忠実表示**  
   modeler 出力の値を改変せず、可能な範囲で忠実に表示する。  
   描画上の補助は、構造データを不変のまま扱う範囲に限定する。

3. **高速応答**  
   frame / camera / visibility の UI 操作を即時反映。

4. **UI 状態と構造データの完全分離**  
   UI 状態（選択・カメラ・visibility）は uiState のみで保持し、  
   JSON に混入させない。

5. **外部通信なし**  
   スキーマ取得や remote fetch を行わず、local vendor のみ参照。

---

# 1 システム全体構成（内部アーキテクチャ）

viewer は modeler と同粒度の内部構造を持つが、  
**構造データは常に read-only（不変）** で保持される点が最大の違いである。

内部的には、次の 3 レイヤと 2 種類のエントリポイントから構成される。

- runtime 層  
  - Core（構造 state + uiState 管理）
  - Renderer（三次元描画・microFX）
  - viewerHub（runtime API 集約）
- UI / dev harness 層  
  - dev 用 HTML / JS
  - pointerInput / keyboardInput / gizmo / picker / timeline
- Validator / Utils 層  
  - strict validator
  - structIndex / 各種ユーティリティ

エントリポイント：

- `bootstrapViewer(canvasOrId, document3dss, options?)`
- `bootstrapViewerFromUrl(canvasOrId, url, options?)`
  - どちらも `viewerHub` を返し、その `hub.core.*` が唯一の runtime API となる。


## 1.1 モジュール構成

viewer 実装はおおよそ次のモジュール群に分かれる。

| レイヤ / モジュール | 代表ファイル例 | 役割 |
|--------------------|----------------|------|
| Boot               | `runtime/bootstrapViewer.js` | canvas と 3DSS を受け取り runtime を起動し、`viewerHub` を返す。レンダーループ開始や PointerInput / KeyboardInput の接続は行わず、Host / dev harness 側の責務とする |
| Hub                | `runtime/viewerHub.js` | Core / Renderer をまとめて外部に公開するファサード。`hub.core.*` API と `hub.start/stop` を束ねる |
| Core               | `runtime/core/*.js` | 3DSS 構造 state（immutable）と uiState（viewer 専用 state）の管理。各種 Controller / CameraEngine を含む（PointerInput / KeyboardInput は UI レイヤ `ui/*` に分離） |
| Renderer           | `runtime/renderer/context.js` + `renderer/microFX/*` | three.js による描画、microFX、selection ハイライト |
| UI（dev harness）  | `viewerDevHarness.js` `ui/gizmo.js` `ui/pointerInput.js` `ui/keyboardInput.js` など | dev 用 HTML / HUD / ボタン類。PointerInput / KeyboardInput / gizmo / タイムラインで受けたマウス / キー入力を **`hub.core.*` / `hub.pickObjectAt` 経由で** runtime に橋渡しする |
| Validator          | `runtime/core/validator.js` | `/schemas/3DSS.schema.json` に対する strict full validation |
| Utils / Index      | `runtime/core/structIndex.js` など | uuid インデックス構築、frame 範囲検出などの補助機能 |
| HUD / 視覚補助     | `renderer/microFX/*` | axis / marker / bounds / glow / highlight 等、構造とは無関係な viewer 専用描画 |

PointerInput / KeyboardInput は `ui/pointerInput.js` / `ui/keyboardInput.js` に置き、UI レイヤ（Host / dev harness）の一部とみなす。  
責務としては「入力レイヤ」の一部であり、**Host / dev harness から `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` で生成・接続する**。  
`runtime/bootstrapViewer.js` や `runtime/core/*` からは import / new してはならない。

※ 実ファイル構成は `viewer/runtime/*`・`viewer/ui/*` のスケルトンに準拠する。  
※ three.js / AJV といった外部ライブラリは runtime からのみ利用し、UI から直接触らない。



### 1.1.1 存在しないモジュール（明確に禁止）

viewer には次のモジュールは存在しない（追加も禁止）：

- Exporter（構造データの保存・書き出し）
- Editor（構造編集）
- Annotation / Report（注釈・レポート）
- Snapshot / Export（スクリーンショット生成等、viewer 独自出力）


## 1.2 Core（read-only state）

Core は「構造 state」と「UI state (uiState)」の 2 系列だけを扱う。

- **構造 state（struct）**

  - strict validation 済み .3dss.json をそのまま保持する。
  - トップレベル構造：
    - `lines[]`
    - `points[]`
    - `aux[]`
    - `document_meta`
  - deep-freeze された read-only オブジェクトとして扱い、  
    要素の add / update / remove / 座標補正などは一切行わない。

- **UI state（uiState）**

  - viewer が「どう見せているか」の状態だけを持つ。
  - 例：
    - `selection`（選択中 uuid と kind）
    - `frame.current` / `frame.range`
    - `cameraState`（位置・向き・FOV 等）
    - `filters`（lines/points/aux の ON/OFF）
    - `runtime`（frame 再生中か、自動カメラ中か 等）
    - `mode`（macro / meso / micro）
    - `microState`（microFX の入力）
    - `viewerSettings`（lineWidth や microFX 設定など）
    - `visibleSet`（現在描画対象となっている uuid 集合）

構造 state と uiState の詳細は第 2 章・第 5 章にて定義する。  
本章では「**struct は不変／uiState だけが変化する**」という関係だけを固定する。


## 1.3 内部依存関係

依存方向は常に「上位レイヤ → 下位レイヤ」の一方向とする。

- UI / dev harness レイヤ（`viewer_dev.html` / `viewerDevHarness.js` / gizmo / timeline / HUD DOM）
  - ↓ `viewerHub`（`hub.core.*` / `hub.pickObjectAt`）
- runtime Boot / Core（uiState / 各種 Controller / CameraEngine / Visibility / Selection / Mode / Micro ）
  - ↓ struct（immutable 3DSS）
  - ↓ Renderer（rendererContext + microFX）
- three.js / WebGL

PointerInput / KeyboardInput は「入力イベント集約レイヤ」として、  
window / canvas の DOM イベントを 1 箇所で受け取り、  
必ず `hub.core.*` だけを叩く（CameraEngine や three.js を直接触らない）。

Validator は「runtime 起動前の読み込みフェーズ」にだけ挿入される：

- JSON ロード → Validator（strict full validation）→ OK のときのみ Core に渡す

HUD / microFX は Renderer の一部として扱い、  
構造 state には一切依存させない（座標参照はしても、構造の変更はしない）。


## 1.4 各モジュールの責務

### 1.4.1 Boot（bootstrapViewer.js）

- `bootstrapViewer(canvasOrId, document3dss, options?)`
  - 役割：
    - canvas 解決（DOM 要素 or id 文字列）
    - 3DSS 構造の deep-freeze（以後 immutable として扱う）
    - structIndex（uuid インデックス / frame 範囲）の構築
    - rendererContext の初期化（三次元シーン構築・シーンメトリクス算出）
    - 初期カメラ状態の決定（シーンメトリクスから決定的に算出）
    - uiState の初期化（frame / filters / runtime フラグなど）
    - CameraEngine / FrameController / VisibilityController / SelectionController / MicroController / ModeController の初期化
    - `createViewerHub({ core, renderer })` を呼び出し、hub を生成
    - `options.devBootLog` が true のとき、起動ログ（BOOT / MODEL / CAMERA / LAYERS / FRAME）を 1 回だけ出力
  - 前提：
    - `document3dss` は既に strict validation 済み
  - options（dev 用拡張）：
    - `devBootLog?: boolean`  
      true のとき、起動完了時に dev 起動ログを 5 レコード出力する。
    - `devLabel?: string`  
      `BOOT <label>` のラベルとして使う（省略時 `"viewer_dev"` 相当）。
    - `modelUrl?: string`  
      `MODEL <modelUrl>` の表示と、host 側メタパネル表示用の情報源。
    - `logger?: (line: string) => void`  
      起動ログの出力先。省略時は `console.log` を用いる。

- `bootstrapViewerFromUrl(canvasOrId, url, options?)`
  - 役割：
    - `url` から JSON を fetch
    - `/schemas/3DSS.schema.json` を `validator.js` でロード・初期化（初回のみ）
    - strict full validation（3DSS v1.0.x）を実行
    - OK のときのみ `bootstrapViewer(canvasOrId, document3dss, mergedOptions)` を呼び出す
      - `mergedOptions.modelUrl = options.modelUrl ?? url`
  - エラー時：
    - validation エラー内容（`instancePath` / `message`）を整形した Error を throw し、hub は生成しない。


### 1.4.2 viewerHub（runtime/viewerHub.js）

- runtime 内部にある Core / Renderer / CameraEngine 等をまとめて管理し、  
  外部には **hub 1 オブジェクトだけ** を見せる。

- 代表的な公開インターフェース：

  - `hub.start()` / `hub.stop()` … アニメーションループ開始・停止
  - `hub.pickObjectAt(ndcX, ndcY)` … NDC 座標から構造要素の uuid を取得
  - `hub.core.frame.*`
  - `hub.core.camera.*`
  - `hub.core.selection.*`
  - `hub.core.mode.*`
  - `hub.core.micro.*`
  - `hub.core.filters.*`
  - `hub.core.runtime.*`

- UI / dev harness / host アプリは **hub 経由でしか runtime を操作してはならない**。


### 1.4.3 Core

- strict validation 済み 3DSS を struct として保持（deep-freeze）
- uiState の生成・更新
- 各種 Controller による状態遷移：
  - frameController … frame の切り替え・再生
  - selectionController … selection の唯一の正規ルート
  - visibilityController … frame / filter から visibleSet を再計算
  - modeController … macro / meso / micro モード管理
  - microController … microFX 用の microState を計算
  - CameraEngine … cameraState の唯一のソースオブトゥルース

Core は three.js を直接は知らず、Renderer に対して「状態」を渡すだけとする。


### 1.4.4 Renderer

- three.js / WebGL による描画処理を担当
- 主な責務：
  - struct + structIndex をもとに Object3D 群を構築
  - `applyFrame(visibleSet)` による表示・非表示の切り替え
  - `updateCamera(cameraState)` によるカメラ反映
  - `applyMicroFX(microState, cameraState)` による microFX 適用 / 解除
  - `applySelection(selectionState)` による macro モード用ハイライト
  - `pickObjectAt(ndcX, ndcY)` によるオブジェクト選択（raycasting）

Renderer は構造 state を変更せず、描画属性（マテリアル・visible・renderOrder 等）のみを操作する。


### 1.4.5 UI / dev harness

- 開発用 viewer（viewer_dev.html）や将来の Astro ページなど、  
  HTML / DOM サイドの実装を担う。

- 代表モジュール：
  - `pointerInput` … canvas 上のマウス操作 → hub.core.camera / hub.pickObjectAt
  - `keyboardInput` … keydown → hub.core.frame / hub.core.mode / hub.core.camera
  - `gizmo` … 画面右下のカメラギズモ → hub.core.camera.*
  - `picker` … click → hub.pickObjectAt → hub.core.selection.*
  - `timeline` … frame 再生 UI → hub.core.frame.*

UI は viewerHub の公開 API のみを利用し、Core / Renderer に直接触れてはならない。


### 1.4.6 Validator

- `/schemas/3DSS.schema.json` に対する strict full validation を実行する。
- チェック内容：
  - type / required / enum / additionalProperties:false
  - ref → uuid 整合
  - uuid の重複・形式
  - frames・appearance・document_meta の整合
  - schema `$id` と `document_meta.version` の major 一致
- NG の場合は **読込拒否**。部分読込や自動修復は行わない。


### 1.4.7 Utils / Index / HUD

- Utils / Index
  - `structIndex` による uuid → kind / element 参照
  - frame 範囲検出（min / max）、座標系ユーティリティ

- HUD / microFX
  - axis / origin / bounds / glow / highlight などの視覚補助
  - すべて Renderer 内部の three.js オブジェクトとして実装
  - 3DSS 構造には一切書き戻さない（「見え方」専用）


## 1.5 I/O（viewer：概要）

- 入力： `.3dss.json`（strict full validation 済み 3DSS 構造データ）
- 出力：無し

UI 状態・カメラ・visibility などは **セッション内の uiState にだけ保持** し、  
ファイル保存や外部出力は行わない。

詳細な I/O ポリシーは第 6 章にて定義する。


## 1.6 禁止事項（viewer 全体）

viewer は次の行為を一切行ってはならない：

1. 構造データの変更（add / update / remove）
2. 構造データの保存（Exporter）
3. 編集イベント（undo / redo / duplicate 等）の実装
4. UI 状態の JSON 出力・永続化
5. annotation / comment / report 等の生成
6. viewerSettings を JSON 化して保存（永続化）すること
7. extension の意味解釈・生成・補完（構造変更に相当）
8. normalize / 推測 / 補完 / prune / reorder 等の生成処理
9. 未来スキーマ項目の推測・解釈（semantic inference）

viewer は **完全 read-only の表示装置** であり、  
viewer 独自情報は uiState 内部にのみ保持してよい（構造データへの混入禁止）。

## 1.7 起動フロー（viewer_dev.html → viewerDevHarness.js → bootstrapViewer → viewerHub）

### 1.7.1 エントリ経路の固定

`viewerDevHarness.js` が `bootstrapViewerFromUrl` を呼び、得られた `viewerHub` に対して  
`hub.start()` を呼び出し、さらに `PointerInput` / `KeyboardInput` を構築して canvas / window にイベントを接続する。

1. `viewer_dev.html`  
   - dev 用 DOM 骨格（3D canvas・ログ領域・ボタン等）を定義する。

2. `viewerDevHarness.js`  
   - `window.load`（または `DOMContentLoaded`）後に UI 要素をひととおり取得し、  
     `bootstrapViewerFromUrl(canvasId, jsonUrl, options)` を 1 度だけ呼び出す。
   - 得られた `viewerHub` をローカル変数およびグローバル（`window.hub` 等）に expose して、  
     dev 用 UI / コンソールから診断できるようにする。
   - `hub.start()` を呼び出して render loop（`requestAnimationFrame`）を開始する。
   - `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` を生成し、  
     `attach()`（あれば）を呼んで canvas / window に pointer / key イベントを接続する。
   - PointerInput / KeyboardInput / gizmo / タイムラインなどで受けた入力を  
     `hub.core.*` / `hub.pickObjectAt` にマッピングする。

3. `runtime/bootstrapViewer.js`  
   - 3DSS の strict validation（`bootstrapViewerFromUrl` 経由の場合）。
   - struct の deep-freeze / `structIndex` 構築。
   - `rendererContext` / `uiState` / `CameraEngine` / 各種 Controller の初期化。
   - `createViewerHub({ core, renderer })` を呼び出し、`hub` を返す。  
     （ここでは `hub.start()` を呼ばず、レンダーループ制御は Host / dev harness 側の責務とする）

4. `viewerHub`  
   - `hub.core.*` と `hub.pickObjectAt` を通じて、  
     frame / camera / selection / mode / micro / filters / runtime API を公開する。
   - `hub.start()` / `hub.stop()` で render loop（`requestAnimationFrame`）を開始・停止する。

この経路以外から Core / Renderer / CameraEngine を `new` / 直接呼び出しすることは禁止とする。  
PointerInput / KeyboardInput は **UI レイヤ（viewerDevHarness / 本番 Host）からのみ** `new` してよく、  
runtime 層（`runtime/*`）から import / `new` してはならない。

必ず `bootstrapViewer` / `bootstrapViewerFromUrl` を runtime の唯一の入口とし、  
返ってきた `hub` に対して Host 側が `hub.start()` を呼び出すことでレンダーループを開始する。

---

### 1.7.2 viewerDevHarness.js の責務

`viewerDevHarness.js` は「dev 用ホスト」であり、runtime とは明確に分離する。

- 役割：
  - dev 用 HTML（`viewer_dev.html`）に配置された各種 DOM（frame スライダ・filter ボタン・HUD・gizmo 等）を取得する。
  - `bootstrapViewerFromUrl(canvasId, jsonUrl, options)` を 1 回だけ呼び出し、  
    得られた `viewerHub` をローカル変数および `window.hub` に保持する。
  - `new PointerInput(canvas, hub)` / `new KeyboardInput(window, hub)` を生成し、  
    canvas / window に pointer / key イベントを接続する。
  - `hub.core.frame.*` / `hub.core.filters.*` / `hub.core.mode.*` / `hub.core.selection.*` /  
    `hub.core.camera.*` などを UI イベント（ボタン / スライダ / gizmo 等）に接続する。
  - dev 用 HUD / メタパネル / ログ表示（BOOT / MODEL / CAMERA / LAYERS / FRAME）を実装する。
  - `hub.start()` / `hub.stop()` を呼び出し、dev viewer のライフサイクル（起動 / 再起動 / 停止）を管理する。
  - dev viewer（viewer_dev.html）は、
  fetch 失敗・JSON パースエラー・strict validation NG の
  いずれの場合も struct を一切保持せず hub を生成しない。
  右ペインにはエラー種別（NETWORK_ERROR / JSON_ERROR / VALIDATION_ERROR）
  とメッセージを表示し、`(no struct loaded)` と明示する。


- 制約：
  - `runtime/core/*` / `runtime/renderer/*` を直接 import しない  
    （runtime への入口は `runtime/bootstrapViewer.js` の `bootstrapViewer*` のみとする）。
  - three.js / AJV / CameraEngine を直接触らない。
  - 3DSS 構造（`core.data` / `structIndex`）を変更しない（uiState の参照と表示だけ行う）。
  - PointerInput / KeyboardInput のロジックを上書きせず、入力 → `hub.core.*` / `hub.pickObjectAt` の流れを保つ。

概略フローは次の通り：

```
viewer_dev.html      （開発用 DOM 骨格）
  ↓
viewerDevHarness.js  （dev 用ハーネス：bootstrapViewerFromUrl / hub.start / PointerInput / KeyboardInput）
  ↓
bootstrapViewerFromUrl(canvas, modelPath, options)
  ↓
viewerHub（hub）
  ↓
hub.start()          （レンダーループ開始）
```


## 1.8 dev viewer と本番 viewer の関係

viewer runtime 自体はホスト非依存の共通コンポーネントであり、
dev viewer はその一実装例に過ぎないことを仕様として明示する。

- 共有するもの：
 - runtime/bootstrapViewer.js
 - runtime/viewerHub.js
 - runtime/core/*
 - runtime/renderer/*
- dev viewer 固有のもの：
 - viewer_dev.html（3 カラムレイアウト、メタパネル、HUD 等）
 - viewerDevHarness.js
 - dev 用 HUD / gizmo / 各種ボタン類（ui/gizmo.js など）

### 1.8.1 共通エントリポイント
すべてのホストは、次の 共通エントリ API から viewer runtime を起動する。
- bootstrapViewer(canvasOrId, threeDSS, options?) → hub
 - strict validation 済みの 3DSS オブジェクトを受け取り、viewerHub を構築して返す。
- bootstrapViewerFromUrl(canvasOrId, url, options?) → Promise<hub>
 - url から .3dss.json を fetch し、strict validation を実行したうえで
bootstrapViewer を呼び出すラッパー。

dev viewer も本番 viewer も、これ以外の経路で runtime を起動してはならない。

### 1.8.2 dev viewer（開発用ハーネス）の起動フロー
dev viewer の起動時、viewerDevHarness.js は概ね次のように動く：
1. window.addEventListener('load', boot) で 1 回だけ boot() を起動する。
2. boot() 内で
 - メタパネル / HUD / frame スライダ / filter ボタン等の DOM を取得する。
 - const canvasId = "viewer-canvas";
 - const jsonUrl = "../3dss/sample/core_viewer_baseline.3dss.json";（baseline 確認時）
 - bootstrapViewerFromUrl(canvasId, jsonUrl, { devBootLog:true, devLabel:"viewer_dev", modelUrl:jsonUrl, logger:devLogger }) を呼ぶ。
3. devLogger(line) は
 - console.log(line) + メタパネルへの追記（appendModelLog(line)）を行う。

このように、dev viewer は「ログ・HUD・コントロール類が追加されたホスト」であり、
runtime 自体には一切手を入れない。

### 1.8.3 本番 viewer（Astro / 埋め込み）の起動フロー

本番 viewer（Astro サイトや他ホストアプリ）も、
基本的には dev viewer と同じエントリ API を用いる。

Host（Astro / React / plain HTML 等）
  ↓
bootstrapViewerFromUrl(canvasRef, modelUrl, options)
  ↓
viewerHub（hub）
  ↓
host 側から hub.core.* を利用して UI と連携
  ↓
hub.start()          （レンダーループ開始）


- Host（Astro / React / plain HTML 等）
 - 自身のレイアウトの中に <canvas> もしくは canvas を含むコンテナを配置する。
 - マウント完了後に bootstrapViewerFromUrl または
事前に fetch + validation 済みの 3DSS を用いた bootstrapViewer を呼ぶ。
 - 得られた hub の core.* API を、自前の UI コンポーネント（タイムライン・レイヤトグルなど）に接続する。
 - fetch 失敗 / JSON パースエラー / strict validation NG の
 いずれでも、hub を生成せず canvas を描画しない
 （部分描画しない）。右ペイン File に `ERROR: <種別>` を表示し、
 HUD に `ERROR` バッジを出すだけとし、
 struct（3DSS document）は core に保持しない。


- 制約：
 - dev harness と同様、runtime には bootstrapViewer* / hub.core.* でのみアクセスする。
 - 構造データ（3DSS）は strict read-only とし、viewer から書き換えない。

## 1.9 baseline 起動時の固定条件

本節では、dev viewer（viewer_dev.html）において
core_viewer_baseline.3dss.json を読み込んだときに
「毎回同じ初期画面」が再現されるようにするための条件を定義する。

### 1.9.1 入力ファイルの固定

1. dev 起動時の baseline 入力は、常に
../3dss/sample/core_viewer_baseline.3dss.json とする（実パスはリポジトリ構成に追従）。

2. 他のサンプルをロードする UI があっても、
「起動直後に自動でロードされるファイル」は上記 1 本に限定する。

3. 読み込んだファイルパスは起動ログに必ず 1 行出力する。

### 1.9.2 カメラ初期状態の固定

core_viewer_baseline.3dss.json 読み込み直後のカメラ状態は、
シーン境界（bounding sphere）から算出される 決定的な初期値 として固定する。

- 投影方式: PerspectiveCamera
- up ベクトル: (0, 0, 1) // Z+ を絶対上とみなす
- target: シーン中心 metrics.center（取得できない場合は (0, 0, 0)）
- 距離: シーン半径 metrics.radius の約 2.4 倍（distance = radius * 2.4。radius 不明時は 4）
- 視野角: fov = 50（deg）

初期カメラ state は createUiState の引数 cameraState としてセットされ、
起動直後の cameraEngine.getState() が常に同じ値になることを保証する。

この初期値は 3DSS 構造へ書き戻さず、
あくまで「viewer runtime 内の uiState」としてのみ保持される。

#### 1.9.3 frame / layer 初期状態
baseline 起動直後の frame / layer 状態は次のとおり固定する。
- frame
 - detectFrameRange(struct) により {min,max} を求める。
 - uiState.frame.current = frameRange.min（最小フレームから開始）。
 - uiState.runtime.isFramePlaying = false（再生 OFF）。
- layer / filters
 - filters.types.points = true
 - filters.types.lines = true
 - filters.types.aux = true
 - つまり、再生やフィルタ操作を行う前は「全レイヤ ON」の状態から始まる。

### 1.9.4 起動ログ（BOOT / MODEL / CAMERA / LAYERS / FRAME）

viewer runtime は、初期化完了時に options.devBootLog === true の場合、
次の 5 レコードを 必ずこの順序で 1 回だけ 出力する。
1. BOOT <label>
 - <label> は options.devLabel があればそれを用い、なければ "viewer_dev" 等の既定値。
2. MODEL <modelUrl>
 - <modelUrl> は options.modelUrl があればそれを用い、なければ url（FromUrl の引数）。
3. CAMERA {...}
 - cameraEngine.getState() 相当の payload を JSON 文字列として出力する。
  - {"position":[x,y,z],"target":[tx,ty,tz],"fov":50} のような形。
4. LAYERS points=on/off lines=on/off aux=on/off
5. FRAME frame_id=<number>

これらは「構造化ログイベント」として runtime 内部から logger に渡される。
- options.logger が関数の場合
 → 各行を logger(line) として呼び出す。

- options.logger が未指定の場合
 → 既定で console.log(line) を用いる。
dev viewer（viewer_dev.html）では通常、

- logger = devLogger
（console.log + メタパネルへの append）
を指定し、Model パネルに

```text
BOOT  viewer_dev
MODEL ../3dss/sample/core_viewer_baseline.3dss.json
CAMERA {...}
LAYERS points=on lines=on aux=on
FRAME  frame_id=0
```

のような行が並ぶことを確認できる。

同じビルド + 同じ baseline ファイルに対して
これらのログ内容が毎回一致することをもって「起動条件が固定されている」とみなす。

---

# 2 データ構造とスキーマ準拠（閲覧側視点）

viewer は生成アプリである modeler と異なり、  
入力された 3DSS データをそのまま読み取り、可視化するだけのアプリケーションである。

本章では viewer 側から見た 3DSS データの扱い方・準拠範囲・内部保持方式を定義する。  
viewer は構造編集・補完・修復を一切行わない。


## 2.1 閲覧対象となる 3DSS データ構造

viewer が扱う構造データは、  
**modeler が生成した `.3dss.json` に完全依存** する。

最上位構造：

1. `lines`：関係要素  
2. `points`：存在要素  
3. `aux`：補助要素  
4. `document_meta`：管理情報

viewer はこれらを

- 読み取り（strict validation）
- 可視化

の 2 段階だけを担当し、編集は行わない。

3DSS 自体の仕様は別紙「3DSS 仕様書（`3DSS.schema.json`）」に委ね、  
viewer はその **閲覧専用クライアント** として振る舞う。


## 2.2 データ読込時の処理フロー

viewer は構造データの読込時に次の処理を行う：

1. JSON 読込  
2. Validator による strict full validation  
3. Core への immutable state としてのロード（deep-freeze）  
4. Renderer による三次元シーン構築・描画開始  
5. HUD（axis / origin 等）の初期化

### 2.2.1 strict full validation の内容

viewer は `/schemas/3DSS.schema.json` を正とする Validator（AJV）により  
**strict full validation** を行う。主なチェック項目は次の通り：

- 型チェック（`type`）
- 必須項目（`required`）
- `enum` 完全一致
- `additionalProperties:false`（未知キー禁止）
- `ref → uuid` の参照整合
- `frames` の妥当性
- `document_meta` の整合
- `schema_uri` の整合
- `uuid` の RFC4122 v4 準拠
- `$defs` の一致（スキーマ定義外の拡張禁止）

Viewer 実装側の Validator は、少なくとも次を満たす：

- `removeAdditional: false`
- `useDefaults:      false`
- `coerceTypes:      false`

つまり、**入力 JSON を書き換える方向のオプションは一切使わない**。

viewer は不正データを読み込まない。  
修復・補完（normalize / resolve）は行わない。

### 2.2.2 バージョンおよび schema_uri の扱い

`document_meta` 内のバージョンおよび `schema_uri` について、  
viewer は次のポリシーで扱う：

- `document_meta.schema_uri`
  - 例：`https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.1`
  - `3DSS.schema.json` であること（ファイル名レベル）を要求する。
  - `#v<MAJOR>.<MINOR>.<PATCH>` の MAJOR が viewer 対応バージョンと一致しない場合は NG。
- `document_meta.version`
  - ドキュメント自身のバージョン（コンテンツ更新用メタ）。
  - 3DSS スキーマの MAJOR と `document_meta.version` の MAJOR が異なる場合は NG。
  - MINOR / PATCH の上振れは「将来バージョン」を意味するが、  
    スキーマに反しない限りは許容する（strict validation が最終判断）。

まとめると：

- `schema_uri` の MAJOR 不一致 → 読込拒否
- `document_meta.version` の MAJOR 不一致 → 読込拒否
- 上記が一致し、strict validation が OK の場合のみ次のフェーズへ進む。


## 2.3 内部 state の構造（構造 vs uiState）

Core 内部で保持する state は「構造データ」と「UI state」に完全に分離される。

```js
{
  // 構造データ（3DSS）: deep-freeze 済み、読み取り専用
  data: {
    document_meta,
    points: [],
    lines: [],
    aux:   [],
  },

  // viewer 専用の UI state: 変更可能、ただし外部には書き戻さない
  uiState: {
    frame: {
      current,          // 現在フレーム ID
      range: { min, max }
    },

    selection: {        // 現在選択中の要素
      kind: "points" | "lines" | "aux" | null,
      uuid: string | null,
    },

    cameraState: {      // CameraEngine によって管理されるカメラ状態
      theta,
      phi,
      distance,
      target: { x, y, z },
      fov,
    },

    mode: "macro" | "meso" | "micro",

    filters: {          // レイヤ・フィルタ
      types: {
        points: boolean,
        lines:  boolean,
        aux:    boolean,
      },
    },

    runtime: {          // 再生・自動カメラなどのランタイムフラグ
      isFramePlaying: boolean,
      isCameraAuto:   boolean,
    },

    visibleSet: Set<uuid>,     // 現在可視な uuid 群
    microState:  MicroFXPayload | null, // microFX 用派生 state
  },
}
```

特徴：

- 構造データ（`data`）は deep-freeze されており、  
  どのレイヤからも **変更禁止**。
- UI state（`uiState`）は viewer 内で変更可能だが、  
  `.3dss.json` へは書き戻さない（セッション限定）。
- `visibleSet` / `microState` は UI state の派生情報として Core が所有し、  
  Renderer はそれを読み取るだけとする。


## 2.4 viewer における構造データの扱い方

viewer は構造データに対して次を一切行わない：

- 加筆（add）
- 変更（update）
- 補完（auto-fill）
- 除去（auto-clean）
- 推測補完（inference）
- 再構成（restructure）
- 自動マージ（merge）

構造データは **「読み取るだけ」** であり、  
視覚化のための解釈はしても、構造自体は変えない。

### 2.4.1 不変（immutable）の維持

- Core にロードした構造データは、deep-freeze により不変とする。
- 選択・hover・camera・フィルタ・再生状態などの変化は  
  すべて `uiState` にのみ反映される。
- three.js のオブジェクト（`THREE.Object3D`）に元 JSON を直接ぶら下げるなど、  
  構造データへの書き込み経路が生じる設計は禁止とする。

### 2.4.2 表示制御のための解釈は許可される

表示制御のための **「解釈」** は許可される。例：

- `frame.current` に応じた要素の表示・非表示
- `appearance.*` の描画方式反映（色・太さ・透明度など）
- `marker.shape` に応じた geometry 生成
- `aux.module` の種類に応じた表示（grid / axis / label など）

これらは **表示ロジック** であり、構造データの変更ではない。  
viewer は `appearance.visible` などを参照しても、値を書き換えたり上書きしたりしない。


## 2.5 frame / frames の扱い

3DSS 側の `frames` と viewer 側の `frame.current` の関係は次の通りとする：

- `uiState.frame.current === null`  
  → `frames` を無視して全要素を表示（frame フィルタ OFF）。
- `uiState.frame.current === n`（数値）  
  → 各要素の `frames` に `n` を含む場合のみ表示対象とする。
- `frames` 未定義 or 空配列の要素は「常時表示」  
  → `frame.current` の値にかかわらず表示対象とする。

viewer は `frames` を

- 変更しない
- 補完しない
- 推測で増減させない

ものとする。

frame の範囲 `{min, max}` は、  
構造データから `detectFrameRange(document)` によって決定され、  
`uiState.frame.range` に格納される。  

`frame.current` の初期値は常に `frame.range.min` とし、  
baseline 起動条件（1.9 節）と整合させる。


## 2.6 参照整合（ref → uuid）

`ref → uuid` の整合は **読込時の Validator が保証** する。

代表例：

- `line.end_a.ref` → `points[*].uuid`
- `line.end_b.ref` → `points[*].uuid`
- その他、3DSS 仕様書で定義されている全ての参照

不整合がある場合：

- viewer は読込自体を失敗させる（例外発生・エラーメッセージ表示）。
- 内部で「できる範囲だけ描画する」といった挙動は行わない  
  （partial rendering / best-effort 描画はしない）。

runtime 内での再チェックは不要であり、  
性能面を優先して **validation に一任** する。


## 2.7 読込禁止・非対象データ

viewer は以下を構造データとして扱わない：

- UI 状態（カメラ・選択状態など）
- コメントフィールド（authoring 用の free text）
- 注釈・メモ・レポート（構造外の narrative）
- modeler の内部情報（undo stack など）
- 外部埋め込み glTF / 3D モデル（構造層とは別レイヤ）
- viewer 独自形式の JSON（出力・読込ともに禁止）
- 3DSS-prep（authoring 用ミニマルスキーマ）

構造データとして扱うのは、  
`/schemas/3DSS.schema.json` に準拠した 3DSS のみとする。


## 2.8 データ構造に関する禁止事項（viewer）

viewer は構造データに対して、次を行わない：

1. 構造の自動修復
   - 欠損エッジを自動補完する
   - 参照切れを自動で削除する
2. 暗黙の default 付与
   - スキーマに `default` があっても、  
     runtime 側でそれを勝手に適用して JSON を書き換えない。
3. キー名の書き換え
   - `name_ja` / `name_en` などを自動 merge / rename しない。
4. 座標の丸め・正規化
   - 小数点桁数の丸め
   - 特定軸への投影
5. frame 情報の自動生成
   - `frames` 未定義要素への自動付与
   - time-series の補間
6. スキーマ外項目の保持
   - `additionalProperties:false` に反する追加キーを  
     「一旦読んでから捨てる」ことも行わない（validation で reject）。
7. UI 状態の JSON 保存
   - camera / selection / filters / runtime フラグなどを  
     `.3dss.json` へ書き戻さない。
8. normalize / resolve / prune / reorder の実行
   - JSON の key 順序変更
   - 冗長情報の削除
   - 別フォーマットへの変換

viewer は構造データを  
**“手つかずのまま扱うこと”** が厳密に仕様として義務づけられる。


## 2.9 Runtime API 概要（最小セット）

viewer は modeler から完全に独立した read-only アプリであるが、  
UI ハーネス・dev 用ツール・将来の modeler からの再利用を想定し、  
外部向けに安定して提供する **runtime API の最小セット** を定義する。

詳細な API 仕様は別紙 `runtime_spec` に委ね、  
本節では「エントリポイント」と「外部から見える hub の骨格」だけを示す。

### 2.9.1 エントリ API

- `bootstrapViewer(canvasOrId, threeDSS, options?) → hub`
  - strict validation 済みの 3DSS オブジェクトを受け取り、  
    runtime 一式を初期化して `hub` を返す。
- `bootstrapViewerFromUrl(canvasOrId, url, options?) → Promise<hub>`
  - `url` から JSON を読み込み、スキーマ `/schemas/3DSS.schema.json` に対する  
    strict full validation を実行した上で `bootstrapViewer` を呼ぶ。

`options` には dev 用の拡張を含める：

- `devBootLog?: boolean`  
  - true のとき、起動時に `BOOT / MODEL / CAMERA / LAYERS / FRAME` ログを 1 回ずつ出力。
- `devLabel?: string`  
  - `BOOT <label>` に用いるラベル。省略時は `"viewer_dev"` 等の既定値。
- `modelUrl?: string`  
  - `MODEL <modelUrl>` に用いるパス、およびホスト側メタ表示用の情報。
- `logger?: (line: string) => void`  
  - dev 起動ログの出力先。省略時は `console.log`。

### 2.9.2 hub の外形

`bootstrapViewer*` の戻り値 `hub` は、少なくとも次のプロパティを持つ：

- `hub.core` … runtime API 名前空間（frame / camera / selection / mode / micro / filters / runtime / uiState 等）
- `hub.start()` … requestAnimationFrame ループ開始
- `hub.stop()` … ループ停止
- `hub.pickObjectAt(ndcX, ndcY)` … ピッキング（UI から selectionController への橋渡し）

以降の章（6.8 / 7.11 等）および `runtime_spec` において、  
`hub.core` 以下の各メソッド（`frame.get/set/step` / `camera.rotate/pan/zoom/reset` など）を  
詳細に定義する。

本章の範囲では：

- 「構造データは 3DSS に完全依存し read-only」  
- 「UI から構造へは必ず `hub.core.*` 経由でアクセスする」  

という 2 点を仕様上の約束事として明示するにとどめる。

# 3 UI構成と操作体系（viewer）

viewer は構造データの編集を一切行わず、  
**閲覧・確認・理解** のための UI 構造だけを備える。

本章では、閲覧専用 UI として必要な機能・レイアウト・操作体系を定義し、  
編集 UI や保存 UI が存在しないことを明確にする。

viewer UI は modeler UI と別系統であり、編集語彙を含まない。


## 3.1 UI 全体レイアウト

viewer_dev（開発用 viewer）の標準レイアウトは次の二分割構成とする：

```text
┌─────────────────────────────┐
│       メインビュー（3Dプレビュー）       │
├──────────────────┬────────────────┤
│     情報パネル     │  表示コントロールパネル  │
└──────────────────┴──────────────┘
```

- 上段：three.js による 3D メインビュー（canvas）
- 左下：メタ情報・ログを表示する「情報パネル」
- 右下：frame / filter / mode / gizmo などの「表示コントロールパネル」

本レイアウトは dev viewer（`viewer_dev.html`）の標準とし、  
本番埋め込み viewer では、ホスト側 UI 都合に合わせて再構成してよい。

### 3.1.1 PC 向け dev viewer レイアウト要件

PC 向けの dev viewer では、少なくとも次を満たす：

- メインビュー
  - 3D キャンバス（`<canvas id="viewer-canvas">`）を 1 枚持つ。
  - pointerInput（マウス / タッチ）をキャンバスにだけぶら下げる。
- 情報パネル（左下）
  - File 情報（ソースパス / frame range / current frame）
  - Model ログ（devBootLog を含む）をスクロール領域として表示。
- 表示コントロールパネル（右下）
  - frame スライダと再生ボタン群
  - points / lines / aux の表示フィルタ
  - mode HUD（macro / meso / micro）と focus 表示
  - 軸ギズモの DOM ラッパ（左下 canvas 上に重ねてもよい）

### 3.1.2 本番 viewer 最小要件

本番 viewer（Astro 埋め込みなど）では、次だけを最低限とする：

- メインビュー（3D canvas）
- frame 切替 UI（スライダ or +/- ボタン or キーボード）
- layer 切替 UI（points / lines / aux の ON/OFF）
- 選択中要素の識別ができる表示（例：UUID / name のどちらか）

dev 用 HUD / ログパネル / 詳細なメタ情報表示は、  
本番 viewer では任意とする。


## 3.2 メインビューと HUD

### 3.2.1 メインビュー（3D プレビュー）

メインビューの責務：

- three.js による 3D 描画（renderer 層の canvas）
- カメラ操作（orbit / pan / zoom）の視覚的フィードバック
- 選択要素のハイライト表示（selection + microFX の結果）
- frame / filters による表示切替の結果を反映

制約：

- メインビューは構造データを編集しない。
- UI イベント → camera/frame/selection/mode への反映は  
  **すべて PointerInput / KeyboardInput → hub.core.* 経由** とする。

### 3.2.2 HUD（トースト / mode ピル / focus ラベル）

dev viewer では、メインビュー上に次の HUD を重ねる：

- トーストメッセージ（`viewerToast`）
  - `showHudMessage(text, {duration, level})` 由来の簡易通知。
  - 例：`"Viewer loaded"`, `"Camera: HOME"`, `"MACRO MODE"` など。
- mode ピル
  - `MACRO / MESO / MICRO` の 3 つの pill を表示。
  - 現在 mode に対応する pill だけ `mode-pill-active` を付与。
- focus ラベル
  - 現在 selection（`uiState.selection.uuid`）を表示。
  - selection がない場合は `"-"` を表示。

HUD は dev viewer 専用の補助 UI とし、  
本番 viewer では任意機能とする。

### 3.2.3 軸ギズモ（gizmo）

- DOM ベースの HUD として画面左下に重ねる。
- 役割：
  - 現在カメラの向きを示す簡易 3D axes 表示。
  - クリックでカメラを主要軸方向（+X / +Y / +Z）へ snap する。
  - HOME ボタンでカメラ初期状態へ戻す。
- 実装：
  - `viewer/ui/gizmo.js`（DOM 操作）とし、three.js の scene には入れない。
  - カメラ操作は `viewerHub.core.camera.reset` / `.snapToAxis(axis)` 経由で行う。


## 3.3 情報パネル（File / Model）

情報パネルは、主に dev viewer で利用する **テキストベースのメタ表示領域** とする。

### 3.3.1 File 情報パネル

- 表示内容（例）：
  - Source: `../3dss/sample/frame_aux_demo.3dss.json`
  - Frame range: `[min, max]`
  - Current frame: `n`
- 情報源：
  - `hub.core.frame.getRange()` / `hub.core.frame.getActive()`
  - `bootstrapViewerFromUrl` に渡した `modelUrl`

### 3.3.2 Model ログパネル

- 初期状態：
  - `"Model"` 見出しと、`(logs will appear here)` のプレースホルダ。
- devBootLog を有効にした場合：
  - 起動時に必ず次の 5 行がこのパネルに並ぶ：

    ```text
    BOOT  <devLabel>
    MODEL <modelUrl or (unknown)>
    CAMERA {"position":[...],"target":[...],"fov":50}
    LAYERS points=on/off lines=on/off aux=on/off
    FRAME  frame_id=<n>
    ```

- 出力経路：
  - `bootstrapViewer` オプション `devBootLog: true` 時、
  - `options.logger` があればそれを使い、無ければ `console.log` を用いる。
  - viewer_dev ハーネスでは `logger: devLogger` を渡し、  
    `devLogger` が `appendModelLog` を通じて Model パネルへ追記する。

devBootLog の詳細仕様は 1.8 節を正とする。


## 3.4 表示コントロールパネル

表示コントロールパネルは、viewer の **状態を外側から操作する唯一の UI 集約** である。  
ただし本番 viewer では、配置や見た目はホストに任せ、  
API 呼び出し（hub.core.*）だけを仕様として固定する。

### 3.4.1 Frame コントロール

dev viewer の frame UI は次の構成とする：

- スライダ（`#frame-slider`）
  - `min = range.min`, `max = range.max`, `step = 1`
  - `input` イベントで `hub.core.frame.setActive(newValue)` を呼ぶ。
- ラベル（`#frame-slider-label`）
  - 現在 frame ID を表示（`hub.core.frame.getActive()`）。
- ボタン群
  - `btn-rew` … `frame.set(range.min)`（先頭へ）
  - `btn-step-back` … `prev`
  - `btn-home` … `frame.set(range.min)`（表示上の「HOME」だが、frame 用）
  - `btn-step-forward` … `next`
  - `btn-ff` … `frame.set(range.max)`（末尾へ）
  - `btn-play` … 再生トグル

再生トグルは dev viewer 固有の実装とし、  
内部的には `setInterval` 等で `next` を一定間隔で呼び出す。  
runtime 本体の仕様としては「frame 再生 API」がなくてもよく、  
実装する場合は `hub.core.runtime.*` として別途定義する。

frame UI の要件：

- frame ID 変更は **常に `hub.core.frame.*` 経由** とする。
- UI 以外（KeyboardInput）からの変更は、`frameUiLoop` によりスライダ・ラベルへ反映する。
- マウスホイールは v1 では **Zoom 専用** とし、frame 変更には使わない。

### 3.4.2 Layer フィルタ

points / lines / aux の表示切替 UI を持つ。

- ボタン：
  - `#filter-points`
  - `#filter-lines`
  - `#filter-aux`
- 表示状態：
  - `filter-on` / `filter-off` クラスと絵文字（👁 / 🙈）で表現。
- ロジック：
  - 各ボタンは `filters.setTypeEnabled(kind, enabled)` を呼ぶ。
  - `filters.get()` の結果から UI 状態を同期する。

内部では：

- `hub.core.filters.setTypeEnabled(kind, enabled)`  
  → `visibilityController.setTypeFilter` が `uiState.filters.types.*` と `visibleSet` を更新する。
- `hub.core.filters.get()`  
  → 現在の `FiltersState` を返す。

### 3.4.3 Mode / Focus 操作

- mode ピル（HUD）
  - 表示のみ。クリックによる mode 切替は dev viewer では必須ではない（実装してもよい）。
- focus トグルボタン（`#mode-focus-toggle`）
  - クリック時：
    - 現在 selection を取得（`hub.core.selection.get()`）。
    - `sel.uuid` があれば `hub.core.mode.set("micro", sel.uuid)` を呼ぶ。
- MESO pill（`#mode-label-meso`）
  - クリック可能にし、
    - selection があれば `hub.core.mode.set("meso", sel.uuid)` を呼ぶ。

mode と microFX の詳細ルールは 6.8 節・runtime_spec を正とし、  
本節は「UI から呼ぶ API のパターン」だけを定義する。


## 3.5 入力操作（PointerInput / KeyboardInput）

入力操作は runtime 側の **PointerInput / KeyboardInput** に集約し、  
dev ハーネスは原則として追加ショートカット（Space → Play）程度にとどめる。

### 3.5.1 PointerInput（マウス / タッチ）

PointerInput の責務：

- キャンバス上のポインタ操作を一手に集約する。
- camera / selection / mode への変更は **hub.core.* 経由** で行う。
- renderer や three.js を直接触らない。

v1 の標準マッピング（マウス）：

- 左ドラッグ：orbit（カメラ回転）
- 右ドラッグ or 中ドラッグ：pan（カメラ平行移動）
- ホイール：zoom（前後）
- クリック：
  - click / pointerup 時に canvas 座標 → NDC 変換し、
  - `hub.pickObjectAt(ndcX, ndcY)` を呼び、
  - ヒットした uuid があれば `hub.core.selection.select(uuid)` を呼ぶ。
  - その結果、mode / microFX は core 側で再計算される。

注意：

- Frame の増減をマウスホイールに割り当てることは禁止（3.4.1 参照）。
- モード遷移条件（canEnter / exit など）は core/modeController の責務とし、  
  PointerInput は「click → select」までで止める。

### 3.5.2 KeyboardInput（キーボード）

KeyboardInput の責務：

- `window` の `keydown` を 1 箇所に集約する。
- **core.camera / core.frame / core.mode / core.selection のみ** を叩く。
- UI 要素（DOM）や CameraEngine には直接触れない。

キー入力は次のルールに従う：

1. 入力欄除外
   - `ev.target.tagName` が `INPUT` / `TEXTAREA` の場合は無視。

2. Home（カメラ HOME）
   - `ev.code === "Home"` かつ `core.camera.reset` が存在する場合：
     - `ev.preventDefault()`
     - `core.camera.reset()` を呼ぶ。

3. Frame 操作（PageUp / PageDown）
   - `core.frame` が存在する場合：
     - `PageUp` … `next`
     - `PageDown` … `prev`
   - frame 範囲外へは FrameController 側でクランプする（runtime_spec 参照）。

4. Mode 切替（Q / W / Esc）
   - `Q` / `q`：
     - selection.get() に uuid があれば `mode.set("micro", uuid)`
   - `W` / `w`：
     - selection.get() に uuid があれば `mode.set("meso", uuid)`
   - `Escape`：
     - `mode.set("macro")`

5. カメラ Zoom（+ / -）
   - `+` / `NumpadAdd`：
     - `camera.zoom(-Δ)`（前進）
   - `-` / `NumpadSubtract`：
     - `camera.zoom(+Δ)`（後退）
   - Δ（ZOOM_STEP）は実装側の定数（例：0.1）とする。

6. カメラ Orbit（矢印キー）
   - `ArrowLeft` … `camera.rotate(-step, 0)`
   - `ArrowRight` … `camera.rotate(+step, 0)`
   - `ArrowUp` … `camera.rotate(0, -step)`（上にチルト）
   - `ArrowDown` … `camera.rotate(0, +step)`（下にチルト）
   - `Shift` 押しで step を増やし、早回しとする（例：2° → 4°）。

dev viewer では、これに加えてハーネス側で次を追加してよい：

- `Space`：
  - 再生ボタン（`#btn-play`）の click を代理発火し、frame 再生をトグルする。
  - これは **viewer_dev 専用ショートカット** とし、runtime 本体仕様には含めない。


## 3.6 dev viewer 固有の拡張

viewer_dev（開発用 harness）は、本番 viewer に含めない補助機能を持つ：

- `window.hub` … `viewerHub` へのデバッグ用参照
- `window.viewerLog(line)` … Model パネルへのログ追記
- `window.viewerToast(text, options)` … HUD トースト表示
- 起動時 devBootLog
  - `BOOT / MODEL / CAMERA / LAYERS / FRAME` の 5 行を Model パネルへ表示
- gizmo HOME / axis ボタン
  - カメラ操作コマンドのショートカット（reset / snapToAxis）

これらは **「開発支援機能」** として扱い、  
本番 viewer 仕様（機能要件）には含めない。  
ただし、将来 host アプリで再利用したい場合に備え、  
名前・責務は本章の定義から大きく外れないようにする。


---

# 4 三次元描画とカメラ（viewer）

viewer の描画システムは modeler と同じ three.js を用いるが、  
閲覧専用アプリとして **透明性・忠実性・非編集性** を最優先する。

本章では、renderer 層と CameraEngine を中心に、  
三次元描画・visibleSet・microFX・カメラ挙動の規範を定義する。

※ 入力レイヤ（PointerInput / KeyboardInput）は 3 章、および `runtime_spec` を正とする。  
本章では「入力済みの状態が renderer にどう反映されるか」を扱う。


## 4.1 描画レイヤ構造

viewer の描画レイヤ構造は次の通りとする：

- Core 層（runtime/core）
  - `uiState` / `CameraEngine` / `frameController`
  - `selectionController` / `modeController`
  - `visibilityController` / `microController`
  - 3DSS 構造（immutable）と各種 index を保持
- Renderer 層（runtime/renderer）
  - `createRendererContext(canvas)` が three.js まわりを一手に担当
  - three.js の Scene / Camera / Renderer / light / Object3D 群を内部に保持
  - microFX（axes / bounds / glow / marker / highlight）を含む
- Hub 層（runtime/viewerHub）
  - `core` と `renderer` をまとめ、  
    毎フレーム `uiState` のスナップショットを renderer に流す
  - `hub.start()` / `hub.stop()` による render loop を単一箇所で管理

### 4.1.1 所有権と禁止事項

- 3DSS document（構造データ）
  - Core 層が deep-freeze 済みのオブジェクトとして保持
  - Renderer 層は **参照のみ** 許可、書き換え禁止
- uiState / visibleSet / microState / cameraState
  - Core 層が唯一の正規所有者
  - Renderer 層は hub 経由で **読み取り専用** として受け取り、反映のみ行う
- three.js Object3D 群
  - Renderer 層が所有
  - Core / UI / hub は Object3D を直接触らない（UUID 等で参照するのみ）

### 4.1.2 frame → visibleSet → renderer の流れ

1. Core の `frameController` が `uiState.frame.current` を更新する。
2. `visibilityController.recompute()` が
   - `frames` / `appearance.visible` / filters（points/lines/aux）を合成し、
   - `uiState.visibleSet: Set<uuid>` を更新する。
3. hub の 1 フレーム tick で、
   - `renderer.applyFrame(uiState.visibleSet)` が呼ばれ、
   - 各 Object3D の `obj.visible` が UUID ベースで更新される。

Renderer は `visibleSet` 以外の条件で表示／非表示を勝手に決めてはならない。


## 4.2 描画対象要素（points / lines / aux）

### 4.2.1 Points

points は「空間上の代表点」として描画する。

- 参照元：
  - `points[*].position`
  - `points[*].appearance`（color / opacity / marker など）
- 最低要件：
  - 各 point につき 1 つの Object3D（通常は小さな球 or billboard）を生成する。
  - color / opacity は appearance.* の値をそのまま反映する。
- 追加表現（optional）：
  - microFX による glow / marker の上乗せ
  - selection によるハイライト（色／太さ／発光）

points に関して viewer は **位置の補間や丸めを行わない**。  
position ベクトルは 3DSS JSON の値をそのまま world 座標として用いる。

### 4.2.2 Lines

lines は「points 同士の接続（ベクトル）」として描画する。

- 参照元：
  - `lines[*].end_a.ref` / `end_b.ref` から point UUID を解決
  - `lines[*].appearance.shape` / `arrow` / `effect` / `color` / `opacity` など
- 最低要件：
  - ref から両端 point の位置を解決できたものだけを描画対象とする。
  - 各線分を THREE.Line / Tube / Cylinder 等で描画する（形状は実装依存）。
  - color / opacity / width を appearance.* に従って反映する。
- 箭頭（arrow）：
  - `arrow.shape` / `arrow.placement` の値をそのまま反映する。
  - 仕様としては 3DSS の定義を正とし、viewer 側で勝手に補正・拡張しない。
- effect:
  - `effect: none | flow | glow | pulse` は **描画限定の視覚効果** として扱う。
  - `none` は追加の視覚効果なしを意味する。

lineWidth について：

- WebGL 実装により 1px 以下や固定幅になる環境が存在する。
- viewer は内部に `line_width_mode: auto | fixed | adaptive` の概念を持ってよいが、
  - v1 実装では **auto 固定** とし、
  - 他モードは「将来拡張候補」として本仕様に残すに留める。

### 4.2.3 Aux

aux は points / lines 以外の補助的描画要素である。

代表的な module と v1 における扱い例：

| module 名  | スキーマ | Viewer v1 の扱い       | 備考                                      |
|------------|---------|------------------------|-------------------------------------------|
| `grid`     | あり    | 描画必須（保証）       | ground グリッド。基本パラメータのみ対応で可。 |
| `axis`     | あり    | 描画任意・無視可       | 構造層の軸。HUD の gizmo axis とは別物。   |
| `plate`    | あり    | 描画任意・無視可       | 床プレート／背景板。v1 では非必須。       |
| `shell`    | あり    | 描画任意・無視可       | 外皮表現。v1 では非必須。                 |
| `hud`      | あり    | 描画任意・無視可       | 構造側 HUD。Viewer UI で代替する想定。    |

v1 では grid 以外の aux module は「存在しても無視可」とし、  
将来対応時にのみ本表を更新する。


## 4.3 frame（時間層）と表示制御

### 4.3.1 表示ルール

`uiState.frame.current = n` のとき、表示ルールは次の通り：

- uiState.frame.current == n  
  → `frames` に n を含む要素のみ表示
- uiState.frame.current が null  
  → `frames` を無視して全要素を表示（frame フィルタ OFF）
- frames が未定義または空  
  → 常時表示（uiState.frame.current に依存しない）
- frame 切替は UI 状態（uiState.frame）の更新のみで行い、  
  構造データ（3DSS JSON）は変更しない。

### 4.3.2 Core / Renderer の責務分離

- Core：
  - `frameController.set / step / range` により `uiState.frame` を更新する。
  - `visibilityController.recompute()` で `uiState.visibleSet` を再計算する。
- Renderer：
  - `renderer.applyFrame(uiState.visibleSet)` で `obj.visible` を更新する。
  - frame ID や frames 配列を直接読むことは禁止。

frames の推測・補完・補正は行わない。  
3DSS に入っている frames 情報のみを正とする。


## 4.4 microFX レイヤと selection / mode

microFX は「視覚補助レイヤ」であり、構造データには一切影響しない。  
renderer 内の `microFX/*` モジュールとして実装される。

### 4.4.1 入出力と invariants

- 入力：
  - `uiState.microState`（MicroFXPayload）
  - `uiState.selection`
  - scene metrics（中心・半径など）
- 出力：
  - 既存 Object3D の color / opacity / scale などの上書き
  - 追加の overlay Object3D（axes / bounds / marker / glow / highlight）群
- 不変条件：
  - 3DSS document は決して変更しない。
  - baseStyle（元の色・不透明度）は必ず保持し、microFX OFF で完全復元できる。
  - 座標系は 3DSS と同じ「unitless な world 座標系」とし、px などの画素単位を持ち込まない。

### 4.4.2 microFX モジュールの役割

代表的なモジュールの責務：

- `axes`：
  - focus 要素まわりのローカル軸を簡易表示する。
  - scene 半径とカメラ距離からスケールを決め、常に読みやすい大きさに保つ。
- `bounds`：
  - focus クラスタの AABB（軸平行境界ボックス）を描く。
  - shrinkFactor により少し内側に縮めて描くことで視認性を上げる。
- `marker`：
  - focus 位置に小さなマーカーを配置する（点 or 矢印）。
- `glow`：
  - focus 要素に対して halo 的な glow を追加する。
- `highlight`：
  - `microState.relatedUuids` に含まれる要素群を「なぞる」オーバーレイを描画し、
  - 構造的関係（近傍／経路など）を強調する。

microState の詳細な形は 7.11 節および `runtime_spec` の MicroFXPayload を正とする。  
本章では「renderer が何をしてよいか／してはならないか」だけを定義する。

### 4.4.3 斜め線シャドウ（将来拡張）

斜め線（non-axis-aligned line）に対するシャドウ表現（Shadow Convention）は、  
microFX の将来拡張案として仕様上に保持する：

- 対象：
  - ベクトル v = (dx, dy, dz) において複数軸に非ゼロ成分を持つ線分。
- 方針：
  - 各軸成分ごとに「影線」を落とし、方向感と奥行きを補助する。
- 実装有無：
  - v1 の必須要件ではない。
  - 実装する場合は 3DSS を一切変更せず、microFX だけで完結させる。

詳細な濃度や方向規範は旧 4.7 節の案を参考にしてよいが、  
本仕様では「任意実装」として扱う。


## 4.5 カメラ仕様（閲覧用 CameraEngine）

カメラは `CameraEngine` によって一元管理される。  
cameraState は Core 層が持ち、renderer は毎フレームそれを受け取って反映する。

### 4.5.1 空間座標系とカメラ状態

空間座標系：

- 右手系を前提とし、
- `Z+` を絶対上方向とする（grid / axis もこれに従う）。

cameraState の基本形：

```ts
cameraState = {
  theta:    number,             // 水平角（ラジアン）
  phi:      number,             // 垂直角（ラジアン）
  distance: number,             // target からカメラまでの距離
  target:   { x, y, z },        // 注視点（world 座標）
  fov:      number              // 垂直 FOV（度）
}
```

- Renderer は `theta / phi / distance / target` から camera.position / lookAt を算出する。
- position などを逆に直接いじるのは CameraEngine の内部実装に限定する。

### 4.5.2 初期カメラ

bootstrapViewer では、renderer の scene metrics から初期カメラを決める：

1. `renderer.syncDocument()` 後に scene の bounding sphere（center, radius）を取得する。
2. `target = center` とする。
3. `distance ≈ radius × 2.4` 程度離し、構造全体が画面に収まる距離を確保する。
4. `theta / phi` はわずかに俯瞰（やや斜め上）となるように設定する。

この初期状態は `uiState.cameraState` にのみ保持し、  
3DSS document へ書き戻してはならない。

### 4.5.3 CameraEngine API

CameraEngine は少なくとも次を提供する（詳細は `runtime_spec`）：

- `rotate(dTheta, dPhi)`  
  - `theta += dTheta`, `phi += dPhi` として orbit を行う。
  - `phi` は極点付近でクランプし、カメラの裏返り（gimbal lock）を避ける。
- `pan(dx, dy)`  
  - 画面座標系に沿って `target` を平行移動する。
  - distance / FOV に応じて pan の実距離をスケーリングする。
- `zoom(delta)`  
  - `distance += delta` として前後移動する。
  - `MIN_DISTANCE` / `MAX_DISTANCE` でクランプする。
  - キーボード／ホイールの符号規約は「負で前進（ズームイン）」とする。
- `reset()`  
  - 初期カメラ状態に戻す（bootstrap 時に記録しておく）。
- `snapToAxis(axis: 'x' | 'y' | 'z')`  
  - 指定軸方向から構造を俯瞰する角度（theta, phi）へスナップする。
  - target / distance は維持する。
- `setFOV(value)` / `setState(partial)` / `getState()`

Renderer 側では、毎フレーム：

1. `camState = cameraEngine.getState()`
2. `renderer.updateCamera(camState)`
3. `renderer.render()`

という流れで反映する。

### 4.5.4 入力レイヤとの関係

- Mouse / Wheel / Keyboard / Gizmo などの物理入力は、
  - PointerInput / KeyboardInput / gizmo.js が受け取り、
  - `hub.core.camera.rotate / pan / zoom / reset / snapToAxis` だけを呼び出す。
- CameraEngine 自体を UI や renderer から直接叩くことは禁止する。

入力マッピングの詳細は 3.5 節および `runtime_spec` の KeyboardInput / PointerInput を参照する。


## 4.6 カメラモード（macro / meso / micro）と描画

mode（"macro" / "meso" / "micro"）は「どのスケールで構造を見るか」を表す。  
uiState.mode を唯一の正規状態とし、modeController が管理する。

### 4.6.1 モード定義

| モード | 用途         | 説明                                  |
|--------|--------------|---------------------------------------|
| macro  | 全体俯瞰     | シーン全体を俯瞰する基本モード。      |
| meso   | 近傍クラスタ | 選択要素の周辺クラスタをまとめて観察。 |
| micro  | 1 要素原点   | 1 要素を原点とみなす近接観察モード。  |

- mode は常に 3 値のいずれか。
- frame 再生は原則 macro モードで行う。

### 4.6.2 モードと microFX の関係

- macro
  - microFX は無効（`uiState.microState = null` 相当）。
  - 全オブジェクトを baseStyle のまま表示する。
- meso
  - microController が selection / cameraState / structIndex から microState を計算。
  - focus 近傍の要素は強調し、遠方は距離に応じてフェードする。
  - v1 では microFX 無効（将来拡張の候補）
- micro
  - focus 要素を原点とみなし、localBounds や axes を表示する。
  - 非 focus 要素は大きくフェードし、局所構造だけをくっきり見せる。

詳細な距離係数や opacity の設計は microFX 定義（6.8 節と `runtime_spec`）を正とする。

### 4.6.3 モード遷移と selection

modeController は次のルールを満たす：

- micro / meso に入るとき：
  - selection.get() に uuid がなければ入れない。
  - canEnter(uuid) が false の場合（非表示など）は micro / meso へ遷移しない。
- Esc キー：
  - どのモードからでも macro へ戻る（selection は維持）。
- frame 再生開始時：
  - mode を macro へ戻し、microFX を OFF にする（推奨）。

モード遷移は必ず `core.mode.set(mode, uuid?)` を経由し、  
renderer 側で独自に mode を判定してはいけない。


## 4.7 描画パフォーマンス要件

viewer は閲覧専用であり、次を目標とする：

- frame 切替：100ms 以内
- 2000〜5000 要素で明確な遅延なし
- カメラ操作：60fps 以上（実行環境依存）
- aux 切替：ユーザ操作から 1 フレーム以内に反映
- selection / microFX：1 フレーム以内に視覚的変化が見えること

パフォーマンス向上のために：

- instancing / LOD / caching / frustum culling などの最適化を行ってよい。
- ただしこれらは **viewer 内部で完結** させ、3DSS や uiState の意味を変えてはならない。

例えば：

- 遠景では points を billboard へ落とす
- 長大な polyline を距離に応じて簡略化する

といった最適化は許容されるが、  
元の構造データが「こうなっている」と誤解されるような描画は避ける。


## 4.8 描画禁止事項（viewer）

viewer は次の行為を行ってはならない：

1. 位置の丸め・補完
   - 例：座標を勝手に整数へ丸める、格子点へスナップする、など。
2. ジオメトリの推測・補正
   - 例：座標が近いからといって自動で接続線を追加する。
3. ref 整合の修復
   - 例：存在しない UUID に対して「それらしい」 point を勝手に補完する。
4. 構造データに存在しない要素の追加
   - 例：線分を補完するための「仮想ノード」を 3DSS 上に生やす。
5. 描画状態を JSON へ書き戻す
   - camera / frame / filters / selection などの UI 状態を 3DSS に保存しない。
6. カメラ状態の保存（永続化）
   - session 内で保持するのはよいが、構造データや外部ストレージに記録しない。
7. viewer 独自データの 3DSS への付与
   - 例：viewerConvenience などのフィールドを 3DSS に追記する。
8. modeler の編集 UI の混入
   - viewer から構造を編集できるような UI を紛れ込ませない。
9. 注釈・レポート等を描画へ介入させる
   - テキストレポート生成やコメントは UI 層で行い、描画規範を崩さない。
10. 曲線・座標の「自動修正」
    - 例：直線で定義されているものを spline でスムージングする、など。

これらは禁止事項に違反する実装が見つかった場合、  
仕様上は「viewer バグ」として扱い、修正対象とする。

本章では、描画規範とカメラ挙動を定義する。


---

# 5 UI イベントと状態管理（viewer）

viewer の UI イベントは、  
**構造データ（3DSS）を一切変更せず**、  
内部の `uiState` を更新することで完結する。

本章では、UI イベント → core → renderer までの状態遷移と、  
「どの経路だけが正規ルートか」を整理する。


## 5.1 uiState の役割と所有権

uiState の目的は次の 2 点：

1. 閲覧体験に必要な一時状態（selection / frame / filters / mode / runtime / microFX）を保持する  
2. 構造データ（3DSS）への変更を防ぐため、構造層と完全分離する  

所有権：

- `data`（3DSS 構造）：core が保持・deep-freeze 済み・read-only
- `uiState`：core が唯一の書き込み権を持つ
- `visibleSet` / `microState` / `cameraState`：uiState の一部として core が管理
- renderer / ui / hub は uiState を **読むだけ**（core の API 経由）

uiState の詳細構造は 2.3 節および `runtime_spec` の `uiState` 定義を正とする。


## 5.2 イベントソースと正規ルート

UI イベントの主なソース：

- PointerInput（マウス / タッチ）
- KeyboardInput（キーボード）
- dev ハーネス（frame スライダ / 再生ボタン / filter ボタン / gizmo ボタン）
- 将来のホストアプリからの直接 API 呼び出し（`hub.core.*`）

正規ルート（唯一の書き換え経路）：

```text
DOM Event
  ↓
PointerInput / KeyboardInput / viewerDevHarness
  ↓（hub.core.*）
core controller 群
  - frameController
  - visibilityController
  - selectionController
  - modeController
  - microController
  - CameraEngine
  ↓
uiState 更新（frame / selection / mode / filters / runtime / microState / cameraState）
  ↓
hub（render loop）
  ↓
renderer.applyFrame / applyMicroFX / applySelection / updateCamera
  ↓
three.js Scene に反映
```

禁止事項：

- UI 層が `uiState` を直接書き換えてはならない
- UI 層が `CameraEngine` や three.js の `camera` / `scene` に直接触れてはならない
- renderer 層が `uiState` や 3DSS を書き換えてはならない


## 5.3 Frame 系イベント

### 5.3.1 イベントソース

- dev viewer の frame スライダ / ボタン
- KeyboardInput（PageUp / PageDown）
- 将来：ホストアプリからの `hub.core.frame.*` 呼び出し

### 5.3.2 正規ルート

例：frame スライダ操作（dev viewer）

1. `#frame-slider` の `input` イベント発火
2. viewerDevHarness 内の `initFrameControls` が `frameAPI.set(v)` を呼ぶ
   - `frameAPI` は `viewerHub.core.frame` のラッパ
3. `core/frameController.set(v)` が呼ばれる
4. `uiState.frame.current` を更新し、必要ならクランプ
5. `visibilityController.recompute()` により `uiState.visibleSet` を再計算
6. hub の次フレーム tick で
   - `renderer.applyFrame(uiState.visibleSet)`
   - `renderer.render()`
7. `frameUiLoop` が `frameAPI.get()` を読んで
   - スライダ値
   - ラベル（`#frame-slider-label`）  
   を同期

KeyboardInput（PageUp / PageDown）も同様に：

- `frame.step(+1)` / `frame.step(-1)` を経由して  
  `frameController.step` → `uiState.frame.current` → `visibleSet` → renderer  
  というルートのみを使う。

### 5.3.3 禁止事項（Frame）

- renderer が `frames` を直接読んで表示可否を決める
- UI 層が `uiState.frame.current` に直接書き込む
- frame 範囲外に自由に飛ばし、その後で勝手にクランプする  
  （クランプは frameController 側の責務とする）


## 5.4 Filter / Layer 系イベント

### 5.4.1 イベントソース

- dev viewer の filter ボタン（points / lines / aux）
- 将来：ホストアプリからの `hub.core.filters.*`

### 5.4.2 正規ルート

1. ユーザが filter ボタン（例：`#filter-lines`）をクリック
2. viewerDevHarness の `initFilterControls` が  
   `filtersAPI.setTypeEnabled("lines", enabled)` を呼ぶ
3. `filtersAPI` は `hub.core.filters` のラッパ
4. `visibilityController.setTypeFilter("lines", enabled)` が呼ばれる
5. `uiState.filters.types.lines` を更新し、`visibleSet` を再計算
6. hub の次フレーム tick で `renderer.applyFrame(visibleSet)` が反映
7. `syncFilterUI()` が `filtersAPI.get()` を読んで  
   ボタンのクラス（filter-on / filter-off）と icon（👁 / 🙈）を更新

### 5.4.3 禁止事項（Filter）

- renderer が `appearance.visible` や `frames` を見て独自に filter する
  - filter 合成（frames / appearance.visible / filters.types）は  
    **visibilityController に一元化** する
- UI 層が `uiState.visibleSet` を直接書き換える


## 5.5 Selection / Picker 系イベント

### 5.5.1 イベントソース

- PointerInput による canvas click（ray picking）
- 将来：UI から直接 `hub.core.selection.select(uuid)` を呼ぶケース

v1 実装では PointerInput が `hub.pickObjectAt` を使って選択を行う。

### 5.5.2 正規ルート

1. ユーザが canvas 上をクリック
2. PointerInput が `pointerup` / `click` をフックし、
   - 画面座標 → NDC 座標へ変換
   - `hub.pickObjectAt(ndcX, ndcY)` を呼ぶ
3. viewerHub が `renderer.pickObjectAt` に委譲し、
   - `userData.uuid` を持つ最前面ヒットを返す（なければ null）
4. PointerInput が `uuid` を受け取り、  
   - `hub.core.selection.select(uuid)` を呼ぶ
5. `selectionController.select(uuid)` が
   - `structIndex` から `kind` を解決
   - `uiState.selection = {kind, uuid}` を更新
6. modeController / microController が必要に応じて
   - `uiState.mode` / `uiState.microState` を更新
7. hub の次フレーム tick で
   - `renderer.applySelection(uiState.selection)`
   - `renderer.applyMicroFX(uiState.microState)`
   - `renderer.render()`

### 5.5.3 禁止事項（Selection）

- UI 層が `uiState.selection` を直接書く
- renderer が「最後に hit したオブジェクト」を勝手に selection として扱う
- modeController を迂回して microState を直接書き換える


## 5.6 Mode / MicroFX 系イベント

### 5.6.1 イベントソース

- KeyboardInput（Q / W / Esc）
- dev viewer の focus トグルボタン / MESO pill（クリック）
- 将来：ホストアプリからの `hub.core.mode.*` 呼び出し

### 5.6.2 正規ルート

例：KeyboardInput（Q → micro mode）

1. `keydown`（`ev.key === "q" || "Q"`）を KeyboardInput が受け取る
2. `selection.get()` で現在 selection を取得
3. `sel.uuid` があれば `mode.set("micro", sel.uuid)` を呼ぶ
4. `modeController.set("micro", uuid)` が
   - `canEnter(uuid)` で遷移可能かチェック
   - `uiState.mode = "micro"` に更新
   - `microController.compute(selection, cameraState, structIndex)` を呼び、
     `uiState.microState` を更新
5. hub の次フレーム tick で `renderer.applyMicroFX(microState)` が反映される

Esc キー（macro 戻り）も同様：

- `mode.set("macro")` → `modeController.set("macro")` → `uiState.mode` 更新
- `uiState.microState = null` にする（microFX OFF）

### 5.6.3 禁止事項（Mode / MicroFX）

- renderer が `uiState.mode` を独自解釈して microFX ロジックを持つ
  - microFX の対象決定は core/microController の責務
- UI 層が `uiState.microState` を直接書き換える
- modeController を経由せずに microController を直接叩く


## 5.7 Camera 系イベント

### 5.7.1 イベントソース

- PointerInput（ドラッグ / ホイール）
- KeyboardInput（矢印キー / Home / +/-）
- gizmo ボタン（HOME / axis）
- dev viewer の追加ショートカット（例：Home キー → reset）

### 5.7.2 正規ルート

PointerInput（orbit / zoom / pan）：

- 左ドラッグ：
  - ドラッグ量から `dTheta` / `dPhi` を算出し、`camera.rotate(dTheta, dPhi)`
- 右 or 中ドラッグ：
  - 画面座標差分から `dx` / `dy` を算出し、`camera.pan(dx, dy)`
- ホイール：
  - `deltaY` から縮尺を決めて `camera.zoom(delta)`

KeyboardInput：

- `ArrowLeft/Right/Up/Down`：
  - `camera.rotate(±step, 0)` / `camera.rotate(0, ±step)`
- `Home`：
  - `camera.reset()`
- `+` / `-` / `NumpadAdd` / `NumpadSubtract`：
  - `camera.zoom(±ZOOM_STEP)`

gizmo：

- HOME ボタン：
  - `camera.reset()`
- X/Y/Z ボタン：
  - `camera.snapToAxis('x'|'y'|'z')`

いずれも最終的には `CameraEngine` のメソッドに集約され、  
`uiState.cameraState` を更新する。

### 5.7.3 禁止事項（Camera）

- UI 層が `uiState.cameraState` を直接書き換える
- renderer が `camera.position` を勝手に動かし、CameraEngine と二重管理する
- modeController や microController が直接 camera を操作する  
  （必要なら CameraEngine API を通す）


## 5.8 runtime フラグ（isFramePlaying / isCameraAuto）

`uiState.runtime` は、再生状態・自動カメラ状態などの  
**ランタイムレベルのフラグ** を保持する。

```ts
uiState.runtime = {
  isFramePlaying: boolean,
  isCameraAuto:   boolean,
}
```

v1 では：

- dev viewer の再生ボタン（Play/Stop）は  
  ハーネス内部の `setInterval` で完結しており、  
  `isFramePlaying` はまだ runtime API からは使用していない。
- 将来、frame 再生ロジックを core/frameController 側へ移す場合は、
  - `hub.core.runtime.startFramePlayback()` / `.stopFramePlayback()` などを追加し、
  - `uiState.runtime.isFramePlaying` を core が唯一の正規ルートとして更新する。

禁止事項：

- UI 層が runtime フラグを直接書き換え、  
  core 側のロジックと矛盾を起こすこと
- renderer が runtime フラグを見て独自の状態マシンを持つこと


## 5.9 dev ハーネス（viewerDevHarness.js）の責務

viewer_dev 用ハーネスは、  
UI と hub のブリッジであり、runtime そのものではない。

責務：

- 起動：
  - `window.load` → `boot()` を 1 回だけ実行
  - `bootstrapViewerFromUrl(canvasId, modelUrl, options)` を呼び出す
- devBootLog の配線：
  - `options.devBootLog = true` / `options.logger = devLogger`
  - Model ログパネルへ  
    `BOOT / MODEL / CAMERA / LAYERS / FRAME` を表示
- UI 接続：
  - frame スライダ / ボタン → `hub.core.frame.*`
  - filter ボタン → `hub.core.filters.*`
  - mode HUD / focus トグル → `hub.core.mode.*` / `hub.core.selection.get()`
  - gizmo → `hub.core.camera.reset / snapToAxis`
  - Keyboard shortcuts（Space → Play）など、  
    dev 専用ショートカットの実装
- HUD / メタ情報表示：
  - File パネル（Source / frame range / current frame）
  - Model パネル（ログ）
  - HUD トースト（viewerToast）

制約：

- runtime 層（core / renderer）の内部構造には触れない
  - 触ってよいのは `viewerHub` の公開 API（`hub.core.*` / `hub.pickObjectAt` / `hub.start` / `hub.stop`）のみ
- KeyboardInput / PointerInput のロジックを上書きしない
  - 例外は「Space → Play」など dev 固有ショートカットのみ

以上により、UI イベントはすべて  
「viewerDevHarness / PointerInput / KeyboardInput → hub.core.* → core → uiState → renderer」  
という一本化された経路を通ることが保証される。


---

# 6 ログ・診断・外部連携と禁止機能（viewer）

viewer は構造データを変更しない閲覧専用アプリであると同時に、  
開発・検証のための **診断ログ** を出力できる dev viewer（viewer_dev）を持つ。

本章では、

- ログ（特に devBootLog）の仕様
- エラー報告とユーザ向けメッセージ
- runtime API を介した外部連携
- スクリーンショット／エクスポート機能の扱い
- microFX の運用ルール（詳細版）

を定義する。


## 6.1 ログの基本方針

### 6.1.1 ログレイヤ

viewer のログは大きく 3 レイヤに分かれる：

1. **dev viewer UI ログ**
   - viewer_devHarness 内で扱う「Model パネル」等への出力
   - 人間が開発時に確認するためのもの
2. **ブラウザコンソールログ**
   - `console.log` / `console.warn` / `console.error` による出力
   - 開発時のデバッグ、および本番でも必要最小限のエラー通知に利用
3. **ホストアプリ側ログ（任意）**
   - Astro / 外部 JS などが viewer のイベントを拾って、  
     サーバロギングや独自 UI に出す場合
   - viewer 仕様としては「イベント通知の形」までを保証し、  
     実際のログストレージはホストの責務とする

### 6.1.2 ログの目的

ログの主目的は次の通りとする：

- 3DSS ロード・検証・初期化の成功／失敗を可視化する
- frame / filter / selection / mode / camera の挙動を診断する
- microFX や structIndex など、内部処理の不整合を検知する

逆に、

- エンドユーザ向けの常時ログビューアを提供する
- 3DSS の内容を「ログとしてエクスポート」する

といった用途は viewer 本体の責務外とする。


## 6.2 devBootLog（起動ログ）仕様

### 6.2.1 役割

devBootLog は、dev viewer 起動時に **最低 1 回だけ** 出力される  
標準形式の起動ログ群である。

目的：

- 起動経路が仕様どおりになっているかを確認する
- model URL / 初期 camera / layers / frame 状態を一目で把握する
- デバッグ時に「起動までは正常か」を素早く切り分ける

### 6.2.2 出力形式

起動完了後、次の 5 レコードをこの順で出力する：

```text
BOOT  <devLabel>
MODEL <modelUrl or (unknown)>
CAMERA {"position":[x,y,z],"target":[x,y,z],"fov":number}
LAYERS points=on|off lines=on|off aux=on|off
FRAME  frame_id=<number>
```

- BOOT
  - ラベル文字列（通常は `"viewer_dev"`）を出す。
- MODEL
  - JSON ロード元の URL（`modelUrl`）を出す。  
    未設定の場合は `"MODEL (unknown)"` とする。
- CAMERA
  - `cameraEngine.getState()` などから cameraState を取得し、
    - position: `[x,y,z]`（存在しない場合は `[0,0,0]`）
    - target: `[x,y,z]`（存在しない場合は `[0,0,0]`）
    - fov: number（存在しない場合は `50`）
  - を JSON 文字列として埋め込む。
- LAYERS
  - `uiState.filters.types.{points,lines,aux}` を優先し、
- FRAME
  - `uiState.frame.current` または `frameController.get()` の値を出す。

### 6.2.3 出力先とオプション

`bootstrapViewer` / `bootstrapViewerFromUrl` の `options` として：

- `devBootLog: boolean`  
  - true の場合のみ devBootLog を出力する。
- `devLabel?: string`  
  - BOOT 行に埋め込むラベル（省略時 `"viewer_dev"`）。
- `modelUrl?: string`  
  - MODEL 行に出す model URL。
- `logger?: (line: string) => void`
  - ログ出力関数。省略時は `console.log` を用いる。

viewer_dev ハーネスでは通常：

- `devBootLog: true`
- `devLabel: "viewer_dev"`
- `modelUrl: jsonUrl`
- `logger: devLogger`（devLogger は Model パネルへ追記）

として呼び出す。

### 6.2.4 dev / 本番での扱い（C-10 対応）

- dev viewer（viewer_dev.html）：
  - 上記 5 行を **必須** とする。
  - 出力先は UI（Model パネル）＋ コンソールを想定。
- 本番 viewer：
  - 同じフォーマットのログを **任意で** 出力してよい。
  - 必須ではないが、診断上有用なため将来的な再利用を想定する。

つまり devBootLog は「dev viewer で必須、本番で任意」の診断ログとする。  
フォーマットは将来も安易に変更しない。


## 6.3 追加ログカテゴリ（開発用）

実装上、次のようなカテゴリを DEBUG フラグ付きで持ってよい：

- HUB (`DEBUG_HUB`)
  - hub のフレームごとの状態スナップショット
  - 例：`[hub] frame n { cam, visibleSet, selection }`
- POINTER (`DEBUG_POINTER`)
  - PointerInput の pointerdown / move / up / click イベント
- KEYBOARD (`DEBUG_KEYBOARD`)
  - KeyboardInput の keydown イベント
- MICROFX (`DEBUG_MICROFX`)
  - microFX 適用前後の state 変化（focusUuid / relatedUuids / localBounds 等）

これらは **デフォルト OFF** とし、  
開発時にのみ true にして使う。

禁止事項：

- DEBUG フラグ OFF 時にも大量のログを出し続けること
- 個人情報など 3DSS 外部のデータを勝手にログへ書き込むこと


## 6.4 エラー処理とユーザメッセージ

### 6.4.1 3DSS ロード／検証エラー

`bootstrapViewerFromUrl` は次を行う：

1. `loadJSON(url)` で fetch
2. `ensureValidatorInitialized()` → AJV にスキーマを読み込む
3. `validate3DSS(doc)` で strict validation
4. NG の場合は `getErrors()` の結果をまとめて Error として投げる

dev viewer では：

- File パネルに
  - Source: `<url>`
  - Load error / validation error のメッセージ
- Model パネルに
  - エラー内容を `<pre>` で表示

を行う。

本番 viewer では：

- エラー詳細を直接 UI に出さず、
  - ユーザには「データ読込エラー」等の簡易メッセージ
  - 詳細はコンソールログやホストアプリ側で扱う
- 3DSS が不正な場合は viewer の render loop を開始しない

### 6.4.2 ランタイムエラー

ランタイムエラー（例：microFX 内で null 参照など）は：

- 可能な限り try/catch で握りつつ、
  - `console.warn` / `console.error` に記録
- viewer 全体のクラッシュを避ける方向でハンドリングする

ただし、カメラや frame 操作が完全に不能になるような致命的エラーは、  
ユーザ UI にも簡易なエラー表示（トースト等）を出してよい。


## 6.5 runtime API と外部連携（viewerCore）

viewer は **read-only な runtime API** を持ち、  
ホストアプリ（Astro / 他 SPA など）から利用できる。

本仕様では、runtime API の最小セットを `viewerCore.js` に集約し、  
2.9 節の定義を正とする。

### 6.5.1 API レイヤリング

- viewerCore（外部公開）
  - `createViewerCore(canvasOrId, options)` などを通じ、
  - 内部で `bootstrapViewerFromUrl` / `bootstrapViewer` を呼び、
  - `hub` への安全なファサードを提供する。
- hub（内部）
  - `hub.core.*` / `hub.pickObjectAt` / `hub.start` / `hub.stop` を持つ。
- core / renderer（完全内部）
  - 外部から直接触らない。

ホストアプリは **必ず viewerCore 経由** で viewer を操作する。  
hub / core / renderer を直 import してはならない。

### 6.5.2 許可される操作

runtime API を通じて許可される操作は：

- frame / filter / mode / selection / camera / runtime フラグに関する
  - 読み取り（get 系）
  - 書き込み（set / step / next / prev 系）
- pick（`pickObjectAt`）による UUID 取得
- イベント購読（将来拡張）：
  - 例：`onFrameChanged`, `onSelectionChanged`

禁止される操作は：

- 3DSS document の書き換え
- 3DSS の「保存」や「エクスポート」としての利用
- viewer 内部の three.js / Object3D への直接アクセス


## 6.6 スクリーンショット・エクスポート機能（C-11）

### 6.6.1 スクリーンショット

viewer 本体（runtime / viewerCore / hub）は、  
**スクリーンショット生成 API を提供してはならない**。

- `toDataURL` / `toBlob` などで canvas から画像を取る行為は、
  - ホストアプリ（HTML / Astro）の責務とする。
- viewer が独自の「スクショボタン」を持ち、  
  内部で画像生成・ダウンロードを行うことは禁止。

理由：

- viewer は「構造の閲覧・体験」に特化し、  
  画像生成ツール化を避ける。
- 専用 API を設計すると、モデルごとに仕様が膨らむため。

### 6.6.2 構造エクスポート

viewer 本体は次のエクスポート機能を持ってはならない：

- glTF / OBJ / FBX 等 3D モデル形式へのエクスポート
- CSV / TSV 等テキスト形式へのエクスポート
- SVG / PDF / 画像ベクトル形式へのエクスポート
- 「現在の filter / selection / frame 状態」を含んだ 3DSS への書き戻し

3DSS から他形式への変換は **modeler や専用ツールの責務** とし、  
viewer は read-only のまま保つ。

### 6.6.3 例外：ホスト側ユーティリティ

ホストアプリが独自に：

- canvas をキャプチャして画像ダウンロードボタンを設置
- API から 3DSS を取得して別ツールへ渡す

といった実装をすることは許可される。  
ただしそれは viewer 仕様の一部ではなく、  
ホスト固有のユーティリティとして位置づける。


## 6.7 開発時のテスト・デバッグ指針（非規範）

本節は推奨事項であり、必須ではない。

### 6.7.1 最低限確認すべきルート

開発時に最低限確認するべき項目：

- 起動ルート
  - viewer_dev.html → viewerDevHarness → bootstrapViewerFromUrl → hub.start
- 入力
  - マウスドラッグ：orbit / pan / zoom
  - PageUp / PageDown：frame ±1（slider / label 追随）
  - Q / W / Esc：mode 切替（HUD pill / toast）
  - Home：camera reset（gizmo HOME と一致）
- devBootLog
  - Model パネルに BOOT / MODEL / CAMERA / LAYERS / FRAME の 5 行が並ぶこと
- filter
  - points / lines / aux の ON/OFF が可視に反映されること
- selection / microFX
  - クリックで selection / focus UUID が更新され、
  - microFX（axes / bounds / marker / glow / highlight）が想定どおり出ること

### 6.7.2 DEBUG フラグの運用

- DEBUG_* は git commit 前に false に戻すか、  
  環境変数やビルドフラグで切り替える。
- 一時的な `console.log` / `debugger` などは  
  ローカル検証後に削除し、DEBUG フラグ付きロガーへ移す。


## 6.8 microFX 運用ルール（詳細）

本節は、4.4 節で述べた microFX の補足として、  
runtime_spec / 7.11 節の MicroFXPayload を踏まえた運用ルールを示す。

### 6.8.1 microState（MicroFXPayload）の前提

microState は概ね次のような構造とする（7.11 節参照）：

```ts
microState = {
  focusUuid: string | null,       // フォーカス対象
  kind: "points" | "lines" | "aux" | null,
  focusPosition: [number,number,number] | null,
  relatedUuids: string[],         // ハイライト対象群
  localBounds: {
    center: [number,number,number],
    size:   [number,number,number]
  } | null,
  // 任意の追加フィールド（renderer 側で拡張可能）
}
```

生成ルート：

- modeController / microController が、
  - selection（uuid, kind）
  - cameraState
  - structIndex
  をもとに計算して `uiState.microState` を更新する。

renderer は **microState を読むだけ** とし、  
自分で microState を書き換えてはならない。

### 6.8.2 microFXConfig による係数集中管理

`runtime/renderer/microFX/config.js` にて、  
microFX 全体の係数を一元管理する：

- axes:
  - `scalePerDistance`
  - `minScale` / `maxScale`
- bounds:
  - `shrinkFactor`
  - `minEdge` / `maxEdge`
- glow:
  - `offsetFactor`
  - `scalePerDistance`
  - ほか intensity / falloff 等
- highlight:
  - 線の太さ・フェード係数 など

調整方針：

- 単位はすべて「world 単位」ベースとし、ピクセルには依存しない。
- カメラ距離や scene 半径から係数を決め、  
  遠近によらずある程度読みやすいスケールにする。
- 実装者は **config だけを触れば見え方を調整できる** ことを目標とする。

### 6.8.3 focus / selection との関係

- microFX は常に selection / mode に従属する：
  - mode = macro → microState = null（microFX OFF）
  - mode = meso / micro → microState ≠ null（必要に応じて）
- focusUuid は selection.uuid と一致するのが基本だが、
  - 将来、modeController が「派生 focus」を導入する場合でも、
  - microState に「どの UUID を focus と扱っているか」を必ず明示する。

### 6.8.4 microFX の ON/OFF

ON/OFF の制御は core 側の責務とし、  
renderer は「渡された microState が null かどうか」で判断する。

- microState === null
  - microFX overlay をすべて解除し、baseStyle に戻す。
- microState !== null
  - focusUuid / relatedUuids / localBounds 等に応じて overlay を適用する。

viewer UI に「microFX OFF」のようなボタンを設ける場合も、  
- UI → hub.core.mode / hub.core.micro などの API を通じて  
  microState を null にする形で実現する。

### 6.8.5 renderer 内部での禁止事項

renderer / microFX 実装が行ってはならないこと：

- microState を書き換える
- struct（3DSS）を参照せずに独自の「意味」を決める
  - 例：UUID 末尾の記号や名前に応じて特別扱いする
- uiState.mode / selection を直接書き換える
- 構造データに依存するような「恒久的な補正」を内部にキャッシュする

microFX はあくまで「純粋な視覚効果レイヤ」であり、  
構造データや状態遷移ロジックには介入しない。


---

# 7 拡張・互換性（viewer：schema の変化への追従）

## 7.1 viewer の拡張方針（基本原則）

viewer は 3DSS に対して、つねに次の原則を守る。

1. **構造データは絶対に変更しない（strict read-only）**
   - `.3dss.json` は AJV による strict validation を通過した後、
     `core.data` / `core.document3dss` として deep-freeze される。
   - runtime / renderer / UI のいかなる層も、この構造を mutate してはならない。

2. **スキーマ準拠を最優先し、寛容モードを持たない**
   - 採用中の `3DSS.schema.json` に合致しないファイルは読み込みエラーとする。
   - `additionalProperties:false` 前提で運用し、未知プロパティの黙認は行わない。

3. **“理解はしなくてもよいが、壊してはならない”**
   - viewer が表示や UI に使わない項目であっても、構造としてはそのまま保持する。
   - 不要と見なした項目の削除・正規化・補完などは一切行わない。

4. **拡張の余地は UI／描画補助のみに限定する**
   - microFX・HUD・gizmo など、純粋に描画レイヤに閉じた機能のみ追加可能。
   - 構造データに影響する拡張（保存・編集・マイグレーション等）は全て禁止。


## 7.2 スキーマの将来拡張への対応

3DSS スキーマは SemVer（`MAJOR.MINOR.PATCH`）に従って更新される。  
viewer は **読み取り専用クライアント**として、これにこう追従する。

### 7.2.1 SemVer と validator

- スキーマファイルは常に単一の `3DSS.schema.json` を canonical とする。
- viewer は起動時にこの schema を AJV へ読み込み、strict モードで validator を構成する。
  - `removeAdditional = false`
  - `useDefaults = false`
  - `coerceTypes = false`
  - `allErrors = true`
  - `strict` 系オプションは警告ではなくエラーとして扱う。
- 入力 `.3dss.json` の
  - `document_meta.version`（3DSS ドキュメントのバージョン）
  - schema 側 `$id` / `$defs` 等  
  を参照し、**major バージョンが schema と一致していること**を確認する。

### 7.2.2 minor / patch での追加・変更

`MAJOR` が一致し、`MINOR/PATCH` の差分が schema 側で吸収可能な場合：

- viewer が新しい schema に追従済みの場合
  - 新規プロパティ・enum 値・$defs などは、構造としてそのまま deep-freeze して保持する。
  - viewer がまだ意味を理解していない項目は
    - UI に出さない、もしくは「raw JSON」として補助表示するに留める。
    - 値の変換や補完は行わない。
- viewer が古い schema のままの場合
  - `additionalProperties:false` により未知プロパティは validation NG となる。
  - この場合、viewer はファイル全体の読み込みを拒否し、  
    modeler や schema 更新側の対応を待つ。

※「古い viewer が新しい schema を緩く受け入れる」挙動は採用しない。

### 7.2.3 major バージョンの非互換変更

- **major 不一致 = 読込不可** とする。
  - 例：schema `2.x` に対して `1.x` のファイル、もしくはその逆。
- viewer が行ってよいのは、validation エラーとして報告するところまで。
- **マイグレーション・自動変換・推測補完**は一切禁止。
  - 過去 → 現行、未来 → 現行 いずれの方向も同様。
- 「寛容モード」「自動アップグレード」などは  
  modeler や専用変換ツールの責任範囲とする。


## 7.3 aux.extension の扱い

`aux.extension` は、構造データ側の拡張用フックであり、viewer は次のように扱う。

### 7.3.1 extension の存在は許容する

- internal state（core.data）には **そのまま保持** する（deep-freeze 対象）。
- viewer が理解できる最小単位（例：位置・ベクトル・色など）のみ描画に利用してよい。
- extension 内の意味論について
  - 自動補完・推論生成は禁止。
  - 「足りない情報を AI で埋める」なども禁止。

### 7.3.2 extension 専用 UI は任意（閲覧限定）

- 許されるのは以下のような **閲覧補助 UI** に限られる：
  - extension の生 JSON を表示するインスペクタ
  - extension の一部フィールドをラベルや tooltip に表示
- extension を編集・保存する UI（追加 / 削除 / 更新）は viewer からは提供しない。  
  これらは modeler または別ツールの責務とする。


## 7.4 前方互換性（未来バージョン）

未来の schema に合わせて作られた `.3dss.json` について：

- 現在採用中の `3DSS.schema.json` にない項目 → `additionalProperties:false` により NG。
- `$defs` などに未知の定義が含まれていても同様に NG。
- 「未来バージョンを緩く読み込む」ことはしない。

ここでいう viewer とは、本番利用を想定した `runtime/*`（core / hub / renderer）であり、  
開発者向けの実験ローダやデバッガ（dev-only ツール）はこの限りではない。  
それら dev 用ツールは viewer 仕様の対象外とする。


## 7.5 後方互換性（過去バージョン）

古い 3DSS ファイルについて：

- 必須項目不足 → `required` で NG（viewer が補完してはならない）。
- 型不一致 → NG（数値を文字列として緩和するなどは NG）。
- 古い構造 → NG（互換レイヤは持たない）。
- viewer が独自に旧バージョンを変換・補修することは禁止。

過去バージョンから現行バージョンへの移行は、  
modeler / 専用変換スクリプト / 人間の作業範囲であり、viewer の役割外とする。


## 7.6 viewer 側の許容される拡張

viewer が拡張してよいのは **UI レイヤと描画補助レイヤのみ**。

### 許容される拡張例

- テーマ切替（ライト / ダークなど）
- HUD 要素
  - 軸・グリッド強調
  - 凡例・スケールバー
  - モード・フレーム・フィルタ状態の表示
- カメラ操作の改善
  - ease 付き orbit / pan / zoom
  - 視点プリセット（front / side / top / iso 等）
- microFX 系の視覚補助
  - focus 周辺の glow / bounds / axes 表示など
- 表示最適化
  - instancing / caching / LOD など、構造不変の範囲での最適化

いずれも **3DSS の構造（points / lines / aux / document_meta）を書き換えない**  
という条件を満たす限り、自由に拡張してよい。


## 7.7 禁止される拡張

viewer に対して、次のような拡張を追加してはならない。

1. **構造データの編集機能**
   - 項目の追加・更新・削除
   - Undo / Redo
   - annotation / comment / note など編集概念
2. **構造データの修復・補完・マイグレーション**
   - 欠損値の推測埋め
   - 未来スキーマ項目の推測生成
   - 「viewer 独自形式」への保存
3. **AI 補完・変換**
   - 意味論に基づく自動変換・要約・再配置
   - extension の内容を AI で自動補完
4. **viewerSettings の永続化**
   - viewerSettings を JSON として保存し、再読み込みすること（詳細は 5.x 参照）。
   - v1 では UI 状態はセッション内の一時状態に限定する。
5. **スクリーンショット / export 機能の内蔵**
   - glTF / SVG / CSV などへの構造 export を viewer runtime に直接持たせること。
   - Canvas のスクリーンショット取得 API を viewer の正式機能として提供すること。  
     （必要なら host 側がブラウザ標準機能や外部ツールで取得する。）

これらは禁止事項として明示し、viewer は **純閲覧アプリ** であることを保証する。


## 7.8 仕様変更時の viewer 側の対応

3DSS スキーマや viewer 仕様が更新された場合、viewer が行うべき対応は以下に限定される。

1. **Validator の更新**
   - 採用する `3DSS.schema.json` を差し替え、AJV 初期化を更新する。
   - validation エラーのログ・メッセージ形式を必要に応じて調整する。

2. **描画ロジックの最小限の更新**
   - appearance / aux.module など、schema 拡張に応じて renderer の解釈を拡張する。
   - 既存の構造解釈を壊さない範囲でのみ変更する。

3. **UI の調整**
   - 新しい module / signification / tags などをフィルタ・凡例に追加する。
   - 不要になった UI 要素を削除する。

4. **構造データへの書き戻しは禁止**
   - 仕様変更を理由に viewer 側が自動変換を行い、  
     新しい .3dss.json を書き出すことは行わない。


## 7.9 拡張・互換性に関する禁止事項（統合）

本章の内容をまとめると、viewer は次をしてはならない。

1. 採用中の `3DSS.schema.json` に定義されていない項目（スキーマ外項目）の読込・保持・解釈。
2. major 不一致の 3DSS ファイルを「寛容モード」で読み込むこと。
3. 構造データの修復・自動補完・マイグレーション。
4. AI による構造推測・追加項目の生成。
5. 編集 UI（add / update / remove / undo / redo）の導入。
6. viewerSettings を永続化し、次回起動時に自動復元すること。
7. extension の意味解釈・構造生成・補完（構造変更に相当するもの）。
8. スクリーンショット / export を viewer runtime の責務として内蔵すること。

これらを禁じることで、viewer は **「strict かつ非破壊な閲覧専用クライアント」** として
長期的な互換性を維持する。


## 7.10 Frame UI 操作ポリシー（フレーム操作規範）

### 7.10.1 基本方針

- frame は一次元の整数 ID で管理する（`frameId: number`）。
- `frame.range = {min, max}` を満たす `min ≤ frameId ≤ max` の離散値のみを扱う。
- viewer コア（`core.frameController`）は **離散ステップ** として frame を管理し、  
  連続値や補間は扱わない。
- frame 切替の責務は
  - 入力操作 → `activeFrameId` 更新
  - それに伴う `visibleSet` 再計算  
  に限定し、2D タイムライン UI の表現や装飾は UI 層に委ねる。

### 7.10.2 操作体系（±1 ステップ中心）

v1 の基本操作は、**±1 ステップのページ送り** を中心に設計する。

- UI ボタン
  - Step Back: `prev`
  - Step Forward: `next`
  - Rew/Home: `frame.set(range.min)`
  - FF: `frame.set(range.max)`
  - Play: 一定間隔で `next`（末尾到達時は `range.min` にループ）
- スライダ
  - `range.min`〜`range.max` の整数値のみを取る。
  - `input` / `change` イベントで `frame.set(value)` を呼ぶ。
- キーボード（標準ハンドリング）
  - `PageUp`: `next`
  - `PageDown`: `prev`
  - これらは `KeyboardInput` → `hub.core.frame.next`/`hub.core.frame.prev/` 経由で処理し、  
    UI ハーネス側から直接 frameController を触らない。

Space → Play/Pause トグルなど、UI 専用ショートカットは  
viewerDevHarness 側でのみ実装してよい（本番 viewer では任意）。

### 7.10.3 mode / microFX との関係

- 単発の frame 移動（±1 step / slider）は  
  macro / meso / micro いずれの mode からも実行してよい。
  - 実行後は `visibilityController.recompute()` により `visibleSet` を再計算し、
    必要であれば `microController.refresh()` で microState を更新する。
- **frame 再生（Play）中の制約**
  - 再生開始時に `uiState.mode` を `"macro"` に戻す。
  - `uiState.runtime.isFramePlaying = true` とし、7.11.2 に従って microFX を無効化する。
  - 再生停止時に `isFramePlaying = false` とし、必要なら microFX を再評価する。

### 7.10.4 camera / filter との関係

- frame 操作はカメラ state を直接変更しない（自動カメラは将来拡張）。
- filter（points/lines/aux）変更時と同様に、frame 変更後は
  - `visibleSet` を再計算
  - microFX / selection ハイライトを必要に応じて再適用  
  するのみとし、構造データには介入しない。

### 7.10.5 音声ポリシー

viewer / modeler ともに **UI 効果音は採用しない**。

- コンテンツ側（動画・3D アニメーション等）が独自に鳴らす音は例外。
- viewer UI の操作（frame 移動・再生ボタン・gizmo 等）は完全サイレントとする。
- 設定画面にも「Sound」「SFX」などの項目は追加しない。


## 7.11 microFX ― ミクロ視覚補助アルゴリズム（viewer 専用）

### 7.11.0 概要とモジュール構造

microFX は「構造データを一切変更せず、micro / meso モード時の局所構造を  
読み取りやすくするための視覚補助」の総称とする。

内部的には次の 3 レイヤに分かれる。

1. **microState（core.microController）**
   - selection / cameraState / structIndex などから、
     フォーカス UUID・原点座標・局所バウンディングなどを計算する。
   - three.js の Object3D には依存しない純ドメイン層。
2. **microFX-core**
   - `visibleSet` を前提に、フォーカス原点からの距離・接続関係などを評価し、
     「どの uuid をどの程度強調 / 減衰するか」を決定する。
   - opacity・color などへの影響度（係数）を算出する。
3. **microFX-overlays（renderer 側）**
   - microState と microFX-core の結果を受け取り、
     three.js シーン内に glow / bounds / axes / highlight などの  
     補助オブジェクトを追加・更新・削除する。

### 7.11.1 microState の形式

microState は `MicroFXPayload` と呼ぶ内部オブジェクトで、概ね次の形をとる。

```ts
type MicroFXPayload = {
  focusUuid: string;                      // フォーカス対象の UUID
  kind: "points" | "lines" | "aux" | null;
  focusPosition: [number, number, number];// マーカー等の基準位置（world 座標）
  relatedUuids: string[];                 // 1hop 接続など、関連 UUID 群
  localBounds: {
    center: [number, number, number];
    size:   [number, number, number];
  } | null;
};
```

- `core.microController` は selection / structIndex / cameraState をもとに  
  毎フレームではなく、必要なときだけ `MicroFXPayload | null` を更新する。
- `uiState.microState` にこの payload が保持され、viewerHub → renderer に伝達される。

### 7.11.2 適用条件（mode・ランタイム状態）

microFX は次の条件をすべて満たすときのみ有効となる。

1. `uiState.mode === "micro"`  
   - mode の定義・遷移条件は第 4.6 節（カメラモード）を参照。
2. `uiState.viewerSettings.fx.micro.enabled === true`
3. `uiState.runtime.isFramePlaying === false`
4. `uiState.runtime.isCameraAuto === false`（将来の自動カメラ用フラグ）

いずれかが満たされない場合、renderer は

- `applyMicroFX(null)` 相当の処理を行い、
- `visibleSet` 内の全要素の描画属性を baseStyle（構造に基づくデフォルト）へ戻す。

### 7.11.3 microFX-overlays（marker / glow / axes / bounds / highlight）

microFX-overlays は、microState を元に three.js シーン内へ追加される  
補助オブジェクト群の総称とする。

v1 では次のモジュールを想定する。

- **marker**
  - `focusPosition` を基準に、小さなマーカー（アイコン）を表示する。
- **glow**
  - フォーカス要素の周辺に球状 / チューブ状のハローを重ねる。
- **axes**
  - microFocus 周辺に局所座標軸（X/Y/Z）を表示する。
- **bounds**
  - `localBounds` に基づく局所 bounding box を表示する。
- **highlight**
  - フォーカス要素に沿ったオーバーレイ線を描画する。

共通ルール：

- いずれも struct（3DSS）には一切触れず、three.js の Object3D 追加・削除と  
  material（color / opacity / transparent 等）の変更のみで実装する。
- macro モードでは microFX-overlays は常に無効（7.11.7 参照）。

v1 では **highlight を必須** とし、その他のモジュールは optional とする。

### 7.11.4 距離フェードと接続強調

microFX-core は、フォーカス原点との距離と接続関係に基づき  
各要素の描画強度を決める。

1. **距離フェード**
   - 任意要素 `u` に対し、その代表位置 `p(u)` と `focusPosition` との距離 `d` を計算する。
   - 距離 `d` に基づいて 0〜1 のフェード係数 `fade(d)` を定義する。
   - 例：
     - `d ≤ R1` → `fade = 1.0`（完全不透明）
     - `d ≥ R2` → `fade = minOpacity`（遠方は薄く）
     - `R1 < d < R2` → 線形補間、もしくは ease 付きカーブ

2. **接続強調（1 hop 周辺）**
   - フォーカスが point の場合：
     - その point を端点に持つ line を 1hop line とする。
     - それらの line のもう一方の端点 point を 1hop point とする。
   - フォーカスが line の場合：
     - その line の端点 point を 1hop point とする。
     - これらとつながる line を 1hop line とする。
   - 1hop 要素は距離フェードに加えて、加点（明るさ増し・太さ増しなど）で強調してよい。

具体的な係数やカーブは `renderer/microFX/config.js` に集約し、  
数値チューニングはそのファイルのみを変更すればよい設計とする。

### 7.11.5 パフォーマンスとスコープ

- microFX は **常に `visibleSet` 内の要素のみ** を対象とする。
  - 非表示要素に対して距離計算や overlay を行わない。
- 大規模データに対しても破綻しないよう、
  - per-frame での大量 `new` を避ける（配列再利用など）。
  - オーバーレイ用 Object3D の再利用（`ensure*` パターン）を基本とする。
- frame / filter 変更時のみ再評価し、カメラの微小移動ごとに  
  全体を再計算しないように実装してよい（近似の範囲で）。

### 7.11.6 renderer とのインタフェース

renderer 側の microFX 関連 API は次のような最小インタフェースとする。

- `applyMicroFX(microState: MicroFXPayload | null): void`
  - `null` の場合：全オーバーレイを削除し、baseStyle に戻す。
  - payload がある場合：
    - microFX-overlays を `ensure*/update*/remove*` で更新。
    - 対象要素の material をフェード係数に応じて変更。
- renderer は microState のフィールドを **読み取るだけ** でよい。  
  struct に書き戻すことや、microState を mutate することは禁止。

### 7.11.7 mode・他機能との相互作用

- **macro モード**
  - microFX は常に無効（renderer は `applyMicroFX(null)` の状態を保つ）。
  - 局所強調は 7.12 節の selection ハイライトに委ねる。
- **meso モード**
  - v1 では microFX 無効。
  - 将来拡張として meso 専用 payload を許容する余地のみ残す。
- **frame 再生**
  - `core.runtime.startFramePlayback()`（または UI 側の Play トグル）開始時に  
    `uiState.mode = "macro"` とし、既存 microFocus をクリアする。
  - 再生中に microFX が再度有効化されないことを保証する  
    （`uiState.runtime.isFramePlaying` フラグで制御）。
- **filter 切替**
  - filter 変更後は必ず `visibleSet` を再計算し、その結果に基づいて  
    `microController.refresh()` → `renderer.applyMicroFX(...)` を再評価する。


## 7.12 Selection ハイライト（macro モード用）

### 7.12.1 目的

selection ハイライトは、**macro モード時に「現在選択中の 1 要素」を明示する**ための  
軽量な強調表現とする。

- macro：全体俯瞰＋「どれを選んだか」を中心に selection ハイライトを使う。
- micro：microFX を中心とし、selection ハイライトは抑制する。

この役割分担により、同じ uuid に対して  
「macro では selection highlight」「micro では microFX」という  
分かりやすい挙動に統一する。

### 7.12.2 適用条件

selection ハイライトは、次の条件をすべて満たすときにのみ描画される。

1. `uiState.mode === "macro"`
2. `uiState.selection` が `{kind, uuid}` で、`uuid` が非 null
3. `uuid` が `visibleSet` に含まれている

この条件を満たさない場合、renderer は selection ハイライト用オーバーレイを解除し、  
baseStyle（構造に基づくデフォルト）のみを表示する。

### 7.12.3 制御フローと責務分担

- `core.selectionController`
  - selection の唯一の正規ルートとする。
  - `select(uuid)` / `clear()` / `get()` などの API を提供し、
    `uiState.selection` を更新する責務を持つ。
  - renderer への通知は、bootstrap 時に渡される
    `setHighlight(payload)` / `clearAllHighlights()` コールバックを通じて行う。
- `viewerHub.core.selection`
  - UI レイヤ（pointerInput / gizmo / dev ハーネス等）には  
    `hub.core.selection.*` のみを公開し、renderer へは直接触らせない。
- renderer
  - `setHighlight({kind, uuid})` を受けて、対象 Object3D の material を軽く強調する。
  - 具体例：
    - 線の場合：太さ・色を少し強くする。
    - 点の場合：サイズや色を強める。
  - microFX とは別レイヤとして実装し、混線を避ける。

### 7.12.4 microFX / mode 遷移との関係

- **macro → micro への遷移**
  - `modeController.setMode("micro", uuid)` により micro モードへ入るとき、
    - `uiState.selection` 自体は保持してよいが、
    - 描画上の selection ハイライトは無効化する（`clearAllHighlights()`）。
  - 同じ `uuid` をフォーカスとした microFX（7.11）が有効になる。
- **micro → macro への遷移**
  - `modeController.setMode("macro")` で戻った時点で、
    - microFX は `applyMicroFX(null)` により解除。
    - `selectionController` 側で、現在の selection を基に  
      `setHighlight({kind, uuid})` を再適用する。
- **frame / filter 変更時**
  - frame / filter の変更で selection の対象が非表示になった場合、
    - selection を維持するかどうかは `selectionController` のポリシーとする。
    - いずれにせよ、`visibleSet` に含まれない要素への highlight は描画しない。

### 7.12.5 仕様上の位置づけ

- selection ハイライトは **「macro モード用の最低限の局所強調」** と位置づける。
- microFX は 7.11 のとおり、micro モードにおける詳細な局所読解のための  
  視覚補助であり、両者は競合せず補完し合うように設計する。
- どちらの機構も 3DSS 構造は一切変更せず、描画属性と overlay にのみ作用する。
