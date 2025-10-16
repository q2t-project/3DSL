# 3DSS_spec.md

---

# 1. 目的 / Purpose

### 日本語
3DSS（Three-Dimensional Structural Schema）は、3DSL における 構文層（Syntactic Layer） を定義するスキーマである。  
このスキーマは、3DSL ドキュメント（3DSD）に含まれる構造・意味・管理情報 を体系的に記述するための規範を提供する。

### English
The **3DSS (Three-Dimensional Structural Schema)** defines the **Syntactic Layer** of the 3DSL system.  
It provides a formal specification for describing, in a systematic manner,  
the **structural**, **semantic**, and **meta-administrative** information contained within any 3DSL document (3DSD).

---

### 対応アプリケーション層
本スキーマ（3DSS）は、3DSL エコシステムにおける **viewer** および **modeler** の両実装層を対象としている。
### Target Application Layers
The 3DSS schema applies to both implementation layers within the 3DSL ecosystem:  
the **viewer** and the **modeler**.

---

- **viewer（ビューワ）**：  
  3DSL ドキュメント（3DSD）を読み込み、3D空間上で可視化・描画・アニメーション表示を行うアプリケーション。  
  主に受動的表示・理解支援・分析出力を目的とする。
- **Viewer:**  
  An application that loads a 3DSL document (3DSD) and performs visualization, rendering, and animation within 3-dimensional space.  
  Its primary roles are **passive presentation**, **interpretive assistance**, and **analytical output**.

---

- **modeler（モデラ）**：  
  3DSL ドキュメント（3DSD）を構築・編集・検証するためのオーサリング／構造編集ツール。  
  主に能動的生成・構造設計・意味編集を担う。
- **Modeler:**  
  An authoring and structural-editing tool used to construct, modify, and validate a 3DSL document (3DSD).  
  Its main functions involve **active creation**, **structural design**, and **semantic editing**.

---

両者は同一の 3DSS スキーマに基づいて動作し、**共通データ構造を介して相互運用可能** であることを前提とする。
Both applications operate on the same 3DSS schema and are designed to be **interoperable through a shared data structure**.

---

本仕様書内で「viewer」「modeler」への言及がある場合、それは上記定義を指すものとする。
Whenever this specification refers to *“viewer”* or *“modeler”*,  
the terms shall be understood according to the definitions provided above.


---

# 2. 設計理念 / Design Philosophy

---

## 2.1 基本理念 / Fundamental Principles

### 日本語
- 構造の厳密さ（Schema Consistency）と表現内容の自由（Semantic Flexibility）は切り離して扱う。  
  スキーマは構文の枠を保証する一方で、意味や表現は自由に拡張できるように設計する。
- common は形式的規範（フォーマット統一）を担い、meta は情報的識別（管理・外部連携）を担う。
- すべての構造要素（point / line / aux）は、meta・signification・appearance の3系統を必ず持つ。  
  この統一構造により、ツール間での自動処理と解析を容易にする。

### English
- **Schema consistency** and **semantic flexibility** are treated as independent concerns.  
  The schema guarantees syntactic form and structural validity,
  while expression and meaning are designed to remain freely extensible.
- The **common** block governs *formal uniformity* (format standardization),
  whereas **meta** governs *informational identity* (management and external linkage).
- Every structural element—**point**, **line**, and **aux**—must include the three components:
  **meta**, **signification**, and **appearance**.
  This unified composition simplifies automated processing and analysis across tools.

---

## 2.2 構造層の三分構造 / Three-Tier Structural Model

### 日本語
3DSS のスキーマ設計は、構造的役割を明確に分けるために「構造層」「意味層」「管理層」の三層構成を採用する。

| 層 | 担当ブロック | 役割 |
|----|---------------|------|
| **構造層（Structure Layer）** | `common` | 構文規範・形式定義を担う。意味情報・表示属性を含まない。 |
| **意味層（Meaning Layer）** | `signification` | 構造同士の関係や方向性など、意味的接続を定義する。 |
| **管理層（Management Layer）** | `document_meta` | ドキュメント全体の識別・バージョン・スキーマURI等の管理情報を保持する。 |

### English
To clarify structural roles, the 3DSS schema adopts a **three-tier architecture**  
comprising the *Structure Layer*, *Meaning Layer*, and *Management Layer*.

