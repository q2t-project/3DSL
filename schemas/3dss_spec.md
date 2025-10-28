# 3DSS (Three-Dimensional Structural Schema) 仕様書 v1.0.0

---

## 第1章　概要（Overview）

| 項目 | 内容 |
|------|------|
| 正式名 | 3DSS（Three-Dimensional Structural Schema） |
| スキーマURI | https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0 |
| 準拠仕様 | JSON Schema Draft 2020-12 |
| ステータス | stable |
| 発行日 | 2025-10-21 |
| 対象読者 | 3DSL モデル設計者／モデラ／ビューア開発者／構造コンテンツ制作者 |

3DSS は、3DSL（Three-Dimensional Structural Language）における 三次元構造記述のための標準スキーマであり、 lines（関係要素）・points（存在要素）・aux（補助要素）・document_meta（管理情報） を中核として設計されている。

---

 ## 第2章　3DSL 全体アーキテクチャ（Authoring→Structural→Viewer）
 
 3DSL は制作から表示までを二層で捉える：
 
 - **Authoring Layer（制作層）**：構造化以前の情報（OCR/LLMの仮説、拘束・依存、UI/履歴、生成ルール等）を保持する自由領域。形式は規定しない。
 - **Structural Layer（構造層）**：確定した構造のみを保持する共有スキーマ。本仕様（3DSS.schema.json）に準拠し、Viewer/Validator は本層のみを解釈対象とする。
 
 ### 2.1 レイヤ境界
 | 観点 | Authoring | Structural |
 |---|---|---|
 | 役割 | 構造化前の思考・生成 | 構造の確定・共有・表示 |
 | 含有 | OCR/LLM仮説、拘束/依存、UI/履歴 | lines/points/aux/document_meta |
 | 曖昧さ | 許容（信頼度/未確定） | 不許容（確定値） |
 | 形式 | 自由 | 3DSS.schema.json |
 
 ### 2.2 Export 共通契約（要約）
 ①Resolve（拘束・変数・依存を解消）、②Flatten（参照/生成の展開）、③Prune（一時/未確定の除去）、④Normalize（座標系/単位/色/enum 正規化）を経て、3DSSに収束させる。  
 `document_meta` には `document_uuid / schema_uri / author / version / generator` を記載し、追跡可能性を担保する。
 
 照明・影・レンダ設定は本仕様の対象外（Viewer責務）とする。


## 第3章　設計理念 (Design Philosophy)
3DSS は、単なる構文規範ではなく、**『構造』の階層性を可視化する言語的枠組み**として設計されている。

### 3.1 基本原理
- すべての要素は「関係」「存在」「補助」「管理」の4領域に分類され、それぞれ「lines」「points」「aux」「document_meta」の要素が割り当てられる。
- 各要素は原則として三層構造（signification / appearance / meta）で表現され、signification は意味的情報、appearance は形態的情報、meta は管理情報を保持する。  
- lines、及び、 points は三層構造の3項目すべてについて適用される。  
- aux は意味を持たない空間補助構造であるため signification 層を省略し、appearance と meta のみで構成される。  
- document_meta は全体情報を統括する独立メタ要素として三層構造の外側に位置づけられる。
- 意味層は概念的関係（構造／因果／論理／時間）を、形態層は幾何・描画特性を、管理層は識別と履歴を担う。
- 3DSS は、単なる構文規範ではなく、**構造の哲学的階層性を可視化する言語的枠組み**として設計されている。

### 3.2 構造的思考の指針
- points は「存在」を、lines は「関係」を、aux は「補助的構造」を、document_meta は「全体管理」を表す。
- points が「存在の点」であるなら、lines は「意味の軸」であり、二つの存在間を接続するだけでなく、**力学・流動・因果・論理的反射**を示す能動的媒介として扱う。
- これにより、3DSS は静的な構造表現から動的概念構造表現へと拡張される。

### 3.3 設計指針
- スキーマ設計では、論理的一貫性を優先し、表現上の自由度はその範囲で確保する。これによりスキーマは Viewer の描画負荷から独立して構造定義の安定性を維持する。

#### 3.3.1 表現と構造の分離原則
 - 3DSS は「構造」を記述するための言語であり、光・影・照明・反射といった描画上の演出概念を保持しない。
 - これらは Viewer 層における責務とし、スキーマは構造的存在と関係のみを記述する。

---

## 第4章　全体構造（Root Structure）

3DSS の実体データは、次の4つの主要領域で構成される。

| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `lines` | array(object) | 任意 | 関係線（動的構造要素）。 |
| `points` | array(object) | 任意 | 存在点（静的構造要素）。 |
| `aux` | array(object) | 任意 | 補助構造（座標格子・軸・HUD 等）。 |
| `document_meta` | object | ✅ | 文書全体の管理メタ情報。 |

---

### 4.1 スキーマ全体構造（Root + Definitions）

3DSS のスキーマは、**4つの主要要素（lines／points／aux／document_meta）**からなる実体データを中核とし、これらを支える **共通定義群 `$defs`** を内部に保持する。

```
3DSS スキーマ全体構造（概念）
├─ 実体データ
│   ├─ lines          （関係要素）
│   ├─ points         （存在要素）
│   ├─ aux            （補助要素）
│   └─ document_meta  （管理要素）
└─ 共通定義領域
    └─ $defs
         └─ validator （型・列挙・検証ルール等）
```

 `$defs` は上記4要素の共通ルール・型定義を格納するセクションであり、各要素が `$ref` 経由で再利用するために設けられている。
 詳細は第5章「共通定義（$defs Common Definitions）」を参照。

---

## 第5章　主要要素 (Primary Elements)

### 5.1 lines — 関係要素（Dynamic Relation Element）

#### 5.1.1 概要
`lines` は 3DSS における**動的関係要素**を表し、`points` 間の構造的・論理的・動的リンクを定義する。
それぞれの line は、`signification`（意味層）、`appearance`（形態層）、`meta`（管理層）の三層構造を持つ。

#### 5.1.2 構造図（概念）
```
lines
 ├─ signification
 │    ├─ relation : 構造・動的・論理・時間・メタ関係の分類
 │    └─ sense     : a_to_b / b_to_a / bidirectional / neutral
 ├─ appearance
 │    ├─ line_type  : straight / polyline / bezier / catmullrom / arc
 │    ├─ line_style : solid / dashed / dotted / double / none
 │    ├─ arrow     : shape / size / placement
 │    ├─ effect    : effect_type / amplitude / speed / duration / loop / easing
 │    └─ geometry  : #/$defs/validator/line_geometry
 └─ meta
      ├─ uuid
      ├─ tags
      └─ creator_memo
```

---

#### 5.1.3 signification 層
意味論層は、関係の種別と方向性を定義する。
内部には `relation` と `sense` の2プロパティを持つ。

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `relation` | object | 任意 | – | 構造的／動的／論理的／時間的／メタ関係の種別を定義。各サブキーは排他的に使用。 |
| `relation.structural（構造関係）` | string(enum) | 任意 | – | association（連結） / containment（包含） / hierarchy（階層） |
| `relation.dynamic（動的関係）` | string(enum) | 任意 | – | causal（因果） / flow（流れ） / influence（影響） / derivation（派生） / transformation（変換） / feedback（フィードバック） / recursion（再帰） / reflection（反射） |
| `relation.logical（論理関係）` | string(enum) | 任意 | – | equivalence（同値） / negation（否定） / implication（含意） / support（支持） / conflict（矛盾） |
| `relation.temporal（時間関係）` | string(enum) | 任意 | – | precedence（先行） / succession（後続） |
| `relation.meta（参照・注釈関係）` | string(enum) | 任意 | – | reference（参照） / annotation（注釈） |
| `sense（方向性）` | string(enum) | 任意 | a_to_b | 関係方向性。AからBへ、BからAへ、双方向、または中立を示す。 |

> ✅ `relation` は排他構造を想定しており、複数同時指定は非推奨。
> ✅ `sense` のデフォルトは `a_to_b`。必要に応じ逆転可。

---

#### 5.1.4 appearance 層
形態層は、線の形状・描画特性・付属表現を定義する。

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `line_type` | string(enum) | 任意 | straight | 線の種類（直線／折線／曲線など）。 |
| `line_style` | string(enum) | 任意 | solid | 線の描画スタイル。 |
| `color` | #RGB / #RRGGBB を許容 | 任意 | #ffffff | 線色。 |
| `opacity` | number(0-1) | 任意 | 1.0 | 不透明度。 |
| `visible` | boolean | 任意 | true | 表示可否。 |
| `renderOrder` | number/string | 任意 | 0 | レンダリング順。 |
| `geometry` | object($ref) | 条件付き必須 | – | 幾何構造を保持（polyline/bezier等）。 |
| `arrow` | object | 任意 | – | 矢印構成（shape/size/aspect/placement）。 |
| `effect` | object | 任意 | – | 動的表現効果設定（pulse/flow/glow等）。 |

**条件付き必須**：`line_type` が straight 以外の場合、`geometry` が必須となる。

