# Reader Guide Contract v1

Status: `FROZEN / ARCHITECTURE_2026_V1`

Source package:
`packages/3dss-content/library/<id>/guide.json`

Runtime package:
`/_data/library/<id>/guide.json`

Reader Guide v1 is external to 3DSS. It owns reader interpretation and authored routes for one Library item.

## Minimum shape

```text
version
orientation
├─ summary
├─ placement interpretation
├─ axis labels/meanings when applicable
├─ frame interpretation when applicable
├─ scale/scope/viewpoint notes
└─ cautions / unresolved interpretation

routes[]
├─ id
├─ title
├─ summary
└─ steps[]
   ├─ title
   ├─ note
   ├─ target UUID/kind or whole
   ├─ macro/micro hint
   ├─ optional frame
   └─ optional presentation scope/highlight
```

## Hard guards

```text
guide UUID reference != target-world identity
guide frame selection != target-world time unless explicitly stated
guide axis label != universal 3DSL axis
route order != causal/time order by default
```

Reader Guide validation must cross-check referenced UUIDs/frames against the paired model without modifying 3DSS semantics.
