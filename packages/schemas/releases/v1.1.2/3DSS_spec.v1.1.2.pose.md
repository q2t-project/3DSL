````markdown
# 3DSS (Three-Dimensional Structural Schema) 仕様書 v1.1.2

---

## 第1章　概要（Overview）

| 項目 | 内容 |
|------|------|
| 正式名 | 3DSS（Three-Dimensional Structural Schema） |
| スキーマURI | https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.2 |
| 準拠仕様 | JSON Schema Draft 2020-12 |
| ステータス | stable |
| 発行日 | 2026-01-11 |
| 対象読者 | 3DSL モデル設計者／モデラ／ビューア開発者／構造コンテンツ制作者 |
| 関連スキーマ | 3DSS-prep（作業入力用ミニマルスキーマ） |
| ファイル拡張子 | .3dss.json |

3DSS は、3DSL（Three-Dimensional Structural Language）における
三次元構造記述のための標準スキーマであり、
`lines`（関係要素）・`points`（存在要素）・`aux`（補助要素）・`document_meta`（管理情報）を中核として設計されている。

本仕様書が対象とするのは構造層のスキーマ `3DSS.schema.json` である。
スキーマの `$id` は `https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#` とし、バージョンは `$anchor`（例：`v1.1.2`）で表す。構造ドキュメント側は `document_meta.schema_uri` に `...json#vX.Y.Z` を格納して、準拠バージョンを明示する。
構造ドキュメントのバージョン管理は `document_meta.version`（SemVer）で行い、
仕様書の版数（本書 v1.1.2）とは区別する。

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
本仕様における `document_meta.coordinate_system` は `"Z+up/freeXY"` に固定されており、
JSON Schema 上でも `const` によりこの値以外は許可されない（単一選択制）。

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
| 含有 | OCR／LLM仮説、拘束／依存、UI／履歴 | `lines`／`points`／`aux`／`document_meta` |
| 曖昧さ | 許容（信頼度／未確定） | 不許容（確定値） |
| 形式 | 自由 | 3DSS.schema.json |

Authoring 層の内部表現そのものは形式自由だが、  
JSON で modeler へ受け渡すケースに対しては、推奨インターフェースとして  
`3DSS-prep.schema.json`（拡張子 `.3dss-prep.json`）を用意する。

prep は **Authoring 層の一部** であり、構造層（3DSS.schema.json）とは別スキーマである。  
viewer は prep を直接扱わず、常に構造層（`.3dss.json`）だけを入力とする。

---

### 2.2 Export 共通契約（要約）

① **Resolve**（拘束・変数・依存を解消）  
② **Flatten**（参照／生成の展開）  
③ **Prune**（一時／未確定データの除去）  
④ **Normalize**（座標系・単位・色・enum の正規化）  

これらの段階を経て、Authoring 層のデータは 3DSS 構造層へ収束する。  
Normalize 段階では `$defs.validator` 配下に定義された型・書式
（`uuid`、`uri`、`tag`、`language_code`、`units`、`semver`、`timestamp_utc`、`color_hex`、`frames` など）
に基づき正規化する。

`document_meta` には必須項目として  
`document_title`、`document_uuid`、`schema_uri`、`author`、`version`  
を記載する。
任意項目はスキーマ定義に従って追加できる。代表的なものとして
`generator`、`updated_at`、`tags`、`reference`、`coordinate_system`、`units`、
`i18n`、`creator_memo` などを想定する。

- `schema_uri` には、原則として本スキーマの `$id` に `$anchor`（SemVer）を付けた値（例：`https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.2`）を格納する。  
- `units` は `"m"`／`"cm"`／`"mm"`／`"non_si:px"` のいずれかをとる列挙値であり、  
  デフォルトは `"non_si:px"` とする。  
- `i18n` は `"ja"`／`"en"` をとる言語コードであり、デフォルトは `"ja"` とする。

Viewer 固有のレンダ設定（カメラパラメータ、ライト構成、シャドウアルゴリズム等）は本仕様の対象外とする。
ただし、aux モジュールを通じて定義されるグリッド／シェル／HUD 等については、
その構造的挙動を表す最小限の効果パラメータ
（`color`、`opacity`、`edge_intensity`、`rimlight`、`glow_color`、`follow_camera` など）を
3DSS 側で保持する。

3DSS（構造層）のルートオブジェクトおよび主要モジュールは、原則として
`additionalProperties: false` により未定義プロパティを禁止し、
構造的意味のないデータが混入しないように設計する。

---

### 2.3 3DSS-prep スキーマ（作業入力用ミニマルスキーマ）

3DSS-prep（`3DSS-prep.schema.json`）は、Authoring 層から modeler への
**作業入力（prep）** を JSON で受け渡すためのミニマルスキーマである。

- ファイル拡張子：`.3dss-prep.json`
- スキーマ `$id`：  
  `https://q2t-project.github.io/3dsl/schemas/3DSS-prep.schema.json`
- 役割：  
  - LLM / OCR / 外部DB 等が生成した「名称リスト」等の疎データを  
    modeler に渡すための基本フォーマット
  - 構造層の 3DSS.schema.json とは別系統のスキーマ
  - viewer は直接解釈しない（modeler だけが対象）

#### 2.3.1 ルート構造（概要）

3DSS-prep のルートオブジェクトは、次の 2 要素だけを規定する：

| プロパティ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `points` | array(object) | ✅ | 疎な点情報のリスト。`name` だけ必須。 |
| `document_meta` | object | 任意 | 入力元のメタ情報（スキーマURI等）。 |

その他のルートプロパティは `additionalProperties: true` により許容される。  
prep は将来の拡張やツール固有の情報を邪魔しない **ゆるいインターフェース** として設計する。

#### 2.3.2 points の構造（概要）

`points` 配下では、各要素に対して **`name` だけ** を必須とする：

| プロパティ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `name` | string | ✅ | 点の名称。prep ではこれだけが必須。 |

その他のプロパティ（座標・タグ・補足情報など）は  
`additionalProperties: true` により任意に付与できるが、  
**prep スキーマとしては意味を規定しない**。  

modeler の Importer は、`name` だけを見て temp_point を生成し、  
Direct Spatial Editing や数値入力を通じて `position` や `meta` を付与していく。

#### 2.3.3 document_meta の構造（概要）

`document_meta` には、スキーマ識別用の `schema_uri` だけを必須とする：

| プロパティ | 型 | 必須 | 説明 |
|-----------|----|------|------|
| `schema_uri` | string(uri) | ✅ | このファイルが準拠するスキーマURI（prep）。 |
| `generator` | string | 任意 | 生成ツール名やバージョン。 |
| `source` | string | 任意 | 元データの出典やパス。 |

ここでも `additionalProperties: true` とし、  
ツール固有のフィールド（例：`task_id`、`prompt`、`confidence` など）を自由に付与できる。

3DSS（構造層）の `document_meta` と異なり、  
prep の `document_meta` では座標系・単位・言語コード・タグ等は規定しない。  
これらは 3DSS 側の構造化プロセスで **初めて確定される属性** と位置づける。

#### 2.3.4 lines / aux を prep から外す理由

`3DSS-prep.schema.json` では、あえて `lines` / `aux` をスキーマに含めない。

- 意味のある line を大量に定義するには、  
  上流側にかなり強い意味解釈能力が必要
- 人手だけで大量の line を前段で作るのは現実的ではなく、  
  そのために modeler が要請されている
- よって prep 段階では **「名前付きの点の集合」** までにとどめ、  
  関係線（`lines`）は modeler 内で `point` を見ながら構造化していく

一方で、`3DSS-prep.schema.json` はルートに `additionalProperties: true` を許すため、  
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
  - 疎な `name` リスト＋ごく簡単なメタ情報  
  - Validator は「形式が prep かどうか」だけを見る
- 3DSS（構造層）：  
  - viewer / modeler 共通の正規構造データ  
  - `lines` / `points` / `aux` / `document_meta` を完全定義  
  - strict full validation（AJV等）で完全検証

modeler の I/O 観点では、次のパイプラインになる：

```text
prep (.3dss-prep.json)
  → Importer（name → temp_point）
  → Direct Spatial Editing / 数値入力
  → Confirm（temp → structure）
  → 3DSS (.3dss.json) へ export
````

prep は Authoring 層に属し、基本的に `additionalProperties: true` の緩いスキーマであるのに対し、
3DSS（構造層）はルートを含め原則 `additionalProperties: false` の strict スキーマとして定義される。

```

```
第3章と第4章を v1.1.2 の実スキーマに揃えた版をまとめる。
（`$defs` の構成やプロパティ名は、いま貼ってくれた 3DSS.schema.json v1.1.2 構造に合わせてある）

```markdown


## 第3章　設計理念（Design Philosophy）

3DSS は、単なる構文規範ではなく、**「構造」の階層性を可視化する言語的枠組み**として設計されている。

---

### 3.1 基本原理

- すべての要素は「関係」「存在」「補助」「管理」の 4 領域に分類され、それぞれ `lines`・`points`・`aux`・`document_meta` が対応する。  
- 各要素は原則として三層構造（signification／appearance／meta）で表現される。  
  - signification：意味的情報（関係・概念・方向性など）  
  - appearance：形態的情報（位置・色・形状・描画特性など）  
  - meta：管理情報（UUID・タグ・制作者メモなど）  
- `lines` と `points` は三層すべてを持つ。  
- `aux` は本仕様において signification 層を一切持たない。将来版でも追加しないことを前提とし、appearance と meta のみで構成される。  
- `document_meta` は全体情報を統括する独立メタ要素として、三層構造の外側に位置づけられる（`$defs.meta.document` により定義）。  
- 意味層は概念的関係（構造／因果／論理／時間）を、形態層は幾何・描画特性を、管理層は識別と履歴を担う。  

3DSS は、この三層構造を通じて「概念構造」と「幾何表現」と「管理メタ」を明示的に分離しつつ、三者の連結を保つことを目的とする。

---

### 3.2 構造的思考の指針

