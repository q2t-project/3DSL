# xls2json (Excel VBA) — 3DSS Import/Export (fix15)

このフォルダは「下書き用途」の **3DSS JSON ⇄ Excel** 変換を提供する。

- Excel: `3dss_xlsx_template_v3_fix15.xlsm`
- VBA module: `3dss_xlsx_io_v4_fix15.bas`
- JSON converter: `JsonConverter.bas`
- Schema: `3DSS.schema.json`（参照用）

## できること

- `in.3dss.json` を Import → `points / lines / aux / document_meta` に展開
- シートを編集して Export → `out.3dss.json` を生成
- 「表で扱いにくいもの」は `*_json` / `raw_json` に生JSONとして退避（破壊せず温存）

## 設計方針（運用向け）

- **SSOTは JSON**。Excelは編集UI（下書き）で、スキーマ全要素を表で無理に抱えない。
- 表で扱うキーは `mapping` シートで宣言（「どの列が、どの JSON path か」）。
- mappingに無いキー / 変換不能な値は **raw_json に残す**（下流におかしな変形を流さない）。

## Text 表示（marker_text_*）

`points` シートには Text 表示用の列がある（`marker_primitive="text"` のとき主に使用）。

- `marker_text_content` → `appearance.marker.text.content`
- `marker_text_font` → `appearance.marker.text.font`
- `marker_text_size` → `appearance.marker.text.size`
- `marker_text_align` → `appearance.marker.text.align`
- `marker_text_plane` → `appearance.marker.text.plane`

## マクロ呼び出し（DLせず「紹介」用の最小例）

```vb
' Import (既定: ブックと同じフォルダの in.3dss.json)
Public Sub Import3DSSJson_Run()
    Call Import3DSSJson("")
End Sub

' Export (既定: ブックと同じフォルダの out.3dss.json)
Public Sub Export3DSSJson_Run()
    Call Export3DSSJson("")
End Sub

' Export (任意パス)
Public Sub Export3DSSJson_ToPath()
    Call Export3DSSJson("C:\path\to\scene.3dss.json")
End Sub
```

> Excelの SaveAs ダイアログで JSON を狙う運用は事故りやすいので、fix15 では「Export のファイル選択」マクロは同梱しない。
