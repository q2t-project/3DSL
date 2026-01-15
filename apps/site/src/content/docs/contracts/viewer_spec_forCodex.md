==========================================
3DSL Viewer – 命名規則・構造規範（最終版）
==========================================

この章は、3DSL Viewer Runtime の
フォルダ構造・ファイル名・API 名の公式規範を定義する。

以後この規範に反する命名はすべて 禁止（FORBIDDEN） とする。

------------------------------------------
1. レイヤ構造とフォルダ命名
------------------------------------------

Viewer Runtime は 4 レイヤのみで構成される。

UI → hub → core → renderer


フォルダ名は 絶対にこれに対応させる。

viewer/
  runtime/
    bootstrapViewer.js
    viewerHub.js

    core/
      *.js
    renderer/
      context.js

  ui/
      *.js

●禁止

viewer_min_*

draw*.js

*_core.js

*_renderer.js

過去アーティファクトに由来する命名

理由： 旧思想の痕跡は構造崩壊を起こすため。

------------------------------------------
2. ファイル名規範（名前 → 役割の宣言）
------------------------------------------
◆（A）entry レイヤ
bootstrapViewer.js
viewerHub.js


entry は bootstrap

hub は 集約点

他の名前は一切禁止

◆（B）core レイヤ（Controller / Engine / State / Struct）

core 内に置ける名前は 4種類だけ。

cameraEngine.js          → 状態を持つ engine
frameController.js       → 状態を持つ controller
selectionController.js   → 状態を持つ controller
modeController.js        → 状態を持つ controller
microController.js       → 状態を持たない計算器
visibilityController.js  → 状態を持つ controller
uiState.js               → state container
structIndex.js           → uuid index の構築専用

●Controller の命名規範
XxxController.js


状態を直接書き換える唯一の存在

public API は imperative（set/get/step/...）

●Engine の命名規範
cameraEngine.js


“状態を保持するが controller ではない” 特別ユニット

役割は cameraState の内部管理のみ

draw ロジックや event を持つことは禁止

●State
uiState.js


State は 1 個だけ

名前は uiState 固定

Sub-state の追加は自由やが、ファイル分割は禁止

●Struct
structIndex.js


役割は document の索引

計算結果は Map

“Index” 以外の命名は禁止

◆（C）renderer レイヤ

renderer レイヤのファイルは context.js だけにする。

renderer/context.js

●禁止

drawLines.js

drawPoints.js

viewerRenderer.js

modules/

複数 renderer ファイル

“renderer” という prefix の JS ファイル

●理由

renderer の責務は

「stateless three.js adaptor」

これだけで十分。
複数ファイルに分けた瞬間 “ロジックの温床” になる。

◆（D）UI レイヤ（bridge 群）

UI の命名は Input / Gizmo / Picker / Timeline に限定する。

pointerInput.js
keyboardInput.js
gizmo.js
picker.js
timeline.js

●禁止

MouseInput.js

CameraInput.js

EventPicker.js

gizmoController.js

“Controller” が付く UI 名（Controller は core だけが持つ）

------------------------------------------
3. API メソッド命名規範
------------------------------------------

API の prefix には厳密な意味がある。

◆（A）viewHub（public API 名）の規範

hub.core に公開される関数は、
すべてが “1語＋動作” の構造に統一される。

frame
set(n)
get()
step(delta)
range()
startPlayback()
stopPlayback()

selection
select(uuid)
clear()
get()

camera
rotate(dTheta,dPhi)
pan(dx,dy)
zoom(delta)
reset()
snapToAxis(axis)
setFOV(value)
setState(partial)
getState()
focusOn(target:[x,y,z] | uuid, opts?) ← viewerHub 専用

mode
set(mode,uuid)
get()
canEnter(uuid)
exit()
focus(uuid)

micro
enter(uuid)
exit()
isActive()

filters
setTypeEnabled(kind,enabled)
get()

runtime
isFramePlaying()
isCameraAuto()

●禁止

run()

update()

draw_*()

render_*()

process_*()

handle_*()

hub は絶対にロジックを持たないため、
“処理系っぽい名前” を付けるのは即アウト。

------------------------------------------
4. レイヤごとの「許される命名と禁止命名」
------------------------------------------
◆entry レイヤ（bootstrap, hub）

✔ 許可

bootstrapViewer

bootstrapViewerFromUrl

viewerHub / createViewerHub

❌ 禁止

viewerEngine

viewerCore

viewerRuntime

viewManager

xxxRenderer

◆core レイヤ

✔ 許可

XxxController

CameraEngine

uiState

structIndex

❌ 禁止

XxxManager

XxxHandler

XxxService

XxxRenderer

XxxInput

XxxPicker

XxxLoader（loader は runtime に置く場合のみ OK）

◆renderer レイヤ

✔ 許可

context.js（1ファイルのみ）

❌ 禁止

draw*.js

renderer*.js

modules/

viewerRenderer.js

rendererUtils.js

◆ui レイヤ

✔ 許可

pointerInput.js

keyboardInput.js

picker.js

gizmo.js

timeline.js

❌ 禁止

XxxController

XxxEngine

XxxManager

XxxRenderer

event*.js

inputCore.js

------------------------------------------
5. 状態所有権（命名で自明化させる）
------------------------------------------

状態を “どこが持つか” が命名で分かるようになっている。

uiState           → core
visibleSet        → core
microState        → core
cameraState       → core.CameraEngine
3D objects        → renderer.context（三.js内部のみ）

●禁止

UI が state を持つ

hub が state を持つ

renderer が visibleSet を保持する

------------------------------------------
6. ランタイムフロー（命名が流れを保証する）
------------------------------------------
bootstrapViewer
  ↓
createUiState / createControllers / createRendererContext
  ↓
createViewerHub
  ↓
UI attach
  ↓
hub.start()
  ↓（ループ）
renderer.updateCamera()
renderer.applyFrame()
renderer.applyMicroFX()
renderer.render()


この流れを名前で完全に保証する。

==========================================
■最終まとめ（この章を Manifest に追記すれば完成）
==========================================

上記の「命名＋構造規範」は
3DSL Viewer Runtime の不変ルール（永久仕様） とする。

ファイル名

フォルダ名

API 名

レイヤ名

prefix/suffix

Controller の専有性

Renderer の単一化

UI の橋渡し性

状態所有権

これらを名前で固定することで
構造崩壊・コンタミを永久に防ぐ。