import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, cp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { bundleNotices } from "../lib/bundle-notices.mjs";
import { syncThreeCompression } from "../lib/three-compression.mjs";

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
await syncThreeCompression(siteRoot, dst);

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

const validatorBuild = await build({
  absWorkingDir: siteRoot,
  metafile: true,
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

// Content-address the executable so an earlier immutable URL cannot hide an update.
const bundle = readFileSync(path.resolve(ajvDstDist, "ajv.bundle.js"));
const revision = createHash("sha256").update(bundle).digest("hex");
const versionedBundle = `ajv.${revision}.bundle.js`;
await writeFile(path.resolve(ajvDstDist, versionedBundle), bundle);
// ESM shim: allows `import("/vendor/ajv/dist/ajv.js")` to work in browser.
await writeFile(
  path.resolve(ajvDstDist, "ajv.js"),
  [
    `import "./${versionedBundle}";`,
    'export default globalThis.Ajv;',
    'export const Ajv = globalThis.Ajv;',
    'export const addFormats = globalThis.AjvAddFormats;',
  ].join("\n") + "\n",
  "utf8",
);

// The compatibility plugin has its own ESM bundle; publish it from the same lockfile.
const formatsDir = path.join(dst, "ajv-formats");
if (hasAjvFormats) {
  const formatsFile = path.join(formatsDir, "dist/ajv-formats.bundle.js");
  await mkdir(path.dirname(formatsFile), { recursive: true });
  const formatsBuild = await build({
    absWorkingDir: siteRoot, bundle: true, minify: true, metafile: true,
    platform: "browser", target: ["es2019"], format: "esm", outfile: formatsFile,
    stdin: { contents: 'export { default } from "ajv-formats";', resolveDir: siteRoot, sourcefile: "ajv-formats-entry.js" },
  });
  await publishMetadata(formatsDir, formatsBuild, formatsFile);
}
await publishMetadata(path.dirname(ajvDstDist), validatorBuild, path.join(ajvDstDist, versionedBundle));

async function publishMetadata(directory, result, file) {
  const { packages, notices } = await bundleNotices(result.metafile, siteRoot);
  for (const [name, contents] of notices) await writeFile(path.join(directory, name), contents);
  const record = {
    bundle: path.relative(directory, file).split(path.sep).join('/'),
    bundle_sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    packages,
    notices: [...notices.keys()],
  };
  await writeFile(path.join(directory, 'versions.json'), JSON.stringify(record, null, 2) + '\n');
}

// The legacy Modeler entry is generated before vendor sync. Preload this exact
// validator before its cached module graph evaluates globalThis.Ajv. The existing
// factory adds formats as the normal dynamic-import initialization does.
const modeler = path.resolve(siteRoot, "public/modeler_app/index.html");
if (existsSync(modeler)) {
  const entry = '<script type="module" src="./modelerHostBoot.js"></script>';
  const html = readFileSync(modeler, "utf8");
  // A previously cached unversioned boot must not keep the old message policy.
  const boot = readFileSync(path.join(path.dirname(modeler), 'modelerHostBoot.js'));
  const bootHash = createHash('sha256').update(boot).digest('hex');
  const bootName = `modelerHostBoot.${bootHash}.js`;
  await writeFile(path.join(path.dirname(modeler), bootName), boot);
  const bootstrap = `<script type="module" data-versioned-ajv="${revision}">
    try {
      await import("/vendor/ajv/dist/ajv.js?v=${revision}");
      globalThis.Ajv = globalThis.__createAjv;
    } catch (error) { console.warn("Versioned validator preload failed", error); }
    await import("./${bootName}");
  </script>`;
  // Idempotent when vendor sync is run without re-syncing Modeler first.
  const previous = /<script type="module" data-versioned-ajv="[a-f0-9]+">[\s\S]*?<\/script>/;
  if (!html.includes(entry) && !previous.test(html)) throw new Error("Legacy Modeler module entry missing");
  await writeFile(modeler, html.includes(entry) ? html.replace(entry, bootstrap) : html.replace(previous, bootstrap));
}
console.log("[sync] vendor -> site/public OK; Ajv " + revision);
