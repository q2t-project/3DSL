import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/site/scripts -> repo root
const repoRoot = path.resolve(__dirname, "../../..");

const candidates = [
  path.join(repoRoot, "apps/viewer/ssot"),
  path.join(repoRoot, "apps/viewer/public"),
  path.join(repoRoot, "apps/viewer/viewer"), // legacy (before rename)
];

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
  throw new Error(`[sync] viewer SSOT not found. tried: ${candidates.map((p) => path.relative(repoRoot, p)).join(", ")}`);
}

const dst = path.join(repoRoot, "apps/site/public/viewer");

await rm(dst, { recursive: true, force: true });
await mkdir(path.dirname(dst), { recursive: true });
await cp(src, dst, { recursive: true });

// Keep viewer-generated artifacts in sync in the generated output.
// In particular, /viewer/_generated/PORTS.md must match /viewer/manifest.yaml.
try {
  const genPorts = path.join(dst, 'scripts', 'gen-ports.mjs');
  // Use the current Node runtime (cross-platform).
  execFileSync(process.execPath, [genPorts], { stdio: 'inherit' });
} catch (e) {
  // If ports generation fails, surface the error (this should be fixed rather than ignored).
  throw new Error(`[sync] gen-ports failed after viewer sync: ${e?.message ?? e}`);
}

console.log(`[sync] viewer -> site/public OK (src=${path.relative(repoRoot, src)})`);
