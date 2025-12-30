import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access, writeFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

// SSOT for site-wide static files served at /assets/*
const src = path.join(repoRoot, "apps/site/ssot_static");
const dst = path.join(repoRoot, "apps/site/public/assets");

try {
  await access(src);
} catch {
  throw new Error(`[sync] ssot_static not found: ${path.relative(repoRoot, src)}`);
}

await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });

await writeFile(
  path.join(dst, "__GENERATED_DO_NOT_EDIT__.txt"),
  "This directory is generated. Edit SSOT at apps/site/ssot_static and run npm run sync:all.\n",
  "utf8",
);

console.log(`[sync] ssot_static -> site/public/assets OK (src=${path.relative(repoRoot, src)})`);
