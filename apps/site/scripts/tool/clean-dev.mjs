// Clean common dev caches that can cause stale Astro/Vite behavior.
//
// Targets (relative to apps/site):
// - .astro
// - node_modules/.vite

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// scripts/tool -> scripts -> site root
const siteRoot = path.resolve(here, '..', '..');

const targets = [
  '.astro',
  path.join('node_modules', '.vite'),
];

for (const rel of targets) {
  const abs = path.resolve(siteRoot, rel);
  try {
    await fs.rm(abs, { recursive: true, force: true });
    console.log(`[clean:dev] removed ${rel}`);
  } catch (e) {
    // Best-effort cleanup; ignore errors such as non-existent paths.
    console.warn(`[clean:dev] skip ${rel}: ${e?.message ?? e}`);
  }
}
