# 3DSS Specification

本仕様は 3D Structural Schema (3DSS) の構造規範を定義する。  
必須属性と型に徹し、デフォルト値やツール実装依存の処理は規定しない。

---

## 3.0 共通規範

本仕様全体に適用される共通ルールを以下に定める。

### ID
- すべての要素は一意な id を持つ。
- id は UUID 形式を推奨する。

### 色指定
- color 属性は hex (#RRGGBB) または CSS color keyword を許容する。

### plane と rotation
- plane はユーザが指定する簡潔な記法であり、内部的には rotation に変換して扱う。
- plane 指定がある場合は rotation 指定より優先される。

### デフォルト値と未定義属性
- デフォルト値は規定しない。必要なら明示的に記述する。
- 未定義属性は無視される。

### 仕様外拡張
- `x-` プレフィックスを付けた属性は仕様外拡張とみなす。
- Viewer/Modeler は解釈せず無視するが、保持して再出力することは許容される。

---

## Label 共通仕様

nodes, edges, text で利用されるラベルオブジェクトの共通仕様を以下に定める。

### 必須属性
- text : 表示文字列 (string)

### 任意属性
- fontSize : 文字サイズ (number)
- plane : 配置平面 (XY, YZ, ZX, camera)
- color : テキスト色
- background : 背景色または none
- direction : 配置方向 (left, right, top, bottom)
- align : 配置基準 (left, right, center, top, bottom, middle)
- rotation : 回転指定（plane があれば内部で変換）
- style : スタイルオブジェクト（拡張用）
- link : ハイパーリンクや参照先

---

## 3.1 meta

3DSS ファイル全体の識別情報を格納するトップレベル要素。  
この要素は JSON の先頭に必ず置かれる。  
Viewer/Modeler は meta の情報を参照して、スキーマの識別や情報パネル表示に利用する。  

### 必須属性
- title : モデルの名称 (string)  
- schema : このファイルが準拠するスキーマの識別子（URI 形式の文字列）  

### 任意属性（列挙形式）
- author : 作成者名や組織名 (string)  
- created : 作成日時 (string, ISO8601 形式推奨)  
- modified : 最終更新日時 (string, ISO8601 形式)  
- description : モデルの説明テキスト (string)  
- license : 利用条件やライセンス情報 (string)  
- project : 関連するプロジェクト名 (string)  
- tags : タグの配列 (array[string])  

### 廃止属性
- version : スキーマ URI 管理に移行したため不要  
- date : created/modified に置き換え  
- counts : ノード数やエッジ数は Viewer 側で計算するため不要  

### 拡張性
- meta は標準属性に加えて、任意の key/value を含めることができる。  
- `x-` プレフィックス付きの属性は仕様外拡張とみなし、Viewer/Modeler は解釈せず無視する。ただし保持して再出力することは許容される。  

---

## 3.2 environment

本仕様を解釈する際に共通となる空間規範を定義する。  
すべての node / edge / text / gltf / aux はこの規範に基づいて解釈される。

### 座標系
- 基底ベクトルは (X, Y, Z) とし、X×Y = Z が成り立つ直交座標系とする。  
- 原点 (0,0,0) はローカルシーンの中心を表す。  
- 単位系は無次元とする。  

### 軸の定義
- X軸 : 赤方向  
- Y軸 : 緑方向  
- Z軸 : 青方向  

### 平面の定義
- XY : 水平方向の基準平面  
- YZ : 縦方向（奥行きを含む）の基準平面  
- ZX : 縦横回転の基準平面  
- camera : ビューアのカメラ平面に追従する特殊指定（主にテキスト/ラベル用）  

### 回転規範
- 平面における rotation の指定は、各平面の法線軸まわりに CW（時計回り）を正とする。  

### 書字方向
- writingMode : デフォルトは horizontal。  
- vertical を明示することで縦書き表示を指定可能。  

### 単位系とスケーリング
- 本仕様では単位系は無次元とするが、1単位=1m 等の解釈は実装に委ねられる。  
- スケーリングはノードや gltf の属性で明示的に指定可能。  

### 原点の意味
- 原点はローカルシーンの中心を表す。  
- グローバルな原点と区別する場合は、シーン間の相対配置を別途定義する。  

### レイヤー・階層
- 補助要素(aux)や背景などは階層的に区分可能。  
- 代表的なレイヤー: background, main, auxiliary。  

### カラースキーム
- 軸の色は固定: X=赤, Y=緑, Z=青。  
- 補助線やグリッドはグレー系を推奨。  

### フォント環境
- 特定フォントが指定されない場合は実装依存。  
- UTF-8 を標準エンコードとする。  

### 数値精度と範囲
- 座標値は float/double を許容。  
- 推奨範囲は -1024 ～ +1024。これを超える場合は実装側でクリッピングやスケーリングを行う。  

### 表示座標系とデータ座標系
- データ保存座標系は本仕様の直交座標系に準拠する。  
- Viewer 内部で異なる座標系を用いる場合は、この直交座標系に変換して表示する。  

---

## 3.3 nodes

ノードはモデルの基本単位であり、概念や対象を表す。  
各ノードは一意な id を持ち、座標とラベルを付与できる。  

### 必須属性
- id : ノードを一意に識別する UUID  
- position : ノードの位置 {x,y,z}  
- label : Label 共通仕様  

### 任意属性
- code / alias : 人間可読な識別子  
- order : 並び順  
- color : 基本色  
- size : 表示サイズ  
- shape : 形状 (sphere, cube など)  
- style : スタイル拡張用  
- geometry / attachment : 内部ジオメトリや外部 glTF 参照  

---

## 3.4 edges

エッジはノード同士を結ぶ関係性を表現する。  

### 必須属性
- id : エッジを一意に識別する UUID  
- source : 始点ノード id  
- target : 終点ノード id  

### 任意属性
- directed : true, false, both  
- arrow : none, normal, double, diamond, cone  
- label : Label 共通仕様  
- weight : 数値  
- style : color, width, dash  
- curve : none, bezier, arc  
- geometry : tube, cylinder, custom  
- animation : pulse, glow, flow  

---

## 3.5 text

ノードやエッジに属さない独立したテキスト要素。  

### 必須属性
- id : UUID  
- text : 文字列  
- position : {x,y,z}  

### 任意属性
- plane, fontSize, fontFamily, color, background, align, rotation, style, link  

---

## 3.6 gltf

外部 glTF モデルを添付する要素。  

### 必須属性
- id : UUID  
- uri : モデルファイル参照  

### 任意属性
- position : {x,y,z}  
- rotation : {type: euler|quaternion, value: {...}} または簡易3/4変数  
- scale : {x,y,z} または数値  
- attachTo : node.id  
- materialOverride  
- animation  

---

## 3.7 aux

補助的な可視化要素。  

### 必須属性
- id : UUID  
- type : axis, grid, arc, hud  

### 任意属性
- axis: length, thickness, color  
- grid: shape=rect|polar(full/half/quarter), sizeU, sizeV, divisionsU, divisionsV, color, opacity  
- arc: radius, angleStart, angleEnd, color, thickness  
- hud: position, content, style  

---
