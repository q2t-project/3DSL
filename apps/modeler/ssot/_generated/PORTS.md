# Modeler Ports (Generated)

- source: /modeler_app/manifest.yaml
- manifest_schema_version: 1.0
- generator: node scripts/gen-ports.mjs

## Ports

### host -> entry

| id | surface | stability |
|---|---|---|
| entry.bootstrapModeler | bootstrapModeler(rootElOrId, options?) -> hub | stable |
| entry.bootstrapModelerFromUrl | bootstrapModelerFromUrl(rootElOrId, url, options?) -> Promise<hub> | stable |

### hub -> core

| id | surface | stability |
|---|---|---|
| hub.core.createControllers | createCoreControllers(emitter) -> core controllers (document/file/dirty/uiState/selection/lock/edit/validator/quickcheck + focusByIssue) | stable |

### hub -> renderer

| id | surface | stability |
|---|---|---|
| hub.renderer.createRenderer | createRenderer(canvas) -> renderer (start/stop/resize/dispose/setDocument/applyVisibility/setSelection/pickObjectAt/focusOnUuid/worldPointOnPlaneZ/previewSetPosition/previewSetLineEnds/previewSetCaptionText/previewSetOverride) | stable |

### ui -> hub

| id | surface | stability |
|---|---|---|
| hub.applyPickAt | hub.applyPickAt({ndcX, ndcY}?) -> issueLike \| null (issueLike={uuid, kind, path}) | stable |
| hub.core.controllers | hub.core.* (controllers: document/file/dirty/uiState/selection/lock/edit/import/validator/quickcheck + focusByIssue) | stable |
| hub.dispose | hub.dispose() -> void | stable |
| hub.on | hub.on(type, fn) -> off() | stable |
| hub.pickObjectAt | hub.pickObjectAt(ndcX, ndcY) -> hit \| null (hit={uuid, kind, distance, point:[x,y,z]}) | stable |
| hub.previewSetCaptionText | hub.previewSetCaptionText(uuid, captionText, fallbackText) -> void (preview only; captionText={content, size?, align?, pose?} \| null) | stable |
| hub.previewSetLineEnds | hub.previewSetLineEnds(uuid, endA, endB) -> void (preview only; endA/endB are endpoint objects: {ref:string}\|{coord:[x,y,z]}\|null) | stable |
| hub.previewSetOverride | hub.previewSetOverride(uuid, override:{position?,endA?,endB?,captionText?}\|null) -> void (preview only; null clears override for uuid) | beta |
| hub.previewSetPosition | hub.previewSetPosition(uuid, pos:[x,y,z]) -> void (preview only) | stable |
| hub.projectToNdc | hub.projectToNdc(worldPos:[x,y,z]) -> [ndcX, ndcY, ndcZ] \| null | beta |
| hub.resize | hub.resize(width, height, dpr?) -> void | stable |
| hub.start | hub.start() -> void | stable |
| hub.stop | hub.stop() -> void | stable |
| hub.worldPointOnPlaneZ | hub.worldPointOnPlaneZ(ndcX, ndcY, planeZ) -> [x,y,z] \| null (3DSS coords) | stable |

## Deprecated / Compat (Not Ports)

(none)