| Layer | Block | Function |
|--------|--------|-----------|
| **Structure Layer** | `common` | Defines syntactic norms and formal structures; contains no semantic or visual data. |
| **Meaning Layer** | `signification` | Defines semantic relations and directional connections among structural entities. |
| **Management Layer** | `document_meta` | Stores document-level identification, versioning, and schema URI management information. |

---

## 2.3 スキーマ運用原則 / Schema Operational Principles

### 日本語
- 「三層構造の定義」「properties 並び順固定の原則」「スキーマコメントは //.jsonc のみ許可」の3原則を遵守し、スキーマ構文の一貫性を保証する。  
- スキーマ内の `"memo"` フィールドは使用せず、開発者向け注釈は `.jsonc` の `//` コメントで記述する。  
- 構文の厳密さを保ちつつ、コメントによる補足説明を許容することで機械可読性と人間可読性の両立を図る。  
- 本スキーマは `.jsonc`（コメント許可形式）を一次作業フォーマットとする。  
- コメントは仕様思想・設計意図を明文化するためのものであり、構造定義と混在することなく、検証時には除去して `.json` として解釈される。  
- `.jsonc.txt` 形式は LLM による構文＋思想読み取りを補助するための拡張的保存形態である。

### English
- Maintain syntactic consistency by adhering to three core rules:  
  (1) definition of the three-layer structure,  
  (2) fixed property order, and  
  (3) comments allowed **only** within `.jsonc` format.  
- The `"memo"` field shall not be used; developer annotations are written exclusively as `//` comments in `.jsonc`.  
- By allowing commentary while preserving syntactic rigor, the schema achieves a balance between *machine readability* and *human interpretability*.  
- The `.jsonc` format serves as the **primary working format** for schema editing.  
- Comments articulate design rationale and philosophical intent, but are removed prior to validation, yielding a clean `.json` interpretation.  
- The `.jsonc.txt` variant functions as an **extended archival format**, enabling large language models (LLMs) to read both syntax and embedded design philosophy.

---

## 2.4 signification 層の哲学的位置づけ / Philosophical Role of the Signification Layer

### 日本語
- signification 層は “meaning”（外界との接点）と “semantic”（体系内部の構造的意味）を包含する広義の概念層である。  
  - point では外部世界との接続（存在の指示）。  
  - line では内部構造関係（関係の生成）。  
- 両者を共通構造として統一するため、signification を meaning／semantic の上位概念として採用している。  
- これにより、「存在」と「関係」を同一文法上で記述できる構造言語としての整合性を維持する。

### English
- The **signification** layer encompasses both *meaning* (connection to external reality) and *semantic* (internal structural meaning).  
  - Within **point**, it denotes linkage to the external world—*the indication of existence*.  
  - Within **line**, it denotes internal relational structure—*the generation of relations*.  
- To unify these under a common framework, **signification** is positioned as the *superordinate concept* above both *meaning* and *semantic*.  
- This enables the 3DSL schema to describe **existence and relation within a single grammatical framework**, preserving logical coherence as a structural language.

---

## 2.5 補足：設計思想の背景 / Supplementary Notes: Design Rationale

### 日本語
- 3DSS は「構造と言語の交差点」を対象とする。  
  その目的は、単なる3D表現フォーマットではなく、**構造的思考を外化する形式記述法**を確立することにある。  
- スキーマは「枠」を定義し、3DSL コンテンツはその枠の中で自由に展開される。  
- 各層の役割を厳密に分離することにより、**論理的整合性・機械可読性・創造的自由度**の三要素を共存させる。

### English
- The 3DSS addresses the **intersection between structure and language**.  
  Its aim is not merely to define a 3D visualization format,  
  but to establish a **formal descriptive system for externalizing structural thought**.  
- The schema defines the *framework*, while 3DSL contents develop freely within that frame.  
- By rigorously separating the roles of each layer,  
  the schema ensures the coexistence of **logical consistency**, **machine readability**, and **creative freedom**.
---

# 3. Schema Block Overview / 構造ブロック概観

---

## 3.1 ドメイン別責務分離（Domain-Specific Responsibility Segregation）

### 日本語
各構成要素は、役割に応じて階層を分離し、それぞれの責務を明確化する。  
これにより、構造・意味・表示・管理の混在を防ぎ、解析・変換・描画の処理を安定化させる。

