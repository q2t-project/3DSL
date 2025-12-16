// scripts/check-phase2-core-contract.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function fail(msg) {
  console.error("[phase2:core-contract] FAIL:", msg);
  process.exit(1);
}
function ok(msg) {
  console.log("[phase2:core-contract] OK:", msg);
}
function warn(msg) {
  console.warn("[phase2:core-contract] WARN:", msg);
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
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

// core の配置候補（新→旧）
const CORE_DIR_CANDIDATES = [
  path.join(ROOT, "public", "viewer", "runtime", "core"),
  path.join(ROOT, "viewer", "runtime", "core"),
  path.join(ROOT, "runtime", "core"),
];

function resolveCoreDir() {
  for (const dir of CORE_DIR_CANDIDATES) {
    if (existsDir(dir)) return dir;
  }
  return null;
}

function findCoreFile(coreDir, filename) {
  const p = path.join(coreDir, filename);
  return fs.existsSync(p) ? p : null;
}

function main() {
  const coreDir = resolveCoreDir();
  if (!coreDir) {
    fail(
      `core dir not found (searched: ${CORE_DIR_CANDIDATES
        .map((d) => rel(d))
        .join(", ")})`
    );
  }
  ok(`core dir: ${rel(coreDir)}`);

  // core 全体の「禁止import」ベースライン（雑でも効くやつ）
  // NOTE: コメントに引っかかるの嫌なら、ここは後で “import行だけ抽出” に強化してもええ
  const FORBIDDEN_IMPORTS_CORE = [
    // renderer / hub / ui への依存
    /from\s+["'][^"']*\/renderer\//,
    /from\s+["'][^"']*\/ui\//,
    /from\s+["'][^"']*viewerHub\.js["']/,
    /from\s+["'][^"']*\/viewerHub["']/,

    // three.js 直依存（coreに入れたらアウト）
    /from\s+["'][^"']*three(\.module)?\.js["']/,
    /from\s+["'][^"']*\/vendor\/three\//,

    // DOM 直叩き（coreは原則NG）
    /\bwindow\b/,
    /\bdocument\.getElementById\b/,
    /\bdocument\.querySelector\b/,
  ];

  const checks = [
    {
      name: "uiState",
      file: "uiState.js",
      required: [/createUiState\s*\(/],
    },
    {
      name: "recomputeVisibleSet",
      file: "recomputeVisibleSet.js",
      required: [/recomputeVisibleSet\s*\(/],
    },
    {
      name: "viewerSettingsController",
      file: "viewerSettingsController.js",
      required: [
        /setMicroFXProfile\s*\(/,
        /getMicroFXProfile\s*\(/,
        /onMicroFXProfileChanged\s*\(/,
        /setFov\s*\(/,
        /getFov\s*\(/,
        /onFovChanged\s*\(/,
      ],
      // renderer に触らん（雑検出＋import検出）
      forbid: [
        /\brenderer\b/,
        /\bapplyMicroFX\b/,
        /from\s+["'][^"']*\/renderer\//,
        new RegExp("\\b" + "line" + "Width" + "Mode" + "\\b"),
        new RegExp("\\b" + "set" + "Line" + "Width" + "Mode" + "\\s*\\("),
        new RegExp("\\b" + "get" + "Line" + "Width" + "Mode" + "\\s*\\("),
        new RegExp("\\b" + "on" + "Line" + "Width" + "Mode" + "Changed" + "\\s*\\("),
      ],
    },
    {
      name: "visibilityController",
      file: "visibilityController.js",
      required: [
        /getFilters\s*\(/,
        /setTypeFilter\s*\(/,
        /setAuxModule\s*\(/,
        /isVisible\s*\(/,
      ],
      recommended: [/setRecomputeHandler\s*\(/],
    },
    {
      name: "selectionController",
      file: "selectionController.js",
      required: [/select\s*\(/, /clear\s*\(/, /get\s*\(/],
      recommended: [/sanitize\s*\(/],
    },
    {
      name: "microController",
      file: "microController.js",
      required: [/refresh\s*\(/],
    },
    {
      name: "modeController",
      file: "modeController.js",
      required: [/set\s*\(/, /get\s*\(/, /focus\s*\(/, /exit\s*\(/, /canEnter\s*\(/],
    },
    {
      name: "frameController",
      file: "frameController.js",
      required: [
        /getRange\s*\(/,
        /getActive\s*\(/,
        /setActive\s*\(/,
        /startPlayback\s*\(/,
        /stopPlayback\s*\(/,
      ],
      recommended: [/updatePlayback\s*\(/],
    },
  ];

  for (const c of checks) {
    const p = findCoreFile(coreDir, c.file);
    if (!p) fail(`missing core module file: ${c.file} (coreDir=${rel(coreDir)})`);

    const src = readText(p);

    // core共通の禁止依存
    mustNotContainAny(src, FORBIDDEN_IMPORTS_CORE, `${c.name} (${rel(p)})`);

    // 個別contract
    if (c.required) mustMatchAll(src, c.required, `${c.name} (${rel(p)})`);
    if (c.recommended) shouldMatchAll(src, c.recommended, `${c.name} (${rel(p)})`);
    if (c.forbid) mustNotContainAny(src, c.forbid, `${c.name} (${rel(p)})`);

    ok(`${c.name} contract ok: ${rel(p)}`);
  }

  ok("Phase2 core public contract looks consistent.");
}

main();
