# Vendor update procedure

This repo vendors selected third‑party packages under `packages/vendor/**` and mirrors them into the site runtime via:

- `npm --prefix apps/site run sync:vendor`

Goals:
- Keep vendor changes reproducible.
- Avoid committing generated mirrors under `apps/site/public/**`.

## Hard rules
- **SSOT** is `packages/vendor/**`.
- The following are **generated mirrors** and must not be tracked (Git index):
  - `apps/site/public/vendor/`
  - `apps/site/public/viewer/`
  - `apps/site/public/modeler_app/`
  - `apps/site/public/schemas/`
  - `apps/site/public/_data/`
  - `apps/site/public/fixtures/`

If any of the above gets tracked, `npm --prefix apps/site run check:generated-clean` will fail.

## Standard workflow
1) Update vendored sources under `packages/vendor/**`.

2) Mirror to site public:
- `npm --prefix apps/site run sync:vendor`

3) Run full SSOT checks:
- `npm run check:ssot`

4) Review Git status:
- Only `packages/vendor/**` (and related docs/scripts) should be staged.
- Do not stage `apps/site/public/**` mirrors.

## Example: add/update three.js examples (GLTFLoader, etc.)
If runtime imports expect `.../examples/jsm/**` under `/vendor/three/`:

- Copy the needed subtree from an upstream three.js package into `packages/vendor/three/examples/jsm/`.

On Windows, mirroring a full directory is easiest with `robocopy`:
```powershell
robocopy <source> packages\vendor\three\examples\jsm /MIR
```

Then run `sync:vendor` and `check:ssot`.

## Fixing accidental tracking of generated mirrors
If generated mirrors got added to the Git index, remove them from index (keep working tree):

```bash
git rm -r --cached apps/site/public/viewer apps/site/public/modeler_app apps/site/public/vendor apps/site/public/schemas apps/site/public/_data apps/site/public/fixtures
```

Then ensure `apps/site/.gitignore` contains the corresponding ignore entries and rerun `npm run sync:all`.
