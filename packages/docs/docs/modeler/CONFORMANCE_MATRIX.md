# Modeler Spec / Implementation / Test Conformance Matrix

Status: active governance record.

This table prevents implementation-leading-spec work from silently becoming product truth.
A row is PASS only when the cited implementation and cited verification support the stated spec contract.
Human-only items remain HUMAN_REVIEW.

| Contract | Spec / guard | Implementation evidence | Verification | Status | Last checked |
|---|---|---|---|---|---|
| Import extras loss | Unsupported imported fields are temporary extras; strict output omits them only after explicit acknowledgement | `runtime/core/coreControllers.js`, `ui/controllers/uiFileController.js` | `scripts/smoke/import-loss-contract.mjs` + CI | PASS | 2026-10-02 |
| Strict validation | Schema validation gates strict persistence when validator is available; schema-valid does not imply lossless source preservation | `ui/controllers/uiFileController.js` | import-loss-contract smoke + schema validator path | PASS_WITH_SCOPE | 2026-10-02 |
| UUID semantics | `meta.uuid` / document UUID identify 3DSS document/runtime elements; UUID equality alone does not establish target-world identity | schema + runtime UUID indexes | `scripts/smoke/semantic-guards.mjs` | PASS_GUARD | 2026-10-02 |
| Frames semantics | `appearance.frames` and `uiState.frameIndex` control presentation/runtime applicability; no target-world time semantics are implied without a domain mapping | toolbar + renderer frame filter | `scripts/smoke/semantic-guards.mjs` | PASS_GUARD | 2026-10-02 |
| SSOT / mirrors | `apps/*/ssot` and package sources are editable truth; generated/public mirrors are not | `AGENTS.md`, sync/build scripts | generated-clean / boundary checks | PASS_WITH_SCOPE | 2026-10-02 |
| UI sidecar persistence | UI-only state persistence policy remains incomplete | current uiSidecar runtime support | no complete persistence acceptance suite | OPEN | 2026-10-02 |

## Status vocabulary

- PASS: spec, implementation and verification align.
- PASS_WITH_SCOPE: aligned only within the stated implementation/test scope.
- PASS_GUARD: semantic/non-equivalence guard is documented and regression-tested; it does not add schema semantics.
- HUMAN_REVIEW: requires manual UX/spec evidence.
- OPEN: implementation/spec/test coverage is incomplete.
- DRIFT: implementation and spec materially disagree.

## Rule

A new implementation-leading behavior must add/update a row before it can be treated as an accepted contract.
Implementation existence by itself is evidence of behavior, not authority to redefine Product intent.