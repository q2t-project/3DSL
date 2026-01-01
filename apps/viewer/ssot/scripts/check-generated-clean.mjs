// scripts/check-generated-clean.mjs
// Fails if /viewer/_generated/* is not up to date with /viewer/manifest.yaml.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cmd = process.execPath; // node
const script = path.join(__dirname, 'gen-ports.mjs');

const r = spawnSync(cmd, [script, '--check'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