##### 5.1.4.1 arrow オブジェクト
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `shape` | string(enum) | 任意 | cone | 矢印形状。cone / pyramid / line |
| `size` | number | 任意 | **1.0** | 矢印サイズ（スキーマ既定値）。 |
| `aspect` | number | 任意 | **1.0** | 矢印の縦横比。 |
| `placement` | string(enum) | **必須** | **end_b** | 配置位置。end_a / end_b / both / none |
| `auto_orient` | boolean | 任意 | **true** | 線の方向に自動整列するか。 |

##### 5.1.4.2 effect オブジェクト
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `effect_type` | string(enum) | 任意 | **none** | エフェクト種別（none / pulse / flow / glow）。 |
| `amplitude` | number(≥0) | 任意 | **1.0** | 強度。 |
| `speed` | number(≥0) | 任意 | **1.0** | 再生速度。 |
| `duration` | number(≥0) | 任意 | **1.0** | 継続時間。 |
| `loop` | boolean | 任意 | **true** | 繰り返し再生。 |
| `phase` | number(0–1) | 任意 | **0.0** | 開始位相。 |
| `easing` | string(enum) | 任意 | **linear** | イージング曲線。 |
| `width` | number | 任意 | **1.0** | 効果の見た目幅（実装依存）。 |

---

#### 5.1.5 meta 層
| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `uuid` | string(uuid) | ✅ | 一意識別子。 |
| `tags` | array(string) | 任意 | s:/m:/x: によるスコープ分類タグ（構造／意味／メタ）。 |
| `creator_memo` | string | 任意 | 制作者専用備考。 |

---

#### 5.1.6 参照整合 (Reference Integrity)
- 端点は point 参照（ref） または 座標直指定（coord） のいずれかで与えられる。
- `appearance.end_a.ref` および `end_b.ref` は **point.meta.uuid** のみを参照できる。
- `ref_integrity` により循環・交差参照は禁止。
　`allow_self_reference: false`, `allow_cross_reference: false`
- 例外的に、annotation や meta-line で他 line を参照する拡張は将来拡張領域とする。

---

#### 5.1.7 幾何情報 (Geometry)
- `#/$defs/validator/line_geometry` に準拠。
- 定義済み項目：`polyline_points`, `bezier_controls`, `arc_center`, `arc_radius`, `arc_angle_start`, `arc_angle_end`, `catmullrom_points`, `catmullrom_tension`。
- `dimension` は 2 または 3。デフォルト 3。

---

#### 5.1.8 整合確認要約
- ✅ signification.relation/sense は $defs.enum_constraint と完全整合。
- ✅ appearance 内の line_type/line_style/arrow/effect は $defs.enum_constraint に準拠。
- ✅ geometry 条件付き必須ルールが明文化された。
- ✅ meta.uuid 必須・creator_memo 任意がスキーマ一致。
- ✅ ref_integrity の範囲・自己循環禁止ルールを仕様に反映。

---

### 5.2 points — 存在要素（Existential Point Element）

#### 5.2.1 概要
`points` は 3DSS における**存在要素**を表し、空間上の基準点・ノード・アンカーなど、構造の静的基盤を定義する。
各 point は `signification`（意味層）、`appearance`（形態層）、`meta`（管理層）の三層構造を持つ。

#### 5.2.2 構造図（概念）
```
points
 ├─ signification
 │    └─ name : string / { ja, en }
 ├─ appearance
 │    ├─ position : [x, y, z]
 │    └─ marker
 │         ├─ common : visible / orientation / scale / color / opacity / emissive / wireframe
 │         ├─ shape : sphere / box / cone / pyramid / corona / none
 │         ├─ gltf  : url / scale / rotation / offset
 │         └─ text  : content / font / size / align / billboard / plane
 └─ meta
      ├─ uuid
      ├─ tags
      └─ creator_memo
```

---

#### 5.2.3 signification 層
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `name（名称）` | string / object(ja,en) | 任意 | – | 点の名称。日本語・英語の併記可。例：{"ja":"原点","en":"Origin"} |

---

#### 5.2.4 appearance 層
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `position（座標）` | array(number,3) | ✅ | – | 3次元座標 [x, y, z]。|
| `marker` | object | 任意 | – | マーカーの形状・表示・ラベル設定。 |

