# タスク概要

3DSL プロジェクトの JSON Schema `schemas/3DSS.schema.json` v1.0.0 に **完全準拠**した
サンプル構造データ `core_viewer_baseline.3dss.json` を新規作成してほしい。

このファイルは Phase 0 [C-0-2] で定義した

- viewer の UI/UX 評価用の「基準サンプル」
- 「同じ .3dss.json を食わせたら viewer は毎回同じ表示になる」ことを保証する共通テストデータ

として使う。

出力先はリポジトリ内の次のパスとする：

- `/data/sample/core_viewer_baseline.3dss.json`

---

# 入力として参照すべきファイル

- `schemas/3DSS.schema.json`（必須）
- `docs/3DSS_spec.md`（存在する場合）
- `docs/3DSD-common.md`（存在する場合）

これらを読んで、「どのプロパティが必須か」「enum の候補」「追加プロパティ可否」などを **スキーマをソース・オブ・トゥルースとして**決定すること。

---

# 絶対条件（バリデーション）

1. `schemas/3DSS.schema.json` v1.0.0 で AJV 検証を通すこと。
   - `ajv` / `ajv-formats` など、プロジェクトで標準的に使っている方法で良い。
   - `required` に指定されているプロパティは **一つも落とさない**。
   - `additionalProperties: false` なオブジェクトには、スキーマに定義のないプロパティを絶対に足さない。

2. `lines` / `points` / `aux` / `document_meta` の 4 要素をトップレベルに含めること。
   - トップレベルのキー名は **スキーマ定義通り**にする（綴りや大文字小文字も厳密に合わせること）。
   - インスタンス側で `$schema` や `$id` を付けるかどうかは、スキーマ＆仕様書の方針に合わせる。  
     （スキーマが要求していないなら省略可。）

3. enum / const 等の値は、**必ずスキーマの定義から引くこと**。
   - 例：`signification.relation.structural` / `dynamic` / `logical` / `temporal` の値、
     `appearance.line_type` / `line_style` / `arrow.shape` / `arrow.placement` / `effect.effect_type` / `effect.easing` など。
   - 自分で新しい文字列値をでっち上げないこと。

---

# データ内容の要求仕様（コア構造）

## 1. points

points は最低限、次のような「空間理解用セット」を持つこと：

- 原点と軸
  - `P_ORIGIN`: (0, 0, 0)
  - `P_X_POS`: (1, 0, 0)
  - `P_Y_POS`: (0, 1, 0)
  - `P_Z_POS`: (0, 0, 1)

- 平面・奥行き確認用
  - `P_PLANE_A`: (1, 1, 0)
  - `P_PLANE_B`: (-1, 1, 0)
  - `P_DEPTH`: (0, 0, 2)

各 point にはスキーマで必須になっているプロパティ（`id` / `name` / `position` / `appearance` / `meta` / `uuid` など）があれば全て含めること。
何が必須かは `3DSS.schema.json` の該当節（points の items）を確認して判断する。

position の数値は double 等の許容範囲に収まる普通の実数でよい。

## 2. lines

lines は少なくとも次を含むこと：

1. 軸を表現する線
   - `L_X_AXIS`: `P_ORIGIN` → `P_X_POS`
   - `L_Y_AXIS`: `P_ORIGIN` → `P_Y_POS`
   - `L_Z_AXIS`: `P_ORIGIN` → `P_Z_POS`

2. XY 平面上の三角形
   - `L_TRI_A`: `P_ORIGIN` → `P_PLANE_A`
   - `L_TRI_B`: `P_PLANE_A` → `P_PLANE_B`
   - `L_TRI_C`: `P_PLANE_B` → `P_ORIGIN`

3. 奥行きライン
   - `L_DEPTH`: `P_ORIGIN` → `P_DEPTH`

それぞれの line について：

- 両端は既存の point の ID を参照すること（孤立した ID を作らない）。
- `signification.relation.*` の各カテゴリに、できるだけ代表値が含まれるように割り当てる。
  - 例：ある線には `structural`、別の線には `dynamic`、別には `logical` / `temporal` など、enum の代表を一通り使う。
- `sense` / `appearance.line_type` / `appearance.line_style` / `appearance.arrow.*` / `appearance.effect.*` など、
  スキーマで用意されている代表的な enum を 1 本以上ずつ使うようにする。

必須プロパティ（`id` / `name` / `end_a` / `end_b` / `signification` / `appearance` / `meta` など）は
`3DSS.schema.json` に従って一切省略しないこと。

