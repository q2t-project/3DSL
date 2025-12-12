// tools/check-invariants.mjs
// Node >= 18

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_ROOTS = [
  "runtime/core",
  "runtime/renderer",
  "runtime",
  "ui",
].map((p) => path.join(ROOT, p));

const LAYER_RULES = [
  // core -> renderer / viewerHub / ui 禁止
  { from: "runtime/core", forbid: ["runtime/renderer", "runtime/viewerHub", "ui"] },

  // renderer -> core / viewerHub / ui 禁止
  { from: "runtime/renderer", forbid: ["runtime/core", "runtime/viewerHub", "ui"] },

  // viewerHub -> ui 禁止
  { from: "runtime/viewerHub", forbid: ["ui"] },

  // bootstrap(entry扱い) -> ui 禁止
  { from: "runtime/bootstrap", forbid: ["ui"] },

  // ui -> renderer 禁止（pick等は hub 経由に寄せる）
  { from: "ui", forbid: ["runtime/renderer"] },
];

function isJsLike(p) {
  return p.endsWith(".js") || p.endsWith(".mjs") || p.endsWith(".cjs");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && isJsLike(p)) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

function layerOf(fileRel) {
  if (fileRel.startsWith("runtime/core/")) return "runtime/core";
  if (fileRel.startsWith("runtime/renderer/")) return "runtime/renderer";

  // viewerHub の実体に合わせて必要なら調整
  if (fileRel === "runtime/viewerHub.js" || fileRel.startsWith("runtime/viewerHub/")) return "runtime/viewerHub";

  if (fileRel.startsWith("ui/")) return "ui";

  // bootstrapViewer*.js を entry 扱い
  if (fileRel.startsWith("runtime/bootstrapViewer")) return "runtime/bootstrap";

  return null;
}

function extractSpecifiers(src) {
  const specs = new Set();

  const reImport = /\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  const reDyn = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  const reReq = /\brequire\(\s*["']([^"']+)["']\s*\)/g;

  for (const re of [reImport, reDyn, reReq]) {
    let m;
    while ((m = re.exec(src))) specs.add(m[1]);
  }
  return [...specs];
}

function resolveImport(fromFileAbs, spec) {
  // bare specifier は無視（three など）
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null;

  // "/xxx" は project root 相対の可能性もあるが Phase0 では無視
  if (spec.startsWith("/")) return null;

  const base = path.dirname(fromFileAbs);
  return path.resolve(base, spec);
}

function startsWithDir(absFile, absDir) {
  const a = path.normalize(absFile);
  const d = path.normalize(absDir + path.sep);
  return a.startsWith(d) || a === path.normalize(absDir);
}

const violations = [];
const files = [];
for (const r of SCAN_ROOTS) walk(r, files);

for (const fileAbs of files) {
  const fileRel = rel(fileAbs);
  const layer = layerOf(fileRel);
  if (!layer) continue;

  const src = fs.readFileSync(fileAbs, "utf8");
  const specs = extractSpecifiers(src);

  const rules = LAYER_RULES.find((x) => x.from === layer);
  if (!rules) continue;

  for (const spec of specs) {
    const targetAbs = resolveImport(fileAbs, spec);
    if (!targetAbs) continue;

    for (const forbidRel of rules.forbid) {
      const forbidAbs = path.join(ROOT, forbidRel);
      if (startsWithDir(targetAbs, forbidAbs)) {
        violations.push({ file: fileRel, spec, forbid: forbidRel });
      }
    }
  }
}

if (violations.length) {
  console.error("Invariant check FAILED (forbidden imports):");
  for (const v of violations) {
    console.error(`- ${v.file} imports "${v.spec}" (forbidden: ${v.forbid})`);
  }
  process.exit(1);
}

console.log("Invariant check OK (forbidden imports).");
