import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..", "..");


const ROOT = siteRoot;
const HUB_CANDIDATES = [
  path.join(ROOT, "public", "viewer", "runtime", "viewerHub.js"),
  path.join(ROOT, "runtime", "viewerHub.js"), // 旧
];
const HUB_PATH = HUB_CANDIDATES.find((p) => fs.existsSync(p));
if (!HUB_PATH) {
  console.error("[viewer-hub-surface-contract] viewerHub.js not found");
  process.exit(1);
}

function fail(msg) {
  console.error("[viewer-hub-surface-contract] FAIL:", msg);
  process.exit(1);
}

function ok(msg) {
  console.log("[viewer-hub-surface-contract] OK:", msg);
}

function count(haystack, re) {
  const m = haystack.match(re);
  return m ? m.length : 0;
}

function main() {
  if (!fs.existsSync(HUB_PATH)) {
    fail(`viewerHub.js not found: ${HUB_PATH}`);
  }

  const src = fs.readFileSync(HUB_PATH, "utf8");

  // hub 公開面（最低限）
  const requiredHubKeys = [
    /start\s*\(\)\s*\{/,
    /stop\s*\(\)\s*\{/,
    /pickObjectAt\s*\(/,
    /viewerSettings\s*,/,
    /core:\s*\{/,
  ];

  for (const re of requiredHubKeys) {
    if (!re.test(src)) fail(`missing hub surface: ${re}`);
  }

  // viewerSettings: world axes
  const worldAxes = [
    /setWorldAxesVisible\s*\(/,
    /toggleWorldAxes\s*\(/,
    /getWorldAxesVisible\s*\(/,
    /onWorldAxesChanged\s*\(/,
  ];
  for (const re of worldAxes) {
    if (!re.test(src)) fail(`missing viewerSettings(worldAxes): ${re}`);
  }

  // viewerSettings: line width mode
  const lineWidth = [
    /setLineWidthMode\s*\(/,
    /getLineWidthMode\s*\(/,
    /onLineWidthModeChanged\s*\(/,
  ];
  for (const re of lineWidth) {
    if (!re.test(src)) fail(`missing viewerSettings(lineWidthMode): ${re}`);
  }

  // viewerSettings: microFX profile
  const microFX = [
    /setMicroFXProfile\s*\(/,
    /getMicroFXProfile\s*\(/,
    /onMicroFXProfileChanged\s*\(/,
  ];
  for (const re of microFX) {
    if (!re.test(src)) fail(`missing viewerSettings(microFXProfile): ${re}`);
  }

  // ついでにコピペ事故の早期検出（重複定義）
  const dupChecks = [
    ["getLineWidthMode", /getLineWidthMode\s*\(/g],
    ["onLineWidthModeChanged", /onLineWidthModeChanged\s*\(/g],
    ["getMicroFXProfile", /getMicroFXProfile\s*\(/g],
    ["onMicroFXProfileChanged", /onMicroFXProfileChanged\s*\(/g],
  ];
  for (const [name, re] of dupChecks) {
    const n = count(src, re);
    if (n !== 1) fail(`expected exactly 1 "${name}" but found ${n}`);
  }

  ok("viewerHub public contract looks consistent.");
}

main();
