# Library Content & Curation Architecture v1

Status: `FROZEN / ARCHITECTURE_2026_V1`

Per-item source package:

```text
packages/3dss-content/library/<id>/
├─ model.3dss.json
├─ _meta.json
├─ guide.json          # optional generally; expected for Release-1 showcase items
├─ content.md
├─ assets/
└─ attachments/
```

## Ownership

- `model.3dss.json`: structural representation.
- `_meta.json`: publication, authors, references, rights, provenance, external links, curation.
- `guide.json`: reader interpretation and explanation routes.
- `content.md`: prose/context.

## Curation rules

- `_meta.recommended` is the single featured/recommended SSOT.
- semantic tags such as `m:top` / `m:default` must not drive homepage curation.
- `published:true` means reader-facing public content, not test-fixture status.
- Release-1 public items must be non-draft, Product-v1 compatible, contextualized, provenance-aware, and Viewer-loadable.
- test/load/sample plumbing does not qualify as a representative public item merely because it is schema-valid.

Legacy `entry_points` may be migrated, but rich reader guidance belongs in `guide.json`.