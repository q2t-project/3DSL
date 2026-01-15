# phase* rename map (apps/site/scripts)

## Renamed check scripts
- scripts/check/phase2-contract.mjs -> scripts/check/viewer-bootstrap-public-contract.mjs
- scripts/check/phase2-core-contract.mjs -> scripts/check/viewer-core-layer-contract.mjs
- scripts/check/phase3-bootstrap-contract.mjs -> scripts/check/viewer-bootstrap-flow-contract.mjs
- scripts/check/phase4-hub-contract.mjs -> scripts/check/viewer-hub-boundary-contract.mjs
- scripts/check/phase4-hub-noop.mjs -> scripts/check/viewer-hub-dispose-safety.mjs
- scripts/check/regression-suite-regression.mjs -> scripts/check/viewer-regression-suite.mjs

## What to update in apps/site/package.json
Replace any old paths above with the new ones.

Recommended npm script names (optional, but avoids "phase" in script keys):
- check:viewer:bootstrap-public-contract
- check:viewer:core-layer-contract
- check:viewer:bootstrap-flow-contract
- check:viewer:hub-boundary-contract
- check:viewer:hub-dispose-safety
- check:viewer:regression-suite
