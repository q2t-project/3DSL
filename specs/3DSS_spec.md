# 3DSS Specification

本仕様は 3D Structural Schema (3DSS) の構造規範を定義する。  
必須属性と型・制約に徹し、デフォルト値や実装ごとの推奨値は規定しない。  
相互運用性を担保するため、列挙可能な属性は許される値を**列挙（enum）**として明記する。

---

## 3.0 共通規範

### ID
- すべての要素は一意な `id` を持つ（UUID 形式を推奨）。

### 色指定
- `color` は `#RRGGBB`（hex）または CSS color keyword を許容。

### 座標表現
- 位置・回転・スケール等は **配列形式**で表現する。  
  - 位置 `position` : `[x, y, z]`（number×3）  
  - 回転 `rotation` : `[x, y, z]`（オイラー角, number×3）  
  - スケール `scale` : `[x, y, z]`（number×3）
- オブジェクト形式 `{x,y,z}` は**許容しない**。

### plane と rotation
- `plane` は簡潔指定であり、内部実装では `rotation` に変換して扱ってよい。
- `plane` がある場合は `rotation` より優先される。

### 未定義属性と拡張
- 未定義属性は無視される。
- 仕様外拡張は `ext` フィールド、または `x-` プレフィックス属性で表す（保持再出力は可）。

---

## Label 共通仕様

`nodes`・`edges`・`texts` が参照するラベルオブジェクトの共通仕様。

### 必須
- `text` : string（表示文字列）

### 任意（列挙を含む）
- `fontSize` : number  
- `plane` : enum { `XY`, `YZ`, `ZX`, `camera` }  
- `color` : string  
- `background` : string | `"none"`  
- `direction` : enum { `left`, `right`, `top`, `bottom` }  
- `align` : enum { `left`, `right`, `center`, `top`, `bottom`, `middle` }  
- `rotation` : number  
- `style` : object  
- `link` : string

---

## 3.1 meta

3DSS 全体の識別情報。

### 必須
- `title` : string  
- `schema` : string（準拠スキーマURI）

### 任意
- `author` : string  
- `created` : string（ISO8601）  
- `modified` : string（ISO8601）  
- `description` : string  
- `license` : string  
- `project` : string  
- `tags` : array[string]

### 拡張
- `ext` または `x-` 属性を許容。

---

## 3.2 environment

空間規範（構造のみ規定）。

- 座標系 : 直交座標（X×Y=Z）  
- 原点 : `[0,0,0]` はローカルシーン中心  
- 軸色 : X=赤, Y=緑, Z=青  
- 平面（参照名）: `XY`, `YZ`, `ZX`, `camera`  
- 書字方向 : `horizontal` / `vertical`（実装依存、ここでは列挙の参照名のみ）

---

## 3.3 nodes

### 必須
- `id` : string  
- `position` : array[3] number

### 任意（列挙を含む）
- `label` : Label  
- `code` / `alias` : string  
- `order` : number  
- `color` : string  
- `size` : number  
- `shape` : enum { `sphere`, `cube`, `cylinder`, `cone`, `plane` }  
- `style` : object  
- `geometry` : object  
- `attachment` : string  
- `ext` : object

---

## 3.4 edges

### 必須
- `source` : string（始点 node.id）  
- `target` : string（終点 node.id）

### 任意（**列挙を復元**）
- `directed` : enum { `true`, `false`, `both` }  
- `arrow` : enum { `none`, `normal`, `double`, `diamond`, `cone` }  
- `label` : Label  
- `weight` : number  
- `style` : object（例: `color`, `width`, `dash`）  
- `curve` : enum { `none`, `bezier`, `arc` }  
- `geometry` : enum { `tube`, `cylinder`, `custom` }  
- `animation` : enum { `pulse`, `glow`, `flow` }  
- `ext` : object

---

## 3.5 texts

ノード/エッジに属さない独立テキスト。

### 必須
- `content` : string  
- `position` : array[3] number

### 任意（列挙を含む）
- `size` : number  
- `color` : string  
- `orientation` : enum { `XY`, `YZ`, `ZX`, `camera` }  
- `plane` : string（参照名）  
- `style` : object  
- `link` : string  
- `ext` : object

---

## 3.6 gltf

外部 glTF アセット。

### 必須
- `src` : string（ファイルパス/URL）

### 任意（列挙を含む）
- `position` : array[3] number  
- `rotation` : array[3] number（オイラー角）  
- `scale` : array[3] number  
- `attachTo` : string（node.id）  
- `materialOverride` : object  
- `animation` : object  
- `ext` : object

> （補足）旧記法の `rotation: { type: euler|quaternion, value: … }` はここでは**構造統一のため列挙せず**、配列ベースのオイラー角に一本化。

---

## 3.7 aux

補助可視化要素。

### 必須
- なし

### 任意（**列挙を復元**）
- `type` : enum { `axis`, `grid`, `arc`, `hud` }  
- `visible` : boolean  
- `axis` : object（例: `length`, `thickness`, `color`）  
- `grid` : object（例: `shape=rect | polar(full/half/quarter)`, `sizeU`, `sizeV`, `divisionsU`, `divisionsV`, `color`, `opacity`）  
- `arc` : object（例: `radius`, `angleStart`, `angleEnd`, `color`, `thickness`）  
- `hud` : object（例: `position`, `content`, `style`）  
- `ext` : object

---

## 付録: クラス図 (PlantUML)

```puml
@startuml
class Node {
  id : string
  position : [number,number,number]
  label : Label?
  code : string?
  alias : string?
  order : number?
  color : string?
  size : number?
  shape : enum {sphere,cube,cylinder,cone,plane}?
  style : object?
  geometry : object?
  attachment : string?
  ext : object?
}

class Edge {
  source : string
  target : string
  directed : enum {true,false,both}?
  arrow : enum {none,normal,double,diamond,cone}?
  label : Label?
  weight : number?
  style : object?
  curve : enum {none,bezier,arc}?
  geometry : enum {tube,cylinder,custom}?
  animation : enum {pulse,glow,flow}?
  ext : object?
}

class Text {
  content : string
  position : [number,number,number]
  size : number?
  color : string?
  orientation : enum {XY,YZ,ZX,camera}?
  plane : string?
  style : object?
  link : string?
  ext : object?
}

class Gltf {
  src : string
  position : [number,number,number]?
  rotation : [number,number,number]?
  scale : [number,number,number]?
  attachTo : string?
  materialOverride : object?
  animation : object?
  ext : object?
}

class Aux {
  type : enum {axis,grid,arc,hud}?
  visible : boolean?
  axis : object?
  grid : object?
  arc : object?
  hud : object?
  ext : object?
}

class Label {
  text : string
  fontSize : number?
  plane : enum {XY,YZ,ZX,camera}?
  color : string?
  background : string?  // or "none"
  direction : enum {left,right,top,bottom}?
  align : enum {left,right,center,top,bottom,middle}?
  rotation : number?
  style : object?
  link : string?
}

Node "1..*" -- "0..*" Edge
@enduml