##### 5.2.4.1 marker.common
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `visible（表示可否）` | boolean | 任意 | true | 表示／非表示。 |
| `orientation（向き）` | array(number,3) | 任意 | [0,0,0] | 方向ベクトル。 |
| `scale（拡大率）` | array(number,3) | 任意 | [1,1,1] | 各軸のスケール。 |
| `color（色）` | #RGB / #RRGGBB を許容 | 任意 | #ffffff | マーカー色。 |
| `opacity（不透明度）` | number(0-1) | 任意 | 1.0 | マーカーの透明度。 |
| `emissive（発光）` | boolean/string | 任意 | false | 発光効果。文字列指定の場合は色コード。 |
| `wireframe（ワイヤーフレーム表示）` | boolean | 任意 | false | 線表示モード。 |

##### 5.2.4.2 marker.shape
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `shape（形状）` | string(enum) | 任意 | sphere | マーカー形状。sphere（球）/ box（立方体）/ cone（円錐）/ pyramid（四角錐）/ corona（光輪）/ none（なし） |

##### 5.2.4.3 marker.gltf
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `url（参照先）` | string | 任意 | – | glTFモデルファイルのURL。 |
| `scale（拡大率）` | array(number,3) | 任意 | [1,1,1] | モデルのスケール。 |
| `rotation（回転）` | array(number,3) | 任意 | [0,0,0] | モデル回転角（rad）。 |
| `offset（位置補正）` | array(number,3) | 任意 | [0,0,0] | モデルの原点からのオフセット。 |

##### 5.2.4.4 marker.text
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `content（文字内容）` | string | 任意 | – | 表示するテキスト。 |
| `font（フォント）` | string | 任意 | helvetiker_regular | 使用フォント。 |
| `size（文字サイズ）` | number/integer | 任意 | 1.0 | テキストサイズ。 |
| `align（配置）` | string(pattern) | 任意 | center&middle | left/center/right と top/middle/baseline の組み合わせ。 |
| `billboard（常時正面）` | boolean | 任意 | true | カメラ方向へ常時回転。 |
| `plane（配置面）` | string(enum) | 任意 | xy | 表示面。xy / yz / zx |

---

#### 5.2.5 meta 層
| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `uuid` | string(uuid) | ✅ | 一意識別子。 |
| `tags` | array(string) | 任意 | s:/m:/x: によるスコープ分類タグ（構造／意味／メタ）。 |
| `creator_memo` | string | 任意 | 制作者専用備考。 |

---

#### 5.2.6 整合確認要約
- ✅ `signification.name` は ja/en 両対応の oneOf 構造。 |
- ✅ `appearance.position` は3要素配列で固定長。 |
- ✅ `marker.shape` の enum 値は $defs.enum_constraint と整合。 |
- ✅ `meta.uuid` 必須・creator_memo 任意が一致。 |
- ✅ glTF/text構造の `additionalProperties:false` に準拠。 |

---

### 5.3 aux — 補助構造（Auxiliary Elements）

#### 5.3.1 概要
`aux` は 3DSS における**空間補助構造（Spatial Auxiliary Structures）**を表し、Viewer／Modeler における可視化・位置認識・境界把握を補助する基盤構造を定義する。  
意味的情報（signification）は持たず、すべての設定は形態層（appearance）内で記述される。

#### 5.3.2 構造図（概念）
```
aux
 ├─ appearance
 │    ├─ grid   : subdivisions / major_step / minor_step / color_major / color_minor
 │    ├─ axis   : length / labels / arrow
 │    ├─ plate  : plane / position / size / reflectivity / opacity
 │    ├─ shell  : shell_type / opacity / reflectivity / effect
 │    ├─ hud    : follow_camera / scale_with_distance
 │    └─ position / orientation / opacity
 └─ meta
      ├─ uuid
      └─ creator_memo
```

---

