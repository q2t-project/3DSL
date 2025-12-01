目的：
3DSL Viewer の runtime API を、仕様書（3DSD-viewer.md）および runtime_spec（YAML）に完全に揃える。
特に viewer/runtime/viewerHub.js が公開する hub.core.* を 唯一の公開ランタイム API として正規化し、
core/controller/UI 各層の依存方向を仕様どおりに整理する。

0. 参照すべき仕様

レポジトリ内で次のファイルを開いて内容を把握すること。

specs/3DSD-viewer.md

特に §6.8「Runtime 状態と API（core.*, micro 優先順位）」

§7.11「microFX ― ミクロ視覚補助アルゴリズム（viewer 専用）」

runtime_spec（YAML）

ファイル名は runtime_spec.yaml もしくはそれに類するもの

中に version: "2.0" と 3DSL Viewer Runtime Manifest – holy API spec for 3DSL Viewer が書かれている YAML

これら 2 つの仕様を「ソース・オブ・トゥルース」として扱うこと。
実装側がズレていれば、仕様に合わせてコードを修正する。

1. 変更してよい／ダメなファイル
1.1 変更してよいファイル

以下に限定すること：

viewer/runtime/bootstrapViewer.js

viewer/runtime/viewerHub.js

viewer/runtime/core/CameraEngine.js

viewer/runtime/core/frameController.js

viewer/runtime/core/selectionController.js

viewer/runtime/core/modeController.js

viewer/runtime/core/microController.js（必要な範囲）

viewer/runtime/core/visibilityController.js

viewer/runtime/core/uiState.js（必要な範囲）

viewer/runtime/core/structIndex.js（必要な範囲）

viewer/runtime/renderer/context.js（インターフェースが必要な範囲のみ）

