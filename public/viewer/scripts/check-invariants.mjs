// scripts/check-invariants.mjs
// Node >= 18

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VIEWER_ROOT = path.join(ROOT, "public", "viewer");

if (!fs.existsSync(VIEWER_ROOT)) {
  console.error(`Invariant check FAILED: viewer root not found: ${VIEWER_ROOT}`);
  process.exit(1);
}

// viewer 配下だけを対象にする（Phase0）
const SCAN_ROOTS = [
  "runtime/core",
  "runtime/renderer",
  "runtime",
  "ui",
].map((p) => path.join(VIEWER_ROOT, p));

// 禁止依存（viewer runtime の層ルール）
const LAYER_RULES = [
  { from: "runtime/core", forbid: ["runtime/renderer", "runtime/viewerHub", "ui"] },
  { from: "runtime/renderer", forbid: ["runtime/core", "runtime/viewerHub", "ui"] },
  { from: "runtime/viewerHub", forbid: ["ui"] },
  { from: "runtime/bootstrap", forbid: ["ui"] },
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

function relFromViewer(absPath) {
  return path.relative(VIEWER_ROOT, absPath).replaceAll("\\", "/");
}

function layerOf(viewerRel) {
  if (viewerRel.startsWith("runtime/core/")) return "runtime/core";
  if (viewerRel.startsWith("runtime/renderer/")) return "runtime/renderer";
  if (viewerRel === "runtime/viewerHub.js") return "runtime/viewerHub";
  if (viewerRel === "runtime/bootstrapViewer.js") return "runtime/bootstrap";
  if (viewerRel.startsWith("ui/")) return "ui";
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
  // bare specifier（"three" 等）は無視
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null;

  // "/..." は public ルート相対の可能性があるけど、Phase0 は対象外にする
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

console.log(`[invariants] scan roots:`);
for (const r of SCAN_ROOTS) console.log(`- ${r}`);
console.log(`[invariants] scanned files: ${files.length}`);
if (files.length === 0) {
  console.error("Invariant check FAILED: scanned files = 0 (path mismatch?)");
  process.exit(1);
}

for (const fileAbs of files) {
  const viewerRel = relFromViewer(fileAbs);
  const layer = layerOf(viewerRel);
  if (!layer) continue;

  const rules = LAYER_RULES.find((x) => x.from === layer);
  if (!rules) continue;

  const src = fs.readFileSync(fileAbs, "utf8");
  const specs = extractSpecifiers(src);

  for (const spec of specs) {
    const targetAbs = resolveImport(fileAbs, spec);
    if (!targetAbs) continue;

    for (const forbidRel of rules.forbid) {
      const forbidAbs = path.join(VIEWER_ROOT, forbidRel);
      if (startsWithDir(targetAbs, forbidAbs)) {
        violations.push({ file: viewerRel, spec, forbid: forbidRel });
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
