import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, cp, rm } from "node:fs/promises";
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

async function ensureAjvBundle() {
  const entry = path.resolve(siteRoot, "scripts", "ajv", "with-formats.entry.mjs");
  const outFile = path.resolve(src, "ajv", "dist", "ajv.bundle.js");

  if (existsSync(outFile)) return { built: false, outFile };

  if (!existsSync(entry)) {
    console.error("[sync] ajv bundle entry not found: " + entry);
    console.error("[sync] expected apps/site/scripts/ajv/with-formats.entry.mjs");
    process.exit(1);
  }

  await mkdir(path.dirname(outFile), { recursive: true });

  let esbuild;
  try {
    esbuild = await import("esbuild");
  } catch (e) {
    console.error("[sync] cannot import 'esbuild' (required to build ajv.bundle.js).");
    console.error("[sync] run: npm --prefix apps/site ci  (or npm i) to install devDependencies.");
    process.exit(1);
  }

  try {
    await esbuild.build({
      entryPoints: [entry],
      outfile: outFile,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: ["es2020"],
      sourcemap: false,
      minify: false,
      logLevel: "silent",
    });
  } catch (e) {
    console.error("[sync] failed to build ajv.bundle.js");
    console.error(e?.stack || String(e));
    process.exit(1);
  }

  return { built: true, outFile };
}

mustExistDir(src);

// Ensure Ajv bundle exists in SSOT before copying.
const ajvResult = await ensureAjvBundle();
if (ajvResult.built) {
  console.log("[sync] vendor: built ajv bundle -> " + path.relative(repoRoot, ajvResult.outFile));
}

// rm first to prevent stale vendor files
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true, force: true });

console.log("[sync] vendor -> site/public OK");
