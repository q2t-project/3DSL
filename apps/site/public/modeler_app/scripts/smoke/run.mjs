// apps/modeler/ssot/scripts/smoke/run.mjs
//
// Unified smoke entrypoint (M2/A2).
// Usage:
//   npm --prefix apps/modeler run smoke
//
// Currently runs:
// - minimal-selection.mjs (selection/focus core path)
//
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runNode(rel) {
  const p = path.join(__dirname, rel);
  const r = spawnSync(process.execPath, [p], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

runNode("./minimal-selection.mjs");
