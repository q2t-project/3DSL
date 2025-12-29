import path from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/site/scripts -> repo root
const repoRoot = path.resolve(__dirname, "../../..");

const viewerRoot = path.join(repoRoot, "apps/site/public/viewer");
const genPortsPath = path.join(viewerRoot, "scripts", "gen-ports.mjs");

try {
  await access(genPortsPath);
} catch {
  throw new Error(
    `[gen-ports] missing: ${path.relative(repoRoot, genPortsPath)}. Run: npm run sync:viewer (or npm run sync:all) first.`
  );
}

execFileSync(process.execPath, [genPortsPath], { stdio: "inherit" });
