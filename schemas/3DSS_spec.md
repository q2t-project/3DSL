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
| 関連スキーマ | 3DSS-prep（作業入力用ミニマルスキーマ） |

3DSS は、3DSL（Three-Dimensional Structural Language）における
三次元構造記述のための標準スキーマであり、
lines（関係要素）・points（存在要素）・aux（補助要素）・document_meta（管理情報）を中核として設計されている。
URI末尾の `#v1.0.0` はスキーマバージョン識別タグである。
本仕様書が対象とするのは構造層のスキーマ `3DSS.schema.json` である。  
これとは別に、Authoring 層から modeler へ JSON 形式で疎データを受け渡すための  
最小スキーマ `3DSS-prep.schema.json` を定義する（詳細は 2.3節）。

---

## 座標系およびキラリティ指針

3DSL／3DSS 全体で **Z+ 軸を絶対上方向** とする三軸直交座標系を採用する。
X・Y は Z+ に直交する限り任意方向を許容する。

| 軸 | 対応する指 | 主体からの方向 |
| -- | -- | -- |
| X+ | 左第三指 | 右 |
| Y+ | 左第二指 | 前 |
| Z+ | 左第一指 | 上 |

Z+ はすべての層（構造・表示・認識）で共通の上方向基準とし、
現実空間・ディスプレイ空間・アプリ空間間の整合を保証する。
本仕様における `document_meta.coordinate_system` は "Z+up/freeXY" に固定されており、
スキーマ上でもこの値以外は許可されない（constにより単一選択制）

---

## 第2章　3DSL 全体アーキテクチャ（Authoring → Structural → Viewer）

3DSL は制作から表示までを二層で捉える：

- **Authoring Layer（制作層）**：構造化以前の情報（OCR／LLM の仮説、拘束・依存、UI／履歴、生成ルールなど）を保持する自由領域。形式は規定しない。本層は 3DSS スキーマの適用対象外である。
- **Structural Layer（構造層）**：確定した構造のみを保持する共有スキーマ。本仕様（3DSS.schema.json）に準拠し、Viewer／Validator は本層のみを解釈対象とする。

---

### 2.1 レイヤ境界

| 観点 | Authoring | Structural |
|---|---|---|
| 役割 | 構造化前の思考・生成 | 構造の確定・共有・表示 |
| 含有 | OCR／LLM仮説、拘束／依存、UI／履歴 | lines／points／aux／document_meta |
| 曖昧さ | 許容（信頼度／未確定） | 不許容（確定値） |
| 形式 | 自由 | 3DSS.schema.json |

Authoring 層の内部表現そのものは形式自由だが、  
JSON で modeler へ受け渡すケースに対しては、推奨インターフェースとして  
3DSS-prep.schema.json（拡張子 `.3dss-prep.json`）を用意する。

prep は **Authoring 層の一部** であり、構造層（3DSS.schema.json）とは別スキーマである。  
viewer は prep を直接扱わず、常に構造層（.3dss.json）だけを入力とする。

---

### 2.2 Export 共通契約（要約）

① **Resolve**（拘束・変数・依存を解消）  
② **Flatten**（参照／生成の展開）  
③ **Prune**（一時／未確定データの除去）  
④ **Normalize**（座標系・単位・色・enum の正規化）  

これらの段階を経て、Authoring 層のデータは 3DSS 構造層へ収束する。  
Normalize 段階では `$defs.validator` 内の `type_check` および `enum_constraint` 定義に基づき正規化が行われる。

`document_meta` には必須項目として  
`document_uuid`, `schema_uri`, `author`, `version`  
を、任意項目として  
`generator`, `updated_at`  
を記載し、追跡可能性と再現性を担保する。

Viewer 固有のレンダ設定（照明・影・シェーダなど）は本仕様の対象外とする。  
ただし構造定義上の基本的な表示属性（color, opacity, emissive など）はスキーマに含まれる。

### 2.3 3DSS-prep スキーマ（作業入力用ミニマルスキーマ）

3DSS-prep（`3DSS-prep.schema.json`）は、Authoring 層から modeler への
**作業入力（prep）** を JSON で受け渡すためのミニマルスキーマである。

- ファイル拡張子：`.3dss-prep.json`
- スキーマ `$id`：
  `https://q2t-project.github.io/3dsl/schemas/3DSS-prep.schema.json#v1.0.0`
- 役割：  
  - LLM / OCR / 外部DB 等が生成した「名称リスト」等の疎データを  
    modeler に渡すための基本フォーマット
  - 構造層の 3DSS.schema.json とは別系統のスキーマ
  - viewer は直接解釈しない（modeler だけが対象）

#### 2.3.1 ルート構造（概要）

3DSS-prep のルートオブジェクトは、次の2要素だけを規定する：

| プロパティ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `points` | array(object) | ✅ | 疎な点情報のリスト。name だけ必須。 |
| `document_meta` | object | 任意 | 入力元のメタ情報（スキーマURI等）。 |

その他のルートプロパティは `additionalProperties: true` により許容される。  
prep は将来の拡張やツール固有の情報を邪魔しない**ゆるいインターフェース**として設計する。

#### 2.3.2 points の構造（概要）

`points` 配下では、各要素に対して **name だけ** を必須とする：

| プロパティ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `name` | string | ✅ | 点の名称。prep ではこれだけが必須。 |

その他のプロパティ（座標・タグ・補足情報など）は  
`additionalProperties: true` により任意に付与できるが、  
**prep スキーマとしては意味を規定しない**。  

modeler の Importer は、name だけを見て temp_point を生成し、  
Direct Spatial Editing や数値入力を通じて position や meta を付与していく。

#### 2.3.3 document_meta の構造（概要）

