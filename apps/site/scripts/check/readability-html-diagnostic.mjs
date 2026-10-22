// Temporary diagnostic: this file does not change site output or acceptance checks.
import fs from 'node:fs/promises';
const html = await fs.readFile(new URL('../../dist/library/index.html', import.meta.url), 'utf8');
const lines = html.split('\n');
for (const n of [80,81,82,83,84,85,86,87,88,155,156,157,158,159,160,161,162,163,164,165]) {
 console.log('[readability-html] LINE '+n+' '+JSON.stringify(lines[n-1] ?? ''));
}
for (const [i, match] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].entries()) {
 console.log('[readability-html] SCRIPT '+i+' '+JSON.stringify({attributes:match[1],code:match[2]}));
}
