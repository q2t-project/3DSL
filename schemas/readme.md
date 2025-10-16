# /schemas/ ― 3D Structural Schema (3DSS) 正典定義層  
# /schemas/ ― Canonical Definition Layer of the 3D Structural Schema (3DSS)

---

## 1. 概要（Purpose）

### 日本語
このディレクトリ `/schemas/` は、  
3DSL（Three-Dimensional Structural Language）全体の**構造定義層（Structural Definition Layer）**を担う中核領域である。  

ここに格納されるスキーマ群は、3DSLの構造・意味・検証のすべてを統一的に定義する。  
特に `3DSS.schema.json` は **唯一の正典スキーマ（canonical schema）** として機能し、  
あらゆるアプリケーション（viewer / modeler / validator / Codex）において  
構造解釈とデータ検証の共通基準となる。

### English
The `/schemas/` directory constitutes the **Structural Definition Layer** of 3DSL (Three-Dimensional Structural Language).  

All schemas contained here collectively define the structure, semantics, and validation logic of 3DSL.  
The file `3DSS.schema.json` serves as the **single canonical schema**,  
providing the unified reference for all applications—viewer, modeler, validator, and Codex alike.

---

## 2. 構成（Structure）

```
/schemas/
 ├─ 3DSS_spec.md                # 人間可読の設計仕様書 / Human-readable specification
 ├─ 3DSS.schema.jsonc.txt       # コメント付き編集版（開発用） / Commented editable draft
 ├─ 3DSS.schema.json            # 正典スキーマ（機械可読） / Canonical schema (machine-readable)
 ├─ samples/                    # スキーマ適合例 / Validation samples
 │   ├─ point_sample.json
 │   └─ structure_demo.json
 ├─ legacy/                     # 旧バージョン保管 / Legacy versions
 │   ├─ 3DSS.schema.v1.0.json
 │   └─ ...
 └─ README.md                   # 本ドキュメント / This document
```

### 日本語
`/schemas/` 配下は上記のように構成される。  
正典スキーマ、編集版、仕様書、サンプル、旧版が階層的に整理され、  
構造定義と履歴管理が一元的に行われる。

### English
The `/schemas/` directory is organized as shown above.  
Canonical schema, editable draft, specification, samples, and legacy versions are hierarchically arranged to maintain unified structural and historical integrity.

---

## 3. 運用方針（Operational Policy）

### 日本語
- `/schemas/3DSS.schema.json` を**唯一の正典**とする。  
- 要素別スキーマ（Point, Line, Aux 等）は `$defs` 内に統合し、個別ファイル化しない。  
- 編集は `.jsonc.txt` 上で行い、コメント除去スクリプトで `.json` に変換する。  
- `.json` ファイルを直接編集してはならない。  

#### バージョン管理
- `$schema_version` と Git タグで追跡する。  
- バージョン更新規則：

| 変更内容 | version例 |
|-----------|-----------|
| 構文・文書修正 | 1.0.1 |
| enum追加など後方互換拡張 | 1.1.0 |
| 構造変更・非互換更新 | 2.0.0 |

- 旧版は `/schemas/legacy/` に退避し、参照禁止。

### English
- The file `/schemas/3DSS.schema.json` is treated as the **only canonical schema**.  
- Element-specific schemas (e.g., Point, Line, Aux) must be consolidated under `$defs`; no independent schema files.  
- Editing must be performed on `.jsonc.txt`; a script strips comments to produce `.json`.  
- Direct modification of `.json` is prohibited.  

#### Version Management
- Track changes via `$schema_version` field and Git tags.  
- Version update rules:

| Change Type | Example |
|--------------|----------|
| Syntax or description fix | 1.0.1 |
| Backward-compatible extension | 1.1.0 |
| Breaking structural change | 2.0.0 |

- Older versions reside in `/schemas/legacy/` and are read-only.

---

## 4. 思想的背景（Philosophical Foundation）

### 日本語
#### 正典一元の原理（Canonical Unity）
構造定義は単一の正典に統合されねばならない。  
分割スキーマの乱立は同期破綻を生み、整合を損なう。  

#### 構造可視性の理念（Structural Transparency）  
JSON Schemaは構造のための言語であり、  
仕様書（`3DSS_spec.md`）とスキーマ（`.schema.json`）を隣接させることで  
意味と形式を往還可能にする。  

