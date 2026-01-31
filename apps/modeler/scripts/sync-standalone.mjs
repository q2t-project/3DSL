// apps/modeler/scripts/sync-standalone.mjs
// Standalone sync for Modeler dev: mirrors SSOT inputs into apps/modeler/public/
//
// Mirrors:
// - packages/vendor/**   -> apps/modeler/public/vendor/**
// - apps/modeler/ssot/** -> apps/modeler/public/modeler_app/**
//
// public/** is generated output for standalone serving; do not edit mirrored files directly.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/modeler/scripts -> repo root
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const srcVendor = path.join(repoRoot, "packages", "vendor");
const srcSsot = path.join(repoRoot, "apps", "modeler", "ssot");

const dstPublic = path.join(repoRoot, "apps", "modeler", "public");
const dstVendor = path.join(dstPublic, "vendor");
const dstApp = path.join(dstPublic, "modeler_app");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);

    if (ent.isDirectory()) {
      copyDir(s, d);
      continue;
    }

    if (ent.isSymbolicLink()) {
      const real = fs.realpathSync(s);
      const stat = fs.statSync(real);
      if (stat.isDirectory()) copyDir(real, d);
      else {
        ensureDir(path.dirname(d));
        fs.copyFileSync(real, d);
      }
      continue;
    }

    ensureDir(path.dirname(d));
    fs.copyFileSync(s, d);
  }
}

function writeIndexHtml() {
  const fp = path.join(dstPublic, "index.html");
  const html = `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>3DSD Modeler</title>
<meta http-equiv="refresh" content="0; url=./modeler_app/" />
<a href="./modeler_app/">Open Modeler</a>
`;
  fs.writeFileSync(fp, html, "utf8");
}

function main() {
  if (!fs.existsSync(srcVendor)) {
    console.error("[modeler sync] missing packages/vendor (SSOT):", srcVendor);
    process.exit(1);
  }
  if (!fs.existsSync(srcSsot)) {
    console.error("[modeler sync] missing apps/modeler/ssot (SSOT):", srcSsot);
    process.exit(1);
  }

  rmrf(dstVendor);
  rmrf(dstApp);
  ensureDir(dstPublic);

  copyDir(srcVendor, dstVendor);
  copyDir(srcSsot, dstApp);
  writeIndexHtml();

  console.log("[modeler sync] OK: vendor -> public/vendor, ssot -> public/modeler_app");
}

main();
