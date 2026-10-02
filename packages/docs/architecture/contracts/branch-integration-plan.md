# Architecture 2026 — Branch Integration Plan

Status: `FROZEN / ARCHITECTURE_2026_V1`

## Baseline facts

- `main` at recovery is canonical historical baseline.
- PR #52 is a divergent Phase-0/safety branch.
- PR #53 is stacked on #52 and changes tooling/build topology.
- PR #54 is directly ahead of main and contains accepted bounded Modeler preservation work.

## Architecture decision

Use a fresh integration line:
`review/2026-architecture-v1`

Do not adopt an existing open PR as the Architecture 2026 mainline.

## Selective integration order

```text
I0 canonical Product/Gap/Architecture/Recovery docs
→ I1 selected #52 safety fixes
→ I2 Product-facing Library/Viewer reader core
→ I3 later transplant validated #54 Modeler guards
→ I4 Release-1 verification
→ I5 evaluate #53 workspace migration separately
→ I6 recover Premium after core path
```

Every selective port must record source PR, harvested files/behavior, rejected/deferred portions, and resulting canonical state.