`document_meta` には、スキーマ識別用の `schema_uri` だけを必須とする：

| プロパティ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `schema_uri` | string(uri) | ✅ | このファイルが準拠するスキーマURI（prep）。 |
| `generator` | string | 任意 | 生成ツール名やバージョン。 |
| `source` | string | 任意 | 元データの出典やパス。 |

ここでも `additionalProperties: true` とし、  
ツール固有のフィールド（例：task_id, prompt, confidence など）を自由に付与できる。

3DSS（構造層）の `document_meta` と異なり、  
prep の `document_meta` では座標系・単位・言語コード・タグ等は規定しない。  
これらは 3DSS 側の構造化プロセスで **初めて確定される属性** と位置づける。

#### 2.3.4 lines / aux を prep から外す理由

3DSS-prep.schema.json では、あえて `lines` / `aux` をスキーマに含めない。

- 意味のある line を大量に定義するには、  
  上流側にかなり強い意味解釈能力が必要
- 人手だけで大量の line を前段で作るのは現実的ではなく、  
  そのために modeler が要請されている
- よって prep 段階では **「名前付きの点の集合」** までにとどめ、  
  関係線（lines）は modeler 内で point を見ながら構造化していく

一方で、3DSS-prep.schema.json はルートに `additionalProperties: true` を許すため、  
上流ツールが試験的に `lines` やその他の構造を埋め込むこと自体は妨げない。  

この場合：

- prep スキーマとしてはそれらの意味を定めない
- modeler 側の Importer が、必要に応じて  
  「ヒント情報」として解釈・昇格するかどうかを実装側で決める

という役割分担とする。

#### 2.3.5 3DSS（構造層）との関係

3DSS-prep と 3DSS 構造層の関係は、次のように整理できる：

- prep：  
  - Authoring 層に属する  
  - 疎な name リスト＋ごく簡単なメタ情報  
  - Validator は「形式が prep かどうか」だけを見る
- 3DSS（構造層）：  
  - viewer / modeler 共通の正規構造データ  
  - lines / points / aux / document_meta を完全定義  
  - strict full validation（AJV等）で完全検証

modeler の I/O 観点では、次のパイプラインになる：

```text
prep (.3dss-prep.json)
  → Importer（name → temp_point）
  → Direct Spatial Editing / 数値入力
  → Confirm（temp → structure）
  → 3DSS (.3dss.json) へ export
```

---

## 第3章　設計理念（Design Philosophy）

3DSS は、単なる構文規範ではなく、**『構造』の階層性を可視化する言語的枠組み**として設計されている。

---

### 3.1 基本原理

- すべての要素は「関係」「存在」「補助」「管理」の4領域に分類され、それぞれ `lines`・`points`・`aux`・`document_meta` が対応する。  
- 各要素は原則として三層構造（signification／appearance／meta）で表現される。  
  - signification：意味的情報（関係・概念・方向性）  
  - appearance：形態的情報（位置・色・形状・描画特性）  
  - meta：管理情報（UUID・タグ・制作者メモなど）  
- `lines` と `points` は三層すべてを持つ。  
- `aux` は signification 層を持たず、**定義自体が存在しない**。appearance と meta のみで構成される。  
- `document_meta` は全体情報を統括する独立メタ要素として、三層構造の外側に位置づけられる。  
- 意味層は概念的関係（構造／因果／論理／時間）を、形態層は幾何・描画特性を、管理層は識別と履歴を担う。  
- 3DSS は構造の階層性を言語的に記述する枠組みである。

---

### 3.2 構造的思考の指針

- `points` は「存在」を、`lines` は「関係」を、`aux` は「補助的構造」を、`document_meta` は「全体管理」を表す。  
- `points` が「存在の点」であるなら、`lines` は「意味の軸」であり、二つの存在を結ぶだけでなく、**力学・流動・因果・論理的反射**を示す媒介として扱う。  
- これにより、3DSS は静的構造表現から動的概念構造表現へと拡張される。

---

### 3.3 設計指針

- スキーマ設計では論理的一貫性を優先し、表現上の自由度はその範囲で確保する。  
  これにより、スキーマは Viewer の描画負荷から独立して構造定義の安定性を維持する。

#### 3.3.1 表現と構造の分離原則

3DSS は「構造」を記述するための言語であり、照明・影・反射など Viewer 固有の演出要素は保持しない。  
ただし、構造定義上の基本的な表示属性（`color`, `opacity`, `emissive` など）は、構造可視化のための最小限の範囲として含まれる。  

拡張定義は $defs に集約し、実体側（例：aux.module.extension）には $ref のみを記述する。
$defs は以下の下位群から構成される：
 - $defs.validator：型検証・列挙制約などの共通検証ロジック
 - $defs.spatial：位置・回転・スケール・オフセットなど空間属性の共通定義
 - $defs.extension：外部拡張（parametric／latex 等）
 - $defs.meta_core：UUID・タグ・メモなどの最小メタ構造

これにより、実体定義側は $ref によって意味層と形態層を分離し、構造の再利用と整合性を維持できる。

---

## 第4章　全体構造（Root Structure）

3DSS のスキーマは、**4つの主要要素（lines／points／aux／document_meta）**からなる実体データを中核とし、これらを支える **共通定義群 `$defs`** を内部に保持する。

| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `lines` | array(object) | 任意 | 関係線（動的構造要素）。 |
| `points` | array(object) | 任意 | 存在点（静的構造要素）。 |
| `aux` | array(object) | 任意 | 補助構造（座標格子・軸・HUD表示補助など）。 |
| `document_meta` | object | ✅ | 文書全体の管理メタ情報。 |

> **補足**：`lines`／`points`／`aux` はスキーマ上任意だが、実体定義が存在しない場合も空配列として明示することを推奨する。

