# 3DSL Product Definition v0.1

Status: `APPROVED / PRODUCT_DEFINITION_V1`

## 1. Product statement

3DSL is a **whole-preserving spatial knowledge exploration system**.

It represents complex subject matter as a navigable whole in which a user can:
- locate an element or issue in the whole;
- move into local structure and mechanism;
- compare positions, relations, scales, scopes and viewpoints;
- return from local detail to the same whole;
- revise the representation when the placement or connection suggests a better distinction.

The primary product value is not “3D graphics”.
The value is **maintaining an externalized structure while attention moves between whole and part**.

Short form:

> 全体を保ったまま局所へ入り、局所から全体へ戻れる知識空間。

## 2. What 3DSL is not

3DSL is not defined as:
- a universal ontology;
- a claim that every domain has the same three semantic axes;
- a generic 3D model viewer;
- a replacement for prose;
- a proof that 3D presentation improves comprehension;
- a schema-first product;
- a Modeler-first creator platform.

3DSS is a representation/storage contract used by the product, not the product definition itself.

## 3. Core product loop

```text
Library
  ↓
Choose a Diagram
  ↓
Viewer
  ↓
See whole position
  ↕
Trace local structure
  ↕
Change scale / scope / viewpoint
  ↓
Compare / question / discover
  ↓
Return to Library or another Diagram
```

For creators:

```text
Question / source material
  ↓
distinguish
  ↓
place / connect
  ↓
inspect whole + local
  ↓
notice mismatch or new relation
  ↓
revise
```

## 4. Core capabilities

### C1 Whole ↔ local
A model must support movement from global position to local mechanism without silently replacing the underlying whole.

### C2 Placement as an explicit hypothesis
Position, direction, grouping and connection can be used to make distinctions visible.
Their meaning is domain/model specific and must not be treated as universally fixed.

### C3 Heterogeneous diagram connection
Hierarchical, radial, temporal, relational and local substructures may coexist in one navigable structure when their distinctions can be preserved.

### C4 Explanation routes
A reader should be able to follow an authored path through the same underlying model rather than being forced to infer an entry route from a dense whole.

### C5 Comparison and revision
The product should allow differences and commonality to become visible enough that the author or reader can question and revise the arrangement.

## 5. Product-stage priorities

For the first public product:

```text
1. Whole and internal structure
2. Placement and discovery
3. Connecting diagram structures
4. Explanation routes
```

Later extensions:

```text
5. Condition / scenario trials
6. Collaborative atlas
```

The later extensions are not release blockers.

## 6. Product success at this stage

Product success does not require proving a general cognitive effect.

It requires that a user can:
1. understand what 3DSL is for;
2. enter through a concrete Library example;
3. navigate whole ↔ local structure;
4. understand that placement/axes are model-specific;
5. move to another example without losing the conceptual framing;
6. identify how an author could eventually construct such a model.

## 7. Open product claims

The following remain hypotheses rather than established facts:
- 3DSL improves comprehension relative to prose/2D;
- spatial placement reliably produces novel discoveries;
- users will repeatedly return for exploratory reference;
- collaborative atlas use has product-market value.

These should be validated after the core product is publicly usable.