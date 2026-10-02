# RMAP-GAP-01｜Global Gap Analysis v0.1

Status: `APPROVED / GLOBAL_GAP_BASELINE_V1`

Comparison basis:
- Product: `PRODUCT_DEFINITION_V1` approved in RMAP-PROD-01.
- Repository: canonical `main@3d4edddfa07a974a88a20820c5947a868597c062`.
- PR #52/#53/#54: candidate/unmerged assets only; never counted as current main behavior.

Gap vocabulary: `MISSING / INSUFFICIENT / OVERBUILT / OUTDATED / DUPLICATED / GOOD`.

## 1. Aggregate

```yaml
GOOD: 12
INSUFFICIENT: 14
MISSING: 12
OUTDATED: 5
DUPLICATED: 5
OVERBUILT: 1
release_blockers: 20
schema_rewrite_pressure: NONE_IDENTIFIED
full_rewrite_pressure: NONE_IDENTIFIED
```

## 2. Gap matrix

| ID | Area | Status | Priority | Release blocker | Requirement | Current main / evidence |
|---|---|---|---|---|---|---|
| P-01 | Product positioning | **OUTDATED** | P1 | YES | Home/Concept should lead with whole-preserving knowledge exploration, not 3D graphics/language as the product itself. | Home and Concept still define 3DSL primarily as a three-dimensional structural language / framework for concepts and relations in 3D. |
| P-02 | Product positioning | **OUTDATED** | P1 | YES | 3D must be presented as conditional structural value, not universal necessity or a cognitive superiority claim. | Home says thought/understanding moves across multiple axes/viewpoints/grains 'simultaneously' and 3D preserves that simultaneity; Top copy claims a stronger public good than language. |
| P-03 | Target user | **INSUFFICIENT** | P1 | YES | Reader/Explorer must be primary; Author/Mapper secondary. | Home targets a broad mixed audience and Concept centers people who view/create 3DSS; reader-first role priority is not explicit. |
| P-04 | First 30 seconds | **INSUFFICIENT** | P1 | YES | First-time user should understand What / Why / How before controls and implementation vocabulary. | Hero is poetic and lower-page explanation is implementation/3D-centric; direct core v1 sentence is not the dominant first message. |
| P-05 | Viewer entry | **DUPLICATED** | P1 | YES | One canonical reader-facing Viewer entry should preserve Library return/context. | Main uses both `/app/viewer` and `/viewer`; nav and Library use `/app/viewer`, while Home/Concept also link `/viewer`. |
| L-01 | Library | **GOOD** | P3 | NO | Content SSOT/build/index/detail pipeline should be stable. | `packages/3dss-content` -> generated index/data -> Astro Library is implemented with checks and documented SSOT. |
| L-02 | Library | **GOOD** | P3 | NO | Library should be a primary public entry demonstrating 3DSL value. | Library is first in main nav after Home, featured on Home, and has an index/detail flow. |
| L-03 | Library | **GOOD** | P3 | NO | Diagram detail should provide context then direct Viewer entry. | Detail page provides title/summary, preview, authors, optional text/references/rights, and a full-screen `/app/viewer` entry with return context. |
| L-04 | Library guidance | **MISSING** | P1 | YES | Public items should provide an authored entry/explanation route when the model is dense. | `entry_points` is reserved in metadata/build types, but published items inspected have empty/no entry points and no site/viewer execution path uses it. |
| L-05 | Library curation | **INSUFFICIENT** | P1 | YES | Public Library should contain deliberate product examples rather than tests/drafts/sample plumbing. | Published main items include a stress/load-test item, an empty item titled `26012801` tagged draft, and a folder-structure sample. |
| L-06 | Library conceptual alignment | **OUTDATED** | P1 | YES | Public conceptual examples must not contradict Product v1 / validated QQT boundaries. | Published item `3DSL三軸座標系` describes a 3DSL three-axis definition and contains Quantity/Quality/Time axis labels; Product v1 says axes are model-specific and 3D is conditional. |
| L-07 | Library curation contract | **DUPLICATED** | P2 | NO | Featured/recommended status should have one SSOT. | `_meta.json` defines `recommended`, while Home selects featured items using `m:top` / `m:default` tags and ignores `recommended`. |
| L-08 | Library provenance | **GOOD** | P3 | NO | Infrastructure should support sources/rights/provenance. | `_meta.json` has authors, references, rights, provenance, links; detail page renders meaningful references/rights. |
| L-09 | Library provenance | **INSUFFICIENT** | P2 | NO | Published content should actually fill provenance/rights/source fields to a useful level. | Several published items have no references/rights; one inspected item contains placeholder/empty fields despite meta policy preferring explicit UNKNOWN. |
| L-10 | Library exploration | **INSUFFICIENT** | P2 | NO | Users should be able to continue to related/comparison examples. | `related` and `pairs` are reserved but inspected published metadata is empty; no reader-facing related/pair flow was found. |
| L-11 | Library capability coverage | **INSUFFICIENT** | P1 | YES | The free Library as a set should demonstrate whole↔internal, placement/comparison, heterogeneous connection, and explanation routes. | Current publishing metadata does not declare or verify capability coverage; explanation-route coverage is absent. |
| V-01 | Viewer core | **GOOD** | P3 | NO | Basic rendering and navigation should work. | Viewer has load/render, orbit/pan/zoom, pick, selection, visibility, frames, axis controls, snapshot/embed infrastructure. |
| V-02 | Viewer whole/local | **GOOD** | P3 | NO | Viewer should permit whole↔local movement and return. | Viewer has macro/micro modes; picking focuses into micro and exiting restores the saved macro camera state. |
| V-03 | Viewer whole/local semantics | **INSUFFICIENT** | P1 | YES | Local view should represent meaningful local structure, not only camera proximity/neighborhood. | Micro state is mainly focus item + 1-hop related UUIDs + local bounds. Explicit composite/internal structure semantics are not a general contract. |
| V-04 | Viewer orientation | **INSUFFICIENT** | P1 | YES | Reader should know where they are in the whole, what is focused, and how to return. | Viewer host carries title/back-to-Library and runtime has macro/micro labels; no reader-facing breadcrumb/whole-position/explanation context was found. |
| V-05 | Viewer scale/scope/viewpoint | **INSUFFICIENT** | P1 | YES | Reader should know what changed when scale/scope/viewpoint changes. | Camera, frame and mode exist, but product-level semantic labels for scope/grain/viewpoint are not a stable reader contract. |
| V-06 | Viewer placement interpretation | **INSUFFICIENT** | P1 | YES | Meaningful axes/position/direction need model-specific interpretation. | World axes and geometric coordinate system exist; no general reader-facing contract communicates model-specific semantic axis/placement meaning. |
| V-07 | Viewer explanation route | **MISSING** | P1 | YES | Viewer should execute an authored explanation route through the same model. | No route/tour/story/breadcrumb implementation was found in Viewer SSOT; Library `entry_points` is not consumed. |
| V-08 | Viewer comparison | **MISSING** | P2 | NO | Reader should be able to compare regions/models where useful. | `/app/compare` exists but is a Viewer-vs-Modeler debug parity tool, not a reader comparison experience. |
| D-01 | Docs | **GOOD** | P3 | NO | Schema/spec/viewer documentation routes should exist. | Main has `/docs`, schema/spec routes, viewer docs, FAQ route, Concept route. |
| D-02 | Concept | **OUTDATED** | P1 | YES | Concept copy must match approved Product v1 and claim boundaries. | Concept defines 3DSL as a framework for placing concepts/relations in 3D and centers 3DSS samples/creation; it does not lead with whole-preserving exploration or conditional 3D. |
| D-03 | Reader guidance | **MISSING** | P1 | YES | A clear 'How to read a 3DSL diagram' entry should exist. | Docs tree has technical contracts/ops, but no dedicated reader-facing reading guide was found. |
| D-04 | Product docs canonicality | **MISSING** | P1 | YES | Approved Product Definition v1 should become canonical repository docs. | The approved `docs/product/*` bundle exists in project artifacts, but no corresponding canonical product directory was found on main. |
| B-01 | Free experience | **GOOD** | P3 | NO | Core concept, Viewer, docs and representative Library experience should be usable without payment. | Main Library/Viewer/docs are public and do not require Premium access. |
| B-02 | Premium boundary | **MISSING** | P2 | NO | Canonical product docs/site should express Free core vs Premium content depth. | Main does not contain the approved content-depth product boundary. |
| B-03 | Premium implementation | **MISSING** | P3 | NO | Premium delivery should exist only after the product boundary is clear. | Canonical main lacks the Premium routes/auth assets described in the old roadmap. |
| B-04 | Premium canonicality | **DUPLICATED** | P2 | NO | One branch/state must define Premium implementation truth. | Main and #52/#53 materially differ: Premium is absent on main but substantial on the restructure stack. |
| B-05 | Business validation | **MISSING** | P4 | NO | Willingness to pay should be empirically tested after core usability. | No demand/willingness-to-pay evidence is established in current repository/product artifacts. |
| M-01 | Modeler | **GOOD** | P3 | NO | Author tool should support place/connect/edit/validate/save/export. | Modeler already has substantial editing, validation, history, preview and persistence functions. |
| M-02 | Modeler priority | **OVERBUILT** | P2 | NO | Modeler must not consume priority ahead of reader-facing Library/Viewer core. | Modeler is comparatively mature while explanation routes, reader onboarding and Product v1 copy are missing. |
| M-03 | Modeler accepted guards | **OUTDATED** | P2 | NO | Accepted preservation/semantic guards should not remain only on a draft branch indefinitely. | Canonical main lacks the approved #54 import-loss, UUID/frame guards, conformance matrix and local-only sidecar contract. |
| M-04 | Creator publication | **MISSING** | P4 | NO | Later author flow should connect Modeler output to an appropriate Library/content publication workflow. | No integrated reader-safe Modeler→Library publish workflow is established. |
| A-01 | Architecture governance | **GOOD** | P3 | NO | SSOT and layer boundaries should be explicit and machine-checkable. | Viewer/Modeler manifests define layers, ports, forbidden dependencies and checks; AGENTS/docs identify SSOTs. |
| A-02 | Schema | **GOOD** | P3 | NO | Schema should not be expanded without concrete preservation loss. | 3DSS v1.1.4 supports current product basics and no current P1 gap uniquely requires schema expansion. |
| A-03 | Repo topology | **DUPLICATED** | P2 | NO | Build/dependency topology should not rely on unnecessary copies and duplicated generated trees. | Main uses large vendor trees plus sync/mirror copies and generated-clean checks. |
| A-04 | Branch canonicality | **DUPLICATED** | P1 | YES | Main, restructure stack and QQT patch need one integration plan. | Open #52/#53 stack and direct-main #54 represent divergent successor states. |
| A-05 | Verification | **INSUFFICIENT** | P2 | NO | Repository should expose a coherent global verification contract. | Main has extensive checks and `ci:build`, but no single canonical root `verify` command. |
| A-06 | Recovery artifacts | **MISSING** | P2 | NO | Recovered baseline/audit should become repository-canonical evidence if used for architecture decisions. | RMAP-REC-01 artifacts exist in project workspace, not canonical main. |
| A-07 | CI | **GOOD** | P3 | NO | Automated CI/build/validation exists and recent candidate branches pass. | GitHub Actions exists; #52, #53 and #54 each have successful CI runs. |
| R-01 | Release readiness | **INSUFFICIENT** | P1 | YES | Release 1 should communicate Product v1 and demonstrate it through Library+Viewer. | Technical Library/Viewer routes exist, but core copy, curation, explanation routes and reader orientation are not aligned with Product v1. |
| R-02 | Library resilience | **INSUFFICIENT** | P1 | YES | Library should survive missing/bad index with a usable empty/error state. | `readLibraryIndex()` throws on missing/invalid index and the `/library` page calls it directly. |
| R-03 | Mobile/accessibility | **INSUFFICIENT** | P2 | NO | Core reader path should be verified on mobile and for keyboard/ARIA. | There is responsive UI, swipe navigation and multiple ARIA labels, but no consolidated acceptance evidence for the complete Product v1 reader flow. |
| X-01 | Later extension | **MISSING** | P4 | NO | Condition/scenario trials can be added after core public product. | Frames exist, but no product-level scenario comparison workflow is established. |
| X-02 | Later extension | **MISSING** | P4 | NO | Collaborative atlas can be added after core public product. | No collaborative atlas/multi-user product path is established. |

