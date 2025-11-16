Execute viewer layer toggle proto (V-2-3)

Repo: q2t-project/3DSL

Branch: main

Scope: code/viewer/core, code/viewer/renderer, code/viewer/ui

Goal: dev ハーネス上で points / lines / aux のレイヤ ON/OFF を行う最小プロトタイプを実装する。
「レイヤ切替操作 → シーン状態（runtime / renderer / log / summary）が一貫して切り替わる」ことを確認できる状態にする。

 1. 既存状況の前提

V-2-2 までが main に入っている前提で作業する：
- code/viewer/core/viewerCore.js
 - ViewerCoreRuntime クラス
 - bootViewerCore(containerElement, config)
 - カメラ API：updateCameraState(delta), getCameraState()
 - フレーム API：updateFrameId(runtime, frameId), getFrameId(runtime) のラッパー
  - Runtime 側には getFrameId() / setFrameId(frameId) メソッドがあり、
   FRAME ログを出しつつ renderer に frameId を伝える。
 - determineInitialFrameId(documentJson) により document_meta.frames から currentFrameId を初期化
 - summarizeLoadResult() が initialFrameId / activeFrameId を summary に入れる
 - #emitBootLogs() が BOOT / MODEL / CAMERA / LAYERS / FRAME を一度出す
 - sceneGraph は pointsGroup / linesGroup / auxGroup を持ち、各 group には visible フラグがある
- code/viewer/renderer/viewerRenderer.js
 - Canvas2D ベースの簡易レンダラー
 - renderScene({ viewScene, mode, cameraState, pointsGroup, linesGroup, auxGroup, frameId }) を受け取る
 - debug overlay に Mode / Nodes / Camera / Layers / Frame 情報を表示
- code/viewer/ui/viewer_dev.html
 - 左：#viewer-root（canvas 埋め込み用）
 - 右：#sidebar 内に #controls, <pre id="summary">, <pre id="log">
- code/viewer/ui/viewerDevHarness.js
 - bootViewerCore を呼び出し、core_viewer_baseline.3dss.json をロードして dev viewer を起動
 - マウス操作（orbit / pan / zoom）から updateCameraState を叩く proto 実装済み
 - frame ボタン（0〜3）から updateFrameId を叩き、FRAME_UI + FRAME ログを出す
 - log / setSummary 経由で structured log と JSON summary を表示

 2. 要件（V-2-3：layer ON/OFF proto）

## #2-1. ランタイム API（viewerCore.js）

viewerCore.js に、レイヤ ON/OFF 用の public API を追加する。

### 2-1-1. トップレベルラッパー

ファイル末尾付近に次の関数を export する（bootViewerCore / ViewerCoreRuntime の近く）：

export function updateLayerVisibility(runtime, layerKey, visible) { ... }
export function getLayerVisibility(runtime) { ... }


挙動：
- runtime が ViewerCoreRuntime インスタンスでない場合は Error を投げる。
- layerKey は "points" / "lines" / "aux"（大文字小文字無視）だけ許可。
 - "point" / "line" などの単数は、それぞれ points / lines にマップしてよい。
- visible が undefined の場合は「現在値をトグル」、true/false が渡された場合はその値に設定。
- 実処理は runtime 側の setLayerVisibility / getLayerVisibility を呼ぶだけにする：
 - updateLayerVisibility → runtime.setLayerVisibility(normalizedLayerKey, visible)
 - getLayerVisibility → runtime.getLayerVisibility()

### 2-1-2. ViewerCoreRuntime メソッド

ViewerCoreRuntime クラスに次を追加する：

getLayerVisibility() { ... }
setLayerVisibility(layerKey, visible) { ... }


実装の目安：

getLayerVisibility() {
  return {
    points: !!this.sceneGraph.pointsGroup.visible,
    lines: !!this.sceneGraph.linesGroup.visible,
    aux:   !!this.sceneGraph.auxGroup.visible,
  };
}

