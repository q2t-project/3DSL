目皁E��E
3DSL Viewer の runtime API を、仕様書�E�EDSD-viewer.md�E�およ�E runtime_spec�E�EAML�E�に完�Eに揁E��る、E
特に public/viewer/runtime/viewerHub.js が�E開すめEhub.core.* めE唯一の公開ランタイム API として正規化し、E
core/controller/UI 吁E��の依存方向を仕様どおりに整琁E��る、E

0. 参�Eすべき仕槁E

レポジトリ冁E��次のファイルを開ぁE��冁E��を把握すること、E

specs/3DSD-viewer.md

特に §6.8「Runtime 状態と API�E�Eore.*, micro 優先頁E��）、E

§7.11「microFX  Eミクロ視覚補助アルゴリズム�E�Eiewer 専用�E�、E

runtime_spec�E�EAML�E�E

ファイル名�E runtime_spec.viewer.yaml もしく�Eそれに類するもの

中に version: "2.1" と 3DSL Viewer Runtime Manifest  Eholy API spec for 3DSL Viewer が書かれてぁE�� YAML

これめE2 つの仕様を「ソース・オブ�Eトゥルース」として扱ぁE��と、E
実裁E�EがズレてぁE��ば、仕様に合わせてコードを修正する、E

1. 変更してよい�E�ダメなファイル
1.1 変更してよいファイル

以下に限定すること�E�E

public/viewer/runtime/bootstrapViewer.js

public/viewer/runtime/viewerHub.js

public/viewer/runtime/core/cameraEngine.js

public/viewer/runtime/core/frameController.js

public/viewer/runtime/core/selectionController.js

public/viewer/runtime/core/modeController.js

public/viewer/runtime/core/microController.js�E�忁E��な篁E���E�E

public/viewer/runtime/core/visibilityController.js

public/viewer/runtime/core/uiState.js�E�忁E��な篁E���E�E

public/viewer/runtime/core/structIndex.js�E�忁E��な篁E���E�E

public/viewer/runtime/renderer/context.js�E�インターフェースが忁E��な篁E��のみ�E�E