## 3. Highest-pressure gaps

### A. Product message is behind Product Definition v1
Home/Concept still frame 3DSL primarily as a 3D structural language/framework and make stronger claims about simultaneity/3D than Product v1 permits. This is a copy/positioning gap, not an engine gap.

### B. Explanation route is the clearest missing reader feature
Library already reserves `entry_points`, but published metadata is empty and Viewer has no route/tour execution path. Product v1 makes explanation routes a first-public-product priority.

### C. Library has good plumbing but weak release curation
The content pipeline/detail/Viewer path is strong. The public set still includes technical/draft/sample material and an outdated `3DSL三軸座標系` item that conflicts with the model-specific-axis policy.

### D. Viewer has a valuable macro↔micro base, but reader semantics are thin
Macro/micro focus and return already work. The missing layer is reader-facing orientation, local-structure meaning, scope/grain/viewpoint interpretation and authored routes.

### E. Product v1 does not create schema pressure
None of the P1 gaps uniquely requires new 3DSS fields. Current gaps can first be attacked through product copy, Library metadata/curation, Viewer host/UI contracts, external/context metadata, and branch integration.

### F. Repository truth is split across main and three open PRs
#52 contains Phase-0 safety/premium assets, #53 changes tooling architecture, and #54 contains accepted Modeler preservation patches. Architecture 2026 must define the integration sequence.

