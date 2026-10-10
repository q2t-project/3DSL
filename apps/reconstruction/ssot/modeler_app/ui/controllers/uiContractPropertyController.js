// Contract-aware property adapter. Legacy scenes keep their existing editor.
// Contract mutations always go through the hub transaction surface.
import { planContractDeletion } from '../../runtime/contractWork.js';
export function createUiContractPropertyController({ root, hub, core, legacy, signal, setHud, onDirtyChange }) {
  const pane = root.querySelector('[data-role="pane-prop"] .pane-body');
  const panel = document.createElement('div');
  panel.className = 'contract-inspector'; panel.hidden = true;
  pane?.appendChild(panel);
  let entries = [], mutating = false, activeUuid = null, pick = null, selectionKey = null;
  const active = () => !!hub.isContractWork?.();
  const work = () => hub.getContractWork?.();
  const el = (tag, text, cls, parent = panel) => {
    const node = document.createElement(tag); if (cls) node.className = cls;
    if (text != null) node.textContent = text; parent.appendChild(node); return node;
  };
  const tell = message => {
    setHud?.(message);
    let status = panel.querySelector('[data-contract-status]');
    if (!status) { status = el('p', '', 'contract-status'); status.dataset.contractStatus = ''; status.setAttribute('role','status'); }
    status.textContent = message;
  };
  const transact = operation => {
    try {
      mutating = true;
      const result = hub.applyContractOperation(operation);
      onDirtyChange?.();
      return { ok: true, result };
    } catch (error) {
      tell(String(error?.message || error)); return { ok: false };
    } finally { mutating = false; }
  };
  const drafts = () => work()?.contract?.draft?.inputs || [];
  const inputValue = (key, fallback) => drafts().find(x => x.key === key)?.raw ?? String(fallback ?? '');
  const rawKey = (owner, field) => `ui:${owner}:${field}`;
  const remember = (key, raw) => transact({ type:'draft-input', key, value:String(raw) });
  const button = (label, fn, parent = panel, cls = '') => {
    const b = el('button', label, cls, parent); b.type='button';
    b.addEventListener('click', fn, {signal}); return b;
  };
  const vector = raw => {
    const parts = String(raw).split(',').map(v=>v.trim());
    if (parts.length !== 3 || parts.some(v=>v === '' || !Number.isFinite(Number(v)))) throw new Error('位置は x, y, z の3数値で入力してな。入力は作業途中として残ってる。');
    return parts.map(Number);
  };
  // Navigation changes only the inspector's viewport, never the model selection
  // or camera. Open folded fields before focusing a pending or invalid input.
  function focusInput(input) {
    if (!input) return;
    for (let ancestor = input.parentElement; ancestor && ancestor !== panel; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
    }
    input.scrollIntoView?.({ block:'center', inline:'nearest' });
    input.focus?.({ preventScroll:true });
  }
  function field({ owner, name, label, value, operation, choices, help, parent = panel }) {
    const box = el('label', null, 'contract-field', parent);
    el('span', label, 'contract-field-label', box);
    const input = el(choices ? 'select' : 'input', null, 'prop-input', box);
    if (!choices) input.type = 'text';
    const key = rawKey(owner,name);
    input.dataset.contractField = name; input.dataset.contractOwner = owner;
    input.setAttribute('aria-label',label);
    if (choices) for (const option of choices) { const o=el('option',option.label,'',input); o.value=option.value; }
    const pending = inputValue(key,value);
    if (choices && !choices.some(o=>o.value === pending)) { const option=el('option',`未解決: ${pending}`,'',input); option.value=pending; }
    input.value = pending;
    if (help) el('small',help,'contract-help',box);
    const entry = { key, name, input, value:String(value ?? ''), operation };
    entries.push(entry);
    input.addEventListener('focus',()=>core.beginHistoryGroup?.(),{signal});
    input.addEventListener('blur',()=>core.endHistoryGroup?.(),{signal});
    input.addEventListener('input',()=>{ input.removeAttribute?.('aria-invalid'); remember(key,input.value); statusSummary(); },{signal});
    if (choices) input.addEventListener('change',()=>{ remember(key,input.value); statusSummary(); },{signal});
    return input;
  }
  function statusSummary() {
    const raw = drafts();
    const s = panel.querySelector('[data-contract-draft-summary]');
    if (s) s.textContent = `作業入力 ${raw.length}件。保存は未適用の入力も保持。適用で現在の内容へ反映。`;
  }
  function applyActiveEdits() {
    if (!active()) return legacy.applyActiveEdits?.();
    const locked = new Set(core.listLocks?.() || []);
    if (activeUuid && locked.has(activeUuid)) { tell('選択要素はロック中や。'); return false; }
    core.endHistoryGroup?.();
    const operations = [], clearDraftKeys = [];
    let checking = null;
    try {
      for (const f of entries) {
        checking = f;
        f.input.removeAttribute?.('aria-invalid');
        const pending = drafts().some(d=>d.key === f.key);
        if (f.input.value !== f.value || f.alwaysApply) operations.push(f.operation(f.input.value));
        if (pending) clearDraftKeys.push(f.key);
      }
    } catch (error) {
      tell(error.message);
      checking?.input.setAttribute('aria-invalid','true');
      focusInput(checking?.input);
      return false;
    }
    if (!operations.length && !clearDraftKeys.length) return true;
    const result = transact({type:'batch',operations,clearDraftKeys});
    if (!result.ok) return false;
    render(); tell('表示した共有範囲と、この出現への変更を適用したで。'); return true;
  }
  function discardEdits() {
    if (!active()) return legacy.discardEdits?.();
    core.endHistoryGroup?.();
    const keys=entries.map(e=>e.key);
    const operations=keys.map(key=>({type:'discard-draft',key}));
    const inspection=activeUuid?hub.getContractInspection?.(activeUuid):null;
    if(inspection?.kind==='occurrence'&&drafts().some(d=>d.occurrence===inspection.occurrence.id&&d.field==='frames')){
      operations.push({type:'frames',occurrence:inspection.occurrence.id,value:inspection.occurrence.frames.join(',')});
    }
    if (transact({type:'batch',operations}).ok) { render(); tell('入力を取消したで。現在の内容は変えてへん。'); }
  }
  const occurrenceOptions = c => c.occurrences.map(o=>({value:o.id,label:`${c.targets.find(t=>t.id===o.target)?.name || o.target} · ${o.id}`}));
  function renderOccurrence(info,c,appearanceOpen=false) {
    const o=info.occurrence, t=info.target;
    const shared=c.occurrences.filter(x=>x.target===t.id).length;
    el('h3',t.name || '名前なし','contract-title');
    el('p',`この出現: ${o.id} ／ 対象: ${t.id}`,'contract-context');
    const epistemicNames={hypothesis:'仮説',undetermined:'未判定',asserted:'主張あり',confirmed:'確定',unknown:'不明'};
    el('p',`内容の状態: ${epistemicNames[t.epistemic] || t.epistemic}（形式の有効性とは別）`,'contract-help');
    el('p',`共有名称は ${shared} 出現の名称参照欄に反映。位置はこの出現だけ。`,'contract-help');
    field({owner:t.id,name:'name',label:'共有名称',value:t.name,operation:name=>({type:'rename',target:t.id,name})});
    const labelMode=field({owner:o.id,name:'labelMode',label:'この出現のラベル',value:o.labelOverride == null ? 'shared':'own',choices:[{value:'shared',label:'共有名称を表示'},{value:'own',label:'この出現だけの文字'}],operation:value=>({type:'label-text',occurrence:o.id,value:value === 'shared' ? null : labelInput.value})});
    const labelInput=field({owner:o.id,name:'label',label:'個別ラベルの文字',value:o.labelOverride ?? '',help:'「この出現だけの文字」のときに使用。空文字は文字を表示しない。',operation:value=>({type:'label-text',occurrence:o.id,value:labelMode.value === 'shared' ? null : value})});
    let spatial=info.semanticPosition ? '意味ある位置：この出現の座標から規約の値を読む。移動は意味を変更。' : '自由配置：位置を調整しても未宣言の意味は追加せえへん。';
    if (info.boundaryParticipant) spatial += ' 境界の内外判定対象。';
    el('p',spatial,'contract-spatial');
    if(info.semanticPosition&&c.axis){
      const axis=c.axis,dimension=['X','Y','Z'][axis.dimension] ?? String(axis.dimension);
      el('p',`${axis.quantity || '規約の量'} = ${dimension}座標 ／ 単位: ${axis.unit ?? axis.units ?? '未指定'} ／ 現在値: ${info.position[axis.dimension]}`,'contract-help');
    }
    field({owner:o.id,name:'position',label:'この出現の位置 x, y, z',value:info.position.join(', '),operation:value=>({type:'move',occurrence:o.id,position:vector(value)})});
    const details=el('details',null,'contract-details'); details.dataset.contractAppearance=''; details.open=appearanceOpen;
    el('summary','ラベル位置・表示所属','',details);
    field({owner:o.id,name:'labelOffset',label:'ラベル位置差 x, y, z',value:o.labelOffset.join(', '),operation:value=>({type:'label-offset',occurrence:o.id,offset:vector(value)}),parent:details,help:'アンカーや関係の参与者は動かさない。'});
    const framesRaw=(c.draft.inputs || []).find(d=>d.occurrence===o.id&&d.field==='frames')?.raw;
    const framesInput=field({owner:o.id,name:'frames',label:'表示所属 frames',value:o.frames.join(','),operation:value=>{
      const xs=value.split(',').map(s=>s.trim());
      if (!xs.length || xs.some(s=>! /^-?\d+$/.test(s) || +s < -64 || +s > 63)) throw new Error('framesは -64〜63 の整数をカンマで区切ってな。入力は残してある。');
      return {type:'frames',occurrence:o.id,value};
    },parent:details,help:framesRaw != null ? '保存された不正入力。図は最後の有効な所属で表示中。':'例 0,1。現在見ている表示番号とは別。'});
    entries.at(-1).alwaysApply=framesRaw != null;
    if(framesRaw != null && !drafts().some(d=>d.key===rawKey(o.id,'frames')))framesInput.value=framesRaw;
    const same=el('details',null,'contract-details'); el('summary',`同じ対象の出現 ${shared}件`,'',same);
    for(const other of c.occurrences.filter(x=>x.target===t.id)) button(other.id,()=>{if(applyActiveEdits())core.setSelection([other.anchor]);},same);
  }
  function renderRelation(info,c) {
    const r=info.relation;
    el('h3',r.name || '関係','contract-title'); el('p',`関係: ${r.id}`,'contract-context');
    field({owner:r.id,name:'relationName',label:'関係の名称',value:r.name,operation:value=>({type:'relation-meta',relation:r.id,name:value})});
    field({owner:r.id,name:'condition',label:'条件',value:r.condition,operation:value=>({type:'relation-meta',relation:r.id,condition:value})});
    field({owner:r.id,name:'direction',label:'方向の規約',value:r.direction,choices:[{value:'role-defined',label:'役割で区別'},{value:'ordered',label:'参与の順序を区別'}],operation:value=>({type:'relation-meta',relation:r.id,direction:value})});
    el('p','参加枠ごとに役割と対象を編集。同じ対象の二役も別の枠として保持する。','contract-help');
    for(const p of r.participants) {
      const section=el('fieldset',null,'contract-slot'); el('legend',`参加枠 ${p.id}`,'',section);
      field({owner:`${r.id}:${p.id}`,name:'role',label:'役割',value:p.role,operation:role=>({type:'role',relation:r.id,slot:p.id,role}),parent:section});
      field({owner:`${r.id}:${p.id}`,name:'participant',label:'接続する対象・出現',value:p.occurrence,choices:occurrenceOptions(c),operation:occurrence=>({type:'participant',relation:r.id,slot:p.id,occurrence,target:c.occurrences.find(o=>o.id===occurrence)?.target}),parent:section,help:'同じ対象の別出現なら表示接続だけ。別対象なら参与者を変更。'});
      button('図から指定',()=>{if(!applyActiveEdits())return;pick={relation:r.id,slot:p.id};tell(`役割「${p.role}」の接続先を図から選んでな。Escで取消。`);},section);
    }
    for(const ref of r.refs) el('p',`関係への参照：${ref.role} → ${ref.relation}（この版では参照先の変更は未対応）`,'contract-help');
  }
  function renderBoundary(info) {
    el('h3','意味ある境界','contract-title');
    el('p','幾何が正本。XYへ投影したアンカーで、辺を含めて判定。Zは使わない。','contract-spatial');
    field({owner:info.boundary.aux,name:'bounds',label:'範囲 xmin, ymin, xmax, ymax',value:info.bounds.join(', '),operation:raw=>{
      const parts=raw.split(',').map(s=>s.trim()), bounds=parts.map(Number);
      if(parts.length!==4||parts.some(s=>s==='')||!bounds.every(Number.isFinite)||bounds[0]>bounds[2]||bounds[1]>bounds[3])throw new Error('境界は4数値を最小→最大の順で入力してな。');
      return {type:'boundary',bounds};
    }});
    el('p',`現在の内側・辺上：${(hub.getContractMeaning?.()?.members || []).join(', ') || 'なし'}`,'contract-help');
  }
  function renderPending(c) {
    const list=c.draft?.pendingRelations || [];
    if(!list.length)return;
    const section=el('details',null,'contract-details');section.open=true;
    el('summary',`作成途中の関係 ${list.length}件`,'',section);
    for(const pending of list) {
      const form=el('div',null,'contract-slot',section);
      el('strong',pending.name || pending.id || '新しい関係','',form);
      const name=el('input',null,'prop-input',form);name.type='text';name.setAttribute('aria-label','新しい関係の名称');name.value=pending.name || '新しい関係';
      const choose=(label,index)=>{el('small',label,'',form);const input=el('select',null,'prop-input',form);input.setAttribute('aria-label',label);const empty=el('option','選択してな','',input);empty.value='';for(const o of occurrenceOptions(c)){const opt=el('option',o.label,'',input);opt.value=o.value;}input.value=(index === 0 ? pending.participantA : pending.participantB) || '';return input;};
      const a=choose('参加枠1の対象・出現',0),b=choose('参加枠2の対象・出現',1);
      const roleA=el('input',null,'prop-input',form);roleA.type='text';roleA.setAttribute('aria-label','参加枠1の役割');roleA.value=pending.participants?.[0]?.role || 'from';
      const roleB=el('input',null,'prop-input',form);roleB.type='text';roleB.setAttribute('aria-label','参加枠2の役割');roleB.value=pending.participants?.[1]?.role || 'to';
      for(const [key,input]of [['name',name],['a',a],['b',b],['roleA',roleA],['roleB',roleB]]){const k=rawKey(pending.id,key);input.value=inputValue(k,input.value);input.addEventListener('input',()=>remember(k,input.value),{signal});input.addEventListener('change',()=>remember(k,input.value),{signal});}
      button('この関係を作成',()=>{
        if(!a.value||!b.value){tell('二つの参加枠を選んでな。未接続のままでも一式保存できる。');return;}
        const result=transact({type:'complete-relation',pending:pending.id,name:name.value,source:a.value,destination:b.value,sourceRole:roleA.value,destinationRole:roleB.value,clearDraftKeys:['name','a','b','roleA','roleB'].map(k=>rawKey(pending.id,k))});
        if(result.ok){render();tell('関係を作成したで。');}
      },form);
    }
  }
  function renderDeletion(info) {
    if(!['occurrence','relation'].includes(info?.kind))return;
    const section=el('details',null,'contract-details');section.dataset.contractDelete='';
    el('summary','削除する範囲を選ぶ','',section);
    const preview=el('div',null,'contract-delete-preview',section);
    const show=operation=>{
      preview.replaceChildren();
      let plan;
      try{plan=planContractDeletion(work(),operation);}catch(error){tell(error.message);return;}
      const names=xs=>xs.map(x=>x.name || x.id).join('、') || 'なし';
      el('p',`削除する対象: ${names(plan.targets)} ／ 表示から外す出現: ${plan.occurrences.map(x=>x.id).join('、') || 'なし'}`,'contract-context',preview);
      if(plan.unresolvedRelationIds.length)el('p',`関係内容は保持・表示接続の要修復: ${names(plan.relations.filter(r=>plan.unresolvedRelationIds.includes(r.id)))}`,'contract-spatial',preview);
      if(plan.archivedRelationIds.length)el('p',`削除記録へ移す関係: ${names(plan.relations.filter(r=>plan.archivedRelationIds.includes(r.id)))}`,'contract-spatial',preview);
      el('p',`表示部品 ${plan.sceneIds.length}件を外す。元の参加枠・役割・参照・表示情報は一式保存に残り、保持記録から復元できる。未適用の入力も保持する。`,'contract-help',preview);
      if(plan.blockers.length){for(const blocker of plan.blockers)el('p',blocker,'contract-status',preview);return;}
      const execute=button('この範囲で削除を実行',()=>{
        core.endHistoryGroup?.();
        if(transact(operation).ok){core.setSelection([]);render();tell(plan.unresolvedRelationIds.length?'指定範囲を外したで。関係内容は保持され、表示接続の要修復として残ってる。':'削除した内容を保持記録へ移したで。保存後も復元できる。');}
      },preview);
      execute.dataset.contractDeleteCommit='';
    };
    if(info.kind==='occurrence'){
      const b=button('この出現だけを削除',()=>show({type:'delete-occurrence',occurrence:info.occurrence.id}),section);b.dataset.contractDeleteKind='occurrence';
      const t=button('対象と全出現を削除',()=>show({type:'delete-target',target:info.target.id}),section);t.dataset.contractDeleteKind='target';
      el('p','出現だけの削除なら同じ対象の別出現は残る。対象の削除は全出現と、その対象に依存する関係を削除記録へ移す。','contract-help',section);
    } else {const b=button('この関係を削除',()=>show({type:'delete-relation',relation:info.relation.id}),section);b.dataset.contractDeleteKind='relation';}
  }
  function renderDetached(c) {
    const records=c.draft.detached || [];if(!records.length)return;
    const section=el('details',null,'contract-details');section.open=true;
    el('summary',`表示接続の要修復・削除の保持記録 ${records.length}件`,'',section);
    for(const record of records){
      const item=el('div',null,'contract-slot',section);
      el('strong',record.reason==='missing-display-occurrence'?'出現を削除：関係内容は保持':record.reason==='target-deleted'?'対象を削除した記録':'関係を削除した記録','',item);
      for(const r of record.content.relations){
        const disposition=record.unresolvedRelationIds.includes(r.id)?'内容を保持・表示接続の要修復':'明示した削除範囲の記録';
        el('p',`${r.name || r.id}: ${disposition}。条件: ${r.condition || 'なし'}。役割: ${[...r.participants,...r.refs].map(p=>`${p.role} → ${p.target || p.relation}`).join('／')}`,'contract-help',item);
      }
      const details=el('details',null,'contract-details',item);el('summary','削除前の対象・出現・関係・表示情報','',details);el('pre',JSON.stringify(record.content,null,2),'contract-draft-row',details);
      button('この記録を復元',()=>{if(transact({type:'restore-detached',record:record.id}).ok){render();tell('保持記録を復元したで。共有名称は現在の対象名を使う。');}},item);
      el('small','参照先がまだ欠けている場合は復元を止める。欠けた側の記録から先に復元してな。','contract-help',item);
    }
  }
  function render() {
    if(mutating)return;
    const enabled=active();root.classList.toggle('is-contract-work',enabled);panel.hidden=!enabled;
    if(!enabled)return;
    const w=work(),c=w.contract,ids=core.getSelection?.()||[];
    const nextSelectionKey = ids.join('|');
    const selectionChanged = nextSelectionKey !== selectionKey;
    selectionKey = nextSelectionKey;
    const previousScroll = panel.scrollTop || 0;
    const appearanceOpen = !selectionChanged && !!panel.querySelector('[data-contract-appearance]')?.open;
    panel.replaceChildren();entries=[];
    activeUuid=ids.length===1?ids[0]:null;
    const info=activeUuid?hub.getContractInspection?.(activeUuid):null;
    const badge=el('p','再構築版 · 作品一式','contract-badge');badge.dataset.contractMode='';
    const toolbar=el('div',null,'contract-edit-toolbar');
    if(info?.kind==='occurrence')renderOccurrence(info,c,appearanceOpen);
    else if(info?.kind==='relation')renderRelation(info,c);
    else if(info?.kind==='boundary')renderBoundary(info);
    else {
      el('p',ids.length>1?'複数選択中。この版の契約編集は一出現・一関係ずつ。':'図の点・関係・境界を選ぶと、変更範囲と入力欄がここに出る。','contract-help');
      const nav=el('details',null,'contract-details');el('summary','対象・関係を選ぶ','',nav);
      for(const o of c.occurrences)button(`${c.targets.find(t=>t.id===o.target)?.name || o.target} · ${o.id}`,()=>core.setSelection([o.anchor]),nav);
      for(const r of c.relations)button(`関係: ${r.name}`,()=>core.setSelection([r.hub]),nav);
      if(c.boundary)button('意味ある境界',()=>core.setSelection([c.boundary.aux]),nav);
    }
    if(entries.length){
      const actions=el('div',null,'contract-actions',toolbar);
      const apply=button('適用',applyActiveEdits,actions,'contract-apply');
      apply.title='Ctrl / Cmd + Enter'; apply.setAttribute('aria-keyshortcuts','Control+Enter Meta+Enter');
      const cancel=button('入力を取消',discardEdits,actions); cancel.title='入力中に Esc';
      const nav=el('div',null,'contract-field-nav',toolbar);nav.setAttribute('aria-label','編集項目へ移動');
      for(const [name,label] of [['name','名称'],['relationName','名称'],['position','位置'],['participant','接続'],['frames','表示'],['bounds','境界']]){
        const entry=entries.find(e=>e.name===name);
        if(entry)button(label,()=>focusInput(entry.input),nav);
      }
    }
    renderDeletion(info);
    renderPending(c);
    renderDetached(c);
    const s=el('p','','contract-help');s.dataset.contractDraftSummary='';statusSummary();
    const extra=el('details',null,'contract-details');el('summary','保存される作業途中・未解釈情報','',extra);
    const meaning=hub.getContractMeaning?.();
    el('p',`原情報 ${c.sources?.length || 0}件／未解釈 ${meaning?.uninterpretedSources || 0}件。原文は書き換えへん。一般の資料ハッシュは保持のみ。取込保留の原文は専用欄で照合する。`,'contract-help',extra);
    for(const draft of c.draft.inputs || [])el('p',`${draft.key || `${draft.occurrence || draft.owner || ''}:${draft.field || ''}`} = ${draft.raw}`,'contract-draft-row',extra);
    const journal = hub.getContractWork?.()?.journal || [];
    if (journal.length) {
      const history = el('details',null,'contract-details');
      el('summary',`保存される変更記録 ${journal.length}件`,'',history);
      history.addEventListener('toggle',() => {
        if (!history.open || history.dataset.loaded) return;
        history.dataset.loaded = 'true';
        el('p','Undoで内容を戻しても、この記録は残る。作品を保存すると一緒に保存される。','contract-help',history);
        for (const entry of journal) {
          const item = el('details',null,'',history);
          el('summary',`${entry.sequence}: ${entry.action} / ${entry.operation}`,'',item);
          item.addEventListener('toggle',() => {
            if (item.open && !item.dataset.loaded) { item.dataset.loaded='true'; el('pre',JSON.stringify(entry,null,2),'',item); }
          });
        }
      });
    }
    const status=el('p','','contract-status',toolbar);status.dataset.contractStatus='';status.setAttribute('role','status');
    panel.scrollTop=selectionChanged?0:previousScroll;
  }
  function handleToolbarAction(action) {
    if(!active())return false;
    if(action==='tool-move')return false;
    if(action==='qc-fix-lines'){tell('新しい作品契約では線の自動削除は行わへん。作業途中・検査の内容を確認してな。');return true;}
    return false;
  }
  function handleDelete() {
    if(!active())return false;
    const section=panel.querySelector('[data-contract-delete]');
    if(section){section.open=true;section.querySelector('button')?.focus();tell('プロパティの「削除する範囲を選ぶ」で範囲を選んで、影響を確認してな。');}
    else tell('削除する出現か関係を一つ選んでな。境界・複数選択の削除はこの版では未対応や。');
    return true;
  }
  root.addEventListener('click',event=>{
    if(!active())return;
    const action=event.target.closest?.('[data-action]')?.dataset.action;
    if(!['add-point','add-line','delete'].includes(action))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(action==='delete'){handleDelete();return;}
    if(!applyActiveEdits())return;
    const selected=activeUuid?hub.getContractInspection?.(activeUuid):null;
    const result=transact({type:action==='add-point'?'create-point':'create-relation',...(action==='add-line'&&selected?.kind==='occurrence'?{occurrence:selected.occurrence.id}:{})});
    if(result.ok){const next=hub.getContractWork();if(action==='add-point'){const o=next.contract.occurrences.at(-1);if(o)core.setSelection([o.anchor]);}render();tell(action==='add-point'?'点を追加したで。共有名称とこの出現の位置を編集できる。':'作成途中の関係を追加したで。参加枠を選ぶか、そのまま保存して再開できる。');}
  },{capture:true,signal});
  window.addEventListener('keydown',event=>{if(active()&&event.key==='Escape'&&pick){pick=null;tell('接続先の指定を取消したで。');}},{signal});
  panel.addEventListener('keydown',event=>{
    if(!active()||event.isComposing||event.keyCode===229)return;
    if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();applyActiveEdits();}
    else if(event.key==='Escape'&&!pick){event.preventDefault();discardEdits();}
  },{signal});
  const own={
    syncFromSelection(){if(active())render();else{render();legacy.syncFromSelection?.();}},
    refreshActiveFromDoc(){if(active())render();else{render();legacy.refreshActiveFromDoc?.();}},
    refreshLockState(){if(active())render();else legacy.refreshLockState?.();},
    getActiveUuid(){return active()?activeUuid:legacy.getActiveUuid?.();},
    isDirty(){return active()?false:legacy.isDirty?.();},
    applyActiveEdits,discardEdits,handleToolbarAction,handleDelete,
    ensureEditsAppliedOrConfirm(options={}){
      if(!active())return legacy.ensureEditsAppliedOrConfirm?.(options);
      if(['file','new','open','history'].includes(options.reason))return true;
      return applyActiveEdits();
    },
    handlePreviewPickOverride(issueLike,event){
      if(!active())return legacy.handlePreviewPickOverride?.(issueLike,event);
      if(!pick)return false;
      const info=hub.getContractInspection?.(issueLike?.uuid);
      if(info?.kind!=='occurrence'){tell('接続先の出現を選んでな。');return true;}
      const p=pick;pick=null;
      if(transact({type:'participant',relation:p.relation,slot:p.slot,target:info.target.id,occurrence:info.occurrence.id}).ok){render();tell('指定した参加枠の接続先を更新したで。');}
      return true;
    },
    focusFieldByIssue(issue){if(active()){panel.querySelector('input')?.focus();return;}legacy.focusFieldByIssue?.(issue);},
  };
  signal?.addEventListener('abort',()=>panel.remove(),{once:true});
  render();
  return new Proxy(own,{get(target,key){return key in target?target[key]:legacy[key];}});
}
