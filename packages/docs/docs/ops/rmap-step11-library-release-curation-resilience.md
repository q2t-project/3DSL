# RMAP STEP 11 — Library Release Curation + Resilience Slice

Status: `IMPLEMENTED / CI_PENDING / HUMAN_REVIEW_REQUIRED`

Parent:
`STEP11_EXPLANATION_ROUTE_AND_READER_ORIENTATION_SLICE_PASS`

Backlog parent:
`RMAP_BL_01_COMPLETE_WITH_RELEASE1_READER_CRITICAL_PATH_AND_STEP11_READY`

## Purpose

Close two Release 1 gaps together:

1. the public Library must show a deliberately curated representative set rather than every published fixture/sample;
2. a missing or malformed generated Library index must degrade to an empty/unavailable state instead of throwing the whole Library route.

## Curation architecture

Publication and Release 1 exposure are separate:

```text
published:true
→ keep detail route / direct URL

release1.included:true
AND hidden != true
→ Release 1 Library list / Home featured surface
```

Release 1 metadata lives in `_meta.json.release1`, outside 3DSS.

Core capability vocabulary:

- `whole-local`
- `placement-comparison`
- `diagram-connection`
- `explanation-route`

CI requires the curated set to cover all four and to contain at least one `recommended:true` item.

## Release 1 set in this slice

Included:

- `26010501 / 3DSL Concept`
  - role: `core-entry`
  - capabilities: `whole-local`, `diagram-connection`, `explanation-route`
  - recommended
- `26012201 / 構造と分類`
  - role: `representative`
  - capability: `placement-comparison`

Retained by direct published URL but excluded from the Release 1 reader surface:

- `26012001`: reader framing / provenance ledger incomplete
- `26012101`: performance/load-test fixture
- `26012301`: legacy fixed-axis framing conflicts with Product Definition v1
- `26012801`: draft/empty model
- `26020401`: Library folder/plumbing sample

Unpublished drafts remain unpublished.

## Reader surface behavior

- Home featured cards use the Release 1 curation ledger, not `m:top/m:default` heuristics.
- `/library` lists only Release 1 visible items.
- excluded-but-published detail routes remain available for old links.
- excluded detail routes receive `robots=noindex,follow`.
- sitemap includes only Release 1 visible Library details.
- internal `/viewer/` runtime route is not a public sitemap entry; `/app/viewer` remains canonical.

## Resilience

`libraryIndex.ts` no longer throws for:

- missing index;
- invalid JSON;
- invalid index shape.

Instead it returns a typed degraded state and an empty item set.

`/library` stays renderable and displays a reader-facing unavailable/empty state.

Home receives an empty featured set safely if the index is unavailable.

## Validation

- `check-library.mjs` validates explicit Release 1 inclusion/exclusion and capability coverage.
- `library-curation-resilience.mjs` tests parser failure modes and generated-index curation.
- the new check is part of `check:ssot`, therefore CI build/release gates.

## Non-scope

- rewriting excluded Library models;
- inventing missing provenance;
- deleting old published URLs;
- 3DSS schema change;
- Premium;
- Modeler features;
- reader-comprehension effectiveness claims.

## Acceptance

1. Every published Library item explicitly declares Release 1 inclusion/exclusion.
2. Release 1 visible items are not hidden and have non-empty summaries/capability labels.
3. Release 1 covers all four core product capabilities.
4. At least one Release 1 item is recommended.
5. Stress/draft/sample/legacy fixed-axis items are absent from Home and Library list.
6. Old published detail URLs remain buildable.
7. Excluded details are noindex and absent from sitemap.
8. Missing/invalid Library index no longer throws from shared reader helpers.
9. Library renders a degraded/empty state.
10. CI guards the contract.
11. No schema change.

Formal closure is withheld until CI passes and human acceptance is given.
