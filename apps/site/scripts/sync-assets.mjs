import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access } from "node:fs/promises";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const src = path.join(repoRoot, "apps/site/src_assets");
const dst = path.join(repoRoot, "apps/site/public/assets");
try {
  await access(src);
} catch {
  throw new Error(`[sync] src_assets not found: ${path.relative(repoRoot, src)}`);
}
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });
console.log(`[sync] assets -> site/public OK (src=${path.relative(repoRoot, src)})`);
