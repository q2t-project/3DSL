import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!fs.existsSync(SRC_DIR)) {
  console.log("[host-no-src-assets] OK (no src/)");
  process.exit(0);
}

const files = walk(SRC_DIR).filter((p) =>
  /\.(astro|js|mjs|ts|tsx|css|scss|md|html)$/i.test(p)
);

const hits = [];
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  // 禁止: src/assets を import 参照（../assets や ./assets）
  if (/(from\s+["'](\.\.\/|\.\/)assets\/)/.test(s)) {
    hits.push(f);
  }
}

if (hits.length) {
  console.error("[host-no-src-assets] ERROR: src/assets import detected:");
  for (const f of hits) console.error(" - " + path.relative(ROOT, f));
  process.exit(1);
}

console.log("[host-no-src-assets] OK");
