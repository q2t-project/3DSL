# RMAP STEP 11 — Explanation Route + Reader Orientation Slice

Status: `STEP11_EXPLANATION_ROUTE_AND_READER_ORIENTATION_SLICE_PASS`

Parent:
`STEP11_FOUNDATION_SLICE_PASS`

Backlog parent:
`RMAP_BL_01_COMPLETE_WITH_RELEASE1_READER_CRITICAL_PATH_AND_STEP11_READY`

## Purpose

Close the first major reader-facing gap after the Foundation slice:

```text
Library context
→ authored explanation route
→ canonical /app/viewer
→ whole / local orientation
→ guided focus
→ return to whole
```

The route is optional. Free exploration remains valid.

## Architecture

### Route SSOT

Reader guidance lives in:

`packages/3dss-content/library/<ID>/_meta.json#entry_points`

The generated `library_index.json` contract is bumped to `version: 5` because `entry_points` now has a defined route-object shape.

It does not live in 3DSS and does not redefine the model.

Each route contains ordered steps:
- `overview`
- `focus` on an existing UUID in the same model.

### Product host

`/app/viewer` owns:
- loading the Library guide;
- showing route label / step / note;
- showing reader orientation (`全体` or `局所 · <label>`);
- Prev / Next / Whole controls.

Guide/route query parameters are host-only and are not forwarded to `/viewer/index.html`.

### Inner Viewer

The Viewer exposes a narrow reader facade through the existing hub boundary:

- focus existing UUID;
- return to macro/whole;
- read mode + current selection label.

No core state is written directly by the product host.

## First end-to-end route

Library item:
`26010501 / 3DSL Concept`

Route:
`first-read`

Path:

```text
overview
→ 表現の限界と要請
→ 3DSL
→ 全体フレームを先に外部化
→ 理解を復元→ナビゲーションへ
→ 宣言
→ overview
```

All focus targets are existing UUIDs in the same model.

## Validation

- `check-library.mjs` validates route shape and target UUID/kind.
- `check:reader-guidance` guards the end-to-end contract.
- `check:reader-guidance` is part of release and CI build gates.

## Non-scope

- 3DSS schema changes.
- generic story/tour semantics inside 3DSS.
- automatic semantic interpretation of UUIDs.
- target-world temporal meaning from route order.
- Library-wide curation cleanup.
- `pairs` / related-content comparison UI.
- Premium.
- Modeler feature work.
- PR #52/#53/#54 integration.

## Acceptance

1. Library route can be authored outside 3DSS.
2. Invalid focus UUID/kind fails validation.
3. Library detail exposes a guided Viewer entry.
4. /app/viewer keeps guide state outside inner runtime query.
5. Reader sees whole/local orientation during guided or free exploration.
6. Next/Prev can focus real model elements.
7. Whole returns to Viewer macro state.
8. Free exploration works without any route.
9. CI/release checks fail on contract regression.
10. No schema change.

Verification result:

```yaml
CI_workflow: CI
CI_run_number: 346
CI_run_id: 36966531295
result: SUCCESS
checked:
  - product foundation
  - Library route validation
  - reader-guidance contract
  - Viewer/Modeler SSOT guards
  - Viewer regression
  - canonical 3DSS validation
  - Astro build
```

Closure:
`STEP11_EXPLANATION_ROUTE_AND_READER_ORIENTATION_SLICE_PASS`

This PASS is an implementation/contract/build result. It does not claim a separate human visual-UX effectiveness study.
