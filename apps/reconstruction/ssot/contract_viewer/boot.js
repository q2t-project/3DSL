import { mountViewerHost } from '../viewer/viewerHost.js';
import { createCoreControllers } from '../modeler_app/runtime/core/coreControllers.js';
import { buildReadModel,validateReadModel } from './readModel.js';
import { createReadingIndex } from './readingIndex.js';
import { createViewerBridge } from './viewerBridge.js';
import { createBrowsingController } from './browsingController.js';
import { renderBrowsingInfo } from './browsingInfo.js';
import { attachReadingControls } from './readingControls.js';
import { receiveViewerSnapshot } from '../shared/viewerHandoff.js';
import { assertLocalFileSize } from '../shared/localFile.js';

const byId=id=>document.getElementById(id);
const readingTools=byId('reading-tools'),mobileViewport=window.matchMedia('(max-width:650px)');
const resizeAfterToolsToggle=()=>window.dispatchEvent(new Event('resize'));
readingTools.addEventListener('toggle',resizeAfterToolsToggle);
byId('reading-results').addEventListener('toggle',resizeAfterToolsToggle);
const status=byId('contract-status'),input=byId('contract-open'),reading=byId('contract-reading');
const validator=createCoreControllers({emit(){}}).validator;
const searchInput=byId('reading-search'),frame=byId('reading-frame'),scope=byId('reading-scope');
const resultList=byId('reading-result-list'),results=byId('reading-results'),pages=byId('reading-result-pages');
let busy=false,lastModel=null,resultOffset=0,lastQuery='',lastSelectedId=null,lastInfoKey='',controller,controlsUI;
let mobilePanel='diagram';
const panelIds={diagram:'viewer-root',info:'contract-info',find:'reading-find',tools:'reading-tools'};
function syncMobilePanels() {
  const mobile=mobileViewport.matches;
  if(mobile)document.body.dataset.readingPanel=mobilePanel;
  else delete document.body.dataset.readingPanel;
  if(mobile)byId('reading-info-toggle').setAttribute('aria-expanded',String(mobilePanel==='info'));
  readingTools.open=true;
  for(const [name,id] of Object.entries(panelIds)) {
    const node=byId(id),inactive=mobile&&mobilePanel!==name;
    if(inactive&&node.contains?.(document.activeElement))document.activeElement?.blur?.();
    node.inert=inactive||(name==='diagram'&&busy);
    byId(`reading-tab-${name}`).setAttribute('aria-pressed',String(name===mobilePanel));
  }
}
function showMobilePanel(name) {
  if(!mobileViewport.matches)return false;
  mobilePanel=name;
  byId('reading-help').open=false;
  if(name==='find')results.open=true;
  if(name==='info')controller.setInfoOpen(true);
  syncMobilePanels();
  if(name!=='diagram')byId(panelIds[name]).focus?.({preventScroll:true});
  return true;
}
function showInformation() {
  controller.setInfoOpen(true);
  if(!showMobilePanel('info'))byId('contract-info').scrollIntoView({block:'start',behavior:'smooth'});
}
async function showSelected() {
  showMobilePanel('diagram');
  await controller.fitSelection();
  if(!mobileViewport.matches)byId('viewer-canvas').scrollIntoView({block:'center',behavior:'smooth'});
}
const syncToolsViewport=()=>{syncMobilePanels();if(controller)render(controller.snapshot());};
syncMobilePanels();
mobileViewport.addEventListener('change',syncToolsViewport);
for(const name of Object.keys(panelIds))byId(`reading-tab-${name}`).addEventListener('click',()=>{
  if(name==='info')showInformation();else showMobilePanel(name);
});
let handoffReceiver=null,handoffPending=false;
let successfulLocalOpen=0;
const snapshotNotice=byId('reading-snapshot-notice');
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};
const reportError=error=>{status.textContent=`操作を止めました: ${error?.message||error}`;};
const act=action=>Promise.resolve().then(action).catch(reportError);
function renderResults(state,index) {
  if(state.query!==lastQuery){resultOffset=0;lastQuery=state.query;}
  const items=index?.search(state.query,{limit:50,offset:resultOffset})||[];
  byId('reading-result-summary').textContent=state.query?`検索結果 ${state.resultCount}件`:`要素一覧 ${state.resultCount}件`;
  resultList.replaceChildren();pages.replaceChildren();
  if(!items.length)resultList.append(el('p','一致する対象はありません。別の名前やIDで検索してください。'));
  for(const item of items) {
    const button=el('button');button.type='button';button.className='result-button';button.setAttribute('aria-current',String(item.id===state.selectedId));
    button.append(el('span',item.label),el('small',`${item.id} / 表示 ${item.frames.length?item.frames.join(', '):'すべて'}${item.placed?'':' / 図に出現なし'}`));
    button.addEventListener('click',()=>act(async()=>{await controller.select(item.id);if(mobileViewport.matches)showInformation();}));resultList.append(button);
  }
  if(state.resultCount>50) {
    const prev=el('button','前'),next=el('button','次');prev.type=next.type='button';prev.disabled=resultOffset===0;next.disabled=resultOffset+50>=state.resultCount;
    prev.addEventListener('click',()=>{resultOffset=Math.max(0,resultOffset-50);renderResults(controller.snapshot(),index);});next.addEventListener('click',()=>{resultOffset+=50;renderResults(controller.snapshot(),index);});
    pages.append(prev,el('small',`${resultOffset+1}–${Math.min(resultOffset+50,state.resultCount)} / ${state.resultCount}`),next);
  }
}
const infoKey=state=>JSON.stringify([state.frame,state.selectedId,state.bridgeState?.selection?.visible,state.scope,state.scopeRootId,state.filters]);
function renderInfo(state) {
  lastInfoKey=infoKey(state);
  renderBrowsingInfo(reading,{model:controller?.getModel(),index:controller?.getIndex(),state,select:id=>act(()=>controller.select(id)),explore:id=>act(()=>controller.explore(id)),fitSelection:()=>act(showSelected)});
}
function renderControls(state,syncInfo=true) {
  controlsUI?.render(state);
  for(const key of ['points','lines','aux']){const node=byId(`reading-${key}`);if(typeof state.filters?.[key]==='boolean')node.checked=state.filters[key];}
  if(syncInfo&&infoKey(state)!==lastInfoKey)renderInfo(state);
}
function render(state) {
  const model=controller?.getModel(),index=controller?.getIndex(),entry=controller?.getEntry();const ready=!!model&&state.renderAvailable,modelChanged=model!==lastModel;
  if(modelChanged){lastModel=model;resultOffset=0;results.open=false;}
  if(state.selectedId!==lastSelectedId){lastSelectedId=state.selectedId;results.open=false;byId('contract-info').scrollTop=0;}
  byId('reading-file').textContent=state.label||'作品を開いてください';byId('reading-file').title=state.label||'';
  byId('reading-layout').classList.toggle('info-hidden',!state.infoOpen);byId('reading-info-toggle').setAttribute('aria-expanded',String(state.infoOpen));
  scope.value=state.scope;searchInput.value=state.query;
  renderControls(state,false);
  const warnings=model?.warnings||[];byId('reading-notices').hidden=!warnings.length;
  byId('reading-notice').textContent=`読み取りの注意 ${warnings.length}件`;byId('reading-notice-summary').textContent=warnings[0]||'';
  byId('reading-back').disabled=busy||!ready||!state.historyDepth;
  for(const id of ['reading-all','reading-search-button'])byId(id).disabled=busy||!ready;
  for(const id of ['reading-show','reading-explore'])byId(id).disabled=busy||!ready||!entry;
  byId('reading-selection').hidden=!entry&&!mobileViewport.matches;
  byId('reading-selection-label').textContent=entry?.label||'未選択';
  byId('reading-selection-label').title=entry?.label||'';
  for(const id of ['reading-selection-info','reading-selection-show'])byId(id).disabled=busy||!ready||!entry;
  scope.disabled=searchInput.disabled=busy||!ready;
  for(const key of ['points','lines','aux']){const node=byId(`reading-${key}`);node.checked=state.filters[key];node.disabled=busy||!ready;}
  input.disabled=busy||handoffPending;
  renderResults(state,index);
  if(modelChanged||infoKey(state)!==lastInfoKey)renderInfo(state);
  syncMobilePanels();
}
controller=createBrowsingController({buildReadModel,createReadingIndex,validateReadModel:model=>validateReadModel(model,validator),
  async mount(model) {
    const host=await mountViewerHost({document3dss:model.scene,modelLabel:model.label,profile:'prod_full',readOnlyBrowsing:true});
    try {const bridge=createViewerBridge(host,{scene:model.scene});await bridge.waitForPaint();return {host,bridge};}catch(error){host.dispose();throw error;}
  },onChange:render,onControlsChange:renderControls,onStatus:message=>{status.textContent=message;},onBusy:value=>{busy=value;input.disabled=value||handoffPending;syncMobilePanels();if(controller)render(controller.snapshot());}
});
async function openFileText(text,label) {
  // A deliberate local open supersedes a pending transfer. The receiver cannot
  // later replace the user's newly opened file or relabel it as a snapshot.
  handoffReceiver?.dispose();handoffReceiver=null;handoffPending=false;
  const result=await controller.openText(text,label);
  if(result?.ok===true){successfulLocalOpen++;snapshotNotice.hidden=true;}
  return result;
}
controlsUI=attachReadingControls({getController:()=>controller,getBusy:()=>busy,allowKeyboard:()=>!mobileViewport.matches||mobilePanel==='diagram',act});
byId('reading-notice').addEventListener('click',()=>{showInformation();byId('reading-capabilities')?.scrollIntoView({block:'start',behavior:mobileViewport.matches?'instant':'smooth'});});
byId('reading-back').addEventListener('click',()=>act(()=>controller.back()));
byId('reading-show').addEventListener('click',()=>act(showSelected));
byId('reading-all').addEventListener('click',()=>act(()=>controller.fitAll()));
byId('reading-explore').addEventListener('click',()=>act(()=>controller.explore()));
byId('reading-info-toggle').addEventListener('click',()=>{if(mobileViewport.matches){if(mobilePanel==='info')showMobilePanel('diagram');else showInformation();}else controller.setInfoOpen(!controller.snapshot().infoOpen);});
byId('reading-selection-info').addEventListener('click',showInformation);
byId('reading-selection-show').addEventListener('click',()=>act(showSelected));
scope.addEventListener('change',()=>act(()=>controller.setScope(scope.value)));
for(const key of ['points','lines','aux'])byId(`reading-${key}`).addEventListener('change',event=>act(()=>controller.setFilters({[key]:event.target.checked})));
byId('reading-search-form').addEventListener('submit',event=>{event.preventDefault();act(async()=>{await controller.search(searchInput.value);controller.setInfoOpen(true);results.open=true;});});
searchInput.addEventListener('search',()=>{if(!searchInput.value)act(()=>controller.search(''));});
input.addEventListener('change',event=>{
  const file=event.target.files?.[0];if(!file){controller.cancelOpen();return;}
  act(async()=>{
    try {assertLocalFileSize(file);const text=await file.text();await openFileText(text,file.name);}
    finally {input.value='';}
  });
});
input.addEventListener('cancel',()=>controller.cancelOpen());
// Bounded inspection: original data is copied out; no edit/save or renderer mutator is exposed.
window.contractViewerSnapshot=()=>controller.rawSnapshot();
window.viewerDiagnostics=Object.freeze({
  openText:openFileText,cancelOpen:()=>controller.cancelOpen(),select:id=>controller.select(id),search:q=>controller.search(q),
  explore:id=>controller.explore(id),back:()=>controller.back(),setFrame:n=>controller.setFrame(n),setScope:s=>controller.setScope(s),setFilters:f=>controller.setFilters(f),
  fitSelection:()=>controller.fitSelection(),fitAll:()=>controller.fitAll(),snapshot:()=>controller.snapshot(),getState:()=>controller.snapshot(),rawSnapshot:()=>controller.rawSnapshot(),
  frameFirst:()=>controller.frameFirst(),frameLast:()=>controller.frameLast(),frameStep:delta=>controller.frameStep(delta),setPlaying:playing=>controller.setPlaying(playing),
  cameraReset:()=>controller.cameraReset(),cameraPreset:index=>controller.cameraPreset(index),cameraZoom:delta=>controller.cameraZoom(delta),cameraOrbit:(dx,dy)=>controller.cameraOrbit(dx,dy),
  setAutoOrbit:options=>controller.setAutoOrbit(options),enterMicro:()=>controller.enterMicro(),exitMicro:()=>controller.exitMicro(),setViewerSettings:settings=>controller.setViewerSettings(settings),
  info:async id=>{if(id!==undefined)await controller.select(id);else renderInfo(controller.snapshot());await controller.whenIdle();await controller.waitForPaint();return reading.textContent;}
});
window.viewerBootReady=(async()=>{
  render(controller.snapshot());
  const params=new URLSearchParams(location.search);
  if(params.has('handoff')) {
    handoffPending=true;input.disabled=true;
    handoffReceiver=receiveViewerSnapshot({
      async openText(text,label) {
        const localVersion=successfulLocalOpen;
        const result=await controller.openText(text,label);
        // A later invalid local open preserves this model, so its provenance
        // must remain visible even if that open cancelled the acknowledgement.
        if(result?.ok===true&&successfulLocalOpen===localVersion)snapshotNotice.hidden=false;
        return result;
      },
      onStatus:message=>{status.textContent=message;},
      onSnapshot:()=>{snapshotNotice.hidden=false;},
    });
    try {return await handoffReceiver.ready;}
    finally {handoffPending=false;input.disabled=busy;}
  }
  const modelUrl=params.get('model');if(!modelUrl)return {ok:true,empty:true};
  try {
    const url=new URL(modelUrl,location.href);if(url.origin!==location.origin)throw new Error('この入口は同じ配信元の作品を開きます。');
    const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return openFileText(await response.text(),modelUrl.split('/').at(-1));
  }catch(error){reportError(error);return {ok:false,error:String(error?.message||error)};}
})();
window.addEventListener('pagehide',()=>{mobileViewport.removeEventListener('change',syncToolsViewport);readingTools.removeEventListener('toggle',resizeAfterToolsToggle);handoffReceiver?.dispose();controlsUI.dispose();controller.dispose();},{once:true});
