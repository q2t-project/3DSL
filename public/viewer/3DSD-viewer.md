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
- レイヤ（points / lines / aux）の表示切替
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
- points / lines / aux の意味
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
   UI 状態（選択・カメラ・visibility）は ui_state のみで保持し、  
   JSON に混入させない。

5. **外部通信なし**  
   スキーマ取得や remote fetch を行わず、local vendor のみ参照。

---

# 1 システム全体構成（内部アーキテクチャ）

viewer は modeler と同粒度の内部構造を持つが、  
**構造データは常に read-only（不変）** で保持される点が最大の違いである。

内部的には、次の 3 レイヤと 2 種類のエントリポイントから構成される。

- runtime 層  
  - Core（構造 state + ui_state 管理）
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
| Boot               | `runtime/bootstrapViewer.js` | canvas と 3DSS を受け取り runtime を起動し、viewerHub を返す |
| Hub                | `runtime/viewerHub.js` | Core / Renderer をまとめて外部に公開するファサード。`core.*` API を束ねる |
| Core               | `runtime/core/*.js` | 3DSS 構造 state（immutable）と ui_state（viewer 専用 state）の管理 |
| Renderer           | `runtime/renderer/context.js` + `renderer/microFX/*` | three.js による描画、microFX、selection ハイライト |
| UI（dev 用）       | `ui/pointerInput.js` `ui/keyboardInput.js` など | マウス / キー / ギズモ / タイムライン入力を hub.core.* にマッピング |
| Validator          | `runtime/core/validator.js` | `/schemas/3DSS.schema.json` に対する strict full validation |
| Utils / Index      | `runtime/core/structIndex.js` など | uuid インデックス構築、frame 範囲検出などの補助機能 |
| HUD / 視覚補助     | `renderer/microFX/*` | axis / marker / bounds / glow / highlight 等、構造とは無関係な viewer 専用描画 |

※ 実ファイル構成は `viewer/runtime/*`・`viewer/ui/*` のスケルトンに準拠する。  
※ three.js / AJV といった外部ライブラリは runtime からのみ利用し、UI から直接触らない。


### 1.1.1 存在しないモジュール（明確に禁止）

viewer には次のモジュールは存在しない（追加も禁止）：

- Exporter（構造データの保存・書き出し）
- Editor（構造編集）
- Annotation / Report（注釈・レポート）
- Snapshot / Export（スクリーンショット生成等、viewer 独自出力）


## 1.2 Core（read-only state）

Core は「構造 state」と「UI state (ui_state)」の 2 系列だけを扱う。

- **構造 state（struct）**

  - strict validation 済み .3dss.json をそのまま保持する。
  - トップレベル構造：
    - `document_meta`
    - `points[]`
    - `lines[]`
    - `aux[]`
  - deep-freeze された read-only オブジェクトとして扱い、  
    要素の add / update / remove / 座標補正などは一切行わない。

- **UI state（ui_state）**

  - viewer が「どう見せているか」の状態だけを持つ。
  - 例：
    - `selection`（選択中 uuid と kind）
    - `frame.current` / `frame.range`
    - `cameraState`（位置・向き・FOV 等）
    - `filters`（points/lines/aux の ON/OFF）
    - `runtime`（frame 再生中か、自動カメラ中か 等）
    - `mode`（macro / meso / micro）
    - `microState`（microFX の入力）
    - `viewerSettings`（lineWidth や microFX 設定など）
    - `visibleSet`（現在描画対象となっている uuid 集合）

構造 state と ui_state の詳細は第 2 章・第 5 章にて定義する。  
本章では「**struct は不変／ui_state だけが変化する**」という関係だけを固定する。


## 1.3 内部依存関係

依存方向は常に「上位レイヤ → 下位レイヤ」の一方向とする。

- UI / dev harness / 入力レイヤ（HTML / pointerInput / keyboardInput / gizmo / timeline）
  - ↓ `viewerHub`（hub.core.*）
- runtime Core（ui_state / 各種 Controller / CameraEngine / Visibility / Selection / Mode / Micro）
  - ↓ struct（immutable 3DSS）
  - ↓ Renderer（rendererContext + microFX）
- three.js / WebGL

Validator は「runtime 起動前の読み込みフェーズ」にだけ挿入される：

- JSON ロード → Validator（strict full validation）→ OK のときのみ Core に渡す

HUD / microFX は Renderer の一部として扱い、  
構造 state には一切依存させない（座標参照はしても、構造の変更はしない）。


## 1.4 各モジュールの責務

### 1.4.1 Boot（bootstrapViewer.js）

- `bootstrapViewer(canvasOrId, document3dss, options?)`
  - 役割：
    - canvas 解決（DOM 要素 or id 文字列）
    - CameraEngine / ui_state / structIndex / VisibilityController / SelectionController 等の初期化
    - rendererContext の初期化（三次元シーン構築）
    - `createViewerHub({ core, renderer })` を呼び出し、hub を返す
  - 前提：
    - `document3dss` は既に strict validation 済み

- `bootstrapViewerFromUrl(canvasOrId, url, options?)`
  - 役割：
    - `url` から JSON を fetch
    - Validator による strict full validation 実行
    - OK の場合のみ `bootstrapViewer` を内部で呼び出す
    - 結果として同じく `viewerHub` を返す
  - NG の場合：
    - エラー内容を dev UI に通知し、runtime は起動しない


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
- ui_state の生成・更新
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

UI 状態・カメラ・visibility などは **セッション内の ui_state にだけ保持** し、  
ファイル保存や外部出力は行わない。

詳細な I/O ポリシーは第 6 章にて定義する。


## 1.6 禁止事項（viewer 全体）

viewer は次の行為を一切行ってはならない：

1. 構造データの変更（add / update / remove）
2. 構造データの保存（Exporter）
3. 編集イベント（undo / redo / duplicate 等）の実装
4. UI 状態の JSON 出力・永続化
5. annotation / comment / report 等の生成
6. viewer_settings を JSON 化して保存（永続化）すること
7. extension の意味解釈・生成・補完（構造変更に相当）
8. normalize / 推測 / 補完 / prune / reorder 等の生成処理
9. 未来スキーマ項目の推測・解釈（semantic inference）

viewer は **完全 read-only の表示装置** であり、  
viewer 独自情報は ui_state 内部にのみ保持してよい（構造データへの混入禁止）。


## 1.7 起動フロー（dev harness → bootstrapViewer → viewerHub）

### 1.7.1 エントリ経路の固定

開発用 viewer（viewer_dev）は、次の 1 本の経路で起動する。

1. `viewer_dev.html`  
   - dev 用 DOM 骨格（3D canvas・ログ領域・ボタン等）を定義する。
2. `viewerDevHarness.js`  
   - DOMContentLoaded 後に UI 要素をひととおり取得し、  
     `bootstrapViewerFromUrl` を 1 度だけ呼び出す。
3. `runtime/bootstrapViewer.js`  
   - JSON ロード + strict validation + runtime 初期化を行い、  
     `viewerHub` を返す。

この経路以外から Core / Renderer / CameraEngine を直接 new / 呼び出しすることは禁止とする。  
host アプリ（Astro ページ等）も同様に、`bootstrapViewer` / `bootstrapViewerFromUrl` を唯一の入口とする。


### 1.7.2 dev harness の役割

`viewerDevHarness.js` の責務：

- dev 用 UI 要素の参照を集める（canvas / ログ / ボタン等）
- 起動設定（config）を組み立てる：
  - 読み込む `.3dss.json` パス（デフォルトは baseline サンプル）
  - 初期オプション（例：ログ出力先、microFX ON/OFF など）
- `bootstrapViewerFromUrl(canvasElement, config.modelPath, config.options)` を呼び出し、`hub` を受け取る
- `pointerInput(hub)` / `keyboardInput(hub)` / `gizmo(hub)` / `timeline(hub)` など  
  各 UI モジュールを初期化して canvas / DOM に attach する
- 再読込ボタンなど dev 専用 UI のイベントから、必要に応じて
  - hub.stop() → canvas 内容クリア → 再度 `bootstrapViewerFromUrl` を呼び直す

dev harness は three.js や struct を直接扱わず、常に hub.core.* を経由して runtime を操作する。


## 1.8 baseline 起動時の固定条件

本節では、dev viewer（viewer_dev.html）において  
`core_viewer_baseline.3dss.json` を読み込んだときに  
「毎回同じ初期画面」が再現されるようにするための条件を定義する。

### 1.8.1 入力ファイルの固定

1. dev 起動時のデフォルト入力は、常に  
   `/data/sample/core_viewer_baseline.3dss.json` とする。
2. 他のサンプルをロードする UI があっても、  
   「起動直後に自動でロードされるファイル」は上記 1 本に限定する。
3. 読み込んだファイルパスは起動ログに必ず 1 行出力する。

### 1.8.2 カメラ初期状態の固定

`core_viewer_baseline.3dss.json` 読み込み直後のカメラ状態は、  
次の定数として固定する。

- 投影方式: PerspectiveCamera
- up ベクトル: (0, 0, 1)  // Z+ 絶対上
- position: (0, 6, 14)
- target: (0, 0, 0)
- fov: 50°
- near: 0.1
- far: 2000

実装上は `DEFAULT_CAMERA_STATE` として保持し、  
dev 起動時・リロード時は必ずこの値で初期化する。


### 1.8.3 frame / layer 初期状態

- frame
  - `document_meta.frames` が存在する場合：
    - 配列先頭 `frames[0].frame_id` を初期 frame_id とする。
  - frames 無しの場合：
    - 内部的には「frame フィルタ OFF」（`active_frame = null`）として扱い、
      画面表示は「frame: ALL」などの文言で表現してよい。

- layer
  - points / lines / aux をそれぞれ独立した Group として保持する。
  - dev 起動時の初期状態は、3 レイヤすべて `visible = true` とする。
  - ユーザが ON/OFF を切り替えても、リロードすれば必ず全 ON に戻る。


### 1.8.4 起動ログ

dev viewer 起動完了時には、最低限次のログを 1 行 1 レコードで出力する。

- `BOOT  viewer_dev`
- `MODEL /data/sample/core_viewer_baseline.3dss.json`
- `CAMERA {...}`  // position / target / fov 等を JSON 1 行で
- `LAYERS points=on lines=on aux=on`
- `FRAME frame_id=...`

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

の 2 段階だけを担当し、  
編集は行わない。


## 2.2 データ読込時の処理フロー

viewer は構造データの読込時に次の処理を行う：
(1) JSON 読込
↓
(2) Validator による strict full validation
↓
(3) Core へ immutable state としてロード
↓
(4) Renderer が描画を開始
↓
(5) HUD（axis/origin 等）を初期化



### 2.2.1 strict full validation の内容

- 型チェック（type）
- 必須項目（required）
- enum 完全一致
- `additionalProperties:false`
- `ref → uuid` の参照整合
- frames の妥当性
- document_meta の整合
- schema_uri の一致（major 違いは NG）
- uuid の RFC4122 v4 準拠
- `$defs` の一致（未知キー禁止）

viewer は不正データを読み込まない。  
修復・補完（normalize/resolve）は行わない。


## 2.3 内部 state の構造（read-only）

Core 内部で保持する state は次：

```js
{
  document_meta,   // 読み取り専用
  points[],        // 読み取り専用
  lines[],         // 読み取り専用
  aux[],           // 読み取り専用

  ui_state: {      // viewer 専用（構造と完全分離）
    selected_uuid,
    hovered_uuid,
    active_frame,
    panel_state,
    visibility_state,
    camera_state,
    viewer_settings,
  }
}
```

### 特徴
- 構造データは deep-freeze。
- UI 状態は変更可能だが 保存されない（session 限定）。
- viewer は構造データを書き戻さない。

## 2.4 viewer における構造データの扱い方
viewer は構造データに対して：
- 加筆（add）
- 変更（update）
- 補完（auto-fill）
- 除去（auto-clean）
- 推測補完（inference）

