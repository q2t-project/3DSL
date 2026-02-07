import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, cp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

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

// Ajv is bundled for browser use.
// NOTE: node_modules/ajv/dist/ajv.js is CommonJS and cannot be imported directly in browser ESM.
// We generate /public/vendor/ajv/dist/ajv.bundle.js (IIFE) + a small ESM shim at /public/vendor/ajv/dist/ajv.js.
const ajvPkgDir = path.resolve(siteRoot, "node_modules", "ajv");
mustExistDir(ajvPkgDir);
const hasAjvFormats = existsSync(path.resolve(siteRoot, "node_modules", "ajv-formats"));

// rm first to prevent stale vendor files
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true, force: true });

// Bundle Ajv for browser runtime.
const ajvDstDist = path.resolve(dst, "ajv", "dist");
await rm(path.resolve(dst, "ajv"), { recursive: true, force: true });
await mkdir(ajvDstDist, { recursive: true });

const { build } = await import("esbuild");

const entry = [
  'import Ajv from "ajv";',
  hasAjvFormats ? 'import addFormats from "ajv-formats";' : '',
  'globalThis.Ajv = Ajv;',
  hasAjvFormats ? 'globalThis.AjvAddFormats = addFormats;' : 'globalThis.AjvAddFormats = null;',
  // also keep a convenience factory
  'globalThis.__createAjv = function createAjv(opts){',
  '  const a = new Ajv(opts || {});',
  '  if (globalThis.AjvAddFormats) globalThis.AjvAddFormats(a);',
  '  return a;',
  '};',
].filter(Boolean).join("\n");

await build({
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: "browser",
  target: ["es2019"],
  format: "iife",
  outfile: path.resolve(ajvDstDist, "ajv.bundle.js"),
  stdin: {
    contents: entry,
    resolveDir: siteRoot,
    sourcefile: "ajv-bundle-entry.js",
  },
});

// ESM shim: allows `import("/vendor/ajv/dist/ajv.js")` to work in browser.
await writeFile(
  path.resolve(ajvDstDist, "ajv.js"),
  [
    'import "./ajv.bundle.js";',
    'export default globalThis.Ajv;',
    'export const Ajv = globalThis.Ajv;',
    'export const addFormats = globalThis.AjvAddFormats;',
  ].join("\n") + "\n",
  "utf8",
);

console.log("[sync] vendor -> site/public OK");