| 層 | ファイル内ブロック | 責務 | 含めてよい内容 |
|----|--------------------|------|----------------|
| **管理層（document_meta）** | ルート | 外部管理情報・バージョン・参照 | schema_uri / document_uuid / version / author など |
| **構造層（common）** | 各要素共通 | 構文規範・形式定義 | uuid / tags / memo（構文上の共通属性） |
| **意味層（signification）** | line・aux | 構造間の関係・方向 | relation / sense |
| **表示層（appearance）** | 全要素 | 見た目・表現設定 | marker / color / opacity / shape など |
| **局所管理層（meta）** | 各要素内部 | 局所識別・注釈 | uuid / memo（ローカル識別） |

各層は上から下へ「意味→表現→管理」ではなく、  
**構造（common）→意味（signification）→表示（appearance）→管理（meta）** の順で積層される。

`memo` は構造的意味を持たず、主に図的要素の中で制作者が自由記述を行うためのフィールドである。  
viewer／modeler はこれを単なる文字列として扱う。

### English
Each structural component is assigned to a distinct hierarchical layer according to its functional role.  
This separation prevents the mixing of structure, meaning, presentation, and management, ensuring stable processing for analysis, conversion, and rendering.

| Layer | Schema Block | Responsibility | Permitted Content |
|--------|---------------|----------------|------------------|
| **Management Layer (`document_meta`)** | Root | External management data, versioning, reference info | `schema_uri`, `document_uuid`, `version`, `author`, etc. |
| **Structural Layer (`common`)** | Shared by all elements | Syntactic rules and formal definitions | `uuid`, `tags`, `memo` (shared syntactic attributes) |
| **Semantic Layer (`signification`)** | For `line` / `aux` | Defines inter-structural relations and directions | `relation`, `sense` |
| **Visual Layer (`appearance`)** | All elements | Visual appearance and display settings | `marker`, `color`, `opacity`, `shape`, etc. |
| **Local Management Layer (`meta`)** | Inside each element | Local identification and annotation | `uuid`, `memo` (local identifiers) |

The layers are not ordered by *meaning → presentation → management*,  
but instead by the sequence **common → signification → appearance → meta**,  
representing structure → meaning → appearance → management.

The `memo` field has no structural semantics;  
it is a free-text field for authors’ notes within graphical elements,  
to be treated as a plain string by both viewer and modeler.

---

## 3.2 多言語記述規則 / Multilingual Annotation Rules

### 日本語
'memo' は文字列を基本とし、任意に多言語オブジェクトを許可する。  
`memo` は内容解釈を目的とせず、構造説明・意味定義・スキーマコメントとは一切関係しない。  
LLM・Codex 等の自動生成系もこのフィールドを構造解釈してはならない。

### English
The `memo` field is defined as a string by default,  
but may optionally accept a multilingual object.  
`memo` is **not intended for semantic interpretation** and has no relation to structural definitions,  
semantic explanation, or schema-level comments.  
LLM or Codex-based systems **must not perform structural inference** from the contents of this field.

---

## 3.3 国際化・単位規格 / Internationalization and Unit Standards

### 日本語
#### 設計方針
- **i18n（言語指定）**
  - 言語コードは ISO 639-1 に準拠（例：`ja`, `en`）。  
  - ドキュメント全体の既定言語を示す。  
  - 各要素の多言語化は `memo` 内で実装する。  

### English
#### Design Policy
- **i18n (Language Specification)**  
  - Language codes conform to ISO 639-1 (e.g., `ja`, `en`).  
  - Specifies the default document language.  
  - Per-element multilinguality is implemented within `memo`.

### 日本語
- **units（単位系）**
  - 長さ単位は SI 系を採用（m／cm／mm）。  
  - 非SI単位 `non_si:px` を補助的に使用可能。  
  - 単位変換やスケーリングは viewer 側の責務。  
  - スキーマは値の保持のみ行う。  

### English
- **units (Measurement System)**  
  - Adopt SI units: `m`, `cm`, `mm`.  
  - Allow non-SI supplementary unit `non_si:px`.  
  - Unit conversion and scaling are handled by the viewer,  
    while the schema merely stores the raw values.


### 日本語
- **coordinate_system（座標系／キラリティ）**
  - 座標系は空間の向きとキラリティ（非対称性）を定義。  
  - 基底ベクトルは (X, Y, Z) とし、X×Y = Z の直交系。  
  - 原点 (0, 0, 0) はシーン中心。  
  - viewer / modeler が回転方向や法線向きを解釈する基礎情報。  
  - キラリティは物理的左右差にとどまらず、構造的非可換性（Non-commutativity）や流れの方向性をも示す。  
  - したがって単なる描画オプションではなく、**空間秩序と方向性を定めるメタ属性**である。

