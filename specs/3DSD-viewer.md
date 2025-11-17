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
**構造データは read-only** で保持される点が最大の違いである。

## 1.1 モジュール構成

| モジュール | 役割 |
|-----------|------|
| Core      | 3DSS データ読込・状態管理（immutable） |
| Renderer  | 描画・フレーム制御・カメラ制御 |
| UI        | フレーム選択・layer 表示切替・情報パネル |
| Validator | strict full validation |
| Utils     | 座標変換・色処理 |
| HUD       | viewer 専用の axis / origin 等の視覚補助（UI レイヤ。構造データとは無関係） |

### 存在しないモジュール（明確に禁止）

- Exporter（保存）
- Editor（編集）
- Annotation / Report
- Snapshot, Export（スクリーンショット生成等）


## 1.2 Core（read-only state）

構造データを読み込み保持するが、  
modeler と異なり **構造データは immutable（不変）** として扱う。

```js
{
  document_meta,
  points[],
  lines[],
  aux[],

  ui_state: {
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

- 構造データ部分は deep-freeze
- UI 状態のみ内部で可変
- JSON への書戻しは禁止


## 1.3 内部依存関係（modeler と対称）
UI → Core → Renderer
      ↓
   Validator（読込時）
      ↑
    HUD（描画補助）

### 特徴
- Validator は読込時のみ
- Renderer は構造データを読み取るだけ（書換禁止）
- HUD は UI レイヤの補助で構造層に影響しない
- UI は Core のみを操作する（Renderer を直接触らない）

## 1.4 各モジュールの責務
### Core
- JSON 読込
- strict validation 実行
- 構造データを immutable で保持
- UI 状態管理（selected / hover / frame / camera 等）

### Renderer
- three.js 描画
- frame / visibility / camera の反映
- hover / select の強調（構造変更なし）

### UI
- フレーム切替
- レイヤ ON/OFF
- 情報パネル
- 編集 UI は一切なし

### Validator
- strict full validation
- $id / version / uuid / enum / additionalProperties すべてチェック
- NG → 読込拒否

### Utils
- viewer 用最小限の変換関数のみ

## 1.5 I/O（viewer）
- 入力： .3dss.json
- 出力： 無し

UI 状態・カメラ・visibility の永続化も行わない
（セッション内のみ）。


## 1.6 禁止事項（viewer 全体）
viewer は次を行わない：
1. 構造データの変更（add / update / remove）
2. 保存機能
3. 編集イベントの実装
4. UI 状態の JSON 化
5. annotation / comment / report 等の生成
6. viewer_settings を JSON 化して保存（永続化）すること
7. extension の意味解釈・生成・補完（構造変更に相当）
8. normalize / 推測 / 補完 / prune / reorder などの生成処理

viewer は **完全 read-only の表示装置** である。  
viewer 独自情報は ui_state 内部にのみ保持してよい（構造データへの混入禁止）。


## 1.7 起動フロー（dev harness → Core）

### 1.7.1 エントリ経路の固定

開発用 viewer は、次の 1 本の経路で起動する。

1. `code/viewer/ui/viewer_dev.html`
2. `code/viewer/ui/viewerDevHarness.js`
3. `code/viewer/core/viewerCore.js`

この経路以外から Core／Renderer を直接呼び出すことは禁止とする。

### 1.7.2 各レイヤの責務

- **viewer_dev.html（dev HTML）**
  - 開発用ビューア用の DOM 骨格を定義する
    - viewer コンテナ要素（3D キャンバスを配置）
    - 簡易コントロール（サンプルファイル選択、ログ表示など）
  - `<script type="module">` から `viewerDevHarness` を 1 度だけ起動する
  - three.js・AJV 等のライブラリを直接読むのは禁止

- **viewerDevHarness.js（dev ハーネス）**
  - DOMContentLoaded を待ち、dev 用 UI 要素の参照を集める
  - コマンドライン相当の「ブート設定」を組み立てる
    - 使用する `.3dss.json` パス（通常は `data/sample/core_viewer_baseline.3dss.json`）
    - 初期カメラ状態（position / target / fov）
    - ログ出力先（画面上の `<pre>` など）
  - `bootViewerCore(containerElement, config)` を 1 回呼び出す
  - 再読込ボタンなど dev 用 UI からの「リロード要求」は、すべてハーネス内部で受け取り、
    同じコンテナ・同じ設定で `bootViewerCore` を呼び直す

- **viewerCore.js（Core ランタイム）**
  - `bootViewerCore(containerElement, config)` を外部公開する唯一のエントリポイントとする
  - 起動処理の中で次を順に実行する：
    1. three.js コンテキストの初期化（renderer / scene / camera）
    2. `config.sample_path` から .3dss.json を fetch
    3. Validator による strict full validation の実行
    4. 構造データを points / lines / aux / document_meta にバケット分け（immutable state）
    5. ViewerRenderer を初期化し、レンダリングループを開始
    6. 初期フレーム／レイヤ／カメラ状態を ui_state に設定
  - DOM には直接触れず、描画は `containerElement` 配下の canvas のみを対象とする

### 1.7.3 起動シーケンス（時系列）

1. ブラウザが `viewer_dev.html` を読み込む
2. DOM 構築完了（`DOMContentLoaded`）  
   → viewerDevHarness が dev 用要素（コンテナ／ログ領域／ボタン）を取得
3. ハーネスが `bootViewerCore(containerElement, config)` を呼ぶ
4. Core が three.js を初期化し、`config.sample_path` の .3dss.json をロード
5. Validator が strict full validation を行う（NG なら画面上のログに理由を表示し、起動中断）
6. 正常時は Core が state を構成し、ViewerRenderer が初期フレームを描画
7. 以後のユーザ操作（Orbit／ズーム／frame 切替／レイヤ ON/OFF）は UI → Core → Renderer の既定経路で処理される

この起動フローにより、

- 「同じ viewer_dev.html ＋ 同じ `.3dss.json` → 同じ初期画面」
- 起動経路が dev 環境・本番環境とも一貫

であることを保証する。

## 1.8 core_viewer_baseline 起動時の固定条件

本節では、dev 用 viewer（viewer_dev.html）において
`core_viewer_baseline.3dss.json` を読み込んだときに
「毎回同じ初期画面」が再現されるための固定条件を定義する。

### 対象

- HTML: `code/viewer/ui/viewer_dev.html`
- ハーネス: `code/viewer/ui/viewerDevHarness.js`
- コア: `code/viewer/core/viewerCore.js`（ViewerCoreRuntime / ViewerRenderer）

### 入力ファイルの固定

1. dev 起動時のデフォルト入力は、常に  
   `/data/sample/core_viewer_baseline.3dss.json` とする。
2. 他のサンプルをロードする UI を持つ場合でも、
   「起動直後に自動でロードされるファイル」は上記 1 本に限定する。
3. 入力ファイルパスは、起動ログに必ず 1 行出力する（後述）。

### カメラ初期状態の固定

dev viewer で `core_viewer_baseline.3dss.json` を読み込んだ直後の
カメラ状態を、次の定数として固定する。

- 投影方式: PerspectiveCamera
- up ベクトル: (0, 0, 1)  // Z+ 絶対上
- position: (0, 6, 14)
- target（注視点）: (0, 0, 0)
- fov: 50°
- near: 0.1
- far: 2000

実装上は、viewerCore 側で `DEFAULT_CAMERA_STATE` などの定数として保持し、
dev 起動時は必ずこの値で初期化する。  
ユーザ操作（Orbit 等）で変化したカメラは、リロードすれば必ずこの状態に戻る。
+
### frame / layer 初期状態の固定

`core_viewer_baseline.3dss.json` 読み込み完了時点での
frame と layer の初期状態を、次のように固定する。

1. frame
   - `document_meta.frames` が存在する場合:  
     - 配列の先頭要素 `frames[0].frame_id` を「初期 frame_id」とする。
   - frames が存在しない場合:  
     - viewer 内部の「デフォルト frame（null または 0）」として扱い、
       画面上の表示も「frame: default」とする（文言は実装任意）。

2. layer
   - points / lines / aux の 3 レイヤを、それぞれ独立した Group として保持する。
   - dev 起動時の初期状態は、3 レイヤすべて `visible = true`（ON）とする。
   - ユーザ操作で ON/OFF を切り替えても、リロードすれば必ず全 ON に戻る。

### 起動ログ出力の最低要件

dev viewer では、起動完了時に少なくとも次の情報をログ出力する。
（出力形式はテキストでよいが、1 行 1 レコードとする）

1. BOOT
   - 例: `BOOT  viewer_dev`
2. MODEL
   - 読み込んだ .3dss.json のパス
   - 例: `MODEL /data/sample/core_viewer_baseline.3dss.json`
3. CAMERA
   - 初期カメラ state（position / target / fov など）を JSON 形式で 1 行
   - 例: `CAMERA {"position":[0,6,14],"target":[0,0,0],"fov":50}`
4. LAYERS
   - points / lines / aux の ON/OFF 状態
   - 例: `LAYERS points=on lines=on aux=on`
5. FRAME
   - 初期 frame_id
   - 例: `FRAME  frame_id=0`

これら 5 種のログがすべて揃っていることをもって、
「同じビルド + 同じ core_viewer_baseline.3dss.json → 同じ初期状態」
が確認できるものとする。

### 受け入れ条件

- viewer_dev.html をリロードするたびに、
  - 同じ .3dss.json パス
  - 同じカメラ初期状態
  - 同じ frame_id
  - 同じレイヤ ON/OFF 状態
 で画面が描画されること。
- ログ上でも、上記の情報が毎回一致していることを確認できること。

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

---

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


## 3.6 Frame Switch（フレーム切替）

UI.frame_switch(n)
→ ui_state.active_frame = n
→ Renderer が n に合致する要素だけ表示


- frame は構造データに書き戻さない
- frames 未定義 or 空の要素は常時表示


## 3.7 レイヤ表示切替（Visibility Control）

points / lines / aux の表示 ON/OFF を UI で制御する。

ui_state.visibility_state = {
points: boolean,
lines: boolean,
aux: boolean,
aux_module: {
grid, axis, plate, shell, hud, extension
}
}


appearance.visible（構造データ側）とは連動しない。


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


## 6.4 読込結果の内部処理（state 化）

strict validation を通過したデータは以下の構造で保持：

```js
{
  document_meta, // read-only
  points[],      // read-only
  lines[],       // read-only
  aux[],         // read-only

  ui_state: { // viewer 専用の動的状態（構造データと混在禁止）
    selected_uuid,
    hovered_uuid,
    active_frame,
    visibility_state,
    camera_state,
    panel_state,
    viewer_settings,
  }
}
```


### 重要点

- 構造データは **immutable（deep-freeze）**
- UI 状態は保存されない（session-limited）
- viewer は構造データを変更・拡張しない
- proxy 化／正規化／再構築は **禁止**

### viewer_settings（内部用）
```js
ui_state.viewer_settings = {
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
```

- 構造データへ書き戻さない  
- viewer_settings.* を JSON 化して保存することも禁止


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
