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

## JSON contract

```json
{
  "version": "1.0",
  "orientation": {
    "summary": "What the reader should orient to first.",
    "placement": {
      "meaning": "What position/proximity means in this model."
    },
    "axes": [
      {
        "axis": "x",
        "label": "Model-specific label",
        "meaning": "Model-specific interpretation",
        "unit": "optional"
      }
    ],
    "frames": {
      "meaning": "What frame switching presents.",
      "target_time_mapping": {
        "mapped": false,
        "description": "Required only when mapped=true."
      }
    },
    "scope": "Optional scale/scope note.",
    "viewpoint": "Optional viewpoint note.",
    "cautions": ["Unresolved or easily over-read interpretation."]
  },
  "routes": [
    {
      "id": "overview",
      "title": "Overview",
      "summary": "Optional route summary.",
      "order_semantics": "presentation",
      "steps": [
        {
          "id": "whole",
          "title": "Start with the whole",
          "target": { "kind": "whole" },
          "mode": "macro"
        },
        {
          "id": "focus-a",
          "title": "Inspect A",
          "target": {
            "kind": "element",
            "uuid": "<3DSS element UUID>",
            "element_kind": "points"
          },
          "mode": "micro",
          "frame": 2,
          "view_preset": "optional-name",
          "scope": {
            "include_uuids": ["<UUID>"],
            "highlight_uuids": ["<UUID>"]
          }
        }
      ]
    }
  ]
}
```

`order_semantics` is one of:
- `presentation`
- `temporal`
- `causal`
- `other`

For `temporal`, `causal`, or `other`, `order_note` is required so route order is not silently over-interpreted.

## Bundle validation

When `guide.json` exists:
1. validate Reader Guide v1 structure;
2. resolve every element/scope UUID against the paired `model.3dss.json`;
3. verify declared element kind against the model;
4. verify frame hints are within the model runtime frame range;
5. fail the Library build/check on stale references.

The validator does not infer target-world identity or target-world time from successful reference resolution.