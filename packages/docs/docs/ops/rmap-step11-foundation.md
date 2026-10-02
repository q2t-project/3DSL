# RMAP STEP 11 — Foundation Slice

Status: `IMPLEMENTED_PENDING_CI`

Parent:
`RMAP_BL_01_COMPLETE_WITH_RELEASE1_READER_CRITICAL_PATH_AND_STEP11_READY`

## Purpose

Before adding reader-facing explanation/orientation behavior, make the Release 1 product contract repository-canonical and remove ambiguity in the public Viewer entry.

## Scope

1. Canonicalize approved Product Definition v1 under:
   `packages/docs/docs/product/**`
2. Align Home and Concept with:
   - whole-preserving knowledge exploration;
   - Reader / Explorer first;
   - 3D as conditional structural value;
   - no universal semantic axes claim.
3. Canonical public Viewer entry:
   `/app/viewer`
4. Keep `/viewer/**` as runtime/bundle assets, not the primary product route.
5. Add automated regression checks for the above contracts.

## Non-scope

- Explanation Route storage/execution.
- Viewer orientation/context UI.
- Library curation changes.
- Premium recovery.
- Modeler features.
- 3DSS schema changes.
- PR #52/#53/#54 integration.

## Acceptance

- all seven Product Definition v1 files exist as Docs SSOT;
- Home communicates whole ↔ local reader value before implementation detail;
- Home/Concept do not claim universal necessity of 3D or fixed axes;
- public Home/Concept Viewer links use `/app/viewer`;
- CI/release checks fail if these foundation contracts regress;
- existing Viewer bundle paths such as `/viewer/peek.html` remain valid.

## Next slice

After this slice passes CI:

`STEP11_EXPLANATION_ROUTE_AND_READER_ORIENTATION_SLICE`

That slice should implement the missing reader guidance contract without changing the 3DSS schema unless a concrete preservation loss is demonstrated.
