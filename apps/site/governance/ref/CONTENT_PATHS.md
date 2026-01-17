# 3DSS Content Paths (SSOT ↔ public)

## SSOT (source of truth)

- Sample
  - `packages/3dss-content/sample/*.3dss.json`
- Canonical
  - valid: `packages/3dss-content/canonical/valid/*.3dss.json`
  - invalid: `packages/3dss-content/canonical/invalid/*.3dss.json`

※ このリポジトリ構造では `canonical/fixtures/contents` は存在しません。

### Windows example (absolute paths)

- SSOT (authoritative)
  - sample
    - `C:\Users\vrrrm\projects\3DSL\packages\3dss-content\scenes\default/default.3dss.json`
  - canonical
    - valid
      - `C:\Users\vrrrm\projects\3DSL\packages\3dss-content\canonical\valid\sample02_mixed_basic.3dss.json`
    - invalid
      - `C:\Users\vrrrm\projects\3DSL\packages\3dss-content\canonical\invalid\sample02_bad_uuid.3dss.json`

- Public mirror (served from http://.../3dss/**)
  - sample
    - `C:\Users\vrrrm\projects\3DSL\apps\site\public\3dss\sample\3dsl_concept.3dss.json`
  - canonical
    - valid
      - `C:\Users\vrrrm\projects\3DSL\apps\site\public\3dss\canonical\valid\sample02_mixed_basic.3dss.json`
    - invalid
      - `C:\Users\vrrrm\projects\3DSL\apps\site\public\3dss\canonical\invalid\sample02_bad_uuid.3dss.json`

## public (served by the Astro site)

- `apps/site/public/3dss/...`
  - served as `/3dss/...`

## Viewer URL

- Site container: `/app/viewer?model=/3dss/scenes/viewer/viewer.3dss.json`
- Viewer runtime: `/viewer?model=/3dss/scenes/viewer/viewer.3dss.json`

## Sync (PowerShell robocopy examples)

```powershell
# sample
robocopy "..\..\packages\3dss-content\sample" \
         "...\apps\site\public\3dss\sample" \
         *.3dss.json /MIR

# canonical (valid/invalid)
robocopy "..\..\packages\3dss-content\canonical\valid" \
         "...\apps\site\public\3dss\canonical\valid" \
         *.3dss.json /MIR

robocopy "..\..\packages\3dss-content\canonical\invalid" \
         "...\apps\site\public\3dss\canonical\invalid" \
         *.3dss.json /MIR
```