setLayerVisibility(layerKey, visible) {
  const key = String(layerKey ?? "").toLowerCase();
  let groupKey = null;
  if (key === "points" || key === "point") groupKey = "pointsGroup";
  else if (key === "lines" || key === "line") groupKey = "linesGroup";
  else if (key === "aux" || key === "auxiliary") groupKey = "auxGroup";
  else throw new Error(`Unknown layer: ${layerKey}`);

  const group = this.sceneGraph[groupKey];
  if (!group) {
    throw new Error(`Layer group not found: ${groupKey}`);
  }

  const current = !!group.visible;
  const next = visible == null ? !current : !!visible;
  if (next === current) {
    return; // 変化なしなら何もしない
  }

  group.visible = next;

  // renderer に最新状態を伝える
  this.renderer.renderScene({
    viewScene: this.sceneGraph.scene,
    mode: this.mode,
    cameraState: this.cameraState,
    pointsGroup: this.sceneGraph.pointsGroup,
    linesGroup: this.sceneGraph.linesGroup,
    auxGroup: this.sceneGraph.auxGroup,
    frameId: this.currentFrameId,
  });

  // LAYERS ログを一貫した形式で出す
  const layers = this.getLayerVisibility();
  this.log({
    tag: "LAYERS",
    payload: {
      points: layers.points,
      lines: layers.lines,
      aux: layers.aux,
    },
  });

  // summary を更新
  if (this.lastLoadSummary) {
    this.lastLoadSummary.visibleLayers = { ...layers };
    if (this.setSummary) {
      this.setSummary(this.lastLoadSummary);
    }
  }
}

## 2-2. summarizeLoadResult 拡張

V-2-2 で拡張済みの summarizeLoadResult をさらに広げ、レイヤ可視状態を summary に含める。

シグネチャを次のようにする：

function summarizeLoadResult(
  path,
  viewScene,
  model,
  warnings = [],
  initialFrameId = null,
  activeFrameId = null,
  visibleLayers = null
) { ... }


挙動：

visibleLayers が null / undefined の場合は { points: true, lines: true, aux: true } をデフォルトとする。

返り値オブジェクトに次のフィールドを含める：

return {
  path,
  nodesInScene: ...,
  sceneId: ...,
  documentVersion: ...,
  initialFrameId: formattedInitial,
  activeFrameId: formattedActive,
  visibleLayers: {
    points: !!layers.points,
    lines: !!layers.lines,
    aux: !!layers.aux,
  },
  warnings: ...
};


loadDocument() の最後で lastLoadSummary を作るときは、

const layers = this.getLayerVisibility();
this.lastLoadSummary = summarizeLoadResult(
  targetPath,
  viewScene,
  internalModel,
  warnings,
  this.currentFrameId,
  this.currentFrameId,
  layers
);

のように initialFrameId / activeFrameId / visibleLayers を揃えて渡す。

setLayerVisibility() からは 2-1-2 の通り lastLoadSummary.visibleLayers を更新するだけでよい。

## 2-3. #emitBootLogs の整合性

#emitBootLogs() 内の LAYERS ログは、手計算ではなく getLayerVisibility() の結果を使うように揃える：

const layers = this.getLayerVisibility();
this.log({
  tag: "LAYERS",
  payload: {
    points: layers.points,
    lines: layers.lines,
    aux: layers.aux,
  },
});

これにより、起動時とトグル後の LAYERS ログ形式が一致する。

## 2-4. Renderer 側の取り込み（viewerRenderer.js）

Renderer は「各 group の visible フラグを真のソース」として扱う。

- コンストラクタに新しい state は特に追加しなくてもよい。
pointsGroup / linesGroup / auxGroup の .visible を参照すれば十分。

- renderScene(sceneInfo) は現状通り
this.pointsGroup = sceneInfo.pointsGroup ?? this.pointsGroup;
などで group を更新するだけでよい（ここは必要なら微調整）。

- #drawFrame() の overlay 表示を、visible フラグに追従させる：

