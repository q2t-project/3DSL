// Persist findings for review. A report with advisories is not a security pass.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const output = process.argv[2] || 'ci-logs/npm-audit.json';
if (!process.env.npm_execpath) throw new Error('Run npm run audit:report from apps/site.');
const result = spawnSync(process.execPath,
  [process.env.npm_execpath, 'audit', '--json', '--fetch-retries=1', '--fetch-timeout=20000'],
  { encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, result.stdout || '{}');
if (result.error) throw result.error;
const report = JSON.parse(result.stdout);
if (![0, 1].includes(result.status) || report.error || !report.metadata?.vulnerabilities || !report.vulnerabilities) {
  throw new Error(`Dependency audit did not produce a valid report (exit ${result.status})`);
}
const counts = report.metadata.vulnerabilities;
console.log(`[dependency-audit] ${JSON.stringify(counts)}; report=${output}`);
if (counts.total) console.warn('::warning::Known dependency advisories remain; inspect the audit artifact and docs/ops/npm-audit. This reporting step is not a security clearance.');
