import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { viewerAssetSizes, makeAssetModel, texturedGrid } from '../lib/viewer-load-fixtures.mjs';

const hash = data => createHash('sha256').update(data).digest('hex').slice(0, 16);

export async function syncViewerLoad(siteRoot) {
  const source = path.join(siteRoot, 'diagnostics/viewer-load');
  const target = path.join(siteRoot, 'public/diagnostics/viewer-load');
  const original = await readFile(path.resolve(siteRoot, '../../apps/reconstruction/ssot/models/created_3points_2lines.3dss.json'), 'utf8');
  await rm(target, {recursive:true, force:true});
  const cases = {};
  for (const spec of viewerAssetSizes) {
    const glb = texturedGrid(spec.cells,spec.width);
    const glbName = 'grid.' + hash(glb) + '.glb';
    const model = makeAssetModel(original, glbName);
    const modelName = 'scene.' + hash(model) + '.json';
    const folder = path.join(target, spec.name);
    await mkdir(folder, {recursive:true});
    await writeFile(path.join(folder, glbName), glb);
    await writeFile(path.join(folder, modelName), model);
    cases[spec.name] = {model:spec.name + '/' + modelName, triangles:2 * spec.cells**2,
      textureWidth:spec.width, glbBytes:glb.length, glbHash:hash(glb)};
  }
  const js = await readFile(path.join(source,'run.js'));
  const jsName = 'run.' + hash(js) + '.js';
  await writeFile(path.join(target,jsName),js);
  const template = await readFile(path.join(source,'index.html'),'utf8');
  await writeFile(path.join(target,'index.html'),template.replace('VIEWER_LOAD_FIXTURES',JSON.stringify(cases)).replace('./run.js','./'+jsName));
}
