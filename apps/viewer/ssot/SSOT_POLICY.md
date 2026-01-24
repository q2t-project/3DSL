# SSOT_POLICY — 3DSD Viewer（app-local）

## 0. 参照（共通ポリシー）
本アプリの SSOT 統治は、まず共通ポリシーに従う：
- `packages/docs/policy/SSOT_POLICY.md`

本ファイルは viewer 固有の追記のみを書く。

---

## 1. SSOT の範囲（viewer）
- `apps/viewer/ssot/manifest.yaml`：viewer の境界SSOT（layers/ports/checks）
- `apps/viewer/ssot/3DSD-viewer.md`：viewer の Human Spec
- `schemas/**/3DSS.schema.json`：契約SSOT（最上位）

---

## 2. viewer 固有ルール（read-only）
- viewer は **read-only**：入力の 3DSS（.3dss.json）を **絶対に変更しない**
- Import は permissive でもよいが、出力（保存）機能は持たない（または 3DSS を改変しない）

---

## 3. Generated
- `apps/viewer/ssot/_generated/**` は直接編集禁止
- 生成物に差分が出たら generator を直す
