// Read-only browsing state. All operations use the same path as UI and diagnostics.
const clone = value => value == null ? value : structuredClone(value);
const framesFor = entry => Array.isArray(entry?.frames) ? entry.frames : [];
export function createBrowsingController({buildReadModel, validateReadModel, createReadingIndex, mount, onChange=()=>{}, onControlsChange=()=>{}, onStatus=()=>{}, onBusy=()=>{}}) {
  let model=null,index=null,host=null,bridge=null,unsubscribe=null,loading=false,disposed=false,suppressPick=false;
  let state={label:'',format:null,selectedId:null,query:'',frame:0,scope:'all',scopeRootId:null,filters:{points:true,lines:true,aux:true},infoOpen:true};
  let history=[],queue=Promise.resolve();
  const current=()=>index?.get(state.selectedId)||null;
  const geometry=entry=>entry?.sceneIds|| (entry?.uuid?[entry.uuid]:[]);
  const bridgeSnapshot=()=>bridge?.snapshot?.()||null;
  function snapshot() {const b=bridgeSnapshot();return {...clone(state),frame:b?.frame??state.frame,filters:clone(b?.filters||state.filters),controls:clone(b?.controls||null),camera:clone(b?.camera||null),bridgeState:clone(b),historyDepth:history.length,resultCount:index?.searchCount(state.query)||0,resultIds:index?.search(state.query,{limit:100}).map(e=>e.id)||[],entryCount:index?.count||0,loading,renderAvailable:!!bridge};}
  function syncRuntime() {const b=bridgeSnapshot();if(Number.isInteger(b?.frame))state.frame=b.frame;if(b?.filters)state.filters=clone(b.filters);}
  const notify=()=>onChange(snapshot());
  const serial=fn=>{const task=queue.then(()=>{if(disposed)throw new Error('Viewerを終了しています。');return fn();});queue=task.catch(()=>{});return task;};
  async function painted() {await bridge?.waitForPaint?.();}
  async function run(fn) {suppressPick=true;try {syncRuntime();const result=await fn();await painted();syncRuntime();notify();return result;}finally{suppressPick=false;}}
  function scopeIds() {
    if(state.scope!=='related')return null;
    const entry=index.get(state.scopeRootId)||current();if(!entry)return [];
    const ids=new Set(geometry(entry));
    for(const edge of index.neighbors(entry.id)) {
      const e=index.get(edge.toId);for(const id of geometry(e))ids.add(id);
      if(edge.lineUuid)ids.add(edge.lineUuid);
    }
    return [...ids];
  }
  async function applyState({camera=null}={}) {
    const entry=current(),uuid=entry?.uuid;
    const kind=uuid?['points','lines','aux'].find(k=>(model.scene[k]||[]).some(e=>e.meta.uuid===uuid)):null;
    const previous=bridge.snapshot();
    await bridge.restore({...previous,frame:state.frame,filters:state.filters,scope:scopeIds(),selection:uuid?{uuid,kind}:null,controls:previous.controls?{...previous.controls,mode:'macro',focusUuid:null}:undefined,...(camera?{camera}:{})});
  }
  function subscribe() {
    const stopSelection=bridge.subscribe(selection=>{
      if(suppressPick||loading||disposed)return;
      const entry=selection?.uuid?index.get(selection.uuid):null;
      if(state.selectedId===(entry?.id||null))return;
      state.selectedId=entry?.id||null;state.infoOpen=true;notify();
    });
    const stopControls=bridge.subscribeState?.(()=>{
      if(suppressPick||loading||disposed)return;
      syncRuntime();onControlsChange(snapshot());
    });
    unsubscribe=()=>{stopSelection?.();stopControls?.();};
  }
  async function openText(text,label='作品.json') {
    return serial(async()=>{
      if(loading)return {ok:false,error:'読込中です。'};
      loading=true;onBusy(true);onStatus('作品の形式と接続を確認しています。');
      const previous={model,index,state:clone(state),history:clone(history),bridgeState:bridgeSnapshot()};let oldDisposed=false;
      try {
        const next=buildReadModel(text);await validateReadModel(next);const nextIndex=createReadingIndex(next);
        unsubscribe?.();unsubscribe=null;bridge?.dispose?.();host?.dispose?.();bridge=null;host=null;oldDisposed=true;
        const mounted=await mount(next);host=mounted.host;bridge=mounted.bridge;await painted();
        model=next;index=nextIndex;history=[];
        const initialFrame=bridge.snapshot?.()?.frame;
        state={label,format:next.format,selectedId:null,query:'',frame:Number.isInteger(initialFrame)?initialFrame:(nextIndex.allFrames.includes(0)?0:(nextIndex.allFrames[0]??0)),scope:'all',scopeRootId:null,filters:{points:true,lines:true,aux:true},infoOpen:true};
        await run(()=>applyState());subscribe();onStatus(`${label} — ${next.typeLabel}を読取専用で開きました。`);
        return {ok:true,format:next.format};
      } catch(error) {
        let restored=!oldDisposed;
        if(oldDisposed&&previous.model) {
          try {bridge?.dispose?.();host?.dispose?.();const mounted=await mount(previous.model);host=mounted.host;bridge=mounted.bridge;model=previous.model;index=previous.index;state=previous.state;history=previous.history;await bridge.restore(previous.bridgeState);subscribe();restored=true;}
          catch(_) {bridge?.dispose?.();host?.dispose?.();bridge=null;host=null;model=previous.model;index=previous.index;state=previous.state;history=previous.history;}
        }
        onStatus(`読込を止めました: ${error?.message||error}${previous.model?(restored?'。前の閲覧状態を保持しています。':'。前の作品記録は保持していますが、描画の復元に失敗しました。作品を開き直してください。'):''}`);
        return {ok:false,error:String(error?.message||error),restored};
      } finally {loading=false;onBusy(false);notify();}
    });
  }
  const requireReady=()=>{if(!model||!bridge)throw new Error('作品を開いてください。');};
  async function select(id) {return serial(()=>run(async()=>{requireReady();const entry=id==null?null:index.get(id);if(id!=null&&!entry)throw new Error('この対象は見つかりません。');state.selectedId=entry?.id||null;state.infoOpen=true;await bridge.select(entry?.uuid||null,entry?.kind);return clone(entry);}));}
  async function search(query) {return serial(()=>run(async()=>{requireReady();state.query=String(query||'');return index.search(state.query,{limit:100});}));}
  async function setFrame(frame) {return serial(()=>run(async()=>{requireReady();const value=Number(frame),range=bridge.snapshot().controls?.frameRange||{min:Math.min(...index.allFrames),max:Math.max(...index.allFrames)};if(!Number.isInteger(value)||value<range.min||value>range.max)throw new Error('表示範囲内の整数を指定してください。');await bridge.setFrame(value);state.frame=value;}));}
  async function setScope(scope) {return serial(()=>run(async()=>{requireReady();if(!['all','related'].includes(scope))throw new Error('不明な範囲です。');if(scope==='related'&&!current())throw new Error('範囲の中心にする対象を選んでください。');state.scope=scope;state.scopeRootId=scope==='related'?state.selectedId:null;await bridge.setScope(scopeIds());}));}
  async function setFilters(filters) {return serial(()=>run(async()=>{requireReady();for(const key of ['points','lines','aux'])if(typeof filters?.[key]==='boolean')state.filters[key]=filters[key];await bridge.setFilters(state.filters);}));}
  function pushHistory() {syncRuntime();history.push({state:clone(state),bridgeState:bridgeSnapshot()});if(history.length>50)history.shift();}
  async function explore(id) {return serial(()=>run(async()=>{
    requireReady();const entry=index.get(id||state.selectedId);if(!entry)throw new Error('接続先を選んでください。');
    pushHistory();
    state.selectedId=entry.id;state.query='';state.scope='related';state.scopeRootId=entry.id;state.infoOpen=true;
    const frames=framesFor(entry);if(frames.length&&!frames.includes(state.frame))state.frame=frames[0];
    // A followed target is explicitly revealed even when its type was hidden.
    for(const key of ['points','lines','aux'])state.filters[key]=true;
    await applyState();if(geometry(entry).length)await bridge.fitSelection(geometry(entry));return clone(entry);
  }));}
  async function back() {return serial(()=>run(async()=>{requireReady();const previous=history.pop();if(!previous)return false;state=previous.state;await bridge.restore(previous.bridgeState);return true;}));}
  async function fitSelection() {return serial(()=>run(async()=>{requireReady();const entry=current();if(!entry||!geometry(entry).length){onStatus('この記録には表示できる図形がありません。');return false;}pushHistory();const frames=framesFor(entry);if(frames.length&&!frames.includes(state.frame))state.frame=frames[0];state.scope='all';state.scopeRootId=null;state.filters={points:true,lines:true,aux:true};await applyState();await bridge.fitSelection(geometry(entry));return true;}));}
  async function fitAll() {return serial(()=>run(async()=>{requireReady();pushHistory();state.scope='all';state.scopeRootId=null;await bridge.setScope(null);await bridge.fitAll();}));}
  // Buttons and keys use these same serialized commands. They affect viewing state only.
  const command=(method,...args)=>serial(()=>run(async()=>{requireReady();if(typeof bridge[method]!=='function')throw new Error('この閲覧操作は利用できません。');return bridge[method](...args);}));
  const frameFirst=()=>command('frameFirst'),frameLast=()=>command('frameLast'),frameStep=delta=>command('frameStep',delta);
  const setPlaying=enabled=>command('setPlaying',!!enabled);
  const cameraReset=()=>command('cameraReset'),cameraPreset=index=>command('cameraPreset',index);
  const cameraZoom=delta=>command('cameraZoom',delta),cameraOrbit=(dx,dy)=>command('cameraOrbit',dx,dy);
  const setAutoOrbit=options=>command('setAutoOrbit',options),setViewerSettings=settings=>command('setViewerSettings',settings);
  const exitMicro=()=>command('exitMicro');
  async function enterMicro() {return serial(()=>run(async()=>{
    requireReady();const entry=current();
    if(!entry?.uuid||bridge.snapshot()?.selection?.visible===false)throw new Error('図に表示されている対象を選んでください。「選択を表示」で確認できます。');
    return bridge.enterMicro();
  }));}
  function setInfoOpen(open) {state.infoOpen=!!open;notify();}
  function cancelOpen() {onStatus(model?'ファイル選択を取り消しました。前の閲覧状態を保持しています。':'ファイル選択を取り消しました。');return {ok:false,canceled:true};}
  function rawSnapshot() {return clone(model?.rawSnapshot??null);}
  function dispose() {disposed=true;unsubscribe?.();bridge?.dispose?.();host?.dispose?.();}
  return {openText,cancelOpen,select,search,setFrame,setScope,setFilters,explore,back,fitSelection,fitAll,frameFirst,frameLast,frameStep,setPlaying,cameraReset,cameraPreset,cameraZoom,cameraOrbit,setAutoOrbit,setViewerSettings,enterMicro,exitMicro,setInfoOpen,snapshot,rawSnapshot,dispose,getModel:()=>model,getIndex:()=>index,getEntry:()=>current(),whenIdle:()=>queue,waitForPaint:painted};
}
