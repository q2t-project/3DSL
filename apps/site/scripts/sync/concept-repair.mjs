import { mkdir, writeFile } from 'node:fs/promises';
import { isReviewPreview } from '../../../../packages/3dss-content/review/concept-repair/cases.mjs';

const dir = new URL('../../.generated/', import.meta.url);
const enabled = isReviewPreview();
let manifest = { enabled, cases: [], checks: [], connections: [], originPoints: [], historyLinks: [] };
if (enabled) {
  const { cases, checks, connections, originPoints, evidence } = await import('../check/concept-repair-data.mjs');
  const historyFile = '/packages/3dss-content/library/26010501/model.3dss.json';
  manifest = { enabled, cases, checks, connections, originPoints, historyLinks: [
    { label: '1月12日の内容', href: `https://github.com/q2t-project/3DSL/blob/${evidence.concept_commit}${historyFile}` },
    { label: '削除直前の内容', href: `https://github.com/q2t-project/3DSL/blob/${evidence.before_deletion_commit}${historyFile}` },
    { label: '削除差分', href: `https://github.com/q2t-project/3DSL/commit/${evidence.deletion_commit}` },
  ] };
}
await mkdir(dir, { recursive: true });
await writeFile(new URL('concept-repair.json', dir), `${JSON.stringify(manifest)}\n`);
console.log(`[sync:concept-repair] ${enabled ? '3 validated Preview cases' : 'disabled for production/unknown deployment'}`);
