# SSOT_POLICY — 3DSD Modeler（app-local）

## 0. 参照（共通ポリシー）
本アプリの SSOT 統治は、まず共通ポリシーに従う：
- `packages/docs/policy/SSOT_POLICY.md`

本ファイルは modeler 固有の追記のみを書く。

---

## 1. SSOT の範囲（modeler）
- `apps/modeler/ssot/manifest.yaml`：modeler の境界SSOT（layers/ports/checks）
- `apps/modeler/ssot/3DSD-modeler.md`：modeler の Human Spec
- `schemas/**/3DSS.schema.json`：契約SSOT（最上位）

---

## 2. modeler 固有ルール（write-enabled）
- modeler は **write-enabled**：編集・保存・Export を行う
- **Save/Export は strict**：AJV strict validate に落ちたら **必ずブロック**
- **Import/prep は permissive**：原則止めない（fatal は技術的に不可能な場合のみ）
- “痕跡” は IR/sidecar/ログへ隔離し、strict 3DSS（.3dss.json）へ混入させない

---

## 3. Generated
- `apps/modeler/ssot/_generated/**` は直接編集禁止
- 生成物に差分が出たら generator を直す

---

## 3. 公開ルート（bundle base / embed host）
- bundle base: `/modeler/`（`apps/modeler/ssot` を `apps/site/public/modeler/` に mirror）
- embed host: `/app/modeler`（Astro page。layout 隔離のための iframe host）
- 暫定 alias: `/modeler_app/` は `/modeler/` へ寄せるための一時ルート（将来削除）

