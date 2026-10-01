# Modeler UI Sidecar v1 — Local-Only Persistence Contract

Status: accepted under `G_SW_02_ACCEPT_LOCAL_ONLY_V1_CONTRACT`.

## Scope

The Modeler UI sidecar is editor convenience state associated with a 3DSS document UUID.

Current storage:

```text
document_meta.document_uuid
→ localStorage key: modeler.sidecar.<document_uuid>
→ UI sidecar payload
```

The payload can contain:
- locks;
- visibility state;
- outliner grouping/collapse state;
- UI state such as active tab/tool, frame index/playback and presentation controls.

## Contract

- The sidecar is **not part of the 3DSS document**.
- The sidecar is **not included in Save, Save As, or Export**.
- The sidecar is **local to the browser/storage context**.
- Moving a 3DSS file to another browser/device does not guarantee sidecar transfer.
- Clearing browser storage may remove the sidecar.
- Sidecar loss is not 3DSS document corruption.
- Restoring a sidecar must not mutate the 3DSS document.
- The storage key uses `document_uuid` only as a local document-association key; it does not establish target-world identity.

## Non-equivalences

```text
document content != UI sidecar state
local persistence != portable persistence
same document_uuid != target-world identity proof
sidecar restore != semantic reconstruction
```

## Deferred trigger

Portable sidecar exchange is deferred. Reopen only when a concrete portability use case justifies:
- file naming/pairing;
- versioning;
- stale/orphan handling;
- Save/SaveAs/Export behavior;
- backward compatibility;
- cross-tool ownership of sidecar fields.

No 3DSS schema change is introduced by this contract.
