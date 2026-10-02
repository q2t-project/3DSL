# Architecture 2026 Decision Register

Status: `FROZEN / ARCHITECTURE_2026_V1`

| ID | Decision | Status |
|---|---|---|
| A26-001 | `/app/viewer` is the canonical public Viewer host; `/viewer/*` is internal runtime/preview | APPROVED |
| A26-002 | Keep 3DSS v1.1.4; Reader Guide remains external to 3DSS | APPROVED |
| A26-003 | Add versioned `guide.json` for interpretation/explanation routes | APPROVED |
| A26-004 | Viewer Host owns Product/session/guide state; Viewer Runtime remains product-agnostic | APPROVED |
| A26-005 | Define a stable same-origin Viewer Bridge v1 | APPROVED |
| A26-006 | `_meta.recommended` is the curation/featured SSOT | APPROVED |
| A26-007 | Premium gates content depth/bundle access and uses the same Viewer core | APPROVED |
| A26-008 | Modeler is retained but not Release-1 priority | APPROVED |
| A26-009 | Keep current verified build topology for Release 1; evaluate PR #53 post-core | APPROVED |
| A26-010 | Use fresh integration branch with selective harvesting from #52/#54 | APPROVED |
| A26-011 | No full rewrite | APPROVED |
| A26-012 | No schema rewrite without concrete unrepairable preservation loss | APPROVED |
