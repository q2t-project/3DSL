import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, cp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

// SSOT (source of truth)
const src = path.resolve(repoRoot, "packages/vendor");
// generated
const dst = path.resolve(repoRoot, "apps/site/public/vendor");

function mustExistDir(p) {
  if (!existsSync(p)) {
    console.error("[sync] vendor SSOT not found: " + p);
    console.error("[sync] create packages/vendor first (e.g. restore from your repo / vendor source).");
    process.exit(1);
  }
}

function mustExistFile(p, hint) {
  if (!existsSync(p)) {
    console.error("[sync] required file not found: " + p);
    if (hint) console.error(hint);
    process.exit(1);
  }
}


mustExistDir(src);

// Ajv is sourced from apps/site/node_modules and bundled into an ESM file for browser import.
// We do NOT rely on ajv/dist/ajv.js being ESM-compatible as-is.
const require = createRequire(import.meta.url);
const ajvEntry = require.resolve("ajv/dist/ajv.js", { paths: [siteRoot] });
const ajvFormatsEntry = require.resolve("ajv-formats", { paths: [siteRoot] });
mustExistFile(ajvEntry, "[sync] run: (cd apps/site && npm ci)");
mustExistFile(ajvFormatsEntry, "[sync] run: (cd apps/site && npm ci)");

// rm first to prevent stale vendor files
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true, force: true });

// Bundle Ajv (+ ajv-formats) for runtime use.
// Output path is what the runtime imports: /vendor/ajv/dist/ajv.js
const ajvOutDir = path.resolve(dst, "ajv", "dist");
await rm(path.resolve(dst, "ajv"), { recursive: true, force: true });
await mkdir(ajvOutDir, { recursive: true });

const shimPath = path.resolve(ajvOutDir, "__entry_ajv_esbuild__.mjs");
await writeFile(
  shimPath,
  [
    `import Ajv from ${JSON.stringify(ajvEntry)};`,
    `import addFormats from ${JSON.stringify(ajvFormatsEntry)};`,
    `export default Ajv;`,
    `export { addFormats };`,
    "",
  ].join("\n"),
  "utf8",
);

await esbuild.build({
  entryPoints: [shimPath],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  outfile: path.resolve(ajvOutDir, "ajv.js"),
  logLevel: "silent",
});

// Keep the entry shim out of the published vendor directory.
await rm(shimPath, { force: true });

console.log("[sync] vendor -> site/public OK");
