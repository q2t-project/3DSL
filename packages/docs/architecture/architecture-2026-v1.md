# 3DSL Architecture 2026 v1

Status: `APPROVED / ARCHITECTURE_2026_V1 / FROZEN`

Parents:
- `PRODUCT_DEFINITION_V1`
- `GLOBAL_GAP_BASELINE_V1`
- QQT `VALIDATED_PROVISIONAL_ARCHITECTURE_v1` for semantic guards only

## Architecture decision

Architecture 2026 is a **product-facing integration architecture around retained runtime cores**.

```text
Product meaning / reader guidance
               ↓
Library context / curation
               ↓
Viewer Session Host (/app/viewer)
               ↓
Viewer Runtime (/viewer/*)
               ↓
3DSS v1.1.4
```

## Content split

`model.3dss.json` owns structural representation.

`_meta.json` owns publication, authors, references, rights, provenance, links, and curation.

`guide.json` is a new **external Reader Guide v1 contract** owning model-specific interpretation, explanation routes, route-step text, optional focus/frame/view hints, and cautions. It is not part of 3DSS.

Hard guards:

```text
guide UUID != target-world identity
guide frame != target-world time unless explicitly stated
guide axis label != universal 3DSL axis
route order != causal/time order by default
```

## Canonical product surface

Public:
- `/`
- `/library`
- `/library/<id>`
- `/app/viewer`
- `/concept`
- `/docs`
- `/app/modeler` (later priority)

Internal/runtime:
- `/viewer/index.html`
- `/viewer/peek.html`
- `/modeler_app/*` where still required

Rule: `/viewer/*` is not canonical product navigation.

## Viewer Session Host

`/app/viewer` owns item/library context, return route, model title, Reader Guide loading, route state, orientation chrome, source/context links, product errors, and free/premium bundle resolution.

It does not own rendering or the canonical 3DSS runtime state.

## Viewer Runtime

Keep existing host → entry → hub → core/renderer architecture, parser/validation, indexing, camera, macro/micro, selection, frame, visibility, rendering, capture.

Generic APIs may be added only when needed by the Product Host. `ViewScope`, if introduced, is runtime presentation state only.

## Library

Keep:

```text
Source Content → Build Artifact → Runtime Data → Library Page → Viewer Host
```

Extend to:

```text
model + meta + guide → cross-validation → Reader Bundle
```

Release-facing public items must be non-draft, Product-v1 compatible, contextualized, provenance-aware, and Viewer-loadable.

## Product copy

Authoritative Product meaning lives in `packages/docs/product/*`. Home/Concept are projections of that SSOT.

## Premium

Free = core site + Viewer + docs + representative Library.

Premium = deeper/specialized/high-value curated content.

Premium gates Reader Bundle access, **not a separate Viewer engine**.

## Modeler

Keep Modeler core. Hold new feature expansion until reader-facing Library/Viewer closes. Validated PR #54 is queued for later selective integration.

## Schema

Formal decision: `3DSS v1.1.4 — KEEP`.

No Product-v1 P1 gap currently demonstrates unrepairable storage loss. G-SW-06/07/08 remain deferred.

## Build/tooling

For Release 1:
`KEEP_CURRENT_VERIFIED_BUILD_TOPOLOGY_WITH_TARGETED_REPAIR`.

PR #53 workspace migration is post-core evaluation, not a prerequisite.

## Branch integration

Fresh integration branch:
`review/2026-architecture-v1`

Order:

```text
I0 canonical Product + Architecture docs
→ I1 selective #52 safety fixes
→ I2 Product-facing Home/Concept/Library/Viewer + Reader contracts
→ I3 later integrate validated #54 Modeler patch
→ I4 Release 1 verification
→ I5 evaluate #53 separately
→ I6 recover/rebuild Premium after core path
```

## Error policy

Distinguish model invalid, guide invalid, stale guide reference, unavailable content, authorization denial, network failure, and unknown result.

## Frozen invariants

- Product Definition → Architecture → Code.
- 3DSS structural record != Reader Guide.
- Guide interpretation != universal ontology.
- Viewer Host product state != Viewer Runtime canonical state.
- public `/app/viewer` != internal `/viewer/*`.
- Premium entitlement != separate representation semantics.
- Modeler maturity != release priority.
- branch existence != canonical architecture.
- schema-valid != semantic complete/lossless.
- guide route/frame/UUID != target-world time/identity by default.
