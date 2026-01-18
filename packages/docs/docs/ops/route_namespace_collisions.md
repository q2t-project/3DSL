---
title: Route namespace collisions (src/pages vs public)
---

## Problem

Astro routes created from `apps/site/src/pages` share the same URL namespace as static files served from `apps/site/public`.

Examples:

* `src/pages/viewer/index.astro` creates the route `/viewer/...`
* `public/viewer/index.html` is also served at `/viewer/index.html`

If both exist, one can shadow the other depending on hosting/routing behavior. This can produce **environment-specific** symptoms (local dev works, Cloudflare Preview behaves differently, or vice versa) with no console errors.

## Typical symptoms

* `/viewer` shows a different UI than expected (old buttons appear, missing `viewerHostBoot.js`, etc.).
* Cloudflare Preview differs from local dev even when the URL looks similar.
* Network tab shows redirects and the loaded document is not the one you think it is.

## Fix strategy

1. Decide a **single canonical entry** for the full viewer (currently: `/app/viewer`).
2. Remove or avoid creating a competing page route at the same top-level name as any `public/` folder.
3. Keep legacy paths only as explicit redirects, not as competing pages.

## Guard (mechanical check)

We added `apps/site/scripts/check/route-collisions.mjs` and wired it into:

* `predev`
* `prebuild`
* `check:ssot`

The check compares:

* top-level route names implied by `src/pages/*` (directories and page files)
* top-level directories in `public/*`

and fails if any names intersect.

## Debug checklist

When viewer behavior differs between environments:

1. Confirm the actual loaded document in DevTools → Network (the final response after redirects).
2. Confirm whether the page came from `src/pages/...` or `public/...`.
3. Run `npm --prefix apps/site run check:route-collisions`.