### English
- **coordinate_system (Coordinate System / Chirality)**  
  - Defines spatial orientation and chirality (asymmetry).  
  - Basis vectors follow (X, Y, Z) with X×Y = Z forming an orthogonal frame.  
  - The origin (0, 0, 0) represents the scene center.  
  - Provides baseline information for viewer/modeler interpretation of rotation, normals, and inversion.  
  - Chirality expresses not only physical left/right asymmetry but also **structural non-commutativity** and **directionality of flow**.  
  - Therefore, it is treated as a **meta-attribute defining spatial order and orientation**, not a mere rendering option.


### 日本語
#### 設計思想
- 国際化・単位規格は「スキーマを超えて利用環境に接続するための最小限の橋」である。  
- スキーマは型と選択肢のみ定め、表記・変換・多言語処理は外部アプリに委任する。  
- この分離により、3DSS は地域・文化に依存しない中立構造を維持する。

### English
#### Design Philosophy
- Internationalization and unit standards serve as the *minimal bridge* between the schema and external runtime environments.  
- The schema defines only types and enumerations; actual formatting, conversion, and localization are delegated to external applications.  
- This separation allows 3DSS to remain a lightweight, culturally neutral structural system.

### 日本語
#### スキーマ整合
- `document_meta.i18n`: `"enum": ["ja", "en"]`  
- `document_meta.units`: `"enum": ["m", "cm", "mm", "non_si:px"]`  
- `document_meta.coordinate_system`: `"enum": ["X×Y=+Z", "X×Y=-Z"]`

### English
#### Schema Alignment
- `document_meta.i18n`: `"enum": ["ja", "en"]`  
- `document_meta.units`: `"enum": ["m", "cm", "mm", "non_si:px"]`  
- `document_meta.coordinate_system`: `"enum": ["X×Y=+Z", "X×Y=-Z"]`

---

## 3.4 UUID とタグ体系 / UUID and Tag Taxonomy

### 日本語
#### UUID
すべての識別子は UUID v4 を採用し、非重複性により構造要素およびドキュメント全体の一意性を保証する。

| 階層 | フィールド | 役割 |
|------|-------------|------|
| **ドキュメント単位** | `document_meta.document_uuid` | 3DSLコンテンツ全体の識別子。生成時に発行し、不変。 |
| **要素単位** | `meta.uuid` | point／line／aux など各要素の内部識別子。編集・参照・同期の基点。 |

UUID は発行後変更しない。  
Codex／外部参照との整合を維持するため、更新時も固定が原則。

### English
#### UUID
All identifiers adopt **UUID v4**, ensuring non-duplication and global uniqueness across both structural elements and entire documents.

| Level | Field | Role |
|--------|--------|------|
| **Document Level** | `document_meta.document_uuid` | Unique identifier for the entire 3DSL content. Generated upon creation and immutable. |
| **Element Level** | `meta.uuid` | Internal identifier for each element (point, line, aux). Serves as the anchor for editing and referencing |

Once issued, a UUID must never change.  
This immutability preserves consistency with Codex and external reference systems.

### 日本語
#### タグ体系
- タグは単純配列形式： `tags: [string, …]`  
  スキーマ上では型とパターンのみ定義し、構文の簡潔さを優先。  
- 用途は分類・検索に限定（例：`s:` 構造、`m:` 意味、`x:` 管理）。  

| 接頭辞 | 意味 | 用途例 |
|--------|------|--------|
| `s:` | structural | 形状・配置・構造分類 |
| `m:` | meaning | 意味的・文脈的分類 |
| `x:` | administrative | 管理・運用目的 |

将来的にはタグの多言語化・階層化（外部辞書連携）を検討するが、現行スキーマには分類ロジックを内包しない。

### English
#### Tag Taxonomy
- Tags are defined as a simple string array: `tags: [string, …]`.  
  The schema defines only type and pattern, prioritizing syntactic simplicity.  
- Current usage is limited to classification and search.  

| Prefix | Meaning | Example Use |
|---------|----------|-------------|
| `s:` | structural | Shape, position, structural grouping |
| `m:` | meaning | Semantic or contextual grouping |
| `x:` | administrative | Management or operational tagging |

Future expansion may introduce multilingual or hierarchical tags via external dictionaries,  
but classification logic will remain outside the core schema.

