# xls2json (3DSS Excel IO) — fix15

3DSS の **下書き用** Excel テンプレ（.xlsm）と、VBA の Import/Export（JSON ↔ Excel）を同梱します。

- 目的：point/line/aux の主要項目を Excel で編集し、JSON に戻しても **おかしな記録（型崩れ・配列→文字列化など）が下流に流れない** ことを最優先にする
- 方針：スキーマ全項目の網羅は狙わず、**運用で使う頻度が高い項目に寄せる**
- xls2json 周りは **凍結（freeze）**：以後は仕様追加が必要になった時だけ、fix を切って更新する

---

## 同梱物

- `3dss_xlsx_template_v3_fix15.xlsm`  
  Excel テンプレ（points / lines / aux / document_meta / touch_audit / mapping）
- `3dss_xlsx_io_v4_fix15.bas`  
  VBA モジュール（Import/Export 本体）
- `tools/headers_fix15.json`  
  シート列ヘッダ（VBA 側のマッピング用）
- `tools/JsonConverter.bas`  
  VBA-JSON（Tim Hall） ※同梱するが、既存環境に合わせて差し替え可
- `tools/3DSS.schema.json`  
  参照用（AJV 検証に使う場合）
- `tools/validate_3dss_json.py`  
  JSON の簡易チェック用（任意）
- `tools/in.3dss.json`  
  最小サンプル（Import/Export の往復確認用）

---

## セットアップ（Excel 側）

1. `3dss_xlsx_template_v3_fix15.xlsm` を開く
2. VBE（Alt+F11）→ 既存の IO モジュールが入っていたら Remove
3. `3dss_xlsx_io_v4_fix15.bas` を Import
4. `JsonConverter.bas`（VBA-JSON）を Import
5. Debug → Compile VBAProject（コンパイルが通ること）

---

## 使い方

### Import（JSON → Excel）
- マクロ：`Import3DSSJson_Run`
- 既定入力：**xlsm と同じフォルダの** `in.3dss.json`

### Export（Excel → JSON）
- マクロ：`Export3DSSJson_Run`
- 既定出力：**xlsm と同じフォルダの** `out.3dss.json`

> Export は保存ダイアログを出しません（意図しない “Excel保存” を誘発するため）。

---

## シート仕様（要点）

### document_meta
- 1行目=key / 2列目=value の簡易表
- 文字列 / 数値 / true/false / null / JSON（`{...}` or `[...]`）を受け付ける

### points / lines
- 1行目=列キー（スネークケース）
- 4行目以降=データ行
- `tags_json` など `*_json` 列は **JSON を文字で入れる**（例：`["s:p1"]`）

### aux
- A列 `json` に **1行=1要素の生JSON**

### touch_audit
- Export 時に **実際に “変更（touch）した項目” のみ**を追記する
- **warning は記録しない**（下書き用途でノイズになるため）

### mapping
- 列→JSONパスの対応表（テンプレ付属、通常は編集不要）

---

## fix15 の変更点（重要）

### 1) text 系の列を追加
points の marker 用に以下を追加（頻出用途優先）：

- `marker_text_content`
- `marker_text_font`
- `marker_text_size`
- `marker_text_align`
- `marker_text_plane`

### 2) gltf 系の列をテンプレから削除
points から以下を削除：

- `gltf_url`
- `gltf_scale_json`
- `gltf_rotation_json`
- `gltf_offset_json`

理由：出番が少なく、運用では JSON 直編集で十分という判断。

---

## AJV での検証（draft2020）

Ajv v8 系の draft2020 を使う場合、strict 周りで引っかかることがあるため、まずは以下で確認する：

```powershell
npx ajv-cli@5 validate --spec=draft2020 --strict=false -s .\3DSS.schema.json -d .\out.3dss.json --all-errors
```

---

## 掲載用（サイトで “コード紹介” するための体裁）

- この zip は「配布物」というより **実装例（コード紹介）**の体裁で整理している
- 入口はこの README と `3dss_xlsx_io_v4_fix15.bas`（上から読むと全体像が追える）
- 仕様の “SSOT” は 3DSS schema / spec 側で、ここは **IO 実装の一例**に留める

---

## 制約・割り切り

- スキーマ全項目を網羅しない（下書き用途優先）
- `*_json` 列に JSON を入れる場合、Excel の改行・nbsp 等で壊れないように正規化するが、
  **複雑な JSON 編集は外部エディタ推奨**
