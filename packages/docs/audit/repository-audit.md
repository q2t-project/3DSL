# Repository Audit — Recovered v1

Status: `RECOVERED / CANONICALIZED_WITH_UNKNOWNS`

Main areas:
- `apps/site` Astro site/routes;
- `apps/viewer/ssot` Viewer SSOT;
- `apps/modeler/ssot` Modeler SSOT;
- `packages/schemas` 3DSS schema SSOT;
- `packages/3dss-content` Library/content SSOT;
- `packages/docs` docs/policies;
- `packages/vendor` vendored dependencies.

Viewer and Modeler have explicit layer/port/single-writer governance and are strong retained assets.

3DSS v1.1.4 remains baseline; no schema rewrite is justified.

Library pipeline and Viewer launch are materially implemented, but Product-v1 curation/guidance is incomplete.

Premium materially exists on the #52/#53 stack but is not canonical main behavior.

Build/CI exists; #52 identifies and fixes a historical false-green tee/pipefail defect.

UNKNOWN remains explicit for complete dead-code/security inventory, current production deployment parity, and every runtime bug.
