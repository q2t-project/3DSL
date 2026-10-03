# RMAP STEP 11 — Milestone 1 Exit Review Candidate

Status:
`AUTOMATED_EXIT_REVIEW_READY / HUMAN_DEVICE_ACCEPTANCE_REQUIRED`

## Original Milestone 1 requirements

```text
Library list
Library detail
Viewer launch
model loading
navigation
mobile
error handling
```

## Evidence by requirement

### Library list
PASS_WITH_AUTOMATED_ACCEPTANCE
- Release 1 curated set.
- Missing/invalid index degrades without throwing.
- excluded legacy/test/draft items are absent from the Release 1 list.

### Library detail
PASS_WITH_AUTOMATED_ACCEPTANCE
- Release 1 detail pages build.
- context/provenance surface remains available.
- canonical Viewer handoff is present.

### Viewer launch
PASS_WITH_AUTOMATED_ACCEPTANCE
- public product entry is `/app/viewer`.
- inner `/viewer/index.html` remains a runtime asset.
- nested inner Back ownership conflict is suppressed.

### Model loading
PASS_WITH_AUTOMATED_ACCEPTANCE
- built Release 1 model is fetched by the E2E contract.
- explanation-route UUIDs are verified against the same built model.
- inner→outer load lifecycle is now explicit.

### Navigation
PASS_WITH_AUTOMATED_ACCEPTANCE
- Library→detail→guided Viewer.
- return intent to Library.
- whole/local orientation.
- explanation route Prev/Next/Whole.
- free exploration remains available.

### Mobile
AUTOMATED_CONTRACT_PASS / HUMAN_REAL_DEVICE_PENDING
- safe-area handling.
- 44px critical touch targets.
- guide viewport containment.
- narrow-screen action prioritization.
- built-artifact E2E.

Still requires human judgment for:
- actual touch comfort;
- no visually obstructive overlap on representative phone sizes/orientations;
- explanation panel readability while manipulating the Viewer.

### Error handling
PASS_WITH_AUTOMATED_ACCEPTANCE
- Library index missing/invalid states.
- model fetch/JSON/validation error typing.
- inner→outer loadStart/loadOk/loadFail/hostReady.
- initial model failure is visible at product-host level.

## Slice sequence

```text
STEP11_FOUNDATION_SLICE_PASS
→ STEP11_EXPLANATION_ROUTE_AND_READER_ORIENTATION_SLICE_PASS
→ STEP11_LIBRARY_RELEASE_CURATION_AND_RESILIENCE_SLICE_PASS
→ STEP11_RELEASE1_MOBILE_AND_END_TO_END_ACCEPTANCE_AUTOMATED_PASS
→ STEP11_LOAD_LIFECYCLE_AND_ERROR_HANDLING_SLICE_PASS (target)
```

## Architecture guards

- canonical Viewer product route remains `/app/viewer`;
- `/viewer/*` remains runtime/bundle infrastructure;
- explanation route remains Library/product metadata, not 3DSS model content;
- route order is not target-world time;
- UUID is not target-world identity;
- no schema expansion;
- Modeler feature expansion remains frozen.

## Human gate

After CI success, the remaining Milestone 1 judgment is:

`STEP11_LIBRARY_VIEWER_M1_HUMAN_DEVICE_ACCEPTANCE`

Human should verify the representative Release 1 flow on at least:
- one narrow phone viewport/device;
- one desktop viewport;

and judge:
1. the first guided model is understandable enough to enter;
2. Back / whole-local / guide controls do not obstruct the model;
3. Prev / Next / Whole are operable by touch;
4. returning to Library is clear;
5. no severe visual overlap or trapped navigation occurs.

This is a product/UX acceptance judgment, not a theory or schema judgment.

If accepted, recommended Milestone closure:

`STEP11_MILESTONE1_LIBRARY_TO_VIEWER_PASS_WITH_AUTOMATED_E2E_AND_HUMAN_DEVICE_ACCEPTANCE`

Then proceed to STEP 12 — Viewer stabilization.
