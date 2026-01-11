# Viewer Ports (Generated)

- source: /viewer/manifest.yaml
- manifest_schema_version: 1.0
- generator: node scripts/gen-ports.mjs

## Ports

### host -> entry

| id | surface | stability |
|---|---|---|
| entry.bootstrapPeek | bootstrapPeek(canvasOrId, document3dss, options?) -> Promise<PeekHandle> | experimental |
| entry.bootstrapPeekFromUrl | bootstrapPeekFromUrl(canvasOrId, url, options?) -> Promise<PeekHandle> | stable |
| entry.bootstrapViewer | bootstrapViewer(canvasOrId, document3dss, options?) -> hub | stable |
| entry.bootstrapViewerFromUrl | bootstrapViewerFromUrl(canvasOrId, url, options?) -> Promise<hub> | stable |

### hub -> core

| id | surface | stability |
|---|---|---|
| hub.core.controllers | core controllers (frame/selection/mode/micro/visibility/camera/viewerSettings) | stable |

### hub -> renderer

| id | surface | stability |
|---|---|---|
| hub.renderer.pick | renderer.pickObjectAt(ndcX, ndcY) -> hit \| null (hit={uuid, kind, distance, point:[x,y,z]}) | stable |
| hub.renderer.render | renderer.render(frameContext) -> void | stable |

### ui -> hub

| id | surface | stability |
|---|---|---|
| hub.core.facade | hub.core.* (facade: frame/selection/camera/mode/micro/filters/runtime + recomputeVisibleSet) | stable |
| hub.dispose | hub.dispose() -> void | stable |
| hub.enqueueCommand | hub.enqueueCommand(cmd:object) -> boolean | experimental |
| hub.pickObjectAt | hub.pickObjectAt(ndcX, ndcY) -> hit \| null (hit={uuid, kind, distance, point:[x,y,z]}) | stable |
| hub.resize | hub.resize(width, height, dpr?) -> void | stable |
| hub.start | hub.start() -> void | stable |
| hub.stop | hub.stop() -> void | stable |
| hub.viewerSettings | hub.viewerSettings.* (worldAxes + viewerSettingsController bridge) | experimental |

## Deprecated / Compat (Not Ports)

| id | path | scope | until | exit_criteria |
|---|---|---|---|---|
| renderer.adapters.compat | /viewer/runtime/renderer/adapters/compat.js | renderer-internal | 2026-01-30 | drop legacy fallbacks and delete this adapter |
