// Read JSON files mirrored under apps/site/public at build/dev time.
//
// Server-only helper (Astro frontmatter / SSR). Avoid importing from client code.

import { publicDir } from 'astro:config/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cache = new Map();

/**
 * @param {string} relPath e.g. "/_data/library/library_index.json" or "_data/library/library_index.json"
 * @param {{ cacheKey?: string }} [opts]
 */
export async function readPublicJson(relPath, opts = {}) {
  const key = opts.cacheKey ?? relPath;
  if (cache.has(key)) return cache.get(key);

  const clean = String(relPath || '').replace(/^\/+/, '');
  const abs = path.resolve(fileURLToPath(publicDir), clean);

  let raw;
  try {
    raw = await fs.readFile(abs, 'utf-8');
  } catch (e) {
    const msg = [
      `[readPublicJson] failed to read: ${clean}`,
      `  resolved path: ${abs}`,
      `  hint: run \`npm --prefix apps/site run sync:all\` (or \`npm run dev\`) to mirror into /public`,
    ].join('\n');
    const err = new Error(msg);
    err.cause = e;
    throw err;
  }

  try {
    const obj = JSON.parse(raw);
    cache.set(key, obj);
    return obj;
  } catch (e) {
    const msg = [
      `[readPublicJson] invalid JSON: ${clean}`,
      `  resolved path: ${abs}`,
      `  hint: file may be truncated or not UTF-8; ensure sync script writes proper JSON`,
    ].join('\n');
    const err = new Error(msg);
    err.cause = e;
    throw err;
  }
}

/** Useful for tests / hot-reload hooks. */
export function clearPublicJsonCache() {
  cache.clear();
}
