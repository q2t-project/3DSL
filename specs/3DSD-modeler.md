================================
3DSD-modeler.md（生成アプリ／"modeler"）
================================

# 0章　目的と適用範囲

## 0.1 modeler の役割

3DSD-modeler（以下、modeler）は 3DSL プロジェクトにおける唯一の **構造生成アプリ** として、
- 構造データ（3DSS）の 生成  
- 構造データの 編集  
- 構造データの 保存  
を担う。

modeler が出力する `.3dss.json` は **3DSL の正規構造データ** とされ、  
viewer はこの出力のみを入力として扱う。

また modeler には、入力を支える 2 系列の仕組みが存在する：

- **prep-import パイプライン**  
  `.3dss-prep.json` を取り込み、name 主体の疎データを temp_point として読み込み、  
  Direct Spatial Editing または数値入力を経て構造データへ昇格させる。
- **共通 UI 入力体系（Common Numeric & Option Input System）**  
  すべての編集値を  
  *continuous / discrete / string / enum / boolean* の 5 種の入力型へ分類し、  
  3DSL 全アプリで統一入力方式を採用する。  
  modeler は 5 種すべてを編集に利用し、viewer は構造を変更しない前提で  
  *enum / string / boolean*（レイヤ切替・フィルタ・情報表示）と、  
  *continuous / discrete*（カメラ・frame 切替など UI_state）の双方を  
  同じ分類で扱う。
さらに modeler は、3D ビュー上で point を直接編集する **Direct Spatial Editing** を提供し、  
数値入力と空間編集の双方から構造を確定できるようにする。

## 0.2 common 仕様との関係

modeler は以下の文書に準拠する：
- `/schemas/3DSS.schema.json`
- `/specs/3DSD-common.md`（共通仕様）

common 仕様は：
- 座標系・カメラ規範  
- 3DSS のデータ構造  
- 共通イベント語彙（add / update / remove / select / hover）  
- UI 入力の基本 5 分類（continuous / discrete / string / enum / boolean）  
- 構造データと UI 状態の分離  
- Core / Validator / Renderer の責務境界  

+を定めており、本仕様はそれを **編集アプリとして具体化** したものとなる。  
+Confirm は prep 由来要素を昇格させるための **modeler 専用拡張イベント** とし、  
+viewer では発生しない。

特に：
- Direct Spatial Editing  
- prep 導入（詳細は 6章）
- temp_point / temp_line の二段階昇格  
- 加速度付きホイール編集（continuous input）  
などは modeler 固有の拡張であり、  

common の原則を保持しながら編集体験を拡張する規範である。

## 0.3 適用範囲
本仕様は次を対象とする：
- `/code/modeler/` 配下の全モジュール  
  - Core  
  - UI  
  - Renderer  
  - Validator  
  - Importer  
  - Exporter  
  - Utils  
対象はブラウザ上で稼働する単一ページアプリケーション全体とし、  
ビルド手法やデプロイ方式は扱わない。

modeler は
- 表 UI（Data-entry mode）  
- 空間編集 UI（Visual Editing mode：Direct Spatial Editing あり）
の両モードを備え、本仕様は双方を包含する。

## 0.4 非対象

以下は本仕様では扱わない：
- viewer の内部構造・機能  
- `3DSS.schema.json` 自体のスキーマ仕様詳細  
- 各種拡張モジュールの意味論的仕様（latex, parametric 等）  
- Codex 等の実装エージェントの挙動  
- 外部環境やビルド手順  

本書は「modeler が編集アプリとしてどう振る舞うか」だけを規定する。

## 0.5 設計方針（編集アプリとしての前提）
modeler は以下の方針に基づいて設計される：
1. **スキーマ準拠最優先**  
   常に `3DSS.schema.json` に一致するデータだけを保存。
2. **編集／保存の完全一致**  
   UI で見える状態と保存される JSON が一致する。
3. **viewer との完全再現性**  
   viewer が modeler 出力を開いた際、100%同一の構造が再現される。
4. **UI 状態の非保存**  
   選択・カメラ・レイアウト・ホイール編集状態・Direct Spatial Editing 状態等は  
   すべて UI_state とし、構造データには書き戻さない。
5. **ローカル単体動作の保障**  
   スキーマと構造 JSON さえあれば、外部通信なしで完全動作。
6. **二段階生成（temp → Confirm → structure）**  
   prep/import で生じた temp_point / temp_line は構造データではない。  
   Confirm により正式 point / line へ昇格。
  ※ Confirm は temp 昇格の唯一のイベントであり、Add と厳密に分離する。
7. **import と export の完全分離**  
   import は作業入力、export は正規構造保存のみ。
8. **レイアウト／モードは state 扱いだが保存しない**  
   数値入力（common）と Direct Spatial Editing のどちらの入力も  
   同一の Update パイプラインへ流れる。
9. **入力型の共通化（5 分類）**  
   modeler 内のあらゆる値は以下の common 入力方式を使う：
   - Continuous  （position, scale, opacity など）  
   - Discrete    （frame, layer index 等）  
   - String      （name, description 等）  
   - Enum        （relation, sense, shape 等）  
   - Boolean     （表示フラグ等）  

   Direct Spatial Editing も continuous input の一種として扱う。

# 1章　システム全体構成（内部アーキテクチャ）
## 1.1 モジュール一覧

modeler は `/code/modeler/` を基点とし、次のモジュールで構成される：
| モジュール | 役割 |
|-----------|------|
| **Core**      | state 管理・編集イベント受付・差分生成 |
| **UI**        | 表 UI、3D UI、Direct Spatial Editing の入力処理 |
| **Renderer**  | three.js 描画・編集ハンドル表示・Raycast |
| **Validator** | 軽量／完全検証、スキーマ整合性チェック |
| **Importer**  | `.3dss-prep.json` から temp 要素を生成 |
| **Exporter**  | `.3dss.json` 出力（strict full validation） |
| **Utils**     | UUID / 小数処理 / speed_factor 計算など共通処理 |

## 1.2 内部依存関係（星型構造）
依存関係は Core を中心にした星型構造で統一する：

- UI → Core  
  - Add / Update / Remove  
  - Select / Hover  
  - Confirm（temp → structure）  
  - Direct Spatial Editing（continuous input として Core.update に統合）
- Importer → Core  
  （prep の temp 化）  
- Core → Validator  
- Core → Renderer  
  （差分描画・temp描画・ハンドル表示）  
- Core → Exporter  
- 各モジュール → Utils

Renderer は Core.state（structure）を read-only で参照し、
Direct Spatial Editing の編集処理は UI→Core.update に一本化する。

（Renderer が編集意図を直接 Core に送ることは禁止）

### 禁止事項（依存方向）
- UI → Renderer への直接描画命令  
- UI → Validator / Exporter の直接呼び出し  
- Renderer → Core の state 書き換え  
- Validator → Core の state 書き換え  
- Importer → Renderer （表示操作は Core 経由のみ）

## 1.3 各モジュールの責務

### Core

- 3DSS構造 + UI_state の唯一の保持者  
- add / update / remove / select / hover / confirm の受付  
- Direct Spatial Editing 用ハンドルの描画（編集意図は UI が判断し、Core.update へ正規化）
- Validator の結果に応じた state 再構成  
- Renderer への差分通知  
- Exporter への保存要求仲介  
- Undo/Redo 履歴管理（continuous input でも適切に分割）  
- temp_point / temp_line の保持と昇格

### UI

- 表 UI（一覧＋プロパティパネル）  
- ビジュアル編集 UI（3D 操作＋Direct Spatial Editing）  
- 入力型を common5分類に統一（continuous / discrete / string / enum / boolean）  
- Renderer からの Raycast 結果を受取り、Core に編集イベントとして橋渡し  
- ハンドルクリック → ホイール増減 → Core.update(position) という編集ループを構築  
- Confirm の実行トリガ

### Renderer

- Core state の 3D 表示  
- temp_point / temp_line の仮表示  
- 選択・hover の強調  
- 軸・原点ヘルパー  
- line 端点補正  
- **Direct Spatial Editing 用ハンドルの描画**  
  - 寸法線（stem）  
  - XYZ 軸ハンドル  
  - ラベル  
- Canvas 上のクリック／ホイールイベントを取得し UI へ通知（point ヒット判定）

### Validator

- incremental validation（編集時）  
- strict full validation（保存時）  
- 参照整合（ref → uuid）  
- 必須属性の未設定検出  
- tempは検証対象外

### Importer

- `.3dss-prep.json` の読込  
- name から temp_point を生成  
- 原点への仮配置（構造には含めない）  
- Confirm による正式 point 昇格を Core と連携

### Exporter

- strict full validation  
- 構造データの JSON 化  
- UI_state / temp / ハンドル情報は保存禁止

### Utils

- UUID  
- 小数処理  
- speed_factor 生成（continuous input）  
- Undo/Redo 補助

## 1.4 モジュール間通信の基本ルール

- UI → Core：  
  **唯一の編集パイプライン**  
  （Add / Update / Remove / Select / Hover / Confirm / Save）
- Core → Validator → Core：  
  検証後にのみ state 確定
- Core → Renderer：  
  差分だけ渡す（全体渡し禁止）
- Renderer → UI：  
  Raycast ヒット通知／ホイール入力の送信（編集意図は UI が判断）
- Renderer ↛ Core：  
  state を直接変えてはならない
- Importer ↛ Renderer：  
  表示操作は Core 経由のみ

Direct Spatial Editing では：
- Renderer がヒット対象を検出  
- UI が編集意図を解釈  
- Core.update() を発行  
- Validator → Core が state 更新  
- Core → Renderer が差分で描画  

という 1 本の統一ルートを守る。

---

Direct Spatial Editing（ホイール操作・ドラッグ操作）も  
continuous input として **UI → Core.update()** フローに統合される。

### フロー概観

1. **UI**
   - 連続量（continuous）／離散量（discrete）  
     → ホイール・ドラッグ・軸ハンドル  
   - 文字列（string）
   - enum（pulldown）
   - boolean（toggle）
   - すべて common 入力体系に基づく  
   - Raycast による point 選択も UI イベントとして扱う

2. **Core（編集イベント：add / update / remove / select / hover / confirm）**
   - 入ってきた UI操作を構造イベントに正規化  
   - temp → structure の昇格処理（Confirm）  
   - immutable state を更新  
   - Validator の OK/NG に従って更新確定 or 差し戻し

3. **Validator**
   - 編集時: incremental（部分検証）  
   - 保存時: strict full validation  
   - temp は検証対象外  
   - Direct Spatial Editing による連続更新も incremental check を通す

4. **Core（state 更新）**
   - Validator が OK のときのみ構造を更新  
   - 更新差分を生成

5. **Renderer**
   - 差分情報のみ受け取り 3D 表示を更新  
   - temp_point / temp_line / 軸ハンドル / 寸法線（stem）も描画  
   - 構造データは読み取り専用

6. **Exporter（保存時）**
   - strict full validation → JSON 出力  
   - UI_state / temp は一切保存しない

------------------------------------

### 2.2.1 UI → Core

UI から Core に渡される編集はすべて  
common 入力体系の 5 種類の入力のいずれかとして定義される：
- **continuous**（position / scale / opacity / rotation など）
- **discrete**（frame index など）
- **string**
- **enum**
- **boolean**

Direct Spatial Editing（ホイール/ドラッグ）は continuous input として
 **必ず UI→Core.update** を経由する（Renderer 直送は禁止）。

UI は Renderer に直接触れず、  
**必ず Core.update / select / hover / confirm** を呼び出す。

------------------------------------

### 2.2.2 Core → Validator

Core は編集イベントごとに Validator に  
編集対象の部分構造または全体を渡す。
- incremental validation  
  - 型、enum、最小 required 周辺をチェック  
  - 参照整合は任意  
- NG の場合  
  - state 更新しない  
  - UI にエラーを返す

temp は Validator に渡さない（対象外）。

------------------------------------

### 2.2.3 Core → Renderer（差分描画）

Core は state 更新後、Renderer に「差分のみ」を渡す。
Renderer は以下を描画更新する：
- 確定 point / line / aux  
- **temp_point / temp_line**  
- Direct Spatial Editing の表示要素  
  - 寸法線（stem）  
  - XYZ ハンドル  
  - ラベル  
- 端点補正（ビュー表示のみ）  
- frame 表示／非表示切替  

Renderer は構造データを書き換えず、常に read-only。

------------------------------------

### 2.2.4 Core → Exporter（保存時）

保存要求時のみ Exporter が呼ばれる。
Exporter は：

1. strict full validation を実施  
2. OK → JSON 出力  
3. NG → 保存失敗を UI に返す

保存されるのは **構造データのみ**。

保存しない要素：
- UI_state
- temp_point / temp_line
- 選択・hover
- Direct Spatial Editing の寸法線・ハンドル
- カメラ位置・FOV
- layout モード

------------------------------------

## 2.3 編集／保存時の整合チェック

### 2.3.1 編集時（incremental validation）
- 値変更ごとに incremental validation を実施  
- 型不一致・enum誤りなどは即時エラー  
- relation は optional（未設定でも NG にしない）  
- end_a / end_b が未確定の line は検証対象外（temp同等）  
- Direct Spatial Editing 中の position 更新もすべて incremental check 対象  

**重要：連続ホイール操作は Core.update が連続発火し、incremental check が高速に行われる。**

------------------------------------

### 2.3.2 保存直前（strict full validation）

Exporter が strict full validation を行い、  

以下を網羅的に検証する：
- type 完全一致
- enum 値の適合
- required
- additionalProperties:false
- ref → uuid（参照整合）
- frames（重複・範囲）
- geometry 配列長と型
- aux.extension のモジュール整合性
- uuid 重複禁止
- document_meta.version / schema_uri の一致

**1つでも NG → 保存不可。**

保存前に Core は未設定要素チェックを実施：
- point.position 未設定  
- line.end_a / end_b 未設定  
- text.content 未設定  

警告は出すが保存ブロックではない。  

最終的には strict validation が判定する。

------------------------------------

### 2.3.3 構造補正の禁止

modeler は構造を**自動補正してはならない**。
禁止例：
- point 削除 → line の端点を自動で他へ付け替える  
- name の自動生成  
- frame の自動追加  
- temp_point を自動で [0,0,0] として保存  
- 未確定 line の端点を自動推定  
- Direct Spatial Editing の補助線を構造へ書き込む  

補正はユーザの Update 操作として明示的に行われなければならない。

------------------------------------

### 2.3.4 UI 補助情報は Validator 対象外・保存禁止

保存対象外（UI_state扱い）：
- Direct Spatial Editing の寸法線、軸ハンドル、ラベル
- hover / 選択状態
- inline-edit パネル
- Z差補助、角度補助
- カメラ位置・FOV
- layout モード
- endpoint_edit 状態

UI だけの情報は構造データに混入しない。
Validator はこれらを検証対象としない。

------------------------------------

### 2.3.5 axes（軸スケール情報）

`.3dss.json` 内に axes.scale / axes.func が存在する場合：
- これは **構造データの一部** とみなし保存対象  
- modeler が UI_state として axes を調整しても  
  構造に書き戻すには明示的な Update が必要  
- Direct Spatial Editing の補助線の長さは axes.scale の影響を受けるが  
  逆に axes を編集しない限り構造へ反映しない

------------------------------------

---

### 3.4.1 UI の厳密規則
- スキーマ項目のみ表示  
- スキーマ順序を保持  
- enum → プルダウン  
- number → continuous / discrete 入力  
- null / undefined / empty は保存しない（UI で扱ってもよい）  
- nested → アコーディオン  
- orientation/rotation/offset → 3Dスライダーは任意 （構造補正は Core.update のみ）

禁止：
- 自動補正（丸め、0埋め、勝手な再計算）  
- 端点自動接続（line の強制補正）  

------------------------------------

## 3.5 新規追加（Add）UI

### 3.5.1 Lines の追加
- 最小テンプレート生成  
- end_a / end_b は未設定（編集時は許容・保存時に strict validation で検出）
- プレビューでは stem（仮ライン）として描画  
- Confirm で正式 line に昇格  

### 3.5.2 Points の追加
- uuid 付与済みの最小 point  
- 初期位置は [0,0,0]（UI 手動追加）
 ※ [0,0,0] は「未設定」ではなく **正規値としての初期位置** とみなす。  
 ※ point.position は構造データの必須プロパティであり、  
    “未設定（null/undefined）” を許可しない。  
 ※ prep→temp→Confirm でも、Confirm 時点で position が  
    必ず明示的に確定されている必要がある（0も合法）。
 ※ prep → temp_point の初期配置（原点仮配置）とは意味が異なる  
 - Add point：構造要素候補の作成  
 - prep temp：疎データの仮配置  
  → 両者を混同しないよう明記  
- Multi Add は v1.0 非対応  

### 3.5.3 Aux の追加
- module 選択 UI  
- 初期スケール・位置は仮配置  
- Aux は temp 要素を持たない構造要素であり、**Add により直接 structure に追加される。**
 （Confirm の対象は temp_point / temp_line のみである）
 Add された Aux は Add → incremental validation → state 反映 の通常フローに従う。
- Confirm の対象は temp_point / temp_line のみに限定され、Aux の確定には用いない。
  （3.6 / 5.3 / 5.4 / 6.3 と整合させるための修正）

※ Aux の初期値（position / scale / offset）は UI が渡す最小テンプレートに従い、
  Core.add の incremental validation を通過した時点で正式要素となる。

### 3.5.4 Document_meta
- 新規生成なし（固定）  

------------------------------------

## 3.6 編集（Update）UI

### 3.6.1 原則
- 入力変更 → Core.update  
- Validator（incremental）OK → state 更新  
- NG → 差し戻し  
- Direct Spatial Editing のドラッグ／ホイール編集も Update  
- 操作中は寸法線（stem）と XYZ ハンドルが表示される  
- 連続ホイール操作は一定時間内でひとまとまりとして Undo/Redo に積む  

### 3.6.2 編集代表例
- point.position の continuous 編集  
- line.signification.sense の enum  
- marker.color の string  
- frames の discrete 編集  

------------------------------------

## 3.7 削除（Remove）UI

### 3.7.1 Lines
- 常に削除可能（参照されない）  

### 3.7.2 Points
- line の端点に使われている場合は Validator NG  
- 「関連 line の同時削除」機能は提供しない  
  → かならず手動で line 削除 → point 削除  

### 3.7.3 Aux
- 常に削除可能  

### 3.7.4 Document_meta
- 削除不可  

------------------------------------

## 3.8 選択（Select）UI

### 3.8.1 一覧で選択
- Core.select  
- プロパティ編集パネルと同期  
- context メニュー（右クリック）は任意  

### 3.8.2 プレビューで選択
- Raycast → Core.select  
- 選択体は highlight  
- 一覧とも双方向同期  

------------------------------------

## 3.9 Hover（ホバー）
- Raycast → Core.hover  
- 構造データに影響なし  
- temp に hover を当てない（誤操作防止）  
- hover は補助的強調表示のみ  

------------------------------------

## 3.10 UI 禁止事項
1. enum を自由入力にする  
2. uuid を編集させる  
3. viewer UI 表現の流用  
4. 不正値の自動補正  
5. スキーマ外項目の表示  
6. カメラ状態を構造データへ保存  
7. inline-edit による自動構造補正  
8. prep データを自動で保存構造に変換  
9. 保存時・切替時のカメラ強制リセット  

------------------------------------

---

# 4　三次元描画と編集カメラ（modeler 専用）

--------------------------------------------

# 4.1 描画システムの位置づけ
modeler の描画は次の原則に従う：
- **Core.state を読み取り専用** で扱う  
- **差分描画** を基本とし、全再描画を避ける  
- **appearance.* を忠実に反映**（スキーマ準拠）  
- **編集 UI 専用オーバーレイ（stem, ハンドル, ラベル）** を合成表示  
- **構造データを書き換える処理を禁止**  
- **Importer の temp_point / temp_line を補助レイヤで描画**

長尺アニメーションや HUD ダッシュボード等の「鑑賞用演出」は v1.0 では実装対象外とし、  
編集補助に必要な最小限の表示に限定する。

--------------------------------------------

# 4.2 描画対象（Points / Lines / Aux / Temp）
Renderer は 3DSS の構造を three.js シーンへ写像する。

## 4.2.1 Points
- marker.shape に応じた標準ジオメトリ  
 （sphere / box / cone / pyramid / corona など）
- color / opacity / scale / orientation など appearance.* を忠実反映  
- position[x,y,z] は Object3D.position に直写  
- marker.gltf.url が指定されていれば **glb を優先**  
- glb の orientation / scale / offset は Object3D に適用  
- glb 読み込み失敗時：**fallback として sphere を描画し UI に警告（構造には書かない）**  
- Direct Spatial Editing 操作中は、選択 point に XYZ ハンドルを付与する（後述）

## 4.2.2 Lines
- line_type（straight / polyline / bezier / catmullrom / arc）に応じて geometry を生成  
- point の端点座標を読み取り、line_type に従い再計算  
- arrow（shape / placement）を描画（見た目のみ）  
- appearance.effect.* は 3DSS 構造データに保存される外形情報であり、  
  Renderer は effect_type（pulse / flow / glow など）に応じて視覚効果を実装する。  
  再生中フラグや進行度などのランタイム状態は UI_state として扱い、構造に書き戻さない。  
- **端点補正（Endpoint Correction）：**  
  point の marker.shape に合わせ、line の端点を見た目上補正する（構造データは変更しない）
- Direct Spatial Editing により point が移動する場合：  
  → line は即時に形状再計算されてプレビューに反映される

## 4.2.3 Aux
- grid / axis / shell / plate / hud / image を描画  
- すべて「視覚補助」であり、構造データの意味とは無関係。  
 **注意：aux.axis（表示用）と  

 document_meta.axes（スケール・座標軸の解釈ルール）は別物であり、  
 同名だが性質が異なるため混同禁止。**  

 aux.axis は UI 補助に属し、document_meta.axes は structure（構造データ）に属する。
- image module（png/jpeg/webp）は plane に texture を貼る  
- texture 読み込み失敗時は "Image Not Found" プレースホルダ  
- orientation / scale / offset を Object3D に反映

## 4.2.4 Temp（Importer／UI 補助レイヤ）

### temp_point（未確定 point）
- 原点または importer 定義位置に仮配置  
- 半透明・点線アイコンなどで表示（スタイルは任意）  
- hover 無効、選択不可（確定前の誤操作防止）

### temp_line（未確定 line）
- end_a / end_b が存在しない場合でも仮ラインとして点線描画  
- 両端点は未確定として UI ハイライト  
- Confirm されるまで構造データに含めない

--------------------------------------------

# 4.3 描画更新の原則（差分レンダリング）

Renderer は Core から受け取る差分オブジェクトをもとに更新する。
- **Add**：新規 Object3D を生成  
- **Update**：該当 Object3D の position / scale / color などを更新  
- **Remove**：該当 Object3D を破棄  
- **Replace**（temp→本要素）：一旦破棄して正式要素を再描画  
- **Frame 切替**：可視状態を切り替え  
- **Visibility**：ON/OFF の切替  

### 目的
- 追加・更新・削除が **0.3 秒以内に反映される** よう最適化  
- 大規模構造（3000–5000 point / line）でも操作遅延を最小化  
- 不要な全再描画を避け、orbit / zoom / pan は 60fps を維持する

--------------------------------------------

# 4.4 カメラ仕様（編集専用）

modeler のカメラは **編集効率最優先** の構成とする。

## 4.4.1 基本操作
- **wheel** → zoom  
- **left-drag** → orbit  
- **right-drag** → pan  
- **Z+ を常に up**（固定）  
- **freeXY**：自由な視点回転（roll は UI では使わない）

## 4.4.2 初期カメラ位置
- 原点から一定距離  
- 軸が明瞭に見える角度  
- structure 全体が収まる zoom

## 4.4.3 カメラ状態の扱い
- カメラ位置 / zoom / orbit / pan は UI_state  
- **.3dss.json に保存しない**  
- 保存時・ロード時にカメラを自動で初期値に戻す挙動は禁止（ユーザ混乱防止）

## 4.4.4 Auto-Rotate（旋回モード）

動画キャプチャを目的とした専用モード。
- 編集カメラとは完全別の独立カメラ  
- ON/OFF は UI_state のみで扱い、保存しない  
- 角速度・方向・ターゲット位置を UI で調整可能  
- 出力は PNG 連写（Exporter）が担当するため Renderer はフレーム描画に専念

+ ※ auto-rotate は「編集内容の確認／動画キャプチャ専用」の補助モードとし、  
+   通常の編集カメラ（マウス操作）とは責務を分離する。

--------------------------------------------

# 4.5 選択・ホバーの描画挙動

## 4.5.1 Select（選択）
選択された要素を Renderer が強調表示：
- 色変更  
- 太さ強調  
- glow（軽度の輪郭強調）  
- ラベル表示（任意）

**構造データには一切影響を与えない。**  

すべて Renderer 内部の UI レイヤで処理する。

## 4.5.2 Hover（ホバー）
- マウス hover された要素を軽くハイライト  
- temp 要素への hover は無効  
- 影響はあくまで UI の視覚補助のみ  
（Core.state に書かない）

--------------------------------------------

# 4.6 Frame（frames）と表示制御

## 4.6.1 表示ルール

active_frame = n のとき：
- frames に n を含む要素 → 表示  
- 含まない要素 → 非表示  
- frames 未定義 → 常時表示

## 4.6.2 表示補助（任意機能）
ビジュアル編集モードでは：
- 非表示 frame でも **選択中の要素を半透明で可視化** するオプションを提供  

　（構造データには保存しない）

## 4.6.3 非表示 ≠ 削除
- 非表示は破壊操作ではない  
- 構造データとしては保持され、Exporter ではすべて出力される

--------------------------------------------

# 4.7 レンダリング禁止事項
Renderer は **表示専用** のため、次は禁止：
1. 位置の自動補正（丸め、中心揃え）  
2. 色の自動調整（自動ハイライト）  
3. geometry の補完・自動 spline 化  
4. frame の推論  
5. line の端点（end_a/b）を **構造データ側で自動修正すること**  
    （表示専用の endpoint correction は許可。  
      Renderer は「見た目としての補正」を行うことがあるが、  
      構造データへの書き込みは禁止。）  
6. UI 効果（寸法線・角度線など）を構造データへ書き込む  
7. viewer 専用 UI の混入  
8. glb / image の解像度変更・圧縮変更  
9. リソース読込失敗時に構造を変更する（fallback 表示は可）  
10. temp を自動で正式構造へ変換する  
11. Direct Spatial Editing の結果を Renderer が直接 state に書き込む

**Renderer は編集ロジックを持たない。  

あくまで Core と UI の視覚インタフェースである。**

--------------------------------------------

# 4.8 描画性能（Non-Functional Requirements）
- Add / Update / Remove → **0.3秒以内に描画反映**  
- frame 切替 → **100ms 以内**  
- orbit / pan / zoom → 大規模データでも **60fps に近い性能**  
- 3000+ points, 3000+ lines でも操作遅延を最小化  
- LOD（Level of Detail）適用可：  
  - 遠距離では補助描画を省略  
  - 衝突判定の簡略化  
  （ただし構造データには一切影響させない）

--------------------------------------------

# 5章　編集イベントとデータ処理（Core 中心）
本章は modeler の中心である **Core の編集処理フロー** を定義する。  
Direct Spatial Editing（空間直接編集）・Importer（prep）・temp 要素体系との整合も含めて完全再構成する。

Core は唯一の “構造データの変更権限保持者” であり、  
UI / Renderer / Importer / Exporter のどれも Core を迂回して構造を書き換えてはならない。

--------------------------------------------

# 5.1 編集イベントの基本語彙（modeler 固有 6 種）
common 仕様と modeler 拡張を統合し、  
編集イベント語彙は次の 6 種類に **完全固定** する。
- **Add**（新規追加）  
- **Update**（プロパティ編集）  
- **Remove**（削除）  
- **Select**（選択）  
- **Hover**（ホバー）  
- **Confirm**（確定 — temp の昇格）  

### Confirm の位置づけ
Confirm は modeler 固有の追加語彙であり、
**import（prep）由来の temp_point / temp_line を  
「正式な point / line」へ昇格させる唯一のイベント**
である（viewer 側では Confirm イベントは発生しない）。

- Add と異なり「既存の temp を構造化する」ための操作  
- temp の UI_state → 正式構造へ変換  
- Validator → Renderer → Exporter の通常フローに入るのは Confirm 後のみ  

### 禁止

- これ以外の語彙（duplicate / merge / auto-connect / replace など）は定義しない

--------------------------------------------

# 5.2 Core が扱う内部 state

Core は modeler 内の **唯一の state 管理者** であり、  
構造データと UI_state を厳格に分離した形で保持する。

```json
{
  "document_meta": {},
  "points": [],
  "lines": [],
  "aux": [],
  "ui_state": {
    "selected_uuid": null,
    "hovered_uuid": null,
    "active_frame": 0,
    "panel_state": {},
    "filter_state": {},
    "mode": "table" | "visual",
    "endpoint_edit": null,
    "auto_rotate": false,
    "camera_state": { "position": [], "target": [], "distance": 0 }
  },
  "temp_elements": {
    "temp_points": [],
    "temp_lines": []
  }
}
```

## 5.2.1 UI_state と構造データの分離の原則（前倒し固定）
modeler は以下の UI_state を構造データへ絶対に混入させない：
- selected_uuid / hovered_uuid
- camera_state（position / target / distance）
- layout / mode
- endpoint_edit
- auto_rotate
- Direct Spatial Editing の stem / handle / label
- temp_points / temp_lines（構造データへ混入禁止）

これらは **保存せず**、Validator も検証しない。
Exporter は出力しない。

## 5.2.2 temp 要素の扱い（構造データと完全分離）
Importer により prep が読み込まれると、
`temp_points`（位置未確定）・`temp_lines`（端点未確定）が UI_state に登録される。

temp は **構造データではない UI_state** であり：
- Validator に渡さない  
- 保存に含めない  
- Core.state.points / lines に混入させない  
- Confirm を経ずに structure（points/lines）へ昇格させない 

これは modeler の基本原則  
「prep → temp → Confirm → structure」  
を必ず守る。

---

## 5.2.3 UI_state の拡張
Direct Spatial Editing を踏まえ、UI_state は次を保持する。
- `mode`: table / visual  
- `endpoint_edit`: line の端点編集状態  
- `auto_rotate`: （動画キャプチャ用）  
- `camera_state`: { position, target, distance }（保存禁止）  

UI_state は構造データとは完全に分離され、
Exporter は UI_state を一切出力しない。

---

## 5.2.4 重要原則（State の取り扱い）
- 構造データは **immutable**  
- state 内部順とは独立（出力順＝正規順）。詳細は 6.4.3。
 ※ **schema properties 順は structure 部分（lines / points / aux / document_meta）にのみ適用**し、
    UI_state / temp_elements は順序規範の対象外とする。- UI_state と構造は **永続的に分離**  
- Core.state は **deep clone 再構成のみ**  
- mutate（直接書換）禁止  

 ※ 注意： 
 state = structure + UI_state だが、  

 history（Undo/Redo）は structure のみを扱い、UI_state・temp は対象外。
 → 「history は structure 部分のスナップショット」。  
    UI_state は mutate 可とし、immutable 規範の対象外とする。

---

## 5.3 Add（新規追加）

### 5.3.1 基本フロー
UI → Core.add → Validator（軽量） → Core.state 更新 → Renderer（差分描画）
※ **重要：temp の昇格は Add ではなく Confirm が唯一担当。**

初期位置は **[0,0,0]（UI 手動追加時の正規初期値）**。
 ※ Add における [0,0,0] は “正規の構造初期位置”。
    prep → temp → Confirm の仮配置 [0,0,0] とは意味が異なる。
    両者の混同を避けるため、本章・6章・7章に統一して明記した。

### 5.3.2 Add 対象
- points  
- lines  
- aux  
- document_meta（Add 不可）

### 5.3.3 Add の規則
1. uuid は Core が自動生成  
2. UI は「スキーマ必須項目のみの最小テンプレ」を Core に渡す  
3. line の端点未設定は “Add 時は許容” だが、
 **Confirm では未確定端点のまま昇格を禁止** とする（5.4.6 / 6.3 / 7.2 と統一）。
4. 配列末尾への追加（sort 禁止）

### Add 禁止事項
- uuid の手動入力  
- 自動補完（line 自動生成、name 自動生成など）  
- 必須でない既定値の勝手な注入  

---

## 5.4 Update（プロパティ更新）

### 5.4.1 基本フロー
UI → Core.update → Validator（incremental） → state 更新 → Renderer 反映

### 5.4.2 Update 対象
- points  
- lines  
- aux  
- document_meta  

※ temp_point / temp_line は Update 対象ではなく UI_state 更新となる。

### 5.4.3 Update の要件
1. uuid による対象特定  
2. immutable 更新（deep clone → replace）  
3. UI 補助値の混入禁止  
4. Validator NG → state 差し戻し → UI エラー返却

### 5.4.4 Direct Spatial Editing の Update
- point の 3D ドラッグ移動  
- line の端点ドラッグ移動  
Direct Spatial Editing 操作時、**編集ハンドルの描画は Renderer が担当**する。
- UI はハンドル操作の意図を解釈し、**必ず Core.update() を発行**する。
- Core は編集処理ロジックを持たず、純粋に state 更新と Validator 連携のみを行う。

### 5.4.5 temp の Update
- temp_point.position などの変更は UI_state のみ  
- 構造 state へ混入させない  
- Validator に渡さない

### 5.4.6 Confirm の責務明確化
Confirm は temp → structure の **唯一の昇格イベント**。
実施するチェックは次の最小限に限定する：
  - uuid 発行
  - name の存在
  - （line の場合）**end_a / end_b の両端点が確定済みであること**
    → 未確定 line は Confirm 不可

※ Confirm は **strict full validation を実行しない**。  
　完全検証は保存時（Exporter）の strict full validation のみで行う。  
　Confirm は temp の混入を防ぐための「最小限の構造化チェック」に限定する。

### Confirm ボタンの UI 規範（追加）
UI は end_a / end_b のいずれかが未設定の場合、  
**Confirm ボタンを disable（押下不可）とする。**  

これにより不完全 line の誤昇格を防止する。
strict full validation は行わず、保存可能性は保証しない。
temp の不完全構造を structure へ混入させないための必須強化。
Add/Update/Remove は temp を扱わない。Add = “新規作成”、Confirm = “昇格”。

### Update 禁止事項
- 空欄の暗黙補完  
- geometry の補完・自動調整  
- string → number の暗黙型変換禁止（number input に string が来た場合は incremental NG） 
 ※ number input 欄に string が入った場合、  

 incremental validation NG を即返すことを明記。  
- enum の自由入力  

---

## 5.5 Remove（削除）

### 5.5.1 フロー
UI.remove → Core.remove → Validator（参照整合） → state 更新 → Renderer

### 5.5.2 Remove のルール
1. line は常時削除可能  
2. point 削除時、端点として利用されていれば Validator NG  
3. aux は常時削除可能  
4. document_meta は削除不可（単一固定）  

### 5.5.3 temp の削除
temp_point / temp_line は構造に含まれないため  
UI_state から単に破棄してよい。

---

## 5.6 Select（選択）

Select は構造データに影響しない。  
UI_state のみ更新する。
- Core.ui_state.selected_uuid ← uuid  
- Renderer で強調表示  
- プロパティパネル更新  

line 選択中に end_a / end_b をクリックすると  
`endpoint_edit = { uuid, target }` を設定し、  
以降の point クリックが「端点再接続」になる。

### Select 禁止事項
- 選択状態を構造データに保存  
- Validator の対象にする  

---

## 5.7 Hover（ホバー）
Hover も UI_state のみを更新する。
- Core.ui_state.hovered_uuid ← uuid  
- Renderer が軽く強調  

※ temp_point / temp_line は hover 対象外。


------------------------------------

# 5.8 折れ線モード（Polyline Editing Mode）

## 5.8.1 位置づけ
line の appearance.line_type が `polyline` または `polyline_round` の場合に  
折れ線編集（中間折れ点の追加・移動）を可能とする **編集 UI モード** を追加する。

構造データ（3DSS）は polyline を許容しているため、  
新規スキーマ変更は不要とし、modeler 側の編集 UI と Core.update のみで実現する。


## 5.8.2 発動条件（トリガー）
折れ線モードは以下いずれかで発動する：

1. ユーザが appearance.line_type を  
   `straight` → `polyline` / `polyline_round` へ変更したとき  
   → 折れ点（control point）が 1 個自動生成される（UI_state）

2. line 選択中に  
   右クリックメニュー「折れ点を追加」を実行したとき  
   → 中間点を 1 個生成（UI_state）

3. 折れ点が存在する状態で line を再選択したとき  
   → 折れ線編集 UI（ハンドル）が再表示される

※ 自動で polyline に切替わることはない。  
　line_type = straight の場合、折れ線編集 UI は表示されない。


## 5.8.3 折れ点の扱い（UI_state）
折れ点（mid-point）は **UI_state のみ** に保持し、  
Core.state.lines[].geometry への書き込みは  
ユーザが折れ線を確定した瞬間（Update）でのみ行う。

- 折れ点は Renderer が表示する編集ハンドルとして UI_state に属する  
- 位置移動は continuous input として UI → Core.update  
 Core.update 後、geometry.points を再構成し構造へ反映する

構造データには「折れ点を持つ最終 polyline の座標列のみ」を保存する。


## 5.8.4 自動生成ルール（初期折れ点）
line_type の変更時または「折れ点追加」時には、次の初期位置を自動生成する：

- start と end の中間に軸揃えした折れ点  
 (例) x が一致していれば (x, mid(y1,y2), z1) のように  
 明確な“軸方向折れ”となる座標を UI_state に生成

この自動初期点は UI_state のみであり、構造データを自動補正しない。


## 5.8.5 角度スナップ（Angle Snap）
折れ点ドラッグ時、折れ線角度に次のラッチを適用できる：

- 15°（デフォルト）
- 7.5°
- 5°（精細）

UI のホイール・ショートカットにより角度スナップ値を切り替える。  
スナップは UI_state 内の補助動作であり、構造データへ角度値は保存しない（座標のみ保存）。


## 5.8.6 座標スナップ（Grid-like Snap）
折れ点ドラッグ中は次のスナップ候補に吸着可能：

- X/Y/Z の整数値  
- 0.5 / 0.25 刻み  
- grid spacing（設定による）  
- 既存 point の座標  
- 既存 line の延長方向

座標スナップも UI_state の補助であり、構造データに意図せず補正値を書かない。


## 5.8.7 確定（Update）タイミング
- 折れ点ドラッグ終了
- 角度スナップ変更後にユーザが離した瞬間
- 折れ点追加後にユーザが「確定」操作（Update）を押した時

上記のタイミングで Core.update により  
geometry.points が polyline として **正式構造データ** に書き込まれる。


## 5.8.8 禁止事項
折れ線モードに関して以下を禁止する：

1. 折れ点の自動追加／自動削除（ユーザ操作なし）  
2. 角度スナップの自動変更  
3. UI_state の折れ点を構造データへ黙って書き込むこと  
4. 折れ点を 2 個以上自動生成すること  
5. polyline を勝手に straight へ戻す補正  
6. スナップ情報を構造へ保存（構造保存は座標列のみ）

------------------------------------

---

## 5.9 Undo / Redo
Undo / Redo の対象は **構造データだけ**。  
UI_state・camera・選択・layout・temp は履歴対象外。

### Undo
- past の末尾を present に反映  
- 直前の present を future へ  

### Redo
- future の先頭を present に反映  
- present を past へ  
- 新しい編集イベントが発生したら future を破棄  

---

## 5.10 差分生成（Renderer 連携）
Core は state 更新時に Renderer へ **差分のみ** を渡す。
差分種別：
- Add  
- Update  
- Remove  
- Replace（temp → structure 昇格）  
- frame 切替  
- visibility 変更  

Replace は Add+Remove ではなく **昇格専用の差分** とする。

### 差分伝達の禁止
- Renderer に state 全体を渡す  
- Renderer が構造データへ書き込む  

---

## 5.11 Core における禁止事項（絶対）
Core が行ってはならない操作：
1. mutable 更新  
2. 座標の丸めや中央揃えなどの暗黙補正  
3. uuid の書き換え  
4. UI_state → 構造データへの混入  
5. 構造 → UI_state の逆同期  
6. 推測による自動初期化  
7. スキーマ外プロパティの追加  
8. Validator のバイパス  
9. 保存時以外で full validation 実行  
10. temp の自動昇格  
11. Confirm なしで temp を structure に混入（重複項目の統合）
    ※ 旧16項目は統合したため削除
12. endpoint_edit を構造に書き込む  
13. auto_rotate を構造に書き込む  
14. Renderer が direct-edit の座標を直接 state に反映することを許可  
15. Add/Update で temp を扱う  

Core は「構造の唯一の入口・出口」であり、Validator の判定が絶対となる。

---

# 6　入出力仕様（modeler I/O）

modeler の I/O は  
**「正規構造データの保存」** と **「作業入力（prep）」** を厳密に分離して扱う。
このとき Validator 層は、3DSD-common.md 5.4 で定義された
- 3DSS-validator（3DSS.schema.json 準拠チェック）
- internal-model-validator（内部 scene graph 構造チェック）
の 2 系列を前提とする。

I/O は次の 3 系列で構成される：
1. **構造ファイル入出力（.3dss.json）** … 正規
2. **prep インポート（.3dss-prep.json）** … 作業入力
3. **パーツ読込み（2D/3D 素材）** … 補助であり構造に含めない

export は “構造データの静的出力” に限定し、  
動画キャプチャ・PNG連番は I/O には含めない（View 機能扱い）。

---

## 6.1　入力（Input）体系
modeler が扱う入力は次の 3 種類。

---

### 6.1.1　正規構造ファイル（.3dss.json）
- **用途**
  - 完成した 3DSS の編集再開
  - viewer が単独で扱える唯一の構造形式
- **読込要件**
  - 3DSS.schema.json に完全準拠していること
  - スキーマ外プロパティは全て NG
  - 3DSS-validator による検証を必須とし、internal-model-validator はあくまで
   変換後 Model の健全性チェック（警告用途）のみとする

- **読込フロー**
 UI  
  → Core.loadRequest  
  → schema_uri / version check  
  → 3DSS-validator（Ajv + 3DSS.schema.json による strict 検証）  
     ※ version mismatch は full validation より前に中断する。  
  → importer_core（3DSS ドキュメント → internal Model 変換）  
  → internal-model-validator（scene graph 構造チェック／NG でも警告のみ）  
  → Core.state に反映（Model を single source of truth として保持）  
  → Renderer 再構築

- **NG時**
 - 3DSS-validator NG → 読込中止
  - Core.state を汚さない
  - UI に path（JSON Pointer 等）付きでエラー返却
 - internal-model-validator NG → 読込は継続
  - ログ・開発用パネルに警告を残す（scene graph 実装側の問題として扱う）
  - 保存フローではあらためて 3DSS-validator を通過したデータのみ `.3dss.json` として出力する

---

### 6.1.2　prep（.3dss-prep.json）入力
prep は構造データではなく、  
**疎情報**をそのまま受け取る “作業入力” として扱う。
- **特徴**
  - name さえあれば受理
  - 欠落（position / relation / marker 等）は許容
  - 3DSS-validator の対象外（/schemas/3DSS.schema.json 準拠は要求しない）
  - Importer 内で name 等の最小限の構造チェックのみ行う
  - temp_point / temp_line として UI_state に格納
  - Confirm で初めて構造データに昇格
- **読込フロー**
  UI  
   → Importer.readPrep  
   → Core.temp_elements（temp_points / temp_lines）  
   → Renderer 仮表示（補助レイヤ）
- **Confirm 時の扱い**
 - temp_elements から 3DSS ドキュメント（lines / points / aux / document_meta）を生成し、
  保存前に必ず 3DSS-validator ＋ internal-model-validator を通過させる  
 - これにより、prep 入力はあくまで「作業用の疎データ」であり、
   正規 `.3dss.json` は常に 3DSS.schema.json に準拠した完全整合データとなる
- **用途（例）**
  - LLM の生成リスト
  - OCR / 外部DB の抽出結果
  - 手入力の名称一覧
  - 前段の概念マップ等

---

### 6.1.3　パーツ読込み（2D/3D 素材）
modeler は構造と別に **付属パーツ** を読込む：
- **2Dパーツ**：PNG / JPG / WEBP  
  → aux.image.texture として利用
- **3Dパーツ**：GLB  
  → point.marker.gltf.url として保持
- **規範**
  - これらは「import」と呼ばない  
    → addImage / addGLB / attachParts など別語彙
  - バイナリを .3dss.json に埋め込まない（URL のみ）
  - Viewer が読める形で参照文字列を維持する

---

## 6.2　出力（Output）体系
出力は **.3dss.json のみ**。  
export は構造データの静的保存に限定。

動画キャプチャ・PNG連番生成は Renderer / View の機能。

---

### 6.2.1　.3dss.json（正規構造データ）
- **出力対象**
 （document_meta.axes を含む。axes は構造データの一部であり UI_state ではない）
  - lines
  - points
  - aux
  - document_meta

- **出力しない**
  - ui_state
  - temp_elements
  - auto-rotate
  - camera / layout
  - editor 内部情報
  - パーツバイナリ（URL のみ保持）

- **保存フロー**
  Core.saveRequest  
   → Exporter  
   → Validator（strict full validation）  
   → JSON 生成  
   → 保存

- **strict full validation 内容**
  - required
  - enum
  - additionalProperties:false
  - 参照整合（ref→uuid）
  - 配列長
  - frames の重複
  - 位置未設定などの最終検査

NG の場合は保存しない。

---

## 6.3　構造データ生成プロセス（I/O視点）
構造データは必ず次の段階を踏む：

**prep → temp_elements → Confirm → structure → export**
※ **Aux は temp/Confirm の対象外**。  

　Aux は Add により直接 structure に追加され、temp_elements には入らない。  

- **temp（仮状態）**
  - 構造データではない
  - Validator にかけない
  - 保存に含めない

- **Confirm（確定）**
  - temp_point → point
  - temp_line → line（※ **端点未確定の場合は Confirm 不可**）
  - 構造データに昇格し Validator 対象となる

- **export**
  - 仕上がった構造を strict full validation 後に保存

---

## 6.4　JSON 出力規範

### 6.4.1 null 禁止
null を出力しない。  
未設定項目は key ごと省略。

### 6.4.2 順序規範
出力順序は **3DSS.schema.json の properties 順に完全統一**。
この規範は *structure 部分（lines / points / aux / document_meta）* のみ対象とし、  
UI_state / temp_elements には適用しない。  
（出力順は schema の properties 順のみを基準とする）

state 内部順とは独立（出力順＝正規順）。詳細は 6.4.3。

### 6.4.3 state 内部順との関係
state 内部順は **実装依存** とし、schema properties 順を強制しない。
内部メモリ構造の順序は保存順に影響せず、Exporter が schema 順へ正規化するためである。

### 6.4.4 浮動小数点
- 必要最小桁のみ（0.30000 → 0.3）
- 1e−12 以下は 0 としてよい（任意）

### 6.4.5 uuid
- Add 時に発行されたものをそのまま使用  
- 保存時の uuid 再発行は禁止

---

## 6.5　保存（Save）操作
- 保存は **明示操作**
- strict full validation を必ず通す
- 部分保存（pointsだけ等）は不可
- document_meta.version.patch の自動加算は任意（UI設定）
- エラー時は保存を行わない

UI には path つきで NG 内容を返す。

---

## 6.6　読み込みと保存の非対称性
| 要素            | 読込        | 保存        |
|----------------|-------------|-------------|
| ui_state       | 読込まない   | 出力しない   |
| camera         | 読込まない   | 出力しない   |
| hover          | 読込まない   | 出力しない   |
| temp           | 読込不可     | 出力不可     |
| 構造整合性       | 必須         | 必須         |
| マイグレーション | 行わない     | 行わない     |

保存は strict、読み込みも strict & 無補正。

---

## 6.7　I/O 禁止事項
1. UI 状態の保存（選択・hover・camera など）
2. パーツバイナリの base64 埋め込み
3. prep の自動構造化（必ず Confirm 経由）
4. 読込時の自動修復・推測補完（構造補正）
5. スキーマ外キーの出力
6. 端点補正・丸めなどの自動補正
7. 外部 URL の自動変換
8. 旧バージョン 3DSS の自動マイグレーション
9. temp を structure に混入
10. auto-rotate の状態を保存

---

# 7 検証・エラー処理（Validator 連携）

## 7.1 検証システムの位置づけ

modeler の Validator は  
**3DSS.schema.json に完全準拠した唯一の判定装置** である。
- Core / UI / Renderer は Validator の判定を上書きできない。
- 編集結果・保存結果はすべて Validator の判定に従う。
- Importer により読み込まれた temp_point / temp_line は  
  「構造データ」ではなく UI_state であるため、Validator の対象外。

---

## 7.2 検証の 2 段階方式（軽量／完全）
編集アプリである modeler は、以下の **2段階検証方式** を採用する：
1. **編集時（incremental validation）**  
   → 更新された局所部分のみを高速チェック  
2. **保存時（strict full validation）**  
   → 構造全体をスキーマへ照合する完全チェック

役割が異なるため両方必要。
### Confirm（temp → structure 昇格）について
- Confirm は **full validation を行わない。**
- uuid 発行・name 確認など、昇格に必要な **最小限の structural check のみ** を行い、
  full validation は **保存時（Exporter）でのみ実施**する。

---

## 7.3 編集時の軽量検証（Incremental Validation）

### 7.3.1 対象
- Add / Update / Remove の対象要素のみ
- temp は対象外（構造でないため）

### 7.3.2 目的
- 編集反映の即時性
- ユーザが誤入力に即座に気付けること

### 7.3.3 チェック内容
- 型チェック（number / string / boolean / object / array）
- enum チェック
- required（変更周辺のみ）
- 配列長（geometry など）
- additionalProperties:false
- JSON 破損検知
- line geometry の型整合
- color / opacity の値域チェック
※ **参照整合（ref→uuid）は任意**  

　保存時の full validation で必ず検出される。

### 7.3.4 NG 時の動作
- Core は state を更新しない
- UI にエラー返却
- 値を直前の状態に戻す
- エラー箇所の UI 強調

### 7.3.5 prep 由来項目の扱い
- prep の name → temp_point 生成直後の [0,0,0] は “仮配置” であり NG にしない。
 ただし Confirm 時には明示的に位置を設定している必要がある。

 Add point の [0,0,0]（正規初期位置）とは意味が異なることを明示し統一。

### 7.3.6 3D direct-edit（ドラッグ）操作
- point 位置ドラッグ中も軽量検証発動
- number である限り NG にはしない（負荷軽減と操作性優先）

---

## 7.4 保存時の完全検証（Strict Full Validation）

modeler は **唯一の authoring tool** であるため、  
保存時は **完全に正しい構造のみ** 保存を許可する。

### 7.4.1 対象
- lines 全体
- points 全体
- aux 全体
- document_meta 全体
- 参照整合（end_a / end_b）

### 7.4.2 チェック項目（必須）
- type（型完全一致）
- enum（未定義値は NG）
- required（全必須項目があること）
- additionalProperties:false
- ref→uuid の整合
- frames の重複・範囲
- geometry の正確性
- aux.extension のモジュール構造
- version / schema_uri の正当性
- uuid 重複禁止

### 7.4.3 axes の検証規範
axes は **構造データの一部（structure）** であり、UI_state ではない。
この扱いは viewer / modeler 共通とし、3DSD-common.md に定義された axes 仕様に従う。
 
Renderer は axes を「編集 UI の補助線」として扱わず、
表示補助の影響が構造データへ波及しないようにする。

- type: object  
- scale: number[]（任意、additionalProperties:false）  
- func: string（enum: linear | log | …、スキーマ準拠）  
- 未設定は許容  
- 追加キー禁止  

## I/O との整合
axes が存在する場合は構造データとして必ずそのまま保存し、  
未設定時は key ごと省略する（null 禁止）。  
これは 6.2（出力体系）にも準拠する。

### 7.4.4 NG 時の動作
- Exporter は保存を中止
- Core.state は変更しない
- UI にエラー内容を返す（path / message）

### 7.4.5 パーツ参照（URL）について
- glb / image の URL が実在するかどうかは構造チェック対象外  
 （構造とリソースの分離）
- url=""（空）は NG（required 違反）

### 7.4.6 temp 要素の排除
- temp_point / temp_line が残っている状態では保存 NG
- 保存前に UI が警告ダイアログを表示

---

## 7.5 エラーの種類と扱い

### 7.5.1 スキーマ違反エラー（Schema Error）
- type mismatch
- missing required
- enum 不一致
- 追加キー
- JSON 破損
→ すべて Validator による判定。

※ temp の混入もスキーマ違反として検出される。

---

### 7.5.2 参照整合エラー（Reference Error）
- point 削除時に line が参照している
- end_a / end_b が存在しない uuid を参照
- aux が参照する対象が欠落
→ 保存時の strict validation で必ず検出。
- endpoint_edit の未確定状態で保存要求すると NG。

---

### 7.5.3 書式・値域エラー（Format/Range Error）
- opacity が 0〜1 以外
- geometry 座標が NaN
- frame が整数でない
- 配列次元不正
→ 編集時にも保存時にも検出。

---

## 7.6 エラー表示（UI 返却形式）
Validator → UI へ返却するエラー形式：

{
path: "points[3].appearance.position[1]",
message: "number が必要です",
type: "type_error"
}

---

UI 側の処理：
- 対象 UI を赤枠で強調
- メッセージを簡潔表示
- UI が勝手に補正しない

temp に関する警告は Validator でなく、  

**保存直前 UI 警告** として扱う。

---

## 7.7 Core と Validator の境界（役割分離）
| 操作               | Core                               | Validator |
|--------------------|-------------------------------------|-----------|
| イベント受理       | ◎                                   | –         |
| 状態更新           | ◎（Validator OK の場合のみ）        | –         |
| スキーマ検証       | –                                   | ◎         |
| 参照整合           | –                                   | ◎         |
| データ補正         | ✕                                   | ✕         |
| UI へのエラー返却  | –                                   |  ◎（実際には Validator → Core → UI の順で返却） |

 ※ 返却経路を明確化。  

- Core は「入口と出口」を握るのみ  
- すべての判断は Validator が行う

### Confirm の扱い
- Confirm は full validation を行わない  
- name あり・uuid 発行など最小限のみチェック  
- 最終的な full validation は保存時のみ

---

## 7.8 検証・エラー処理の禁止事項
1. Validator をバイパスする編集
2. UI が構造データを勝手に補正する
3. 保存時に軽量検証のみ行う
4. 参照整合エラーを自動修復する
5. 不正データを黙って保存する
6. Core が Validator 結果を上書きする
7. エラー発生時に部分保存する
8. prep の name 以外を Validator に通す
9. glb / image の存在チェックを構造検証に含める
10. Confirm 前の temp を自動昇格させる
11. endpoint_edit を構造データとして扱う

---

# 8 拡張・互換性（modeler）

## 8.1 位置づけ

この章は、modeler が以下についてどう振る舞うかを定める：
- 3DSS の将来拡張（スキーマの拡張）
- aux.extension の扱い
- バージョン互換性

modeler は **「生成アプリ」** であり、  
スキーマに存在しない項目・未知拡張を勝手に保存することは禁止。

