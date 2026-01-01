// Apply guardrails by patching package.json scripts safely.
// Updates apps/site/package.json:
// - scripts.check:guards = node scripts/guard-prebuild.mjs
// - scripts.fix:guards   = node scripts/fix-guards.mjs
// - scripts.prebuild     = node scripts/guard-prebuild.mjs && <previous prebuild or sync:all>
// Adds repo-root convenience aliases if repoRoot/package.json exists.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..", "..");

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}
function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function ensureScripts(pkg) {
  if (!pkg.scripts) pkg.scripts = {};
  return pkg.scripts;
}

const sitePkgPath = path.join(siteRoot, "package.json");
if (!fs.existsSync(sitePkgPath)) {
  console.error("[apply] site package.json not found:", sitePkgPath);
  process.exit(1);
}

const sitePkg = readJSON(sitePkgPath);
const s = ensureScripts(sitePkg);

const prevPrebuild = s.prebuild || "npm run sync:all";

// Avoid double-wrapping
const guardCmd = "node scripts/guard-prebuild.mjs";
if (!prevPrebuild.includes("guard-prebuild.mjs")) {
  s.prebuild = `${guardCmd} && ${prevPrebuild}`;
} else {
  s.prebuild = prevPrebuild;
}

s["check:guards"] = guardCmd;
s["fix:guards"] = "node scripts/fix-guards.mjs";

writeJSON(sitePkgPath, sitePkg);
console.log("[apply] updated:", sitePkgPath);

// repo root aliases (optional)
const rootPkgPath = path.join(repoRoot, "package.json");
if (fs.existsSync(rootPkgPath)) {
  const rootPkg = readJSON(rootPkgPath);
  const rs = ensureScripts(rootPkg);

  rs["check:guards"] = "npm --prefix apps/site run check:guards";
  rs["fix:guards"] = "npm --prefix apps/site run fix:guards";
  rs["build:site"] = "npm --prefix apps/site run build";

  writeJSON(rootPkgPath, rootPkg);
  console.log("[apply] updated:", rootPkgPath);
} else {
  console.log("[apply] repo-root package.json not found; skipped alias scripts.");
}
