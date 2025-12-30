import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

// -----------------------------
// SSOT sources
// -----------------------------
const ssotRoot = path.join(repoRoot, "packages/schemas");
const srcLatest = path.join(ssotRoot, "3DSS.schema.json");
const srcReleasesRoot = path.join(ssotRoot, "releases");

// -----------------------------
// Destinations (generated)
// -----------------------------
const dstRoot = path.join(repoRoot, "apps/site/public/3dss/3dss/release");

// Recreate destination to avoid stale files.
await rm(dstRoot, { recursive: true, force: true });
await mkdir(dstRoot, { recursive: true });

// 1) Latest canonical schema
await cp(srcLatest, path.join(dstRoot, "3DSS.schema.json"));

// 2) Versioned releases (if present)
let copiedReleases = 0;
try {
  const st = await stat(srcReleasesRoot);
  if (st.isDirectory()) {
    const entries = await readdir(srcReleasesRoot, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const srcDir = path.join(srcReleasesRoot, e.name);
      const dstDir = path.join(dstRoot, e.name);
      await mkdir(dstDir, { recursive: true });
      await cp(srcDir, dstDir, { recursive: true });
      copiedReleases++;
    }
  }
} catch {
  // releases/ not found: OK
}

console.log(`[sync] schemas -> site/public OK (latest + ${copiedReleases} release(s))`);

await writeFile(
  path.join(dstRoot, "__GENERATED_DO_NOT_EDIT__.txt"),
  "This directory is generated. Edit SSOT at packages/schemas and run npm run sync:all.\n",
  "utf8",
);
