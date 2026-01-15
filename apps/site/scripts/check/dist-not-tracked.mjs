// apps/site/scripts/check/dist-not-tracked.mjs
// dist is generated-only. It may exist, but must NEVER be tracked by git.
//
// Designed to run from any working directory.

import { execFileSync } from "node:child_process";
import path from "node:path";

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", ...opts }).trim();
}

function listTracked(repoRoot, relPath) {
  try {
    const out = execFileSync("git", ["ls-files", "-z", "--", relPath], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (!out || out.length === 0) return [];
    return out
      .toString("utf8")
      .split("\0")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    // CI should have git; local dev may not. If git isn't available, do not block.
    return [];
  }
}

let repoRoot = "";
try {
  repoRoot = sh("git", ["rev-parse", "--show-toplevel"]);
} catch {
  console.log("[dist] SKIP: git not available or not a git repo.");
  process.exit(0);
}

const targets = ["apps/site/dist", "packages/3dss-content/dist"];

const offenders = [];
for (const t of targets) {
  const files = listTracked(repoRoot, t);
  if (files.length) offenders.push({ t, files });
}

if (offenders.length) {
  const lines = [];
  lines.push("[dist] ERROR: dist outputs are tracked by git.");
  lines.push("       Policy: dist is build output and must be gitignored.");
  lines.push("       Fix:");
  lines.push("         1) ensure .gitignore covers: apps/site/dist/ and packages/3dss-content/dist/");
  lines.push("         2) untrack: git rm -r --cached apps/site/dist packages/3dss-content/dist");
  lines.push("         3) commit the removals");
  for (const o of offenders) {
    lines.push("");
    lines.push(`       Tracked under ${o.t}:`);
    for (const f of o.files.slice(0, 50)) lines.push(`         - ${f}`);
    if (o.files.length > 50) lines.push(`         ... (${o.files.length - 50} more)`);
  }
  console.error(lines.join("\n"));
  process.exit(2);
}

console.log("[dist] OK: dist is not tracked.");