public/viewer/runtime/ui/*.js

例：gizmo.js, keyboardInput.js, pointerInput.js, picker.js, timeline.js 筁E

1.2 絶対に変更してはぁE��なぁE��の

viewer_min_* 系ファイル�E�Eiewer_min.html, viewer_min_boot.js, viewer_min_core.js, viewer_min_scene.js など�E�E

modeler 関連チE��レクトリ

specs/ 以下�E仕様書

package.json / ビルド設宁E/ ESLint 設宁Eなどのメタ系

2. ゴールイメージ�E��E体像�E�E

最終的に、以下が満たされてぁE��ことを目標とする、E

bootstrapViewer / bootstrapViewerFromUrl

起動時に core/controllers/uiState/rendererContext を絁E��立て、E

createViewerHub({ core, renderer }) を呼び、E

hub オブジェクトを返す�E�E core, start, stop, pickObjectAt } を持つ�E�E

viewerHub が�E開するランタイム API

hub.core 以下に、仕様どおりの API が揃ってぁE��こと
�E�EDSD-viewer.md §6.8.2 と runtime_spec の core_api に一致�E�E

core.* の形は以下�EようなチE��ー構造になってぁE��こと�E�E

hub = {
  core: {
    data,       // struct�E�EDSS, read-only�E�E
    uiState,   // uiState, read-only

    frame:    { setActive, getActive, getRange, next, prev,
                startPlayback, stopPlayback },
    camera:   { rotate, pan, zoom, reset, snapToAxis,
                setState, getState, setFOV },
    selection:{ select, clear, get },
    mode:     { set, get, canEnter, exit, focus },
    micro:    { enter, exit, isActive },
    filters:  { setTypeEnabled, get },
    runtime:  { isFramePlaying, isCameraAuto },

    // 忁E��なら補助: recomputeVisibleSet, setFrame, stepFrame, canEnterMicro
  },

  start,         // rAF ループ開姁E
  stop,          // rAF ループ停止
  pickObjectAt,  // NDC 座樁EↁE{uuid,...} | null
};


UI 層

public/viewer/runtime/ui/*.js は、E
忁E�� hub.core.* / hub.pickObjectAt のみを呼び出す、E

core/controller/renderer めEUI が直接 import したり参照したりしてはぁE��なぁE��E

core/controller 層

frameController, selectionController, modeController, visibilityController, CameraEngine は、E
runtime_spec に書かれたメソチE��をその名前どおり公開する、E

viewerHub からそれら�EメソチE��に 1:1 で橋渡しされる、E

3. 具体的な修正タスク
3.1 viewerHub の core の形を仕様に合わせる

対象�E�public/viewer/runtime/viewerHub.js

createViewerHub({ core, renderer }) の戻り値を、忁E��以下�E形にする�E�E

export function createViewerHub({ core, renderer }) {
  // ... 略 ...

  const hub = {
    core: {
      data: core.data,
      uiState: core.uiState,

      frame: {
        setActive: core.frameController.setActive,     // 侁E
        getActive: core.frameController.getActive,
        getRange: core.frameController.getRange,
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
      exit: () => core.modeController.set('macro'),
      isActive: () => core.uiState.mode === 'micro',
    },

      filters: {
        setTypeEnabled: core.visibilityController.setTypeFilter,
        get: core.visibilityController.getFilters,
      },

      runtime: {
        startFramePlayback: core.frameController.startPlayback,
        stopFramePlayback: core.frameController.stopPlayback,
        isFramePlaying: () => core.uiState.runtime.isFramePlaying,
        isCameraAuto: () => core.uiState.runtime.isCameraAuto,
      },

      // 補助系 API�E�忁E��に応じて�E�E
      recomputeVisibleSet: core.visibilityController.recompute,
      setFrame: core.frameController.setActive,
      nextFrame: core.frameController.next,prevFrame: core.frameController.prev,
      canEnterMicro: core.modeController.canEnter,
    },

    start,        // rAF ループ開始関数
    stop,         // rAF ループ停止関数
    pickObjectAt, // rendererContext.pickObjectAt をラチE�Eしたも�E
  };

  return hub;
}


※ 上記�Eイメージであり、実際の core オブジェクト構造に合わせて調整してよい、E
重要なのは hub.core の公開メソチE��名と構造めEruntime_spec / 3DSD-viewer.md に合わせること である、E

すでに存在する hub.core.* が仕様と違う名前�E�引数になってぁE��ら、E
仕様に合わせてリネ�Eム�E�ラチE�E すること、E

仕様に存在しなぁEpublic メソチE��は、hub.core から削除�E�非公開化�E�する、E
冁E��で忁E��ならローカル関数めEcontroller メソチE��として残してよいが、hub 経由では見えなぁE��ぁE��する、E

viewerHub の先頭付近に、runtime_spec と同期した API 一覧コメントを追加する�E�E

// Runtime public API (synced with specs/3DSD-viewer.md §6.8.2 and runtime_spec v2.1)
// hub.core = {
//   data, uiState,
//   frame: { setActive, getActive, getRange, next, prev, startPlayback, stopPlayback },
//   camera: { rotate, pan, zoom, reset, snapToAxis, setState, getState, setFOV },
//   selection: { select, clear, get },
//   mode: { setMode, getMode, canEnter, exit, focus },
//   micro: { enter, exit, isActive },
//   filters: { setTypeEnabled, get },
//   runtime: { isFramePlaying, isCameraAuto },
//   // ...
// }

3.2 controller 群のメソチE��名！E��割を揃える

対象�E�E

public/viewer/runtime/core/frameController.js

public/viewer/runtime/core/selectionController.js

public/viewer/runtime/core/modeController.js

public/viewer/runtime/core/microController.js�E�忁E��な篁E���E�E

public/viewer/runtime/core/visibilityController.js

public/viewer/runtime/core/cameraEngine.js

めE��こと�E�E

それぞれのモジュールで、�E開されてぁE��オブジェクト�EメソチE��名を runtime_spec に揁E��る、E

例！E

frameController:

setActive(frameIndex:number)

getActive(): number

next(): number        // or void, 実裁E��おりに

prev(): number

getRange(): {min:number,max:number}

startPlayback()

stopPlayback()

selectionController:

select(uuid:string)

clear()

getActive(): {kind:string|null, uuid:string|null}

modeController:

setActive(mode:'macro'|'meso'|'micro', uuid?)

getActive()

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

既存コードで似たメソチE��が別名になってぁE��場合、E
できるだけラチE�Eで吸収し、外向ぁEAPI 名だけを仕様に合わせる ことを優先する、E
�E��E部ロジチE��は極力壊さなぁE��E

uiState の所有権は core にある前提で、各 controller から uiState を更新する構造を維持する、E

3.3 bootstrapViewer が「hub」を返すように統一

対象�E�public/viewer/runtime/bootstrapViewer.js

既存�E実裁E��確認し、bootstrapViewer(canvasOrId, document3dss, options?) が次のような流れになってぁE��か確認、足りなければ補う�E�E

canvas の解決�E�ED 斁E���Eの場合�E DOM から取得！E

AJV による strict full validation 済み 3DSS ドキュメントを受け取る前提�E�もしくは冁E��で validate�E�E

createUiState() で uiState を�E期化

buildUUIDIndex() / detectFrameRange() で index 構篁E

new CameraEngine(initialState)

吁Econtroller の createXxxController(uiState, structIndex, ...) を呼ぶ

createRendererContext(canvas, struct, structIndex, uiState) を呼ぶ

これらを束�Eて core オブジェクトを作る

const hub = createViewerHub({ core, renderer })

return hub;

bootstrapViewerFromUrl(canvasOrId, url, options?) も同様に、E
URL ↁEJSON ↁEvalidate ↁEbootstrapViewer 呼び出ぁEↁEhub を返す、とぁE�� 1 本の流れに揁E��る、E

bootstrapViewer 自体�E requestAnimationFrame ループを持たなぁE��と、E
描画ループ�E viewerHub.start() に一本化する、E

3.4 UI 層の呼び出し口めEhub.core.* に揁E��めE

対象�E�viewer/runtime/ui/*.js

吁EUI モジュールで、runtime めErenderer を直接 import してぁE��箁E��があれ�E削除し、E
代わりに Host から渡されめEhub�E�また�E hub.core�E�だけを使ぁE��ぁE��書き換える、E

代表例！E

keyboardInput.js

フレーム操佁EↁEhub.core.frame.*

カメラ操佁EↁEhub.core.camera.*

モード操佁EↁEhub.core.mode.*, hub.core.micro.*

pointerInput.js

マウスドラチE�� ↁEhub.core.camera.rotate/pan

ホイール ↁEhub.core.camera.zoom

gizmo.js

HOME ボタン ↁEhub.core.camera.reset()

軸クリチE�� ↁEhub.core.camera.snapToAxis('x'|'y'|'z')

picker.js

canvas 座樁EↁENDC ↁEhub.pickObjectAt(x,y) ↁEhub.core.selection.select(uuid)

timeline.js

スライダー・再生ボタン ↁEhub.core.frame.setActive/next/prev/startPlayback/stopPlayback

UI 層は core/controller/renderer のファイルを直接 import してはぁE��なぁE��E
あくまで Host から渡されぁEhub を介して runtime と対話する構造に統一する、E

4. 実裁E���E注愁E

三次允E��造�E�Etruct, 3DSS�E��E 絶対に変更しなぁE��E
どの修正でめEJSON に書き戻したり、構造を補完�E修復するコードを追加してはならなぁE��E

uiState および viewer_settings めE外部ファイルへの保存コード�E追加禁止、E
セチE��ョン冁E�Eメモリ状態だけで完結させる、E

既存�Eログ�E�Eviewer-dev] ... 等）�E可能なら維持するが、不要な console.log / debugger が残ってぁE��ば削除してよい、E

既存�E機�E�E�フレーム送り、E��択、カメラ操作、microFX�E�が壊れなぁE��ぁE��E
可能な限り ラチE�Eとリネ�Eム中忁Eで対応し、ロジチE��の再実裁E�E最小限に留めること、E

5. 出力フォーマッチE

最終�E力�E レポジトリルート基準�E git diff�E�Enified diff�E�形弁Eで提示すること、E
説明文めE��紁E�E不要、E

例！E

diff --git a/public/viewer/runtime/viewerHub.js b/public/viewer/runtime/viewerHub.js
index abcdef0..1234567 100644
--- a/public/viewer/runtime/viewerHub.js
+++ b/public/viewer/runtime/viewerHub.js
@@ -1,10 +1,20 @@
 // 既存コーチE..


こ�E diff 一つに、今回の修正のすべてをまとめること�
