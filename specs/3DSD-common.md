================================
3DSD-common.md（共通仕様）
================================

# 0 目的と適用範囲

## 0.1 目的

3DSD-common（以下、common）は、3DSL プロジェクトにおける
modeler（生成アプリ）・viewer（閲覧アプリ）双方が共有すべき基礎仕様 を定義する。

本書は /schemas/3DSS.schema.json を中心規範として、
- 構造データ（3DSS）の共通解釈
- 要素（lines / points / aux / document_meta）の扱い
- 座標系・色規範・frames の意味論
- 共通 UI / 共通描画ルール
- イベント名称・参照規範
- ディレクトリ構成規約
など、両アプリで揺らいではならない仕様を集約する。

スキーマ定義そのものは 3DSS.schema.json および 3DSS_spec.md に委ね、
本書はそれらを前提とした **アプリケーション間の共通規範（解釈・運用ルール）** のみを扱う。

この文書は modeler / viewer 各仕様書に先立つ 共通基底層（foundation layer） であり、
Codex 実装の基礎文書としても機能する。

## 0.2 適用範囲

本書の適用範囲は以下とする：
- 3DSS 構造データの共通的な解釈規範（Structural Layer のみ）
- modeler / viewer に共通する UI・描画・座標系ルール
- reference・uuid・frames などの形式的統一
- カラー・単位系・カメラ規範の統一
- ディレクトリ／入出力の標準規則

なお、以下は本書の対象外とする：
- modeler 固有の編集処理（Undo/Redo、保存処理など）
- viewer 固有の閲覧操作（視点切替・HUD 表示など）
- 実装詳細（アルゴリズム、内部状態、Codex の設計）
- Authoring Layer 内部（LLM/OCR/拘束・依存など）の表現形式
- 拡張モジュールの個別仕様（parametric / latex など）

## 0.3 関連文書
- /schemas/3DSS.schema.json（スキーマ本体／single source of truth）
- /schemas/3DSS-prep.schema.json（prep 用ミニマルスキーマ）
- /specs/3DSD-modeler.md（生成アプリ仕様）
- /specs/3DSD-viewer.md（閲覧アプリ仕様）
- /specs/3DSS_spec.md（スキーマ仕様書）
- /specs/3DSL_仕様駆動開発プロセス.md（仕様中心開発プロセスの全体像）

## 0.4 設計理念（Common Layer）
common は以下の理念にもとづく：
- 一貫性（Consistency）
 3DSS データ構造の意味解釈を modeler・viewer 間で完全一致させる。
- 単一原則（Single Source Rule）
 スキーマ（3DSS.schema.json）および 3DSS_spec.md を唯一の構造規範とし、
 common 自体はそれらの再定義を行わない。
- 非混入（No Contamination）
 modeler／viewer の固有機能・挙動を common に混入させない。
- 抽象化（Abstraction）
実装詳細や性能要件ではなく、両者に共通する構造規範・運用ルールのみを記述する。
- 可搬性（Portability）
 Webローカル環境で完結する 3DSL アプリケーション全体を支える基盤仕様とする。

## 0.5 位置づけ
        3DSS.schema.json / 3DSS_spec.md（構造定義）
                       ▲
                       │
                 ┌─────┴─────┐
                 │   common   │（本書：共通基礎層）
                 └─────┬─────┘
                 ┌─────┴─────┐
        modeler（生成）       viewer（閲覧）

common は data → app 層を貫く 規範の接続部 として機能し、
modeler・viewer の仕様統一と Codex 実装の一貫性を保証する。

---

# 1 アプリ全体構造と役割分担

## 1.1 アプリ全体構造

3DSL アプリケーションは以下の3構成要素からなる：
- common：共通仕様（本書）
- modeler：構造データの生成・編集を行うアプリケーション（Structural Layer の出力担当）
- viewer：構造データを読み取り、視覚表示するアプリケーション（Structural Layer の参照担当）

これら3つは同一スキーマ（3DSS）に準拠し、
modeler が生成し viewer が閲覧する という非対称関係を持つ。

## 1.2 役割分担
| 層       | common | modeler | viewer |
| ------- | ------ | ------- | ------ |
| スキーマ解釈  | ◎中心規範  | 従属      | 従属     |
| データ生成   | –      | ◎担当     | –      |
| データ保存   | –      | ◎担当     | –      |
| データ閲覧   | –      | –       | ◎担当    |
| UI/描画規範 | ◎基準    | 反映      | 反映     |
| 入出力規約   | ◎基準    | 出力（生成）  | 入力（閲覧） |

→ modeler と viewer の双方が common の規範に従って動く 構造。

## 1.3 データフロー
  [modeler] --(export: .3dss.json)--> [viewer]

  modeler：
      編集 → 検証 → 生成 → 保存

  viewer：
      読込 → 検証 → 描画 → 閲覧

- 使用するスキーマは両者で完全共通（3DSS.schema.json / 3DSS-prep.schema.json）
- .3dss.json は 唯一の構造伝達フォーマット
- validator の実装（AJV 等）は common の規範に従い、両アプリで同一スキーマ設定を用いる
- viewer は modeler 出力を改変しない（read-only）

## 1.4 共通ファイル構成の位置づけ
- /schemas/3DSS.schema.json
 → 全体の基礎。スキーマの唯一の参照源。
- /schemas/3DSS-prep.schema.json
 → Authoring Layer → modeler 間の疎データ受け渡し用スキーマ。
- /specs/3DSD-common.md
 → スキーマの解釈・UI/描画共通規範。
- /specs/3DSD-modeler.md
 → 生成アプリの仕様。
- /specs/3DSD-viewer.md
 → 閲覧アプリの仕様。

## 1.5 共通部分の管理原則
1. modeler と viewer の仕様差異は common を越えて拡散させない。
2. UI・描画・データ解釈のルールは common に一元化する。
3. common の変更は modeler / viewer / 3DSS_spec に必ず影響を与える（逆は原則与えない）。
4. 実装（/code/）の依存関係は common → modeler/viewer の一方向である。
5. 仕様変更は「3DSS.schema.json → 3DSS_spec.md → common → modeler/viewer → Codex」の順に伝搬させる。

---

# 2 データ構造とスキーマ準拠（共通規範）
本章では /schemas/3DSS.schema.json を
**“唯一の構造規範（Single Structural Source）”**として扱い、
modeler／viewer が共通して従うべき解釈規範を定める。

スキーマの構造定義そのものはスキーマ本体に委ね、
本章は「スキーマをアプリでどう扱うか」の意味論（セマンティクス）を与える。

## 2.1 構造データの上位構造

3DSS データ（.3dss.json）は、次の四大要素で構成される。

{
  "lines": [...],
  "points": [...],
  "aux": [...],
  "document_meta": {...}
}

| 要素                | 役割       | 特徴                       |
| ----------------- | -------- | ------------------------ |
| **lines**         | 関係（関係線）  | A→B の関係・構造・流れなどを表す       |
| **points**        | 存在（対象点）  | 概念・要素・ノード                |
| **aux**           | 補助（空間補助） | グリッド・軸・シェル等の視覚補助         |
| **document_meta** | 管理情報     | uuid・schema_uri・座標系・単位など |

### 共通ルール
- document_meta は必須。
- lines／points／aux はいずれも任意の配列。
- スキーマ以外のキーは許可されない（strict モード）。

## 2.2 document_meta の共通規範（必須）
3DSS の最上位情報であり、modeler と viewer の両者に共通。

### 2.2.1 document_meta の必須項目
スキーマで定義される required は：
- document_uuid
- schema_uri
- author
- version

これらは modeler が出力時に必ず満たし、viewer はこれを信頼して表示する。

### 2.2.2 座標系（coordinate_system）
`document_meta.coordinate_system` はスキーマ上、常に `"Z+up/freeXY"` に固定される。

#### 意味論：

- Z+ が絶対的な「上方向」の基準軸であることだけを 3DSS の約束事とする
- X・Y の取り方（左右・奥行き）や右手系／左手系といったキラリティそのものは 3DSS の外側（実装レイヤ）に委ねる
- modeler / viewer は「Z+ が上である」ことを共有し、具体的なカメラ配置・操作系は各アプリ仕様で定める

### 2.2.3 単位（units）
- "m", "cm", "mm", "non_si:px"
- デフォルトは "mm"

modeler は内部編集単位をこの値に基づいて扱い、
viewer はこれに依存せず読み取り専用（描画単位に変換）。

### 2.2.4 言語（i18n）
- "ja" / "en"

modeler は UI 言語選択の初期値として参照し、
viewer は表示語彙の選択に使用可能。
※構造データの意味に影響しない。

### 2.2.5 tags

文書メタデータとしてのみ扱う。
modeler / viewer はタグの意味解釈を行わない（UI でのフィルタなどはアプリ側の自由実装）。

## 2.3 points（存在要素：共通解釈）
### 2.3.1 意味論
point は「空間内の存在物（概念・オブジェクト・対象）」を表す
構造の節点（node）。

### 2.3.2 座標
- appearance.position は三次元座標 [x, y, z]
- 必須項目であり、デフォルト値は持たない
- modeler は編集 UI で必須入力となる
- viewer はこの値をそのまま描画位置として扱う

### 2.3.3 マーカー（marker）
point の視覚表現。
要素（shape / color / opacity / gltf / text）はすべてスキーマの通り従う。

#### 共通規範
- マーカー形状は構造ではなく見た目の問題
 → 意味論の差異を表すために使ってはならない
- text.content は補足情報であり、構造解釈に影響しない
- marker.gltf は存在点の外観をより豊かにするための任意拡張

### 2.3.4 meta.uuid（必須）
- point は全て UUID により一意
- lines の end_a.ref／end_b.ref が参照する対象でもある
- この参照一貫性は common レベルの規範

## 2.4 lines（関係要素：共通解釈）
### 2.4.1 意味論
line は二つの point（または座標）を結び、
関係（relation）を表現する構造的要素。

### 2.4.2 relation
- relation は任意のプロパティだが、**設定する場合は**主カテゴリから 1 つだけを選ぶ。
- structural（構造）
- dynamic（動態）
- logical（論理）
- temporal（時系列）
- meta（参照）

スキーマ上も `relation.*` の同時複数指定は `maxProperties: 1` ＋ `oneOf` により禁止されており、  
カテゴリを複数同時に持つことはできない。

### 2.4.3 sense（方向）
- a_to_b
- b_to_a
- bidirectional
- neutral

方向は視覚と意味論の両方に影響する。  
sense のデフォルトは `a_to_b` であり、relation が省略されていても、sense 自体が方向性を担う。

### 2.4.4 appearance
共通規範：
- 見た目の差分は意味論に影響しない
- line_type が polyline / bezier などの場合は geometry が必須
- arrow は視覚上の矢印であり、relation の方向とは別概念（※一致させる設計は modeler の責務）

### 2.4.5 frames
line が表示される時間層。
共通規範：
- 整数 or 整数配列
- 表示・非表示の制御のみで意味論には影響しない

## 2.5 aux（補助要素：共通解釈）
aux は構造意味論に影響しない純粋な視覚補助要素であり、
appearance.module.* 配下に型ごとの設定を保持する（grid/axis/plate/shell/hud/extension など）。

共通規範：
- 存在点や関係線とは完全に別レイヤ
- 意味論には一切関与しない
- 計測・補助・視覚ガイドとして扱う
- viewer では読み取り専用
- modeler では編集可能だが構造上の意味を持たせてはならない

## 2.6 frames（時間層の共通規範）

frames は
**表示時間または構造のスナップショットを切り替えるための“表示層”**であり、
構造の意味を変えるものではない。
- 単一整数
- 整数配列（1〜256 要素）
- 重複不可

共通規範：
- frames は「表示層」であり意味論を持たない
- modeler は frames 編集 UI を提供するが、frame 値の補正・再配置は行わない
- viewer は選択された frame に一致する要素のみ表示する（論理 OR）
- frame の追加・削除は構造意味を変えない

推奨値域（運用指針）：
- frame 値の推奨レンジは **-64 〜 +63** とする（スキーマ上は -9999 〜 +9999 を許容）。  
  詳細な背景は 3DSS_spec.md の frames 指針に従う。

## 2.7 uuid / reference の共通規範
### uuid
- 全ての point / line / aux は meta.uuid 必須
- 一意性が保証される必要がある
- modeler は生成時に新規付番
- viewer は参照し、改変しない

### reference（ref）
line の端点などで参照される：

"end_a": { "ref": "<uuid>" }

共通規範：
- 参照先は point のみ（構造意味論上）
- aux への参照は行わない
- 存在しない uuid はエラー
- viewer は ref 解決を描画の起点とする

スキーマ上も、参照整合性用の定義（validator.ref_integrity）において  
`ref_target_type` は `"point"` に固定されており、line → point 以外の参照は許容されない。

### 2.8 color / opacity / renderOrder の共通規範
#### color
- 構造の意味を持たない
- UI 表現上の attribute
- modeler／viewer で差異なし

#### opacity
0〜1
見た目だけに影響。

#### renderOrder
- レンダリング順の数値
- 意味論に関わらない

## 2.9 制約の共通基準
1. additionalProperties: false
 → 仕様外のキー禁止（厳格構造）
2. required の準拠
 → modeler は必須項目を必ず出力
 → viewer は必須欠損をエラー表示
3. ネスト構造
 → lines/points/aux 各項目の構造はスキーマに厳密準拠
4. enum の遵守
 → modeler はプルダウン等で制約
 → viewer は入力値を変更せずそのまま描画する

---

# 3 共通UI・テーマ・ロケール

本章は modeler / viewer に共通する **UI の最小限の原則**のみを定め、  
詳細仕様（レイアウト・テーマ・フォント・配色・操作性）は各アプリ側に委ねる。

目的は “見た目の統一ではなく、体験の一貫性（UX consistency）” の保証にある。

---

# 3.1 UI 基本規範（共通原則）

modeler と viewer は用途が異なるが、  
**空間中心の操作感・構造の扱い方・情報の提示方法**における基礎思想は共通とする。

## 3.1.1 パネル構造（枠組みのみ規定）

両アプリは以下の三層構造を基本枠組みとする：

1. **メインエリア（共通：3D 表示）**  
   - three.js による描画領域  
   - `document_meta.coordinate_system = "Z+up/freeXY"` を前提とした共通座標基準を共有する
     （具体的なカメラ初期姿勢や操作感は各アプリ仕様で定義する）

2. **サイドパネル（役割はアプリに依存）**  
   - modeler：編集フォーム（lines / points / aux / document_meta）  
   - viewer：情報表示・レイヤ切替・frames切替など  
   - 標準位置は右側（right-side docking）

3. **トップバー（操作系）**  
   - modeler：保存・Undo/Redo・レイヤ切替  
   - viewer：視点切替・frames操作  
   - 共通の操作語彙・同系統の見た目を用いる

### 共通観点
- 3D 表示領域を最優先に広く確保する  
- UI の配置規則は “構造理解の妨げにならない” ことを最優先  
- レイアウトの詳細（px / グリッド幅 / 配色）は各アプリ仕様で定義

---

## 3.1.2 入力部品の共通規範

構造データの入力／参照に関わる UI 部品は、以下の原則を共有する：

- enum → **プルダウン選択**（定義値のみ選択可能）
- 数値 → **min / max / step** を備えた標準的なナンバー UI
- boolean → **トグル／チェックボックス**
- 色 → **カラー入力 UI**
- 階層表示 → **タブ／アコーディオン** を用いて情報密度を整える

### 入力ルール
- 不正値入力は UI 側で防ぐか、validator に委譲する  
- 型（文字列／数値など）はスキーマ定義に合わせる  
- 入力 UI は構造意味を変化させない（装飾的操作は禁止）
- enum／数値等の制約条件（min / max / step）は 3DSS.schema.json の定義値を唯一の参照源とし、
  common 側で独自の上書き・緩和を行わない
- マウスホイール・キーボードショートカット等の入力挙動は各アプリ仕様で定義するが、
  最終的にコミットされる値は常にスキーマ制約内に収まることを保証する
※ UI フレームワーク（React / Vue 等）は common では規定しない。

---

# 3.2 テーマ（visual identity：原則のみ）

common はテーマの詳細（配色・フォント名・サイズ）を規定せず、  
**「構造データと UI テーマを混同しない」ための原則だけ**を定義する。

## 3.2.1 カラーポリシー（最小限）

- 構造データ内の `color` は意味論を持たず、純粋な視覚属性  
- UI テーマ色を 3DSS データへ書き込んではならない  
- ダーク／ライトなどのテーマ切替は各アプリ仕様に委ねる
（テーマ切替によって既存 3DSS ファイル内の `color` 値を書き換えてはならない）

## 3.2.2 フォント規範（原則のみ）

- UI の主要フォントはサンセリフ系を基本とする  
- 技術情報・コード領域には等幅フォントを用いる  
- フォント選択は構造データの解釈・意味論に影響を与えてはならない  
- 具体的なフォント名はアプリ仕様で定義する

## 3.2.3 アイコン（Material Symbols）

- UI アイコンは Material Symbols (Outlined) を標準とする  
- 用途例：保存／閉じる／設定／カメラ操作／レイヤ表示  
- アイコンは UI 操作の意味を示すだけで、構造データに影響しない
（アイコンの採否・具体的なセットは実装上の推奨事項であり、3DSS 構造には一切反映しない）

---

# 3.3 ロケール（共通言語規範）

3DSL は日本語・英語の使用を標準とし、  
両アプリの UI もこの 2 言語に準拠する。

## 3.3.1 document_meta.i18n の扱い

- `"ja"` → 日本語 UI を優先表示  
- `"en"` → 英語 UI を優先表示  

modeler：UI 言語設定の初期値として利用（ユーザ設定により上書き可）  
viewer：名称・ラベルの表示語を切り替える際に利用（ファイル内 i18n を強制ではなく“推奨初期値”として扱う）

## 3.3.2 多言語 name（points.signification.name）

- 文字列 または `{ ja: "...", en: "..." }` の二言語辞書  
- 構造データの意味に影響せず、UI 表示の補助に過ぎない  
- viewer は値を変更せず read-only
  （スキーマ上は oneOf 構造で定義されており、どちらの形式も正式サポートとする）
- 文字列値には Unicode 全般を使用でき、ギリシャ文字等の他言語文字も構造上問題とならない
  （解釈や表示方法は各アプリのフォント設定に依存）

## 3.3.3 UI 文体規範（最小限）

- 名詞＋動詞の簡潔表現（例：保存・追加・削除・表示・非表示）  
- 日本語：常体（〜する）に統一  
- 英語：シンプルな動詞主語形（Add / Remove / Save）

---

# 3.4 共通ローディング／エラーメッセージ基準

UI メッセージの基礎部分のみ共通化する（詳細文面はアプリが定義）。

- **ローディング**：短文＋スピナー  
  例：「読み込み中…」「Loading…」

- **スキーマ不整合**：  
  例：「不正な 3DSS データです」「Invalid 3DSS data」

- **ファイル破損**：  
  例：「読み込めません」「Cannot load file」

※ メッセージは構造意味を変えるような表現を含んではならない。  
※ 内部的なエラー種別（例：`schema_error` / `io_error` など）のコード体系は
  modeler / viewer で共有し、文言のみローカライズすることが望ましい。

---

# 3.5 共通レイアウト基準（最小限）

レイアウト詳細は各アプリに委ね、共通部分は以下のみとする。

- padding：8〜16px を基本とする  
- ボーダー半径：4px を基本とする  
- アニメーション：0.15s 程度の短い補助的動作  
- ダークテーマ／ライトテーマのいずれも採用可能とし、
  どちらをデフォルトとするかは各アプリ仕様で定義する
  （common はどちらも強制しない）

---

# 4 共通描画規範（three.js／カメラ／レイヤ）

本章では modeler / viewer 双方の描画処理に対して、
挙動の統一と意味論の齟齬防止を目的とした共通規範を定める。

スキーマの値（position/line_type/color/etc.）を
アプリ側で解釈 → 描画する際の最低限の同一性を保証する。

実装（shader・material・loader など）には踏み込まず、
アプリ仕様としての「描画方針」を記述する。
ここで述べる three.js に依存した用語・規範は、
将来的に描画エンジンを差し替える場合にも
「外部に対して同等の挙動を保つべき基準」として解釈する。

## 4.1 three.js の使用方針（抽象レイヤ）
3DSL プロジェクトでは描画エンジンとして three.js を標準採用する。
以下は共通方針：
1. three.js は描画専用であり、スキーマの意味解釈は行わない  
   （データの意味解釈は Core / Validator の責務）
2. データ変換は行わない：
- スキーマ値を three.js 側の構造に写像するために必要な最小限の変換のみを行い、
  それ以外の意味的な補正・正規化は行わない
- modeler/viewer 両方でこの原則は共通（座標系・単位系などの解釈は
  document_meta に従い、アプリ固有の「勝手な解釈」を混入させない）
3. glTF ローダーの扱い
- points.marker.gltf の読み込みは任意実装
- 表現の差異が構造意味論に影響してはならない
4. レイヤ制御（points/lines/aux/system）は app 層で管理し、
   three.js の layers 機能に依存させない
   （engine 依存の内部レイヤ機構は、あくまで最適化や表示制御のための
     実装詳細として扱い、3DSS 構造や common のレイヤ概念と直結させない）

## 4.2 カメラ規範（document_meta.coordinate_system）

全アプリで document_meta.coordinate_system の値を共通基準とし、
カメラ操作もこれに従う。
現行スキーマでは `"Z+up/freeXY"` のみが正式値であり、
本節の規範もこの値を前提として記述する。

### 4.2.1 基本規範
- coordinate_system が `"Z+up/freeXY"` の場合、
  カメラの Up vector は常時 (0, 0, 1) とする
- XY 平面が操作の基準（pan / rotate などの自由度）
- カメラ初期位置は Z 正方向から斜め見下ろし
（位置自体は各アプリの自由だが、向きの基準は絶対）

### 4.2.2 回転・パン・ズームの方針
- 回転：XY 平面を基準に orbit
- パン：XZ もしくは XY 平面で安定動作
- ズーム：前方方向に移動する形で行う

#### 規範理由
1. Z が「上下」の絶対基準
2. モデル・ビュー間で空間操作の感覚を揃える
3. どの構造データでも直感的に扱える UX を保証する
4. 同一の 3DSS ファイルを modeler / viewer いずれで開いても、
   カメラの初期印象が大きく食い違わないことを保証する

## 4.3 レイヤ構造（表示階層の共通規範）
3DSS の各要素は描画時に 以下の表示階層に分離される：

 Layer 1: points
 Layer 2: lines
 Layer 3: aux
 Layer 0: system（アプリ固有の座標ガイド・地面など 3DSS 外要素）

### 共通規範
1. points → lines → aux の順で優先描画
2. system（アプリ内 HUD や基本ガイド等の 3DSS 外要素）は最背面
3. レイヤ概念は three.js の layer 機能とは独立（別管理）

### 理由
- points の位置を視認しやすく
- lines は points の後に描くことで視覚的な接続性を保証
- aux は補助であり、存在要素の視認性を妨げてはならない
- system は「ビューア／エディタ側の UI ガイド」であり、
  3DSS 内の aux.module.* とは別レイヤとして扱うため

## 4.4 描画順序（renderOrder）規範
3DSS では renderOrder が存在するが、
これはあくまで 見た目の優先度 であり意味論ではない。

### 4.4.1 共通方針
- renderOrder は描画順の調整値
- カメラ → レイヤ → renderOrder の順に優先
- 値が同じ場合、描画結果に差異が出ないことを保証しない
（※ three.js の内部仕様による）

### 4.4.2 実装原則
- modeler/viewer とも renderOrder を補正しない
- modeler は UI 上で入力を提供してもよいが、意味論を持たせてはならない
- viewer は入力値をそのまま描く

## 4.5 透明度・被覆（opacity/alpha）規範
透明度（opacity）は構造の意味には影響を持たない。

### 4.5.1 points
- marker.opacity は視覚効果のみ
- gltf の透明度は loader に準拠する

### 4.5.2 lines
- opacity < 1 の線分は視認性優先
- effect とは独立（effect はあくまで視覚演出）

### 4.5.3 aux
- grid / plate / shell は半透明推奨（デフォルトに従う）
- 補助要素が構造要素を隠さないように描画優先度を調整

## 4.6 frames と描画の関係（表示層）
frame は
「表示する／しない」だけを制御する層 であり、
意味論を持たない。

### 共通規範：
- frame と描画内容の一致は modeler → viewer で保証
- viewer は frame 選択に応じて該当要素のみ表示
- 複数 frames が設定されている場合は論理 OR（いずれかに一致すれば表示）

## 4.7 位置・方向・スケール（transform）の共通規範

3DSS の spatial はすべて
three.js の transform（position/rotation/scale）に一対一で写像可能
でなければならない。

### 4.7.1 position
- 3 数値配列 → Vector3

### 4.7.2 orientation / rotation
- 3要素（XYZ オイラー角）
- 弧度法（radian）
- rotation の適用順序は常に XYZ とし、modeler / viewer 間で解釈を一致させる
 ※ unit（radian）は 3DSS_spec.md 側で説明されているため、
   本書では重複説明を行わない

### 4.7.3 scale
- 3要素
- ゼロは不可（スキーマで保証）

## 4.8 文字・ラベル描画（text）
points.marker.text は次の扱い：
- 描画フォントは 3.2 のテーマ規範に準拠する（具体的なフォント名は各アプリ仕様による）
- plane によって billboard / 平面固定を切替
- 表示が “補助情報” であることが共通規範
- 構造意味には一切影響しない

## 4.9 エフェクト（effect）の共通規範
効果（pulse / flow / glow）は
意味論ではなく視覚演出である。

### 共通規範：
1. effect の種類・速度・振幅は構造に影響しない
2. viewer は effect を忠実にレンダリングするが、挙動を改変しない
3. modeler は effect の入力 UI を提供するだけ
4. effect の時間基準は「ローカル時間」であり、modeler/viewer 間で同期する必要はない（構造非依存）

---

# 5 共通イベント・内部構造の抽象規範
本章では、3DSD アプリケーション内部で扱われる
イベント名・操作単位・Core の基本動作・Validator の責務境界 を定義する。

これは modeler と viewer 双方の内部構造が
同じ語彙と同じ前提で動くための最低限の共通基準となる。
ここで述べる「イベント」や「Core」「Validator」は
あくまで抽象レベルの役割定義であり、
具体的なクラス名・関数名・ファイル構成は各アプリ仕様に委ねる。

## 5.1 構造データの操作粒度（共通単位）
3DSS 構造はすべて以下の“単位”で扱う：
- オブジェクト単位
 - line
 - point
 - aux
- プロパティ単位
 - appearance.*
 - signification.*
 - meta.*
- 配列単位
 - lines[]
 - points[]
 - aux[]

### 共通原則

- どの操作も上記の“単位”を崩してはならない
  （例：部分的な JSON 断片だけを前提に処理することは禁止）
- オブジェクトの複合的な変化は add/remove/update の組合せで表す
- スキーマ外キーの追加は禁止（strict）
- 配列(lines[] / points[] / aux[])に対する操作は、
  「要素の追加・削除・並べ替え」として表現し、
  暗黙のマージや自動生成を行わない

## 5.2 共通イベント規範（add / update / remove）
modeler と viewer の Core モジュールは
同じイベント語彙 を使用する。
ここでのイベント名は「論理イベント名」であり、
実装上の関数名や DOM イベント名と一致している必要はない。

### 5.2.1 イベント名（固定語彙）
| イベント        | 意味                    |
| ----------- | --------------------- |
| **add**     | 新規オブジェクト追加            |
| **update**  | 既存オブジェクトのプロパティ更新      |
| **remove**  | オブジェクトの削除             |
| **reorder** | 並び順の変更（必要な場合のみ）       |
| **select**  | UI 上の選択（構造には影響しない）    |
| **hover**   | UI 上の一時的注視（構造には影響しない） |

### 5.2.2 共通ルール
- イベント名は modeler / viewer 共通・ブレ禁止
- meta.uuid をキーとして変化対象を特定する
- 複雑な変更は “update の連鎖”として扱う（複合イベントは禁止）
- viewer は add / remove / update を発火しない（読み取り専用）
  （viewer の Core は、読み込んだ 3DSS に対して
    select / hover など UI 系イベントのみを扱う）
- add / update / remove / reorder は
  「構造データ（3DSS）の内容を変え得るイベント」に限定し、
  UI の一時的な状態変化を混入させない

## 5.3 Core モジュールの抽象責務（共通思想）
Core の役割は
“構造データの状態管理と、描画・UIへの伝達”
これに尽きる。
Core は「3DSS データの単一の真実（single state）」を保持し、
Renderer / UI / Validator など他モジュールとの仲介を行う。

### 5.3.1 共通責務
1. 状態（state）の保持
 - 現在の 3DSS データ
 - 選択状態（selected）
 - frames の選択値
 - レイヤ・フィルタ状態
 - （modeler のみ）直近の検証結果・エラー一覧への参照

2. イベント処理
 - add / update / remove を順序通りに反映
 - validator との同期（modeler）
 - renderer への通知

3. 永続化を行わない
 - 保存処理は modeler 側の Exporter の責務
 - viewer は読み取り専用

4. renderer へ“差分情報”を渡す
 - 何が変わったか（changed object）
 - どの階層が必要か（point/line/aux）
 - 可能であれば「オブジェクト単位の差分」として伝達し、
    全再構築・全再描画を避ける

### 5.3.2 禁止事項
- スキーマの解釈ロジックを Core に混入させる
- 構造データの暗黙変換（座標補正、値補正）
- 独自キーの付与
- 構造に影響する勝手なキャッシュ
（キャッシュを行う場合も、常に state から再構築可能な
  派生情報としてのみ扱い、永続的な別構造にしない）

## 5.4 Validator の抽象責務（共通思想）
Validator は
“3DSS.schema.json に完全準拠しているかを判定する装置”
であり、最も厳格なモジュールである。
Validator は「構造データの内容」を変化させず、
検証結果（エラー情報）だけを返す純粋な判定器として振る舞う。

### 5.4.1 共通責務
1. 構造検証
 - required の有無
 - enum 値の妥当性
 - additionalProperties:false の順守
 - 参照整合（ref → uuid）
2. 値域チェック
 - 数値の範囲
 - 配列長
 - frames の一意性など
3. メッセージの提供
 - どこが不正か
 - どのプロパティか
 - modeler/viewer の UI が表示するための短い要約
 - （必要に応じて）機械可読なエラーコード／パス情報
   （例：JSON Pointer）

### 5.4.2 振る舞いの違い（アプリ共通思想）
| モジュール       | Validator の役割            |
| ----------- | ------------------------ |
| **modeler** | 保存前・編集中に即時検証。出力を完全整合に保つ。 |
| **viewer**  | 読み込んだデータの妥当性のみ確認。表示中は不変。 |

#### 共通規範
- Validator は“修正”しない。
- Validator は“補正”しない。
- Validator は“提案”もしない。

ただエラーを返すだけ。これは両アプリで共通思想。
エラー内容をもとにどのような UI を提示するか
（ツールチップ・ダイアログ・インライン表示等）は各アプリ側の責務とする。

## 5.5 参照整合（reference integrity）の共通規範
3DSS の参照はすべて uuid ベース。
整合性は validator が保証する。
ここでの参照整合は、スキーマ定義に加えて
Validator レイヤで行う追加チェックも含む。

### 共通ルール
1. ref → uuid
 - lines.end_a.ref / end_b.ref は必ず既存 point の uuid
 - 存在しない uuid はエラー
2. 相互参照の制約
 - point ↔ aux の参照は禁止
 - line ↔ line の参照も禁止（現行 v1.0.0 スキーマでは不許可）
3. self-reference の扱い
 - point 自身を line が指すのは禁止
 - validator 層で検出してエラーとする
   （スキーマ単体で表現できない制約であるため、
    実装上はカスタム検証ロジックとして組み込む）

## 5.6 変更通知（renderer と UI への連携）
Core は add / update / remove の発火後、
renderer / UI に対して変化だけを伝達する。

### 共通規範
- “全再描画”は最終手段
- 可能な限り“差分通知”で動作させる
- viewer は読み取り専用なので差分は描画の最適化のためだけ
 （構造データそのものは読み込み後に不変とみなし、
  Core → renderer 間のやり取りは view state の更新に限定する）

## 5.7 内部状態と不変性（immutability）
3DSS データは、modeler / viewer の内部では
基本的に immutable（不変）として扱う。

変更は：
 old_state → new_state

の差分として扱われる。
内部実装としては構造共有（persistent data structure 等）を用いてもよいが、
外部からは「前の状態を破壊的に書き換えない」という性質だけを保証する。

### 共通理由
- Undo/Redo の扱いが容易
- 差分レンダリングと相性がいい
- 想定外の副作用を防げる
- modeler / viewer 間で「どの操作がどの状態遷移を生んだか」を
  後からトレースしやすい

## 5.8 UI-イベント（select / hover）の共通規範
選択／ホバーは構造意味に影響しない。
- select：
 UI での編集対象を決める（modeler）
 UI で視覚フォーカスを当てる（viewer）
- hover：
 一時注視（tooltips など）

### 共通ルール
- 構造データには何も書き込まない
- イベントは Core の内部状態として保持するだけ
- viewer は読み込み専用のため select/hover は完全 UI 的
- select / hover の状態は永続化しない
 （アプリ再起動・ファイル再読み込み時にはリセットされる）

## 5.9 禁止規範（共通）
以下は common 視点で明確に禁止：
1. modeler／viewer 固有のイベント語彙を追加すること
2. 構造変化を Core／Validator が勝手に補正すること
3. UI 状態（select/hover）が構造に書き込まれること
4. ref を自動変換すること
5. 意味論を変える内部操作（order 対応など）
6. Validator の結果をもとに、自動的に 3DSS データを書き換えること
  （例：不足値の勝手な補完・不正値の近似値への丸め など）

---

# 6 共通入出力規約（I/O・ディレクトリ・ファイル体系）
本章では、modeler・viewer が共通で従う
ファイル I/O とディレクトリ規約を定義する。
ここで定める規約は「3DSS 構造データファイル」に関するものであり、
アプリ内部の設定ファイル・ログファイル・一時ファイル等は対象外とする。

3DSS.schema.json は “入力・出力の中心” であり、
両アプリは I/O 上で完全互換でなければならない。
ただし、3DSS-prep.schema.json に準拠する `.3dss-prep.json` は
modeler 向けの準備データであり、本章の対象外とする。

## 6.1 3DSS ファイルの取り扱い
### 6.1.1 拡張子
3DSS 構造ファイルは .3dss.json を正式形式とする。

#### 規範：
- .json ではなく .3dss.json を推奨
- 識別性とアプリ内処理を明確化するため
- modeler が出力し viewer が入力する、唯一の構造フォーマット
 （既存の汎用 .json からの読み込みは実装上許可してもよいが、
  仕様上の正式フォーマットは .3dss.json のみとする）

### 6.1.2 エンコーディング
UTF-8（BOM なし）

### 6.1.3 文字コード規範
- すべて Unicode
- i18n（ja/en）はスキーマ通り
- 構造データ中の自然言語テキスト（name / description 等）の
  表記揺れは構造に影響しない
- viewer が読み取り専用であるため、viewer 側での文字コード変換は行わない
 （必要な変換がある場合は modeler または外部ツールの責務とする）

## 6.2 読み込み（input）
### 6.2.1 共通の原則
1. スキーマ準拠が最優先
2. 不整合はエラーとする
3. 補正は行わない（strict）
4. additionalProperties:false に違反するものもエラー
5. 参照整合（ref→uuid）は validator の責務
6. JSON として読み込めないファイル（パースエラー等）は、
   スキーマ検証以前に I/O エラーとして扱う

### 6.2.2 modeler の読み込み
- 既存 .3dss.json を読み込む場合
- validator を通し、完全整合データとして内部 state に変換
- 簡易的な normalize（順序整理など）は modeler の裁量で可能
  ※構造意味を変えない限り
  （例：配列順のソート、不要な空白の除去など。
        値の変更・自動補完は含めない）
  normalize の有無・内容は modeler 仕様書側で明示し、
  common では「意味論を変えないこと」のみを規範とする

### 6.2.3 viewer の読み込み
- 読み取り専用
- 読み込み後は内部バッファに保持
- normalize は 一切行わない
- エラー時は読み込み拒否（構造は絶対変更しない）
 （読み込み拒否時は UI 上でエラーを通知し、
   構造データを内部 state に取り込まない）

## 6.3 書き込み（output）
### 6.3.1 modeler の書き込み
modeler だけが 3DSS 構造ファイルを書き出せる。

#### 出力規範：
- スキーマ準拠データを export
- document_meta.version / updated_at の更新
- uuid が必ず保持される
- editor 内部状態（UI選択状態・hover）は出力しない
 （カメラ・レイヤ・frames 選択等のビュー状態も同様に出力禁止）

### 6.3.2 viewer の書き込み
viewer は 構造データの書き込みは禁止。
- viewer は .3dss.json を絶対に変更しない
- 内部 UI 状態（camera/frame/layer）は外部出力しない
- スナップショット（png など）は仕様外（UI側の実装に任せる）
 （スクリーンショット・動画・ログ等は viewer 固有の出力とみなし、
  3DSS 構造データとは無関係なファイルとして扱う）

## 6.4 ディレクトリ構造（共通規範）
3DSL の data 構造は以下の基準に従う：

/data/
 ├── sample/     （サンプル構造データ）
 ├── exports/
 │    ├── 3dss/   （modeler の出力 .3dss.json）
 │    ├── glf/    （glTF等の外部出力：任意）
 │    ├── snapshot/（スクリーンキャプチャ等）
 │    └── misc/      （任意の一時資料。構造データとは無関係）
 └── ...

### 6.4.1 共通規範
- exports/3dss/ は modeler が書き込む唯一の構造出力ディレクトリ
- viewer は data 内に書き込まない
- sample は validate 用データの保管庫
- 外部形式（glf 等）は modeler の拡張扱い
 （配置ルールは modeler 仕様書側で詳細定義する）

※ ここでのディレクトリは「標準レイアウト」の規範であり、
配布形態・ビルド設定により実際の物理パスが変化することは許容する。
ただし、common 上は `/data/sample` / `/data/exports/3dss` などの
論理パスを前提に記述する。

 ※ 旧来の “note” “report” ディレクトリは使用せず、
　必要な場合は misc 等の中立的な名称を用いる。

## 6.5 ファイル命名規範（共通）
### 6.5.1 基本構成
 <project>_<description>_<yyyymmdd>_<uuid>.3dss.json

 例：
 energy_flow_20251112_a8c2cd02.3dss.json
 brain_map_20251110_81f3e901.3dss.json

### 6.5.2 規範
- 必須ではないが推奨（任意プロジェクトでも識別しやすい）
- uuid は必ず含める（ファイルの一意性保持）
- description は ASCII 推奨（互換性のため）
- `<yyyymmdd>` は UTC ではなく「編集者ローカル日付」を基本とし、
  厳密な時間情報は document_meta 側で管理する
- ファイル名規約はスキーマで強制せず、I/O 運用上の推奨事項とする

## 6.6 エラー処理の共通規範
### 6.6.1 読み込みエラー
- スキーマ不整合
- uuid 不一致
- トップレベルキー不足
- 追加プロパティの混入
- 参照解決不可
- → どちらのアプリも読み込み拒否。
 （ファイル未存在・アクセス不可・JSON パースエラーなど
  I/O レベルのエラーも同様に「読み込み失敗」として扱う）

### 6.6.2 保存エラー（modeler）
- 構造データ不整合
- validator での未修正エラー
- 必須値の欠如
 → 書き込み禁止／UIにエラー通知

### 6.6.3 viewer での表示エラー
- 読み込み後は read-only
- 描画可能な部分だけを描画することは許可されるが、
  “構造修正”は一切行わない
 （部分描画を行う場合でも、3DSS 構造データ自体を補完・推測して
   新たなオブジェクトを生成することは禁止）

### 6.7 I/O 非対象（共通で禁止）
以下は共通禁止（仕様外の振る舞い）：

- viewer からの .3dss.json 書き換え
- modeler の暗黙の補正（色変更・位置修正・ランダム値）
- I/O 中の非表示キー挿入
- “自動バックアップ” を構造データとして出力
- 構造意味の追加（メタデータ書き換えなど）
 （自動バックアップや一時保存を行う場合は、
   拡張子・ディレクトリを明確に分け、
   本番の .3dss.json と混同しないようにする）

---

# 7 拡張・互換性（Common ポリシー）
本章は、3DSL プロジェクト全体における
スキーマ拡張・仕様変更・後方互換性の扱い を規定する。

このポリシーは 3DSS.schema.json・3DSD-common.md・3DSD-modeler.md・3DSD-viewer.md
すべてに適用され、ブレを防ぐための共通ルールとなる。
3DSS-prep.schema.json についても原則として同一ポリシーに従うが、
準備用スキーマであるため 3DSS 本体とは別系統のバージョン運用を許容する。

## 7.1 バージョン管理（スキーマとアプリ）
3DSL 全体は Semantic Versioning（SemVer） に従って管理する：

### major.minor.patch
| 種類    | 影響                      |
| ----- | ----------------------- |
| major | 互換性破壊（breaking changes） |
| minor | 後方互換ありの追加・変更            |
| patch | バグ修正・微修正                |

### 規範：
- 3DSS.schema.json と 3DSD-common.md / 3DSD-modeler.md / 3DSD-viewer.md は
  常に同一 major を共有する
- スキーマの major が上がったら、common/modeler/viewer 各仕様書も
  同じ major にそろえる
- minor/patch は柔軟に実施可能だが、両アプリおよび関連仕様に通知・反映する
- minor/patch で互換性破壊（breaking changes）を行ってはならない
  （仕様上も「破壊的変更」は必ず major アップとして扱う）

## 7.2 互換性方針（Backward/Forward）
### 7.2.1 後方互換性（Backward compatibility）
基本方針：
“新しい modeler は古い .3dss.json を読み込めるべき”
ただし以下の条件下：
- 旧版構造が当時のスキーマに準拠している
- 新スキーマの required 追加がない、または safe-default が設定されている
  （safe-default は「値が存在しない場合に構造意味を変えない」場合に限り許可）
- 不必要な自動補完は行わない（構造意味を変えるため）

modeler の正常動作を保証するために、
スキーマ非互換のデータは読み込めない（validator 側で拒否する）。

### 7.2.2 前方互換性（Forward compatibility）
古い viewer が新しい .3dss.json を読むことは保証しない。
理由：
- viewer は読み取り専用であり、
  仕様外の項目に対応できず、不整合を引き起こすため。
  （古い viewer は新フォーマットを検出した場合、明示的に読み込みを拒否する）

### 7.2.3 拡張フィールド（extension）への対応
- aux に extension モジュール（parametric, latex 等）を追加可能
- ただし extension の仕様は別冊で定義
- common/spec/modeler/viewer の本流仕様には混入させない

## 7.3 $defs / validator の拡張
3DSS.schema.json の $defs.validator で
列挙値（enum）や補助定義が定められているが、
これらの拡張ポリシーもここで一元管理する。
アプリ実装側で validator ロジックを複製する場合は、
常に $defs.validator を唯一の参照元とし、
コード側の定義がスキーマと乖離しないように保守する。

### 7.3.1 enum の追加
- enum の追加は互換性に問題ない（minor increment）
- modeler の UI（プルダウン）に即反映が必要
- viewer の描画はそのまま対応可能（意味論は不変）

### 7.3.2 enum の削除（禁止）
- 削除は禁止
- 削除したい場合は "deprecated":true で非推奨化だけ行う
- 完全削除は次の major の時のみ許可

### 7.3.3 optional の追加
- 後方互換を保つため基本許可
- default 値の設定は慎重に運用

### 7.3.4 required の追加
- 互換性破壊（breaking）になる
 → major を上げる必須条件

## 7.4 承認フロー（仕様変更の手順）
3DSL プロジェクトは「仕様中心主義」であり、
仕様変更には常に formal な手順を踏む。

### 7.4.1 手順
1. common（本書）で変更案を検討
2. 3DSS.schema.json の修正案を draft 化
3. modeler/viewer の影響範囲を精査
4. 3DSS_spec.md へ反映
5. common/modeler/viewer 各仕様に展開
6. Codex 実装へ反映（人間承認後）
7. /data/sample/ 等の参照用データを必要に応じて更新

### 7.4.2 禁止
- コード側（Codex）が仕様に先行して変更されること
- 仕様書間で表記が食い違ったまま放置すること
- ChatGPT 側が独断で仕様を変更すること（逸脱）
 （仕様変更の提案はあくまで draft とし、人間の承認なく採用しない）

## 7.5 拡張モジュールの扱い（aux.extension）
aux.extension は将来的な拡張用途のための slot であり、
“構造意味に影響しない補助モジュール” のために確保されている。

### 共通ポリシー
1. extension は副次要素であり、構造の本流に混入しない
2. modeler/viewer の本仕様書には詳細を書かない
3. 仕様は別冊で定義する
4. 拡張モジュールの有無が構造解釈に影響してはならない
5. 拡張の追加は minor、削除は major
  （extension の削除に伴い既存データが解釈不能となる場合は、
   必ず migration 方針を別途文書化する）

## 7.6 変更互換性テスト（common 規範）
仕様変更時には次のテストを共通義務とする：

### 7.6.1 スキーマ整合性テスト
- AJV による構造検証
- $defs の依存関係チェック

### 7.6.2 サンプル再検証
- /data/sample/ 下の全サンプルを最新スキーマで validate
 （バージョン別サンプルが存在する場合は、
  対応するスキーマバージョンでの validate 結果も保持する）

### 7.6.3 modeler/viewer の UI/描画整合確認
- 共通部分（色・座標系・frames）の動作一致
 （同一 .3dss.json を読み込んだ際に、
  両アプリの表示・挙動が common 仕様の範囲内で一致していること）

### 7.6.4 後方互換性確認
- 旧バージョン出力の読み取りテスト
- 非互換時は major アップ必須
 （読み取り不能となる旧バージョンの範囲を、
  仕様書側に明記することが望ましい）

## 7.7 将来互換性の基本思想
3DSL の進化方針は以下で定める：
- 構造は壊さず、意味拡張で育てる
- スキーマ中心・仕様駆動を徹底し、
アプリ（modeler/viewer）は常にその従属層
- 拡張は aux と $defs で吸収し、
core 構造（lines/points/document_meta）に干渉しない
加えて、common 自体も「後方互換性を最大限尊重する仕様書」として維持し、
既存コンテンツ・実装に対して予告なく解釈を反転させるような変更を行わない。
必要な場合は、version 節や changelog 等で
「どのバージョンから何が変わったか」を明示する。
