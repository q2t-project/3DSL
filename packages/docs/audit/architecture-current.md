# Architecture Current — Recovered v1

Status: `CURRENT_ARCHITECTURE_RECOVERED_FROM_MAIN + BRANCH_DELTA_SEPARATED`

```text
packages/3dss-content
→ build/sync
→ apps/site/public/_data/library
→ Astro Library
→ /app/viewer
→ Viewer entry/hub
→ core + renderer

packages/schemas/3DSS.schema.json
→ content validation
→ Viewer
→ Modeler
```

SSOTs:
- Schema: `packages/schemas/3DSS.schema.json`
- Viewer: `apps/viewer/ssot/**`
- Modeler: `apps/modeler/ssot/**`
- Docs: `packages/docs/**`
- Content: `packages/3dss-content/**`

Viewer/Modeler core architecture: KEEP.

Library pipeline: KEEP; reader/product flow: REVISE under Product v1.

Premium: UNKNOWN pending branch reconciliation.

PR #53 workspace topology is a candidate, not adopted architecture.
