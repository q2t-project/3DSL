// scripts/check-phase3-bootstrap-contract.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function fail(msg) {
  console.error("[phase3:bootstrap-contract] FAIL:", msg);
  process.exit(1);
}
function ok(msg) {
  console.log("[phase3:bootstrap-contract] OK:", msg);
}
function warn(msg) {
  console.warn("[phase3:bootstrap-contract] WARN:", msg);
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function mustMatchAll(src, rules, label) {
  for (const re of rules) {
    if (!re.test(src)) fail(`missing ${label}: ${re}`);
  }
}
function shouldMatchAll(src, rules, label) {
  for (const re of rules) {
    if (!re.test(src)) warn(`missing (recommended) ${label}: ${re}`);
  }
}
function mustNotContainAny(src, rules, label) {
  for (const re of rules) {
    if (re.test(src)) fail(`forbidden in ${label}: ${re}`);
  }
}

function firstIndexOfRegex(src, re) {
  const m = re.exec(src);
  return m ? m.index : -1;
}

function mustAppearInOrder(src, rules, label) {
  let at = -1;
  for (const re of rules) {
    const idx = firstIndexOfRegex(src, re);
    if (idx < 0) fail(`missing (order) ${label}: ${re}`);
    if (idx < at) fail(`out-of-order ${label}: ${re}`);
    at = idx;
  }
}

function sliceExportedFunction(src, fnName) {
  const needle = `export async function ${fnName}`;
  const start = src.indexOf(needle);
  if (start < 0) return null;

  const nextExport = src.indexOf("\nexport ", start + needle.length);
  const end = nextExport >= 0 ? nextExport : src.length;
  return src.slice(start, end);
}

// bootstrapViewer.js の配置候補（新→旧）
const BOOTSTRAP_FILE_CANDIDATES = [
  path.join(ROOT, "public", "viewer", "runtime", "bootstrapViewer.js"),
  path.join(ROOT, "viewer", "runtime", "bootstrapViewer.js"),
  path.join(ROOT, "runtime", "bootstrapViewer.js"),
];

function resolveBootstrapFile() {
  for (const p of BOOTSTRAP_FILE_CANDIDATES) {
    if (existsFile(p)) return p;
  }
  return null;
}

function main() {
  const bootstrapPath = resolveBootstrapFile();
  if (!bootstrapPath) {
    fail(
      `bootstrapViewer.js not found (searched: ${BOOTSTRAP_FILE_CANDIDATES
        .map((p) => rel(p))
        .join(", ")})`
    );
  }
  ok(`bootstrap file: ${rel(bootstrapPath)}`);

  const src = readText(bootstrapPath);

  // ------------------------------------------------------------
  // 0) 必須export
  // ------------------------------------------------------------
  mustMatchAll(
    src,
    [
      /export\s+async\s+function\s+bootstrapViewer\s*\(/,
      /export\s+async\s+function\s+bootstrapViewerFromUrl\s*\(/,
    ],
    "exported entrypoints"
  );

  // ------------------------------------------------------------
  // 1) A-9 devBootLog の出力フォーマット（雑でも効く）
  // ------------------------------------------------------------
  mustMatchAll(
    src,
    [
      /logger\(\s*`BOOT\s+\$\{label\}`\s*\)/,
      /MODEL\s+/,
      /CAMERA\s+/,
      /LAYERS\s+points=/,
      /FRAME\s+frame_id=/,
    ],
    "A-9 dev boot log tokens"
  );

  // devBootLog: position fallback（theta/phi/distance + target → position）
  mustMatchAll(
    src,
    [
      /derivePosFromOrbit\s*=\s*\(st\)\s*=>/,
      /Math\.sin\s*\(\s*phi\s*\)/,
      /Math\.cos\s*\(\s*phi\s*\)/,
      /Math\.sin\s*\(\s*theta\s*\)/,
      /Math\.cos\s*\(\s*theta\s*\)/,
      /posForLog\s*=\s*posRaw\s*\?\?\s*\(camState\s*\?\s*derivePosFromOrbit/,
    ],
    "emitDevBootLog position fallback"
  );

  // ------------------------------------------------------------
  // 2) strictValidate / validateRefIntegrity の条件分岐
  // ------------------------------------------------------------
  mustMatchAll(
    src,
    [
      /const\s+strictValidate\s*=\s*options\.strictValidate\s*!==\s*false\s*;/,
      /const\s+validateRefIntegrity\s*=\s*options\.validateRefIntegrity\s*===\s*true\s*;/,
    ],
    "options branching"
  );

  // ------------------------------------------------------------
  // 3) bootstrapViewerFromUrl は fetch/json だけ（validate/freeze はしない）
  // ------------------------------------------------------------
  const fromUrlBlock = sliceExportedFunction(src, "bootstrapViewerFromUrl");
  if (!fromUrlBlock) fail("bootstrapViewerFromUrl block not found");

  mustMatchAll(
    fromUrlBlock,
    [
      /doc\s*=\s*await\s+loadJSON\s*\(\s*url\s*\)\s*;/,
      /err\.kind\s*=\s*err\.name\s*===\s*["']SyntaxError["']\s*\?\s*["']JSON_ERROR["']\s*:\s*["']FETCH_ERROR["']\s*;/,
      /return\s+await\s+bootstrapViewer\s*\(\s*canvasOrId\s*,\s*doc\s*,\s*mergedOptions\s*\)\s*;/,
    ],
    "bootstrapViewerFromUrl core behavior"
  );

  mustNotContainAny(
    fromUrlBlock,
    [
      /\bvalidate3DSS\b/,
      /\bgetErrors\b/,
      /\bassertDocumentMetaCompatibility\b/,
      /\bdeepFreeze\b/,
      /\bbuildUUIDIndex\b/,
      /\bdetectFrameRange\b/,
      /\bcreateUiState\b/,
      /\bcreateRendererContext\b/,
      /\bcreateRecomputeVisibleSet\b/,
      /\bcreateViewerHub\b/,
      /\bensureValidatorInitialized\b/,
      /\binitValidator\b/,
    ],
    "bootstrapViewerFromUrl (must be fetch/json only)"
  );
  ok("bootstrapViewerFromUrl looks minimal (fetch/json only).");

  // ------------------------------------------------------------
  // 4) bootstrapViewer の順序（validate→freeze→index→controllers→sync→metrics→camera→recompute→hub）
  // ------------------------------------------------------------
  const bootBlock = sliceExportedFunction(src, "bootstrapViewer");
  if (!bootBlock) fail("bootstrapViewer block not found");

  // ざっくり順序確認（実装詳細の揺れは許容しつつ “一本道” だけ縛る）
  mustAppearInOrder(
    bootBlock,
    [
      /const\s+strictValidate\s*=\s*options\.strictValidate\s*!==\s*false\s*;/,
      /if\s*\(\s*strictValidate\s*\)\s*\{/,
      /await\s+ensureValidatorInitialized\s*\(\s*\)\s*;/,
      /\bvalidate3DSS\s*\(\s*document3dss\s*\)/,
      /\bassertDocumentMetaCompatibility\s*\(\s*document3dss\s*\)\s*;/,
      /const\s+struct\s*=\s*deepFreeze\s*\(\s*document3dss\s*\)\s*;/,

      /const\s+canvasEl\s*=\s*resolveCanvas\s*\(/,
      /createRendererContext\s*\(\s*canvasEl\s*\)/,

      /buildUUIDIndex\s*\(\s*struct\s*\)/,
      /detectFrameRange\s*\(\s*struct\s*\)/,

      /createUiState\s*\(/,
      /createCameraEngine\s*\(/,

      /renderer\.syncDocument\s*\(/,
      /applyInitialCameraFromMetrics\s*\(/,

      /createRecomputeVisibleSet\s*\(/,
      /recomputeVisibleSet\s*\?\.\s*\(\s*\)\s*;/,
      /createViewerHub\s*\(\s*\{\s*core\s*,\s*renderer\s*\}\s*\)\s*;/,
    ],
    "bootstrapViewer normalized flow"
  );

  // syncDocument は camera 初期化より前であること（上でも見てるけど念押し）
  const idxSync = firstIndexOfRegex(bootBlock, /renderer\.syncDocument\s*\(/);
  const idxCam = firstIndexOfRegex(bootBlock, /applyInitialCameraFromMetrics\s*\(/);
  if (idxSync < 0 || idxCam < 0) fail("missing syncDocument/applyInitialCameraFromMetrics");
  if (idxSync > idxCam) fail("renderer.syncDocument must happen before applyInitialCameraFromMetrics");

  // devBootLog の呼び出し条件（true のときだけ）
  mustMatchAll(
    bootBlock,
    [
      /const\s+wantDevBootLog\s*=\s*options\.devBootLog\s*===\s*true\s*;/,
      /if\s*\(\s*wantDevBootLog\s*\)\s*emitDevBootLog\s*\(\s*core\s*,\s*options\s*\)\s*;/,
    ],
    "devBootLog gating"
  );

  ok("bootstrapViewer normalized flow looks consistent.");

  ok("Phase3 bootstrapViewer normalization contract looks consistent.");
}

main();