既存コードはおそらく次のような形になっている：

const points = this.pointsGroup?.nodes?.length ?? 0;
const lines = this.linesGroup?.nodes?.length ?? 0;
const aux = this.auxGroup?.nodes?.length ?? 0;
this.ctx.fillText(`Layers: P${points} L${lines} A${aux}`, 16, 144);

これを、可視状態を反映する形に変更する：

const pointsVisible = !!this.pointsGroup?.visible;
const linesVisible = !!this.linesGroup?.visible;
const auxVisible = !!this.auxGroup?.visible;

const pointsCount = this.pointsGroup?.nodes?.length ?? 0;
const linesCount = this.linesGroup?.nodes?.length ?? 0;
const auxCount = this.auxGroup?.nodes?.length ?? 0;

this.ctx.fillText(
  `Layers: P${pointsVisible ? pointsCount : 0} ` +
    `L${linesVisible ? linesCount : 0} ` +
    `A${auxVisible ? auxCount : 0}`,
  16,
  /* 既存の Layers 行と同じ Y 座標（例: 144） */
  144
);


ポイント：
- visible=false のレイヤは count=0 として表示される。
- 後続の 3D 実装では、同じ visible フラグを three.js 等に渡す想定。

Node/selftest 環境（HAS_DOCUMENT=false）の場合も、visible フラグの有無に関わらず落ちないように conditional を入れること。

## 2-5. dev ハーネス UI（layer チェックボックス）

viewerDevHarness.js にレイヤ UI を追加する。

### 2-5-1. import の拡張

ファイル頭の import を、frame API / layer API を含める形に調整する：

import {
  bootViewerCore,
  updateFrameId,
  getFrameId,
  updateLayerVisibility,
  getLayerVisibility,
} from "../core/viewerCore.js";


（すでに updateFrameId / getFrameId が import 済みなら、それに続けて追加する）

### 2-5-2. main() 内で controlsEl を取得

V-2-2 で導入済みの前提だが、まだであれば次を main() 冒頭に追加する：

const controlsEl = getRequiredElement("controls");


起動後の処理を次のような流れにする：

const runtime = await bootViewerCore(container, {
  modelPath: DEFAULT_SAMPLE_PATH,
  log,
  setSummary,
  mode: "viewer_dev",
});

setupFrameControls(runtime, controlsEl, log, setSummary);
setupLayerControls(runtime, controlsEl, log, setSummary);
setupCameraProtoControls(container, runtime);

- 既存の orbit/pan/zoom 用 setupCameraProtoControls はそのまま。
- setupFrameControls() は、controlsEl.textContent を空にしてフレーム UI を作る既存実装を再利用。

### 2-5-3. setupLayerControls の新設

frame UI の下に「Layers:」＋チェックボックス群を追加する：

function setupLayerControls(runtime, controlsEl, log, setSummary) {
  if (!controlsEl || !runtime) return;

  let current = null;
  try {
    current = getLayerVisibility(runtime);
  } catch {
    current = { points: true, lines: true, aux: true };
  }

  const container = document.createElement("div");
  container.style.marginTop = "8px";

  const label = document.createElement("div");
  label.textContent = "Layers:";
  label.style.marginBottom = "4px";
  container.appendChild(label);

  const layers = [
    { key: "points", label: "Points" },
    { key: "lines", label: "Lines" },
    { key: "aux", label: "Aux" },
  ];

  layers.forEach(({ key, label: text }) => {
    const wrapper = document.createElement("label");
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    wrapper.style.marginRight = "8px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = current?.[key] ?? true;

    const span = document.createElement("span");
    span.textContent = text;
    span.style.marginLeft = "4px";

    checkbox.addEventListener("change", () => {
      try {
        updateLayerVisibility(runtime, key, checkbox.checked);
        log({
          tag: "LAYERS_UI",
          msg: "toggle layer",
          payload: { layer: key, visible: checkbox.checked },
        });
      } catch (error) {
        log({
          tag: "ERROR",
          msg: "updateLayerVisibility failed",
          payload: { message: error?.message },
        });
      }
    });

    wrapper.appendChild(checkbox);
    wrapper.appendChild(span);
    container.appendChild(wrapper);
  });

  controlsEl.appendChild(container);
}


