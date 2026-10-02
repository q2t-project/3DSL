# Technical Debt — Recovered v0.1

## P0/P1 evidence-backed

1. **Roadmap/branch integration debt**
   - main, #52/#53 stack, and #54 diverge.
   - no canonical integration plan yet.

2. **Baseline/audit artifact debt**
   - roadmap-required `BASELINE.md` and `docs/audit/*` are not canonical on main.

3. **Product-definition debt**
   - roadmap-required `docs/product/*` not confirmed.
   - code currently risks becoming de facto product definition if this is not corrected.

4. **Premium canonicality debt**
   - substantial implementation is on #52/#53 but absent on main.

## P2 structural debt

5. **Vendored dependency/copy volume**
   - `packages/vendor` is large.
   - #52/#53 plans identify vendor/sync copies as restructuring targets.

6. **Sync/mirror architecture**
   - current main relies on multiple sync/generated-clean mechanisms.
   - #53 and later restructure plan propose structural removal, not yet adopted.

7. **Temporary Modeler public path**
   - `/modeler_app/` is documented as temporary due route conflict.

8. **Deprecated Viewer compat**
   - manifest lists a compat adapter with a target exit date already passed.

9. **Documentation freshness**
   - some living implementation reports predate the current QQT/Modeler changes.

## Deferred / UNKNOWN

- comprehensive security audit;
- full dead-code inventory;
- accessibility/performance baseline;
- live Cloudflare config parity;
- branch cleanup/rescue branch decisions.

Unknown is retained rather than marked clean.