各要素の空間属性（position／orientation／scale／rotation／offset）は、`$defs.spatial` で共通定義される。
これにより、lines／points／aux 間で同一の型・次元・値域を保証する。


---

## 第5章　主要要素 (Primary Elements)

### 5.1 lines — 関係要素（Dynamic Relation Element）

#### 5.1.1 概要
`lines` は 3DSS における **動的関係要素** を表し、`points` 間の構造的・論理的・動的リンクを定義する。
それぞれの line は `signification`（意味層）、`appearance`（形態層）、`meta`（管理層）の三層構造を持つ。

---

#### 5.1.2 構造図（概念）
lines
├─ signification
│ ├─ relation : 構造・動的・論理・時間・メタ関係の分類
│ └─ sense : a_to_b / b_to_a / bidirectional / neutral
├─ appearance
│ ├─ end_a / end_b : ref(uuid) または coord([x,y,z])
│ ├─ line_type : straight / polyline / bezier / catmullrom / arc
│ ├─ line_style : solid / dashed / dotted / double / none
│ ├─ color / opacity / visible / renderOrder
│ ├─ arrow : shape / size / aspect / placement / auto_orient
│ ├─ effect : effect_type / amplitude / speed / duration / loop / easing
│ └─ geometry : `$ref":"#/$defs/validator/properties/line_geometry`
└─ meta
├─ uuid
├─ tags
└─ creator_memo


---

#### 5.1.3 signification 層
意味論層は、関係の種別と方向性を定義する。

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `relation` | object | 任意 | – | 構造的／動的／論理的／時間的／メタ関係の種別を定義。各サブキーは排他的に使用。 |
| `relation.structural` | string(enum) | 任意 | – | association（連結） / containment（包含） / hierarchy（階層） |
| `relation.dynamic` | string(enum) | 任意 | – | causal（因果） / flow（流れ） / influence（影響） / derivation（派生） / transformation（変換） / feedback（フィードバック） / recursion（再帰） / reflection（反射） |
| `relation.logical` | string(enum) | 任意 | – | equivalence（同値） / negation（否定） / implication（含意） / support（支持） / conflict（矛盾） |
| `relation.temporal` | string(enum) | 任意 | – | precedence（先行） / succession（後続） |
| `relation.meta` | string(enum) | 任意 | – | reference（参照） |
| `sense` | string(enum) | 任意 | a_to_b | 関係方向性。AからBへ、BからAへ、双方向、または中立を示す。 |

> ✅ 複数 relation.* の併用は非推奨。  
> ✅ `sense` のデフォルトは `a_to_b`。

---

#### 5.1.4 appearance 層
形態層は、線の形状・描画特性・端点・付属表現を定義する。

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `end_a` / `end_b` | object(oneOf) | ✅ | – | 始端／終端を指定。`ref`（uuid参照）または `coord`（直接座標指定）のいずれか。 |
| `line_type` | string(enum) | 任意 | straight | 線の種類（直線／折線／曲線など）。 |
| `geometry` | object($ref) | 条件付き必須 | – | 幾何構造を保持（polyline / bezier 等）。 |
| `line_style` | string(enum) | 任意 | solid | 線の描画スタイル。 |
| `color` | #RGB / #RRGGBB | 任意 | #ffffff | 線色。 |
| `opacity` | number(0–1) | 任意 | **0.4** | 不透明度。 |
| `renderOrder` | number / string | 任意 | 0 | レンダリング順序。 |
| `arrow` | object | 任意 | – | 矢印設定（形状・サイズ・配置等）。 |
| `effect` | object | 任意 | – | 動的表現効果設定（pulse / flow / glow等）。 |
| `visible` | boolean | 任意 | 推奨: true | 表示可否。 |
| `frames` | integer / array(integer) | 任意 | – | 表示フレーム指定（整数。推奨レンジは -64〜+63）。 |

**条件付き必須**：`line_type` が `straight` 以外の場合、`geometry` が必須。

Viewer は renderOrder をシーン描画順序決定のヒントとして参照するが、数値が重複する場合の優先順位は実装依存とする。（例： "UI" > 2000）
framesは、0を起点として、正負の2方向へ遷移する。

---

##### 5.1.4.1 arrow オブジェクト

| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `shape` | string(enum) | cone | 矢印形状。cone / pyramid / line。 |
| `size` | number | **8** | 矢印サイズ。 |
| `aspect` | number | **2** | 矢印の縦横比。 |
| `placement` | string(enum) | end_b | 配置位置。end_a / end_b / both / none。 |
| `auto_orient` | boolean | true | 線の方向に自動整列するか。 |

---

##### 5.1.4.2 effect オブジェクト

| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `effect_type` | string(enum) | none | エフェクト種別。 |
| `amplitude` | number(≥0) | 1 | 強度。 |
| `speed` | number(≥0) | 1 | 再生速度。 |
| `duration` | number(≥0) | 1 | 継続時間。 |
| `loop` | boolean | true | 繰り返し再生。 |
| `phase` | number(0–1) | 0 | 開始位相。 |
| `easing` | string(enum) | linear | イージング曲線。 |
| `width` | number | 1 | 効果の見た目幅。 |

---

#### 5.1.5 meta 層
| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `uuid` | string(uuid) | ✅ | 一意識別子。 |
| `tags` | array(string) | 任意 | s:/m:/x: によるスコープ分類タグ。 |
| `creator_memo` | string | 任意 | 制作者備考。 |

---

#### 5.1.6 参照整合 (Reference Integrity)
- 端点は `ref` または `coord` のいずれか。  
- `ref` は `points[].meta.uuid` のみを参照可能。  
- `$defs.validator.ref_integrity` により循環・交差参照は禁止：  
  `allow_self_reference:false`, `allow_cross_reference:false`。  
