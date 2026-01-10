# fix14p (round-trip hardening)

## What was fixed
1. **Import cleanup width**
   - `ClearDataRows` now clears across **all header columns** (including hidden detail/debug cols),
     preventing stale template values from leaking into Export when user didn't edit.

2. **JSON cell parsing with CR/LF**
   - Added `NormalizeJsonText` + improved `TryParseJsonToVariant`.
   - `CellToJsonValueAny` / `CellToJsonValue` now normalize CR/LF/TAB/nbsp and retry parsing.
   - Fixes cases like `marker.size` becoming a string `"[
1,
1,
1
]"` instead of an array.

## How to use
- Replace your VBA IO module with `3dss_xlsx_io_v4_fix14p.bas`
- Re-run: Import -> (no edits) -> Export
- Re-generate canon json and diff.

## AJV draft2020-12
Use Ajv2020 engine:

```powershell
npx ajv-cli@5 validate -c ajv/dist/2020 -s .\3DSS.schema.json -d .\out.3dss.json --all-errors
```

## Note
- fix14o had a VBA syntax error due to a stray  line. fix14p removes it.

## Note
- fix14o had a VBA syntax error due to a stray `Private` line. fix14p removes it.
