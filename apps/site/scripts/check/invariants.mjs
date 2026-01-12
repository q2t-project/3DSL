// scripts/check-invariants.mjs
// Node >= 18

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");

const ROOT = siteRoot;
const CANDIDATES = [
  // 新レイアウト（いまの tree）
  path.join(ROOT, "public", "viewer", "runtime", "core"),
  path.join(ROOT, "public", "viewer", "runtime", "renderer"),
  path.join(ROOT, "public", "viewer", "runtime"),
  path.join(ROOT, "public", "viewer", "ui"),

  // 旧レイアウト（残ってたら拾う）
  path.join(ROOT, "runtime", "core"),
  path.join(ROOT, "runtime", "renderer"),
  path.join(ROOT, "runtime"),
 path.join(ROOT, "ui"),
];

const SCAN_ROOTS = CANDIDATES.filter((p) => fs.existsSync(p));

const LAYER_RULES = [
  { from: "runtime/core",     forbid: ["runtime/renderer", "runtime/viewerHub", "ui"] },
  { from: "runtime/renderer", forbid: ["runtime/core", "runtime/viewerHub", "ui"] },
  { from: "runtime/viewerHub",forbid: ["ui"] },
  { from: "runtime/bootstrap",forbid: ["ui"] },
  { from: "ui",              forbid: ["runtime/renderer"] },
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
  if (fileRel === "runtime/viewerHub.js" || fileRel.startsWith("runtime/viewerHub/")) return "runtime/viewerHub";
  if (fileRel.startsWith("ui/")) return "ui";
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
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null; // bare は無視
  if (spec.startsWith("/")) return null; // Phase0 では無視
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
  const fileRel = rel(fileAbs);
  const layer = layerOf(fileRel);
  if (!layer) continue;

  const rules = LAYER_RULES.find((x) => x.from === layer);
  if (!rules) continue;

  const src = fs.readFileSync(fileAbs, "utf8");
  const specs = extractSpecifiers(src);

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
