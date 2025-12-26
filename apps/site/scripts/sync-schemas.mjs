import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const src = path.join(repoRoot, "packages/schemas/3DSS.schema.json");
const dst = path.join(
  repoRoot,
  "apps/site/public/3dss/3dss/release/3DSS.schema.json"
);

await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst);

console.log("[sync] schema -> site/public OK");
