import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

// Keep the accepted reconstruction snapshot isolated from the production
// Viewer/Modeler SSOT while it is reviewed in a Pages preview deployment.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, '../..');
const source = path.resolve(siteRoot, '../../apps/reconstruction/ssot');
const target = path.join(siteRoot, 'public/preview-reconstruction');
const routes = /(?<![\p{L}\p{N}_.-])\/(viewer|modeler_app|contract_viewer|shared|models|schemas|vendor|viewer_tuning\.css|RECONSTRUCTION\.html|OPEN_MODELS\.html)(?=\/|["'`?&#]|$)/gu;

await rm(target, { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });

async function rewrite(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) {
      await rewrite(file);
    } else if (item.isFile() && /\.(?:html|js|css)$/.test(item.name)) {
      const original = await readFile(file, 'utf8');
      const updated = original.replace(routes, '/preview-reconstruction/$1');
      if (updated !== original) await writeFile(file, updated);
    }
  }
}

await rewrite(target);
// Site documentation is available only in the hosted package. Preserve the
// standalone ZIP's self-contained navigation and add this link while syncing.
const siteGuidance = '<p><a href="/docs/usage/create-save-read">作る・保存する・開き直す — 形式と未適用入力の扱い</a></p>'
  + '<p>指定の練習用7サンプルは、自分の端末内で複製・編集・保存できます。<a href="/policy/content-usage#practice-samples">対象ファイルと利用条件</a>をご確認ください。</p>';
for (const name of ['RECONSTRUCTION.html', 'OPEN_MODELS.html']) {
  const file = path.join(target, name);
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace('</h1>', `</h1>\n${siteGuidance}`));
}
// Disk-backed diagnostics depend on the Python launcher and cannot run on
// static hosting. Keep the local source intact; ship an explicit notice here.
await cp(path.resolve(source, '../hosting/modeler-diagnostics.html'),
  path.join(target, 'modeler_app/ui/diagnostics/index.html'));
await cp(path.join(target, 'RECONSTRUCTION.html'), path.join(target, 'index.html'));
console.log('[sync] reconstruction preview -> site/public/preview-reconstruction');
