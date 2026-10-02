# Global Gap Baseline v1

Status: `APPROVED / GLOBAL_GAP_BASELINE_V1`

Basis:
- Product: `PRODUCT_DEFINITION_V1`
- Repository baseline: `main@3d4edddfa07a974a88a20820c5947a868597c062`
- PR #52/#53/#54 are candidate/unmerged assets, not current-main behavior.

## Aggregate

```yaml
GOOD: 12
INSUFFICIENT: 14
MISSING: 12
OUTDATED: 5
DUPLICATED: 5
OVERBUILT: 1
schema_rewrite_pressure: NONE_IDENTIFIED
full_rewrite_pressure: NONE_IDENTIFIED
```

## Highest-pressure gaps

1. Home/Concept product meaning is behind Product Definition v1.
2. Explanation Route is the clearest missing reader-facing feature.
3. Library plumbing is strong but public-release curation is weak.
4. Viewer macro↔micro exists, but reader orientation/context/interpretation is thin.
5. None of the P1 gaps uniquely requires new 3DSS fields.
6. Main, #52/#53, and #54 require an explicit branch integration architecture.

## Architecture pressure

Step 9 must resolve:
- canonical Home → Library → detail/context → Viewer surface;
- Reader Guide / explanation-route contract;
- reader orientation/context;
- model-specific placement/axis/frame interpretation;
- release curation;
- branch integration;
- tooling topology;
- Free/Premium implementation boundary;
- Modeler priority.

Dominant gap:

```text
Product meaning
→ curated example
→ explanation/orientation
→ whole ↔ local exploration
→ return / compare / continue
```
