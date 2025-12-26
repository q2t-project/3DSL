import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/site/scripts -> repo root
const repoRoot = path.resolve(__dirname, "../../..");

const src = path.join(repoRoot, "apps/viewer/viewer");
const dst = path.join(repoRoot, "apps/site/public/viewer");

await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });

console.log("[sync] viewer -> site/public OK");
