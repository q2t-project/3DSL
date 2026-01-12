import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");


const repoRoot = siteRoot;
const domContractPath = path.join(repoRoot, "public/viewer/ui/domContract.js");
const { DOM_CONTRACT } = await import(pathToFileURL(domContractPath).href);

const defined = new Set(Object.keys(DOM_CONTRACT.roles));

const targets = [
  "public/viewer/ui/gizmo.js",
  "public/viewer/ui/timeline.js",
];

const used = new Map(); // role -> [{file, line}]
const add = (role, file, line) => {
  if (!used.has(role)) used.set(role, []);
  used.get(role).push({ file, line });
};

const reGetEl = /getEl(?:\?\.)?\(\s*["']([^"']+)["']\s*\)/g;
const reEl    = /\bel\(\s*["']([^"']+)["']\s*\)/g;

for (const rel of targets) {
  const file = path.join(repoRoot, rel);
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const s = lines[i];
    for (const re of [reGetEl, reEl]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(s))) add(m[1], rel, i + 1);
    }
  }
}

const unknown = [];
for (const [role, refs] of used.entries()) {
  if (!defined.has(role)) unknown.push({ role, refs });
}

if (unknown.length) {
  console.error("[dom-role-check] unknown roles:");
  for (const u of unknown) {
    console.error(`- ${u.role}`);
    for (const r of u.refs) console.error(`  ${r.file}:${r.line}`);
  }
  process.exit(1);
}

console.log("[dom-role-check] OK (all referenced roles exist in domContract)");