など、一切行わない。

### 2.4.1 不変（immutable）の維持
- Core にロードした構造データは不変
- 選択・hover・camera などの状態変化は ui_state のみへ反映

### 2.4.2 表示制御のための解釈は許可される

例：

- active_frame に応じた要素の表示・非表示
- appearance.* の描画方式反映
- marker.shape に応じた geometry 生成
- aux.module に合わせた表示（grid/axis など）

これは 表示ロジック であり、構造データの変更ではない。
viewer は appearance.visible を参照しても、変更・上書きは行わない。

## 2.5 frames（時間層）と読み取り仕様

- active_frame が `null`  
  → frames を無視して全要素を表示（frame フィルタ OFF）
- active_frame が数値 `n`  
  → frames に `n` を含む要素のみ表示
- frames 未定義 or 空の要素は「常時表示」  
  （active_frame の値にかかわらず表示対象）
- viewer は frames を 変更しない・補完しない
- modeler と viewer の frame 解釈は完全に一致させる。

## 2.6 参照整合（ref → uuid）
- ref → uuid の整合は 読込時の Validator が保証 する。
- line.end_a.ref → point.uuid
- line.end_b.ref → point.uuid

不整合なら 読込不可。
viewer 内での再チェックは不要（パフォーマンス確保）。

## 2.7 読込禁止・非対象データ
viewer は以下を構造データとして扱わない：
- UI 状態（カメラ・選択状態など）
- コメントフィールド
- 注釈・メモ・レポート
- modeler の内部情報（undo stack など）
- 外部埋め込み glTF（構造層には無関係）
- viewer 独自形式の JSON（出力・読込ともに禁止）

構造データは `/schemas/3DSS.schema.json` に対する strict full validation を通過した場合にのみ扱う。

## 2.8 データ構造に関する禁止事項（viewer）

viewer は次を一切行わない：
1. 構造データの変更（add/update/remove）
2. 値の補正（丸め・推測・埋め草）
3. uuid の書き換え
4. frames の付け替え・自動補完
5. 参照整合の修正
6. スキーマ外項目の保持
7. UI 状態の JSON 保存
8. normalize / resolve / prune / reorder の実行

viewer は構造データを
“手つかずのまま扱うこと” が厳密に仕様として義務づけられる。

## 2.9 Runtime API 最小セット（MVP）

viewer は modeler から完全に独立した read-only アプリであるが、
UI ハーネス・dev 用ツール・将来の modeler からの再利用を想定し、
外部向けに安定して提供する runtime API を最小セットとして定義する。

本 API は viewer 内部の内部実装（sceneGraph / renderer / viewerRuntime）とは分離され、
/viewer/runtime/bootstrapViewer.js が返す hub オブジェクトの .core を唯一の公開インターフェースとする。

- bootstrapViewer(canvasOrId, threeDSS, options?) → hub
- bootstrapViewerFromUrl(canvasOrId, url, options?) → Promise<hub>

hub の構造（概要）は次のとおりとする。
- hub.core … runtime API 名前空間（本節および 6.8 で定義）
- hub.start() … requestAnimationFrame ループ開始
- hub.stop() … ループ停止
- hub.pickObjectAt(ndcX, ndcY) … ピッキング（UI から selectionController への橋渡し）

以降の仕様では簡略のため、
- core = hub.core
として記述する。

### 公開 runtime API の構造

外部から利用できる runtime API は、次の名前空間にまとめられる（詳細なメソッド一覧は 6.8.2 を正とする）。
- core.frame.*
 active frame の取得・設定・範囲・前後移動に関する操作。
- core.camera.*
 orbit / pan / zoom / FOV / 状態取得・設定に関する操作。
- core.selection.*
 uuid ベースの選択状態管理。
- core.mode.* / core.micro.*
macro / meso / micro モード管理と、micro 侵入可否チェック・enter/exit。
- core.filters.*
points / lines / aux の可視タイプフィルタ。
- core.runtime.*
frame 再生の開始/停止、および runtime 状態の参照。

いずれのメソッドも 構造 state（struct = core.data）を変更せず、
変更されるのは ui_state と three.js 側の描画状態だけである。

### 代表的メソッド（参照用）

以降の仕様本文では、特に利用頻度の高いメソッドとして主に次を用いる。
- フレーム系
 - core.frame.setActive(frame: number)
 - core.frame.getActive(): number
 - core.frame.getRange(): { min, max }
 - core.frame.next(), core.frame.prev()
- カメラ系
 - core.camera.getState(): CameraState
 - core.camera.setState(patch: Partial<CameraState>)
 - core.camera.rotate(dTheta, dPhi)
 - core.camera.pan(dx, dy)
 - core.camera.zoom(delta)
 - core.camera.reset()
 - core.camera.snapToAxis(axis)
 - core.camera.setFOV(value)

- 選択系
 - core.selection.select(uuid: string)
 - core.selection.clear()
 - core.selection.get(): { uuid: string | null, kind: 'point' | 'line' | 'aux' | null }

- モード / micro 系
 - core.mode.setMode(mode: "macro" | "meso" | "micro", uuid?)
 - core.mode.getMode()
 - core.mode.canEnter(uuid: string): boolean
 - core.micro.enter(uuid: string)
 - core.micro.exit()
 - core.micro.isActive(): boolean

- フィルタ系
 - core.filters.setTypeEnabled(kind: "points" | "lines" | "aux", enabled: boolean)
 - core.filters.get(): { points: boolean, lines: boolean, aux: boolean }

- runtime 系
 - core.runtime.startFramePlayback()
 - core.runtime.stopFramePlayback()
 - core.runtime.isFramePlaying(): boolean
 - core.runtime.isCameraAuto(): boolean

完全な定義は 6.8.2 を正とし、本節はその概要を示すものとする。

### 2.x ビュー・プリセット（A / Shift+A）

3DSL Viewer のカメラは、LM/LI/LT 座標系（物理的には x/y/z に対応）に対して、
あらかじめ 7 個の「視点スロット」を持つ。

- LM: 横方向（Left–Middle）
- LI: 奥行き方向（Length–Inner）
- LT: 上下方向（Length–Top）※常に「上」

#### 2.x.1 スロット定義

`view_preset_index ∈ {0,1,2,3,4,5,6}` を次のように解釈する。

| index | ラベル | 可視平面       | 説明                            |
|-------|--------|----------------|---------------------------------|
| 0     | 西     | LT–LM（Z–X）   | 西から東を眺める正面図         |
| 1     | 南     | LT–LI（Z–Y）   | 南から北を眺める側面図         |
| 2     | 天     | LM–LI（X–Y）   | 上から下を見おろす真俯瞰       |
| 3     | SW     | 斜視 (iso)     | 南西からの等角ビュー           |
| 4     | SE     | 斜視 (iso)     | 南東からの等角ビュー           |
| 5     | NE     | 斜視 (iso)     | 北東からの等角ビュー           |
| 6     | NW     | 斜視 (iso)     | 北西からの等角ビュー           |

- index 0〜2 は三角法 3 面図（正投影）のセット  
- index 3〜6 は LT 軸を保ったまま LM/LI 周りを 90°ずつ回した等角ビュー

内部では次のルールで yaw / pitch を決める：

- LT 軸（z）は常に「上方向（画面上）」として保持
- 正面図・側面図・上面図は yaw / pitch をそれぞれ
  - 西: yaw = 0, pitch = 0
  - 南: yaw = π/2, pitch = 0
  - 天: yaw = 0, pitch = π/2 − ε
- アイソメ 4 方向は
  - pitch = ISO_PITCH（約 35°）
  - yaw = 45° + 90°×k （k=0,1,2,3）

#### 2.x.2 キーボード操作

ビュー・プリセットは A キーで循環選択する。

- `A` キー: `view_preset_index = (index + 1) mod 7`
- `Shift + A` キー: `view_preset_index = (index + 6) mod 7`（逆回り）

Viewer は現在の index に応じて