## 4. No-rewrite findings

Keep as architectural assets:
- Viewer host/entry/hub/core/renderer/UI separation.
- Viewer macro/micro mechanism.
- Modeler layered/single-writer design.
- 3DSS v1.1.4 baseline.
- Library content SSOT/build/detail pipeline.
- provenance/rights metadata separation.
- automated CI/validation discipline.

Therefore Global Gap Analysis does **not** support:
- a Viewer rewrite;
- a Modeler rewrite;
- a schema rewrite;
- adopting pnpm/workspace restructuring solely because it exists on #53.

## 5. Architecture 2026 inputs

Step 9 should resolve these architecture questions, in order:

1. **Canonical product surface:** Home → Library → detail/context → one canonical Viewer entry.
2. **Explanation-route contract:** where authored routes live, how they point into a model, and how Viewer executes them.
3. **Reader orientation/context:** whole position, focus, relation, scope/grain/viewpoint, source/context.
4. **Placement interpretation:** how model-specific axis/position meaning is communicated without universalizing axes.
5. **Library release curation:** capability coverage, product-content compatibility, provenance completeness, related/pairs.
6. **Branch integration:** #52/#53/#54 sequence and canonical baseline.
7. **Tooling topology:** current sync/vendor/mirror design vs workspace/build integration.
8. **Premium:** content-depth boundary first, mechanism second.
9. **Modeler:** retain, integrate bounded preservation fixes, freeze feature expansion until reader core closes.

## 6. Gap-analysis conclusion

The dominant gap is **not missing 3D rendering**. The repository already has substantial Viewer/Library/Modeler machinery.

The dominant gap is the layer between that machinery and Product v1:

```text
Product meaning
→ curated example
→ explanation/orientation
→ whole ↔ local exploration
→ return / compare / continue
```

This makes Architecture 2026 primarily a **product-facing integration architecture** problem before it is a low-level engine problem.

Recommended closure:

`RMAP_GAP_01_COMPLETE_WITH_CORE_PRODUCT_GAPS_NO_SCHEMA_REWRITE_PRESSURE_AND_STEP9_READY`