- `points` は「存在」を、`lines` は「関係」を、`aux` は「補助的構造」を、`document_meta` は「全体管理」を表す。  
- `points` が「存在の点」であるなら、`lines` は「意味の軸」であり、二つの存在を結ぶだけでなく、**力学・流動・因果・論理的反射**を示す媒介として扱う。  
- これにより、3DSS は静的構造表現から、動的概念構造表現へと拡張される。

`lines.signification.relation` は、関係の性質を次の 5 つのカテゴリのいずれか 1 つとして表現する。

| キー           | 意味           | enum 値の例                                  |
| ------------- | -------------- | -------------------------------------------- |
| `structural`  | 構造関係       | `association`, `containment`, `hierarchy`   |
| `dynamic`     | 力学・流動・因果 | `causal`, `flow`, `influence`, `derivation`, `transformation`, `feedback`, `recursion`, `reflection` |
| `logical`     | 論理関係       | `equivalence`, `negation`, `implication`, `support`, `conflict` |
| `temporal`    | 時間関係       | `precedence`, `succession`                  |
| `meta`        | 参照・メタ情報 | `reference`                                 |

`relation` オブジェクトは上記のうち **ちょうど 1 つ**のキーだけを持ち、その値で関係の種類を決定する（`minProperties = 1` / `maxProperties = 1` ＋ `oneOf` により制約）。

さらに、`lines.signification.sense` は関係の向きを表す。

| 値             | 意味                         |
|----------------|------------------------------|
| `a_to_b`       | end_a → end_b 方向の関係     |
| `b_to_a`       | end_b → end_a 方向の関係     |
| `bidirectional`| 双方向の関係                 |
| `neutral`      | 向きを持たない関係（対称など）|

これにより、3DSS の line は「どの二点を結んでいるか」だけでなく、「どのような意味種別で」「どちら向きに」作用しているかを、明確な enum として保持できる。

---

### 3.3 設計指針

3DSS v1.1.2 では、スキーマ設計において **論理的一貫性と拡張可能性** を優先し、表現上の自由度はその範囲で確保する。

これにより、スキーマは Viewer の描画負荷から独立して構造定義の安定性を維持しつつ、将来の viewer／modeler 実装に対して中立的な基盤となる。

#### 3.3.1 表現と構造の分離原則

3DSS は「構造」を記述するための言語であり、照明・影・反射・ポストエフェクトなど Viewer 固有の演出要素は保持しない。  
ただし、構造定義上の基本的な表示属性（`color`, `opacity`, `emissive` など）は、構造可視化のための最小限の範囲として含まれる。

拡張定義の構造本体は `$defs` に集約し、実体側（例：`aux.appearance.module.extension` など）には識別用のフィールドと、それらへの `$ref` のみを記述する。

v1.1.2 における `$defs` の主な構成は次の通りである。

- `$defs.validator`  
  - UUID／URI／タグ／言語コード／単位／SemVer／UTCタイムスタンプ／カラーコード／3次元ベクトル／frames などの共通バリデーションを提供する。  
- `$defs.spatial`  
  - `position`／`orientation`／`scale`／`rotation`／`offset` など、空間属性の共通定義をまとめる。いずれも `validator.vec3` を参照する。  
- `$defs.geometry`  
  - `line_geometry` として、polyline／Bezier／Catmull-Rom 曲線／円弧などの幾何パラメータを定義する。  
- `$defs.extension`  
  - `parametric`／`latex` など、外部拡張用の構造を定義する。  
- `$defs.labels`  
  - `localized_string` として、`string` または `{ ja, en }` 形式の多言語ラベル構造を定義する。  
- `$defs.meta`  
  - `meta.core`：要素共通メタ（`uuid`／`tags`／`creator_memo`）  
  - `meta.document`：`document_meta` 用メタ（タイトル／要約／バージョン／スキーマURI／author 等）  
- `$defs.line`／`$defs.point`／`$defs.aux`  
  - 各モジュールの signification／appearance／node 構造を定義し、ルートの `lines`／`points`／`aux` はそれぞれの `node` を配列要素として参照する。

このように、実体定義側は `$ref` によって意味層と形態層を分離し、構造の再利用と整合性を維持できる。

`orientation`／`rotation` の具体的な角度表現（オイラー角の順序／ラジアン・度単位など）は、3DSS スキーマではあえて固定せず、**実装依存の 3 成分ベクトル** として扱う。  
これにより、three.js 等の 3D エンジンへのマッピング方針は viewer／modeler 側で選択できる。

---

## 第4章　全体構造（Root Structure）

3DSS のスキーマは、**4 つの主要要素（`lines`／`points`／`aux`／`document_meta`）**からなる実体データを中核とし、これらを支える **共通定義群 `$defs`** を内部に保持する。

---

### 4.1 ルートオブジェクト

ルートオブジェクトは、次の 4 プロパティのみを持つ。

| プロパティ       | 型            | 必須 | 説明 |
|------------------|--------------|------|------|
| `lines`          | array(object)| 任意 | 関係線（動的・概念的構造要素）。各要素は `$defs.line.node` に準拠する。 |
| `points`         | array(object)| 任意 | 存在点（静的構造要素）。各要素は `$defs.point.node` に準拠する。 |
| `aux`            | array(object)| 任意 | 補助構造（座標格子・軸・プレート・シェル・HUD 等）。各要素は `$defs.aux.node` に準拠する。 |
| `document_meta`  | object       | ✅   | 文書全体の管理メタ情報。`$defs.meta.document` に準拠する。 |

> 補足：`lines`／`points`／`aux` はスキーマ上任意だが、実体定義が存在しない場合も空配列として明示することを推奨する。

ルートオブジェクトは `lines`／`points`／`aux`／`document_meta` 以外のプロパティを持たない（`additionalProperties: false`）。  
将来の拡張は `$defs` 配下、または各モジュールの下位構造として行い、ルート階層には新たなプロパティを追加しない。

---

### 4.2 共通定義 `$defs` の構成

v1.1.2 における `$defs` の主要な構成要素と役割を整理する。

| セクション            | 役割の概要 |
|-----------------------|-----------|
| `$defs.validator`     | UUID／URI／タグ／言語コード／単位／SemVer／UTCタイムスタンプ／カラーコード／3D ベクトル／`frames` などの共通バリデーション。 |
| `$defs.spatial`       | `position`／`orientation`／`scale`／`rotation`／`offset` の 3D ベクトル定義。全モジュールで共有される。 |
| `$defs.geometry`      | `line_geometry` として polyline／Bezier／Catmull-Rom／円弧などの幾何パラメータを定義。 |
| `$defs.extension`     | `parametric`／`latex` 等、外部拡張モジュール。 |
| `$defs.labels`        | 多言語ラベル `localized_string` を定義。 |
| `$defs.meta`          | `meta.core`（UUID・タグ・メモ）／`meta.document`（文書メタ）を定義。 |
| `$defs.line`          | `relation`／`signification`／`endpoint`／`arrow`／`effect`／`appearance`／`node` 等、line モジュール全体。 |
| `$defs.point`         | `name`／`signification`／`marker_*`／`marker`／`appearance`／`node` 等、point モジュール全体。 |
| `$defs.aux`           | `module_*`（grid／axis／plate／shell／hud／extension）／`module`／`appearance`／`node` 等、aux モジュール全体。 |

`lines`／`points`／`aux` の配列要素は、それぞれ `$defs.line.node`／`$defs.point.node`／`$defs.aux.node` を参照することで、
モジュールごとの内部構造を隠蔽しつつ、一貫した型付けを実現する。

---

### 4.3 空間属性の共通フォーマット

各要素の空間属性（`position`／`orientation`／`scale`／`rotation`／`offset`）は、`$defs.spatial` で共通定義される。

- いずれも `$defs.validator.vec3` を参照し、3 要素の数値配列 `[x, y, z]` として表現する。  
- `position` はワールドまたはローカル座標系における位置を表す。  
- `orientation`／`rotation` は回転を表すが、その解釈（オイラー角の順序、度／ラジアン）は 3DSS 側では規定せず、viewer／modeler 実装に委ねる。  
- `scale` はスケール倍率、`offset` はマーカー等に対する相対オフセットとして用いる。

これにより、`lines`／`points`／`aux` 間で同一の型・次元・値域を保証しつつ、
実装側の 3D エンジン（three.js 等）へのマッピング自由度を確保する。
```

---
## 第5章　主要要素 (Primary Elements)

### 5.1 lines — 関係要素（Dynamic Relation Element）

#### 5.1.1 概要

`lines` は 3DSS における **動的関係要素** を表し、`points` 間の構造的・論理的・動的リンクを定義する。
それぞれの line は `signification`（意味層）、`appearance`（形態層）、`meta`（管理層）の三層構造を持つ。

---

#### 5.1.2 構造図（概念）

```plaintext
lines
├─ signification
│   ├─ relation : 構造・動的・論理・時間・メタ関係の分類
│   └─ sense    : a_to_b / b_to_a / bidirectional / neutral
├─ appearance
│   ├─ end_a / end_b : endpoint
│   │                 - ref   : points[].meta.uuid を参照
│   │                 - coord : [x,y,z] 直接座標
│   ├─ line_type      : straight / polyline / bezier / catmullrom / arc
│   ├─ geometry       : #/$defs/geometry/line_geometry
│   ├─ line_style     : solid / dashed / dotted / double / none
│   ├─ color / opacity / visible / render_order / frames
│   ├─ arrow          : primitive / length | thickness | radius | height | base /
│   │                   placement / auto_orient
│   └─ effect         : effect_type / amplitude / speed / duration / loop /
│                       phase / easing / width
└─ meta
    ├─ uuid
    ├─ tags
    └─ creator_memo