```text
setViewPreset(view_preset_index)
を呼び出し、カメラの

target（注視点）

distance（注視点からの距離）

yaw / pitch（方位・仰俯角）

をプリセット値にスナップする。

LT 軸（z 軸）が常に画面上方向に一致することにより、

Arrow キー旋回

Shift+Arrow パン

マウス orbit

とビュー・プリセットの感覚的一貫性を保つ。


# 3 UI構成と操作体系（viewer）

viewer は構造データの編集を一切行わず、  
閲覧・確認・理解 のための UI 構造のみを備える。

本章では、閲覧専用 UI として必要な機能のみを定義し、  
編集 UI や保存 UI が存在しないことを明確化する。

viewer UI は modeler UI と別系統であり、編集語彙を含まない。


## 3.1 UI 全体レイアウト

viewer の UI は次の二分割レイアウトを基本とする：

```
┌─────────────────────────────┐
│       メインビュー（3Dプレビュー）       │
├──────────────────┬────────────────┤
│     情報パネル     │  表示コントロールパネル  │
└──────────────────┴──────────────┘
```


### 3.1.1 メインビュー（3Dプレビュー）

- three.js による 3D 表示
- 選択／ホバー強調
- frame フィルタ
- カメラ操作（orbit / zoom / pan）
- HUD（axis/origin）の重畳表示（構造層とは独立）

Scene Viewport はダイナミックレイアウト採用


### 3.1.2 情報パネル（読み取り専用）

- name / description
- appearance の内容（色・形状・その他）
- points の座標、lines の接続点など
- 編集 UI（フォーム・セレクタ等）は一切含めない

### 3.1.3 表示コントロールパネル

- frame 切り替え
- points / lines / aux の ON/OFF
- 背景色・HUD・補助線など viewer の表示オプション

構造データを変更せず **UI レイヤ専用** の切替のみを行う。


## 3.2 viewer の操作語彙（非編集の原則）

viewer が採用する操作語彙は 4 種類に限定する：

- **Select**（選択）
- **Hover**（ホバー）
- **View Control**（視点操作）
- **Frame Switch**（フレーム切替）

modeler に存在する add/update/remove/duplicate 等は viewer に存在しない。

viewer の Select は “編集カーソル” ではなく “閲覧対象の焦点”。


## 3.3 Select（選択）

### 3.3.1 選択対象

- point
- line
- aux（hud 拡張は対象外）

### 3.3.2 処理フロー

UI.select(uuid)
→ Core.ui_state.selected_uuid = uuid
→ Renderer が強調表示
→ 情報パネルが「構造データそのまま（正規 JSON 内容）」を表示


- 構造データは不変のまま
- highlight は描画層だけの一時状態


## 3.4 Hover（ホバー）

### 3.4.1 挙動

- 対象を弱く強調
- 情報パネルは更新しない
- 構造データの変更は行わない


## 3.5 視点操作（View Control）

common 規範：

- Z+ を絶対上方向
- 左ドラッグ：orbit
- 右ドラッグ：pan
- ホイール：zoom

カメラは ui_state にのみ保持され、保存不可。

ui_state.camera_state = {
position,
target,
zoom,
fov,
spherical: { theta, phi, radius }
}


カメラ設定は .3dss.json へ書き込まれない。


### 3.6 Frame 操作（viewer_dev ハーネス共通）

- frame は構造データに書き戻さない
- frames 未定義 or 空の要素は常時表示

viewer は `runtime.setActiveFrame(frame_id:number)` を通じて
アクティブフレームを切り替える。viewer_dev ハーネスでは、次の UI を提供する：

- **キーボード**
  - `Home` … フレーム ID = 0 にリセット
  - `PageUp` … 現在値 +1（`getFrameRange()` の最大値でクランプ）
  - `PageDown` … 現在値 −1（`getFrameRange()` の最小値でクランプ）
  - `Shift + PageUp` … `maxFrameId` にジャンプ
  - `Shift + PageDown` … `minFrameId` にジャンプ
- **マウスホイール（Frame モード時）**
  - Frame モード中はホイール量を蓄積し、
    一定しきい値ごとに ±1 フレーム移動する
- すべての UI 変更は `runtime.setActiveFrame()` を経由し、
  `FRAME_UI` ログ（`frame_id` / `source`）として記録する。

※ Alt+P のオートプレイは viewer_dev 専用の開発用機能とし、
本番 viewer 仕様からは除外してよい。



## 3.7 要素表示トグル（viewer ローカル機能）

points / lines / aux の表示 ON/OFF を UI で制御する。

機能の範囲

対象：
points / lines / aux

役割：
画面の見やすさ調整の一時的な非表示

表現：
👁 アイコン（visibility / visibility_off）で ON/OFF
デフォルトは全部 ON

永続化まわり
3DSS には一切保存しない（構造データとは無関係）
viewer をリロードしたら全部 ON に戻るセッションローカル状態
「意味論」「構造の解釈」には関わらない

Scene viewport のダイナミックレイアウト採用
要素表示トグルは「viewer 独自のビュー状態」であり、
modeler の編集結果（3DSS）には影響しない
他クライアントとも共有されない

## 3.8 情報パネル（Detail View）

### 3.8.1 表示内容

- signification.name
- signification.description
- appearance.*
- end_a / end_b（lines）
- frames
- 構造データそのままを階層表示（スキーマ準拠順）

viewer 独自の派生情報（bounding box など）は表示しない。

### 3.8.2 表示モード

- hover
- click（詳細）
- off

入力 UI（テキストボックス等）は持たない。


## 3.9 表示補助（Viewer Assistance）

- grid ON/OFF（HUD/UI 専用。構造データとは無関係）
- axis ON/OFF（HUD/UI 専用。構造データとは無関係）
- 背景色変更
- ワイヤーフレーム表示
- ポイントサイズ調整
- 選択強調色変更
- lineWidth 補正（auto / fixed / adaptive）

いずれも構造データを変更しない。

aux.module.* と UI の grid/axis は **別物** であり混同しない。


## 3.10 UI 禁止事項

viewer に次は存在しない：

1. 編集フォームの提供  
2. add / update / remove / undo / redo  
3. annotation / comment / report / note  
4. UI 状態の JSON 保存  
5. viewer 独自ファイル出力  
6. カメラ位置を .3dss.json に保存  
7. frame 情報を編集する UI  
8. normalize / resolve / prune / reorder の実行  
9. 構造データに影響する UI（暗黙の編集を含む）

viewer は **閲覧専用であり、構造に影響を与えない**。

---

# 4 三次元描画とカメラ（viewer）

viewer の描画システムは modeler と同じ three.js を用いるが、  
閲覧専用アプリとして **透明性・忠実性・非編集性** を最優先する。

本章では、描画規範とカメラ挙動を定義する。


## 4.0 viewer_min による最小描画プロトコル（本体アーキへの写像基準）

### 4.0.1 モジュール構成（viewer_min.*）

viewer_min 系は「DOM／3DSS／three.js」を最小構成で直結するためのリファレンス実装とする。  
ファイルと責務は次の通り。

- `viewer_min.html`
  - `<canvas id="viewer-canvas">` を 1 枚だけ持つ。
  - `<script type="module" src="./viewer_min_boot.js">` でブートストラップを呼ぶ。
  - CSS によりキャンバスのサイズを決める（JS からは `clientWidth / clientHeight` を読むだけ）。

- `viewer_min_boot.js`
  - DOMContentLoaded 後にだけ動く。
  - `../3dss/sample/demo.3dss.json` を fetch し、3DSS.schema.json に準拠した JSON を取得する（ここではバリデータを省略）。
  - `getCanvasOrThrow()` で `#viewer-canvas` を取得し、存在しなければ例外。
  - `initCore(canvas)` を呼び、`{ canvas, renderer, scene, camera }` を受け取る。
  - `setupPoints(core, threeDSS)` → `pointPosByUUID: Map<uuid, {x,y,z}>` を受け取る。
  - `setupLines(core, threeDSS, pointPosByUUID)` で線を生成する。
  - 最後に `startLoop(core)` を呼び、three.js のレンダリングループを開始する。
  - ここは「DOM＋I/O のみ」を扱い、three.js / 3DSS の詳細ロジックは一切持たない。

- `viewer_min_core.js`
  - three.js だけを知る「Core レイヤ」。
  - `initCore(canvas) => { canvas, renderer, scene, camera }`
    - `canvas.clientWidth / clientHeight` を優先し、なければ `window.innerWidth / innerHeight` を使う。
    - renderer の生成・サイズ設定・背景色・カメラ配置・ライト配置を行う。
    - `resize` イベントで aspect / size を自動更新する。
  - `startLoop(core)`  
    - requestAnimationFrame ループを持ち、毎フレーム `renderer.render(scene, camera)` を呼ぶ。
    - ここには 3DSS の知識を一切入れない（scene が何で構成されているかには関心を持たない）。

- `viewer_min_scene.js`
  - 「3DSS → three.js Object3D」への最小写像レイヤ。
  - `setupPoints(core, threeDSS) => Map<uuid, {x,y,z}>`
    - `threeDSS.points[]` を走査し、`appearance.position`（3 要素の配列）を world 座標として Sphere を配置する。
    - `p.meta.uuid`（なければ `p.uuid`）を key に、実際の `mesh.position` を Map に記録する。
  - `setupLines(core, threeDSS, pointPosByUUID)`
    - `threeDSS.lines[]` を走査し、`appearance.end_a.ref / end_b.ref` から point の位置を解決する。
    - 解決できたものだけを `THREE.Line` として生成し、グループにぶら下げて scene へ追加する。
  - DOM も renderer も直接は触らず、`core.scene` と 3DSS だけを前提にする。


### 4.0.2 プロトコル（契約）として固定するルール

viewer_min で確認した挙動を、3DSD-viewer 本体でも守るべき「プロトコル」として次のように固定する。

1. **DOM 契約**
   - ブートストラップは「ターゲット canvas が DOM 上に存在すること」を前提とし、存在しなければ明示的にエラーを投げる。
   - canvas サイズは CSS 主体で決め、JS 側は `clientWidth / clientHeight` を読むだけにする。

2. **Core 契約（three.js レイヤ）**
   - Core は three.js のみを知る。3DSS / frame / UI / HUD などの知識は持たない。
   - Core の公開 API は、基本的に次のような形に揃える。
     - `initCore(canvas, options?) => coreContext`
     - `startLoop(coreContext)` / `stopLoop(coreContext)`
     - 将来 viewer 本体ではここに `resize(width, height)` や `setCameraState` などを足す。

3. **Scene 契約（構造 → Object3D 写像）**
   - Scene レイヤは「構造 or runtime state → Object3D」を一手に引き受ける。
   - Core から渡されるのは `core.scene`（と必要に応じて `objectByUUID` など）だけにする。
   - DOM / fetch / UI イベントなどに触れてはいけない。

4. **3DSS 契約**
   - viewer_min では直接 3DSS を読んでいるが、想定する構造は 3DSS.schema.json 準拠とする。
   - 最低限、次のプロパティを前提にする。
     - `points[].meta.uuid`
     - `points[].appearance.position`（3 要素の配列として解釈）
     - `lines[].meta.uuid`
     - `lines[].appearance.end_a.ref / end_b.ref`
     - `lines[].appearance.color / opacity`（なければデフォルト値）
   - 本体 viewer では、必ず「strict バリデーション済みの 3DSS」だけが Scene レイヤに渡される。

5. **責務分離まとめ**
   - **Boot**（HTML＋boot モジュール）  
     - I/O（3DSS ロード、URL 解釈、DOM 取得）、Core・Scene への呼び出し。
   - **Core**（three.js ラッパ）  
     - renderer / scene / camera / ループ管理。
   - **Scene**（レイヤ描画）  
     - points / lines / aux などの Object3D 生成と更新。
   - それぞれ“下のレイヤ”にしか依存しないようにする。
     - Boot → Core / Scene  
     - Scene → Core（scene のみ）  
     - Core → three.js / WebGL


### 4.0.3 3DSD-viewer 本体への写像

viewer_min で固めたプロトコルを、本体アーキにそのまま対応付ける。

| viewer_min 側 | 3DSD-viewer 本体側（想定対応） |
| --- | --- |
| `viewer_min.html` | `viewer_dev.html`（および最終 viewer.html） |
| `viewer_min_boot.js.main()` | `bootstrapViewer` / `viewerHub.startViewer()` |
| `initCore(canvas)` / `startLoop(core)` | `viewerRenderer.init(canvas)` / `viewerRenderer.start()` |
| `setupPoints(core, threeDSS)` | `drawPoints(ctx, state)`（points レイヤ） |
| `setupLines(core, threeDSS, pointPosByUUID)` | `drawLines(ctx, state)`（lines レイヤ） |

- 本体では、Boot → Core → Scene の間に **Runtime State レイヤ** が 1 段入る：
  - Boot がロードした 3DSS を core/runtime に渡す。
  - runtime が frame / filter を適用して「points / lines / aux の表示用状態（state）」を生成する。
  - viewerRenderer が各フレームで `drawLayer(ctx, layerState)` を呼び出す。
- それでも「依存方向」と「データの受け渡しの基本形」は viewer_min と同じに保つ。
  - DOM / fetch は Boot に閉じ込める。
  - three.js 固有処理は Core に閉じ込める。
  - Object3D の生成は Scene（各 drawXXX）に閉じ込める。
  - 3DSS 仕様への依存は Runtime と Scene に集中させる。

### 4.0.4 検証パス

- viewer_min は「3DSS → three.js → 画面」の最小経路として常に残し、次を確認するためのリグとする。
  - points / lines / aux の単体描画が期待通りか。
  - Core のリサイズ / カメラ 初期状態が期待通りか。
  - 3DSS サンプルの追加・変更によって描画が壊れていないか。
- 本体 viewer で問題が出た場合は、まず viewer_min で同じ 3DSS を読み込ませ、
  - **viewer_min では描けるが本体では描けない** → Runtime / Layer 間の設計／実装ミス。
  - **viewer_min でも描けない** → 3DSS サンプル or three.js 初期化側の問題。
  という切り分けを行う。


## 4.1 描画システムの目的

Renderer の目的：

- .3dss.json の内容を **忠実に** 再現
- 構造データは完全 read-only
- 表示は three.js による「視覚表現」に限定（編集ではない）
- appearance.* は **スキーマの値をそのまま反映**
- frame / visibility / camera の変更は ui_state のみ
- 描画によって構造データが変化することはない


## 4.2 描画対象要素（points / lines / aux）


### 4.2.1 Points

- marker.shape に応じてジオメトリ選択  
  （sphere / box / cone / pyramid / corona / none）
- color / opacity をそのまま反映
- position（x,y,z）は変換せず three.js 空間に配置
- text がある場合はビルボード 2D として重畳（camera facing）
- text.content / text.font / text.size / text.align / text.plane は  
  viewer が意味変更を伴う再整形を行うことを禁止する  
  （自動折り返しやわずかな縮小・kerning の差異は、可読性確保やレンダラ依存の範囲にとどめる）。
- viewer は位置補正・丸めを行わない

### 4.2.2 Lines

- line_type:
  - straight  
  - polyline（点列を順番に接続）
  - bezier / catmullrom / arc（スキーマ定義通り）
- arrow.shape / arrow.placement をそのまま描画
- color / opacity / width を反映
- effect（none / flow / glow / pulse）は描画限定の視覚効果  
  （`none` は視覚効果なしを意味し、追加描画を行わない）

lineWidth に関して：

- WebGL 制限により 1px になる環境があるため  
  viewer は以下の補助モードを持つ：

line_width_mode: auto | fixed | adaptive


- **appearance.width を変更してはならない**（viewer 内補正に限定）

### 4.2.3 Aux

aux.module により描画方法が異なる：

