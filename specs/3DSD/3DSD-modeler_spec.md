# 3DSD-modeler_spec.md

## 1. 位置づけ
Modeler は 3DSL モデルを構築・編集するための制作ツール。  
対象は制作者であり、Viewer より学習コストを許容し、機能網羅性と入力効率を優先する。

選定理由:  
- 編集UIは複雑であり、Reactコンポーネントでの構築が最適である。  
- スタイル統一とレスポンシブ対応は Tailwind で効率化できる。  
- Vite による高速ビルド環境により大規模開発にも対応できる。  

---

## 2. データ入出力
- 読込: 3DSS準拠 JSON ファイル（ローカル/URL）  
- 保存:  
  - JSON（完全データ）  
  - glTF（.glb）としてエクスポート（Modeler専用）  
- 常時バリデーション: Ajvによるリアルタイムスキーマ検証  

---

## 3. 入力・編集フロー
1. 新規作成: 空のJSONスケルトンを生成  
2. nodes追加: id自動採番、名前・位置・size入力、即時JSON反映  
3. edges追加: source/targetをノードから選択、線種・矢印指定  
4. texts編集: contentや位置を直接入力またはフォームで変更  
5. aux追加: grid, axis, HUD  
6. gltf配置: 外部ファイル読込、位置/スケール調整  
7. 保存/エクスポート  

---

## 4. UI構造
- 3分割画面  
  - 左: 入力表（スプレッドシート型）  
  - 中央: 3Dプレビュー  
  - 右: 詳細フォーム＋操作ログ  

入力表の仕様:
- 列 = 属性（例: nodes → id, label, x, y, z, size...）
- 必須セル: エメラルド系の文字色で表示し、未入力でも即時の赤ハイライトは行わない（スキーマエラー時のみ赤背景）
- 任意セル: 灰色の文字色で表示
- デフォルト適用セル: 青みがかった文字色で示す
- ドロップダウン（arrow 種別、curve 種別など）
- ツールチップで入力例を表示

UI裏構造:  
- 詳細設定（スナップ、座標系設定、補助要素ON/OFFなど）は裏メニューに配置  

---

## 5. 編集機能
- 基本操作: nodes / edges / texts / gltf / aux の追加・削除・編集  
- edges 編集時の directed 属性:
  - ドロップダウンで `'false'` / `'true'` / `'both'` を選択可能
  - 初期値は `'false'`
  - both を選ぶと UI 上で両端に矢印表示
- style 編集:
  - color / width / dash をセル入力またはドロップダウンで編集可能
  - 初期値は color=black (#000000), width=1, dash=solid
- aux の種類: `axis`, `grid`, `arc`, `hud` を選択可能（初期値は `axis`）

---

## 6. プレビュー仕様
- Viewerと同じ描画コア（OrbitControls, Raycaster, レイヤ順序 **nodes → edges → texts → gltf → aux**）  
- 編集拡張:  
  - 選択時にプレビューでハイライトし右フォームを同期表示  
  - スナップ時にガイド線や吸着点を可視化  
- パフォーマンス: 編集中は粗くてもよい、静止時に高精細化
- 新規シーンでは軸補助のみを既定表示し、グリッド補助を追加した場合の size / divisions は 10
- （範囲逸脱時の自動警告やスナップ可視化は今後の拡張対象として別途検討する。）

---

## 7. 入力アシスト
### 数値入力共通
- ホイール: ±1、Shift+ホイール=±10、Alt+ホイール=±0.1  
- 矢印キー: ↑/↓で±1、Shift=±10、Alt=±0.1  
- ←/→: X座標 ±1（Shift=±10, Alt=±0.1）  
- PgUp/PgDn: Z座標 ±1（Shift=±10, Alt=±0.1）  
- 変更は即プレビュー反映、Undo/Redo履歴に登録  
- 発火条件: シート上のセルを含む入力欄でも利用可能（プレビューのフォーカス制限は設けない）

### フォントサイズ入力
- デフォルト値: 16  
- 入力アシスト系列:  
  - 拡大: 16 → 32 → 64 → 128 → 256  
  - 縮小: 16 → 8 → 4 → 2 → 1 → 0.5 → 0.25 → 0.125  
- ホイール上回転: 次の 2^n ステップへ  
- ホイール下回転: 前の 2^n ステップへ  
- Alt+ホイール: ±1 の微調整  
- 入力欄はグレーアウトで 16 を表示し、未入力時は自動補完  

---

## 8. 入力初期値（未定義時の扱い）
Modeler は新規入力や未入力セルに以下の初期値を適用する。  
（Viewer 側の描画デフォルトと整合させる）

- **nodes**  
  - `size` : 1.0  
  - `color` : gray (#808080)  
  - `shape` : sphere  

- **edges**  
  - `directed` : false  
  - `arrow` : none  
  - `color` : black (#000000)  
  - `curve` : none  
  - `style` : { color: black (#000000), width: 1, dash: solid }  

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

## 9. 空間デフォルト
- 編集空間は -1024 ～ +1024 の直交立方体を基準とする  
- 新規作成時にはこの範囲に合わせたグリッド（size=1024, divisions=16）を表示  
- 入力値が範囲を超えると赤枠ハイライトで警告  

---

## 10. 非機能要件
- 堅牢性: 常にスキーマ検証を通す  
- 効率性: 数千ノード規模でも快適  
- 拡張性: UIをモジュール化し、新要素を追加しやすい  

---

## 11. UIフロー図（PUML）

```puml
@startuml
actor User

User -> (New Project)
(New Project) --> (Generate Empty JSON)

User -> (Add Node)
(Add Node) --> (Update JSON)
(Update JSON) --> (Preview Refresh)

User -> (Add Edge)
(Add Edge) --> (Update JSON)
(Update JSON) --> (Preview Refresh)

User -> (Edit Label/Text)
(Edit Label/Text) --> (Update JSON)
(Update JSON) --> (Preview Refresh)

User -> (Add Aux/Grid)
(Add Aux/Grid) --> (Update JSON)
(Update JSON) --> (Preview Refresh)

User -> (Import glTF)
(Import glTF) --> (Place + Scale)
(Place + Scale) --> (Update JSON)
(Update JSON) --> (Preview Refresh)

User -> (Save JSON)
User -> (Export glTF)
@enduml