## 3. aux

aux には最低次の 2 要素を含めること：

1. 床グリッド（floor grid）
   - `A_GRID_FLOOR`
   - XY 平面上に 10×10 程度の grid を表現する。
   - `module.type` / `module.plane` / `module.size` / `module.step` 等、
     grid 用にスキーマで定義されているプロパティを全て正規の形で設定する。

2. 軸ギズモ（axis gizmo）
   - `A_AXIS_GIZMO`
   - 原点近くもしくは画面端に小さな XYZ 軸を表すオブジェクト。
   - `module.type = "axis"` に相当する値を使い、サイズ用のプロパティがあれば適切な値を入れる。

もし `plate` や `shell` 用の module 定義がスキーマに存在するなら、
余力があれば 1 要素追加しても良い。ただしスキーマ定義に厳密に従うこと。

---

# フレーム仕様（document_meta.frames / appearance.frames）

## 1. document_meta

`document_meta` には最低限次を含めること（他にもスキーマ必須項目があれば全て含める）：

- `title`: `"core_viewer_baseline"`
- `description`: viewer UI/UX 評価用サンプルであることがわかる短い説明
- `author`: プロジェクト名など
- `created_at`: ISO8601 形式の日付文字列（例：`"2025-11-17T00:00:00Z"`）
- `frames`: フレーム定義の配列

`frames` の内容は例えば次の 4 つにすること（ID は int、name/description は自由に和文でよい）：

- id: 0, name: "base",          description: "全要素表示"
- id: 1, name: "axes_only",     description: "軸と原点のみ"
- id: 2, name: "triangle_focus",description: "XY 平面上の三角形を強調"
- id: 3, name: "depth_focus",   description: "奥行きラインを強調"

最終的なキー名や構造は `3DSS.schema.json` の `document_meta.frames` 定義に合わせること。

## 2. appearance.frames

各 `points` / `lines` / `aux` の `appearance` 側にフレーム対応を設定すること。

- 原則として、`appearance.frames` など、スキーマで定義されている
  「どの frame でどう見えるか」を指定するプロパティを使う。
- 少なくとも以下を満たすこと：

  - frame 0 (`base`): 全ての point / line / aux が visible
  - frame 1 (`axes_only`):
    - 原点 + 軸ライン + 床グリッドのみ visible
    - 三角形ラインや depth ラインは非表示（もしくは alpha=0 等）
  - frame 2 (`triangle_focus`):
    - 三角形ラインとそれに関係する points を強調表示（色や太さを変えるなど）
  - frame 3 (`depth_focus`):
    - `L_DEPTH` と `P_DEPTH` を強調表示

具体的なプロパティ名（`frames` / `frame_ids` / `visible_in_frames` 等）は
スキーマ定義に合わせて選び、**存在しないプロパティ名を勝手に作らないこと**。

---

# メタな制約・命名・整合性

- すべての `id` はユニークで、`lines` から参照している `end_a` / `end_b` は必ず既存の `points.id` と一致させること。
- もしスキーマ上 `uuid` や `meta.uuid` が要求されているなら、各要素ごとに生成して設定すること。
- 文字列は原則として UTF-8 で、`name` / `description` には日本語と英語が混在していてもよい（3DSS が許容している範囲で）。
- viewer / modeler 専用の一時的フィールド（`temp_*` や `prep_*` 的なもの）は **一切入れない**。
  あくまで「純粋な 3DSS インスタンス」として完結させること。

---

# 仕上げ手順（Codex 側でやってほしいこと）

1. `schemas/3DSS.schema.json` を読み込み、AJV でバリデーション環境をセットアップする。
2. 上記仕様に従って `core_viewer_baseline.3dss.json` の内容を構築する。
   - 構築時は、必須プロパティ一覧を常にスキーマから参照し、抜け漏れがないか確認する。
3. AJV で `core_viewer_baseline.3dss.json` を検証し、エラーが 0 件になるまで修正する。
4. 最終的な JSON を **整形済み (indent=2 など)** で `/data/sample/core_viewer_baseline.3dss.json` に保存する。
5. 検証ログ（成功したこと・使ったコマンド）を簡単にメモとして残す（必要なら `logs/runtime/common/` 等、プロジェクトの方針に合わせる）。

この手順と条件をすべて満たしたうえで、`core_viewer_baseline.3dss.json` を完成させてほしい。