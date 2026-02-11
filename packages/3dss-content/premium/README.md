# Premium content (SSOT)

This folder is the **SSOT** for premium-only content.

## Layout

```
packages/3dss-content/premium/<slug>/
  _meta.json
  content.md
  model.3dss.json
  assets/
    <files>
```

## Deployment

- Synced to: `apps/site/public/_data/premium/<slug>/...`
- Access: **only** via site Functions (protected API). Avoid linking to `_data/premium/*` directly.