#### 5.3.3 appearance 層
`aux` のすべての構成要素は appearance 層に統合される。  
ここには grid, axis, plate, shell が含まれ、いずれも Viewer が視覚的に描画する補助構造である。

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `grid（グリッド設定）` | object | 任意 | – | 座標格子の設定。|
| `grid.grid_type` | string(enum) | 任意 | cartesian | 格子種別：`cartesian` / `polar`。 |
| `grid.subdivisions` | integer | 任意 | 10 | 細分数。 |
| `grid.major_step` | number | 任意 | 1 | 主格子間隔。 |
| `grid.minor_step` | number | 任意 | 0.1 | 補助格子間隔。 |
| `grid.color_major` | #RGB / #RRGGBB を許容 | 任意 | #666666 | 主格子線の色。 |
| `grid.color_minor` | #RGB / #RRGGBB を許容 | 任意 | #333333 | 補助格子線の色。 |
| `axis（軸設定）` | object | 任意 | – | 三次元座標軸の設定。 |
| `axis.length` | number | 任意 | 10 | 軸の長さ。 |
| `axis.labels` | boolean | 任意 | true | 軸ラベルを表示するか。 |
| `axis.arrow` | boolean | 任意 | true | 軸端に矢印を付けるか。 |
| `plate（プレート設定）` | object | 任意 | – | 空間内の境界面。反射／不透過を設定できる。 |
| `plate.plane` | string(enum) | 任意 | xy | xy / yz / zx。 |
| `plate.position` | array(number,3) | 任意 | [0,0,0] | 平面の基準点。 |
| `plate.size` | array(number,2) | 任意 | [10,10] | 平面のサイズ。 |
| `plate.reflectivity` | number(0–1) | 任意 | 0 | 反射率。0で壁、1で鏡。 |
| `plate.opacity` | number(0–1) | 任意 | 0.2 | 不透明度。 |
| `shell（シェル設定）` | object | 任意 | – | 内部が空洞の三次元外皮構造。 |
| `shell.shell_type` | string(enum) | 任意 | sphere | sphere / box / hemisphere / quarter_sphere / eighth_sphere。 |
| `shell.opacity` | number(0–1) | 任意 | 0.3 | 透過度。 |
| `shell.reflectivity` | number(0–1) | 任意 | 0 | 表面反射率。 |
| `shell.effect` | object | 任意 | – | Viewerが適用する視覚効果の意図を示す。 |
| `shell.effect.edge_intensity` | number(0–1) | 任意 | 0.5 | 境界線の強調度。 |
| `shell.effect.rimlight` | boolean | 任意 | false | Viewerがリムライトを適用可能か。 |
| `shell.effect.glow_color` | #RGB / #RRGGBB を許容 | 任意 | #ff0000 | 境界発光色。 |
| `hud（HUD設定）` | object | 任意 | – | Head-Up Display の表示制御。 |
| `hud.follow_camera` | boolean | 任意 | true | カメラ追従。 |
| `hud.scale_with_distance` | boolean | 任意 | true | 距離に応じてスケール調整。 |
| `position` | array(number,3) | 任意 | [0,0,0] | 補助構造の基準位置。 |
| `orientation` | array(number,3) | 任意 | [0,0,0] | 補助構造の回転方向。 |
| `opacity` | number(0–1) | 任意 | 1.0 | 補助構造全体の透明度。 |

---

#### 5.3.4 meta 層
| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `uuid` | string(uuid) | ✅ | 一意識別子。 |
| `creator_memo` | string | 任意 | 制作者専用備考。 |

---

#### 整合確認要約
- ✅ `grid` / `axis` / `hud` は $defs.enum_constraint に準拠。 |
- ✅ 既定値はすべてスキーマ `default` 定義に一致。 |
- ✅ meta.uuid 必須・creator_memo 任意が一致。 |
- ✅ `appearance` の構造・属性名がスキーマに完全整合。 |

---

### 5.4 document_meta — 文書メタ情報（Document Metadata）

#### 5.4.1 概要
`document_meta` は 3DSS 文書全体を統括する**管理・識別メタ情報**を定義する領域である。
スキーマの参照元、生成ツール、座標系、単位系、バージョン、作者、更新日時などを含み、
ファイルレベルでの整合性と追跡可能性を担保する。

#### 5.4.2 構造図（概念）
```
document_meta
 ├─ document_uuid
 ├─ document_tags
 ├─ schema_uri
 ├─ generator
 ├─ reference
 ├─ coordinate_system
 ├─ units
 ├─ i18n
 ├─ author
 ├─ version
 ├─ updated_at
 ├─ tags
 └─ creator_memo
```

---

#### 5.4.3 プロパティ一覧
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `document_uuid` | string(uuid) | ✅ | – | 文書固有の識別子。すべての3DSSファイルで一意。 |
| `document_tags` | array(string) | 任意 | – | s:/m:/x: によるスコープ分類タグ（構造／意味／メタ）。 |
| `schema_uri` | string(uri) | ✅ | – | 準拠するスキーマのURI。例：https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0  |
| `generator` | string(uri) | 任意 | – | この文書を生成したツールまたはアプリの識別URI。 |
| `reference` | string | 任意 | – | 外部参照、出典、備考。 |
| `coordinate_system（座標系）` | string(enum) | 任意 | X+Y=+Z/up:z | 座標系および上方向を指定。例：X+Y=+Z/up:x, X+Y=-Z/up:y など。 |
| `units（単位系）` | string(enum) | 任意 | m | 使用単位。m, cm, mm, non_si:px など。 |
| `i18n（言語）` | string(enum) | 任意 | ja | 文書の基本言語設定。ja / en。 |
| `author（作者）` | string | ✅| – | 制作者名またはメールアドレス。形式：name または name@example.com。 |
| `version（バージョン）` | string(SemVer) | ✅ | 1.0.0 | 文書バージョン。SemVer 準拠。例：1.0.0-beta。 |
| `updated_at（更新日時）` | string(ISO8601 UTC) | 任意 | – | 最終更新日時。例：2025-10-21T12:00:00Z。 |
| `tags` | array(string) | 任意 | s:/m:/x: によるスコープ分類タグ（構造／意味／メタ）。 |
| `creator_memo` | string | 任意 | – | 制作者による補足メモ。バリデータ非対象。 |

