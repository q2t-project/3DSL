import { readFile, readdir } from 'node:fs/promises';

// /proc can be mounted in a parent PID namespace. Identify our browser among
// this Node process's children and read memory only for its renderer descendants.
export async function rendererMemory(pid) {
  const empty = {rendererProcesses:0, rendererRssBytes:null, rendererPssBytes:null};
  if (process.platform !== 'linux') return empty;
  const status = id => readFile('/proc/'+id+'/status','utf8');
  const node = (await status('self')).match(/^Pid:\s+(\d+)$/m)[1];
  const children = new Map();
  for (const id of (await readdir('/proc')).filter(name => /^\d+$/.test(name))) {
    const stat = await readFile('/proc/'+id+'/stat','utf8').catch(() => '');
    const parent = stat.slice(stat.lastIndexOf(')')+2).split(' ')[1];
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(id);
  }
  let browser;
  for (const id of children.get(node) || []) {
    const ns = (await status(id)).match(/^NSpid:\s+([\d\t ]+)$/m)?.[1];
    if (Number(ns?.trim().split(/\s+/).pop() ?? id) === pid) browser=id;
  }
  if (!browser) return empty;
  const queue = [...(children.get(browser) || [])];
  let rss = 0, pss = 0, count = 0, hasPss = true;
  while (queue.length) {
    const id = queue.pop();
    queue.push(...(children.get(id) || []));
    const args = await readFile('/proc/'+id+'/cmdline','utf8').catch(() => '');
    if (!args.includes('--type=renderer')) continue;
    rss += Number((await status(id)).match(/^VmRSS:\s+(\d+) kB$/m)[1])*1024;
    const rollup = await readFile('/proc/'+id+'/smaps_rollup','utf8').catch(() => '');
    const match = rollup.match(/^Pss:\s+(\d+) kB$/m);
    if (match) pss += Number(match[1])*1024; else hasPss=false;
    count++;
  }
  return {rendererProcesses:count,rendererRssBytes:count ? rss : null,rendererPssBytes:count && hasPss ? pss : null};
}