- grid：座標ガイド線
- axis：XYZ 軸マーカー
- plate / shell：平面・境界
- hud：視点補助（視覚ガイド）
- extension：スキーマが定める構造を範囲内で描画

aux は **構造データとしての表示補助** であり、viewer は意味解釈を行わない。

#### aux.module v1 対応範囲（3DSD Viewer v1）

3DSS v1.0.1 の aux.appearance.module では、grid / axis / plate / shell / hud / extension など複数の補助構造が定義されている。
本バージョン（3DSD Viewer v1）の公式実装が 描画を保証する aux.module は grid のみ とする。
 - module.grid
  - ground グリッドとして 3D 表示することを v1 の挙動として保証する。
 - module.axis / module.plate / module.shell / module.hud / module.extension.*
  - スキーマ上は有効な構造やが、Viewer v1 では 描画されなくてもよい（無視されても仕様どおり）。
  - 無視された場合でも、それだけを理由に「エラー扱い」にはしない。

将来の Viewer バージョンで追加の aux.module をサポートする場合は、以下の表を拡張して対応状況を明示する。
| module 名               | スキーマ定義有無 | Viewer v1 の扱い | 備考                                          |
| ---------------------- | -------- | ------------- | ------------------------------------------- |
| `grid`                 | あり       | 描画必須（保証）      | ground グリッド。`subdivisions` 等、基本パラメータのみ対応で可。 |
| `axis`                 | あり       | 描画任意・無視可      | 無視しても SCHEMA_OK。ギズモは別レイヤで実装する。              |
| `plate`                | あり       | 描画任意・無視可      | 将来の床プレート／背景板候補。v1 ではノーサポートでよい。              |
| `shell`                | あり       | 描画任意・無視可      | ドーム／外皮表現用。v1 では無視してよい。                      |
| `hud`                  | あり       | 描画任意・無視可      | HUD 系は基本的に Viewer 側の UI でまかなう。              |
| `extension.latex`      | あり       | 描画任意・無視可      | 数式レンダリングは将来拡張。                              |
| `extension.parametric` | あり       | 描画任意・無視可      | パラメトリック形状も将来拡張。                             |


---

UI レイヤの grid/axis（第3章）は  
aux.module.grid / aux.module.axis と完全に独立し、混同不可。


## 4.3 frame（時間層）による表示制御

### 4.3.1 表示ルール

- active_frame == n  
  → frames に n を含む要素のみ表示
- active_frame が null  
  → frames を無視して全要素を表示（frame フィルタ OFF）
- frames が未定義または空  
  → 常時表示（active_frame の値にかかわらず表示対象）
- フレーム切替は UI 状態の更新のみ（構造不変）

### 4.3.2 注意点

- frame を viewer が変更しない
- frames の推測・補完禁止
- “active_frame ∈ frames” の一致判定のみ
- 順番・範囲を解釈しない


## 4.4 差分描画（更新時の高速反映）

差分更新の対象：

- active_frame の変更
- レイヤ可視性（points/lines/aux）
- 選択状態
- hover 状態

構造データは変化しないため、**structure の再パースは行わない**。

ui_state の変化だけで描画反映を行う。


## 4.5 カメラ仕様（閲覧用）

common 規範：

- Z+ が絶対上方向
- orbit（左ドラッグ）
- pan（右ドラッグ）
- zoom（ホイール）

### 4.5.1 カメラ状態

- カメラ位置・角度・FOV・zoom は ui_state.camera_state に保持（構造不変）
- .3dss.json への書き込み禁止
- 永続化禁止（session-limited）

### 4.5.2 初期カメラ

初期表示時：

- 構造全体が収まる距離
- わずかに俯瞰した角度（Y 軸に対してマイナス角度）
- grid / axis が見える位置
- bounding box から最大外接球半径を取得  
  → radius × 1.8 を距離の基準とする

初期値を構造へ書き戻さない。


## 4.6 選択・ホバーの描画挙動

### 4.6.1 選択（Select）

- 色・太さ・発光などで強調
- 他要素との差別化
- 情報パネル更新

### 4.6.2 ホバー（Hover）

- 選択より弱い強調
- 一時的な可視補助（情報パネルは更新しない）

選択・ホバーのいずれも **構造データへ影響しない**。

# 4.7 斜め線（non-axis-aligned line）に対するシャドー表現規範（Shadow Convention）

viewer は構造データを編集せず、  
lines の視認性向上のみを目的に **描画層限定の軸方向シャドー（Axis-Aligned Shadow）** を付与する。

斜め線は空間的方向が読み取りづらく、  
特に多要素構造では誤読が生じやすいため、  
三次元方向を補助表示するための「非破壊・描画専用」規範を定義する。

本規範は構造データを変更せず viewer 内部の描画処理のみに適用される。


### 4.7.1 対象

start/end ベクトル v = (dx, dy, dz) において、  
複数軸に非ゼロ成分を持つ（= 斜め）線分および polyline の各セグメント。

- dx/dy/dz のうち 2 軸以上が非ゼロ → 斜め線として判定  
- polyline の場合、各セグメント単位で判定  

ベクトル方向から軸方向成分を抽出し、  
それぞれに対してシャドーを投影する。


### 4.7.2 シャドー方向（符号に基づく）

v = (dx, dy, dz) の符号に基づいて影を落とす。

| 成分 | dx > 0 | dx < 0 | dy > 0 | dy < 0 | dz > 0 | dz < 0 |
|------|--------|--------|--------|--------|--------|--------|
| 影方向 | X+ | X− | Y+ | Y− | Z+ | Z− |

複数軸が傾く場合、各軸成分ごとに独立して影を描画する。


### 4.7.3 シャドー濃度（軸別の視認性補正）

視覚的分離性の観点から、軸ごとに濃度を変える：

- X軸：10〜20%（薄め）
- Y軸：20〜30%（中）
- Z軸：30〜40%（濃い）

理由：  
Z（上下）は最も誤読しやすいため補助を強くし、  
Y（前後）は中間、  
X（左右）は相対的に理解しやすいので弱くする。


### 4.7.4 シャドーの描画方法（offset + falloff）

shadow は元の line geometry と完全に独立した  
**1–2px 程度の offset line** として描画する。

手順：

1. 元ラインの複製 geometry を生成  
2. 軸方向に 0.5〜1px 程度 offset（screen space）  
3. 濃度に応じたカラー適用  
4. 始点→終点方向に向かって falloff（100%→0%）を適用  

falloff は線形または指数減衰のどちらでもよいが  
視認性を損なわない範囲に限定する。

※ depth bias を用いて Z-fighting を厳密に回避する。


### 4.7.5 polyline / bezier / spline との関係

- polyline：各セグメントごとに v = p[i+1] − p[i] を用いてシャドー判定  
- bezier/catmullrom/arc：サンプリング点間の接線方向ベクトルを使用  
- フィレット（round corner）も同様に接線方向へシャドーを投影

shadow の計算は geometry ベースで行い、  
構造データ（座標値）には一切変更を加えない。


### 4.7.6 viewer の役割と制約

シャドーは viewer 内部の視覚補助であり、構造には影響しない：

- JSON への保存禁止  
- appearance.* を変更禁止  
- lineType 変更禁止  
- polyline 化の強制禁止  
- 推測・補完・自動変形は禁止  

viewer は **“3D 方向の理解補助”** のみ行い、  
構造変化・意味変化となる処理は一切実施しない。


### 4.7.7 設定（viewer_settings）

shadow 表示は viewer 内の設定として管理される：

```ts
ui_state.viewer_settings.render.shadow = {
    enabled: true,
    intensity_scale: 1.0
}
```

- `enabled` は UI で ON/OFF 可能  
- 設定値は session 限定で永続化禁止  
- 構造データへ混入させてはならない  


### 4.7.8 本規範の目的

本規範は、特に斜め線が増えた構造において  
閲覧者が直感的に方向を把握できるようにするための  
**非破壊・補助的な視覚表現** を提供することを目的とする。

構造データは手つかずのまま維持し、  
viewer の表示レイヤでのみ方向性のヒントを与える。


## 4.8 描画パフォーマンス要件

viewer は閲覧専用であり、以下を満たす：

- frame 切替：100ms 以内
- 2000〜5000 要素で遅延なし
- カメラ操作：60fps 以上を目標（実行環境依存）
- aux 切替：即時反映
- 選択・ホバー：1フレーム以内に反映

パフォーマンス補助（instancing / LOD / caching）は  
**viewer 内部で完結** し、構造データには影響させない。


## 4.9 描画禁止事項（viewer）

viewer は次の行為を行ってはならない：

1. 位置の丸め・補完
2. ジオメトリの推測・補正
3. ref 整合の修復
4. 構造データに存在しない要素の追加
5. 描画状態を JSON へ書き戻す
6. カメラ状態の保存
7. viewer 独自データの付与
8. modeler の編集 UI の混入
9. 注釈・レポート等を描画へ介入させる
10. 曲線・座標の normalize（平滑化等）
11. bounding box / collision / metrics を  
    **構造表示へ混入すること**（内部計算の利用は可）


## 4.10 Frame 操作 UI（v1 実装範囲）
### 4.10.1 UI 構成

Frame 表示は HUD の右上に Frame: N として常時表示。

v1 では **直接指定入力（数字ボックス）**と
**インクリ/デクリ操作（キー／ホイール）**の 2 系統のみ。

フレームが多数ある場合でも、UI の複雑化を避けるため
全フレーム一覧やスライダーは v1 に含めない。

### 4.10.2 小プレビュー（optional, 後段検討）

中央 frame の左右に N-1 / N+1 の簡易サムネイルを配置し、
連続性を視覚的に補助する案を 仕様として保持するが
v1 では実装しない。


## 4.11 カメラモード（macro / meso / micro）
### 4.11.1 概要

3DSL Viewer におけるカメラには、次の 3 モードを定義する。

モード	用途	説明
macro	全体俯瞰	シーン全体の構造を俯瞰する基本モード。フレーム再生もこのモードで行う。
meso	近傍クラスタ	選択要素の周辺にある小さな部分構造（近傍クラスタ）をまとめて観察する中距離モード。
micro	1 要素原点	選択中の 1 要素をローカル原点とみなし、そのごく近傍だけを強調して観察する近接モード。

ui_state.mode に "macro" | "meso" | "micro" を保持する。

モード遷移はすべて core.mode.setMode(mode, uuid?) を経由して行う。

MicroFX（視覚補助効果）は meso/micro モードでのみ有効とし、macro では一切適用しない。

### 4.11.2 モード遷移トリガ（PC viewer_dev）

PC 版 viewer_dev における標準トリガを次のように定める。

macro モード

Esc キー：どのモードからでも macro に戻る（選択は維持）。

右下パネルの MACRO pill（クリック）。

micro モード

Q キー：現在選択中の要素に対して micro モードでフォーカスする。

core.canEnterMicro(uuid) が false の場合は無視する。

右下パネルの FOCUS [Q] ボタン：Q キーと同等。

meso モード

右下パネルの MESO pill：現在選択中の要素を起点に meso モードへ遷移する。

選択なし／非可視要素の場合は無視する。

いまの段階ではキーボードショートカットは予約のみ（将来拡張で割り当て）。

共通制約：

フレーム再生中（ui_state.runtime.isFramePlaying === true）は meso/micro には入らない。

カメラ自動制御中（ui_state.runtime.isCameraAuto === true）も meso/micro には入らない。

モード遷移は常に modeController.setMode(mode, uuid) を用いる。

### 4.11.3 CameraEngine の振る舞い差

CameraEngine.setMode(mode, uuid) は、渡されたモードに応じてカメラ状態 camera_state を次のように更新する。

共通：

uuid が指定されている場合は rendererContext.getElementBounds(uuid) から
center:[x,y,z], radius を取得し、target と基準距離の計算に用いる。

uuid が無い／境界が取得できない場合は getBoundingBox() にフォールバックする。

macro

