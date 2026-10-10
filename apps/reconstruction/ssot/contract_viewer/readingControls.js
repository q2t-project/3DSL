// Buttons and keyboard share the browsing controller. No direct runtime writes.
import { DEFAULT_INPUT_KEYBOARD } from '../viewer/ui/inputDefaults.js';
import { mapArrowKeyToOrbitDelta } from '../viewer/ui/orbitMapping.js';

const CAMERA_PRESETS = ['上面 (+Z)','正面 (+Y)','右面 (+X)','斜め NE','斜め NW','斜め SW','斜め SE'];
const editTarget = target => !!(target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName?.toUpperCase()) || target?.closest?.('[contenteditable="true"]'));
export function attachReadingControls({doc=document,win=window,getController,getBusy=()=>false,act=fn=>Promise.resolve().then(fn)}) {
  const byId=id=>doc.getElementById(id),cleanup=[];
  const on=(node,type,fn)=>{node?.addEventListener(type,fn);cleanup.push(()=>node?.removeEventListener(type,fn));};
  const call=(method,...args)=>act(()=>getController()[method](...args));
  let lastRange='';
  const frame=byId('reading-frame'),slider=byId('reading-frame-slider'),preset=byId('reading-preset');
  const keyboard=DEFAULT_INPUT_KEYBOARD;
  const click=(id,method,...args)=>on(byId(id),'click',()=>call(method,...args));
  click('reading-frame-first','frameFirst');click('reading-frame-prev','frameStep',-1);
  click('reading-frame-next','frameStep',1);click('reading-frame-last','frameLast');
  on(byId('reading-play'),'click',()=>call('setPlaying',!getController().snapshot().controls?.playing));
  on(frame,'change',()=>call('setFrame',Number(frame.value)));
  // Range input is coalesced while a committed frame is being drawn.
  let pendingFrame=null,frameChanging=false;
  async function flushFrame(){if(frameChanging)return;frameChanging=true;try{while(pendingFrame!==null){const value=pendingFrame;pendingFrame=null;await call('setFrame',value);}}finally{frameChanging=false;}}
  on(slider,'input',()=>{pendingFrame=Number(slider.value);void flushFrame();});
  click('reading-camera-home','cameraReset');
  on(preset,'change',()=>{if(preset.value!=='')call('cameraPreset',Number(preset.value));});
  click('reading-zoom-in','cameraZoom',-keyboard.zoomStep);click('reading-zoom-out','cameraZoom',keyboard.zoomStep);
  click('reading-micro','enterMicro');click('reading-macro','exitMicro');
  on(byId('reading-world-axes'),'change',event=>call('setViewerSettings',{worldAxesMode:Number(event.target.value)}));
  on(byId('reading-micro-strength'),'change',event=>call('setViewerSettings',{microFXProfile:event.target.value}));
  on(byId('reading-auto-orbit'),'change',event=>call('setAutoOrbit',{enabled:event.target.checked}));
  on(byId('reading-auto-direction'),'change',event=>call('setAutoOrbit',{direction:event.target.value==='ccw'?-1:1}));
  on(byId('reading-auto-speed'),'change',event=>call('setAutoOrbit',{speedLevel:Number(event.target.value)}));

  function render(state) {
    const controls=state.controls||{},ready=!!state.renderAvailable&&!getBusy()&&!state.loading;
    const range=controls.frameRange,knownFrames=getController()?.getIndex?.()?.allFrames||[Number.isInteger(state.frame)?state.frame:0];
    const hasRange=Number.isInteger(range?.min)&&Number.isInteger(range?.max)&&range.max>=range.min;
    const min=hasRange?range.min:Math.min(...knownFrames),max=hasRange?range.max:Math.max(...knownFrames);
    const frames=max-min<=127?Array.from({length:max-min+1},(_,i)=>min+i):[...new Set([...knownFrames,min,max,state.frame].filter(n=>Number.isInteger(n)&&n>=min&&n<=max))].sort((a,b)=>a-b);
    const key=frames.join(',');if(lastRange!==key){lastRange=key;frame.replaceChildren();for(const value of frames){const option=doc.createElement('option');option.value=String(value);option.textContent=String(value);frame.append(option);}}
    frame.value=String(state.frame);frame.disabled=!ready;
    slider.min=String(min);slider.max=String(max);slider.value=String(state.frame);slider.disabled=!ready||min===max;
    slider.setAttribute('aria-valuetext',`表示 ${state.frame}`);
    byId('reading-frame-first').disabled=byId('reading-frame-prev').disabled=!ready||state.frame<=min;
    byId('reading-frame-last').disabled=byId('reading-frame-next').disabled=!ready||state.frame>=max;
    const play=byId('reading-play');play.disabled=!ready||min===max;play.textContent=controls.playing?'停止':'再生';play.setAttribute('aria-pressed',String(!!controls.playing));
    byId('reading-playing').textContent=controls.playing?'順送り中':'';
    preset.disabled=!ready;const presetIndex=controls.presetIndex;preset.value=Number.isInteger(presetIndex)&&presetIndex>=0&&presetIndex<CAMERA_PRESETS.length?String(presetIndex):'';
    for(const id of ['reading-camera-home','reading-zoom-in','reading-zoom-out'])byId(id).disabled=!ready;
    const selected=getController()?.getEntry?.();byId('reading-micro').disabled=!ready||!selected?.uuid||state.bridgeState?.selection?.visible===false;
    byId('reading-micro').setAttribute('aria-pressed',String(controls.mode==='micro'));
    byId('reading-macro').disabled=!ready||controls.mode!=='micro';
    byId('reading-mode').textContent=controls.mode==='micro'?'局所観察中':'全体観察';
    const settings=controls.settings||{};byId('reading-world-axes').value=String(settings.worldAxesMode??0);
    byId('reading-micro-strength').value=settings.microFXProfile||'normal';
    const orbit=controls.autoOrbit||{};byId('reading-auto-orbit').checked=!!orbit.enabled;byId('reading-auto-direction').value=orbit.direction===-1?'ccw':'cw';byId('reading-auto-speed').value=String(orbit.speedLevel||1);
    for(const id of ['reading-world-axes','reading-micro-strength','reading-auto-orbit','reading-auto-direction','reading-auto-speed'])byId(id).disabled=!ready;
  }

  function keydown(event) {
    if(event.defaultPrevented||event.isComposing||event.keyCode===229||event.ctrlKey||event.metaKey||event.altKey||editTarget(event.target))return;
    const controller=getController(),state=controller?.snapshot();if(!state?.renderAvailable||state.loading||getBusy())return;
    const key=event.key,code=event.code;let method=null,args=[];
    if(code==='Home'||key==='Home')method='cameraReset';
    else if(code==='PageUp'||key==='PageUp'){method='frameStep';args=[1];}
    else if(code==='PageDown'||key==='PageDown'){method='frameStep';args=[-1];}
    else if(key==='Escape'){method='exitMicro';for(const id of ['reading-help','reading-filters']){const details=byId(id);if(details)details.open=false;}}
    else if(key==='f'||key==='F')method='enterMicro';
    else if(key==='c'||key==='C'){method='setViewerSettings';args=[{worldAxesMode:((state.controls?.settings?.worldAxesMode||0)+1)%3}];}
    else if(['Backslash','IntlYen','IntlRo'].includes(code)||['\\','¥','￥'].includes(key)){method='cameraPreset';args=[((state.controls?.presetIndex??0)+(event.shiftKey?-1:1)+CAMERA_PRESETS.length)%CAMERA_PRESETS.length];}
    else if(key==='+'||code==='NumpadAdd'||(key==='='&&event.shiftKey)){method='cameraZoom';args=[-keyboard.zoomStep];}
    else if(key==='-'||code==='NumpadSubtract'){method='cameraZoom';args=[keyboard.zoomStep];}
    else {const delta=mapArrowKeyToOrbitDelta(code||key,event.shiftKey?keyboard.orbitStepFast:keyboard.orbitStep);if(delta.dTheta||delta.dPhi){method='cameraOrbit';args=[delta.dTheta,delta.dPhi];}}
    if(!method)return;
    if(event.repeat&&['enterMicro','exitMicro','setViewerSettings','cameraPreset','cameraReset'].includes(method))return;
    event.preventDefault();call(method,...args);
  }
  on(win,'keydown',keydown);
  return {render,dispose(){for(const remove of cleanup)remove();pendingFrame=null;}};
}