- 他 line を参照する構造は現時点で非対応。将来拡張領域とする。

---

#### 5.1.7 幾何情報 (Geometry)
- line_geometry 定義 に準拠。  
- 定義済み項目：`polyline_points`, `bezier_controls`, `arc_center`, `arc_radius`, `arc_angle_start`, `arc_angle_end`, `catmullrom_points`, `catmullrom_tension`。  
- `dimension`: 2 または 3（デフォルト 3）。

---

#### 5.1.8 整合確認要約
- ✅ signification.relation/sense → `$defs.enum_constraint` に完全整合。  
- ✅ appearance.end_a / end_b → スキーマ oneOf 仕様を反映。  
- ✅ opacity/arrow.size/aspect の default 値を修正。  
- ✅ meta.uuid 必須・creator_memo 任意が一致。  
- ✅ ref_integrity の制約を仕様に反映。

---


### 5.2 points — 存在要素（Existential Point Element）

#### 5.2.1 概要
`points` は 3DSS における **存在要素** を表し、空間上の基準点・ノード・アンカーなど、構造の静的基盤を定義する。  
各 point は `signification`（意味層）、`appearance`（形態層）、`meta`（管理層）の三層構造を持つ。

---

#### 5.2.2 構造図（概念）
points
├─ signification
│ └─ name : string / { ja, en }
├─ appearance
│ ├─ position : [x, y, z]
│ ├─ marker
│ │ ├─ common : visible / orientation / scale / color / opacity / emissive / wireframe
│ │ ├─ shape : sphere / box / cone / pyramid / corona / none
│ │ ├─ gltf : url / scale / rotation / offset
│ │ └─ text : content / font / size / align / plane(billboard可)
│ └─ frames : integer / array(integer)
└─ meta
├─ uuid
├─ tags
└─ creator_memo


---

#### 5.2.3 signification 層
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `name` | string / object(ja,en) | 任意 | – | 点の名称。日本語・英語の併記可。例：{"ja":"原点","en":"Origin"} |

---

#### 5.2.4 appearance 層
| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `marker` | object | 任意 | – | マーカーの形状・表示・ラベル設定。 |
| `position` | array(number,3) | ✅ | – | 3次元座標 [x, y, z]。 |
| `visible` | boolean | 任意 | 推奨: true | 表示／非表示。 |
| `frames` | integer / array(integer) | 任意 | – | 表示フレーム指定（整数。推奨レンジは -64〜+63）。 |

---

##### 5.2.4.1 marker.common

| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `orientation` | array(number,3) | [0,0,0] | **Yaw-Pitch-Roll (Y-X-Z)** のラジアン角でオブジェクト全体を回す  |
| `scale` | array(number,3) | [1,1,1] | 各軸スケール。 |
| `color` | #RRGGBB | #ffffff | マーカー色。 |
| `opacity` | number(0–1) | **0.4** | 不透明度。 |
| `emissive` | boolean / string | false | 発光効果。文字列指定時は色コード。 |
| `wireframe` | boolean | false | ワイヤーフレーム表示モード。 |

orientation はオブジェクトの回転角（[yaw, pitch, roll]）を表す。単位はラジアン。

---

##### 5.2.4.2 marker.shape
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `shape` | string(enum) | sphere | マーカー形状。`sphere` / `box` / `cone` / `pyramid` / `corona` / `none`。 |

---

##### 5.2.4.3 marker.gltf
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `url` | string | "" | glTFモデルURL。 |
| `scale` | array(number,3) | [1,1,1] | モデル拡大率。 |
| `rotation` | array(number,3) | [0,0,0] | モデル回転角（rad）。 |
| `offset` | array(number,3) | [0,0,0] | glTF 埋め込みモデル用のローカル位置オフセット。順序・単位は orientation と同じ  |

---

##### 5.2.4.4 marker.text
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `content` | string | "" | 表示テキスト。 |
| `font` | string | helvetiker_regular | 使用フォント。 |
| `size` | number/integer | **8** | テキストサイズ。 |
| `align` | string(enum) | center&middle | $defs.enum_constraint.text_align に準拠。 |
| `plane` | string(enum) | zx | 表示面。`xy` / `yz` / `zx` / `billboard`（カメラ正面固定）。 |

> ✅ `billboard` は独立プロパティではなく、`plane` の一選択肢として扱う。

---

#### 5.2.5 meta 層
| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `uuid` | string(uuid) | ✅ | 一意識別子。 |
| `tags` | array(string) | 任意 | s:/m:/x: による分類タグ。 |
| `creator_memo` | string | 任意 | 制作者メモ。 |

---

#### 5.2.6 整合確認要約
- ✅ `signification.name` oneOf 構造と完全整合。  
- ✅ `marker.common.opacity` デフォルト 0.4。  
- ✅ `marker.text.size` デフォルト 16。  
- ✅ `plane` に `billboard` 含有（独立プロパティなし）。  
- ✅ glTF/text で additionalProperties:false 一致。  
- ✅ frames 範囲（整数。推奨レンジは -64〜+63） に修正。

---

### 5.3 aux — 補助構造（Auxiliary Elements）

#### 5.3.1 概要
`aux` は 3DSS における **空間補助構造（Spatial Auxiliary Structures）** を表す。  
意味的情報（signification）は持たず、すべての設定は形態層（appearance）に記述される。

---

