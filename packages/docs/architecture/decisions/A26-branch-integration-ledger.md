# Architecture 2026 Branch Integration Ledger

Status: `FOUNDATION_COMPLETE / SELECTIVE_HARVEST_ACTIVE`

Integration branch:
`review/2026-architecture-v1`

Historical canonical base:
`main@3d4edddfa07a974a88a20820c5947a868597c062`

## RBL-001 — fresh integration line

Disposition: `DONE`.

The integration branch was verified identical to canonical main before selective ports. No #52/#53/#54 history was inherited wholesale.

## RBL-002 — canonical decision/evidence docs

Disposition: `DONE_WITH_CANONICAL_BUNDLE`.

Canonical repository areas:
- `BASELINE.md`
- `packages/docs/audit/**`
- `packages/docs/product/**`
- `packages/docs/gap/**`
- `packages/docs/architecture/**`
- `packages/docs/backlog/**`
- `packages/docs/roadmap/**`

Historical UNKNOWN / partial audit findings remain UNKNOWN / partial.

## PR #52 — Phase 0 source

Source branch: `chore/restructure-phase0`
source head observed during recovery: `a7b34cf714c62ef12a135a991f1229ba169dbc62`.

Selective ports:

| Source behavior | Integration disposition |
|---|---|
| CI `tee` false-green correction | PORTED as RBL-003 |
| Astro `site: https://3dsl.jp` | PORTED as RBL-004 |
| Layout default canonical derivation | PORTED as RBL-004 |
| broad repo cleanup | DEFERRED / not required for Foundation |
| Premium implementation/assets | DEFERRED to post-Release-1 Premium path |
| other divergent history | NOT INHERITED |

RBL-003 branch commit: `bdc338631ecc7cf01c41e9e8bfceced9dccc9c14`.

RBL-004 selective commits:
- `296ea29e55cad6135971c79837dfc74a80754f83`
- `131e0e1e417cd17937ce75cbbb0c5918095ec22a`

## PR #53 — workspace migration source

Source branch: `chore/workspaces`
source head observed: `533c2dcb4de176b9b99743622b3f40e94458c006`.

Disposition:
`DEFERRED / POST-CORE EVALUATION`.

No pnpm/workspace/Cloudflare build-topology change is part of the Foundation slice.

## PR #54 — Modeler preservation source

Source branch: `qqt/sw-m1-explicit-loss-contract`
source head observed: `709df22ebf509084be07e13fb73aab21ece2fe36`.

Disposition:
`VALIDATED / QUEUED AFTER READER CORE`.

No new Modeler feature scope is authorized.

## Integration rule

Branch existence is evidence, not canonical truth.
Every future harvest must update this ledger with:
- source PR/ref;
- exact behavior/files harvested;
- deferred/rejected portions;
- verification result;
- resulting canonical commit.

## Foundation verification

Formal result:
`STEP11_FOUNDATION_RBL_001_005_PASS`

Latest verified PR #55 CI at closure: `SUCCESS`.

Foundation selective harvest is complete. Future ports remain subject to this ledger and Architecture 2026.