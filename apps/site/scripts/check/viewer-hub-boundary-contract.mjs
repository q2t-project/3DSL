// scripts/check/viewer-hub-boundary-contract.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");

const ROOT = siteRoot;
function fail(msg) {
  console.error("[viewer-hub-boundary-contract] FAIL:", msg);
  process.exit(1);
}
function ok(msg) {
  console.log("[viewer-hub-boundary-contract] OK:", msg);
}
function warn(msg) {
  console.warn("[viewer-hub-boundary-contract] WARN:", msg);
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}
function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}
function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function mustMatchAll(src, rules, label) {
  for (const re of rules) {
    if (!re.test(src)) fail(`missing ${label}: ${re}`);
  }
}
function mustNotContainAny(src, rules, label) {
  for (const re of rules) {
    if (re.test(src)) fail(`forbidden in ${label}: ${re}`);
  }
}

const HUB_FILE_CANDIDATES = [
  path.join(ROOT, "public", "viewer", "runtime", "viewerHub.js"),
  path.join(ROOT, "viewer", "runtime", "viewerHub.js"),
  path.join(ROOT, "runtime", "viewerHub.js"),
];

function resolveHubFile() {
  for (const p of HUB_FILE_CANDIDATES) {
    if (existsFile(p)) return p;
  }
  return null;
}

function main() {
  const hubFile = resolveHubFile();
  if (!hubFile) {
    fail(
      `viewerHub.js not found (searched: ${HUB_FILE_CANDIDATES
        .map((d) => rel(d))
        .join(", ")})`
    );
  }
  ok(`hub file: ${rel(hubFile)}`);

  const src = readText(hubFile);

  // P4: hub は UI/renderer を import で引っ張らん（hub は集線＋境界＋loop）
  // NOTE: requestAnimationFrame/window は hub 側で使ってOK
  const FORBIDDEN_IMPORTS = [
    /from\s+["'][^"']*\/ui\//,
    /from\s+["'][^"']*\/renderer\//,
    /from\s+["'][^"']*three(\.module)?\.js["']/,
    /from\s+["'][^"']*\/vendor\/three\//,
  ];
  mustNotContainAny(src, FORBIDDEN_IMPORTS, `viewerHub (${rel(hubFile)})`);

  // 基本公開面
  mustMatchAll(src, [/export\s+function\s+createViewerHub\s*\(/], "createViewerHub export");

  // idempotent flags
  mustMatchAll(src, [/\brunning\s*=\s*false\b/], "running flag");
  mustMatchAll(src, [/\bdisposed\s*=\s*false\b/], "disposed flag");

  // render loop guard
  mustMatchAll(
    src,
    [/const\s+renderFrame\s*=\s*\(\s*timestamp\s*\)\s*=>/, /if\s*\(\s*disposed\s*\|\|\s*!running\s*\)/],
    "renderFrame guard"
  );

  // pickObjectAt: visibilityController.isVisible で必ず弾く
  mustMatchAll(
    src,
    [
      /\bfunction\s+isPickVisible\s*\(/,
      /\bvisibilityController\b.*\bisVisible\b/s,
      /\bpickObjectAt\s*\(\s*ndcX\s*,\s*ndcY\s*\)\s*\{/,
      /return\s+isPickVisible\s*\(\s*hit\s*\)\s*\?\s*hit\s*:\s*null\s*;/,
    ],
    "pickObjectAt visibility gating"
  );

  // resize: renderer.resize → renderer.updateCamera(getState)
  mustMatchAll(
    src,
    [
      /\bresize\s*\(\s*w\s*,\s*h\s*,\s*dpr\s*\)\s*\{/,
      /\brenderer\?\.\s*resize\?\.\s*\(/,
      /\brenderer\?\.\s*updateCamera\?\.\s*\(/,
    ],
    "resize -> updateCamera"
  );

  // microFX / selection の優先順位が崩れない（macroでselection / microでmicroFX）
  mustMatchAll(
    src,
    [
      /selectionForHighlight\s*=\s*[\s\S]*ui\.mode\s*===\s*["']macro["']/,
      /microState\s*=\s*ui\.mode\s*===\s*["']micro["']/,
    ],
    "macro selection + micro microFX gating"
  );

  // stop/dispose の分離（stopがdisposedを立てない / disposeがdisposedを立てる）
  mustMatchAll(src, [/\bstop\s*\(\)\s*\{[\s\S]*\brunning\s*=\s*false\b/], "stop sets running=false");
  mustMatchAll(src, [/\bdispose\s*\(\)\s*\{[\s\S]*\bdisposed\s*=\s*true\b/], "dispose sets disposed=true");

  ok("viewerHub boundary + loop contract looks consistent.");
}

main();