---

#### 5.4.4 整合確認要約
- ✅ すべてのフィールドがスキーマ `properties` に一致。 |
- ✅ `document_uuid` は必須、その他は任意。 |
- ✅ `version` は SemVer 形式の正規表現に準拠。 |
- ✅ `updated_at` は ISO8601 UTC タイムスタンプに準拠。 |
- ✅ `coordinate_system` / `units` / `i18n` の enum 値が $defs.enum_constraint と整合。 |
- ✅ `creator_memo` はコメント的用途のみでバリデータ対象外。 |

---

## 第6章　共通定義（Common Definition）

本章では、スキーマ全体の整合性を保証する `$defs` 領域の構造を示す。
その中核を成す `validator` 定義群は、型・列挙・正規表現・必須項目・参照整合・幾何構造の6つのサブセクションから構成される。

### 6.1 validator（バリデータ定義群）

#### 6.1.1 type_check（型定義）
| キー | 型 | 説明 |
|------|----|------|
| `uuid_v4（UUID v4 形式）` | string(pattern) | 一意識別子を定義。形式：xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx |
| `vector3（三次元ベクトル）` | array(number,3) | 三次元座標 [x, y, z] を定義。 |
| `color_hex（カラーコード）` | #RGB / #RRGGBB を許容 | RGBカラーコード。例：#RRGGBB。 |
| `uri（URI形式）` | string(format) | URIとして有効な文字列。 |

#### 6.1.2 pattern（正規表現パターン）
| 名称 | 正規表現 | 説明 |
|------|-----------|------|
| `uuid_v4（UUID v4）` | `^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` | UUIDバージョン4の形式。 |
| `semver（セマンティックバージョン）` | `^\d+\.\d+\.\d+(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$` | SemVer準拠。例：1.0.0, 1.0.0-beta。 |
| `timestamp_utc（UTCタイムスタンプ）` | `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` | ISO8601 UTC形式の日時。 |
| `tag_scope（タグスコープ）` | `^(s|m|x):[a-z0-9_\-]+$` | タグ分類接頭辞。s:/m:/x: に対応。 |

#### 6.1.3 enum_constraint（列挙値制約）
スキーマ内で用いられるすべての列挙値を集中定義し、整合性を維持する。

| カテゴリ | キー | 値群（日本語訳） |
|-----------|------|----------------|
| 言語／単位 | `language（言語）` | ja（日本語） / en（英語） |
|  | `units（単位）` | m（メートル） / cm（センチ） / mm（ミリ） / non_si:px（ピクセル） |
| 座標系 | `coordinate_system（座標系）` | X+Y=+Z/up:x（Z上方向） ～ X+Y=-Z/up:z（Z下方向） |
| 構造関係 | `relation_structural（構造関係）` | association（連結） / containment（包含） / hierarchy（階層） |
| 動的関係 | `relation_dynamic（動的関係）` | causal（因果） / flow（流れ） / influence（影響） / derivation（派生） / transformation（変換） / feedback（フィードバック） / recursion（再帰） / reflection（反射） |
| 論理関係 | `relation_logical（論理関係）` | equivalence（同値） / negation（否定） / implication（含意） / support（支持） / conflict（矛盾） |
| 時間関係 | `relation_temporal（時間関係）` | precedence（先行） / succession（後続） |
| メタ関係 | `relation_meta（参照・注釈関係）` | reference（参照） / annotation（注釈） |
| 方向性 | `sense（方向性）` | a_to_b（A→B） / b_to_a（B→A） / bidirectional（双方向） / neutral（中立） |
| 線スタイル | `line_style（線スタイル）` | solid（実線） / dashed（破線） / dotted（点線） / double（二重線） / none（なし） |
| 矢印形状 | `arrow_shape（矢印形状）` | cone（円錐） / pyramid（角錐） / line（線状） |
| 矢印配置 | `arrow_placement（矢印配置）` | end_a（始端） / end_b（終端） / both（両端） / none（なし） |
| マーカー形状 | `marker_shape（マーカー形状）` | sphere（球） / box（立方体） / cone（円錐） / pyramid（角錐） / corona（光輪） / none（なし） |
| マーカー平面 | `marker_plane（マーカー平面）` | xy / yz / zx |
| テキスト配置 | `text_align（テキスト配置）` | left&top / center&middle / right&baseline など9種 |
| エフェクト種 | `effect_type（エフェクト種）` | pulse（パルス） / flow（流動） / glow（発光）/ none |
| イージング | `easing_mode（イージング）` | linear / ease-in / ease-out / ease-in-out |
| スキーマ状態 | `schema_status（スキーマ状態）` | stable（安定） / beta（試験） / deprecated（廃止予定） |

