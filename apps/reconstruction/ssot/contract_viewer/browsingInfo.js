import { renderContractInfo } from './readInfo.js';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(cls)node.className=cls;return node;};
const lazy=(parent,title,render)=>{const d=el('details');d.append(el('summary',title));let done=false;d.addEventListener('toggle',()=>{if(d.open&&!done){done=true;render(d);}});parent.append(d);return d;};
const record=(parent,title,value)=>{if(value!==undefined&&value!==null)lazy(parent,title,d=>d.append(el('pre',typeof value==='string'?value:JSON.stringify(value,null,2))));};
const row=(parent,label,value)=>{const p=el('p');p.append(el('strong',`${label}: `),document.createTextNode(String(value??'記録なし')));parent.append(p);};
const kindLabels={occurrence:'出現',target:'対象',relation:'関係',participant:'参与枠',participation:'参与枠',point:'点',line:'線',aux:'補助要素',boundary:'境界'};
const localized=value=>typeof value==='string'?value:value?.ja||value?.en||'';
export function renderBrowsingInfo(container,{model,index,state,select,explore,fitSelection}) {
  container.replaceChildren();
  if(!model){container.append(el('p','作品を開くと、図で選んだ対象の情報をここに表示します。'));return;}
  const entry=index.get(state.selectedId);
  const header=el('section');header.append(el('h2',entry?.label||'図から選んで読む'));
  if(!entry){
    const summary=localized(model.scene?.document_meta?.document_summary);
    if(summary)header.append(el('p',summary));
    header.append(el('p','図上の点・線・文字をタップすると、対応する情報と接続先を読めます。検索から名前で直接選べます。スマホでは下端の「探す」を使ってください。'));
    const memo=model.scene?.document_meta?.creator_memo;
    if(typeof memo==='string'&&memo.trim())lazy(header,'作者メモ',d=>d.append(el('p',memo)));
  }
  container.append(header);
  if(entry) {
    row(header,'種類',kindLabels[entry.kind]||entry.kind);
    const metadata=el('details');metadata.append(el('summary','ID・位置・表示'));row(metadata,'ID',entry.id);
    const details=entry.details||{};
    const memo=details.element?.meta?.creator_memo;
    if(typeof memo==='string'&&memo.trim())row(header,'作者メモ',memo);
    if(details.target){
      row(header,'対象',details.target.name||details.target.id);row(header,'対象ID',details.target.id);
      const recorded=details.target.epistemic;
      const stateNames={hypothesis:'仮説',undetermined:'未判定',asserted:'記録上の主張'};
      row(header,'認識状態（作品の記録）',Object.hasOwn(stateNames,recorded)?stateNames[recorded]:recorded);
      header.append(el('p','作品に保存された扱いを表示しています。Viewerによる真偽の認定ではありません。','muted'));
    }
    if(details.occurrence){row(header,'出現ID',details.occurrence.id);row(header,'表示ラベル',details.occurrence.labelOverride??'対象の共有名を使用');}
    const authoredPosition=details.position??(entry.kind==='point'?details.element?.appearance?.position:null);
    if(authoredPosition)row(metadata,'位置',authoredPosition.join(', '));
    else if(entry.position)row(metadata,'表示範囲の中心',entry.position.join(', '));
    if(details.axis)row(header,'意味軸の値',`${details.axis.declaration.quantity}: ${details.axis.value} ${details.axis.declaration.unit}`);
    if(details.boundary?.declaration)row(header,'宣言境界との位置',details.boundary.inside?'内側（辺を含む）':'外側');
    row(metadata,'表示',entry.frames?.length?entry.frames.join(', '):'すべての表示');
    const shown=!entry.frames?.length||entry.frames.includes(state.frame);
    if(!entry.placed||!entry.sceneIds?.length)header.append(el('p','この記録には図上の出現がありません。情報は保持しています。','notice'));
    else if(!shown)header.append(el('p',`現在の表示 ${state.frame} には含まれません。「選択を表示」で所属する表示へ移れます。`,'notice'));
    else if(state.bridgeState?.selection?.visible===false)header.append(el('p','図の範囲または種類の表示条件で隠れています。「選択を表示」で確かめられます。','notice'));
    else if(state.scope==='related')header.append(el('p','図は探索の中心にした対象と、記録された接続先に絞っています。','muted'));
    for(const warning of entry.warnings||[])header.append(el('p',warning,'notice'));
    if(details.slot){row(header,'参与役割',details.slot.role);row(header,'接続対象',details.slot.target??details.slot.relation);}
    if(details.relation){row(header,'関係名',details.relation.name||details.relation.id);row(header,'方向',details.relation.direction);row(header,'条件',details.relation.condition||'指定なし');}
    const show=el('button','選択を表示','reading-fit-selection');show.type='button';show.disabled=!entry.sceneIds?.length;show.addEventListener('click',()=>fitSelection());header.append(show);
    if(details.target){const copies=index.neighbors(`target:${encodeURIComponent(details.target.id)}`).map(edge=>index.get(edge.toId)).filter(other=>other&&other.id!==entry.id);if(copies.length)lazy(container,'同じ対象の別出現',d=>{for(const other of copies){const button=el('button',`${other.label} · ${other.occurrenceId} / 表示 ${other.frames.length?other.frames.join(', '):'すべて'}`,'part-link');button.type='button';button.addEventListener('click',()=>select(other.id));d.append(button);}});}
    const connections=el('section');connections.append(el('h3','記録された接続先'));
    const edges=index.neighbors(entry.id);
    if(!edges.length)connections.append(el('p','参照で記録された接続先はありません。位置の近さから接続を推測しません。','muted'));
    for(const edge of edges) {
      const line=el('div',undefined,'connection-row');const target=index.get(edge.toId);
      line.append(el('span',`${edge.role?edge.role+' → ':''}${edge.label||target?.label||edge.toId||'接続先なし'}`));
      if(edge.missing||!target){line.append(el('small','表示接続なし・内容保持','notice'));if(target){const button=el('button','情報を見る');button.type='button';button.addEventListener('click',()=>select(target.id));line.append(button);}}
      else {const button=el('button','辿る');button.type='button';button.addEventListener('click',()=>explore(target.id));line.append(button);}
      connections.append(line);
    }
    container.append(connections);
    container.append(metadata);
    const parts=index.relatedParts?.(entry.id);
    if(parts&&(parts.items?.length||parts.missingIds?.length))lazy(container,parts.reason||'編集前の原記録との対応',d=>{
      d.append(el('p','編集前の対応記録による案内です。現在の同一対象や関係を断定するものではありません。','notice'));
      for(const part of parts.items){const b=el('button',`${part.label} · ${part.id}`,'part-link');b.type='button';b.addEventListener('click',()=>explore(part.id));d.append(b);}
      if(parts.missingIds?.length)d.append(el('p',`現在の図にない記録: ${parts.missingIds.join(', ')}`));
    });
    record(container,'選択した記録の詳細',details);
  }
  const context=el('section');context.id='reading-capabilities';context.append(el('h3','作品の読み取り範囲'),el('p',model.typeLabel||model.format));
  if(model.format==='contract')context.append(el('p','対象・出現・参与役割は作品の宣言から読み取ります。'));
  else if(model.format==='legacy')context.append(el('p','現在の図形と端点参照を読めます。編集前の対応記録は、現在の意味や同一性とは分けて扱います。'));
  else context.append(el('p','図形・ラベル・端点参照を読めます。対象と出現の区別や原資料など、図に含まれない情報は補いません。'));
  for(const warning of model.warnings||[])context.append(el('p',warning,'notice'));
  const c=model.work?.contract;
  if(c){
    const hypotheses=c.targets.filter(t=>t.epistemic==='hypothesis').length,undetermined=c.targets.filter(t=>t.epistemic==='undetermined').length;
    if(hypotheses||undetermined)context.append(el('p',`作品には仮説 ${hypotheses}件・未判定 ${undetermined}件の対象が記録されています。未適用入力や未接続関係とは別の状態で、Viewerが真偽を認定したものではありません。`,'notice'));
  }
  if(c?.axis)row(context,'意味軸',`${c.axis.quantity} / ${['X','Y','Z'][c.axis.dimension]}座標 = 値 / ${c.axis.unit}`);
  if(c?.boundary){row(context,'境界',`${c.boundary.id} / XY投影、辺を含む`);row(context,'境界内の出現',model.meaning?.members?.join(', ')||'なし');}
  container.append(context);
  if(model.format==='contract')lazy(container,'作品全体・草稿・原資料の記録',d=>{const section=el('div');d.append(section);renderContractInfo(section,model,state.label);});
  else {
    if(model.legacyInfo)record(container,'編集前の対応・原記録（参照用）',model.legacyInfo);
    record(container,'図の文書情報',model.scene.document_meta);
    if(model.work)record(container,'作品一式の原記録（読取専用）',model.rawSnapshot);
  }
}