target をシーン全体の中心に設定し、半径 R_scene に対して

radius ≈ k_macro * R_scene（k_macro ≒ 1.8）

theta = phi = 45° の対角俯瞰ビューに初期化。

MicroFX を全解除する。

meso

uuid の bounding sphere 半径を r_elem とするとき、

target = center(uuid)

radius ≈ k_meso * r_elem（k_meso ≒ 2.0〜2.5 の範囲で viewerSettings から決定）

視野角 fov は macro と同等（例: 45°）を維持する。

MicroFX は「近傍クラスタを残しつつ、遠方をやや暗くする」程度の強さとする。

micro

target = center(uuid)

radius ≈ k_micro * r_elem（k_micro ≒ 0.5〜1.0。meso より近い）

必要に応じて若干 fov を狭めることを許容する（例: 40° など）。

MicroFX は「選択要素を最も強く強調し、その他を大きく減光」する。

数値は実装側では viewerSettings.camera および viewerSettings.fx から取得し、
仕様上は「macro > meso > micro の順に 距離が近く / 周辺が暗くなる」という関係のみを保証する。

### 4.11.4 MicroFX（距離フェード）のモード差

rendererContext.applyMicroFX({ mode, uuid, origin, settings }) は、
モードに応じて以下のポリシーで不透明度とハイライトを決める。

macro:

常に applyMicroFX(null) と同義。全オブジェクトを元のマテリアルに復元する。

meso:

origin からの距離 d とシーン基準半径 R_scene から

フェード上限距離 D_meso ≈ α_meso * R_scene（例: 1.0〜1.5）

最低不透明度 opacity_min_meso（例: 0.3〜0.5）

d >= D_meso で opacity = opacity_min_meso、
d → 0 で opacity → 1.0 となる線形補間を行う。

フォーカス要素には中程度の emissive 強調を行う。

micro:

D_micro ≈ α_micro * R_scene（例: 0.4〜0.8）を用いて meso より狭い範囲で補間。

最低不透明度 opacity_min_micro は meso より小さく（例: 0.05〜0.2）設定する。

フォーカス要素には meso より強い emissive 強調を行う。

有効・無効フラグ：

viewerSettings.fx.meso === false の場合、meso モードでも MicroFX は適用せず、
カメラ位置のみ meso 用に変更する。

viewerSettings.fx.micro === false の場合も同様。

## 4.12 カメラ入力レイヤ正式仕様

（Keyboard / Gizmo / core.camera.*）

### 4.12.1 レイヤ構造

カメラ関連の入力レイヤは、次の 4 段階に分離する。

Input Source（物理入力）

Mouse / Wheel（Canvas 上ドラッグ＋ホイール）

Keyboard（グローバル keydown）

Gizmo/UI ボタン（右下パネル内）

Input Adapter（変換レイヤ）

CameraInput … Canvas 上の Mouse / Wheel → CameraEngine.rotate / pan / zoom

KeyboardInput（viewer_dev 内部） … keydown → core.* API 呼び出し

GizmoInput（gizmo.js＋viewer_dev） … ギズモ DOM イベント → core.gizmo.* / core.camera.*

Core API（viewerHub で公開される窓口）

core.camera.*

core.frame.*

core.mode.* / core.micro.*

core.runtime.*

Engine 層

CameraEngine … camera_state を唯一のソースオブトゥルースとして three.js Camera を制御する。

原則：

UI / HTML は CameraEngine に直接触らない。

すべての入力は一旦 core.* を経由してから CameraEngine に届く。

簡易の流れ図：

Mouse/Wheel ──> CameraInput ──> CameraEngine ──> three.js Camera
Keyboard    ──> KeyboardInput ──> core.[camera/frame/mode] ──> ...
Gizmo Btn   ──> GizmoInput ──> core.gizmo.* / core.camera.* ──> ...

### 4.12.2 CameraInput（マウス／ホイール）

CameraInput は「canvas 上のマウス操作をカメラ操作に変換する」専用レイヤとし、
UI の状態（mode や selection）は一切参照しない。

コンストラクタ引数

名前	説明
domElement	対象 Canvas 要素
engine	CameraEngine インスタンス
rotateSpeed	回転速度スケール（既定 1.0）
panSpeed	平行移動速度スケール（既定 1.0）
zoomSpeed	ズーム速度スケール（既定 1.0）
invertOrbitY	縦回転の向き反転フラグ（既定 false）

マッピング（PC viewer_dev 既定）

入力	操作	コア呼び出し
左ボタンドラッグ	orbit（回転）	engine.rotate(dTheta, dPhi)
中ボタン or 右ボタンドラッグ	pan（平行移動）	engine.pan(dx, dy)
マウスホイール（スクロール）	zoom（視点距離スケール）	engine.zoom(delta)

CameraInput は core や ui_state を知らず、純粋に CameraEngine だけを操作する。

### 4.12.3 KeyboardInput（キーボード）

キーボード入力は「グローバルショートカット → core. API*」という形で扱う。
viewer_dev では window.addEventListener("keydown", ...) によって実装する。

#### 4.12.3.1 キーイベント共通ルール

event.target.tagName が INPUT / TEXTAREA の場合は何もしない（フォーム操作優先）。

修飾キー（Shift / Ctrl / Alt）は、下表に明示されている組み合わせ以外は無視する。

キーハンドラは core の存在を前提とするが、CameraEngine には直接触れない。

#### 4.12.3.2 カメラ系以外のキーマップ（参考）

（すでに実装済み）

キー	動作	コア API
Space	フレーム再生 / 停止 トグル	core.runtime.startFramePlayback/stop
PageUp	1 フレーム進む	core.frame.next()
Shift+PageUp	最終フレームへジャンプ	core.frame.setActive(range.max)
PageDown	1 フレーム戻る	core.frame.prev()
Shift+PageDown	最初のフレームへジャンプ	core.frame.setActive(range.min)
Home	フレーム 0 へジャンプ	core.frame.setActive(0)
Q / q	選択要素に micro でフォーカス	core.mode.setMode("micro", uuid)
Esc	macro に戻る	core.micro.exit()

#### 4.12.3.3 カメラ系キーマップ（提案仕様）

PC viewer_dev の標準カメラショートカットを次のように定義する。

キー	条件	動作	コア API 呼び出し例
ArrowLeft	いずれのモードでも可	左方向に少し orbit する	core.camera.rotate(-Δθ, 0)
ArrowRight		右方向に少し orbit する	core.camera.rotate(+Δθ, 0)
ArrowUp		上方向に少し orbit する	core.camera.rotate(0, +Δφ)
ArrowDown		下方向に少し orbit する	core.camera.rotate(0, -Δφ)
Shift+ArrowLeft		左へ pan	core.camera.pan(-Δx, 0)
Shift+ArrowRight		右へ pan	core.camera.pan(+Δx, 0)
Shift+ArrowUp		上へ pan	core.camera.pan(0, +Δy)
Shift+ArrowDown		下へ pan	core.camera.pan(0, -Δy)
+ / =		1 ステップ前進ズーム	core.camera.zoom(-Δz)（ホイール前方向相当）
- / _		1 ステップ後退ズーム	core.camera.zoom(+Δz)
Ctrl+0		カメラリセット（zoom fit）	core.camera.reset()

Δθ, Δφ は 1 キー押下で 5〜10 度程度を目安とし、
viewerSettings.camera.keyboardStep から決定する。

Δx, Δy, Δz も viewerSettings.camera.panStep / zoomStep で指定する。

micro / meso / macro いずれのモードでも同じマッピングを使うが、
実際の挙動は CameraEngine 内部で mode に応じて調整してよい（例：micro 中は pan を弱める等）。

### 4.12.4 GizmoInput（ギズモ／ボタン）

ギズモおよびカメラ用ボタン類は、最終的にすべて core.gizmo.* / core.camera.* を直接叩く。

#### 4.12.4.1 現行 viewer_dev 実装（暫定仕様）

右下の矢印ボタン（↑↓←→）は、クリック時に対応する KeyboardEvent("keydown", { key: "ArrowUp", ... }) を擬似発火し、
KeyboardInput 側で Arrow キー扱いされる、という実装になっている。

これは「PC dev 用の簡易実装」であり、将来の正式版では廃止してよい。

#### 4.12.4.2 目標仕様（最終形）

最終的な設計としては、ギズモはキーイベントを経由せずに core API を直接呼ぶ。

UI 要素	動作	コア API
ギズモ中央の HOME ボタン	カメラリセット（zoom fit）	core.gizmo.homeClick() → core.camera.reset()
ギズモ X 軸クリック	X 軸正方向からのビューへ	core.camera.snapToAxis("x")
ギズモ Y 軸クリック	Y 軸正方向からのビューへ	core.camera.snapToAxis("y")
ギズモ Z 軸クリック	上からのトップビュー	core.camera.snapToAxis("z")
ギズモ周囲の矢印ボタン ↑↓←→	Orbit or Pan 小ステップ	core.camera.rotate / pan（Keyboard と同等）

クリック → core 呼び出しまでの処理は gizmo.js（または gizmoController）側で完結させ、
viewer_dev.html には「ボタン DOM と eventListener を張る」だけを残す。

将来的に 3D ギズモ自体を three.js シーン内に描画する場合も、
「ギズモ → core.camera.*」という関係は変えない。

### 4.12.5 優先順位と拡張方針

現状のコードに対して必須の整理

KeyboardInput に「カメラ系ショートカット（Arrow / Shift+Arrow / +/- / Ctrl+0）」を追加。

gizmo 矢印ボタンの擬似 KeyboardEvent は、一旦そのまま許容（挙動が揃うため）。

次のステップ

gizmo.js に onAxisClick / onHomeClick のハンドラを整理し、
core.gizmo.* の呼び出しに寄せる。

矢印ボタンも KeyboardEvent ではなく、core.camera.rotate / pan を直接叩く形に移行。

将来拡張

TAB プリセットカメラ（TAB で事前登録したカメラ状態を巡回）

マウス中ボタンドラッグによる「ローカル orbit」など、高度な操作は別セクションで定義。
---

# 5 UIイベントと状態管理（viewer）

viewer の UI イベントは、  
**構造データへの変更を一切伴わず**、  
内部の ui_state を変更するだけで完結する。

viewer の UI イベント体系は modeler と異なり  
「状態遷移のみ」で構成される。


## 5.1 ui_state の役割

ui_state の目的は次の 2 点。

1. 閲覧体験に必要な一時状態（選択・hover・frame・可視性）を保持する  
2. 構造データ（points/lines/aux）への変更を防ぐため完全分離する

ui_state は構造データと完全に独立し、  
**.3dss.json に保存されることはない**。


## 5.2 ui_state の構造
```
ui_state: {      // session-limited viewer-only state
  selected_uuid: string | null,
  hovered_uuid: string | null,
  active_frame: number | null,

  visibility_state: {
      points: boolean,
      lines: boolean,
      aux: boolean,

      aux_module: {
          grid: boolean,
          axis: boolean,
          plate: boolean,
          shell: boolean,
          hud: boolean,
          extension: boolean
      }
  },

  panel_state: {
      info_panel_open: boolean,
      control_panel_open: boolean
  },

  camera_state: {
      position,     // vec3
      target,       // vec3
      zoom,         // number

      spherical: {  // optional
          theta,
          phi,
          radius
      },

      fov: number
  },

  viewer_settings: {      // 表示オプション（構造とは独立）
      info_display: "hover",
      render: {
          line_width_mode: "auto",
          min_line_width: 1.0,
          fixed_line_width: 2.0
      },
      camera: {
          fov: 45,
          near: 0.1,
          far: 50000
      }
  }
}
```

### 特徴

- viewer 内限定状態（session-limited）
- 構造データに紐づくのは uuid のみ  
  → 選択対象の参照として保持
- visibility_state は appearance.visible と連動しない  
  → UI 専用の可視設定


## 5.3 イベント体系（viewer）