### 日本語
#### 設計思想
- **UUID** は構造の絶対座標、**タグ** は意味の相対座標として機能する。  
- 構造的一貫性と文脈的多義性を両立させるため、タグは最小限の正規表現で秩序を保つ。  
- 上位語彙や辞書的管理はスキーマ外で運用する。

### English
#### Design Philosophy
- **UUIDs** act as *absolute coordinates of structure*,  
  while **tags** act as *relative coordinates of meaning*.  
- To balance structural consistency and semantic plurality,  
  tag patterns are minimally regulated through regular expressions.  
- Higher-order vocabularies or taxonomies are managed externally.

### 日本語
#### スキーマ整合
- `document_meta.document_uuid`: UUID v4  
- `meta.uuid`: Required for each element  
- `tags`: `"pattern": "^(s|m|x):[a-z0-9_\\-]+$"`

### English
#### Schema Alignment
- `document_meta.document_uuid`: UUID v4  
- `meta.uuid`: Required for each element  
- `tags`: `"pattern": "^(s|m|x):[a-z0-9_\\-]+$"`

---

## 3.5 signification 層（Signification Layer）

### 日本語：概要
signification 層は、要素間の「意味的関係」を定義する領域である。  
形式上はすべての要素に共通する構文であるが、実装上は主に `line` において意味的関係を担う中核ブロックである。  
構造的接続（`common`）や視覚的表現（`appearance`）とは異なり、**関係そのものを構造的に記述する** ことを目的とする。

### English: Overview
The **signification layer** defines the *semantic relationships* between elements.  
Although syntactically shared across all elements, it functions primarily within the `line` element as the core block responsible for representing semantic relations.  
Unlike **structural connectivity** (`common`) or **visual representation** (`appearance`),  
its purpose is to describe **relations themselves as structural constructs**.

---

### 日本語：二段構成
- **relation**：関係の性質を表す分類。  
  構造上のつながり、因果、論理、時間、メタ参照などの性質を整理するために五分類を採用。  
- **sense**：関係の方向性を示す。  
  A→B（a_to_b）、B→A（b_to_a）、双方向（both）、中立（neutral）の4種。

### English: Two-Level Structure
- **relation** — Defines the *type or nature* of the relationship.  
  Five categories are adopted to systematically distinguish structural, causal, logical, temporal, and meta-referential relationships.  
- **sense** — Indicates the *directionality* of the relationship.  
  Four modes are available: A→B (`a_to_b`), B→A (`b_to_a`), bidirectional (`both`), and neutral (`neutral`).

---

### 日本語
#### 設計思想
- relation の細分化は見た目の差異ではなく、「関係」という抽象概念を構造的に類型化する試みである。  
- viewer 上ではすべて矢印（sense）に還元されるが、3DSS が「構造言語」である以上、  
  関係の型（relation）と方向（sense）を独立定義することが不可欠。  
- relation は五系統：  
  **structural（構造）／dynamic（変化）／logical（論理）／temporal（時間）／meta（参照）**。  
  これは「構造・変化・論理・時間・参照」という思考文脈を反映する。  
- `relation` の default は `meta.reference`、`sense` の default は `neutral`。  
  明示指定がなくとも参照関係を保証し、厳密さと柔軟さを両立させる。

### English
#### Design Philosophy
- The subdivision of `relation` is not for visual differentiation but an effort to **structurally typify the abstract notion of “relation.”**  
- While all relationships are ultimately rendered as arrows (`sense`) in the viewer,  
  a structural language such as 3DSS requires that *type* (`relation`) and *direction* (`sense`) be defined independently.  
- `relation` follows five systems:  
  **structural**, **dynamic**, **logical**, **temporal**, and **meta** (reference).  
  These reflect distinct intellectual contexts—structure, change, logic, time, and reference.  
- Defaults are `meta.reference` for relation and `neutral` for sense,  
  maintaining syntactic rigor while preserving expressive flexibility.

---

### 日本語
#### 設計上の原則
- relation と sense は相互独立。  
- signification は構文層（common）や表示層（appearance）と交差しない。  
- 未指定時のデフォルト動作は `{ "meta": "reference" }` および `"neutral"`。

### English
#### Design Principles
- `relation` and `sense` are mutually independent.  
- The signification layer does not intersect with the **syntactic layer** (`common`) or the **visual layer** (`appearance`).  
- Default behavior for unspecified cases is `{ "meta": "reference" }` and `"neutral"`.

---

