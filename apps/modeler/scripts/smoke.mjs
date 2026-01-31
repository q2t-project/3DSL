import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

function run(rel) {
  const r = spawnSync(process.execPath, [path.join(repoRoot, rel)], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("apps/modeler/ssot/scripts/check-forbidden-imports.mjs");
run("apps/modeler/ssot/scripts/check-single-writer.mjs");
run("apps/modeler/ssot/scripts/check-ports-conformance.mjs");
run("apps/modeler/ssot/scripts/check-generated-clean.mjs");

console.log("SMOKE OK");
