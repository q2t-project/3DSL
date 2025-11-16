【Codex 指令書：V-2-1 Orbit & ズーム proto 実装】
==========================================
■ 目的（必ず守ること）

viewer_dev.html を開いたとき、
Canvas 上ではまだ 3D 描画はしないが、
マウス操作によって cameraState が変化し、
viewerRenderer の debug テキストにカメラ値が反映される状態を作る。

UIUX proto の最小要件：

左ドラッグ → カメラ回転（Orbit っぽい動き）

右ドラッグ or Shift+左ドラッグ → パン

ホイール → ズーム

three.js はまだ使わない。
数学モデルは簡易式で良い。
“カメラ state が更新されている“ ことが確認できれば OK。

■ 絶対遵守の制約

renderer はカメラロジックを持たない
→ すべて viewerCore が cameraState を持つ。

UI → viewerDevHarness → viewerCore → renderer の一方向
→ viewerCore の API 以外を触らせない。

viewerCore を 1 行 API で操作できる構造にする

runtime.updateCameraState(delta)

runtime.getCameraState()

viewerRenderer は renderScene({ cameraState }) で反映するだけ。

■ 必要なファイル

code/viewer/core/viewerCore.js

code/viewer/ui/viewerDevHarness.js

code/viewer/renderer/viewerRenderer.js（軽微）

※ 他ファイルは触らない

■ 実装タスク一覧（Codex がやるべき作業）
1. viewerCore.js に “カメラ更新 API” を追加

追加するコード：

updateCameraState(delta = {}) {
  this.cameraState = {
    ...this.cameraState,
    ...delta,
  };
  this.renderer.renderScene({ cameraState: this.cameraState });
  this.log({ tag: "CAMERA", payload: this.cameraState });
}

getCameraState() {
  return { ...this.cameraState };
}

2. viewerDevHarness.js にマウス操作の proto 実装
必要イベント
mousedown
mousemove
mouseup
wheel
contextmenu (右クリック抑止)

左ドラッグ → 回転

回転角は deltaX * 0.01, deltaY * 0.01 程度の簡易モデル

カメラ position を球座標で回す簡易式で OK
（正確でなくていい。動けば良い。）

右ドラッグ or Shift+左 → パン

position と target を同時に XY 方向へ平行移動

ホイール → ズーム

カメラ position を target に向けて縮める/離す
distance *= 0.9 とかで OK

3. viewerRenderer.js

カメラ表示行が更新されるように、cameraState を必ず参照して draw する（既に実装されているので変更は最小で良い）。

4. ログ

以下の形式で log() を呼ぶ：

log({ tag: "CAMERA", payload: cameraState });


すでに viewerCore 側に実装するため、ハーネス側は log を触らない。

■ 期待される成果物
1. 3 ファイルの差分パッチ（viewerCore / viewerDevHarness / viewerRenderer）
2. 実際にマウス操作で debug テキストの Camera 行が変動する状態
3. selftest:viewer が壊れないこと（既存の selftest に影響しない構造）
■ アクション

上記要件をすべて満たす差分を生成し、
そのまま git apply できる unified diff 形式で出力せよ。