注意点：
 - controlsEl の中身を空にするのは setupFrameControls 側だけ。
 setupLayerControls では .textContent を触らず、appendChild だけ行う。
 - レイヤの初期状態は getLayerVisibility(runtime) の結果に合わせる。

## 2-6. ログ・サマリーの期待値
dev ハーネスで viewer を起動後、レイヤチェックボックスを操作したとき：
- #log には少なくとも次が積み上がる：
 - 起動時：BOOT / MODEL / CAMERA / LAYERS / FRAME
 - frame ボタン押下：FRAME_UI + 直後の FRAME
 - layer チェックボックス変更：LAYERS_UI + 直後の LAYERS
- #summary には：
 - initialFrameId / activeFrameId は従来どおり。
 - visibleLayers フィールドが追加され、
{ "points": true/false, "lines": true/false, "aux": true/false } が現在状態を表す。

 - チェックボックス操作に応じて visibleLayers が更新される。
- Canvas overlay には：
 - 既存の Mode / Nodes / Camera / Frame 行に加え、Layers 行があり、
 - レイヤ ON/OFF に応じて表示値が変化する（隠したレイヤの count が 0 になる等）。

# 3. 変更対象ファイル

- code/viewer/core/viewerCore.js
 - layer API（updateLayerVisibility, getLayerVisibility）の追加
 - ViewerCoreRuntime に getLayerVisibility / setLayerVisibility / visibleLayers 更新ロジックを追加
 - summarizeLoadResult の拡張（visibleLayers 追加）
 - #emitBootLogs の LAYERS ログを getLayerVisibility ベースに統一
- code/viewer/renderer/viewerRenderer.js
 - #drawFrame の Layers 行を、group.visible に基づく表示に変更
- code/viewer/ui/viewerDevHarness.js
 - updateLayerVisibility / getLayerVisibility import 追加
 - main() で controlsEl を取得し、setupFrameControls / setupLayerControls / setupCameraProtoControls を呼ぶ流れに整理
 - setupLayerControls 関数の新規追加
 - 既存カメラ操作 proto はそのまま残す

# 4. 完了条件

 ## 1. npm run selftest:viewer が成功すること。
 ## 2. ローカルで dev viewer を起動し、次を手動確認すること：
 - 起動直後に baseline データが読み込まれ、Canvas 上に debug overlay（Mode / Nodes / Camera / Frame / Layers）が表示される。
 - sidebar の #controls に
  - Frame ボタン群（0〜3）
  - Layers: Points / Lines / Aux のチェックボックスが並んでいる。
 - Points / Lines / Aux のチェックボックスを ON/OFF すると：
  - #log に LAYERS_UI と LAYERS ログが出る。
  - #summary の visibleLayers が対応する値に変化する。
  - Canvas overlay の Layers 行が対応する値に変化する（OFF にしたレイヤのカウントが 0 になる等）。
 - frame ボタン（0〜3）も従来通り動作し、FRAME_UI / FRAME ログや activeFrameId 更新に影響がない。
 - orbit / pan / zoom 操作が引き続き動作し、カメラ操作とレイヤ ON/OFF を組み合わせてもエラーが出ない。

# 5. 実装スタイル上の注意
 - 既存コードのコーディングスタイル（命名・import の並び順・const/let の使い方）に合わせる。
 - 例外メッセージや log tag は英語ベース（既存の "LAYERS" / "FRAME" / "CAMERA" などと整合）。
 - レイヤ ON/OFF の単一の真のソースは group.visible とする（ViewerCore / Renderer / 将来の three.js 実装がこれを共有）。
 - schema（schemas/3DSS.schema.json）や data/sample/core_viewer_baseline.3dss.json には今回触れないこと。