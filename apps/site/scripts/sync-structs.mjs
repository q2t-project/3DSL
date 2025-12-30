import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access, writeFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const src = path.join(repoRoot, "packages/structs");
const dst = path.join(repoRoot, "apps/site/public/structs");

try {
  await access(src);
} catch {
  throw new Error(`[sync] structs SSOT not found: ${path.relative(repoRoot, src)}`);
}

await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true, force: true });

await writeFile(
  path.join(dst, "__GENERATED_DO_NOT_EDIT__.txt"),
  "This directory is generated. Edit SSOT at packages/structs and run npm run sync:all.\n",
  "utf8",
);

console.log(`[sync] structs -> site/public OK (src=${path.relative(repoRoot, src)})`);
