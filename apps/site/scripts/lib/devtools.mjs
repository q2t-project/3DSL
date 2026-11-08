import { once } from 'node:events';

export async function connectDevTools(url) {
  const ws = new WebSocket(url);
  try {await once(ws,'open',{signal:AbortSignal.timeout(12000)});}
  catch (error) {ws.close();throw error;}
  const pending = new Map(), events = new EventTarget();
  let sequence = 0;
  ws.addEventListener('message',({data})=>{
    const msg=JSON.parse(data);
    if (msg.method) events.dispatchEvent(new CustomEvent(msg.method,{detail:msg.params}));
    const item=pending.get(msg.id);
    if (!item) return;
    clearTimeout(item.timer);pending.delete(msg.id);
    if (msg.error) item.reject(new Error(item.method + ': ' + msg.error.message));
    else item.resolve(msg.result);
  });
  ws.addEventListener('close',()=>{
    for (const {timer,reject} of pending.values()) {clearTimeout(timer);reject(new Error('DevTools disconnected'));}
    pending.clear();
  });
  const cmd = (method,params={}) => new Promise((resolve,reject)=>{
    if (ws.readyState!==WebSocket.OPEN) return reject(new Error('DevTools disconnected'));
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},45000);
    pending.set(id,{method,resolve,reject,timer});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate = async expression => {
    const value=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
    if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
    return value.result.value;
  };
  return {cmd,events,evaluate,close:()=>ws.close()};
}