#### 5.3.2 構造図（概念）
```plaintext
aux
├─ appearance
│ ├─ position / orientation / opacity
│ └─ module
│ ├─ grid : grid_type / subdivisions / major_step / minor_step / color_major / color_minor
│ ├─ axis : length / labels / arrow
│ ├─ plate : plane / position / size / reflectivity / opacity
│ ├─ shell : shell_type / opacity / reflectivity / effect
│ ├─ hud : follow_camera / scale_with_distance
│ └─ extension
│ └─ latex : `$ref #/$defs/extension/latex`
└─ meta
├─ uuid
└─ creator_memo
```
---


---

#### 5.3.3 appearance 層

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `position` | array(number,3) | 任意 | [0,0,0] | 補助構造の基準位置。 |
| `orientation` | array(number,3) | 任意 | [0,0,0] | 回転方向（単位: ラジアン）。 |
| `opacity` | number(0–1) | 任意 | **0.4** | 補助構造全体の透明度。 |
| `visible` | boolean | 任意 | 推奨: true | 表示可否。 |
| `frames` | integer / array(integer) | 任意 | – | 表示フレーム指定（整数。推奨レンジは -64〜+63）。 |

---

##### appearance.module.grid
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `grid_type` | string(enum) | cartesian | 格子種別（cartesian / polar）。 |
| `subdivisions` | integer | **8** | 細分数。 |
| `major_step` | number | **4** | 主格子間隔。 |
| `minor_step` | number | **1** | 補助格子間隔。 |
| `color_major` | #RRGGBB | **#666666** | 主格子線の色。 |
| `color_minor` | #RRGGBB | **#333333** | 補助格子線の色。 |

---

##### appearance.module.axis
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `length` | number | **64** | 軸の長さ。 |
| `labels` | boolean | true | 軸ラベル表示。 |
| `arrow` | boolean | true | 軸端に矢印を付ける。 |

---

##### appearance.module.plate
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `plane` | string(enum) | xy | 配置面（xy / yz / zx）。 |
| `position` | array(number,3) | [0,0,0] | 基準点。 |
| `size` | array(number,2) | [32,32] | 平面サイズ。 |
| `reflectivity` | number(0–1) | **0.5** | 反射率。 |
| `opacity` | number(0–1) | **0.4** | 不透明度。 |

---

##### appearance.module.shell
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `shell_type` | string(enum) | sphere | 外皮構造。sphere / box / hemisphere / quarter_sphere / eighth_sphere。 |
| `opacity` | number(0–1) | 0.4 | 透過度。 |
| `reflectivity` | number(0–1) | 0.5 | 反射率。 |
| `effect.edge_intensity` | number(0–1) | 0.5 | 境界強調度。 |
| `effect.rimlight` | boolean | false | リムライト許可。 |
| `effect.glow_color` | #RRGGBB | #ff0000 | 境界発光色。 |

---

##### appearance.module.hud
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `follow_camera` | boolean | true | カメラ追従。 |
| `scale_with_distance` | boolean | true | 距離スケーリング。 |

---

##### appearance.module.extension.latex
| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `content` | string | – | LaTeXソース。例：`E=mc^2` |
| `render_mode` | string(enum) | math | math / inline / block。 |
| `font_size` | number | **16** | フォントサイズ。 |
| `color` | #RRGGBB | #ffffff | 数式色。 |
| `plane` | string(enum) | zx | xy / yz / zx / billboard。 |
| `position` | array(number,3) | [0,0,0] | 配置位置。 |

> ✅ `billboard` は独立プロパティではなく、`plane` の選択肢の一つ。

---

#### 5.3.4 meta 層
| プロパティ | 型 | 必須 | 説明 |
|-------------|----|------|------|
| `uuid` | string(uuid) | ✅ | 一意識別子。 |
| `tags` | array(string) | 任意 | s:/m:/x: による分類タグ。 |
| `creator_memo` | string | 任意 | 制作者メモ。 |

---

#### 整合確認要約
- ✅ `$defs.extension.latex` 構造に完全整合。  
- ✅ HUD と meta.dashboard の語彙分離を維持。  
- ✅ すべての default 値がスキーマ v1.0.0 と一致。  
- ✅ billboard → plane.enum 方式へ統一。  
- ✅ frames 範囲（整数。推奨レンジは -64〜+63）に修正。

---

### 5.3.5 HUD（Head-Up Display）の用例

`aux.hud` は Viewer／Modeler 上での構造理解を補助する目的で用いる。  
HUD 自体は構造情報を持たず、表示補助のための形態的構造として扱う。

主な用途例：

| 用途 | 内容例 |
|------|---------|
| 位置情報表示 | 座標値・スケールのリアルタイム表示 |
| 凡例表示 | 色・タグ・スコープの凡例説明 |
| 名称ラベル | 主要ノードや軸名の恒常ラベル化 |
| モード表示 | 編集状態や視点モードの簡易表示 |

 HUD の有無は構造解釈に影響しない。  
 Viewer は存在すれば描画し、なければ無視してよい。

---

### 5.4 document_meta — 文書メタ情報（Document Metadata）

#### 5.4.1 概要
`document_meta` は 3DSS 文書全体を統括する **管理・識別メタ情報** を定義する領域である。  
スキーマの参照元、生成ツール、座標系、単位系、バージョン、作者、更新日時などを含み、  
ファイルレベルでの整合性と追跡可能性を担保する。  

必須フィールドは以下の4項目である：  
`document_uuid`, `schema_uri`, `author`, `version`

---

#### 5.4.2 構造図（概念）

```
document_meta
├─ document_uuid
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


---