viewer が扱う UI イベントは次の 6 種類のみ：

● **Select**  
● **Hover**  
● **Frame Switch**  
● **Visibility Toggle**  
● **Camera Control**  
● **InfoModeChange**（情報パネル表示方式の変更）

Add / Update / Remove / Duplicate / Undo / Redo  
などの編集イベントは viewer には存在しない。


## 5.4 Select（選択）

viewer の Select は “編集カーソル” ではなく “閲覧対象の焦点”。

### 5.4.1 動作フロー

UI.select(uuid)
→ Core.ui_state.selected_uuid = uuid
→ Renderer が強調表示
→ 情報パネルが 構造データそのまま を表示


### 5.4.2 特徴

- 構造データは不変
- uuid の整合性は読込時に Validator が保証


## 5.5 Hover（ホバー）

Hover は一時的な視覚補助。

### 5.5.1 動作フロー
UI.hover(uuid or null)
→ Core.ui_state.hovered_uuid = uuid
→ Renderer が弱い強調を適用


- 情報パネルは更新しない
- 構造データは変更されない


## 5.6 Frame Switch（フレーム切替）

frames による表示フィルタが動作。

### 5.6.1 動作フロー

UI.frame_switch(n)
→ ui_state.active_frame = n
→ Renderer が active_frame に合致する要素だけ表示


### 5.6.2 特徴

- frame 値は構造データへ書き戻さない
- 未定義 or 空 frames は常時表示


## 5.7 Visibility Toggle（表示切替）

points / lines / aux の表示制御。

appearance.visible（構造側）とは無関係。

### 5.7.1 動作フロー

UI.toggle("points")
→ ui_state.visibility_state.points = !current
→ Renderer が反映


- aux は module 単位（grid / axis / shell…）で切替可能


## 5.8 Camera Control（カメラ操作）

カメラ操作も ui_state のみ変更。

### 5.8.1 動作フロー

UI.camera_orbit()
UI.camera_zoom()
UI.camera_pan()
→ ui_state.camera_state 更新
→ Renderer 即時反映

UI.camera_fov(value)
→ ui_state.camera_state.fov = value
→ Renderer 即時反映


### 5.8.2 特徴

- .3dss.json に書き込まない（永続化禁止）
- session lifetime のみ有効


## 5.9 UI 状態の初期化

ファイル読込直後に全状態は初期化される。
selected_uuid = null
hovered_uuid = null
active_frame = null
visibility_state = { points:true, lines:true, aux:true, aux_module:{全て true} }
camera_state = 初期カメラ配置  
panel_state = 既定状態

camera_state は構造データの bounding box から初期位置を算出する。  
このとき active_frame は null（frame フィルタ OFF）とし、全要素を表示する。


## 5.10 viewer における状態管理の禁止事項

viewer は次を行ってはならない：

1. ui_state を .3dss.json に混入  
2. 選択状態を保存  
3. カメラ状態を保存  
4. frame の編集  
5. 新規 uuid の生成  
6. 構造データの編集（update/remove）  
7. annotation/comment/report の付与  
8. viewer 独自形式の出力  
9. ui_state を外部ファイル化  
10. viewer 派生値（bounding box / collision / metrics 等）の情報パネル表示  
11. 推測・補間・最適化を構造表示へ混入

viewer は軽量・非編集・非永続の状態管理に徹する。

---

# 6 入出力仕様（viewer：読み込み専用 I/O）

viewer は **「I/O による構造変化が一切起こらない」** ことを  
設計原則とする読み込み専用アプリである。

本章では、viewer が扱う I/O の範囲と制限を規定する。


## 6.1 入力対象（Input）

viewer が入力として扱うのは **3DSS 構造データ 1 種類のみ**。

- `.3dss.json`
- modeler によって生成された正規構造データ
- `/schemas/3DSS.schema.json` に完全準拠
- 読込後は Core 内で deep-freeze（不変化）

### 入力対象外

以下は **読み込み禁止**：

- `.note.json`（注釈／メモ）
- viewer 独自形式
- UI 状態ファイル
- glTF, CSV, TXT, XML など他形式
- future version（未定義プロパティを含む）
- schema_uri が不一致のデータ（major 非一致）

viewer は **変換器ではなく、構造データの正規性確認装置**。


## 6.2 入力処理フロー（strict full validation）

(0) Core：前処理
- JSON 最大 10MB （viewer 実装における安全上限。スキーマ仕様としての制約ではない）
- UTF-8 テキストであること
- JavaScript / HTML タグ混入を拒否
- JSONC（コメント付き）は拒否（純 JSON のみ許可）

(1) UI：ファイル指定
↓
(2) Core：JSON 読込
↓
(3) Validation：
Version Check（SemVer major 一致）
schema_uri と document_meta.version の照合
strict full validation
↓ OK
(4) Core：state へ反映（read-only）
↓
(5) Renderer：描画開始


strict に通らないデータは **部分読込／auto-fix 禁止**。


## 6.3 strict full validation の検証項目

読み込み時に実施される検証項目は以下すべて必須：

- **type**：型一致
- **required**：必須項目
- **enum 完全一致**
- **additionalProperties:false**
- **ref → uuid の整合性**
- **frames の形式と値域**
- **appearance.* の構造整合**
- **appearance.effect の enum 一致**  
  （none / flow / glow / pulse）
- **document_meta の整合**
- **uuid 重複チェック**
- **uuid が RFC4122 v4 形式か**
- **$defs の整合性**（未知キー禁止・schema と完全一致）
- **schema $id と document_meta.version の major 一致**

### NG の場合：

→ **読込中止**（データ修正は行わない。理由のみ UI に返す）。


## 6.4 読込結果の内部処理（state / ui_state）

読み込みが完了し strict full validation をパスした 3DSS は、viewer runtime 内部で次の 2 系列の状態として保持される。

- **構造 state（struct）** … 3DSS ドキュメントそのもの（読み取り専用）
- **UI state（ui_state）** … frame / selection / camera / filter / micro など、閲覧操作に伴って変化する状態

viewer はこの 2 種の state のみを扱い、構造データを変形・補完する追加の内部形式は持たない。

### 6.4.1 構造 state（struct）

- strict validation を通過した `.3dss.json` は、そのまま「構造 state（struct）」として保持する。
- struct は次のような top-level 構造を持つ（3DSS v1.0.1 に対応）：

 - `document_meta`
  - `points[]`
 - `lines[]`
  - `aux[]`
  - （将来のバージョンで追加されうる他の top-level フィールド）

- viewer runtime は struct を **immutable（変更不可）** として扱う。
  - 要素の追加・削除・書き換え、座標の再配置、正規化などは一切行わない。
- 要素への高速アクセスのため、`meta.uuid` をキーとした内部インデックス（例：`indexByUUID`）を構築するが、これはあくまで内部最適化であり、外部 API には公開しない。

### 6.4.2 UI state（ui_state）

- UI state は、構造 state をどう見せるかに関する「現在の閲覧状態」を表す。
- `ui_state` は viewer runtime によって生成され、`core.ui_state` 経由で **読み取り専用** として公開される。
  - 外部（UI / Host）は、`core.*` API を通じてのみ ui_state を変更できる。

ui_state の v1 最小構成は以下とする。

- `camera_state`
  - `CameraEngine` が管理するカメラ状態一式。
  - 位置・姿勢・FOV・orbit 等、three.js カメラに必要な情報。

- `activeFrame: number`
  - 現在の frame 番号。

- `frameRange: { min: number, max: number }`
  - ドキュメント全体で参照されている frame の最小値・最大値。

- `runtime`
  - `isFramePlaying: boolean`  
    タイムライン再生中かどうか。
  - `isCameraAuto: boolean`  
    自動カメラ演出中かどうか（v1 では常に false / 予約フィールド）。

- `selection`
  - `uuid: string | null`
  - `kind: "point" | "line" | "aux" | null`
  - 現在選択中の要素（なければ null）。

- `mode`
  - `"macro" | "meso" | "micro"`
  - 現在の閲覧モード。macro=俯瞰、micro=1 要素フォーカス、meso=将来拡張用。

- `microFocus`
  - `uuid: string | null`
  - `kind: "point" | "line" | "aux" | null`
  - micro / meso モード時のフォーカス対象。macro 中は null を基本とする。

- `filters`
  - `types: { points: boolean, lines: boolean, aux: boolean }`
  - type フィルタ（points / lines / aux）。未設定時はすべて true とみなす。

- `visibleSet`
  - `points: string[]`
  - `lines: string[]`
  - `aux: string[]`
  - 現在の frame / filter 適用後に「描画対象」となっている要素の uuid 集合。

  viewer_settings: {      // 表示オプション（構造とは独立）

      info_display: "hover" | "select" | "off",

      render: {
          line_width_mode: "auto" | "fixed" | "adaptive",
          min_line_width: number,      // px
          fixed_line_width: number     // px
      },

      camera: {
          fov: number,
          near: number,
          far: number
      },

      fx: {
          // microFX の設定（第 7.11 節）
          micro: {
              enabled: boolean,               // false のとき micro モードでも FX を一切かけない
              profile: "weak" | "normal" | "strong",

              // シーン半径に対する距離カーブ設定
              radius: {
                  inner_ratio: number,        // 0〜1, 代表値: 0.10（フォーカス近傍）
                  outer_ratio: number         // 0〜1, 代表値: 0.40（効果がほぼ切れる距離）
              },

              // フェード／強調の係数
              fade: {
                  min_opacity: number,        // 0〜1, 遠方の下限透過度（0.02〜0.20 程度で調整）
                  hop_boost: number,          // 1hop 要素の強調係数（0.5〜0.8 程度）
                  far_factor: number          // その他要素の上限係数（0.1〜0.3 程度）
              }
          },

          // 将来用フラグ（v1 ではダミー or UI からは触れない）
          meso: boolean,
          modeTransitions: boolean,
          depthOfField: boolean,
          glow: boolean,
          flow: boolean
      }
  }

- `focus`
  - `{ active: boolean, uuid: string | null }`
  - 旧実装との互換用フィールド。`microFocus` と同期される。
  - 新規機能は `microFocus` を優先して利用する。

ui_state のフィールドは仕様上拡張可能だが、構造 state（struct）を変更する情報を含めてはならない。  
viewer runtime は常に「構造 state（struct） → UI state（ui_state） → 描画」という一方向パイプラインで動作する。

## 6.5 出力（Output）

viewer は **一切の出力を行わない**。

- クリップボードへ構造データコピーしない
- viewer から JSON を取得する API を持たない

### 禁止される出力

- .3dss.json の保存
- UI 状態ファイルの生成
- カメラ情報の保存
- スクリーンショット生成（viewer 機能としての提供は禁止。OS の標準キャプチャ機能は仕様外）
- glTF / CSV など他形式への変換
- viewer 独自 JSON の生成

※ OS の画面キャプチャは仕様外（制限不可）。


## 6.6 データ変換（format conversion）

viewer が行ってよいのは **three.js 用座標系への mapping のみ**（構造不変）。

### 禁止される変換

- .3dss.json → .json / .jsonc
- .3dss.json → .csv
- .3dss.json → .glb / .gltf
- .3dss.json → .txt
- .3dss.json → viewer 独自形式
- 構造データの圧縮・再構築・平坦化

viewer は **データ変換エンジンではない**。

- SVG / PNG / DXF / PDF 等への投影生成禁止
- ミニマップ等の 2D サマリー生成も禁止  
  （構造補正につながるため）


## 6.7 I/O に関する禁止事項

viewer が行ってはならない I/O：

1. 構造データへの書き込み  
2. 自動修復・自動補完（AI補完含む）  
3. 不整合データの部分読込  
4. スキーマ外項目の保持  
5. 保存機能（Exporter）  
6. UI 状態の永続化  
7. viewer 独自フォーマットの出力  
8. バージョン不一致データの読込  
9. AI 推測で欠落値を埋める  
10. 座標補完・意味推定・グラフ補修  
11. schema $id / version を無視する「寛容モード」
12. _viewer_xxx などの内部プロパティを構造へ注入する

