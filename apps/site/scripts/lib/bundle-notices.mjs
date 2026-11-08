import fs from 'node:fs/promises';
import path from 'node:path';

// Resolve each package from its actual emitted inputs, including nested installations.
export async function bundleNotices(metafile, workingDirectory) {
  const roots = new Set();
  for (const output of Object.values(metafile.outputs)) {
    for (const [file, { bytesInOutput }] of Object.entries(output.inputs)) {
      if (!bytesInOutput) continue;
      const normalized = file.replaceAll('\\', '/');
      const marker = 'node_modules/';
      const start = normalized.lastIndexOf(marker);
      if (start === -1) continue;
      const nameStart = start + marker.length;
      const name = normalized.slice(nameStart).match(/^(?:@[^/]+\/)?[^/]+/)[0];
      roots.add(path.resolve(workingDirectory, normalized.slice(0, nameStart + name.length)));
    }
  }
  const records = [];
  for (const root of roots) {
    const { name, version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
    const files = (await fs.readdir(root)).filter(file => /^(?:licen[cs]e|copying|notice)(?:\.|$)/i.test(file)).sort();
    if (!files.length) throw new Error(`Review the distribution notice for bundled ${name}@${version}`);
    records.push({ name, version, root, files });
  }
  records.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.version.localeCompare(b.version, 'en'));
  const packages = {}, notices = new Map();
  for (const { name, version, root, files } of records) {
    const multiple = records.some(other => other.name === name && other.version !== version);
    const label = multiple ? `${name}@${version}` : name;
    packages[label] = version;
    for (const file of files) {
      notices.set(`${label.replaceAll('/', '-')}-${file}`, await fs.readFile(path.join(root, file)));
    }
  }
  return { packages, notices };
}
