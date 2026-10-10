import { assert, equivalent } from './loadCheckLogic.js';

// Runs inside the diagnostic parent while the actual, unmodified application
// owns its iframe DOM, validator, history, file controller and renderer.
// Synthetic DOM events do not certify pointer hit-testing or native dialogs.
export async function runContractChecks({ load, settle, saveAndCheck, session, note, click, action, waitUntil, release }) {
  const report = { status: 'INCOMPLETE', checks: [], savedFiles: [],
    scope: 'Actual Modeler iframe, DOM property controls, application history and real disk save/reopen through a diagnostic file-picker substitute. Pixel correctness, physical pointer dragging and native OS dialogs are not asserted.' };
  let env;
  const check = (name, condition, message = name) => { assert(condition, message); report.checks.push({name,status:'PASS'}); };
  const copy = value => JSON.parse(JSON.stringify(value));
  const field = (name, owner) => env.doc.querySelector(`[data-contract-field="${name}"]${owner ? `[data-contract-owner="${owner}"]` : ''}`);
  const select = async uuid => { env.core.setSelection([uuid]); await settle(env); };
  const edit = (name, value, owner) => {
    const input = field(name, owner); assert(input, `入力欄がありません: ${name}`);
    const closed = input.closest('details'); if (closed) closed.open = true;
    input.focus(); input.value = value;
    input.dispatchEvent(new env.win.Event(input.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true}));
    input.blur();
  };
  const apply = async () => { click(env.doc.querySelector('.contract-apply')); await settle(env); };
  const work = () => copy(env.hub.getContractWork());
  const content = value => { const cloned=copy(value);delete cloned.journal;return cloned; };
  const history = async (name, before, after) => {
    const protectedBefore=copy(after.journal || []);
    click(action(env.doc,'undo')); await settle(env);
    check(`${name}: Undo`, equivalent(content(work()), content(before)), 'Undoで変更直前の作品へ戻りません');
    check(`${name}: Undo後も変更記録を保持`, equivalent((work().journal || []).slice(0,protectedBefore.length), protectedBefore) && (work().journal || []).at(-1)?.action === 'undo');
    click(action(env.doc,'redo')); await settle(env);
    check(`${name}: Redo`, equivalent(content(work()), content(after)), 'Redoで変更後の作品へ戻りません');
    check(`${name}: Redoの記録を追記`,(work().journal || []).at(-1)?.action === 'redo');
  };
  const reopen = async (fixture, expected) => {
    const filename = `contract-${fixture}.3dsl-work.json`;
    const path = await saveAndCheck(env, session, fixture, filename);
    report.savedFiles.push(path);
    check(`${fixture}: 保存完了`, !env.core.isDirty());
    const response = await fetch(path,{cache:'no-store'}); assert(response.ok,'保存物が取得できません');
    const bytes = await response.text();
    // Reopen through the app's normal Open button. FSA substitution is the same
    // bounded local bridge as Save; no native dialog is claimed.
    env.win.showOpenFilePicker = async () => [{name:filename,getFile:async()=>new env.win.File([bytes],filename,{type:'application/json'})}];
    const epoch = env.core.getDocumentEpoch();
    click(action(env.doc,'open'));
    await waitUntil(()=>env.core.getDocumentEpoch() !== epoch,{label:`${fixture}: 保存物の開き直し`});
    await settle(env);
    check(`${fixture}: 開き直しで作品・原文・未完成入力を保持`, equivalent(work(),JSON.parse(bytes)));
    // Some saved metadata is revised by normal Save. Content contract and source
    // records must still match the state requested for saving.
    check(`${fixture}: 保存前後の契約・原文が一致`, equivalent(work().contract,expected.contract));
  };
  for (let n=1;n<=4;n++) {
    const fixture=`F${n}`; let phase=`${fixture}: 読込`;
    try {
      note(`新しい作品 ${fixture}/F4: 編集・保存・開き直しを自動検査中。このタブを前面にして待ってください。`);
      env=await load(`contract-${fixture}`,`/models/reconstruction_${fixture}.3dsl-work.json`);
      check(`${fixture}: 作品契約の読込`,work().contract.fixture===fixture);
      const original=work(), c=original.contract;
      if(n===1) {
        phase='F1: 共有名称と一出現の位置';
        const a=c.occurrences.find(o=>o.id==='q-overview'), b=c.occurrences.find(o=>o.id==='q-detail');
        const beforeOther=copy(env.hub.getContractInspection(b.anchor).position);
        await select(a.anchor);
        const camera=copy(env.hub.getViewState());
        edit('name','自動検査の共有名称'); edit('position','2, 3, 4');
        const before=work(); await apply(); const after=work();
        check('F1: 共有名称変更',after.contract.targets.find(t=>t.id===a.target).name==='自動検査の共有名称');
        check('F1: 一出現だけ移動',equivalent(env.hub.getContractInspection(a.anchor).position,[2,3,4])&&equivalent(env.hub.getContractInspection(b.anchor).position,beforeOther));
        await history('F1: 共有名称・一出現移動',before,after);
        await select(b.anchor);
        check('F1: 通常選択で視点を維持',equivalent(env.hub.getViewState(),camera,1e-7));
        phase='F1: Save As取消';
        let called=false;
        env.win.showSaveFilePicker=async()=>{called=true;throw new env.win.DOMException('診断用の取消','AbortError');};
        const beforeCancel=work(); click(action(env.doc,'saveas'));
        await waitUntil(()=>called,{label:'F1: Save As取消'}); await settle(env);
        check('F1: Save As取消で作品と未保存状態を保持',equivalent(work(),beforeCancel)&&env.core.isDirty());
      } else if(n===2) {
        phase='F2: 関係の役割と参与者';
        const r=c.relations.find(r=>r.id==='loan'), ref=copy(c.relations.find(r=>r.id==='supports'));
        await select(r.hub); edit('role','借り手（検査）','loan:borrower'); edit('participant','book2','loan:item');
        const before=work();await apply();const after=work();
        const changed=after.contract.relations.find(r=>r.id==='loan');
        check('F2: 同一対象の二役を別枠のまま保持',changed.participants[0].target===changed.participants[1].target&&changed.participants[0].role!==changed.participants[1].role);
        check('F2: 指定した参与者だけ変更',changed.participants.find(p=>p.id==='item').target==='book2'&&equivalent(after.contract.relations.find(r=>r.id==='supports'),ref));
        await history('F2: 役割と参与者',before,after);
      } else if(n===3) {
        phase='F3: 意味ある位置と境界';
        const a=c.occurrences.find(o=>o.id==='a-priority');await select(a.anchor);edit('position','12, 3, 0');
        await apply();
        const meaning=env.hub.getContractMeaning();
        check('F3: 移動後の軸の値を位置から読む',meaning.priorities?.[a.id]===12);
        await select(c.boundary.aux);edit('bounds','0, 0, 10, 10');
        const before=work();await apply();const after=work();
        const resulting=env.hub.getContractMeaning();
        check('F3: 境界を幾何から読み直す',equivalent(resulting.bounds,[0,0,10,10])&&!resulting.members.includes(a.id));
        await history('F3: 境界変更',before,after);
      } else {
        phase='F4: 不正入力と未接続';
        const o=c.occurrences.find(o=>o.id==='hypothesis');await select(o.anchor);
        check('F4: 保存済みabcを入力欄に復元',field('frames').value==='abc');
        const before=work();await apply();
        check('F4: 不正入力の適用を止めて内容を保持',equivalent(work(),before)&&field('frames').value==='abc');
        check('F4: 未接続の関係を保持',work().contract.draft.pendingRelations.length===1&&work().scene.lines.length===original.scene.lines.length);
      }
      phase=`${fixture}: 保存・開き直し`;
      await reopen(fixture,work());
      if(n===4){const o=work().contract.occurrences.find(o=>o.id==='hypothesis');await select(o.anchor);check('F4: 開き直した入力欄にabcを復元',field('frames').value==='abc');}
    } catch(error) {
      report.checks.push({name:phase,status:'FAIL',error:String(error?.message||error)});
    } finally {
      try { release(env); } catch(error){report.checks.push({name:`${fixture}: 終了処理`,status:'FAIL',error:String(error)});}
      env=null;
    }
  }
  report.status=report.checks.some(c=>c.status==='FAIL')?'FAIL':'PASS';
  return report;
}
