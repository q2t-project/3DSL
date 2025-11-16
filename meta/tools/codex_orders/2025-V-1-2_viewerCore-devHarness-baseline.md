2025-V-1-2 viewerCore / viewerDevHarness コア実装固定
1. ゴール

dev 用 viewer（viewer_dev.html）起動時に、

core_viewer_baseline.3dss.json を必ず読み込む。

three.js 初期化 → 3DSS ロード → シーン構築 → 初期カメラ配置までが
viewerDevHarness.js → viewerCore.js → ViewerRenderer の 1 本の経路で完結する。

「V-1-1 起動フロー」「V-1-2 毎回同じ表示」の仕様（3DSD-viewer.md で定義済）を実コードに反映する。

DOM への直接アクセスは dev ハーネス層に閉じ込め、viewerCore 以降は
「コンテナ要素 + 設定オブジェクト」だけを前提に動く。

2. 対象

HTML

code/viewer/ui/viewer_dev.html

dev ハーネス

code/viewer/ui/viewerDevHarness.js

コア

code/viewer/core/viewerCore.js

レンダラー

code/viewer/renderer/viewerRenderer.js

既存実装はそのまま利用しつつ、今回の要件を満たす形に整理・修正する。

3. 起動パイプライン（V-1-1 対応）
3.1 viewer_dev.html

やること:

dev 用 viewer の DOM 構造を最小限に固定する。

#viewer-root … three.js キャンバスを収めるコンテナ

#summary … モデル概要などテキスト表示用

#log … 起動ログ表示用（プレーンテキスト）

必要なら操作パネル用の #controls までは OK（まだ中身は最小限で良い）。

<script type="module"> で 1 本だけ viewerDevHarness.js を読み込む。

他の JS モジュールは HTML から直接触らず、全部ハーネス経由に寄せる。

期待状態:

viewer_dev.html から見たエントリポイントは「viewerDevHarness 1 本」だけ。

サンプルファイルパスなどは HTML ではなく JS 側の定数として持つ。

3.2 viewerDevHarness.js

やること:

DOM Ready を待つユーティリティを用意し、DOMContentLoaded 後にメイン処理を走らせる。

起動時に必要な DOM 要素をすべて取得する。

const container = document.getElementById("viewer-root");

const summaryEl = document.getElementById("summary");

const logEl = document.getElementById("log");

デフォルトのサンプルファイルを 1 本に固定。

const DEFAULT_SAMPLE_PATH = "/data/sample/core_viewer_baseline.3dss.json";

ログ関数を dev ハーネス側で定義し、viewerCore には「コールバック」として渡す。

例: log({ tag: "BOOT", msg: "...", payload: {...} }) を 1 行テキストに整形して #log に追記。

bootViewerCore(container, config) を呼び出す。

config に渡す想定フィールド:

modelPath: ロードする .3dss.json のパス（デフォルトは DEFAULT_SAMPLE_PATH）

log: 上記のログ関数

summaryEl または setSummary(text) コールバック（必要に応じて）

将来の「リロードボタン」や「別サンプルロード」も、必ず bootViewerCore 呼び直しで処理する方針にしておく（今回 UI 実装は最小で OK）。

インターフェース:

import { bootViewerCore } from "../core/viewerCore.js";

async function main() {
  await waitForDomReady();

  const container = document.getElementById("viewer-root");
  const logEl = document.getElementById("log");
  const summaryEl = document.getElementById("summary");

  const log = makeLogFn(logEl);

  await bootViewerCore(container, {
    modelPath: DEFAULT_SAMPLE_PATH,
    log,
    summaryEl,
    mode: "viewer_dev",
  });
}

main().catch(console.error);

4. viewerCore 実装整理（V-1-1 / V-1-2 対応）
4.1 外部インターフェース

viewerCore.js が提供するのは 2 つだけに整理する:

export class ViewerCoreRuntime {
  constructor(containerElement, config) { ... }
  async init() { ... }   // fetch+validate+scene構築+renderer起動+ログ出力
  dispose() { ... }      // 後始末（今は最低限でOK）
}

export async function bootViewerCore(containerElement, config = {}) {
  const runtime = new ViewerCoreRuntime(containerElement, config);
  await runtime.init();
  return runtime;
}


config には少なくとも以下を扱う:

modelPath: string … .3dss.json のパス

log?: (record: LogRecord) => void … ログ出力用コールバック（任意）

mode?: string … "viewer_dev" など

summaryEl or setSummary … モデル概要を画面に出す用（最低限のテキストで可）

4.2 DEFAULT_CAMERA_STATE（V-1-2）

