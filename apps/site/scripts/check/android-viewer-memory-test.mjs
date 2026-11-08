import assert from 'node:assert/strict';
import { connectDevTools } from '../lib/devtools.mjs';
import { parseAndroidPss, sampleAndroidMemory } from '../lib/android-pss.mjs';
import { runMemoryCheck } from './android-viewer-memory.mjs';
import { serveBuild, withBrowser, waitFor } from './site-browser.mjs';

const classic='** MEMINFO in pid 42 [com.android.chrome] **\n  TOTAL 4501 380 80 1 0 0\n';
const modern=classic+'       TOTAL PSS:    4,512            TOTAL RSS:    72520\n';
assert.equal(parseAndroidPss(modern,42),4512);
assert.equal(parseAndroidPss(classic,42),4501);
assert.equal(parseAndroidPss(modern,499),null);
assert.equal(parseAndroidPss('No process found',42),null);
const group=[{id:11,type:'browser'},{id:22,type:'renderer'}];
const text=(id,pss)=>'** MEMINFO in pid '+id+' [test] **\n TOTAL PSS: '+pss+' TOTAL RSS: 9999';
const missing=await sampleAndroidMemory(async()=>group,async id=>id===22 ? text(id,888) : 'permission denied');
assert.equal(missing.rendererKiB,888);assert.equal(missing.chromeKiB,null);
let reads=0;
const exchanged=await sampleAndroidMemory(async()=>reads++ ? [group[0],{id:33,type:'renderer'}] : group,async id=>text(id,100));
assert.equal(exchanged.rendererKiB,null);assert.equal(exchanged.chromeKiB,null);

const server=await serveBuild();
try {
  await withBrowser(async page=>{
    const url=server.origin+'/diagnostics/viewer-load/';
    const version=await (await fetch('http://127.0.0.1:'+page.port+'/json/version')).json();
    const browser=await connectDevTools(version.webSocketDebuggerUrl);
    try {
      await page.cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      await page.cmd('Emulation.setTouchEmulationEnabled',{enabled:true});
      await page.cmd('Page.navigate',{url});
      await waitFor(()=>page.evaluate("typeof readViewerLoadReport==='function'"),'page');
      const report={status:'incomplete',samples:[]};
      const run=(report,readMeminfo)=>runMemoryCheck({page,browser,report,readMeminfo,write:async()=>{},url});
      // Real CDP/browser/tab, deterministic native readouts. No device metrics are asserted.
      await run(report,async id=>text(id,2048));
      assert.equal(report.status,'complete');assert.equal(report.page.rows[3].gesture,'touch');
      for (let stage=0;stage<=5;stage++) {
        assert(report.samples.some(s=>s.before.stage===stage && s.after.stage===stage &&
          s.before.phase==='sample' && s.after.phase==='sample' && s.rendererKiB>0 && s.chromeKiB>0));
      }
      const incomplete={status:'incomplete',samples:[]};
      await assert.rejects(run(incomplete,async()=>''),/PSS/);
      assert(!incomplete.maxObservedKiB);
      await waitFor(()=>page.evaluate("readViewerLoadReport()?.status==='中断'"),'stop partial run');
    } finally {browser.close();}
  });
} finally {await server.close();}
console.log('[android-memory-test] PASS real CDP flow with simulated dumpsys values; missing/changing PIDs excluded, six paced checkpoints and interruption. Android hardware not measured.');
