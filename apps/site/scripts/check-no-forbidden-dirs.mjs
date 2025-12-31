import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd(); // apps/site
const repoRoot = path.resolve(cwd, "..", "..");

const forbidden = [
  { rel: "apps/site/src_assets", abs: path.resolve(cwd, "src_assets") },
  { rel: "apps/viewer/viewer", abs: path.resolve(repoRoot, "apps", "viewer", "viewer") },
  { rel: "apps/viewer/ssot/vendor", abs: path.resolve(repoRoot, "apps", "viewer", "ssot", "vendor") },
];

const found = forbidden.filter((x) => fs.existsSync(x.abs));
if (found.length) {
  console.error("[forbidden-dirs] FAIL: forbidden directories still exist:");
  for (const x of found) console.error(`  - ${x.rel}`);
  process.exit(1);
}

console.log("[forbidden-dirs] OK");
