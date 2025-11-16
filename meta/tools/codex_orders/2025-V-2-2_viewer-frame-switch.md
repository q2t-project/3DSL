Execute viewer frame switch proto (V-2-2)

Repo: q2t-project/3DSL

Branch: main

Scope: code/viewer/core, code/viewer/renderer, code/viewer/ui

Goal: dev ハーネス上で frame 切替の最小プロトタイプ を実装する

描画はまだ Canvas2D の debug overlay のままでよい

「frame を変えると、viewer 側の state / log / summary が一貫して変化する」ことを確認できる状態にする

1. 既存状況の前提

すでに V-2-1 で以下が入っている前提で作業すること：

code/viewer/core/viewerCore.js

ViewerCoreRuntime クラス

bootViewerCore(containerElement, config)

カメラ関係 API：cloneCameraState + updateCameraState(runtime, delta) / getCameraState(runtime)

determineInitialFrameId(documentJson) により document_meta.frames から currentFrameId を初期化

#emitBootLogs() から FRAME ログを一度出している

code/viewer/renderer/viewerRenderer.js

Canvas2D ベースの簡易レンダラー

renderScene({ viewScene, mode, cameraState, pointsGroup, linesGroup, auxGroup })

debug overlay に camera / layer 情報を表示

code/viewer/ui/viewer_dev.html

左：#viewer-root（canvas 埋め込み用）

右：#sidebar 内に #controls, <pre id="summary">, <pre id="log">

code/viewer/ui/viewerDevHarness.js

bootViewerCore を呼び出し、core_viewer_baseline.3dss.json をロードして dev viewer を起動

マウス操作（orbit / pan / zoom）から updateCameraState を叩く proto 実装済み

log / setSummary 経由で structured log と JSON summary を表示

この構造を壊さずに frame_id まわりだけを薄く拡張 する。

2. 要件（V-2-2：frame 切替 proto）
2-1. ランタイム API

viewerCore.js に、カメラと同じノリで frame 用の public API を追加する：

関数形のラッパー（外部から使う想定の API）

export function updateFrameId(runtime, frameId) { ... }
export function getFrameId(runtime) { ... }


updateFrameId は runtime インスタンスのメソッドを叩くだけ（パラメータチェックは軽く）

getFrameId は現在の frameId を返す（未指定時は null か "default" のどちらか一貫した値）

ViewerCoreRuntime クラス側のメソッド

class ViewerCoreRuntime {
  // 既存フィールド:
  // this.currentFrameId
  // this.renderer
  // this.log
  // this.setSummary
  // this.lastLoadSummary

  getFrameId() { ... }

  setFrameId(frameId) { ... }  // 内部用ロジック
}


setFrameId の挙動：

this.currentFrameId を更新

this.renderer.renderScene({ frameId: this.currentFrameId }) でレンダラーにも伝える

既存の renderScene() 呼び出しに frameId が追加されるイメージ

this.log({ tag: "FRAME", payload: { frame_id: this.currentFrameId ?? "default" } }) を出力

起動時の #emitBootLogs() とフォーマットを揃える

this.lastLoadSummary を持っている場合は、そこに activeFrameId などのフィールドを追加して更新し、this.setSummary があれば再表示させる

2-2. ロード時との整合性

すでに loadDocument() 内で determineInitialFrameId(documentJson) を呼んでいるはずなので、そこから得た値を

this.currentFrameId

summarizeLoadResult の initialFrameId

にセットしている現状を維持する。

今回の V-2-2 では 「初期 frame_id」と「現在の frame_id」 を区別する：

summarizeLoadResult の戻り値を拡張してよい（selftest が壊れない範囲で）：

function summarizeLoadResult(path, viewScene, model, warnings = [], frameId = null) {
  return {
    path,
    nodesInScene: ...,
    sceneId: ...,
    documentVersion: ...,
    initialFrameId: frameId ?? "default",
    activeFrameId: frameId ?? "default",  // ← 今回追加（命名は activeFrameId or currentFrameId のどちらかで統一）
    warnings: ...
  };
}


loadDocument() の最後で this.lastLoadSummary を作るときは、initialFrameId / activeFrameId 両方に this.currentFrameId を入れておく

setFrameId() 呼び出し時に lastLoadSummary.activeFrameId だけを更新し、setSummary を通して sidebar に反映する

2-3. Renderer 側の取り込み

viewerRenderer.js に、frame 情報を受け取って overlay に出す機能を追加する：

