# RMAP STEP 11 — Release 1 Mobile + End-to-End Acceptance Slice

Status: `IMPLEMENTATION_COMPLETE / CI_PENDING / HUMAN_CLOSURE_PENDING`

Parent:
`STEP11_LIBRARY_RELEASE_CURATION_AND_RESILIENCE_SLICE_PASS`

Earlier accepted slices:
- `STEP11_FOUNDATION_SLICE_PASS`
- `STEP11_EXPLANATION_ROUTE_AND_READER_ORIENTATION_SLICE_PASS`
- `STEP11_LIBRARY_RELEASE_CURATION_AND_RESILIENCE_SLICE_PASS`

Backlog parent:
`RMAP_BL_01_COMPLETE_WITH_RELEASE1_READER_CRITICAL_PATH_AND_STEP11_READY`

## Purpose

Verify the Release 1 reader-critical path as a built product surface, with explicit mobile constraints:

```text
Home
→ Library
→ Release 1 detail
→ guided /app/viewer
→ whole/local orientation
→ explanation route
→ return to Library context
```

This slice is acceptance/hardening, not a new product feature cycle.

## Mobile decisions

On narrow screens the outer `/app/viewer` host prioritizes:

1. return/back;
2. whole/local orientation;
3. explanation-route toggle;
4. share.

Auxiliary output actions (copy / snapshot / QR) are hidden below 520px.
The Share action already falls back to copying the URL when native sharing is unavailable.

Mobile controls use 44px reader-critical touch targets.
The guide panel is constrained by `100dvh` and safe-area insets and becomes internally scrollable.

```text
mobile reader priority != deletion of desktop capabilities
```

## Nested Viewer fix

The canonical public host is `/app/viewer`.
The inner `/viewer/index.html` runtime is framed by that host.

Previously the inner Viewer retained its own Back control while the outer host also owned Back.
In an iframe this could navigate the inner frame toward its parent/referrer and create a nested host.

Contract now:

```text
framed inner Viewer
→ inner Back suppressed
→ outer /app/viewer owns navigation
```

This is host/chrome ownership only; Viewer core state is unchanged.

## Automated acceptance

New:
`apps/site/scripts/check/release1-mobile-e2e.mjs`

It runs **after Astro build** in `ci:build`.

### Mobile source contract
Checks:
- `viewport-fit=cover`;
- safe-area use;
- 44px critical controls;
- mobile action reduction;
- guide viewport containment;
- framed inner Back suppression.

### Built HTTP acceptance
The script serves `apps/site/dist` through a temporary localhost HTTP server and verifies:

1. Home is buildable and links Library + canonical `/app/viewer`.
2. Release 1 Library is buildable.
3. Included items 26010501 and 26012201 are exposed.
4. stress / legacy fixed-axis / draft / plumbing items are absent from the Release 1 list.
5. 26010501 detail is buildable.
6. detail contains canonical Viewer handoff, return intent and `first-read` guide.
7. built `_meta.json` contains the route.
8. every built focus target exists in the built 3DSS model.
9. `/app/viewer` contains reader orientation and route controls.
10. inner `/viewer/index.html` runtime asset remains buildable.
11. excluded 26012301 detail remains available but `noindex,follow`.
12. production sitemap, when generated, contains only the correct public Viewer/Release 1 details.

## Non-scope

This automated slice does **not** claim:
- real-device visual perfection;
- touch gesture quality on every browser;
- reader comprehension improvement;
- network performance under production traffic;
- accessibility conformance beyond the checked interaction contracts.

Those claims require separate browser/device/human evidence.

No:
- 3DSS schema change;
- Premium expansion;
- Modeler feature work;
- workspace migration;
- new test dependency.

## Acceptance target

Automated implementation acceptance:
`STEP11_RELEASE1_MOBILE_AND_END_TO_END_ACCEPTANCE_AUTOMATED_PASS`

Human slice closure, after CI success:
`STEP11_RELEASE1_MOBILE_AND_END_TO_END_ACCEPTANCE_SLICE_PASS`

STEP 11 itself remains open unless the Milestone 1 exit review confirms all remaining Library → Viewer requirements.
