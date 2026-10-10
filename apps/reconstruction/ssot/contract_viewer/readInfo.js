const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const list=(parent,items)=>{const ul=el('ul');for(const item of items)ul.append(el('li',item));parent.append(ul);};
export function renderContractInfo(reading,model,label) {
  const section=(title)=>{const e=el('section');e.append(el('h2',title));reading.append(e);return e;};
  reading.replaceChildren(); const {work,meaning,warnings}=model,c=work.contract;
  const records=c.draft.detached || [];
  const unresolved=meaning.unresolvedRelations || [];
  const archived=records.flatMap(record=>record.content.relations.filter(r=>record.archivedRelationIds.includes(r.id)).map(relation=>({record:record.id,relation})));
  const title=section(label);
  title.append(el('p',`${c.targets.length}対象 / ${c.occurrences.length}出現 / ${meaning.relations.length}関係（描画接続あり ${c.relations.length} / 表示接続の要修復 ${unresolved.length}）`));
  title.append(el('p','作品全体は読取専用で保持。図は作品から生成した表示です。座標軸や境界に意味がある場合は、下の宣言を合わせて読み取ってください。'));
  const caps=section('この入口で読み取れる範囲');
  caps.append(el('p','対象と出現の区別、共有名と出現別ラベル、参与役割、座標値をそのまま用いる意味軸、XY投影境界、未完成の関係と未適用入力、表示接続が要修復の関係、削除した内容の保持記録、編集・Undo／Redoの記録。任意の解釈規約や自動推論には対応していません。','notice'));
  for(const warning of warnings)caps.append(el('p',warning,'notice'));
  const targetNames=new Map([...records.flatMap(record=>record.content.targets),...c.targets].map(t=>[t.id,t.name]));
  const relationNames=new Map([...records.flatMap(record=>record.content.relations),...c.relations].map(r=>[r.id,r.name]));
  const occurrenceIds=new Set(c.occurrences.map(o=>o.id));
  const relationDetails=(parent,r,{state,record,open=true}={})=>{
    const d=el('details');d.open=open;d.append(el('summary',`${r.name || '（無名の関係）'} / ${r.direction}${state?' / '+state:''}`));
    d.append(el('p',`関係ID: ${r.id}`),el('p',`条件: ${r.condition||'指定なし'}`));
    list(d,[...r.participants.map(p=>`${p.role}: ${targetNames.get(p.target)??p.target}（対象 ${p.target} / 出現 ${p.occurrence}${occurrenceIds.has(p.occurrence)?'':' / 表示出現なし'}）`),...r.refs.map(p=>`${p.role}: 関係「${relationNames.get(p.relation)??p.relation}」（${p.relation}）`)]);
    if(record)d.append(el('p',`保持記録: ${record}`));
    parent.append(d);return d;
  };
  list(section('対象'),c.targets.map(t=>`${t.name || '（無名）'} — ${t.id} / ${t.epistemic}`));
  list(section('出現とラベル'),c.occurrences.map(o=>`${o.id}: 対象「${targetNames.get(o.target)}」 / 表示「${o.labelOverride??targetNames.get(o.target)}」${o.labelOverride===undefined?'（共有名を使用）':'（この出現だけ）'} / 位置 ${work.scene.points.find(p=>p.meta.uuid===o.anchor).appearance.position.join(', ')} / 表示 ${o.frames.join(', ')}`));
  const relations=section('描画接続のある関係と参与役割');
  if(!c.relations.length)relations.append(el('p',unresolved.length?'描画接続のある関係なし。表示接続の要修復関係は下に保持しています。':'描画接続のある関係なし'));
  for(const r of c.relations)relationDetails(relations,r);
  if(unresolved.length) {
    const held=section('表示接続の要修復・関係内容保持');
    held.append(el('p','出現や接続先の表示がなくなったため、図への接続を修復する必要があります。参与役割・条件・関係の内容は保持されています。','notice'));
    for(const item of unresolved)relationDetails(held,item.relation,{state:'表示接続の要修復',record:item.record});
  }
  if(archived.length) {
    const deleted=section('明示削除した関係（保存記録）');
    deleted.append(el('p','対象または関係の削除操作で現在の関係から外した内容です。現に成立する関係の一覧には含めず、復元用に保持しています。'));
    for(const item of archived)relationDetails(deleted,item.relation,{state:'明示削除済み',record:item.record,open:false});
  }
  const spatial=section('意味を持つ配置');
  if(c.axis) {
    spatial.append(el('p',`${c.axis.quantity} / ${['X','Y','Z'][c.axis.dimension]}座標 = 値 / 単位 ${c.axis.unit}`));
    list(spatial,Object.entries(meaning.priorities).map(([id,value])=>`${id}: ${value}`));
  } else spatial.append(el('p','座標を意味値へ変換する軸宣言なし。位置から意味を推測しません。'));
  if(c.boundary) {
    spatial.append(el('p',`境界 ${c.boundary.id}: XY投影で辺を含む。Z座標は判定に使わない。範囲 [${meaning.bounds.join(', ')}]`));
    spatial.append(el('p',`内側の宣言対象出現: ${meaning.members.join(', ')||'なし'}`));
  }
  const draft=section('草稿・未解釈の原資料');
  draft.append(el('p',`未適用入力 ${c.draft.inputs.length}件 / 未完成関係 ${c.draft.pendingRelations.length}件 / 未解釈原資料 ${meaning.uninterpretedSources}件`));
  if(c.draft.inputs.length||c.draft.pendingRelations.length)draft.append(el('pre',JSON.stringify(c.draft,null,2)));
  for(const source of c.sources) {
    const d=el('details');d.append(el('summary',`${source.path} — ${source.status}（原文保持）`),el('pre',source.utf8));draft.append(d);
  }
  draft.append(el('p','草稿は完成した関係や確定値として描画していません。原資料のハッシュ値は保持のみで、この入口では再検証していません。'));
  if(records.length) {
    const recovery=section('削除・接続修復の保持記録');
    recovery.append(el('p','削除前の対象・出現・関係・図形・並び順を保持しています。復元操作はModelerで行えます。'));
    const reasons={'missing-display-occurrence':'出現を削除','target-deleted':'対象を削除','relation-deleted':'関係を削除'};
    for(const record of records) {
      const d=el('details');d.append(el('summary',`${reasons[record.reason]??record.reason} / 要修復 ${record.unresolvedRelationIds.length}件 / 明示削除関係 ${record.archivedRelationIds.length}件`));
      d.append(el('p',`記録ID: ${record.id} / 対象 ${record.content.targets.length} / 出現 ${record.content.occurrences.length} / 関係 ${record.content.relations.length}`));
      d.append(el('pre',JSON.stringify(record,null,2)));recovery.append(d);
    }
  }
  const journal=section('編集とUndo／Redoの保持記録');
  const entries=work.journal || [];
  if(!entries.length)journal.append(el('p','この作品に保存された操作記録なし。過去に編集がなかったことを示すものではありません。'));
  else {
    const all=el('details');all.append(el('summary',`${entries.length}件の操作記録（読取専用）`));
    for(const entry of entries) {
      const d=el('details');d.append(el('summary',`#${entry.sequence} ${entry.action} / ${entry.operation} / ${entry.at}`),el('pre',JSON.stringify(entry,null,2)));all.append(d);
    }
    journal.append(all);
  }
  journal.append(el('p','Undo／Redoでも既存記録を保持する編集履歴です。内容の真偽や第三者による改変を証明する記録ではありません。'));

}

