import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
// SSOT (source of truth)
const src = path.resolve(repoRoot, "packages/vendor");
// generated
const dst = path.resolve(repoRoot, "apps/site/public/vendor");
if (!existsSync(src)) {
  console.error("[sync] vendor SSOT not found: " + src);
  console.error("[sync] create packages/vendor first (e.g. robocopy from old public/vendor).");
  process.exit(1);
}
// rm first to prevent stale vendor files
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true, force: true });
console.log("[sync] vendor -> site/public OK");
