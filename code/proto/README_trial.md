# P1.9 Codex Trial — 3DSS Prototype Suite

This folder hosts a minimal Validator / Modeler / Viewer toolchain for the
3DSS JSON schema. Everything runs straight in the browser using ESM modules and
CDN dependencies (Ajv + ajv-formats, three.js r160 with OrbitControls).

## Quick start

1. From the repository root launch a simple static server (the browser blocks
   `fetch()` for local files). For example:
   ```bash
   cd /workspace/3DSL
   python -m http.server 8000
   ```
2. Open the prototypes:
   - Validator: <http://localhost:8000/code/proto/validator.html>
   - Modeler: <http://localhost:8000/code/proto/modeler.html>
   - Viewer: <http://localhost:8000/code/proto/viewer.html>
3. Use the bundled samples in `code/proto/data/`:
   - `sample_valid.3dss.json` must validate successfully.
   - `sample_invalid.3dss.json` intentionally fails schema checks.

All tools compile the shared schema from `schemas/3DSS.schema.json` via Ajv 8
with ajv-formats enabled.

## Runtime logging

Each page surfaces a small runtime log console and attempts to persist entries
under `/logs/runtime/runtime-log.jsonl` using `navigator.sendBeacon`/`fetch`.
When served with a writable endpoint the log file captures each validation or
rendering event as JSON lines. Without a backend the logs stay in local storage
and the inline console.

## Viewer notes

The viewer renders point markers as spheres and lines as simple segments. Orbit
controls are enabled by default. Loading an invalid document shows validation
errors and clears the scene.
