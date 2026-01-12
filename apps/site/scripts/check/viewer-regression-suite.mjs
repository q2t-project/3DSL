// scripts/check/viewer-regression-suite.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

const passthruArgs = process.argv.slice(2);

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false, cwd });
  return r.status === 0;
}

function runNodeIfExists(scriptPath, extraArgs = [], cwd = siteRoot) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`[viewer-regression-suite] ERROR: missing script ${scriptPath}`);
    return false;
  }
  return run(process.execPath, [scriptPath, ...extraArgs], cwd);
}

let okAll = true;

// 1) fixtures validate (schema + optional ref-integrity)
okAll = runNodeIfExists(
  path.join(siteRoot, "scripts", "validate", "3dss-fixtures.mjs"),
  ["--ref", ...passthruArgs],
  siteRoot
) && okAll;

// 2) viewer runtime contract-ish checks under site/public/viewer (only those that exist)
okAll = runNodeIfExists(path.join(siteRoot, "scripts", "check", "single-writer.mjs")) && okAll;
okAll = runNodeIfExists(path.join(siteRoot, "scripts", "check", "viewer-core-layer-contract.mjs")) && okAll;
okAll = runNodeIfExists(path.join(siteRoot, "scripts", "check", "viewer-hub-boundary-contract.mjs")) && okAll;
okAll = runNodeIfExists(path.join(siteRoot, "scripts", "check", "viewer-hub-dispose-safety.mjs")) && okAll;

// 3) forbidden-imports (viewer SSOT)
okAll = runNodeIfExists(
  path.join(repoRoot, "apps", "viewer", "ssot", "scripts", "check-forbidden-imports.mjs"),
  [],
  repoRoot
) && okAll;

process.exit(okAll ? 0 : 1);
