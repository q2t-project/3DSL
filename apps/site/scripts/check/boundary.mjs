// apps/site/scripts/check-boundary.mjs
// apps/site/src/** must never reference packages/3dss-content (even read-only).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");

const SRC_ROOT = path.resolve(siteRoot, "src"); // apps/site/src
const EXT_OK = new Set([".astro", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".md", ".mdx", ".css"]);

const FORBIDDEN = [
  { name: "packages/3dss-content", re: /packages[\\/]+3dss-content/ig },
  { name: "relative-to-packages", re: /(\.\.[\\/]){2,}packages[\\/]/ig },
  { name: "file-url-to-packages", re: /file:\/*.*packages[\\/]+3dss-content/ig }
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (EXT_OK.has(path.extname(ent.name))) out.push(p);
  }
  return out;
}

function lineInfo(text, index) {
  const pre = text.slice(0, index);
  const line = pre.split("\n").length;
  const col = index - pre.lastIndexOf("\n");
  return { line, col };
}

const files = fs.existsSync(SRC_ROOT) ? walk(SRC_ROOT) : [];
const hits = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      const { line, col } = lineInfo(text, m.index);
      hits.push({
        file: path.relative(siteRoot, file),
        rule: rule.name,
        line,
        col,
        snippet: text.split("\n")[line - 1]?.trim() ?? ""
      });
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
    }
    rule.re.lastIndex = 0;
  }
}

if (hits.length) {
  console.error("\n[check:boundary] VIOLATION: apps/site/src must not reference packages/3dss-content.\n");
  for (const h of hits) {
    console.error(`- ${h.file}:${h.line}:${h.col}  (${h.rule})`);
    console.error(`  ${h.snippet}\n`);
  }
  process.exit(1);
}

console.log("[check:boundary] OK");