フィールド追加：

this.frameId = null;


renderScene(sceneInfo = {}) の中で：

this.frameId = sceneInfo.frameId ?? this.frameId;


#drawFrame() の overlay に 1 行追加：

this.ctx.fillText(
  `Frame: ${this.frameId ?? "default"}`,
  16,
  120
);


これにより、frame 切替が UI からわかるようにする。
（実際の 3D 表示の切替ロジックはまだ実装しない）

Node 環境の selftest 用 fallback (HAS_DOCUMENT false の場合) はこれまで通り動くように注意すること。

2-4. dev ハーネス UI（frame ボタン）

viewerDevHarness.js の main() 内で、viewer 起動後に frame 切替ボタンを作る。

viewerCore.js から新 API を import する：

import { bootViewerCore, updateFrameId, getFrameId } from "../core/viewerCore.js";


main() 内で runtime インスタンスを保持：

let runtime = null;

async function main() {
  ...
  runtime = await bootViewerCore(container, { ... });
  setupFrameControls(runtime, controlsEl, log, setSummary);
}


setupFrameControls の実装イメージ：

function setupFrameControls(runtime, controlsEl, log, setSummary) {
  if (!controlsEl) return;

  const frames = [0, 1, 2, 3]; // proto: core_viewer_baseline の memo を前提に固定

  const label = document.createElement("div");
  label.textContent = "Frame:";
  label.style.marginBottom = "4px";
  controlsEl.textContent = "";
  controlsEl.appendChild(label);

  frames.forEach((id) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(id);
    btn.style.marginRight = "4px";

    btn.addEventListener("click", () => {
      try {
        updateFrameId(runtime, id);
        log({ tag: "FRAME_UI", msg: "set frame", payload: { frame_id: id } });
      } catch (error) {
        log({ tag: "ERROR", msg: "updateFrameId failed", payload: { message: error?.message } });
      }
    });

    controlsEl.appendChild(btn);
  });
}


既存の orbit / pan / zoom のイベントバインドはそのまま残すこと

viewer_dev.html の #controls は現状のままでよい（中身は JS 側で上書きする）

2-5. ログ・サマリーの期待値

dev ハーネスで viewer を起動後、frame ボタンを押したとき：

#log には少なくとも

起動時の BOOT / MODEL / CAMERA / LAYERS / FRAME ログ

frame ボタン押下のたびに FRAME_UI + 直後の FRAME ログ

が積み上がること

#summary には

initialFrameId はロード時から固定

activeFrameId がボタン操作に応じて更新される

ことを確認できるようにする。

3. 変更対象ファイル

code/viewer/core/viewerCore.js

frame API（updateFrameId, getFrameId）の追加

ViewerCoreRuntime に getFrameId / setFrameId / activeFrameId 更新ロジックを追加

summarizeLoadResult の拡張（activeFrameId 追加）

既存コールサイトに合わせてシグネチャ調整すること

code/viewer/renderer/viewerRenderer.js

frameId フィールドと renderScene / #drawFrame の拡張

code/viewer/ui/viewerDevHarness.js

updateFrameId / getFrameId import 追加

runtime 変数の保持

setupFrameControls 関数の新規追加

main() から setupFrameControls 呼び出し

注意：

schema (schemas/3DSS.schema.json) や data/sample/core_viewer_baseline.3dss.json には触れないこと

他の viewer モジュール（HUD, viewerCommands など）は今回のタスクでは変更しない

4. 完了条件

npm run selftest:viewer が成功すること

ローカルで dev viewer を起動し、以下を手で確認：

起動直後に baseline データが読み込まれ、Canvas 上に debug overlay（Mode / Nodes / Camera / Layers）が表示される

sidebar の #controls に frame ボタン群（0〜3）が表示される

ボタンを押すたびに

#log に FRAME_UI と FRAME ログが出る

#summary の activeFrameId が対応する値に変化する

Canvas 上の overlay に Frame: ... が表示され、同じ値に変化する

既存の orbit / pan / zoom 操作が引き続き動作していること

カメラを動かしてもエラーにならない

overlay の Camera 行が更新される

5. 実装スタイル上の注意

既存コードのコーディングスタイル（命名・import の並び順・const/let の使い方）に合わせる

例外メッセージや log tag は英語ベース（既存の "FRAME" / "CAMERA" などと整合）

public API (updateFrameId / getFrameId) は camera API と同じような形に揃える
→ コードリーディング時に対称性があるようにするため