#### 5.4.3 プロパティ一覧

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `document_uuid` | string(uuid) | ✅ | – | 文書固有の識別子。すべての3DSSファイルで一意。 |
| `schema_uri` | string(uri) | ✅ | – | 準拠スキーマURI。例：https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0 |
| `generator` | string(uri-reference) | 任意 | **`https://q2t-project.github.io/3dsl/`** | 文書を生成したツールまたはアプリの識別URI。 |
| `reference` | string | 任意 | **省略可（空文字扱い）**  | 外部参照、出典、備考など。 |
| `coordinate_system` | string(const) | 任意 | **Z+up/freeXY** | 座標系および上方向の基準。すべての層でZ+軸を上方向とする3DSL座標指針に準拠。 |
| `units` | string(enum) | 任意 | **mm** | 使用単位。`m`, `cm`, `mm`, `non_si:px` のいずれか。 |
| `i18n` | string(enum) | 任意 | **ja** | 文書の基本言語設定。`ja` / `en`。 |
| `author` | string(pattern) | ✅ | – | 作者名またはメールアドレス。形式：`^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+)?$` |
| `version` | string(pattern) | ✅ | **1.0.0** | 文書バージョン。SemVer形式：`^\d+\.\d+\.\d+(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$` |
| `updated_at` | string(pattern) | 任意 | – | 最終更新日時。ISO8601 UTC形式：`YYYY-MM-DDThh:mm:ssZ` |
| `tags` | array(string) | 任意 | **[]** | `^(s|m|x):[a-z0-9_\-]+$` に一致するスコープ分類タグ。 |
| `creator_memo` | string | 任意 | – | 制作者による補足メモ（検証対象外）。 |

---

#### 5.4.4 整合確認要約
- ✅ `document_uuid`, `schema_uri`, `author`, `version` が必須。  
- ✅ `version`／`updated_at`／`author` の pattern が正規表現に準拠。  
- ✅ `coordinate_system`, `units`, `i18n` は `$defs.enum_constraint` に整合。  
- ✅ すべての default 値がスキーマ定義と一致（mm / Z+up/freeXY / ja）。  
- ✅ `creator_memo` はコメント用途のみでバリデーション対象外。  

---

### 5.5 情報提示およびラベル方針（Non-Structural）

Viewer／Modeler 層におけるツールチップやラベル等の動的情報提示は構造外情報とし、  
3DSS では定義しない。  
ただし、構造上恒常的に表示すべき名称は `points.marker.text` や `signification.name` に明示的に記述する。  

UI 上の一時的注釈・コメントは、`meta.creator_memo` などの  
**非構造メモ領域** に記録することが推奨される。

---

## 第6章　共通定義（Common Definition）

本章では、スキーマ全体の整合性を保証する `$defs` 領域の構造を示す。
その中核を成す `validator` 定義群は、型・列挙・正規表現・必須項目・参照整合・幾何構造の6つのサブセクションから構成される。

### 6.1 validator（バリデータ定義群）

本定義群は、スキーマ全体の整合性・一貫性を保証する基幹セクションであり、
以下の6サブセクションから構成される：

- type_check（型定義）
- pattern（正規表現パターン）
- enum_constraint（列挙値制約）
- required_sets（必須項目集合）
- ref_integrity（参照整合性）
- line_geometry（線形ジオメトリ定義）

---

#### 6.1.1 type_check（型定義）

`type_check` では、スキーマ全体で再利用する基本的な「型形状」だけを定義する。
現行 v1.0.0 では次の 3 種類を持つ。

| キー | 型 | 説明 |
|------|----|------|
| `vector3` | array(number,3) | 三次元座標 [x, y, z]。 |
| `path_ref` | string(pattern) | `@` または `points::/lines::/aux::` で始まる内部パス参照。 |
| `frames` | integer / array(integer) | 表示フレーム指定（整数または整数配列）。 |

UUID / URI / 色コード / 言語コード / 単位などは、`pattern` および `enum_constraint` で定義する。

---

#### 6.1.2 pattern（正規表現パターン）

| 名称 | 正規表現 | 説明 |
|------|-----------|------|
| `tag` | `^(s|m|x):[\\w\\p{L}\\p{N}\\-]+$` | スコープ分類タグ。 |
| `uuid_v4` | `^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-4[0-9a-fA-F]{3}\-[89abAB][0-9a-fA-F]{3}\-[0-9a-fA-F]{12}$` | UUID v4形式。 |
| `uri` | `^(https?|ftp|file)://[\\w.-]+(/[\\w\\-./?%&=]*)?$` | URIパターン。 |
| `semver` | `^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+(\\.[a-zA-Z0-9]+)*)?$` | SemVer準拠。 |
| `timestamp_utc` | `^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$` | ISO8601 UTC形式。 |
| `author` | `^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+)?$` | 作者識別形式。 |

---

#### 6.1.3 enum_constraint（列挙値制約）

| カテゴリ | キー | 値群 |
|-----------|------|------|
| 言語 | `language` | ja / en |
| 単位 | `units` | m / cm / mm / non_si:px |
| 座標系 | `coordinate_system` | Z+up/freeXY |
| 構造関係 | `relation_structural` | association / containment / hierarchy |
| 動的関係 | `relation_dynamic` | causal / flow / influence / derivation / transformation / feedback / recursion / reflection |
| 論理関係 | `relation_logical` | equivalence / negation / implication / support / conflict |
| 時間関係 | `relation_temporal` | precedence / succession |
| メタ関係 | `relation_meta` | reference |
| 方向性 | `sense` | a_to_b / b_to_a / bidirectional / neutral |
| 線スタイル | `line_style` | solid / dashed / dotted / double / none |
| 矢印形状 | `arrow_shape` | cone / pyramid / line |
| 矢印配置 | `arrow_placement` | end_a / end_b / both / none |
| マーカー形状 | `marker_shape` | sphere / box / cone / pyramid / corona / none |
| マーカー平面 | `marker_plane` | xy / yz / zx / billboard |
| テキスト配置 | `text_align` | left&top ～ right&baseline（9種） |
| エフェクト種 | `effect_type` | none / pulse / flow / glow |
| イージング | `easing_mode` | linear / ease-in / ease-out / ease-in-out |

