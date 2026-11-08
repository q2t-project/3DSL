// Per-PID Android dumpsys meminfo output is in KiB. Ignore a newer process
// or diagnostic text that does not identify the requested PID.
export function parseAndroidPss(text, pid) {
  if (Number(text.match(/MEMINFO in pid\s+(\d+)\s+\[/i)?.[1]) !== pid) return null;
  const summary = text.match(/^\s*TOTAL PSS:\s*([\d,]+)\b/m);
  const table = text.match(/^\s*TOTAL\s+([\d,]+)\s+[\d,]+/m);
  const value = (summary || table)?.[1];
  return value ? Number(value.replaceAll(',','')) : null;
}

export async function sampleAndroidMemory(listProcesses, readMeminfo) {
  const list = async () => {
    const rows = await listProcesses();
    return [...new Map(rows.filter(p=>Number.isSafeInteger(p.id) && p.id>0).map(p=>[p.id,p])).values()]
      .sort((a,b)=>a.id-b.id);
  };
  const startedAt = Date.now();
  const before = await list();
  const processes = [];
  for (const {id,type} of before) {
    try {
      const pssKiB=parseAndroidPss(await readMeminfo(id), id);
      processes.push({id,type,pssKiB});
    } catch {processes.push({id,type,pssKiB:null});}
  }
  const after = await list();
  const key = rows => rows.map(p=>p.type+'-'+p.id).join(',');
  function total(group, last) {
    return group.length && key(group)===key(last) && group.every(p=>p.pssKiB!==null)
      ? group.reduce((sum,p)=>sum+p.pssKiB,0) : null;
  }
  const renderers = rows => rows.filter(p=>p.type.toLowerCase()==='renderer');
  return {startedAt,endedAt:Date.now(),processes,
    rendererKiB:total(renderers(processes),renderers(after)),
    chromeKiB:total(processes,after)};
}
