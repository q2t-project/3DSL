import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/site/scripts -> apps/site
const siteRoot = path.resolve(__dirname, "..", "..");
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

  // We keep UI-owned subtrees that are expected to live under /ui.
  const KEEP_DIRS = new Set(["icons", "locale", "locales", "devHarnessControls"]);

  const nestedUi = path.join(uiRoot, "ui");

  // If ui/ui exists, it is almost certainly the "real ui" from the mirrored viewer root.
  // We can flatten it and drop the mirrored root artifacts safely.
  if (fs.existsSync(nestedUi) && fs.statSync(nestedUi).isDirectory()) {
    const entries = await fs.promises.readdir(uiRoot);

    for (const name of entries) {
      if (name === "ui") continue;
      if (KEEP_DIRS.has(name)) continue;
      await rm(path.join(uiRoot, name), { recursive: true, force: true });
    }

    const inner = await fs.promises.readdir(nestedUi);
    for (const name of inner) {
      const from = path.join(nestedUi, name);
      const to = path.join(uiRoot, name);
      await rm(to, { recursive: true, force: true });
      await fs.promises.rename(from, to);
    }
    await rm(nestedUi, { recursive: true, force: true });

    console.log(`[sync] viewer: pruned ui-duplicate tree (${label})`);
    return true;
  }

  // Otherwise, prune by structure: drop anything under /ui that also exists at viewer root.
  // This avoids fragile "fixed filename lists".
  const entries = await fs.promises.readdir(uiRoot);
  for (const name of entries) {
    if (KEEP_DIRS.has(name)) continue;

    const inUi = path.join(uiRoot, name);
    const inRoot = path.join(rootDir, name);

    if (fs.existsSync(inRoot)) {
      await rm(inUi, { recursive: true, force: true });
      continue;
    }

    // Also remove unexpected directories (ui should not carry viewer-root-ish subtrees).
    try {
      const st = await fs.promises.stat(inUi);
      if (st.isDirectory()) {
        await rm(inUi, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
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
const shouldSkipScripts = canPruneSource;
await cp(src, dst, {
  recursive: true,
  filter: (entry) => {
    const rel = path.relative(src, entry);
    if (!rel) return true;
    const [top] = rel.split(path.sep);
    return top !== "scripts";
  },
});

// Vendor dependencies are served from /public/vendor via sync:vendor.

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
  const ssotViewerRoot = path.join(repoRoot, "apps/viewer/ssot");
  const genPorts = path.join(ssotViewerRoot, "scripts", "gen-ports.mjs");
  execFileSync(process.execPath, [genPorts], { stdio: "inherit", cwd: ssotViewerRoot });
} catch (e) {
  throw new Error(`[sync] gen-ports failed after viewer sync: ${e?.message ?? e}`);
}

console.log(`[sync] viewer -> site/public OK (src=${path.relative(repoRoot, src)})`);