#### 再現可能性の原理（Reproducibility）  
どの環境でも同じスキーマを読み取れば同じ構造解釈を得る。  
この再現性が3DSLの科学的・文化的価値の核である。  

#### 実装分離の原則（Purity Principle）  
`/schemas/` は実装層から独立した構造言語層である。  
アプリ側のバリデータ実装やロジックは `/code/validator/` に留め、  
スキーマには依存コードを混入させない。  

### English
#### Canonical Unity
All structural definitions must converge into a single canonical schema.  
Fragmented partial schemas inevitably lead to desynchronization and inconsistency.  

#### Structural Transparency  
JSON Schema functions as a language of structure.  
Placing the specification (`3DSS_spec.md`) beside the schema (`.schema.json`)  
allows seamless traversal between *meaning* and *form*.  

#### Reproducibility  
Reading the same schema in any environment must yield the same structural interpretation.  
Such reproducibility underpins the scientific and cultural integrity of 3DSL.  

#### Purity Principle  
`/schemas/` exists as a language layer independent of implementation.  
Validation logic resides in `/code/validator/`;  
no executable dependencies shall be embedded within the schema itself.

---

## 5. 参照方式（$id と $ref） / Reference Convention

### 日本語
- 開発時は相対パス参照：  
  ```json
  "$id": "./3DSS.schema.json"
  ```
- 公開時は絶対URL付与：  
  ```json
  "$id": "https://q2t-project.github.io/3DSL/schemas/3DSS.schema.json"
  ```
- `$ref` は `$defs` 内部参照に限定し、外部参照は禁止。  

### English
- Use relative paths during development:  
  ```json
  "$id": "./3DSS.schema.json"
  ```
- Use absolute URLs for public distribution:  
  ```json
  "$id": "https://q2t-project.github.io/3DSL/schemas/3DSS.schema.json"
  ```
- `$ref` should reference only internal `$defs`; external references are disallowed.

---

## 6. Codex運用指針（For Codex and Automated Systems）

### 日本語
Codexは `/schemas/README.md` を**前提文書（precondition document）**として扱う。  
- 編集対象は `3DSS.schema.json` のみ。  
- 他ファイル（spec, legacy等）を自動生成・上書きしてはならない。  
- 要素別スキーマを独立生成してはならない。  
- `/schemas/legacy/` は読み取り専用。  

### English
Codex treats `/schemas/README.md` as a **precondition document**.  
- Only `3DSS.schema.json` may be edited or regenerated.  
- No automatic creation or overwrite of `spec` or `legacy` files.  
- Never generate element-specific schemas independently.  
- `/schemas/legacy/` is read-only.

---

## 7. 同期原則（Synchronization Principle）

### 日本語
スキーマ更新後、各層は以下の同期責任を持つ。

| 対象層 | 操作 |
|---------|------|
| validator | 新スキーマによる再検証 |
| modeler | UI仕様の再生成 |
| viewer | 表示構造の整合確認 |
| plans / meta | スキーマ改訂の記録と設定更新 |

この手順を経ずに差し替えた場合、整合性保証は失われる。

### English
After any schema update, each layer bears synchronization responsibility:

| Layer | Required Action |
|--------|-----------------|
| validator | Re-validate using the new schema |
| modeler | Regenerate UI definitions based on updated fields |
| viewer | Verify visual structure consistency |
| plans / meta | Record revision and update Codex settings |

Skipping this procedure nullifies integrity guarantees.

---

## 8. 変更履歴（Revision Notes）

| バージョン | 日付 | 概要 |
|-------------|------|------|
| 1.0.0 | 2025-10 | 初版確定：schemas層の構成・思想・運用方針を正式定義。 |

| Version | Date | Summary |
|----------|------|---------|
| 1.0.0 | Oct-2025 | First edition finalized: formal definition of structure, philosophy, and operational policy for the schemas layer. |

---

## 9. 要約（Summary）

### 日本語
- `/schemas/` は 3DSL の構造定義層であり、構造と言語を結ぶ中核点である。  
- `3DSS.schema.json` は唯一の正典。  
- 本READMEは後代への思想記録であると同時に、Codexの操作条件文書でもある。  

### English
- `/schemas/` represents the Structural Definition Layer of 3DSL—the nexus between structure and language.  
- `3DSS.schema.json` is the sole canonical schema.  
- This README serves both as a philosophical record for future generations and as a procedural constraint for Codex operations.  

---

> **“Structure is the grammar of meaning.”**  
> — 3DSL Project Doctrine, 2025
