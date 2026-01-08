```md
# 3DSS Library item format

Each library item lives under:

```
packages/3dss-content/library/<ID>/
```

## ID

- Format: `YYMMDDxx` (8 chars)
  - `YYMMDD` = date prefix
  - `xx` = base36 suffix (`0-9a-z`)
  - examples: `26010501`, `2601080a`

## Required files

Each item folder must contain:

- `_meta.json` (editorial + SEO metadata)
- `model.3dss.json` (3DSS content)

Optional files (recommended):

- `thumb.webp` (card thumb / OGP fallback)

## `_meta.json`

### Minimal keys (staged policy)

The following keys are treated as **minimal operational keys**.
The checker supports **staged introduction**:

- Phase 1: report as **warnings** (default)
- Phase 2: treat as **errors** (`--policy=error` / CI)

Minimal keys:

- `title`: string
- `summary`: string
- `tags`: string[]
- `published`: boolean
- `created_at`: string (date-ish)
- `updated_at`: string (date-ish)

Recommended:

- `description`: string (long summary / SEO)
- `seo`: object (overrides)
  - `seo.title`: string
  - `seo.description`: string
  - `seo.og_image`: string (path or URL)
- `entry_points`: any[] (reserved)
- `pairs`: any[] (reserved)
- `rights`: any (reserved)
- `related`: any[] (reserved)

### Check command

Default (Phase 1 / warn):

```
node packages/3dss-content/scripts/check-library.mjs
```

Strict (Phase 2 / error):

```
node packages/3dss-content/scripts/check-library.mjs --policy=error
```

or via env:

```
LIBRARY_META_POLICY=error node packages/3dss-content/scripts/check-library.mjs
```

PowerShell:

```ps1
$env:LIBRARY_META_POLICY = "error"
node packages/3dss-content/scripts/check-library.mjs
Remove-Item Env:LIBRARY_META_POLICY
```

Note:

- When policy=error, items with `published: false` still downgrade **minimal-key** violations to warnings.

## Viewer link convention

Canonical query:

- `/viewer/index.html?model=<url-to-model.3dss.json>`

Notes:

- Site wrapper uses `/app/viewer?model=...` and passes it through to the viewer.
- `open=` may exist for backward compatibility, but `model=` is canonical.
```