### 日本語
#### スキーマ整合
- `line.signification` 以下に `relation`／`sense` の二段構成を保持。  
- relation は五分類構造で定義済。  
→ スキーマ構文と設計思想は完全一致。

### English
#### Schema Alignment
- The `line.signification` node maintains a two-tier structure: `relation` and `sense`.  
- `relation` is formally defined under a five-category taxonomy.  
→ The schema syntax and philosophical intent are in full agreement.

---

### 日本語
#### 備考・運用上の位置づけ
- 現行仕様では signification は構造統一のための中間ノード（整合プレート）として位置づけられる。  
- 実際に意味的関係を定義する主領域は **line** にある。  
- `point`／`aux` における signification は補助的で、名称付与や参照定義などに留まる。  
- したがって、構文上は共通ブロックであっても、**意味論的負荷は line に集中する設計**である。  

補足：この設計は、3DSL における哲学的構造論  
—「関係が動きを生み、点はそれを受ける存在である」—  
を反映している。

### English
#### Remarks and Operational Context
- In the current design, the signification layer acts as an *intermediate harmonizing node* for structural unification.  
- The **line** element is the principal domain for defining concrete semantic relationships.  
- `signification` within `point` or `aux` serves only auxiliary purposes such as naming or reference linkage.  
- Thus, although syntactically common, **semantic load is intentionally concentrated in the line layer**.  

*Note:*  
This reflects the philosophical structure theory of 3DSL:  
*"Relations generate motion, while points exist as receivers of it."*

---

## 3.6 line.appearance の構造 / Structure of line.appearance

### 日本語
#### end_a／end_b
各端点は point 参照（ref）または絶対座標（coord）のいずれかで定義できる。  
既存ノード参照による構造接続を基本としつつ、補助的な線を単独定義できる柔軟性を確保する。  
両端は対称的スキーマ構造を持ち、処理系が一貫したロジックで扱える。

### English
#### end_a / end_b
Each endpoint can be defined either as a **point reference (`ref`)** or an **absolute coordinate (`coord`)**.  
While structural connections via node references are the standard,  
temporary or auxiliary lines may be defined independently for flexibility.  
Both endpoints follow a symmetric schema structure,  
ensuring consistent handling across processing systems.

---

### 日本語
#### type／style
- **type**：幾何的形状（例：bezier, catmullrom）  
- **style**：視覚的描画属性（例：solid, dashed）  
両者は独立したレイヤに属し、type が構造、style が見た目を担当する。  
viewer／modeler は両者を混同してはならない。

### English
#### type / style
- **type** — geometric form (e.g., `bezier`, `catmullrom`)  
- **style** — visual rendering style (e.g., `solid`, `dashed`)  
These belong to distinct layers: `type` defines structure, `style` defines appearance.  
Viewer and modeler implementations must **not conflate** the two.

---

### 日本語
#### arrow
矢印表現は `arrow` オブジェクトで統一管理する。

| フィールド | 型 | 説明 | デフォルト |
|-------------|----|------|-------------|
| placement | string | `"end_a"|"end_b"|"both"|"none"` | `"none"` |
| shape | string | `"cone"|"pyramid"|"line"` | `"cone"` |
| size | number | 矢印全体サイズ（2ⁿ単位推奨） | 16 |
| aspect | number | 長さ／幅比 | 1.0 |
| color | string | 線色を継承。異なる場合のみ指定。 | 継承 |
| offset | number | マーカーとの離隔距離（自動算出可） | auto |
| visible | boolean | 描画有無の明示制御 | true |

- viewer／modeler 双方で共通仕様。  
- marker の大きさに応じて自動オフセットを行い端部干渉を回避する（スキーマ側では定義しない）。

### English
#### arrow
Arrow representations are managed uniformly via the `arrow` object.

| Field | Type | Description | Default |
|--------|------|-------------|----------|
| placement | string | `"end_a"|"end_b"|"both"|"none"` | `"none"` |
| shape | string | `"cone"|"pyramid"|"line"` | `"cone"` |
| size | number | Total arrow size (2ⁿ units recommended) | 16 |
| aspect | number | Length-to-width ratio | 1.0 |
| color | string | Inherits line color unless overridden | inherited |
| offset | number | Distance from marker (auto-calculated) | auto |
| visible | boolean | Explicit control for rendering | true |

- Specification shared by both viewer and modeler.  
- Automatic offset adjustment prevents overlap with markers.  
  (This is runtime logic, not schema-defined.)