viewer/runtime/ui/*.js

例：gizmo.js, keyboardInput.js, pointerInput.js, picker.js, timeline.js 等

1.2 絶対に変更してはいけないもの

viewer_min_* 系ファイル（viewer_min.html, viewer_min_boot.js, viewer_min_core.js, viewer_min_scene.js など）

modeler 関連ディレクトリ

specs/ 以下の仕様書

package.json / ビルド設定 / ESLint 設定 などのメタ系

2. ゴールイメージ（全体像）

最終的に、以下が満たされていることを目標とする。

bootstrapViewer / bootstrapViewerFromUrl

起動時に core/controllers/uiState/rendererContext を組み立て、

createViewerHub({ core, renderer }) を呼び、

hub オブジェクトを返す（{ core, start, stop, pickObjectAt } を持つ）

viewerHub が公開するランタイム API

hub.core 以下に、仕様どおりの API が揃っていること
（3DSD-viewer.md §6.8.2 と runtime_spec の core_api に一致）

core.* の形は以下のようなツリー構造になっていること：

hub = {
  core: {
    data,       // struct（3DSS, read-only）
    ui_state,   // uiState, read-only

    frame:    { setActive, getActive, getRange, next, prev,
                startPlayback, stopPlayback },
    camera:   { rotate, pan, zoom, reset, snapToAxis,
                setState, getState, setFOV },
    selection:{ select, clear, get },
    mode:     { setMode, getMode, canEnter, exit, focus },
    micro:    { enter, exit, isActive },
    filters:  { setTypeEnabled, get },
    runtime:  { startFramePlayback, stopFramePlayback,
                isFramePlaying, isCameraAuto },

    // 必要なら補助: recomputeVisibleSet, setFrame, stepFrame, canEnterMicro
  },

  start,         // rAF ループ開始
  stop,          // rAF ループ停止
  pickObjectAt,  // NDC 座標 → {uuid,...} | null
};


UI 層

viewer/runtime/ui/*.js は、
必ず hub.core.* / hub.pickObjectAt のみを呼び出す。

core/controller/renderer を UI が直接 import したり参照したりしてはいけない。

core/controller 層

frameController, selectionController, modeController, visibilityController, CameraEngine は、
runtime_spec に書かれたメソッドをその名前どおり公開する。

viewerHub からそれらのメソッドに 1:1 で橋渡しされる。

3. 具体的な修正タスク
3.1 viewerHub の core の形を仕様に合わせる

対象：viewer/runtime/viewerHub.js

createViewerHub({ core, renderer }) の戻り値を、必ず以下の形にする：

export function createViewerHub({ core, renderer }) {
  // ... 略 ...

  const hub = {
    core: {
      data: core.data,
      ui_state: core.ui_state,

      frame: {
        setActive: core.frameController.set,     // 例
        getActive: core.frameController.get,
        getRange: core.frameController.range,
        next: core.frameController.next,
        prev: core.frameController.prev,
        startPlayback: core.frameController.startPlayback,
        stopPlayback: core.frameController.stopPlayback,
      },

      camera: {
        rotate: core.cameraEngine.rotate,
        pan: core.cameraEngine.pan,
        zoom: core.cameraEngine.zoom,
        reset: core.cameraEngine.reset,
        snapToAxis: core.cameraEngine.snapToAxis,
        setState: core.cameraEngine.setState,
        getState: core.cameraEngine.getState,
        setFOV: core.cameraEngine.setFOV,
      },

      selection: {
        select: core.selectionController.select,
        clear: core.selectionController.clear,
        get: core.selectionController.get,
      },

      mode: {
        setMode: core.modeController.set,
        getMode: core.modeController.get,
        canEnter: core.modeController.canEnter,
        exit: core.modeController.exit,
        focus: core.modeController.focus,
      },

      micro: {
        enter: (uuid) => core.modeController.set('micro', uuid),
        exit: core.modeController.exit,
        isActive: () => core.ui_state.mode === 'micro',
      },

      filters: {
        setTypeEnabled: core.visibilityController.setTypeFilter,
        get: core.visibilityController.getFilters,
      },

      runtime: {
        startFramePlayback: core.frameController.startPlayback,
        stopFramePlayback: core.frameController.stopPlayback,
        isFramePlaying: () => core.ui_state.runtime.isFramePlaying,
        isCameraAuto: () => core.ui_state.runtime.isCameraAuto,
      },

      // 補助系 API（必要に応じて）
      recomputeVisibleSet: core.visibilityController.recompute,
      setFrame: core.frameController.set,
      stepFrame: core.frameController.step,
      canEnterMicro: core.modeController.canEnter,
    },

    start,        // rAF ループ開始関数
    stop,         // rAF ループ停止関数
    pickObjectAt, // rendererContext.pickObjectAt をラップしたもの
  };

  return hub;
}


※ 上記はイメージであり、実際の core オブジェクト構造に合わせて調整してよい。
重要なのは hub.core の公開メソッド名と構造を runtime_spec / 3DSD-viewer.md に合わせること である。

すでに存在する hub.core.* が仕様と違う名前／引数になっていたら、
仕様に合わせてリネーム／ラップ すること。

仕様に存在しない public メソッドは、hub.core から削除（非公開化）する。
内部で必要ならローカル関数や controller メソッドとして残してよいが、hub 経由では見えないようにする。

viewerHub の先頭付近に、runtime_spec と同期した API 一覧コメントを追加する：

// Runtime public API (synced with specs/3DSD-viewer.md §6.8.2 and runtime_spec v2.0)
// hub.core = {
//   data, ui_state,
//   frame: { setActive, getActive, getRange, next, prev, startPlayback, stopPlayback },
//   camera: { rotate, pan, zoom, reset, snapToAxis, setState, getState, setFOV },
//   selection: { select, clear, get },
//   mode: { setMode, getMode, canEnter, exit, focus },
//   micro: { enter, exit, isActive },
//   filters: { setTypeEnabled, get },
//   runtime: { startFramePlayback, stopFramePlayback, isFramePlaying, isCameraAuto },
//   // ...
// }

3.2 controller 群のメソッド名＆役割を揃える

対象：

viewer/runtime/core/frameController.js

viewer/runtime/core/selectionController.js

viewer/runtime/core/modeController.js

viewer/runtime/core/microController.js（必要な範囲）

viewer/runtime/core/visibilityController.js

viewer/runtime/core/CameraEngine.js

やること：

それぞれのモジュールで、公開されているオブジェクトのメソッド名を runtime_spec に揃える。

例：

frameController:

set(frameIndex:number)

get(): number

step(delta:number)

range(): {min:number,max:number}

next() / prev()（存在しなければ追加で構わない）

startPlayback(onStep?)

stopPlayback()

selectionController:

select(uuid:string)

clear()

get(): {kind:string|null, uuid:string|null}

modeController:

set(mode:'macro'|'meso'|'micro', uuid?)

get()

canEnter(uuid:string): boolean

exit()

focus(uuid:string)

visibilityController:

recompute(): visibleSet

isVisible(uuid:string): boolean

getFilters(): FiltersState

setTypeFilter(kind:'points'|'lines'|'aux', enabled:boolean)

CameraEngine:

rotate(dTheta:number, dPhi:number)

pan(dx:number, dy:number)

zoom(delta:number)

reset()

snapToAxis(axis:'x'|'y'|'z')

setState(partialState:object)

getState(): cameraState

setFOV(value:number)

既存コードで似たメソッドが別名になっている場合、
できるだけラップで吸収し、外向き API 名だけを仕様に合わせる ことを優先する。
（内部ロジックは極力壊さない）

uiState の所有権は core にある前提で、各 controller から uiState を更新する構造を維持する。

3.3 bootstrapViewer が「hub」を返すように統一

対象：viewer/runtime/bootstrapViewer.js

既存の実装を確認し、bootstrapViewer(canvasOrId, document3dss, options?) が次のような流れになっているか確認、足りなければ補う：

canvas の解決（ID 文字列の場合は DOM から取得）

AJV による strict full validation 済み 3DSS ドキュメントを受け取る前提（もしくは内部で validate）

createUiState() で uiState を初期化

buildUUIDIndex() / detectFrameRange() で index 構築

new CameraEngine(initialState)

各 controller の createXxxController(uiState, structIndex, ...) を呼ぶ

createRendererContext(canvas, struct, structIndex, uiState) を呼ぶ

これらを束ねて core オブジェクトを作る

const hub = createViewerHub({ core, renderer })

return hub;

bootstrapViewerFromUrl(canvasOrId, url, options?) も同様に、
URL → JSON → validate → bootstrapViewer 呼び出し → hub を返す、という 1 本の流れに揃える。

bootstrapViewer 自体は requestAnimationFrame ループを持たないこと。
描画ループは viewerHub.start() に一本化する。

3.4 UI 層の呼び出し口を hub.core.* に揃える

対象：viewer/runtime/ui/*.js

各 UI モジュールで、runtime や renderer を直接 import している箇所があれば削除し、
代わりに Host から渡される hub（または hub.core）だけを使うように書き換える。

代表例：

keyboardInput.js

フレーム操作 → hub.core.frame.*

カメラ操作 → hub.core.camera.*

モード操作 → hub.core.mode.*, hub.core.micro.*

pointerInput.js

マウスドラッグ → hub.core.camera.rotate/pan

ホイール → hub.core.camera.zoom

gizmo.js

HOME ボタン → hub.core.camera.reset()

軸クリック → hub.core.camera.snapToAxis('x'|'y'|'z')

picker.js

canvas 座標 → NDC → hub.pickObjectAt(x,y) → hub.core.selection.select(uuid)

timeline.js

スライダー・再生ボタン → hub.core.frame.setActive/step/startPlayback/stopPlayback

UI 層は core/controller/renderer のファイルを直接 import してはいけない。
あくまで Host から渡された hub を介して runtime と対話する構造に統一する。

4. 実装上の注意

三次元構造（struct, 3DSS）は 絶対に変更しない。
どの修正でも JSON に書き戻したり、構造を補完・修復するコードを追加してはならない。

ui_state および viewer_settings も 外部ファイルへの保存コードは追加禁止。
セッション内のメモリ状態だけで完結させる。

既存のログ（[viewer-dev] ... 等）は可能なら維持するが、不要な console.log / debugger が残っていれば削除してよい。

既存の機能（フレーム送り、選択、カメラ操作、microFX）が壊れないよう、
可能な限り ラップとリネーム中心 で対応し、ロジックの再実装は最小限に留めること。

5. 出力フォーマット

最終出力は レポジトリルート基準の git diff（unified diff）形式 で提示すること。
説明文や要約は不要。

例：

diff --git a/viewer/runtime/viewerHub.js b/viewer/runtime/viewerHub.js
index abcdef0..1234567 100644
--- a/viewer/runtime/viewerHub.js
+++ b/viewer/runtime/viewerHub.js
@@ -1,10 +1,20 @@
 // 既存コード...


この diff 一つに、今回の修正のすべてをまとめること。