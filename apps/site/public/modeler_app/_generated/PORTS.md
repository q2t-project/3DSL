# Modeler Ports (Generated)

- source: /modeler/manifest.yaml
- manifest_schema_version: 1.0
- generator: node scripts/gen-ports.mjs

## Ports

### host -> entry

| id | surface | stability |
|---|---|---|
| entry.bootstrapModeler | bootstrapModeler(rootElOrId, options?) -> hub | stable |

### hub -> core

| id | surface | stability |
|---|---|---|
| hub.core.controllers | core controllers (document/io/validator/quickcheck/selection/lock/frames/transform/commandManager/sidecar) | stable |

### hub -> renderer

| id | surface | stability |
|---|---|---|
| hub.renderer.pick | renderer.pickObjectAt(ndcX, ndcY) -> hit \| null (hit={uuid, kind, distance, point:[x,y,z]}) | stable |
| hub.renderer.render | renderer.render(frameContext) -> void | stable |

### ui -> hub

| id | surface | stability |
|---|---|---|
| hub.core.facade | hub.core.* (facade: document/io/quickcheck/selection/lock/frames/transform/commands + focusByIssue) | stable |
| hub.dispose | hub.dispose() -> void | stable |
| hub.pickObjectAt | hub.pickObjectAt(ndcX, ndcY) -> hit \| null (hit={uuid, kind, distance, point:[x,y,z]}) | stable |
| hub.resize | hub.resize(width, height, dpr?) -> void | stable |
| hub.start | hub.start() -> void | stable |
| hub.stop | hub.stop() -> void | stable |

## Deprecated / Compat (Not Ports)

(none)
