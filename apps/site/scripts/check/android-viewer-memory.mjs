import { execFile } from 'node:child_process';
import { parseArgs, promisify } from 'node:util';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { connectDevTools } from '../lib/devtools.mjs';
import { dragViewer } from '../lib/viewer-load-client.mjs';
import { sampleAndroidMemory } from '../lib/android-pss.mjs';

const run = promisify(execFile);
const publicPage = 'https://3dsl.jp/diagnostics/viewer-load/';
const adb = async args => (await run('adb',args,{timeout:10000,maxBuffer:4*1024*1024,windowsHide:true})).stdout.trim();
const help = `Android Chromeで ${publicPage} を開き、USBデバッグを許可したPCから実行します。
node scripts/check/android-viewer-memory.mjs [--serial SERIAL] [--out report.json]
対象はこの検査タブです。PSSはChromeの全レンダラーと、列挙されたChrome全プロセスの標本最大値を記録します。`;

export async function runMemoryCheck({page,browser,readMeminfo,write,report,url=publicPage,signal}) {
  const state = () => page.evaluate('window.readViewerLoadReport?.() ?? null');
  const stamp = s => ({runId:s?.runId,phase:s?.phase,stage:s?.rows.length});
  let runId, sentDrag=false, staged=null;
  const deadline=Date.now()+7*60000;
  const stopIfNeeded = () => {
    signal?.throwIfAborted();
    if (Date.now()>=deadline) throw new Error('計測が制限時間内に完了しませんでした。');
  };
  const sample = () => sampleAndroidMemory(
    async () => (await browser.cmd('SystemInfo.getProcessInfo')).processInfo, readMeminfo);
  const collect = async before => {
    const values=await sample();
    const after=await state();
    report.samples.push({...values,before:stamp(before),after:stamp(after)});
    await write();
    return {after,values};
  };
  const old=await state();
  if (old?.status==='計測中') throw new Error('このタブで検査が進行中です。終了後に実行してください。');
  const dest=new URL(url);dest.searchParams.set('sample','1');
  await page.cmd('Page.enable');
  const navigation=await page.cmd('Page.navigate',{url:dest.href});
  if (navigation.errorText) throw new Error(navigation.errorText);
  while (!await page.evaluate('location.href==='+JSON.stringify(dest.href)+" && typeof window.readViewerLoadReport==='function'")) {stopIfNeeded();await delay(100);}
  await page.cmd('Page.bringToFront');
  await page.evaluate("document.getElementById('run').click()");
  runId=(await state())?.runId;
  if (!runId) throw new Error('検査を開始できませんでした。');
  try {
    while (true) {
      stopIfNeeded();
      const before=await state();
      if (before?.runId!==runId) throw new Error('計測中にタブが閉じたか再読込されました。');
      report.page=before;
      if (before.phase==='end') {
        if(before.status!=='完了') throw new Error(before.reason || before.status);
        break;
      }
      if (before.phase==='gesture' && !sentDrag) {await dragViewer(page);sentDrag=true;}
      const {after,values}=await collect(before);
      if (after?.runId!==runId) throw new Error('計測途中の記録が中断されました。');
      report.page=after;
      // Hold every rendered stage until one complete, stable native sample.
      // Samples straddling phase boundaries remain in the output.
      if (before.phase==='sample' && after.phase==='sample' && before.rows.length===after.rows.length) {
        const stage=after.rows.length;
        if (staged?.stage!==stage) staged={stage,attempts:0};
        if (values.rendererKiB!==null && values.chromeKiB!==null) {
          await page.evaluate("document.getElementById('next').click()");
        } else if (++staged.attempts>=3) {
          throw new Error('Chromeの全対象プロセスからPSSを取得できませんでした。途中の標本を保存します。');
        }
      }
      await delay(200);
    }
    const memories=report.samples;
    const max = key => {
      const present=memories.map(s=>s[key]).filter(Number.isFinite);
      return present.length ? Math.max(...present) : null;
    };
    report.maxObservedKiB={renderers:max('rendererKiB'),allChrome:max('chromeKiB')};
    if (report.maxObservedKiB.renderers===null || report.maxObservedKiB.allChrome===null) throw new Error('有効なPSS標本がありません。');
    report.status='complete';
  } finally {
    if (report.status!=='complete') {
      try {
        if ((await state())?.runId===runId) await page.evaluate("document.getElementById('stop').click()");
      } catch { /* Device disconnects leave the PC's last sample available. */ }
    }
  }
}

