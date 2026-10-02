# Viewer Session / Bridge v1

Status: `FROZEN / ARCHITECTURE_2026_V1`

Canonical public Viewer host:
`/app/viewer`

Internal Viewer runtime:
`/viewer/index.html`

## Session modes

Library mode:
```text
/app/viewer?item=<library-id>&route=<optional-route-id>
```

Standalone/developer compatibility may continue with:
```text
/app/viewer?model=<url>
```

## Host responsibilities

The Product/Application host owns item context, return route, title, Reader Guide, route state, orientation chrome, source/context links, product errors, and bundle entitlement.

It does not own renderer internals or canonical runtime state.

## Bridge v1

Host -> Runtime:
- loadDocument / loadUrl
- focus
- exitFocus
- setFrame
- setViewPreset
- setViewScope (only if needed)
- clearViewScope
- snapshot

Runtime -> Host:
- ready
- loaded
- selectionChanged
- modeChanged
- frameChanged
- focusChanged
- error
- snapshotResult

The bridge exposes application-level operations, not renderer internals.
