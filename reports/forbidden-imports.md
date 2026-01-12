# Viewer Forbidden Imports Report

## Scan scope
- Target: `apps/viewer/ssot/**`
- Source of truth: `apps/viewer/ssot/scripts/check-forbidden-imports.mjs`

## Layer definition (checker-config)
- entry: `runtime/bootstrapViewer.js`
- hub: `runtime/viewerHub.js`
- core: `runtime/core/**`
- renderer: `runtime/renderer/**`
- ui: `ui/**`
- host: HTML/CSS + host shells (`viewerHost.js`, `viewerDevHarness.js`, `viewerHostBoot.js`) + default

## Violations
No violations detected in the current scan.

| file | import specifier | resolved target | violation reason |
|---|---|---|---|
| _none_ | _none_ | _none_ | _none_ |

## Allowed exceptions (minimal host allowlist)
Exceptions are recorded in the same format and must include reason + source of truth.

| file | import specifier | resolved target | exception reason |
|---|---|---|---|
| `peekBoot.js` | `./runtime/bootstrapViewer.js` | `runtime/bootstrapViewer.js` | Minimal host entry (A. UI無し). Allow entry-only import per `SSOT_HOSTING_POLICY.md` + `minimalHostEntries` in `check-forbidden-imports.mjs`. |