async function main() {
  const {values}=parseArgs({options:{serial:{type:'string'},out:{type:'string'},help:{type:'boolean'}}});
  if (values.help) {console.log(help);return;}
  const devices=(await adb(['devices'])).split(/\r?\n/).map(s=>s.trim().split(/\s+/)).filter(([,state])=>state==='device').map(([serial])=>serial);
  const serial=values.serial || (devices.length===1 ? devices[0] : null);
  if (!serial || !devices.includes(serial)) throw new Error('利用できるAndroid端末が1台必要です。複数なら --serial で選んでください。');
  const device = args => adb(['-s',serial,...args]);
  const port=await device(['forward','tcp:0','localabstract:chrome_devtools_remote']);
  if (!/^\d+$/.test(port)) throw new Error('ChromeへのADB転送を作成できませんでした。');
  const base='http://127.0.0.1:'+port;
  const json=async pathname => {
    const response=await fetch(base+pathname,{signal:AbortSignal.timeout(7000)});
    if (!response.ok) throw new Error('DevTools HTTP '+response.status);
    return response.json();
  };
  const wsUrl = raw => {const u=new URL(raw);u.host='127.0.0.1:'+port;return u.href;};
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const output=path.resolve(values.out || 'android-viewer-'+stamp+'.json');
  const report={version:1,status:'incomplete',startedAt:new Date().toISOString(),device:{},samples:[],
    scope:'ADB connected device; CDP-driven touch; sampled PSS KiB for all Chrome renderers and enumerated Chrome processes, including other tabs. Samples are sequential; unobserved instantaneous peaks and GPU VRAM are not measured.'};
  const write=async()=>{await writeFile(output+'.tmp',JSON.stringify(report,null,2));await rename(output+'.tmp',output);};
  let browser,page,ownsFile=false;
  const stop=new AbortController();
  const interrupt=()=>stop.abort(new Error('PCで計測を中断しました。'));
  process.once('SIGINT',interrupt);
  try {
    const matches=(await json('/json/list')).filter(t=>{
      if(t.type!=='page')return false;
      try {const u=new URL(t.url);return u.origin+u.pathname===publicPage;} catch {return false;}
    });
    if(matches.length!==1)throw new Error('Android Chromeで検査ページを1つだけ開いてください。 '+publicPage);
    const build=await json('/json/version');
    browser=await connectDevTools(wsUrl(build.webSocketDebuggerUrl));
    page=await connectDevTools(wsUrl(matches[0].webSocketDebuggerUrl));
    report.device={model:await device(['shell','getprop','ro.product.model']),android:await device(['shell','getprop','ro.build.version.release']),
      emulatorProperty:await device(['shell','getprop','ro.kernel.qemu']),chrome:build.Browser};
    await mkdir(path.dirname(output),{recursive:true});
    await writeFile(output,JSON.stringify(report,null,2),{flag:'wx'});ownsFile=true;
    await runMemoryCheck({page,browser,readMeminfo:pid=>device(['shell','dumpsys','meminfo',String(pid)]),write,report,signal:stop.signal});
    console.log('観測最大PSS（KiB）',report.maxObservedKiB);
  } catch (error) {report.failure=String(error.message || error);throw error;}
  finally {
    process.removeListener('SIGINT',interrupt);
    page?.close();browser?.close();
    await device(['forward','--remove','tcp:'+port]).catch(()=>{});
    if(ownsFile) {report.endedAt=new Date().toISOString();await write();console.log(output);}
  }
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error=>{console.error(error.message||error);process.exitCode=1;});
}
