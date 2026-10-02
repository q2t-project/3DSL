# BASELINE.md — RMAP-REC-01 Recovered Baseline

Status: `RECOVERED_BASELINE / CANONICALIZED_FOR_ARCHITECTURE_2026`

Repository: `q2t-project/3DSL`

Historical canonical main baseline:
- branch: `main`
- commit: `3d4edddfa07a974a88a20820c5947a868597c062`
- commit date: 2026-02-09 UTC
- Node contract: `>=22.12.0 <23`
- CI Node: 22
- 3DSS schema: v1.1.4

## Divergent candidate lines at recovery

- PR #52 / `chore/restructure-phase0`: Phase-0 safety fixes, canonical correction, repo-cleanup evidence, Premium assets. CI PASS.
- PR #53 / `chore/workspaces`: stacked on #52; pnpm/workspace migration and CI topology change. CI PASS. Architecture 2026 defers adoption.
- PR #54 / `qqt/sw-m1-explicit-loss-contract`: bounded validated Modeler preservation/semantic patch from main. CI PASS. Queued until reader core.

## Reproducibility scope

The historical main commit is exact. Fresh live deployment/Cloudflare parity and every UNKNOWN from recovery are not implied by this record.

Architecture 2026 starts a new integration line from the historical canonical main and ports changes explicitly.
