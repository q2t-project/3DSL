# 3DSD-viewer_spec.md

## 1. 位置づけ
Viewer は万人向けの表示専用ツールである。  
目的は 3DSS データをストレスなく直感的に閲覧できること。  
編集機能は持たず、軽量・直感操作・ユニバーサルデザインを優先する。

選定理由:  
- 単一HTMLで完結することで依存を最小化し、配布・利用を容易にできる。  
- 誰でもブラウザで即座に開けることが Viewer の本質的な体験である。  

---

## 2. データ入出力
- 起動シナリオ: コンテンツへのリンクをクリックするとブラウザが起動し、即座に 3D モデルが表示される。これを最大のアクセスルートとする。  
- 対応形式: 3DSS 準拠 JSON  
- 入力手段:  
  - URL指定（基本形）  
  - ローカルファイル選択（補助的手段）  
- スキーマ検証: Ajv による JSON Schema 準拠チェック  

---

## 3. 表示操作
- カメラ操作: OrbitControls  
  - 粗くても引っ掛かりなく動作することを優先  
  - 静止時に高精細化  
  - Z軸は画面上方向に固定（Z-up）  
- リセット/フィット: カメラ位置を初期状態または全体表示に戻す  
- 選択: nodes や edges をクリックで選択、強調表示や情報ポップアップを表示  

---

## 4. 表示仕様
- レイヤ順序: **nodes → edges → texts → gltf → aux**  

### nodes
- 標準形状: sphere  
- 径は JSON の `size` をそのまま使用  
- `shape` は { sphere, cube, cylinder, cone, plane } を解釈  

### edges
- 標準は線分  
- `arrow` 属性は { none, normal, double, diamond, cone } を描画  
- `curve` は { none, bezier, arc } に対応  
- `directed` 属性:  
  - true → source→target に矢印  
  - false → 矢印なし  
  - both → 双方向矢印（両端に描画）  
- `style` オブジェクト:  
  - `color` 未定義 → black (#000000)  
  - `width` 未定義 → 1px  
  - `dash` 未定義 → solid  

### texts
- `plane` に従って固定表示（ビルボード化しない）  
- 遠距離かつ小サイズのラベルはカリングで非表示  

### gltf
- `src` に従って外部 glTF を読み込み表示  
- `position` / `rotation` / `scale` による配置反映  

### aux
- `type` に応じて axis, grid, arc, hud を描画  

### 背景
- 標準は黒、白への切替を許容  

---

## 5. 未定義時の描画挙動（内部デフォルト）
Viewer は 3DSS_spec で省略された属性に対して、以下を描画上のデフォルトとする。

- **nodes**  
  - `size` : 1.0  
  - `color` : gray (#808080)  
  - `shape` : sphere  

- **edges**  
  - `directed` : false  
  - `arrow` : none  
  - `color` : black (#000000)  
  - `curve` : none  

- **texts**  
  - `size` : 16  
  - `color` : black (#000000)  
  - `orientation` : XY  

- **gltf**  
  - `position` : [0,0,0]  
  - `rotation` : [0,0,0]  
  - `scale` : [1,1,1]  

- **aux**  
  - `visible` : true  

- **全体**  
  - 背景 : black (#000000)  

---

## 6. 補助機能
- グリッド、座標軸、背景色切替などは裏メニューに配置  
- 表に出すのは必要最小限とし、主導線は「コンテンツを即見る」ことに特化する  

---

## 7. 非機能要件
- 軽量動作: 数千ノード規模でも数秒で描画開始できること  
- 直感操作: 学習コストゼロで利用できること  
- 外部依存: three.js と ajv のみに限定  

---

## 8. UIフロー図（PUML）

```puml
@startuml
actor User

User -> (Open Link)
(Open Link) --> (Load JSON)
(Load JSON) --> (Validate Schema)
(Validate Schema) --> (Render Scene)

User -> (Orbit Control)
User -> (Select Node/Edge)
(Select Node/Edge) --> (Highlight + Info Popup)

User -> (Toggle Aux/Background)
@enduml
