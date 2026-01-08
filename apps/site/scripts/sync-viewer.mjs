import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/site/scripts -> apps/site
const siteRoot = path.resolve(__dirname, "..");
// apps/site -> repo root
const repoRoot = path.resolve(siteRoot, "..", "..");

const publicDir = path.join(siteRoot, "public");
const PUBLIC_VIEWER = path.join(publicDir, "viewer");

// SSOT candidates (first match wins)
const candidates = [
  path.join(repoRoot, "apps/viewer/ssot"),
  path.join(repoRoot, "apps/viewer/public"),
  path.join(repoRoot, "apps/viewer/viewer"), // legacy (before rename)
];

// Optional: allow users to skip syncing explicitly
if (process.env.SYNC_VIEWER_SKIP === "1") {
  console.log("[sync] viewer: SKIP (SYNC_VIEWER_SKIP=1)");
  process.exit(0);
}

let src = null;
for (const p of candidates) {
  try {
    await access(p);
    src = p;
    break;
  } catch {
    // try next
  }
}

if (!src) {
  throw new Error(
    `[sync] viewer SSOT not found. tried: ${candidates.map((p) => path.relative(repoRoot, p)).join(", ")}`
  );
}

const canonicalSsot = path.join(repoRoot, "apps/viewer/ssot");
const canPruneSource = path.resolve(src) === path.resolve(canonicalSsot);

async function pruneUiDuplicateTree(rootDir, label) {
  const uiRoot = path.join(rootDir, "ui");
  const dupRuntime = path.join(uiRoot, "runtime");
  const realRuntime = path.join(rootDir, "runtime");

  // Only prune when we are sure this is an accidental mirror of the whole viewer under /ui
  if (!fs.existsSync(dupRuntime) || !fs.existsSync(realRuntime)) return false;

  const targets = [
    "runtime",
    "scripts",
    "assets",
    "spec",
    "test",
    "_generated",
    "ui",
    "index.html",
    "manifest.yaml",
    "viewer.css",
    "viewerDevHarness.js",
    "viewerHost.js",
    "viewerHostBoot.js",
    "viewer_dev.html",
    "3DSD-viewer.md",
    "DEVOPS_site.md",
    "SSOT_POLICY.md",
    "skeltonForCodex.md",
    "viewer_dom_contract.md",
    "viewer_spec_forCodex.md",
  ].map((p) => path.join(uiRoot, p));

  for (const t of targets) {
    await rm(t, { recursive: true, force: true });
  }

  console.log(`[sync] viewer: pruned ui-duplicate tree (${label})`);
  return true;
}

// --- Step4: prune accidental duplicated viewer tree under apps/viewer/ssot/ui/* ---
// This is safe and reduces future regressions.
if (canPruneSource) {
  try {
    await pruneUiDuplicateTree(src, "SSOT");
  } catch (e) {
    console.warn("[sync] viewer: SSOT ui-duplicate cleanup skipped:", e?.message ?? e);
  }
}

const dst = PUBLIC_VIEWER;

// Always mirror SSOT -> public/viewer
await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });

// Remove accidental duplicated viewer tree under public/viewer/ui/* (ui/runtime, ui/scripts, etc.)
// These duplicates break viewer layer checks (ui-layer must not contain runtime/core).
try {
  await pruneUiDuplicateTree(dst, "public/viewer");
} catch (e) {
  console.warn("[sync] viewer: public ui-duplicate cleanup skipped:", e?.message ?? e);
}

// Safety: after cleanup, the duplicate should be gone.
try {
  const dupRuntime = path.join(dst, "ui", "runtime");
  const realRuntime = path.join(dst, "runtime");
  if (fs.existsSync(dupRuntime) && fs.existsSync(realRuntime)) {
    throw new Error("ui/runtime still exists after cleanup");
  }
} catch (e) {
  throw new Error(`[sync] viewer: ui-duplicate cleanup failed: ${e?.message ?? e}`);
}

// Marker to make intent explicit
try {
  await fs.promises.writeFile(path.join(dst, ".OWNED_BY_SSOT"), "", "utf8");
} catch {}

// Guard markers expected by guard-prebuild (public/viewer is treated as deploy SSOT)
try {
  await fs.promises.writeFile(path.join(dst, ".OWNED_BY_PUBLIC"), "", "utf8");
  await fs.promises.writeFile(path.join(dst, ".public-owned"), "", "utf8");
} catch {}

// /viewer/_generated/PORTS.md を manifest.yaml と一致させる
try {
  const genPorts = path.join(dst, "scripts", "gen-ports.mjs");
  execFileSync(process.execPath, [genPorts], { stdio: "inherit" });
} catch (e) {
  throw new Error(`[sync] gen-ports failed after viewer sync: ${e?.message ?? e}`);
}

console.log(`[sync] viewer -> site/public OK (src=${path.relative(repoRoot, src)})`);
