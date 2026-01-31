# 3DSD Modeler (apps/modeler)

This directory contains the **independent Modeler application**.

- Runtime source of truth lives under `apps/modeler/ssot/`
- This app is intended to run **independently** from `apps/site/` and `apps/viewer/`
- External libraries (e.g. three.js) are managed via the shared vendor SSOT under `packages/vendor/`
  and mirrored by sync scripts into `apps/*/public/vendor/` (generated; do not edit)

## Quick start (local)

From the repository root:

```sh
npm --prefix apps/modeler install
npm --prefix apps/modeler run dev
```

To automatically re-mirror on changes under `apps/modeler/ssot/**` and `packages/vendor/**`:

```sh
npm --prefix apps/modeler run dev -- --watch
```

This starts the **standalone dev server** (default: `http://localhost:3000`).

### Host / Port

By default the server binds to `localhost` and port `3000`.

- Change the port:

```sh
PORT=3100 npm --prefix apps/modeler run dev
```

- Bind to all interfaces (useful to access from a phone on the same LAN):

```sh
HOST=0.0.0.0 PORT=3000 npm --prefix apps/modeler run dev
```

Windows PowerShell examples:

```ps1
$env:PORT=3100; npm --prefix apps/modeler run dev
$env:HOST='0.0.0.0'; $env:PORT=3000; npm --prefix apps/modeler run dev
```

Under the hood, it runs `sync:standalone` to mirror SSOT inputs into `apps/modeler/public/` and
serves that directory so that `/vendor/**` is available (like the Site runtime).

To run Modeler as part of the full Site (Astro) dev server, use:

```sh
npm --prefix apps/site run dev
```

After `sync:all`, Modeler is mirrored under:

- `apps/site/public/modeler_app/`

and is served by Astro as part of the Site runtime.

## Quality gates (SSOT checks)

The canonical repository-wide SSOT validation is run from the repo root:

```sh
npm run check:ssot
```

This runs:
- sync:all (docs, vendor, schemas, viewer/modeler mirrors, etc.)
- vendor-required / generated-clean
- viewer/modeler SSOT checks (forbidden-imports, single-writer, ports-conformance, generated-clean)
- host asset path checks and route collision checks

## Do not edit generated mirrors

Do not directly edit any of the following (they are generated/mirrored artifacts):

- `apps/site/public/**`
- `apps/site/src/content/docs/**`
- `apps/site/src/content/faq/**`
- `apps/site/src/content/policy/**`
- `apps/*/public/vendor/**`

Edit SSOT sources instead:
- `apps/modeler/ssot/**`
- `packages/vendor/**`
- `packages/docs/**`
- `packages/schemas/**`

## Architecture reference

See:
- `packages/docs/docs/ARCHITECTURE.md`
- `packages/docs/policy/SSOT_POLICY.md`
- `AGENTS.md`