#### 6.1.4 required_sets（必須項目集合）
| 名称 | 必須プロパティ群 |
|------|----------------|
| `document_meta` | document_uuid, schema_uri, author, version |
| `point_item` | appearance, meta |
| `line_item` | appearance, meta |
| `aux_item` | meta |
| `meta_core` | uuid |
| `relation_core` | relation, sense |
| `appearance_core` | visible, renderOrder, color, opacity |
| `validator_core` | type_check, pattern, enum_constraint, required_sets |

#### 6.1.5 ref_integrity（参照整合性）
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `ref_target_type（参照対象タイプ）` | string(enum) | point | 参照可能なオブジェクト種別を指定。デフォルトは point。 |
| `allow_self_reference（自己参照許可）` | boolean | false | 自身を参照できるか。 |
| `allow_cross_reference（交差参照許可）` | boolean | false | 他line間での参照を許可するか。 |

#### 6.1.6 line_geometry（線形ジオメトリ定義）
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `dimension（次元数）` | integer | 3 | 幾何空間の次元。2または3。 |
| `polyline_points（折線点群）` | array(vector3) | – | 折線経路を構成する座標群。 |
| `bezier_controls（ベジェ制御点）` | array(vector3,1–2) | – | ベジェ曲線の制御点。 |
| `arc_center（円弧中心）` | vector3 | – | 円弧の中心座標。 |
| `arc_radius（半径）` | number | – | 円弧半径。 |
| `arc_angle_start（開始角）` | number | – | 円弧の開始角度（rad）。 |
| `arc_angle_end（終了角）` | number | – | 円弧の終了角度（rad）。 |
| `arc_clockwise（時計回り指定）` | boolean | true | trueで時計回り。 |
| `catmullrom_points（Catmull-Rom点群）` | array(vector3) | – | Catmull-Rom曲線の経路点群。 |
| `catmullrom_tension（張力）` | number(0–1) | 0.5 | 曲線の滑らかさ。 |

### 6.2 拡張予約領域（Extension Reserved）

`$defs.extension` は、将来的な Authoring 層・自動生成層（parametric / semantic_generation）の外部拡張モジュールを格納するための予約領域である。
現行仕様では空定義であり、バリデーション対象外。

| キー | 用途 |
|------|------|
| `parametric` | 幾何拘束・変数・依存関係などの拡張構造を想定 |
| `semantic_generation` | AI / LLM 等による自動構造生成メタを想定 |

これらは 3DSS の構造層とは独立して設計される予定であり、`$defs.extension` はその連携口としてのみ保持される。

---

#### 6.2.1 整合確認要約
- ✅ `$defs.validator` 配下の構造階層を忠実に再現。 |
- ✅ 各 enum・pattern 値が $defs.enum_constraint と相互参照可能。 |
- ✅ line_geometry のプロパティ構造が polyline / bezier / arc / catmullrom を完全カバー。 |
- ✅ ref_integrity のデフォルト値・制約が明文化済。 |
- ✅ 仕様書全体の整合性チェック基準として機能する。 |

---

## 第7章　拡張・互換性（Extension & Compatibility）

### 7.1 バージョン管理（Version Management）
- スキーマのバージョンは **Semantic Versioning（セマンティックバージョン）** に準拠し、`major.minor.patch` 形式で表記する。例：1.0.0。
- 状態は `$defs.enum_constraint.schema_status` により区分される。
  - `stable（安定版）`：運用中の確定仕様。
  - `beta（試験版）`：検証段階の暫定仕様。
  - `deprecated（廃止予定）`：今後削除予定の仕様。
- バージョンは `document_meta.version` に明記し、過去バージョンとの互換情報を保持する。

