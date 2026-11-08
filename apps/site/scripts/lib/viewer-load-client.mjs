// Send a trusted protocol gesture through the real on-screen canvas. On a phone
// this measures a CDP-driven touch; the unassisted page waits for the user's finger.
export async function dragViewer(page) {
  const point = await page.evaluate(`(() => {
    const frame=document.querySelector('#frame iframe');
    frame.scrollIntoView({block:'center'});
    const doc=frame.contentDocument,canvas=doc.getElementById('viewer-canvas');
    const outer=frame.getBoundingClientRect(),inner=canvas.getBoundingClientRect();
    const x=inner.left+inner.width*.37, y=inner.top+inner.height*.44;
    if(doc.elementFromPoint(x,y)!==canvas) throw Error('Viewer canvas is covered');
    return {x:outer.left+frame.clientLeft+x,y:outer.top+frame.clientTop+y};
  })()`);
  const touch = (type,dx) => page.cmd('Input.dispatchTouchEvent',{type,touchPoints:dx===null?[]:[{x:point.x+dx,y:point.y,id:1}]});
  await touch('touchStart',0);
  for (const dx of [12,28,48,62]) await touch('touchMove',dx);
  await touch('touchEnd',null);
}
