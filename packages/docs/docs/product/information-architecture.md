# 3DSL Information Architecture v1

Status: `APPROVED / PRODUCT_DEFINITION_V1`

## Product-level IA

```text
3DSL
├─ Home / Concept entry
├─ Library
│  ├─ Free diagrams
│  └─ Premium diagrams
├─ Viewer
├─ Learn
│  ├─ What is 3DSL?
│  ├─ How to read a diagram
│  ├─ 3DSS specification
│  └─ Documentation / FAQ
├─ Modeler
│  └─ creator path (later priority)
└─ Premium
   └─ deeper paid content / access
```

## Navigation priority

Primary:
1. Explore Library
2. Open Viewer example

Secondary:
3. Learn what 3DSL is
4. Read documentation

Later:
5. Create with Modeler

## Viewer information layers

A Viewer experience should distinguish:
- orientation: where am I in the whole?
- focus: what element/region am I examining?
- relation: what connects it to other parts?
- local structure: what happens inside?
- scale/scope/viewpoint: what has changed in the current view?
- source/context: what is this representation based on?

These need not all be on screen at once.

## Boundary

Product IA must not expose implementation concepts such as runtime indexes, schema internals or SSOT mechanics as primary navigation.
