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
// NOTE: /modeler is currently used by Astro pages (apps/site/src/pages/modeler).
// Keep the static modeler bundle under /modeler_app to avoid route collisions.
// When we migrate the public site route to /modeler, update this destination and
// remove the Astro page route.
const PUBLIC_MODELER = path.join(publicDir, "modeler_app");

// Cleanup: old experimental destination (public/modeler) caused collisions.
const PUBLIC_MODELER_OLD = path.join(publicDir, "modeler");

// SSOT candidates (first match wins)
const candidates = [
  path.join(repoRoot, "apps/modeler/ssot"),
  path.join(repoRoot, "apps/modeler/public"),
  path.join(repoRoot, "apps/modeler/modeler"), // legacy (before rename)
];

// Optional: allow users to skip syncing explicitly
if (process.env.SYNC_MODELER_SKIP === "1") {
  console.log("[sync] modeler: SKIP (SYNC_MODELER_SKIP=1)");
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
    `[sync] modeler SSOT not found. tried: ${candidates.map((p) => path.relative(repoRoot, p)).join(", ")}`
  );
}

const canonicalSsot = path.join(repoRoot, "apps/modeler/ssot");
const canPruneSource = path.resolve(src) === path.resolve(canonicalSsot);

async function pruneUiDuplicateTree(rootDir, label) {
  const uiRoot = path.join(rootDir, "ui");
  const dupRuntime = path.join(uiRoot, "runtime");
  const realRuntime = path.join(rootDir, "runtime");

  // Only prune when we are sure this is an accidental mirror of the whole modeler under /ui
  if (!fs.existsSync(dupRuntime) || !fs.existsSync(realRuntime)) return false;

  // We keep UI-owned subtrees that are expected to live under /ui.
  const KEEP_DIRS = new Set(["icons", "locale", "locales", "devHarnessControls"]);

  const nestedUi = path.join(uiRoot, "ui");

  // If ui/ui exists, it is almost certainly the "real ui" from the mirrored modeler root.
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

    console.log(`[sync] modeler: pruned ui-duplicate tree (${label})`);
    return true;
  }

  // Otherwise, prune by structure: drop anything under /ui that also exists at modeler root.
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

    // Also remove unexpected directories (ui should not carry modeler-root-ish subtrees).
    try {
      const st = await fs.promises.stat(inUi);
      if (st.isDirectory()) {
        await rm(inUi, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }

  console.log(`[sync] modeler: pruned ui-duplicate tree (${label})`);
  return true;
}

// --- Step4: prune accidental duplicated modeler tree under apps/modeler/ssot/ui/* ---
// This is safe and reduces future regressions.
if (canPruneSource) {
  try {
    await pruneUiDuplicateTree(src, "SSOT");
  } catch (e) {
    console.warn("[sync] modeler: SSOT ui-duplicate cleanup skipped:", e?.message ?? e);
  }
}

// Cleanup: previous experimental destination (public/modeler) conflicts with
// Astro route /modeler (apps/site/src/pages/modeler). Remove it before mirroring.
await rm(PUBLIC_MODELER_OLD, { recursive: true, force: true });

const dst = PUBLIC_MODELER;

// Always mirror SSOT -> public/modeler_app
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

// Remove accidental duplicated modeler tree under public/modeler_app/ui/* (ui/runtime, ui/scripts, etc.)
// These duplicates break modeler layer checks (ui-layer must not contain runtime/core).
try {
  await pruneUiDuplicateTree(dst, "public/modeler_app");
} catch (e) {
  console.warn("[sync] modeler: public ui-duplicate cleanup skipped:", e?.message ?? e);
}

// Safety: after cleanup, the duplicate should be gone.
try {
  const dupRuntime = path.join(dst, "ui", "runtime");
  const realRuntime = path.join(dst, "runtime");
  if (fs.existsSync(dupRuntime) && fs.existsSync(realRuntime)) {
    throw new Error("ui/runtime still exists after cleanup");
  }
} catch (e) {
  throw new Error(`[sync] modeler: ui-duplicate cleanup failed: ${e?.message ?? e}`);
}

// Marker to make intent explicit
try {
  await fs.promises.writeFile(path.join(dst, ".OWNED_BY_SSOT"), "", "utf8");
} catch {}

// Guard markers expected by guard-prebuild (public/modeler_app is treated as deploy SSOT)
try {
  await fs.promises.writeFile(path.join(dst, ".OWNED_BY_PUBLIC"), "", "utf8");
  await fs.promises.writeFile(path.join(dst, ".public-owned"), "", "utf8");
} catch {}

// /modeler/_generated/PORTS.md を manifest.yaml と一致させる
try {
  const ssotModelerRoot = path.join(repoRoot, "apps/modeler/ssot");
  const genPorts = path.join(ssotModelerRoot, "scripts", "gen-ports.mjs");
  execFileSync(process.execPath, [genPorts], { stdio: "inherit", cwd: ssotModelerRoot });
} catch (e) {
  throw new Error(`[sync] gen-ports failed after modeler sync: ${e?.message ?? e}`);
}

// --- StepX: do NOT publish markdown files under /public/modeler_app ---
// Docs are served under /docs. Keeping raw .md under /modeler causes conflicts.
async function removeMarkdownUnder(rootDir) {
  const stack = [rootDir];
  while (stack.length) {
    const cur = stack.pop();
    let ents;
    try {
      ents = await fs.promises.readdir(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        stack.push(p);
        continue;
      }
      if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
        await rm(p, { force: true });
      }
    }
  }
}

try {
  await removeMarkdownUnder(dst);
} catch (e) {
  console.warn("[sync] modeler: markdown cleanup skipped:", e?.message ?? e);
}

console.log(`[sync] modeler -> site/public OK (src=${path.relative(repoRoot, src)}, dst=${path.relative(siteRoot, dst)})`);
