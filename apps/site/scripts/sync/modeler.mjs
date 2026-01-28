import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(siteRoot, '..', '..');

const publicDir = path.join(siteRoot, 'public');

// NOTE (routing):
// - /modeler_app/ はコンフリクト回避のための仮ルート
// - 最終的には /modeler/ に寄せる
// - 現状の repo 状態に合わせて自動で出力先を切り替える
//   - apps/site/src/pages/modeler* が存在する間は /modeler_app/
//   - それが無くなったら /modeler/
const pagesModelerDir = path.join(siteRoot, 'src', 'pages', 'modeler');
const pagesModelerFile = path.join(siteRoot, 'src', 'pages', 'modeler.astro');

const hasPagesModeler = (await fileExists(pagesModelerDir)) || (await fileExists(pagesModelerFile));

const primaryPublicDirName = hasPagesModeler ? 'modeler_app' : 'modeler';
const primaryPublicRoot = path.join(publicDir, primaryPublicDirName);

// When /modeler/ becomes primary, keep /modeler_app/ as a lightweight redirect.
const aliasPublicDirName = primaryPublicDirName === 'modeler' ? 'modeler_app' : null;

const ssotCandidates = [
  path.join(repoRoot, 'apps', 'modeler', 'ssot'),
];

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findSsotRoot() {
  for (const p of ssotCandidates) {
		if (await fileExists(`${p}/manifest.yaml`)) return p;
  }
  throw new Error(`[sync:modeler] SSOT not found. candidates=${ssotCandidates.join(', ')}`);
}

const ssotRoot = await findSsotRoot();

// Keep ports doc up-to-date (writes ssot/_generated/PORTS.md)
const portsScript = path.join(ssotRoot, 'scripts', 'gen-ports.mjs');
if (await fileExists(portsScript)) {
  execFileSync(process.execPath, [portsScript], { cwd: ssotRoot, stdio: 'inherit' });
}

await fs.mkdir(publicDir, { recursive: true });

await fs.rm(primaryPublicRoot, { recursive: true, force: true });
await fs.cp(ssotRoot, primaryPublicRoot, { recursive: true });

// If /modeler/ is owned by Astro pages, Modeler app is synced to /modeler_app/.
// In that case, make sure legacy /public/modeler is removed so:
// - route collision checks don"t fail
// - dev users don"t accidentally open a stale /modeler/index.html
if (primaryPublicDirName === 'modeler_app') {
  await fs.rm(path.join(publicDir, 'modeler'), { recursive: true, force: true });
}

if (aliasPublicDirName) {
  const aliasRoot = path.join(publicDir, aliasPublicDirName);
  await fs.rm(aliasRoot, { recursive: true, force: true });
  await fs.mkdir(aliasRoot, { recursive: true });
  await fs.writeFile(
    path.join(aliasRoot, 'index.html'),
    `<!doctype html>\n<meta charset="utf-8">\n<meta http-equiv="refresh" content="0;url=/modeler/">\n<title>Redirect</title>\n<p>Redirecting to <a href="/modeler/">/modeler/</a>...</p>\n`,
    'utf8',
  );
}

console.log(`[sync] modeler -> site/public OK (src=${path.relative(repoRoot, ssotRoot)}, dst=apps/site/public/${primaryPublicDirName})`);