---

## 3.7 geometry の扱い / Treatment of Geometry

### 日本語
geometry（幾何構造）は `appearance` の内部概念として扱う。  
現行設計では、形状情報（座標・曲線・寸法など）は `appearance` 直下に配置し、  
独立階層としての geometry は設けない。  
理由：3DSS は「見え方＝形＋質感」を統一的に記述する軽量構造を採用している。  
将来的に形状計算や外部メッシュ連携を拡張する場合のみ、`appearance.geometry` を独立ノードに昇格させる。

### English
`geometry` is treated as an internal concept within `appearance`.  
In the current design, shape-related data (coordinates, curve type, dimensions, etc.)  
reside directly under `appearance`—no separate `geometry` layer is defined.  
Rationale: 3DSS adopts a lightweight representation that unifies *form* and *texture* as a single "appearance."  
Only if extended shape computation or external mesh linkage becomes necessary will  
`appearance.geometry` be promoted to an independent node.

---

## 3.8 memo の哲学的位置づけ / Philosophical Role of memo

### 日本語
`memo` は 3DSL における「構文外注釈領域」である。  
構造上の意味ネットワークには関与せず、作者の思考や意図を残すための自由領域として機能する。  
viewer／modeler／AI生成系はこの内容を解析しない。  
`description` は JSON Schema の慣習的キーワードであり、  
AIツールで誤読される恐れがあるため、3DSS では `memo` に置き換え、構造上の衝突を回避した。

### English
The `memo` field serves as the *extra-syntactic annotation domain* within 3DSL.  
It does not participate in the structural semantic network,  
but provides authors with a safe space to record thoughts or intentions.  
Viewer, modeler, and AI-based systems do not analyze its content.  
Since `"description"` is a conventional JSON Schema keyword that may trigger misinterpretation in AI tools,  
3DSS intentionally replaces it with `"memo"` to avoid structural conflicts.

---

# 4. Naming Rules / 命名規則

---

## 4.1 命名の基本原則 / Fundamental Naming Principles

### 日本語
- ルート階層の meta は `document_meta` とする。  
  - ファイル全体の外的メタ情報（`document_uuid`, `schema_uri`, `version`, `document_tags`, `document_memo` など）を保持する。  
  - ファイル単位の管理情報のみを扱い、内部要素の属性は含めない。  
- 各要素（`point` / `line` / `aux`）の内部には `meta` を配置する。  
  要素固有の `uuid`, `tags`, `memo` を保持し、構造要素のローカル識別および注釈に用いる。  
- `common` は要素間で共通する構文規範を定義するブロックであり、意味的情報や表示属性を含めない。  
  → 「構文ルールと内容情報の分離」が 3DSS 設計の根幹原則である。  
- すべての `enum` 値は **lowercase / snake_case** を原則とし、スクリプト・スキーマ・ドキュメント間の整合性を保つ。

### English
- The root-level meta block is named **`document_meta`**.  
  - It stores external metadata for the entire file, such as `document_uuid`, `schema_uri`, `version`, `document_tags`, and `document_memo`.  
  - It handles document-level management information only; internal element attributes are excluded.  
- Each element (`point` / `line` / `aux`) must include its own **`meta`** block.  
  This contains element-specific identifiers (`uuid`, `tags`, `memo`) for local identification and annotation.  
- **`common`** defines the syntactic rules shared across elements and does not contain semantic or visual properties.  
  → The separation of *syntactic rules* and *content information* is a core design principle of 3DSS.  
- All enumeration values must follow **lowercase / snake_case** formatting to maintain consistency across scripts, schema, and documentation.

---

## 4.2 enum 記述規範 / enum Formatting Standards

### 日本語
- lowercase／snake_case を原則とする。  
  - 例：`meta_reference`, `a_to_b`。  
  - 大文字・CamelCase は禁止。  
- 言語依存語（例：英日混在）は避け、スキーマ上の `enum` 値は常に英語短語で統一する。

### English
- Enumerations must use **lowercase snake_case**.  
  - Example: `meta_reference`, `a_to_b`.  
  - Uppercase or CamelCase forms are prohibited.  
- Avoid language-dependent or mixed-language tokens (e.g., Japanese-English hybrids).  
  All `enum` values must be short English phrases for global consistency.

---

## 4.3 memo の配置原則（Placement Rule for memo）

