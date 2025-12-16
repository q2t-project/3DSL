import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const HUB_CANDIDATES = [
  path.join(ROOT, "public", "viewer", "runtime", "viewerHub.js"),
  path.join(ROOT, "runtime", "viewerHub.js"), // 旧
];
const HUB_PATH = HUB_CANDIDATES.find((p) => fs.existsSync(p));
if (!HUB_PATH) {
  console.error("[phase1:contract] viewerHub.js not found");
  process.exit(1);
}

function fail(msg) {
  console.error("[phase1:contract] FAIL:", msg);
  process.exit(1);
}

function ok(msg) {
  console.log("[phase1:contract] OK:", msg);
}

function count(haystack, re) {
  const m = haystack.match(re);
  return m ? m.length : 0;
}

function stripComments(js) {
  if (typeof js !== "string") return "";
  // block comments -> "", line comments -> ""
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function main() {
  if (!fs.existsSync(HUB_PATH)) {
    fail(`viewerHub.js not found: ${HUB_PATH}`);
  }

  const src = fs.readFileSync(HUB_PATH, "utf8");
  const code = stripComments(src);

  // hub 公開面（最低限）
  const requiredHubKeys = [
    /start\s*\(\)\s*\{/,
    /stop\s*\(\)\s*\{/,
    /pickObjectAt\s*\(/,
    /viewerSettings\s*,/,
    /core:\s*\{/,
  ];

  for (const re of requiredHubKeys) {
    if (!re.test(code)) fail(`missing hub surface: ${re}`);
  }

  // viewerSettings: world axes
  const worldAxes = [
    /setWorldAxesVisible\s*\(/,
    /toggleWorldAxes\s*\(/,
    /getWorldAxesVisible\s*\(/,
    /onWorldAxesChanged\s*\(/,
  ];
  for (const re of worldAxes) {
    if (!re.test(code)) fail(`missing viewerSettings(worldAxes): ${re}`);
  }

  // viewerSettings: FOV (Phase2 必須)
  const fov = [
    /setFov\s*\(/,
    /getFov\s*\(/,
    /onFovChanged\s*\(/,
  ];
  for (const re of fov) {
    if (!re.test(code)) fail(`missing viewerSettings(fov): ${re}`);
  }

  // viewerSettings: Phase5 で撤去した “line width mode” の残骸があれば落とす
  const forbidLineWidth = [
    new RegExp("\\b" + "line" + "Width" + "Mode" + "\\b"),
    new RegExp("\\b" + "set" + "Line" + "Width" + "Mode" + "\\s*\\("),
    new RegExp("\\b" + "get" + "Line" + "Width" + "Mode" + "\\s*\\("),
    new RegExp("\\b" + "on" + "Line" + "Width" + "Mode" + "Changed" + "\\s*\\("),
  ];
  for (const re of forbidLineWidth) {
    if (re.test(code)) fail(`forbidden viewerSettings line-width residue: ${re}`);
  }

  // viewerSettings: microFX profile
  const microFX = [
    /setMicroFXProfile\s*\(/,
    /getMicroFXProfile\s*\(/,
    /onMicroFXProfileChanged\s*\(/,
  ];
  for (const re of microFX) {
    if (!re.test(code)) fail(`missing viewerSettings(microFXProfile): ${re}`);
  }

  // ついでにコピペ事故の早期検出（重複定義）
  const dupChecks = [
    ["getFov", /getFov\s*\(/g],
    ["onFovChanged", /onFovChanged\s*\(/g],
    ["getMicroFXProfile", /getMicroFXProfile\s*\(/g],
    ["onMicroFXProfileChanged", /onMicroFXProfileChanged\s*\(/g],
  ];
  for (const [name, re] of dupChecks) {
    const n = count(code, re);
    if (n !== 1) fail(`expected exactly 1 "${name}" but found ${n}`);
  }

  ok("viewerHub public contract looks consistent.");
}

main();
