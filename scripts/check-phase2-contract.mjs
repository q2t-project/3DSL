import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const BOOT_CANDIDATES = [
  path.join(ROOT, "public", "viewer", "runtime", "bootstrapViewer.js"),
  path.join(ROOT, "runtime", "bootstrapViewer.js"), // 旧
];
const BOOT_PATH = BOOT_CANDIDATES.find((p) => fs.existsSync(p));

function fail(msg) {
  console.error("[phase2:contract] FAIL:", msg);
  process.exit(1);
}

function ok(msg) {
  console.log("[phase2:contract] OK:", msg);
}

function stripComments(src) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, "");
  s = s.replace(/(^|\s)\/\/.*$/gm, "$1");
  return s;
}

function main() {
  if (!BOOT_PATH) {
    fail("bootstrapViewer.js not found (checked: public/viewer/runtime and runtime)");
  }

  const src = fs.readFileSync(BOOT_PATH, "utf8");
  const codeOnly = stripComments(src);

  const required = [
    /export\s+function\s+bootstrapViewer\s*\(/,
    /export\s+async\s+function\s+bootstrapViewerFromUrl\s*\(/,
  ];
  for (const re of required) {
    if (!re.test(src)) fail(`missing public entrypoint: ${re}`);
  }

  const validationWires = [
    /ensureValidatorInitialized\s*\(/,
    /validate3DSS\s*\(/,
  ];
  for (const re of validationWires) {
    if (!re.test(src)) fail(`missing validation wire: ${re}`);
  }

  if (/hub\s*\.\s*start\s*\(/.test(codeOnly)) {
    fail("bootstrapViewer.js calls hub.start() (render loop must be host-controlled)");
  }

  ok(
    `bootstrapViewer public contract looks consistent. (${path
      .relative(ROOT, BOOT_PATH)
      .replaceAll("\\\\", "/")})`
  );
}

main();
