# 3DSS XLSX Template v2.1 + VBA

## Contents
- `3dss_xlsx_template_v2_1.xlsx` : Excel template (macro-free)
- `3dss_xlsx_io_v2.bas` : VBA module (import/export)
- `JsonConverter.bas` : VBA-JSON (as provided)
- `3DSS.schema.json` : schema reference (as provided)

## Setup (Windows Excel)
1. Open `3dss_xlsx_template_v2_1.xlsx`
2. Save As → **Excel Macro-Enabled Workbook (`.xlsm`)**
3. Press `ALT+F11` to open VBE
4. `File > Import File...`
   - Import `JsonConverter.bas`
   - Import `3dss_xlsx_io_v2.bas`
5. Close VBE

## Usage
- Put `in.3dss.json` in the **same folder** as the workbook.
- Run macro: `Import3DSS_JSON`
- Edit sheets (`points`, `lines`, `aux`, `document_meta`)
- Run macro: `Export3DSS_JSON`
- Output: `out.3dss.json` in the same folder.

## Robustness rules (to avoid silent failures)
- No schema-generated multi-line headers. Column keys are fixed (row1).
- `points`: `x,y,z` are required. Incomplete rows are skipped with warnings.
- `lines`: `end_a` and `end_b` are required (either `*_ref` or full `*_x/y/z`).
- `tags_json` and `frames` accept JSON arrays (e.g. `[1,2]`). `frames` also accepts a single integer.
- Advanced nested fields:
  - `points.marker_json` (full marker object override)
  - `lines.geometry_json` (for polyline/catmullrom/bezier/arc)
  - `lines.arrow_json` (full arrow object override)

## Notes
- `JsonConverter.bas` の `JsonOptions` は固定UDTで、この版には `UseCollection` は存在しない。
  そのため v2.1 では `ParseJson` ラッパから `JsonConverter.JsonOptions.UseCollection = True` を完全に削除。
- The exporter tries to keep the output **schema-valid**. If a row cannot be made valid safely, it is **skipped** and reported.