```

---

#### 5.1.3 signification 層

意味論層は、関係の種別と方向性を定義する。

| プロパティ                 | 型            | 必須 | デフォルト      | 説明                                                                                                                                               |
| --------------------- | ------------ | -- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `relation`            | object       | 任意 | –          | 構造的／動的／論理的／時間的／メタ関係の種別を定義。5種類のうちいずれか 1 つだけを持つ。                                                                                                   |
| `relation.structural` | string(enum) | 任意 | –          | `association`（連結） / `containment`（包含） / `hierarchy`（階層）                                                                                          |
| `relation.dynamic`    | string(enum) | 任意 | –          | `causal`（因果） / `flow`（流れ） / `influence`（影響） / `derivation`（派生） / `transformation`（変換） / `feedback`（フィードバック） / `recursion`（再帰） / `reflection`（反射） |
| `relation.logical`    | string(enum) | 任意 | –          | `equivalence`（同値） / `negation`（否定） / `implication`（含意） / `support`（支持） / `conflict`（矛盾）                                                          |
| `relation.temporal`   | string(enum) | 任意 | –          | `precedence`（先行） / `succession`（後続）                                                                                                              |
| `relation.meta`       | string(enum) | 任意 | –          | `reference`（参照）                                                                                                                                  |
| `sense`               | string(enum) | 任意 | `"a_to_b"` | 関係方向性。`a_to_b` / `b_to_a` / `bidirectional` / `neutral`。                                                                                         |
| `caption`             | localized_string | 任意 | `""`       | 線キャプション（表示文字列）。`string` または `{ja,en}`。 |

スキーマ上、`relation` は次の制約を持つ（`#/$defs/line/relation`）：

* 5 種類のキーのうち、**いずれか 1 つだけ必須**（`oneOf`＋`minProperties:1`＋`maxProperties:1`）
* 未定義キーは禁止（`additionalProperties:false`）

`required_sets` や `enum_constraint` といった共通制約は v1.1.2 時点では `$defs` に未定義であり、
各プロパティの `enum` 定義と本仕様書の表で直接規定する。

---

#### 5.1.4 appearance 層

形態層は、線の形状・描画特性・端点・付属表現を定義する。

