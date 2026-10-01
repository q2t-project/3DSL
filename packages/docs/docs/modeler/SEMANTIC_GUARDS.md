# Modeler Semantic Guard Contracts

These guards constrain interpretation of existing 3DSS/runtime fields.
They do not add schema fields or new target-world semantics.

## UUID identity guard

`document_meta.document_uuid` and element `meta.uuid` are identifiers inside the 3DSS document/runtime contract.

They support:
- indexing;
- selection;
- endpoint references;
- runtime lookup;
- document-element uniqueness checks.

They do **not**, by themselves, establish identity of the represented target-world entity.

```text
same UUID -> same referenced 3DSS document/runtime element in the relevant document scope
same UUID != proof of same target-world entity across arbitrary documents/contexts
different UUID != proof of different target-world entity
```

Any cross-document or target-world identity claim requires an explicit mapping/provenance contract outside UUID equality alone.

## Frames semantic guard

`appearance.frames` and `uiState.frameIndex` are currently used by Modeler/Viewer as presentation/runtime visibility applicability.

```text
frame membership -> visible/applicable at the selected presentation/runtime frame
frame index != target-world timestamp
frame sequence != target-world temporal history
frame change != represented object state transition by definition
```

A domain may explicitly map frames to target time, but that mapping must be stated separately.

## Schema guard

Schema validity checks structural conformance to the 3DSS contract.
It does not prove either target identity or target-time semantics.