viewer は **strict / read-only / non-generative** の原則に従う。

## 6.8 Runtime 状態と API（core.*, micro 優先順位）

viewer runtime は、読み込んだ struct と ui_state を対象に、core.* API を通じてのみ外部から操作される。

### 6.8.1 hub / core オブジェクト

- viewer の Host（Astro ページ / 開発用 HTML 等）は、bootstrapViewer(...) の戻り値として hub オブジェクトを受け取る。
- hub.core が viewer runtime への唯一の外向き API であり、少なくとも以下を公開する。
- hub.core.data
 struct（3DSS ドキュメント）。read-only（deep-freeze 済み）。
- hub.core.ui_state
 ui_state。read-only（値の更新は core.* 経由）。

本仕様では簡略のため、以降は
- core = hub.core
として core.* を記述する。

### 6.8.2 core.* の最小セット

v1 viewer が公開する runtime API の最小セットは次のとおりとする。

- フレーム系
 - core.frame.setActive(frame: number)
 ui_state.activeFrame を更新し、recomputeVisibleSet() を伴う。
 - core.frame.getActive(): number
 - core.frame.getRange(): { min: number, max: number }
 - core.frame.next(), core.frame.prev()

- カメラ系
 - core.camera.rotate(dTheta: number, dPhi: number)
 - core.camera.pan(dx: number, dy: number)
 - core.camera.zoom(delta: number)
 - core.camera.reset()
 - core.camera.setState(partialState: object)
 - core.camera.getState(): CameraState
 - core.camera.snapToAxis(axis: 'x' | 'y' | 'z')
 - core.camera.setFOV(value: number)

- 選択系
 - core.selection.select(uuid: string)
 - core.selection.clear()
 - core.selection.get(): { uuid: string | null, kind: 'point' | 'line' | 'aux' | null }

- モード / micro 系
 - core.mode.setMode(mode: "macro" | "meso" | "micro", uuid?)
 - core.mode.getMode(): "macro" | "meso" | "micro"
 - core.mode.canEnter(uuid: string): boolean
 - core.micro.enter(uuid: string)
mode="micro" へのショートカット。内部で core.mode.canEnter(uuid) を必ず経由する。
 - core.micro.exit()
 - core.micro.isActive(): boolean

- フィルタ系
 - core.filters.setTypeEnabled(kind: "points" | "lines" | "aux", enabled: boolean)
 - core.filters.get(): { points: boolean, lines: boolean, aux: boolean }

- runtime 系
 - core.runtime.startFramePlayback()
 - core.runtime.stopFramePlayback()
 - core.runtime.isFramePlaying(): boolean
 - core.runtime.isCameraAuto(): boolean

これらのメソッドはすべて 構造 state（struct）を変更しない。
変更されるのは ui_state と three.js 側の描画状態だけである。

### 6.8.3 micro / meso の優先順位ルール

micro / meso 関連の状態と frame / camera 再生との優先順位は、次のルールに従う。
1. core.runtime.startFramePlayback() 呼び出し時
 - ui_state.runtime.isFramePlaying = true にする。
 - ui_state.mode = "macro" に強制する。
 - ui_state.microFocus と ui_state.focus をクリアする。
 - Renderer には applyMicroFX(null) 相当を指示し、micro 視覚効果をすべて OFF にする。

2. 再生中の挙動
 - ui_state.runtime.isFramePlaying === true の間は、micro / meso モードには入らない。
  - core.mode.setMode("micro" | "meso", ...) や core.micro.enter(...) が呼ばれても無視されるか、直ちに mode="macro" に戻すものとする。
 - selection 自体（ui_state.selection）は更新してよいが、micro 視覚効果は適用しない。

3. core.runtime.stopFramePlayback() 呼び出し時
 - ui_state.runtime.isFramePlaying = false にする。
 - mode は「停止時点の値（通常は macro）」のままとし、自動で micro に復帰させない。

4. core.mode.canEnter(targetUuid) の条件
 - 引数が truthy な文字列であること。
 - ui_state.runtime.isFramePlaying === false。
 - ui_state.runtime.isCameraAuto === false。
 - targetUuid が現在の ui_state.visibleSet.points / lines / aux のいずれかに含まれていること。

上記をすべて満たすときのみ true を返す。

5. micro への遷移
 - selection や F キーなどから micro に入る場合は、必ず core.mode.canEnter(uuid) を経由する。
 - false の場合は何も行わない（ui_state.mode / ui_state.microFocus を変更しない）。
 - true の場合のみ ui_state.mode = "micro" とし、ui_state.microFocus に { uuid, kind } を設定する。

6. visibleSet との整合性
 - recomputeVisibleSet() の結果、ui_state.microFocus.uuid が visibleSet.* から外れた場合、
  - ui_state.microFocus をクリアし、
  - ui_state.mode = "macro" に戻し、
  - Renderer に applyMicroFX(null) を指示する。
 - これにより、常に「現在の micro フォーカス対象は可視である」ことが保証される。

7. Renderer への microFX 指示
 - runtime から Renderer への micro 効果の指示は、次の payload で行う（または null）：

```
type MicroFXPayload = {
  mode: "micro" | "meso" | "macro",   // 現仕様では "micro" のみ有効
  uuid: string,                       // フォーカス対象 UUID
  origin: [number, number, number],   // フォーカス原点（world 座標）
  activeFrame: number | null,         // 参考値（任意）
  settings?: {
    fx?: {
      micro?: {
        enabled?: boolean,
        profile?: "weak" | "normal" | "strong",
        radius?: { inner_ratio?: number, outer_ratio?: number },
        fade?: { min_opacity?: number, hop_boost?: number, far_factor?: number }
      }
    }
  }
}
```

 - null を渡した場合は、すべての micro / meso 効果を解除する。

---

# 7 拡張・互換性（viewer：schema の変化への追従）

viewer は 3DSS 構造データを **読み取り → 可視化** するだけの read-only アプリであり、
modeler と異なり、構造データへの拡張・補完・変換を一切行わない。
viewer は “スキーマに従うことだけ” を役割とし、  
推測・自動修復・意味解釈を行わない。

本章では、スキーマ拡張の扱い・互換性・許可される／禁止される拡張方針を定義する。


## 7.1 viewer の拡張方針（基本原則）

viewer の守るべき 4 原則：

1. **構造データを勝手に変更しない（read-only）**  
2. **スキーマに忠実に表示する（忠実性）**  
3. **スキーマ外項目を解釈・保存・補完しない（strict）**  
4. **意味論的推測（semantic inference）を一切行わない**

viewer は “visualizer” であって “semantic engine” ではない（意味論の解釈禁止）。


## 7.2 スキーマの将来拡張への対応

3DSS.schema.json は SemVer に基づき更新される。  
viewer は **読取側としてのみ** これに追従する。


### 7.2.1 新規プロパティ・項目の追加

（viewer が新しい `/schemas/3DSS.schema.json` に追従済みであることを前提とする）

- 読み込み時に **そのまま internal state へ保持（deep-freeze）**
- UI 表示は「可能な範囲のみ」
- 理解できない項目を削除・補完してはならない
- 再配置・ソート・整形なども禁止

viewer は **“理解はせず、破壊もしない”** のが原則。


### 7.2.2 enum の追加

- 読み込み可能  
- UI 特別処理は不要  
- 描画不能な値は fallback（最低限の形状・色）で対応  
- 値を修正・丸めることは禁止

※ viewer は値を書き換えないため modeler ほど影響しない。


### 7.2.3 major バージョンの非互換変更

- **major 不一致 = 読込不可**
- マイグレーション処理は禁止（modeler の担当）
- スキーマ外データを許容する “寛容モード” は持たない

viewer は strict validator として動作する。


## 7.3 aux.extension の扱い

extension の詳細解釈は行わず、描画可能な最小単位のみ描画する。  
（aux.module の一般的処理は第4章を参照）

### 7.3.1 extension の存在は許容する

- internal state にそのまま保持（deep-freeze）
- 表示可能な部分だけ描画（viewer が理解できる最小単位）
- 自動補完・推測生成は禁止
- 意味論の解釈は禁止

### 7.3.2 extension 専用 UI の追加は任意

- 必須なのは “描ける範囲だけ描く”  
- 編集 UI の追加は禁止（viewer は非編集アプリ）


## 7.4 前方互換性（未来バージョン）

未来バージョンの .3dss.json：

- 未定義プロパティ → additionalProperties:false → NG  
- 読込不可  
- “柔軟な読み込み” は行わない  
- 未来 $defs を含んでいても NG

viewer は strict のみで動作する。


## 7.5 後方互換性（過去バージョン）

古い 3DSS ファイル：

- 必須項目不足 → required で NG  
- 型不一致 → NG  
- 古い構造 → NG  
- viewer は旧バージョンの補正・変換を行わない

修正は modeler または人間の作業範囲であり、viewer の役割外。


## 7.6 viewer 側の許容される拡張

viewer が拡張できるのは **UI レイヤの表示補助だけ**。

### 許容される拡張例

- テーマ（ライト／ダーク）
- HUD（凡例・軸・グリッド強調）
- 選択強調エフェクト
- 表示最適化（instancing / caching / LOD）は、構造不変の範囲でのみ許可
- カメラ操作改善
- レイヤフィルタ / visibility UI の拡張
- 視点プリセット（UI のみ）

いずれも構造データには影響しない（UI レイヤ限定）。


## 7.7 禁止される拡張

viewer は次の機能を **追加してはならない**：

1. 構造データの項目追加  
2. 構造データの修復・補完・マイグレーション  
3. 未来スキーマ項目の推測生成  
4. annotation / comment / report / note など編集概念  
5. viewer 独自形式の保存  
6. modeler に相当する編集 UI（Add/Update/Remove/Undo/Redo）  
7. viewer_settings を JSON として保存（永続化）すること
8. AI 推測による補完・変換・修復  
9. 不足値の推測埋め  
10. 表示補助を構造表示へ混入させる  
11. extension を viewer が「意味解釈」して生成・補完すること
12. extension の不完全データを viewer が「推測で補完」すること
13. extension の構造を書き換えること（viewer は strict read-only）

## 7.8 仕様変更時の viewer 側の対応

viewer が行うのは以下に限定される：

1. Validator の差し替え（新しい 3DSS.schema.json をそのまま採用）
2. 描画ロジックの最小限の更新（appearance/aux が増えた場合など）
3. UI の調整（新モジュールの表示切替のみ）
4. 構造データへの書き戻しは一切行わない


## 7.9 拡張・互換性に関する禁止事項（統合）

viewer は以下を行ってはならない：

1. 採用中の `/schemas/3DSS.schema.json` に定義されていない項目（スキーマ外項目）の読込・保持・解釈
2. 未来バージョン（major 不一致）の寛容読込
3. 構造データの修復・自動補完
4. 架空のプロパティ生成（AI補完含む）
5. スキーマ項目の推測（semantic inference）
6. 編集 UI の追加（add/update/remove/undo/redo）
7. viewer_settings を JSON 化して保存（永続化）すること
8. extension の意味解釈・生成・補完（構造変更に相当）

## 7.10 Frame UI 操作ポリシー（フレーム操作規範）
### 7.10.1 基本方針

Frame は 一次元の整数 ID によって管理する（activeFrameId: number）。

Viewer コアは frame を 離散ステップとして扱い、連続値を扱わない。

Frame の切り替えは 入力操作 → activeFrameId 更新 という最小責務だけを担い、
2D ナビゲーションや複合 UI は上位レイヤに委任する。

### 7.10.2 操作体系（一次元パラパラ漫画モデル）

Frame 操作は 「ページ送り」操作として設計する。

主となる操作軸は ±1 のステップ移動。