| プロパティ             | 型                        | 必須     | デフォルト             | 説明                                                                          |
| ----------------- | ------------------------ | ------ | ----------------- | --------------------------------------------------------------------------- |
| `end_a` / `end_b` | object(oneOf)            | 任意     | –                 | 始端／終端を指定。`{ref}`（uuid参照）または `{coord}`（直接座標指定）のいずれか。`#/$defs/line/endpoint`。 |
| `line_type`       | string(enum)             | 任意     | `"straight"`      | 線の種類。`straight` / `polyline` / `catmullrom` / `bezier` / `arc`。             |
| `geometry`        | object                   | 条件付き必須 | –                 | 幾何構造。`#/$defs/geometry/line_geometry`。`line_type !== "straight"` のとき必須。     |
| `line_style`      | string(enum)             | 任意     | `"solid"`         | 線の描画スタイル。`solid` / `dashed` / `dotted` / `double` / `none`。                 |
| `color`           | string(#RGB/#RRGGBB)     | 任意     | `#ffffff`         | 線色。`#/$defs/validator/color_hex`。                                           |
| `opacity`         | number(0–1)              | 任意     | `0.4`             | 不透明度。                                                                       |
| `render_order`    | number                   | 任意     | `0`               | レンダリング順序ヒント。値が同じときの優先順位は実装依存。                                               |
| `arrow`           | object                   | 任意     | –                 | 矢印設定。`#/$defs/line/arrow`。                                                  |
| `effect`          | object                   | 任意     | –                 | 動的表現効果設定。`#/$defs/line/effect`。                                             |
| `visible`         | boolean                  | 任意     | （スキーマ default なし） | 表示／非表示。実装側 default として `true` を推奨。                                          |
| `frames`          | integer / array(integer) | 任意     | –                 | 表示フレーム指定。`#/$defs/validator/frames`（-9999〜9999 の整数またはユニーク整数配列）。             |
| `caption_text`    | object                   | 任意     | –                 | キャプション表示の見た目設定。`font_size` と `pose`。 |

**条件付き必須**：

* `line_type` が `polyline` / `catmullrom` / `bezier` / `arc` のいずれかである場合、
  スキーマの `allOf` により `geometry` が必須となる。

##### 5.1.4.1 arrow オブジェクト

`arrow` は line の端点に付与される矢印形状を定義する。
スキーマでは 1 つのオブジェクトとして定義され、`primitive` の値に応じて必須プロパティが変化する。

| プロパティ         | 型                 | デフォルト     | 説明                                                                 |
| ------------- | ----------------- | --------- | ------------------------------------------------------------------ |
| `primitive`   | string(enum)      | –         | 矢印形状の種別。`"none"` / `"line"` / `"cone"` / `"pyramid"` のいずれか。必須。     |
| `length`      | number (≥ 0.0001) | –         | `primitive: "line"` のとき使用する矢印線分の長さ。                                |
| `thickness`   | number (≥ 0.0001) | –         | `primitive: "line"` のとき使用する線の太さ。                                   |
| `radius`      | number (≥ 0.0001) | –         | `primitive: "cone"` のとき使用する底面半径。                                   |
| `height`      | number (≥ 0.0001) | –         | `primitive: "cone"` / `"pyramid"` のとき使用する高さ。                       |
| `base`        | array(number,2)   | –         | `primitive: "pyramid"` のとき使用する底面サイズ `[width, depth]`。各要素 ≥ 0.0001。 |
| `placement`   | string(enum)      | `"end_b"` | 矢印を付与する位置。`"end_a"` / `"end_b"` / `"both"` / `"none"`。             |
| `auto_orient` | boolean           | `true`    | line の向きに合わせて矢印を自動回転させるかどうか。                                       |

`primitive` ごとの有効プロパティと必須条件（スキーマでは `allOf` の `if/then` で表現）：

* `primitive: "none"`

  * 使用可能: `primitive`, `placement`, `auto_orient`
  * サイズ関連プロパティ（`length` / `thickness` / `radius` / `height` / `base`）は指定しない。

* `primitive: "line"`

  * 使用可能: `primitive`, `length`, `thickness`, `placement`, `auto_orient`
  * 必須: `primitive`, `length`, `thickness`

* `primitive: "cone"`

  * 使用可能: `primitive`, `radius`, `height`, `placement`, `auto_orient`
  * 必須: `primitive`, `radius`, `height`

* `primitive: "pyramid"`

  * 使用可能: `primitive`, `base`, `height`, `placement`, `auto_orient`
  * 必須: `primitive`, `base`, `height`

---

##### 5.1.4.2 effect オブジェクト

| プロパティ         | 型            | デフォルト      | 説明                                                         |
| ------------- | ------------ | ---------- | ---------------------------------------------------------- |
| `effect_type` | string(enum) | `"none"`   | エフェクト種別。`none` / `pulse` / `flow` / `glow`。                |
| `amplitude`   | number(≥0)   | `1`        | 効果の強度。                                                     |
| `speed`       | number(≥0)   | `1`        | 再生速度。                                                      |
| `duration`    | number(≥0)   | `1`        | 継続時間。                                                      |
| `loop`        | boolean      | `true`     | 繰り返し再生するか。                                                 |
| `phase`       | number(0–1)  | `0`        | エフェクトの開始位相。                                                |
| `easing`      | string(enum) | `"linear"` | イージング曲線。`linear` / `ease-in` / `ease-out` / `ease-in-out`。 |
| `width`       | number       | `1`        | 効果の見た目上の幅。                                                 |

`effect` プロパティ自体は任意だが、指定された場合は上記フィールドに従って厳密に検証される。

---

##### 5.1.4.3 caption_text オブジェクト

`caption_text` は line の `signification.caption` を表示するためのスタイル情報（v1.1.2）。

| プロパティ | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `font_size` | number | 任意 | `8` | 表示サイズ（相対）。Viewer は `font_size/8` を倍率として適用する想定。 |
| `pose`  | object(text_pose) | 任意 | `{ "mode": "billboard" }` | テキスト姿勢（6.5 `text_pose`）。`mode="fixed"` はワールド固定、`mode="billboard"` はカメラ正面。v0 は `billboard` のみ対応で良い。 |

---

#### 5.1.5 meta 層

lines の meta 層は `$defs.meta.core` に準拠し、次の構造をとる。

| プロパティ          | 型             | 必須 | 説明                                                         |
| -------------- | ------------- | -- | ---------------------------------------------------------- |
| `uuid`         | string(uuid)  | ✅  | 一意識別子。`#/$defs/validator/uuid`。                            |
| `tags`         | array(string) | 任意 | スコープ分類タグ。`#/$defs/validator/tag` のパターン（`s:/m:/x:` 接頭辞）に従う。 |
| `creator_memo` | string        | 任意 | 制作者備考。構造解釈には影響しない自由メモ。                                     |

---

#### 5.1.6 参照整合 (Reference Integrity)

* `end_a.ref` / `end_b.ref` は、`points[].meta.uuid` のみを参照することを前提とする。
* line 間の直接参照（line → line）は v1.1.2 では未サポート。将来拡張領域とする。
* 自己参照や循環参照、別ファイルへの越境参照の禁止／許可は、アプリケーション側の検証ポリシで扱う。

JSON Schema v1.1.2 では、UUID 形式のみを検証対象とし、
参照先の実体存在チェック（参照整合性）は `$defs.validator.ref_integrity` の将来導入候補として仕様レベルで予約しておく。

---

#### 5.1.7 幾何情報 (Geometry)

`geometry` は `#/$defs/geometry/line_geometry` に `$ref` される。

| プロパティ                | 型               | デフォルト       | 説明                       |
| -------------------- | --------------- | ----------- | ------------------------ |
| `dimension`          | integer(enum)   | –（推奨値: 3）   | 幾何空間の次元。`2` または `3`。     |
| `polyline_points`    | array(vec3)     | –           | 折線経路を構成する点群。             |
| `bezier_controls`    | array(vec3,1–2) | –           | ベジェ曲線の制御点群。              |
| `arc_center`         | vec3            | –           | 円弧中心座標。                  |
| `arc_radius`         | number(≥0)      | –           | 円弧半径。                    |
| `arc_angle_start`    | number          | –           | 円弧開始角（rad）。              |
| `arc_angle_end`      | number          | –           | 円弧終了角（rad）。              |
| `arc_clockwise`      | boolean         | –           | 円弧の時計回り指定。               |
| `catmullrom_points`  | array(vec3)     | –           | Catmull-Rom 曲線点群。        |
| `catmullrom_tension` | number(0–1)     | –（推奨値: 0.5） | Catmull-Rom 曲線の張力（滑らかさ）。 |

* `dimension` を省略した場合の解釈は実装依存だが、Viewer 実装における推奨初期値は `3`。
* `additionalProperties:false` により、ここに記載されていないプロパティは許可されない。

---

#### 5.1.8 整合確認要約

* ✅ `appearance.render_order` へ名称統一（旧 `renderOrder` は使用しない）。
* ✅ `geometry` の `$ref` は `#/$defs/geometry/line_geometry` に修正。
* ✅ `arrow` は 1 オブジェクト＋`primitive` による条件付き必須で定義（`oneOf` は使用しない）。
* ✅ `frames` は `validator.frames`（−9999〜9999、配列時はユニーク）に一本化。

---

### 5.2 points — 存在要素（Existential Point Element）

#### 5.2.1 概要

`points` は 3DSS における **存在要素** を表し、
空間上の基準点・ノード・アンカーなど、構造の静的基盤を定義する。

各 point は `signification`（意味層）、`appearance`（形態層）、`meta`（管理層）の三層構造を持つ。

---

#### 5.2.2 構造図（概念）

```plaintext
points
├─ signification
│   └─ name : string / { ja, en }  #/$defs/labels/localized_string
├─ appearance
│   ├─ position : [x, y, z]
│   ├─ marker
│   │   ├─ common : orientation / scale / color / opacity / emissive / wireframe
│   │   ├─ primitive : sphere / box / cone / pyramid / corona / none
│   │   ├─ radius / size / height / base / inner_radius / outer_radius
│   │   ├─ gltf : url / scale / rotation / offset
│   │   └─ text : content / font / size / align / pose
│   ├─ visible : boolean
│   └─ frames : integer / array(integer)
└─ meta
    ├─ uuid
    ├─ tags
    └─ creator_memo
```

---

#### 5.2.3 signification 層

| プロパティ  | 型                      | 必須 | デフォルト | 説明                                                 |
| ------ | ---------------------- | -- | ----- | -------------------------------------------------- |
| `name` | string / object(ja,en) | 任意 | `""`  | 点の名称。日本語・英語の併記可。`#/$defs/labels/localized_string`。 |

* スキーマ上の `default` は空文字列（`""`）。
* 意味のある名称を付与するかどうかは Authoring / modeler 側の運用に委ねる。

---

#### 5.2.4 appearance 層

| プロパティ      | 型                        | 必須 | デフォルト             | 説明                                            |
| ---------- | ------------------------ | -- | ----------------- | --------------------------------------------- |
| `position` | vec3                     | ✅  | –                 | 3次元座標 `[x, y, z]`。`#/$defs/spatial/position`。 |
| `marker`   | object                   | 任意 | –                 | マーカー形状・色・ラベルなど。`#/$defs/point/marker`。        |
| `visible`  | boolean                  | 任意 | （スキーマ default なし） | 表示／非表示。実装側 default として `true` を推奨。            |
| `frames`   | integer / array(integer) | 任意 | –                 | 表示フレーム指定。`#/$defs/validator/frames`。          |

---

##### 5.2.4.1 marker.common

`marker.common` はマーカー形状に共通する基本属性を持つ（`#/$defs/point/marker_common`）。

| プロパティ         | 型           | デフォルト     | 説明                                                                        |
| ------------- | ----------- | --------- | ------------------------------------------------------------------------- |
| `orientation` | vec3        | `[0,0,0]` | 回転角。推奨解釈は Yaw-Pitch-Roll (Y-X-Z) だが、3DSS としては「3 要素の数値配列」であることのみ保証。単位：rad。 |
| `scale`       | vec3        | `[1,1,1]` | 各軸スケール。                                                                   |
| `color`       | #RRGGBB     | `#ffffff` | マーカー色。                                                                    |
| `opacity`     | number(0–1) | `0.4`     | 不透明度。                                                                     |
| `emissive`    | boolean     | `false`   | 発光処理を有効にするか。                                                              |
| `wireframe`   | boolean     | `false`   | ワイヤーフレーム表示モード。                                                            |

`additionalProperties:false` により、ここに記載された属性以外は許可されない。

---

##### 5.2.4.2 marker.primitive と形状パラメータ

`marker` 本体は `primitive` と、それに対応する寸法パラメータを持つ（`#/$defs/point/marker`）。

| プロパティ          | 型               | 説明                                                                  |
| -------------- | --------------- | ------------------------------------------------------------------- |
| `primitive`    | string(enum)    | `sphere` / `box` / `cone` / `pyramid` / `corona` / `none` のいずれか。必須。 |
| `radius`       | number(≥0.0001) | 球／円錐の半径。                                                            |
| `size`         | array(number,3) | 直方体サイズ `[sx,sy,sz]`。各要素 ≥ 0.0001。                                   |
| `height`       | number(≥0.0001) | 円錐／四角錐の高さ。                                                          |
| `base`         | array(number,2) | 四角錐底面サイズ `[width, depth]`。各要素 ≥ 0.0001。                             |
| `inner_radius` | number(≥0.0001) | `corona` の内半径。                                                      |
| `outer_radius` | number(≥0.0001) | `corona` の外半径。                                                      |
| `gltf`         | object          | glTF 埋め込みモデル設定。`#/$defs/point/marker_gltf`。                         |
| `text`         | object          | テキストラベル設定。`#/$defs/point/marker_text`。                              |

`primitive` ごとの必須組み合わせ（スキーマでは `allOf` の `if/then` で表現）：

* `primitive: "sphere"` → `radius` 必須
* `primitive: "box"` → `size` 必須
* `primitive: "cone"` → `radius`, `height` 必須
* `primitive: "pyramid"` → `base`, `height` 必須
* `primitive: "corona"` → `inner_radius`, `outer_radius` 必須
* `primitive: "none"` → 寸法パラメータは省略推奨（指定しても意味を持たない実装が多い）

---

##### 5.2.4.3 marker.gltf

| プロパティ      | 型      | デフォルト     | 説明                   |
| ---------- | ------ | --------- | -------------------- |
| `url`      | string | `""`      | glTF モデル URL。        |
| `scale`    | vec3   | `[1,1,1]` | モデル拡大率。              |
| `rotation` | vec3   | `[0,0,0]` | モデル回転角（rad）。         |
| `offset`   | vec3   | `[0,0,0]` | glTF ローカル原点からのオフセット。 |

* いずれも `additionalProperties:false`。
* 単位は `document_meta.units` に準拠する。

---

##### 5.2.4.4 marker.text

| プロパティ     | 型            | デフォルト                  | 説明                                                       |
| --------- | ------------ | ---------------------- | -------------------------------------------------------- |
| `content` | string       | `""`                   | 表示テキスト。                                                  |
| `font`    | string       | `"helvetiker_regular"` | 使用フォント。                                                  |
| `size`    | number       | `8`                    | テキストサイズ。                                                 |
| `align`   | string(enum) | `"center middle"`      | 水平／垂直アライン。9 通り（left/center/right × top/middle/baseline）。 |
| `pose`    | object(text_pose) | `{ "mode": "billboard" }` | 表示姿勢。6.5 `text_pose` を参照。`fixed`/`billboard` を使い分ける。 |

> `pose` は `text_pose`（6.5）をそのまま持つ。`mode="billboard"` は常にカメラ正面（`up`/`roll` 指定可）、`mode="fixed"` はワールド固定（`front`/`up` を指定）。
> `pose` を省略した場合は `{ "mode": "billboard" }` を補完してよい。
**align の表記ルール（v1.1.2）**

`align` は `"<h> <v>"`（半角スペース区切り）で指定する。

- `<h>`: `left` / `center` / `right`
- `<v>`: `top` / `middle` / `baseline`

旧表記として `center&middle` のような `&` 区切りが過去の例・生成物に存在しうるが、v1.1.2 では正規表記ではない。Importer/Normalizer は互換のため `&` をスペースに置換してよい。

---

#### 5.2.5 meta 層

points の meta 層も `$defs.meta.core` を参照し、lines と同一構造をとる。

| プロパティ          | 型             | 必須 | 説明                  |
| -------------- | ------------- | -- | ------------------- |
| `uuid`         | string(uuid)  | ✅  | 一意識別子。              |
| `tags`         | array(string) | 任意 | スコープタグ（`s:/m:/x:`）。 |
| `creator_memo` | string        | 任意 | 制作者メモ。              |

---

#### 5.2.6 整合確認要約

* ✅ `signification.name` は `labels.localized_string`＋`default:""` に合わせて修正。
* ✅ `marker.common.opacity` の default 0.4 をスキーマと一致。
* ✅ `primitive "corona"` とそれに対応する `inner_radius` / `outer_radius` を明示。
* ✅ glTF / text サブ構造の `additionalProperties:false` と default 値を反映。
* ✅ `frames` は共通定義 `validator.frames` に統一。

---

### 5.3 aux — 補助構造（Auxiliary Elements）

#### 5.3.1 概要

`aux` は 3DSS における **空間補助構造（Spatial Auxiliary Structures）** を表す。

意味的情報（signification）は持たず、すべての設定は形態層（appearance）と管理層（meta）に記述される。

---

#### 5.3.2 構造図（概念）

```plaintext
aux
├─ appearance
│   ├─ position / orientation / opacity / visible / frames
│   └─ module
│       ├─ grid   : cartesian / polar グリッド
│       ├─ axis   : 3 軸（長さ・ラベル・矢印）
│       ├─ plate  : xy/yz/zx 平面
│       ├─ shell  : sphere / box / hemisphere / ...
│       ├─ hud    : HUD 用補助
│       └─ extension
│           ├─ latex     : $ref #/$defs/extension/latex
│           └─ parametric: $ref #/$defs/extension/parametric
└─ meta
    ├─ uuid
    ├─ creator_memo
    └─ tags
```

---

#### 5.3.3 appearance 層

| プロパティ         | 型                        | 必須 | デフォルト             | 説明                                |
| ------------- | ------------------------ | -- | ----------------- | --------------------------------- |
| `position`    | vec3                     | 任意 | `[0,0,0]`         | 補助構造の基準位置。                        |
| `orientation` | vec3                     | 任意 | `[0,0,0]`         | 回転（単位: rad）。推奨解釈は Y-X-Z。          |
| `opacity`     | number(0–1)              | 任意 | `0.4`             | 補助構造全体の透明度。                       |
| `module`      | object                   | 任意 | –                 | グリッド／軸／プレート／殻／HUD／拡張のいずれか（複数併用可）。 |
| `visible`     | boolean                  | 任意 | （スキーマ default なし） | 表示可否。実装側 default として `true` を推奨。  |
| `frames`      | integer / array(integer) | 任意 | –                 | 表示フレーム指定。`validator.frames`。      |

---

##### appearance.module.grid（`#/$defs/aux/module_grid`）

| プロパティ          | 型            | デフォルト         | 説明                           |
| -------------- | ------------ | ------------- | ---------------------------- |
| `grid_type`    | string(enum) | `"cartesian"` | 格子種別（`cartesian` / `polar`）。 |
| `subdivisions` | integer      | `8`           | 細分数。                         |
| `major_step`   | number       | `4`           | 主格子間隔。                       |
| `minor_step`   | number       | `1`           | 補助格子間隔。                      |
| `color_major`  | #RRGGBB      | `#666666`     | 主格子線の色。                      |
| `color_minor`  | #RRGGBB      | `#333333`     | 補助格子線の色。                     |

---

##### appearance.module.axis（`#/$defs/aux/module_axis`）

| プロパティ    | 型       | デフォルト  | 説明                                      |
| -------- | ------- | ------ | --------------------------------------- |
| `length` | number  | `64`   | 軸の長さ。                                   |
| `labels` | boolean | `true` | 軸ラベル表示。                                 |
| `arrow`  | object  | –      | 先端矢印設定。`#/$defs/aux/module_axis_arrow`。 |

###### module_axis_arrow

| プロパティ       | 型               | 説明                                           |
| ----------- | --------------- | -------------------------------------------- |
| `primitive` | string(enum)    | `none` / `line` / `cone` / `pyramid`。必須。     |
| `length`    | number(≥0.0001) | `primitive:"line"` のとき必須。                    |
| `thickness` | number(≥0.0001) | 同上。                                          |
| `radius`    | number(≥0.0001) | `primitive:"cone"` のとき必須。                    |
| `height`    | number(≥0.0001) | `primitive:"cone"` / `"pyramid"` のとき必須。      |
| `base`      | array(number,2) | `primitive:"pyramid"` のとき必須（[width, depth]）。 |

* 構造は `line.arrow` と同様に、`primitive` の値に応じた条件付き必須として定義される。
* JSON Schema 上は 1 つのオブジェクトで `allOf` により制約される。

---

##### appearance.module.plate（`#/$defs/aux/module_plate`）

| プロパティ          | 型               | デフォルト     | 説明                       |
| -------------- | --------------- | --------- | ------------------------ |
| `plane`        | string(enum)    | `"xy"`    | 配置面（`xy` / `yz` / `zx`）。 |
| `position`     | vec3            | `[0,0,0]` | 平面基準点。                   |
| `size`         | array(number,2) | `[32,32]` | 平面サイズ `[width, height]`。 |
| `reflectivity` | number(0–1)     | `0.5`     | 反射率。                     |
| `opacity`      | number(0–1)     | `0.4`     | 不透明度。                    |

---

##### appearance.module.shell（`#/$defs/aux/module_shell`）

| プロパティ          | 型            | デフォルト      | 説明                                                                         |
| -------------- | ------------ | ---------- | -------------------------------------------------------------------------- |
| `shell_type`   | string(enum) | `"sphere"` | 外皮構造。`sphere` / `box` / `hemisphere` / `quarter_sphere` / `eighth_sphere`。 |
| `opacity`      | number(0–1)  | `0.4`      | 透過度。                                                                       |
| `reflectivity` | number(0–1)  | `0.5`      | 反射率。                                                                       |
| `effect`       | object       | –          | 境界強調などの効果設定。`#/$defs/aux/module_shell_effect`。                             |

###### module_shell_effect

| プロパティ            | 型           | デフォルト     | 説明       |
| ---------------- | ----------- | --------- | -------- |
| `edge_intensity` | number(0–1) | `0.5`     | 境界強調度。   |
| `rimlight`       | boolean     | `false`   | リムライト有無。 |
| `glow_color`     | #RRGGBB     | `#ff0000` | 境界発光色。   |

---

##### appearance.module.hud（`#/$defs/aux/module_hud`）

| プロパティ                 | 型       | デフォルト  | 説明        |
| --------------------- | ------- | ------ | --------- |
| `follow_camera`       | boolean | `true` | カメラ追従。    |
| `scale_with_distance` | boolean | `true` | 距離スケーリング。 |

---

##### appearance.module.extension（`#/$defs/aux/module_extension`）

`aux.appearance.module.extension` は、構造外の拡張要素を束ねる。

| プロパティ        | 型      | 説明                                                |
| ------------ | ------ | ------------------------------------------------- |
| `type`       | string | 拡張モジュール種別の識別子（任意文字列）。                             |
| `latex`      | object | LaTeX 数式拡張。`#/$defs/extension/latex` への $ref。     |
| `parametric` | object | パラメトリック拡張。`#/$defs/extension/parametric` への $ref。 |

各拡張の詳細は 6.2 節を参照。

---

#### 5.3.4 meta 層

aux の meta 層も `$defs.meta.core` に準拠する。

| プロパティ          | 型             | 必須 | 説明      |
| -------------- | ------------- | -- | ------- |
| `uuid`         | string(uuid)  | ✅  | 一意識別子。  |
| `tags`         | array(string) | 任意 | スコープタグ。 |
| `creator_memo` | string        | 任意 | 制作者メモ。  |

---

#### 5.3.5 HUD（Head-Up Display）の用例

`aux.module.hud` は Viewer／Modeler 上での構造理解を補助する目的で用いる。
HUD 自体は構造情報を持たず、表示補助のための形態的構造として扱う。

| 用途     | 内容例               |
| ------ | ----------------- |
| 位置情報表示 | 座標値・スケールのリアルタイム表示 |
| 凡例表示   | 色・タグ・スコープの凡例説明    |
| 名称ラベル  | 主要ノードや軸名の恒常ラベル化   |
| モード表示  | 編集状態や視点モードの簡易表示   |

HUD の有無は構造解釈に影響しない。
Viewer は存在すれば描画し、なければ無視してよい。

---

### 5.4 document_meta — 文書メタ情報（Document Metadata）

#### 5.4.1 概要

`document_meta` は 3DSS 文書全体を統括する **管理・識別メタ情報** を定義する領域である。

スキーマの参照元、生成ツール、座標系、単位系、バージョン、作者、更新日時などを含み、
ファイルレベルでの整合性と追跡可能性を担保する。

v1.1.2 では、必須フィールドは次の 5 項目である：

* `document_title`
* `document_uuid`
* `schema_uri`
* `author`
* `version`

---

#### 5.4.2 構造図（概念）

```plaintext
document_meta
├─ document_title
├─ document_summary
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

#### 5.4.3 プロパティ一覧（`#/$defs/meta/document`）

| プロパティ               | 型                     | 必須 | デフォルト                                   | 説明                                                                                |
| ------------------- | --------------------- | -- | --------------------------------------- | --------------------------------------------------------------------------------- |
| `document_title`    | localized_string      | ✅  | –                                       | 文書タイトル。`#/$defs/labels/localized_string`。                                         |
| `document_summary`  | localized_string      | 任意 | –                                       | 文書の概要・要約。Viewer で説明として利用可能。                                                       |
| `document_uuid`     | string(uuid)          | ✅  | –                                       | 文書固有の識別子。全 3DSS ファイルで一意であることが望ましい。                                                |
| `version`           | string(semver)        | ✅  | `"1.0.0"`                               | 文書バージョン（コンテンツ側）。SemVer 形式。                                                        |
| `updated_at`        | string(timestamp_utc) | 任意 | –                                       | 最終更新日時。`YYYY-MM-DDThh:mm:ssZ` 形式。                                                 |
| `tags`              | array(tag)            | 任意 | `[]`                                    | 文書単位のスコープタグ。`s:/m:/x:` 接頭辞を含む。                                                    |
| `schema_uri`        | string(uri)           | ✅  | –                                       | 準拠スキーマ URI。例：`https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.2` |
| `generator`         | string(uri-reference) | 任意 | `"https://q2t-project.github.io/3dsl/"` | 文書を生成したツールまたはアプリの識別 URI。                                                          |
| `reference`         | string                | 任意 | `""`                                    | 外部参照・出典・備考など。                                                                     |
| `coordinate_system` | string(const)         | 任意 | –                                       | 座標系識別子。値は `"Z+up/freeXY"` に限定される（const）。省略時も同一系を前提とする。                            |
| `units`             | string(enum)          | 任意 | `"non_si:px"`                           | 使用単位。`"m"` / `"cm"` / `"mm"` / `"non_si:px"`。                                     |
| `i18n`              | string(enum)          | 任意 | `"ja"`                                  | 文書の基本言語コード。`"ja"` / `"en"`。                                                       |
| `author`            | string(pattern)       | ✅  | –                                       | 作者識別。`^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+)?$`。                                       |
| `creator_memo`      | string                | 任意 | –                                       | 制作者による自由メモ。構造解釈には影響しない。                                                           |

* `coordinate_system` は **const** により `"Z+up/freeXY"` のみ許可される。
  書かれていない場合でも 3DSS 構造層では同一系を前提とする。
* `units` と `i18n` は default により、未指定時も `"non_si:px"` / `"ja"` が適用される。
* `JSON Schema` 上では const 指定だが required ではなく、省略時も "Z+up/freeXY" を前提とする。

---

#### 5.4.4 整合確認要約

* ✅ `document_summary` を追加し、`labels.localized_string` に準拠。
* ✅ `units` の default を `"non_si:px"` に更新（旧 `"mm"` から変更）。
* ✅ `coordinate_system` は const `"Z+up/freeXY"` として固定（default は付与せず）。
* ✅ `tags` / `author` / `version` / `updated_at` の pattern を `$defs.validator.*` と整合。

---

### 5.5 情報提示およびラベル方針（Non-Structural）

Viewer／Modeler 層におけるツールチップや一時的なラベル等の動的情報提示は構造外情報とし、
3DSS では定義しない。

ただし、構造上恒常的に表示すべき名称は `points.signification.name` や `points.marker.text` に明示的に記述する。

UI 上の一時的注釈・コメントは、`meta.creator_memo` などの
**非構造メモ領域** に記録することが推奨される。

---

## 第6章　共通定義（Common Definition）

本章では、スキーマ全体の整合性を保証する `$defs` 領域の構造を示す。

v1.1.2 では主に次の定義群が用意される：

* `$defs.validator`：UUID／URI／タグ／言語コード／単位／色／ベクトル／フレーム等の共通検証定義
* `$defs.spatial`：position / orientation / scale / rotation / offset などの空間属性
* `$defs.geometry`：`line_geometry` など幾何構造の定義
* `$defs.extension`：parametric / latex 等の拡張領域
* `$defs.labels`：多言語ラベル（localized_string）
* `$defs.meta`：core / document メタ属性
* `$defs.line` / `$defs.point` / `$defs.aux`：各要素の下位構造

本章ではとくに `$defs.validator` と `$defs.extension` を詳細化し、
`$defs.spatial` / `$defs.meta` については 6.4 節で概念レベルの仕様を記載する。

### 6.1 validator（バリデータ定義群）

`$defs.validator` は、スキーマ全体で再利用する「基本的な値形状」を束ねる領域である。
v1.1.2 では、以下のキーを持つ（実体はすべて `$defs.validator.*` として定義される）。

* `uuid`, `uuid_v4`
* `uri`, `uri_http_like`
* `path_ref`
* `tag`
* `language_code`
* `units`
* `semver`
* `timestamp_utc`
* `author`
* `color_hex`
* `vec3`
* `frames`

---

#### 6.1.1 プリミティブ型（ID／URI／色／ベクトル／フレーム）

| キー              | 構造                                                | 用途                                                           |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| `uuid`          | `type:string, format:uuid`                        | `meta.core.uuid` や `document_meta.document_uuid` など、UUID 一般。 |
| `uuid_v4`       | `type:string, pattern:UUIDv4`                     | UUID v4 形式の厳密検証が必要な場合に使用。                                    |
| `uri`           | `type:string, format:uri`                         | `schema_uri` などの汎用 URI。                                      |
| `language_code` | `type:string, enum:["ja","en"]`                   | 文書言語やラベル言語の指定。                                               |
| `units`         | `type:string, enum:["m","cm","mm","non_si:px"]`   | 長さ単位。`document_meta.units` などに利用。                            |
| `color_hex`     | `type:string, pattern:^#(?:[0-9a-fA-F]{3}){1,2}$` | 3桁または6桁の 16 進色コード。                                           |
| `vec3`          | `type:array(number), minItems:3, maxItems:3`      | 3 要素のベクトル（座標・回転・スケール）。                                       |
| `frames`        | `oneOf:[integer / array(integer)]`                | 表示フレーム指定。整数または整数配列。-9999〜9999、配列時はユニーク。                      |

---

#### 6.1.2 パターンベース型（タグ／バージョン／時刻／作者／パス）

| キー              | 正規表現                                                     | 用途                                            |
| --------------- | -------------------------------------------------------- | --------------------------------------------- |
| `tag`           | `^(s                                                     | m                                             | x):[\w\-\p{L}\p{N}]+$`             | スコープ分類タグ。`s:/m:/x:` 接頭辞＋識別子。 |
| `uri_http_like` | `^(https?                                                | ftp                                           | file)://[-\w.]+(/[\w\-./?%&=]*)?$` | HTTP(S) 等の URI 検証に利用可能な補助定義。 |
| `semver`        | `^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+(\\.[a-zA-Z0-9]+)*)?$` | SemVer 準拠バージョン（文書バージョンなど）。                    |                                    |                              |
| `timestamp_utc` | `^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$`           | ISO8601 UTC 形式のタイムスタンプ。                       |                                    |                              |
| `author`        | `^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+)?$`                    | 作者識別（任意の ID か、簡易メールアドレス形式）。                   |                                    |                              |
| `path_ref`      | `^[\\w\\-/\\.]+$`                                        | パス様の参照文字列。`parametric.bindings.target` などで使用。 |                                    |                              |

* `uri` は `format: "uri"` を用いるため、ここでは `uri_http_like` を補助的なパターンとして分離している。
* `path_ref` の先頭接頭辞（例：`"points::..."`）などの意味づけは 3DSS の外側（ツール／アプリ仕様）で定める。

---

#### 6.1.3 enum_constraint（列挙値制約）［v1.1.2 では未使用］

本節は将来版で `$defs.validator.enum_constraint` を導入するための **節番号予約** として残す。

3DSS v1.1.2 の JSON Schema には
`$defs.validator.enum_constraint` は定義されておらず、
列挙値は各プロパティ定義の `enum` と本仕様書の表記で直接規定する。

---

#### 6.1.4 required_sets（必須項目集合）［v1.1.2 では未使用］

本節は将来版で `$defs.validator.required_sets` を導入するための **節番号予約** として残す。

v1.1.2 では、必須項目は各オブジェクト定義の `required` 配列で直接規定し、
共通の必須集合を `$defs` 側で束ねることは行わない。

---

#### 6.1.5 ref_integrity（参照整合性）［v1.1.2 では未使用］

本節は将来版で `$defs.validator.ref_integrity` を導入するための **節番号予約** として残す。

v1.1.2 の JSON Schema では、参照整合性（`lines` → `points` など）は
型（UUID）レベルまでしか検証されず、
実際の存在チェックはアプリケーション側の責務とする。

---

### 6.2 geometry（幾何定義）

#### 6.2.1 line_geometry（線形ジオメトリ定義）

`line_geometry` は `$defs.geometry.line_geometry` として定義され、
5.1.7 で述べたように、非直線系の line の形状を保持する。

| プロパティ                | 型               | デフォルト | 説明              |
| -------------------- | --------------- | ----- | --------------- |
| `dimension`          | integer(enum)   | –     | 幾何空間次元（2 or 3）。 |
| `polyline_points`    | array(vec3)     | –     | 折線経路点群。         |
| `bezier_controls`    | array(vec3,1–2) | –     | ベジェ制御点。         |
| `arc_center`         | vec3            | –     | 円弧中心。           |
| `arc_radius`         | number(≥0)      | –     | 円弧半径。           |
| `arc_angle_start`    | number          | –     | 円弧開始角（rad）。     |
| `arc_angle_end`      | number          | –     | 円弧終了角（rad）。     |
| `arc_clockwise`      | boolean         | –     | 時計回り指定。         |
| `catmullrom_points`  | array(vec3)     | –     | Catmull-Rom 点群。 |
| `catmullrom_tension` | number(0–1)     | –     | Catmull-Rom 張力。 |

* `additionalProperties:false` により、余分なプロパティを許容しない。
* `dimension` が省略されていても JSON Schema 上はエラーにならないが、
  Viewer 実装の推奨初期値は 3 とする。

---

### 6.3 拡張領域（Extension）

`$defs.extension` は、Authoring 層や自動生成層と安全に連携するための拡張定義領域であり、
構造層（3DSS 構造定義）そのものを拡張するのではなく、
Authoring 層や Viewer 補助機能との **接合点** として外側に位置づけられる。

v1.1.2 では `parametric` と `latex` の 2 種を定義する。

| キー           | 用途                                                |
| ------------ | ------------------------------------------------- |
| `parametric` | 幾何拘束・変数・依存関係などの拡張構造。Authoring 層から生成された結果の転写先。     |
| `latex`      | 数式レンダリング用拡張。`aux.module.extension.latex` から $ref。 |

---

#### 6.3.1 parametric（`#/$defs/extension/parametric`）

| プロパティ      | 型                   | 必須 | デフォルト         | 説明                                                        |
| ---------- | ------------------- | -- | ------------- | --------------------------------------------------------- |
| `type`     | string(minLength:1) | ✅  | –             | 拡張タイプ識別子。例：`"noise_field"`, `"grid_warp"`, `"LSystem"` 等。 |
| `version`  | string(semver)      | 任意 | –             | モジュールバージョン。`validator.semver` を使用。                        |
| `params`   | object              | 任意 | –（運用推奨: `{}`） | パラメータ辞書。値の型のみを制約し、キー名は自由。                                 |
| `bindings` | array(object)       | 任意 | –（運用推奨: `[]`） | 変数バインディング `{ target, expression }` の配列。                   |
| `seed`     | integer             | 任意 | –             | 疑似乱数等のシード値。                                               |

`params` の値として許可される型：

* `number`
* `integer`
* `boolean`
* `string`
* `array<number>`

`bindings` の各要素：

| プロパティ        | 型                | 必須 | 説明                                  |
| ------------ | ---------------- | -- | ----------------------------------- |
| `target`     | string(path_ref) | ✅  | 書き換え対象のパス。`validator.path_ref` に従う。 |
| `expression` | string           | ✅  | 評価式（LLM やスクリプト言語など実装依存）。            |

JSON Schema 上の `default` は定義しないが、
運用上は `params:{}`・`bindings:[]` を初期値とすることを推奨する。

---

#### 6.3.2 latex（`#/$defs/extension/latex`）

| プロパティ         | 型                   | 必須 | デフォルト     | 説明                                        |
| ------------- | ------------------- | -- | --------- | ----------------------------------------- |
| `content`     | string(minLength:1) | ✅  | –         | LaTeX ソース。例：`E=mc^2`。                     |
| `render_mode` | string(enum)        | 任意 | `"math"`  | 表示モード。`math` / `inline` / `block`。        |
| `font_size`   | number              | 任意 | –         | フォントサイズ。スキーマ上 default 未指定（Renderer 側で決定）。 |
| `color`       | string(color_hex)   | 任意 | `#ffffff` | 数式色。                                      |
| `pose`        | object(text_pose) | 任意 | `{ "mode": "billboard" }` | 表示姿勢。6.5 `text_pose` を参照。 |
| `position`    | vec3                | 任意 | –         | 配置位置。                                     |

* `pose` は省略時 `{ "mode": "billboard" }` を補完してよい。`position` は省略時の扱いは実装ポリシー（例：原点）。
  Viewer 実装は、未指定時に例えば pose=`{ "mode": "billboard" }`・position=`[0,0,0]` を初期値とするなど、

---

#### 6.3.3 整合確認要約

* ✅ `$defs/extension/parametric` / `$defs/extension/latex` の構造とプロパティを最新スキーマに一致。
* ✅ いずれも `additionalProperties:false` による厳密検証を維持。
* ✅ `parametric.params` では値の型のみを制約し、キー名はツール側自由とする設計を明記。
* ✅ `aux.module.extension` からの `$ref` パスと整合（latex/parametric をぶら下げる構造）。

---

### 6.4 spatial / meta（空間属性・メタ属性の共通基盤）

`$defs.spatial` は `position` / `orientation` / `scale` / `rotation` / `offset` などの
空間属性を共通定義する領域であり、すべて `validator.vec3` を再利用している。

* `position` : 要素の位置 `[x, y, z]`
* `orientation` : 回転角（推奨解釈：Yaw-Pitch-Roll = Y-X-Z）
* `scale` : スケール
* `rotation` : glTF 等、別解釈を必要とする回転
* `offset` : ローカル原点からのオフセット
* `axis_signed` : 符号付き軸（`+x`/`-x`/`+y`/`-y`/`+z`/`-z`）。`text_pose` などで使用。

3DSS v1.1.2 では座標系は `document_meta.coordinate_system` の const により
**`"Z+up/freeXY"` に固定**され、

* Z+：絶対的な「上」方向
* X/Y：Z+ に直交する平面内の自由軸

として解釈する。

`$defs.meta` には次の 2 要素がある：

* `meta.core`：lines / points / aux 共通の最小メタ構造
* `meta.document`：ファイル全体のメタ情報（5.4章）

#### 6.4.1 meta.core

`meta.core` は各要素ノード（`lines[].meta` / `points[].meta` / `aux[].meta`）で共通に利用される。

| プロパティ          | 型            | 必須 | 説明                          |
| -------------- | ------------ | -- | --------------------------- |
| `uuid`         | string(uuid) | ✅  | 要素の一意識別子。                   |
| `tags`         | array(tag)   | 任意 | スコープタグ。`validator.tag` に従う。 |
| `creator_memo` | string       | 任意 | 制作者メモ。構造解釈には影響しない。          |

要素の追加・削除・差し替えは、`uuid` によって追跡される。
`tags` は構造を横断する分類（s:system / m:meso / x:external 等）に利用される。

#### 6.4.2 document_meta と座標・単位・言語

文書全体の `coordinate_system` / `units` / `i18n` は
`meta.document` に一度だけ定義される。

* `coordinate_system` : `"Z+up/freeXY"`（const）
  構造層における絶対座標系。
* `units` : `"m"` / `"cm"` / `"mm"` / `"non_si:px"`（default `"non_si:px"`）
  `position`・長さ・半径・スケール等、**長さ次元**を持つ数値の共通単位。
* `i18n` : `"ja"` / `"en"`（default `"ja"`）
  `labels.localized_string` の言語解釈や Viewer/UI の初期表示言語を決めるヒント。

これら 3 つはあくまで **構造データ側の基準値** であり、
アプリケーション実装が表示単位や UI 言語を変更しても、
3DSS ファイル内部の値を書き換えてはならない（read-only 原則）。

---

## 第7章　拡張・互換性（Extension & Compatibility）

### 6.5 text_pose

テキスト（`marker.text` / `caption_text` / `extension.latex`）の表示姿勢を指定するための型。

- `mode: "billboard"`
  - 常にカメラ正面を向く。
  - `up`（既定：`+z`）で「上方向」の基準（ワールド軸）を与える。
  - `roll`（既定：`0`、degree）で画面奥行き方向の回転を与える。

- `mode: "fixed"`
  - ワールド固定の姿勢。
  - `front` はテキストの「表」が向く法線方向（符号付き軸）。
  - `up` は文字の上方向（符号付き軸）。
  - `front` と `up` は直交（同軸／反転軸は不可）。
  - 実装は右手系で `right = up × front` を基準に姿勢を構成してよい。

#### 6.5.1 旧 `plane` からの移行（参考）

旧：`plane = xy|yz|zx|billboard` を持つデータは、次の `pose` に写像してよい。

- `xy` → `{ "mode": "fixed", "front": "+z", "up": "+y" }`
- `yz` → `{ "mode": "fixed", "front": "+x", "up": "+z" }`
- `zx` → `{ "mode": "fixed", "front": "+y", "up": "+z" }`
- `billboard` → `{ "mode": "billboard", "up": "+z", "roll": 0 }`

※ 既存実装で `plane` の表裏（法線符号）を反転していた場合は、`front` を `-` にすることで同等にできる。

### 7.1 バージョン管理（Version Management）

* スキーマの実体 (3DSS.schema.json) は 常に同じ `$id` / `schema_uri` を持つ。

* 「スキーマとしての版数（互換性の境目）」は、この仕様書の第9章 `Change Log` で管理する。

* 各 3DSS 文書は `document_meta.version` に **文書自身のバージョン** を SemVer 形式で保持する。
  スキーマバージョンとは別軸で更新される。

* スキーマの安定段階（`stable` / `beta` / `deprecated`）は **仕様書側の管理区分** であり、
  JSON Schema 本体（`$defs` 等）には定義を持たない。

* 1.0.x 系から 1.1.x 系への更新では、

  * `$defs` 構造の整理（`geometry` / `labels` / `meta` の分離）
  * `document_meta.document_title` / `document_summary` の localized_string 化
  * `units` の default 見直し（`"non_si:px"`）

  などが行われるが、基本的なルート構造（`lines` / `points` / `aux` / `document_meta`）は継続して互換を保つ。

---

### 7.2 拡張ルール（Extension Policy）

* 新要素や列挙値（enum）の追加は、該当プロパティ定義（第 5 章）に対して直接 `enum` を拡張し、
  必要に応じて `$defs.validator` 配下の各定義（type や pattern など）を更新する。
  v1.1.2 時点でも `$defs.validator.enum_constraint` は定義しない。

* 既存プロパティの削除は禁止。
  非推奨化には `"deprecated": true` フラグを付与して明示できるが、
  その解釈・UI 上での扱い（警告の表示など）は各実装に委ねる。

* 外部拡張スキーマは `$ref` で連携可能：

  例：`"$ref": "./custom_ext.schema.json"`。

* 拡張は **原則 `$defs.extension.*` に集約** し、

  実体要素側（例：`aux.appearance.module.extension.latex`）では

  `$ref: "#/$defs/extension/latex"` のように参照だけを持つ構造にする。

* `$defs` 内での同名キーの再定義は禁止とし、
  スキーマ汚染や衝突を避ける。

---

### 7.3 互換性維持（Backward Compatibility）

* **旧要素の保持方針**：既存要素・プロパティは最低 2 バージョン分（例：1.0.x → 1.1.x）維持することを原則とする。
  明示的に削除されるのはメジャーバージョンアップ（1.x → 2.x）に限る。

* **属性互換**：

  * enum への値追加は許可される。
  * 既存 enum 値の変更・削除は禁止。
  * どうしても廃止したい値は `"deprecated": true` を付与して残し、実装側で警告表示などに委ねる。

* **構造互換**：

  * `lines` / `points` / `aux` の三層構造（signification / appearance / meta）は維持する。
  * `document_meta` の必須 5 項目（`document_title` / `document_uuid` / `schema_uri` / `author` / `version`）は今後も保持する。

* **スキーマ URI ポリシー**：

  * 各バージョンの `$id` / `schema_uri` は固定し、Git リポジトリ内でバージョン単位にファイルを保持する。
  * 例：`3DSS.schema.v1.0.3.json`・`3DSS.schema.v1.1.2.json` などの形で履歴管理してもよい（命名規則は運用に委ねる）。

---

### 7.4 バリデーション互換性（Validation Compatibility）

* スキーマは **JSON Schema Draft 2020-12** 準拠とし、
  AJV 等の主要バリデータでの検証通過を前提とする。

* 拡張スキーマも `$defs` 構造および Draft 2020-12 に準拠していれば、
  同じバリデータ上で一体として検証可能である。

* 互換性を破壊する変更（型変更・必須化・構造変更など）は、

  * メジャーバージョンアップ（1.x → 2.x）時にのみ許可される。
  * それ以外の変更（マイナー／パッチ）は **追加型（enum 値追加・オプション追加）** を基本とし、
    既存データが invalid にならないよう設計する。

---

### 7.5 廃止要素の扱い（Deprecation Handling）

* 廃止予定要素は仕様書内で明示し、可能であれば JSON Schema 側にも `"deprecated": true` を付与する。

* `deprecated` フラグの付与位置は、

  * 各要素のプロパティ定義（`lines.appearance.*` など）
  * `$defs` 側の共通定義（例：`$defs.aux.module_shell.shell_type` の特定 enum 値）

  のいずれでもよい。

* 廃止予定要素を含む文書は **バリデーション上は「warning」扱い** とし、
  strict validation が必要なケースでも「エラー」ではなく警告として取り扱うのが望ましい。
  （warning を error に昇格させるかどうかは実装ポリシーに委ねる）

---

### 7.6 Viewer 設定および表示方針

* Viewer / Modeler における表示設定・テーマ・演出（カメラパラメータ、ライト、シャドウ、ポストプロセス等）は
  3DSS スキーマの定義範囲外とする。

* 3DSS は **構造的事実と関係の記述** に専念し、
  見た目・体験・操作性は各アプリケーション実装に委ねる。

* 将来的に Viewer 設定（例：`viewer_config.schema.json`）を別スキーマとして定義する場合も、

  3DSS 構造層とは `$ref` による **緩やかな関連** にとどめ、

  3DSS 内に Viewer 設定を直接埋め込まない方針とする。

---

### 7.7 tags（スコープタグ）の運用規範

`meta.tags` および `document_meta.tags` は次の正規表現に従う：

```regex
^(s|m|x):[\\w\\-\\p{L}\\p{N}]+$
```

ボディ部分には英数字・アンダースコア・ハイフンに加え、
Unicode の文字（\p{L}, \p{N}）も使用できる。

| 接頭辞  | 意味             | 想定用途                  |
| ---- | -------------- | --------------------- |
| `s:` | structural（構造） | 幾何・トポロジ・座標に関する分類      |
| `m:` | meaning（意味）    | 概念・意味論的分類（例：因果・論理・時間） |
| `x:` | meta（付帯）       | コメント・派生・メモ・出典等の付帯情報   |

* tags は Viewer / Modeler における色分け・フィルタリングなど、
  UI 補助のために利用されることを想定するが、
  **構造解釈そのものには影響しない**。

* 同一 prefix を共有する要素は、レイヤ／グループ選択の単位として活用できる。

---

### 7.8 外部仕様との互換（External Compatibility）

* 本スキーマは **JSON Schema Draft 2020-12 (December 2020)** に準拠する。

* 基本型の扱いにおいて、**OpenAPI Schema** および **Schema.org** の設計方針と矛盾しないよう配慮する。

  （ただし直接の互換性を保証するものではない）

* 拡張時には **JSON-LD**, **glTF** など外部仕様との連携を許容し、

  `aux` や `extension` を介して相互参照可能なメタ構造を構築できるようにする。

* glTF 等の外部 3D フォーマットは原則として **appearance 層（とくに gltf 埋め込み）** を通じて参照し、
  3DSS 自体は幾何・表示の最小限属性だけを保持する。

---

#### 整合確認要約

* ✅ SemVer に基づくスキーマ／文書バージョンの分離を明示。
* ✅ `$defs` 拡張ルールと外部スキーマ参照方針を v1.1.2 構造に合わせて整理。
* ✅ `enum_constraint` / `required_sets` / `ref_integrity` が予約のみで未定義であることを 6 章と整合。
* ✅ tags の正規表現を `$defs.validator.tag` と一致。
* ✅ JSON Schema Draft 2020-12 準拠と、外部仕様との連携方針を再確認。

---

## 第8章　例（Example, v1.1.2 準拠）

```json
{
  "lines": [
    {
      "signification": {
        "relation": { "structural": "association" },
        "sense": "a_to_b"
      },
      "appearance": {
        "end_a": { "ref": "11111111-1111-4111-8111-111111111111" },
        "end_b": { "ref": "22222222-2222-4222-8222-222222222222" },
        "line_type": "straight",
        "line_style": "solid",
        "color": "#ffffff",
        "opacity": 0.4,
        "arrow": {
          "primitive": "cone",
          "radius": 0.5,
          "height": 1.0,
          "placement": "end_b",
          "auto_orient": true
        },
        "render_order": 0,
        "visible": true
      },
      "meta": {
        "uuid": "33333333-3333-4333-8333-333333333333",
        "tags": ["s:example", "m:association"]
      }
    }
  ],

  "points": [
    {
      "signification": {
        "name": {
          "ja": "ポイントA",
          "en": "Point A"
        }
      },
      "appearance": {
        "position": [0, 0, 0],
        "marker": {
          "primitive": "sphere",
          "radius": 4,
          "common": {
            "orientation": [0, 0, 0],
            "scale": [1, 1, 1],
            "color": "#ffffff",
            "opacity": 0.4,
            "emissive": false,
            "wireframe": false
          }
        },
        "visible": true
      },
      "meta": {
        "uuid": "11111111-1111-4111-8111-111111111111",
        "tags": ["s:node"]
      }
    },
    {
      "signification": {
        "name": {
          "ja": "ポイントB",
          "en": "Point B"
        }
      },
      "appearance": {
        "position": [16, 0, 0],
        "marker": {
          "primitive": "box",
          "size": [4, 4, 4],
          "common": {
            "orientation": [0, 0, 0],
            "scale": [1, 1, 1],
            "color": "#ffffff",
            "opacity": 0.4,
            "emissive": false,
            "wireframe": false
          }
        },
        "visible": true
      },
      "meta": {
        "uuid": "22222222-2222-4222-8222-222222222222",
        "tags": ["s:node"]
      }
    }
  ],

  "aux": [
    {
      "appearance": {
        "position": [0, 0, 0],
        "orientation": [0, 0, 0],
        "opacity": 0.4,
        "module": {
          "grid": {
            "grid_type": "cartesian",
            "subdivisions": 8,
            "major_step": 4,
            "minor_step": 1,
            "color_major": "#666666",
            "color_minor": "#333333"
          },
          "axis": {
            "length": 64,
            "labels": true,
            "arrow": {
              "primitive": "cone",
              "radius": 0.5,
              "height": 1.0
            }
          }
        },
        "visible": true
      },
      "meta": {
        "uuid": "44444444-4444-4444-8444-444444444444",
        "tags": ["x:helper"]
      }
    }
  ],

  "document_meta": {
    "document_title": {
      "ja": "3DSS サンプル文書",
      "en": "Sample 3DSS Document"
    },
    "document_summary": {
      "ja": "2 点間を結ぶ単純な association の例。",
      "en": "Simple example of an association between two points."
    },
    "document_uuid": "55555555-5555-4555-8555-555555555555",
    "version": "1.0.0",
    "author": "creator@example.com",
    "updated_at": "2025-12-12T12:00:00Z",
    "schema_uri": "https://q2t-project.github.io/3dsl/schemas/3DSS.schema.json#v1.1.2",
    "coordinate_system": "Z+up/freeXY",
    "units": "non_si:px",
    "i18n": "ja",
    "tags": ["m:example", "x:doc"]
  }
}
```

この例は：

* `render_order`（旧 `renderOrder`）
* `document_meta.document_title` / `document_summary` の localized_string
* `schema_uri` は `$id` + `$anchor`（例：`.../3DSS.schema.json#v1.1.2`）に揃える（anchor で準拠版を明示する方針）。
* `aux.module.grid/axis` の構造

など、v1.1.2 で整理した定義と揃えてある。

---

## 第9章　変更履歴（Change Log）
本表の Version は、3DSS.schema.json の設計仕様（このドキュメント）の版数を表し、
各構造文書の document_meta.version とは別である。

| Version | Date       | Change                                                             | Status |
| ------- | ---------- | ------------------------------------------------------------------ | ------ |
| 1.1.2   | 2026-01-11 | `text_pose` 導入：`marker.text.plane` / `caption_text.plane` / `extension.latex.plane` を `pose` に置換（fixed/billboard）。`marker.text.align` 正規表記をスペース区切りに統一（旧 `&` 区切りは非推奨・互換ノーマライズ可）。 | stable |
| 1.1.1   | 2025-12-25 | 実装時に判明した不具合修正 | stable |
| 1.1.0   | 2025-12-12 | `$defs` 再編（geometry/labels/meta）、units 既定値の見直し、document_meta の拡張ほか | stable |
| 1.0.2   | 2025-12-03 | 実装時に判明した不具合修正等                                                     | stable |
| 1.0.1   | 2025-11-23 | 実装時に判明した不具合修正等                                                     | stable |
| 1.0.0   | 2025-10-21 | 初版確定                                                               | stable |

* 1.1.0 では、スキーマのルート構造を変えずに `$defs` の整理と文書メタ情報の拡張を中心に行う。
* 1.0.x 系のファイルは v1.1.0 スキーマに対しても基本的に上位互換で解釈できることを目標とする。

---

## 第10章　付録（Appendix）

### 10.1 用語索引（Glossary）

* **relation**
  `lines.signification.relation` における関係種別。`structural` / `dynamic` / `logical` / `temporal` / `meta` の 5 系統を持つ。

* **sense**
  `lines.signification.sense` における方向性指定。`a_to_b` / `b_to_a` / `bidirectional` / `neutral`。

* **line_type**
  線の幾何学的種別。`straight` / `polyline` / `catmullrom` / `bezier` / `arc`。

* **line_style**
  線の描画スタイル。`solid` / `dashed` / `dotted` / `double` / `none`。

* **marker**
  `points.appearance.marker` における存在点の形状。`primitive` と寸法パラメータ（`radius` / `size` など）、`common`（orientation / scale / color / opacity / emissive / wireframe）を含む。

* **effect**
  `lines.appearance.effect` や `aux.module.shell.effect` による動的表現・境界強調。`effect_type` / `amplitude` / `speed` / `duration` / `loop` / `phase` / `easing` / `width` など。

### 10.2 参照リンク（References）

* JSON Schema 2020-12 Specification
* OpenAPI Specification 3.x
* Schema.org Style Guide
* glTF 2.0 Specification

（具体的な URL はオンライン版仕様書の脚注にて付与する想定）
