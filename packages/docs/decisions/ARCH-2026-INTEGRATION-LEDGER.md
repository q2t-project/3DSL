# Architecture 2026 Integration Ledger

Status: `ACTIVE / FOUNDATION_SLICE`

Integration branch:
`review/2026-architecture-v1`

Base:
`main@3d4edddfa07a974a88a20820c5947a868597c062`

Purpose:
Build Architecture 2026 by explicit selective harvest. Branch existence or a prior PR does not make its contents canonical.

## Source ledger

| Source | Candidate value | Foundation decision | Canonical result |
|---|---|---|---|
| main | approved historical code baseline | USE AS BASE | integration branch starts from exact main SHA |
| PR #52 | CI false-green correction | PORT | `.github/workflows/ci.yml` uses `pipefail` |
| PR #52 | canonical site-origin correction | PORT | Astro `site=https://3dsl.jp` + Layout fallback canonical |
| PR #52 | unrelated repo cleanup / Premium / other changes | DO NOT WHOLESALE MERGE | remains source evidence only |
| PR #53 | pnpm workspaces/tooling migration | DEFER | post-core evaluation; not Release 1 prerequisite |
| PR #54 | accepted Modeler preservation patch | QUEUED | keep validated draft; integrate after reader-facing core per backlog |

## Canonical Architecture 2026 inputs

- `BASELINE.md`
- `packages/docs/audit/*`
- `packages/docs/product/*`
- `packages/docs/architecture/global-gap-baseline-v1.md`
- `packages/docs/architecture/architecture-2026-v1.md`

## Harvest rule

Every future harvest must record:
1. source PR/commit;
2. exact files/behavior taken;
3. rejected/deferred portions;
4. resulting canonical state;
5. verification.

Do not infer Product/Architecture truth from an unmerged branch.
