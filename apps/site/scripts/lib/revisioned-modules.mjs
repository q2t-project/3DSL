import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Version the actual module URL in the HTML import map. A version on the boot
// script alone does not invalidate its transitive relative or absolute imports.
export async function versionModules(root, entry, modules) {
  const aliases = {};
  for (const url of modules) {
    const bytes = await readFile(path.join(root, url));
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const target = url.replace(/\.js$/, '.' + hash + '.js');
    await writeFile(path.join(root, target), bytes);
    aliases[url] = target;
  }
  const file = path.join(root, entry);
  const html = await readFile(file, 'utf8');
  const pattern = /(<script type="importmap">)([\s\S]*?)(<\/script>)/;
  if (!pattern.test(html)) throw new Error('Missing import map in ' + entry);
  await writeFile(file, html.replace(pattern, (_, open, json, close) => {
    const map = JSON.parse(json);
    Object.assign(map.imports, aliases);
    return open + '\n' + JSON.stringify(map, null, 2) + '\n' + close;
  }));
}
