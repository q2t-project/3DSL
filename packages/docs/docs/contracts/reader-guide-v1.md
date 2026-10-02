# Reader Guide v1 Contract

Status: `APPROVED_BY_ARCHITECTURE_2026 / RBL-103`

Reader Guide is an **external reader-facing contract** paired with a Library item.

```text
model.3dss.json  = structural representation
_meta.json       = publication / provenance / rights / curation
guide.json       = reader interpretation / explanation route
```

Reader Guide is **not part of 3DSS** and does not change the 3DSS v1.1.4 schema.

## 1. Location

For a Library item:

```text
packages/3dss-content/library/<ID>/
├─ model.3dss.json
├─ _meta.json
└─ guide.json
```

A guide is paired by the Library item folder. The guide does not create a second identity system for the represented target.

## 2. Top-level shape

```json
{
  "version": "1.0",
  "orientation": {
    "summary": "このモデルをどう読むか",
    "placement": {
      "meaning": "位置・距離・方向をどう読むか"
    },
    "axes": [],
    "frames": null,
    "scope": "任意",
    "viewpoint": "任意",
    "cautions": []
  },
  "routes": []
}
```

Allowed top-level keys are exactly:
- `version`
- `orientation`
- `routes`

## 3. Orientation

### Required

- `orientation.summary: string`
- `orientation.placement.meaning: string`

The placement meaning may explicitly state that coordinates are only layout and carry no domain metric meaning.

### Optional axes

```json
{
  "axis": "x",
  "label": "制度から実務へ",
  "meaning": "このモデル内での配置基準",
  "unit": "任意"
}
```

- `axis`: `x | y | z`
- `label`: reader-facing label
- `meaning`: model-specific interpretation
- `unit`: optional display text

Every axis entry is model-scoped. An axis label is never a universal 3DSL ontology declaration.

### Optional frames

```json
{
  "meaning": "説明上の段階",
  "target_time_mapping": {
    "mapped": false
  }
}
```

If a model explicitly maps frames to target-world time:

```json
{
  "meaning": "観測年ごとの表示",
  "target_time_mapping": {
    "mapped": true,
    "description": "frame 0=2020, frame 1=2021 ..."
  }
}
```

A step using a `frame` hint requires `orientation.frames` to exist.

### Optional

- `scope: string`
- `viewpoint: string`
- `cautions: string[]`

## 4. Explanation routes

A guide contains at least one route.

```json
{
  "id": "overview",
  "title": "全体から局所へ",
  "summary": "任意",
  "order_semantics": "presentation",
  "steps": []
}
```

### Route order semantics

`order_semantics` is required and one of:

- `presentation` — authored reading order only
- `temporal` — the route intentionally represents temporal order
- `causal` — the route intentionally represents a causal explanatory order
- `other` — another explicitly described order

For `temporal`, `causal`, or `other`, `order_note` is required.

**Route array order is presentation order by default only when explicitly declared `presentation`; array order alone is not target time or causality.**

## 5. Route steps

Every route has one or more steps.

### Whole target

```json
{
  "id": "whole",
  "title": "まず全体を見る",
  "note": "主要なまとまりを確認する",
  "target": { "kind": "whole" },
  "mode": "macro"
}
```

### Element target

```json
{
  "id": "focus-a",
  "title": "Aの局所を見る",
  "note": "Aの近傍関係を確認する",
  "target": {
    "kind": "element",
    "uuid": "11111111-1111-4111-8111-111111111111",
    "element_kind": "points"
  },
  "mode": "micro",
  "frame": 2,
  "view_preset": "iso_ne"
}
```

Fields:
- `id: string` — unique within route
- `title: string`
- `note: string` — optional
- `target`
  - `{kind:"whole"}`, or
  - `{kind:"element", uuid, element_kind}`
- `mode: macro | micro` — optional presentation hint
- `frame: integer[-9999,9999]` — optional presentation hint
- `view_preset: string` — optional presentation hint

`micro` requires an element target.

Reader Guide v1 does not define new Viewer runtime canonical state. The Product Host translates these hints through a later Viewer Bridge contract.

## 6. Hard semantic guards

```text
guide UUID != target-world identity
different guide UUID != target-world difference
guide frame != target-world time unless orientation.frames explicitly maps it
guide axis label != universal 3DSL axis
route order != causal order by default
route order != temporal order by default
view_preset != model semantics
guide validity != model semantic truth
```

UUIDs identify referenced 3DSS document/runtime elements in the paired model. Cross-model or target-world identity requires another explicit mapping/provenance contract.

## 7. Validation layers

### RBL-103 structural validation
Checks:
- shape;
- required fields;
- allowed keys;
- IDs;
- UUID syntax;
- order semantics;
- frame hint requires frame interpretation.

It does **not** check that a UUID exists in the paired model.

### RBL-104 bundle cross-validation
Later checks:
- guide element UUID resolves in paired model;
- `element_kind` matches paired model;
- frame hints are within the model/runtime frame range where applicable;
- stale guide references are distinct from malformed guide JSON.

## 8. Minimal valid example

See:
`packages/3dss-content/fixtures/reader-guide-v1/valid-minimal.json`.

Invalid fixtures document structural rejection cases.

## 9. Versioning

Reader Guide v1 uses:

```json
"version": "1.0"
```

Unknown versions fail closed until an explicit compatibility rule is introduced.

This version contract is independent from 3DSS schema versioning.