### 日本語
- `memo` は `signification` や `appearance` に影響を与えない、作者の自由コメント領域である。  
- 各要素（`point`／`line`／`aux`）内の `meta` に統一配置し、構造・意味・描画のいずれにも依存しない。  
- `viewer`／`modeler` はこの内容を解釈せず、必要に応じて表示のみ行う。

### English
- The `memo` field is a **free comment area** for authors and does not affect `signification` or `appearance`.  
- It is consistently located within each element’s `meta` block and remains independent of structure, semantics, or visualization.  
- `viewer` and `modeler` must not interpret its content; they may display it only when needed.

---

# 5. Decision History / 決定履歴

| 日付 | 決定内容 |
|------|-----------|

| Date | Decision |
|------|-----------|

---

# 6. Future Scope / 今後の展望

### 日本語
今後の拡張検討項目：
- relation の再帰構造導入の是非。  
  - 複合関係（A→B→C）を `relation` ノードで再帰的に表現するか。  
- `signification` 層に semantic 軸（`conceptual`／`physical`）を追加する可能性。  
  - 意味的次元を構造記述に反映する試み。  
- `common` と `meta` の交差領域を formal schema でどう表現するか。  
  - 共通属性の二重定義を排除しつつ柔軟性を保持。  
- `document_meta` 拡張フィールド（`license`／`revision` など）の導入。  
  - 外部管理システムとの連携強化を目的とする。

### English
Planned topics for future extension:
- Evaluate the introduction of recursive `relation` structures.  
  - Whether to represent complex relationships (A→B→C) recursively within `relation` nodes.  
- Consider adding a semantic axis (`conceptual` / `physical`) to the `signification` layer.  
  - Aiming to reflect semantic dimensions in structural descriptions.  
- Explore formal schema representations for the intersection between `common` and `meta`.  
  - Prevent redundant definitions of shared attributes while maintaining flexibility.  
- Introduce additional fields to `document_meta` (e.g., `license`, `revision`).  
  - Intended to enhance linkage with external management systems.

---

# 7. Codex Integration Memo / Codex 連携メモ

---

## 7.1 Codex における利用方針 / Usage Policy for Codex

### 日本語
- Codex は本スキーマを最上位定義ファイルとして参照する。  
- `schema_uri` を読み込み、同一リポジトリ内の `3DSS_spec.md` を設計補助文書（Specification Companion）として解析する。  
- Codex 出力時には schema の `enum`／`pattern` を strict reference として適用する。  
- これにより Codex 側の自動コード生成・スキーマ同期精度を保証する。

### English
- Codex treats this schema as the **top-level definition file**.  
- It loads `schema_uri` and parses `3DSS_spec.md` within the same repository as a **Specification Companion**.  
- During code generation, Codex applies all schema `enum` and `pattern` definitions as **strict references**.  
- This guarantees precision in automatic code generation and schema synchronization on the Codex side.

---

## 7.2 将来の Codex 対応拡張 / Future Codex Extensions

### 日本語
- 記述形式：Markdown＋YAML Front Matter 構造を許容し、将来的に multi-language schema 生成（JS／TS／Py）を自動化する基盤とする。  
- スキーマ参照チェーン：Codex は `$id`・`$defs.schema_info` を用いて、スキーマ間の依存・互換関係を自動解析する。

### English
- **Format:** Support Markdown with YAML Front Matter, enabling future automation of multi-language schema generation (JS / TS / Python).  
- **Schema Reference Chain:** Codex will utilize `$id` and `$defs.schema_info` to automatically analyze schema dependencies and compatibility relationships.

---

## 7.3 運用原則 / Operational Principles

### 日本語
- 3DSS は Codex／Viewer／Modeler 間の **唯一の形式的契約（Formal Contract）** である。  
- スキーマの改変は version（Semantic Versioning 2.0.0）を通じてのみ行う。  
- Codex による自動生成／検証は「スキーマは仕様書に従属し、仕様書は哲学に従属する」原則に基づく。  
  これにより、構造・哲学・実装の三者が同一指針で運用される。

### English
- 3DSS serves as the **sole formal contract** among Codex, Viewer, and Modeler.  
- Schema modifications must be conducted only through versioning compliant with **Semantic Versioning 2.0.0**.  
- Codex automation—both generation and validation—operates under the principle that  
  **“the schema follows the specification, and the specification follows philosophy.”**  
  This ensures unified governance across structure, philosophy, and implementation.

---

> **“Philosophy defines the boundary of code.”**  
> — 3DSL Codex Integration Doctrine, 2025