UI は「前後フレームへのラチェット的移動」を視覚効果のみで表現する。

### 7.10.3 キーバインド（標準設定）
操作	動作
PageUp	activeFrameId += 1
PageDown	activeFrameId -= 1
Shift + PageUp	最大フレームへジャンプ
Shift + PageDown	最小フレームへジャンプ
Mouse Wheel Up	activeFrameId += 1
Mouse Wheel Down	activeFrameId -= 1
Home	frame = 0（デフォルトの起点）

### 7.10.4 Frame 0 の意味づけ

Frame ID のデフォルトは 0 とする（従来の 1 を廃止）。

Frame 0 は「基準状態（base layer）」の意味を持ち、

すべての points / lines / aux が最も共通して存在する「軸」として扱う。

### 7.10.5 ラチェット感（視覚表現のみ）

効果音などの聴覚フィードバックは採用しない（将来も導入しない）。

ラチェット的フィードバックは 視覚効果で統一する。

現在 frame の表示（HUD）が切り替え時に瞬間ハイライト。

将来的にはタイムライン UI に「目盛りスナップ」を導入。

必要に応じて前後フレームの **ゴースト表示（薄い小型プレビュー）**で連続性を補助できるが
これは optional（負荷を考慮して後段で設計）。

### 7.10.6 音声ポリシー

viewer / modeler ともに UI 効果音は採用しない。

コンテンツ側（動画 / 3D アニメーション）が独自に鳴らす音は例外だが、
viewer UI の操作は 完全サイレントとする。

設定画面にも「Sound」「SFX」などの項目は追加しない。

## 7.11 microFX ― ミクロ視覚補助アルゴリズム（viewer 専用）
### 7.11.1 目的と前提

microFX は「構造データを一切変更せず、描画レイヤのみで局所構造を強調する」ための視覚補助アルゴリズムである。

対象は points / lines / aux で、すべて 既に可視状態（visibleSet に含まれている要素のみ） を処理する。

効果はすべて three.js マテリアルの color / opacity / transparent など描画属性に限定される。
3DSS の内容・座標・接続関係を変更してはならない。

### 7.11.2 適用条件（モード・ランタイム状態）

microFX が有効になる条件は次とする。
- ui_state.mode === "micro"
- ui_state.viewerSettings.fx.micro.enabled === true
以下の条件のいずれかを満たす場合は 常に無効 とし、直ちに「素の描画状態」に戻す。
- ui_state.runtime.isFramePlaying === true
- ui_state.runtime.isCameraAuto === true
- rendererContext.applyMicroFX(null) が明示的に呼ばれた場合

無効化時は、現在 visible な全要素に対し「baseStyle（初期の色・不透明度）」を復元する。

### 7.11.3 フォーカス対象と原点

アクティブなフォーカス UUID は次の優先順位で決定する。
1. ui_state.microFocus.uuid が存在する場合、それを優先
2. 次に ui_state.focus.active === true かつ ui_state.focus.uuid があればそれを使用
3. いずれも存在しない場合、microFX は適用されない（payload は null 相当）

フォーカス原点 origin: [x,y,z] は computeFocusOrigin(uuid) により算出する。
- point: point.appearance.position を使用
- line: end_a / end_b の両端座標を取得し、その中点を原点とする
- aux: aux.appearance.position を使用
origin が無効な場合（座標なし等）は、microFX は適用されない。

### 7.11.4 入力・出力インターフェース

rendererContext 側の公開インターフェース：

```
// viewerHub / microVisualController から呼び出される
rendererContext.applyMicroFX(payload: MicroFXPayload | null)

type MicroFXPayload = {
  mode: "micro" | "meso" | "macro",   // 現仕様では "micro" のみ有効
  uuid: string,                       // フォーカス対象 UUID
  origin: [number, number, number],   // フォーカス原点（world 座標）
  activeFrame: number | null,         // 参考値（任意）
  settings?: {
    fx?: {
      micro?: {
        enabled?: boolean,
        profile?: "weak" | "normal" | "strong",
        radius?: { inner_ratio?: number, outer_ratio?: number },
        fade?: { min_opacity?: number, hop_boost?: number, far_factor?: number }
      }
    }
  }
}
```

- payload === null の場合：
現在 visible な要素に対し、全て baseStyle を復元する（microFX 完全 OFF）。

- payload.mode !== "micro" の場合：
microFX は適用せず、baseStyle へリセットする。

### 7.11.5 可視要素集合（visibleSet）との関係

VisibilityController は frame / filter の結果を ui_state.visibleSet に保持し、
rendererContext.applyFrame(visibleSet) 経由で three.js オブジェクトの visible を更新する。

microFX は 常に visibleSet の内容を前提に動作 し、
visibleSet に含まれない要素は一切処理しない（非表示要素に効果をかけない）。

frame 切り替え・filter 切り替えのたびに
 - visibleSet 再計算
 - rendererContext.applyMicroFX(...) 再呼び出し
を行い、効果を追従させる。

### 7.11.6 視覚効果アルゴリズム

(1) 事前リセット

microFX を適用する前に、現在の visibleSet に含まれる要素すべてを baseStyle に戻す。
これにより、効果の重ね掛け・誤差の蓄積を防ぐ。

(2) 距離減衰（distance fade）

シーンの代表半径 sceneRadius から 内側半径 R1 / 外側半径 R2 を定義する。

```
const R  = sceneRadius;
const cfg = ui_state.viewerSettings.fx.micro;

const innerRatio = cfg.radius.inner_ratio ?? 0.10;
const outerRatio = cfg.radius.outer_ratio ?? 0.40;
const minOpacity = cfg.fade.min_opacity   ?? 0.05;

const R1 = R * innerRatio; // フォーカス近傍
const R2 = R * outerRatio; // 効果がほぼ消える距離
```

任意の要素に対し、「要素の代表位置」とフォーカス原点 origin との距離 d を計算する。
 - point / aux: ワールド座標上の位置
 - line: ワールド座標上の中点（computeLineMidpointWorld）

距離に応じてフェード係数 fade(d) を定義する：

```
function distanceFadeFactor(
  d: number,
  R1: number,
  R2: number,
  minOpacity = 0.05
): number {
  const min = clamp(minOpacity, 0, 1);
  if (d <= R1) return 1.0;
  if (d >= R2) return min;
  const t = (d - R1) / (R2 - R1 || 1e-6);
  return 1.0 - (1.0 - min) * t;  // 線形補間
}
```

(3) 接続強調（connection emphasis）

point / line について、フォーカス対象から 1hop の接続集合を求める。
- フォーカスが point の場合：
 - その point を端点に持つ全ての line を 1hop line とする
 - それら line のもう一方の端点 point を 1hop point とする
- フォーカスが line の場合：
 - その line の端点 point を 1hop point とする
 - 各 1hop point に接続する別の line を 1hop line とする

aux 要素については接続関係を考慮しない（距離減衰のみ）。

(4) マテリアル更新規則

各要素ごとに baseStyle（color0, opacity0）をもとに、以下の優先順で置き換える。
パラメータは cfg.fade から取得する。

```
const hopBoost  = cfg.fade.hop_boost  ?? 0.6; // 1hop 強調
const farFactor = cfg.fade.far_factor ?? 0.2; // その他の上限
```

- フォーカス要素（id === uuid）
 - opacity = 1.0（または opacity0 以上で 1.0 を上限）
 - color = color0 を基準に、明度を一定量だけ上げる（例：offsetHSL(0, 0, +0.25)）

- 1hop 要素（conn.point1hop / conn.line1hop に含まれる）
 - opacity = max(opacity0 * hopBoost, opacity0 * fade(d))
 - color = color0 の明度をわずかに上げる（例：+0.10〜0.15）

- その他の visible 要素
 - opacity = min(opacity0 * farFactor, opacity0 * fade(d))
 - color は原則変更しない（必要に応じて僅かに暗くしてよい）

いずれの場合も、mat.transparent は opacity < 1.0 のとき true とする。
更新後は material.needsUpdate = true を立て、GPU への反映漏れを防ぐ。

### 7.11.7 モード・他機能との相互作用

- macro モード
 - microFX は常に無効（rendererContext.applyMicroFX(null) を適用した状態を保つ）。
 - 局所強調は selection ハイライトに委ねる（7.12 節）。
- meso モード
 - 現仕様では microFX 無効。将来の拡張として meso 専用 payload を許容する余地のみ残す。
- frame 再生
 - core.runtime.startFramePlayback() 呼び出し時に ui_state.mode = "macro" とし、既存フォーカス／microFocus をクリアする。
 - 再生中に microFX が再度有効化されないことを保証する。
- filter 切替
 - filter 変更後は必ず visibleSet を再計算し、その後 rendererContext.applyMicroFX(...) を再評価する。

## 7.12 Selection ハイライト（macro モード用）
### 7.12.1 目的

macro モード時に「現在選択中の 1 要素」を明示するための軽量な強調表現である。

microFX と役割を分担し、

macro: selection ハイライト中心（全体俯瞰＋どれを選んだか）

micro: microFX 中心（局所構造の読解）
となるよう設計する。

### 7.12.2 適用条件

ui_state.mode === "macro" のときのみ選択ハイライトを描画する。

ui_state.selection.uuid が存在しない場合、ハイライトは描画しない。

micro / meso モードでは、選択状態（ui_state.selection 自体）は保持するが、
描画上のハイライトは一切行わない。

### 7.12.3 インターフェース

runtime 側コントローラ：

// /runtime/core/selectionController.js
selectionController.select(uuid: string | null)
selectionController.clear()
selectionController.get(): { uuid, kind, label } | null


rendererContext インターフェース：

rendererContext.clearAllHighlights(): void
rendererContext.setHighlight({ uuid: string, level?: 1 | 2 }): void


selectionController の挙動（概要）：

select(uuid):

indexByUUID から kind と label を引き、ui_state.selection を更新。

ui_state.mode === "macro" かつ rendererContext.setHighlight が存在する場合のみ、

まず clearAllHighlights() で全要素を baseStyle に戻す。

その後 setHighlight({ uuid, level: 1 }) を呼び出し、選択要素のみ強調する。

clear():

ui_state.selection を { uuid:null, kind:null, label:null } にリセット。

ui_state.mode === "macro" の場合、clearAllHighlights() を呼び出す。

### 7.12.4 視覚効果の内容

rendererContext 内でのデフォルト実装（参考）：

clearAllHighlights()

現在の visibleSet に含まれる要素すべてに対し、baseStyle（色・不透明度）を復元する
（microFX のリセット処理を流用してもよい）。

setHighlight({ uuid, level })

対象のオブジェクトを特定し、その baseStyle を元に次を行う：

color: 明度を少しだけ上げる（例：offsetHSL(0, 0, +0.18〜0.22)）。

opacity: min(1.0, opacity0 * 1.2) 程度まで上げる。

transparent: opacity < 1.0 のとき true。

line / point / aux いずれにも同じルールで適用する（オブジェクト種類には依存しない）。

※ 必要に応じて level に応じた強弱（例：level=2 でやや強め）をつけてもよいが、
selection ハイライトは「常時 ON の軽い強調」を想定し、過度な演出は避ける。
いずれの更新後も、three.js マテリアルに対して `mat.needsUpdate = true` を立て、  
GPU 側へ即座に反映されるようにする（実装細部だが、再描画漏れ防止のため明示しておく）。


### 7.12.5 microFX との相互作用

macro → micro への遷移：

modeController.setMode("micro", uuid) によりモード遷移する際、

selection ハイライトは描画上は無効化される（ただし ui_state.selection 自体は保持）。

microFX が有効であれば、同一 uuid をフォーカスとして microFX が適用される。

micro → macro への遷移：

modeController.setMode("macro") で戻った時点で、

microFX は applyMicroFX(null) により解除。

selectionController 側で refreshHighlight()（または select(currentSelection.uuid) を再適用）し、
macro モード用の選択ハイライトを再描画する。