---

#### 6.1.4 required_sets（必須項目集合）

| 名称 | 必須プロパティ群 |
|------|----------------|
| `document_meta` | document_uuid, schema_uri, author, version |
| `point_item` | appearance, meta |
| `line_item` | appearance, meta |
| `aux_item` | meta |
| `meta_core` | uuid |
| `relation_core` | relation, sense |
| `appearance_core` | visible, frames, renderOrder, color, opacity |
| `validator_core` | type_check, pattern, enum_constraint, required_sets |

---

#### 6.1.5 ref_integrity（参照整合性）

| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `ref_target_type` | string(enum) | point | 参照対象タイプ。 |
| `allow_self_reference` | boolean | false | 自己参照を許可するか。 |
| `allow_cross_reference` | boolean | false | line間交差参照を許可するか。 |

---

#### 6.1.6 line_geometry（線形ジオメトリ定義）

| プロパティ | 型 | デフォルト | 説明 |
|-------------|----|-------------|------|
| `dimension` | integer | 3 | 幾何空間の次元（2 or 3）。 |
| `polyline_points` | array(vector3) | – | 折線経路を構成する点群。 |
| `bezier_controls` | array(vector3,1–2) | – | ベジェ曲線の制御点群。 |
| `arc_center` | vector3 | – | 円弧の中心座標。 |
| `arc_radius` | number | – | 円弧半径。 |
| `arc_angle_start` | number | – | 円弧開始角（rad）。 |
| `arc_angle_end` | number | – | 円弧終了角（rad）。 |
| `arc_clockwise` | boolean | true | 時計回り指定。 |
| `catmullrom_points` | array(vector3) | – | Catmull-Rom曲線点群。 |
| `catmullrom_tension` | number(0–1) | 0.5 | 曲線張力（滑らかさ）。 |

### 6.2 拡張領域（Extension）

`$defs.extension` は、Authoring 層や自動生成層と安全に連携するための  
拡張定義領域であり、構造層（3DSS構造定義）そのものを拡張するのではなく、
Authoring層やViewer補助機能との連携点として外側に位置づけられる。
現行スキーマ v1.0.0 では `parametric` と `latex` の2種を定義する。

---

| キー | 用途 |
|------|------|
| `parametric` | 幾何拘束・変数・依存関係などの拡張構造。Authoring 層からの生成結果を転写するための定義。 |
| `latex` | 数式レンダリング用拡張。`aux.module.extension.latex` → `$ref: #/$defs/extension/latex` で参照。 |

---

#### 6.2.1 parametric

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `type` | string | ✅ | – | 拡張タイプ識別子。例：`"LSystem"`、`"GeometryConstraint"`。 |
| `version` | string(SemVer) | 任意 | – | モジュールバージョン。`#/$defs/validator/properties/pattern/properties/semver` |
| `params` | object | 任意 | {} | 数値・真偽・配列など任意パラメータ。 |
| `bindings` | array(object) | 任意 | [] | 変数バインディング `{ target, expression }` の配列。 |
| `seed` | integer | 任意 | – | 乱数シード値。 |

---