3DSD-viewer.md の定義に合わせて、以下を 定数として固定:

const DEFAULT_CAMERA_STATE = Object.freeze({
  up: [0, 0, 1],
  position: [0, 6, 14],
  target: [0, 0, 0],
  fov: 50,
  near: 0.1,
  far: 2000,
});


dev 起動時は必ずこの状態でカメラを初期化する。

将来、.3dss 側にカメラ指定が入ってきても、

dev モードの「初期状態テスト」ではこの定数で上書きできるようにしておくのが理想。

4.3 3DSS ロードとバリデーション

既存の importer / validator を使って以下の流れを 1 クラス内にまとめる:

fetch(modelPath) で .3dss.json を取得。

validate3Dss(rawJson) で 3DSS schema に対する検証。

convert3DssToInternalModel(rawJson) で内部モデルへ変換。

validateInternalModel(internalModel) で内部表現の整合確認。

警告・エラーは config.log に投げる。

致命的エラーの場合は init() 内で throw して、dev ハーネスが console.error する想定。

4.4 points / lines / aux のバケット化と Layer グループ

V-1-2 の「レイヤ初期状態 = 全 ON」を実現するため、内部では「3 グループ + meta」を返す構造に整理:

function createLayeredSceneGraph() {
  return {
    pointsGroup: new THREE.Group(),
    linesGroup: new THREE.Group(),
    auxGroup: new THREE.Group(),
    scene: new THREE.Scene(),
  };
}


bucket 処理:

.type or ノード種別から

points 系 → pointsGroup

lines 系 → linesGroup

aux 系 → auxGroup

初期状態では 3 グループとも visible = true に設定。

ViewerRenderer へはこの 3 グループと scene を渡す。

4.5 frame 初期値の決定

V-1-2 のルールを実装:

document_meta.frames が配列で存在する場合:

frames[0].frame_id を initialFrameId として採用。

無い場合:

内部的に null か 0 を「デフォルト frame」として扱う（実装しやすい方で OK）。

ログ上の表示は "default" などの文字列にしても良いが、仕様書で決めた表現に合わせる。

ViewerCoreRuntime 内で this.currentFrameId として保持し、
将来 V-2-2 で UI が frame 切替を叩けるようにしておく（今は保存だけで可）。

4.6 ViewerRenderer との接続

ViewerRenderer のコンストラクタはざっくりこんなイメージに揃える:

const renderer = new ViewerRenderer(containerElement, {
  cameraState: DEFAULT_CAMERA_STATE,
  scene,
  pointsGroup,
  linesGroup,
  auxGroup,
  log,          // 任意
});


ViewerRenderer 側の責務:

three.js の Scene, PerspectiveCamera, WebGLRenderer を初期化。

cameraState からカメラをセットアップし、up ベクトルを (0,0,1) にする。

scene に 3 グループを add。

requestAnimationFrame ループを持ち、毎フレーム renderer.render(scene, camera) を呼ぶ。

dev 段階ではライト・背景などは最小限で OK。

5. dev ログ出力（V-1-2 ログ条件）

ViewerCoreRuntime.init() の最後で、仕様書に書いた 5 行相当のログを config.log 経由で出す。

レコード構造の一例:

log({ tag: "BOOT",   payload: { mode: config.mode ?? "viewer_dev" } });
log({ tag: "MODEL",  payload: { path: modelPath } });
log({ tag: "CAMERA", payload: DEFAULT_CAMERA_STATE });
log({
  tag: "LAYERS",
  payload: { points: true, lines: true, aux: true },
});
log({ tag: "FRAME",  payload: { frame_id: initialFrameId ?? "default" } });


dev ハーネス側で 1 行テキストにフォーマットして #log に追記する。

例: CAMERA {"position":[0,6,14],...}

6. 受け入れ条件

codex 側で以下を満たすように修正すること。

viewer_dev.html をブラウザで開いたとき、

自動で /data/sample/core_viewer_baseline.3dss.json が読み込まれる。

画面上の初期表示がリロードごとに完全に一致する（カメラ・frame・レイヤの状態）。

dev ハーネスからのエントリポイントは viewerDevHarness.js 1 本だけ。

viewerCore.js は bootViewerCore(container, config) / ViewerCoreRuntime の 2 つのエクスポートに整理されている。

three.js の初期化と render loop は ViewerRenderer に閉じ込められている。

起動ログとして、少なくとも

BOOT

MODEL

CAMERA

LAYERS

FRAME
の 5 行が #log に出力され、リロードのたびに内容が一致する。