---

### 7.2 拡張ルール（Extension Policy）
- 新要素や列挙値（enum）の追加は `$defs.validator` 配下の該当節に登録する。
- 既存プロパティの削除は禁止。非推奨化には `"deprecated": true` フラグを使用する。
- 外部拡張スキーマは `$ref` で連携可能。例：`"$ref": "./custom_ext.schema.json"`
- 追加拡張は `$defs` 構造との互換を保ち、上位スキーマとの競合を避ける。

---

### 7.3 互換性維持（Backward Compatibility）
- **旧要素の保持義務**：既存の要素・プロパティは最低2版分の維持を原則とする。
- **属性互換**：enumへの追加は許可されるが、既存値の変更・削除は禁止。
- **構造互換**：必須構造（appearance／meta など）を崩さない。
- **スキーマURIポリシー**：各バージョンのスキーマURIは固定し、リポジトリやブランチで管理する。

---

### 7.4 バリデーション互換性（Validation Compatibility）
- スキーマは **JSON Schema Draft 2020-12** 準拠とし、AJVなど主要バリデータでの検証通過を保証する。
- 拡張スキーマも `$defs` 構造に整合すれば、同一バリデータ上での連携が可能。
- 互換性破壊が生じる変更はメジャーバージョンアップに限り許可される。

---

### 7.5 廃止要素の扱い（Deprecation Handling）
- 廃止予定要素は `$defs.enum_constraint.schema_status` にて `deprecated` として明示する。
- 非推奨要素は仕様書内に注記し、後続版で削除候補として扱う。
- 廃止予定要素を保持する文書のバリデーションは警告レベルで処理する（エラーではない）。

---

### 7.6 外部仕様との互換（External Compatibility）
- 本スキーマは **JSON Schema Draft 2020-12** に完全準拠する。
- **OpenAPI Schema** および **Schema.org** の基本型との整合を保持する。
- 拡張時には **JSON-LD**, **glTF** など外部仕様との連携を許容し、相互参照可能なメタ構造を維持する。

---

#### 整合確認要約
- ✅ `schema_status` により状態管理（stable／beta／deprecated）が一元化。 |
- ✅ SemVer に基づくバージョン整合が確立。 |
- ✅ `$defs` 拡張ルールと外部スキーマ参照方針を明文化。 |
- ✅ 互換性維持・廃止要素の扱い方針が明示。 |
- ✅ JSON Schema Draft 2020-12, OpenAPI, Schema.org, glTF との互換整合。 |

---

## 第8章　例（Example）
```json
{
  "lines": [
    {
      "signification": {
        "relation": { "structural": "association" },
        "sense": "a_to_b"
      },
      "appearance": {
        "end_a": { "ref": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
        "end_b": { "ref": "ffffffff-1111-2222-3333-444444444444" },
        "line_type": "straight",
        "line_style": "solid",
        "color": "#ffffff",
        "arrow": { "shape": "cone", "placement": "end_b" }
      },
      "meta": { "uuid": "99999999-8888-7777-6666-555555555555" }
    }
  ],
  "points": [
    {
      "appearance": {
        "position": [0, 0, 0],
        "marker": { "shape": "sphere" }
      },
      "meta": { "uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
    },
    {
      "appearance": {
        "position": [1, 0, 0],
        "marker": { "shape": "box" }
      },
      "meta": { "uuid": "ffffffff-1111-2222-3333-444444444444" }
    }
  ],
  "aux": [
    {
      "appearance": {
        "grid": {
          "grid_type": "cartesian",
          "major_step": 1,
          "minor_step": 0.1
        },
        "axis": { "length": 10, "arrow": true }
      },
      "meta": { "uuid": "abcdabcd-abcd-abcd-abcd-abcdabcdabcd" }
    }
  ],
  "document_meta": {
    "document_uuid": "11111111-2222-3333-4444-555555555555",
    "version": "1.0.0",
    "author": "creator@example.com",
    "updated_at": "2025-10-21T12:00:00Z",
    "coordinate_system": "X+Y=+Z/up:z",
    "units": "m",
    "i18n": "ja"
  }
}

```

---

## 第9章　変更履歴（Change Log）
| Version | Date | Change | Status |
|---|---|---|---|
| 1.0.0 | 2025-10-21 | 初版確定 | stable |

---

## 第10章　付録（Appendix）
- **用語索引**：relation / sense / line_type / marker / effect など。
- **参照リンク**：
  - JSON Schema 2020-12 Specification
  - OpenAPI Specification
  - Schema.org Style Guide---