modeler における拡張・互換性の対象は  
**構造データ（3DSS）に関わる部分に限定** する。
- prep（.3dss-prep.json）  
- パーツ読込み（image / glb）

これらは「作業入力」であり、互換性対象外。

---

## 8.2 3DSS スキーマ拡張への対応方針
3DSS.schema.json は SemVer（major.minor.patch）で管理される。
項目追加・enum追加・auxモジュール追加などが今後発生し得る。

### 8.2.1 modeler 内での I/O 用語の正式定義（import/export/parts）

| 用語 | 意味 | 保存対象か | 備考 |
|------|------|------------|------|
| import | .3dss-prep.json → temp 化 | × | 作業入力（構造外、modeler 専用） |
| Confirm | temp → structure 昇格 | ○ | structure の唯一の入口（viewer では使用しない） |
| export | .3dss.json 出力 | ○ | strict full validation 後 |
| addImage / addGLB | パーツ読込み | URL のみ保存 | バイナリ保存は禁止 |

※ import/export/Confirm は **modeler 内部での I/O 概念** のため、6章の I/O 用語と整合するよう本章冒頭にリンクを追加。  
※ viewer は .3dss.json の読込のみを扱い、prep インポート機能は持たない（import は modeler 固有の語彙とする）。  
※ 本表は 6章（I/O 体系）の規範と完全一致させる。  
　import/export/Confirm の定義は 6.1 / 6.2 / 6.3 と整合するものとする。

---

### 8.2.2 拡張項目の追加
スキーマ側に新項目が追加された場合：
- modeler UI にも「必ず」同項目を追加する必要がある  
- UI が未対応の項目は表示されず、編集不可  
- 編集不可プロパティが残ったまま保存すると **追加キー扱いで NG**  
  → UI 更新が必須

補足：
- 新項目が *optional* の場合は保存NGにはならないが、  
  編集できないまま固定されるため、UI更新は依然必要。
- marker.gltf / aux.image に新プロパティが追加された場合も  
  UI 未対応 → 保存時 NG。

### 8.2.3 enum の拡張
relation / sense / marker.shape など enum が増えた場合：
- UI のプルダウンリストの更新のみで対応
- 旧 UI のままでは新 enum が扱えないため Validator が NG

### 8.2.4 非互換変更（major）
major バージョンアップにより非互換が入った場合：
- modeler は旧バージョンを自動変換しない
- 読込時 Validator NG → 読込不可
- 移行作業は外部ツール or 人手作業（modeler の責務外）

---

## 8.3 aux.extension の扱い（拡張モジュール）
aux.module には将来的に新しい extension モジュールが追加されうる。

### 8.3.1 extension の存在を許容
スキーマ内に：
aux[].module = "extension"
aux[].extension_type = "latex" | "parametric" | ...
のような拡張が入った場合：
- modeler は存在そのものを許容
- 詳細プロパティの編集 UI は本仕様書の対象外
- スキーマに存在する最小プロパティだけ編集できればよい

### 8.3.2 extension の保存（pass-through）
- Core は extension オブジェクトを JSON としてそのまま保持・保存できる  
- 内容の意味論的解釈は一切行わない
- UI が extension の内容に触れなくても構造保存は可能  
  → “未知部分をそのまま pass-through” が原則

### 8.3.3 extension の編集制限
- editor UI が未対応のプロパティがあっても削除・修正しない
- 触れない部分はそのまま保存される

---

## 8.4 互換性（後方互換性・前方互換性）

### 8.4.1 後方互換性（過去バージョンの扱い）
modeler は **同一スキーマバージョンだけ** を扱う。
古いバージョン（例：1.0.0 → 最新 1.1.0）は：
- Validator NG なら読込不可
- 自動変換は禁止
- 必要ならユーザが手作業で修正

#### minor バージョンアップの扱い
minor（例：1.0 → 1.1）は通常後方互換だが、
modeler UI が未対応なら strict validation NG（UI ではなく Validator 基準）。

modeler では：
**「JSON と UI が常に 1:1 対応」**  
という設計のため、後方互換性の保証は schema 側の責務。

#### schema_uri mismatch
データ内の schema_uri が modeler のバージョンと一致しない場合：
- full validation 前に警告
- 読込中断
- 自動変換は禁止

---

### 8.4.2 frame 表示ルールの統+### 8.4.2 frame 表示ルールの統一仕様
frame の **正規仕様** は 3DSD-common.md に定義された内容と完全に一致させる。  
本節では、その共通仕様を modeler の観点から再掲する。  
 ※ 4.6（表示レイヤ）における frame の記述は  
　 **「表示方法の説明であり、構造の仕様そのものは 3DSD-common.md に従う」** と位置づける。  
 ※ viewer 仕様書も同じ frame 仕様を前提とし、表示レイヤのみをそれぞれのアプリで定義する。  

 frame の推論・補正・変換は行わない。
   1. frame 未定義 → 常時表示
   2. active_frame のみ可視
   3. 選択中の要素を半透明で可視化する UI 機能は構造に影響しない
   4. Exporter は frame を解釈せず、そのまま出力する

 ※ 4章・6章にある frame 記述との揺れを解消し、本仕様を canonical とする。

---

### 8.4.3 前方互換性（未来バージョンの扱い）
未来バージョンの .3dss.json は unknown key を含む可能性が高く：
- additionalProperties:false → NG
- 読込不可
- 自動変換禁止

---

## 8.5 modeler におけるバージョン管理ルール

### 8.5.1 保存時の patch 更新（任意）
- 1.0.0 → 1.0.1 への自動更新は任意
- UI 設定で on/off できる
- 変更なし保存での version 上昇は禁止。  
 ※ ただし「自動更新（off）」モードの場合は  
 “変更なし保存は許可だが patch は上げない” を明記。  

#### （補足追加）Undo/Redo の連続入力扱い
Direct Spatial Editing（continuous input）による連続更新は、  
**最後の Update から 300ms 経過した時点で 1 undo 単位に確定**する。  
これによりホイール回転／ドラッグ連続入力の細分化を防ぐ。

### 8.5.2 minor / major の変更
- ユーザが明示的に変更する場合のみ許可
- 自動変更は禁止

### 8.5.3 schema_uri の固定
- 保存される .3dss.json の schema_uri は  
  `/schemas/3DSS.schema.json` に固定
- 外部 URL や CDN 書き換えは禁止

### 8.5.4 version 変更時の整合チェック
ユーザが major/minor を変更した場合：
- modeler は schema_uri と version の整合性をチェック
- 不一致 → NG

### 8.5.5 version 自動更新の条件
patch 自動更新は  
「構造データに実際の更新があった保存時のみ」。
変更なし保存での version 上昇は禁止（自動更新＝patch のみ、構造更新時に限る）

---

## 8.6 仕様変更時の UI／Core／Validator 更新義務
3DSS.schema.json が変更された場合：

### UI
- 新項目を編集できるよう UI 更新が必須  
（enum / 新プロパティ / appearance.* etc）

### Core
- state の保持構造をスキーマに一致させて更新
- 不要プロパティの排除
- 新項目の追加

### Validator
- 新スキーマファイルへの差し替え  
 ※ AJV のバージョンが同一である前提。  
 keyword 拡張が必要な場合は Validator 側の更新も必要。  

### Renderer
- appearance の意味が変わらなければ影響なし

### パーツ系（marker.gltf / aux.image）
- パーツに新プロパティが追加された場合は UI 更新が必須  
- UI 未対応だと保存時 additionalProperties:false で NG になる

---

## 8.7 拡張・互換性に関する禁止事項
1. スキーマ未定義プロパティの UI 表示  
2. スキーマ非対応要素の保存  
3. modeler 独自拡張を JSON に混入  
4. 自動マイグレーション / 自動補正  
5. 未来版 3DSS の “寛容な読み込み”  
6. 意味論の推測による拡張生成（AI 補完）  
7. viewer 専用項目・UI項目・カメラ情報の混入  
8. extension の暗黙解釈（構造変形）  
9. prep 構造を 3DSS に自動昇格  
10. パーツ（URL）を base64 などで自動埋め込み  
11. extension プロパティの削除・再構成  
12. schema 未対応の新 aux.module を勝手に想定して保存  



---