#### 6.2.2 latex

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|-------------|----|------|-------------|------|
| `content` | string | ✅ | – | LaTeX ソース（例：`$E=mc^2$`）。 |
| `render_mode` | string(enum) | 任意 | math | 表示モード：`math` / `inline` / `block`。 |
| `font_size` | number | 任意 | 16 | 相対フォントサイズ。 |
| `color` | string(#RGB/#RRGGBB) | 任意 | #ffffff | 数式色。 |
| `plane` | string(enum) | 任意 | zx | 貼付面。`xy` / `yz` / `zx` / `billboard`。 |
| `position` | array(number,3) | 任意 | [0,0,0] | 配置位置。 |

---

#### 6.2.3 整合確認要約

- ✅ `$defs/extension/parametric` / `$defs/extension/latex` のみ定義。  
- ✅ すべて `additionalProperties: false` により厳密検証を維持。  
- ✅ `$ref` 経路（aux.module.extension.latex）と整合。  
- ✅ 外部拡張でありながら構造層を汚染しない設計。  
---

## 第7章　拡張・互換性（Extension & Compatibility）

---

### 7.1 バージョン管理（Version Management）

- スキーマのバージョンは **Semantic Versioning（SemVer）** に準拠し、`major.minor.patch` 形式で表記する。  
  例：1.0.0。

- バージョンは `document_meta.version` に明記し、過去バージョンとの互換情報を保持する。

- スキーマの安定段階（stable / beta / deprecated）は仕様書上の管理区分であり、  
  `$defs` には定義を持たない。

---

### 7.2 拡張ルール（Extension Policy）

- 新要素や列挙値（enum）の追加は `$defs.validator` 配下の該当節に登録する。  
- 既存プロパティの削除は禁止。非推奨化には `"deprecated": true` フラグを付与して明示できるが、実装は任意とする。  
- 外部拡張スキーマは `$ref` で連携可能。例：`"$ref": "./custom_ext.schema.json"`。  
- 拡張は `$defs.extension.*` に集約し、実体要素側では `$ref` のみを許可する。  
- 競合定義やスキーマ汚染を防ぐため、同名キーの再定義は禁止。

---

### 7.3 互換性維持（Backward Compatibility）

- **旧要素の保持義務**：既存要素・プロパティは最低2版分維持することを原則とする。  
- **属性互換**：enumへの値追加は許可されるが、既存値の変更・削除は禁止。  
- **構造互換**：必須構造（appearance／meta など）は恒常的に維持。  
- **スキーマURIポリシー**：各バージョンの `$id`／`schema_uri` は固定し、  
  リポジトリ内でバージョン単位に管理する。

---

### 7.4 バリデーション互換性（Validation Compatibility）

- スキーマは **JSON Schema Draft 2020-12** 準拠とし、  
  AJV など主要バリデータでの検証通過を保証する。  
- 拡張スキーマも `$defs` 構造に準拠すれば、同一バリデータ上での検証が可能。  
- 互換性を破壊する変更（構造変更・型変更など）はメジャーバージョンアップ時にのみ許可される。

---

### 7.5 廃止要素の扱い（Deprecation Handling）

- 廃止予定要素は仕様書内で明示し、`deprecated` フラグを添付して告知する。  
- 非推奨化には `"deprecated": true` フラグを付与して明示できる。付与位置はプロパティ単位（各要素内または `$defs` 定義内）とし、実装側の解釈は任意。
- 廃止予定要素を含む文書は「警告レベル（warning）」として扱い、  
  バリデーションエラーとはしない。

---

### 7.6 Viewer 設定および表示方針

Viewer や Modeler における表示設定・テーマ・演出は 3DSS スキーマの定義範囲外である。  
3DSS は構造的事実と関係の記述に専念し、見た目・体験・操作性は各アプリケーション実装に委ねる。

将来的には、Viewer 設定を構造層外の別ファイルとして扱うことを想定しており、  
スキーマ構造は `$ref` による外部スキーマ参照へ容易に拡張できるよう設計されている。

例：`"$ref": "./viewer_config.schema.json"`

---

### 7.7 tags（スコープタグ）の運用規範

`tags` および `document_meta.tags` は次の正規表現に従う：  
```regex
^(s|m|x):[\\w\\p{L}\\p{N}\\-]+$
```
ボディ部分には英数字・アンダースコア・ハイフンに加え、Unicode の文字（\p{L}, \p{N}）も使用できる。

| 接頭辞 | 意味 | 想定用途 |
|--------|------|----------|
| `s:` | structural（構造） | 幾何・トポロジ・座標に関する分類 |
| `m:` | meaning（意味） | 概念・意味論的分類（例：因果・論理関係） |
| `x:` | meta（付帯） | コメント・派生・メモ等の付帯情報 |

これらのタグは Viewer／Modeler において色分け・フィルタリングなど  
UI 補助として利用されるが、構造解釈そのものには影響しない。  

同一 prefix を共有する要素は、グルーピングやレイヤ選択の単位として活用できる。

---

### 7.8 外部仕様との互換（External Compatibility）

- 本スキーマは **JSON Schema Draft 2020-12 (December 2020)** に完全準拠する。 
- **OpenAPI Schema** および **Schema.org** の基本型との整合を保持する。  
- 拡張時には **JSON-LD**, **glTF** など外部仕様との連携を許容し、  
  相互参照可能なメタ構造を維持する。  

---

#### 整合確認要約

- ✅ SemVer に基づくバージョン整合が確立。  
- ✅ `$defs` 拡張ルールと外部スキーマ参照方針を明文化。  
- ✅ 互換性維持・廃止要素の扱い方針を統合。  
- ✅ JSON Schema Draft 2020-12, OpenAPI, Schema.org, glTF との互換を保証。

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
        "opacity": 0.4,
        "arrow": {
          "shape": "cone",
          "placement": "end_b",
          "size": 8,
          "aspect": 2,
          "auto_orient": true
        },
        "renderOrder": 0
      },
      "meta": {
        "uuid": "99999999-8888-7777-6666-555555555555"
      }
    }
  ],

  "points": [
    {
      "appearance": {
        "position": [0, 0, 0],
        "marker": {
          "shape": "sphere",
          "common": {
            "visible": true,
            "color": "#ffffff",
            "opacity": 0.4
          }
        }
      },
      "meta": { "uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
    },
    {
      "appearance": {
        "position": [1, 0, 0],
        "marker": {
          "shape": "box",
          "common": {
            "visible": true,
            "color": "#ffffff",
            "opacity": 0.4
          }
        }
      },
      "meta": { "uuid": "ffffffff-1111-2222-3333-444444444444" }
    }
  ],

  "aux": [
    {
      "appearance": {
        "position": [0, 0, 0],
        "module": {
          "grid": {
            "grid_type": "cartesian",
            "major_step": 1,
            "minor_step": 0.1
          },
          "axis": {
            "length": 10,
            "labels": true,
            "arrow": true
          }
        },
        "opacity": 0.4
      },
      "meta": { "uuid": "abcdabcd-abcd-abcd-abcd-abcdabcdabcd" }
    }
  ],

  "document_meta": {
    "document_uuid": "11111111-2222-3333-4444-555555555555",
    "version": "1.0.0",
    "author": "creator@example.com",
    "updated_at": "2025-10-21T12:00:00Z",
    "schema_uri": "https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.0.0",
    "coordinate_system": "Z+up/freeXY",
    "units": "mm",
    "i18n": "ja"
  }
}


```

---

## 第9章　変更履歴（Change Log）
| Version | Date | Change | Status |
|---|---|---|---|
| 1.0.0 | 2025-10-21 | 初版確定 | stable |
| 1.0.1   | 2025-11-07 | `appearance.frames` を lines／points／aux に追加。静的フレーム切替（Frame Mode）機能を正式導入。 | stable |

---

## 第10章　付録（Appendix）
- **用語索引**：relation / sense / line_type / marker / effect など。
- **参照リンク**：
  - JSON Schema 2020-12 Specification
  - OpenAPI Specification
  - Schema.org Style Guide---
