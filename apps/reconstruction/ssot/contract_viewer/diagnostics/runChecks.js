import { OPERATIONS, HIGH, TWINS, FIXTURES, IncompleteError, assert, equivalent, readingState, parseSnapshot, measured, summarize, combineStatuses } from './checkLogic.js';

const SYNTHETIC = '/models/synthetic_1000_2000.3dsl-work.json';
const BASE_CHECKS = [
  ['open', '形式を自動判別して読込'], ['original', '入力作品の全値を保持'],
  ['selection', '選択と情報欄の連動・通常選択で視点を保持'],
  ['invalid', '不正ファイルで前の閲覧状態を保持'], ['cancel', '開く取消で前の閲覧状態を保持'],
  ['readonly', '制作ショートカットで作品を変更しない'], ['unchanged', '閲覧後も原作品の全値が一致'],
];
const SPECIAL_CHECKS = {
  F1: [['identities', '同名別対象と同一対象の別出現を区別']],
  F2: [['roles', '同一参与者の二役・関係への参照を読める']],
  F3: [['spatial', '宣言された意味軸・境界を読める']],
  F4: [['draft', '未適用abc・未接続関係・原資料を保持して表示']],
  legacy: [['legacy', '現在の図と旧対応記録を区別']],
  scene: [['scene', '図単体を推測で作品契約に変換しない']],
};
const statusOf = error => error instanceof IncompleteError ? 'INCOMPLETE' : 'FAIL';
const requireMethod = (api, name) => { if (typeof api[name] !== 'function') throw new IncompleteError(`診断接続 ${name} がありません`); };
async function apiCall(env, name, ...args) { requireMethod(env.api, name); return await env.guard(() => env.api[name](...args), name); }
const state = env => env.api.snapshot();
const raw = env => parseSnapshot(env.api.rawSnapshot());
const sceneOf = data => data.scene || data;
const firstSelectable = data => data.contract?.occurrences?.[0]?.anchor || sceneOf(data).points[0]?.meta.uuid || sceneOf(data).lines[0]?.meta.uuid;
const fileName = path => path.split('/').at(-1);

export async function runPerformanceRound(report, env, round, onProgress = () => {}) {
  const original = structuredClone(raw(env));
  assert(original.scene?.points?.length === 1000 && original.scene?.lines?.length === 2000, '固定1,000点・2,000線ではありません');
  const measure = (operation, task) => { onProgress(`${round}/5回目：${OPERATIONS[operation].label}`); return measured(report, operation, round, task); };
  await apiCall(env, 'setFrame', 0);
  // Fresh navigation starts with an empty query; no search warm-up is excluded.
  await measure('search', async () => {
    await apiCall(env, 'search', '同名の対象');
    const s = state(env);
    assert(s.resultCount === 2 && TWINS.every(id => s.resultIds?.includes(id)), '同名の別対象2件を区別して検索できません');
  });
  await apiCall(env, 'search', HIGH);
  const beforeSelection = structuredClone(state(env).camera);
  await measure('selection', async () => {
    await apiCall(env, 'select', HIGH);
    assert(state(env).selectedId === HIGH, '指定対象を選択できません');
    assert(equivalent(state(env).camera, beforeSelection, 1e-7), '通常選択で視点が変化しました');
  });
  await measure('info', async () => {
    await apiCall(env, 'info', TWINS[0]);
    assert(state(env).selectedId === TWINS[0], '情報欄の対象が切り替わりません');
    assert(env.readInfo().includes('同名の対象'), '選択対象の情報が欄に表示されません');
  });
  await apiCall(env, 'select', HIGH);
  const beforeScope = readingState(state(env));
  await measure('scope', async () => {
    await apiCall(env, 'setScope', 'related');
    assert(state(env).scope === 'related', '接続範囲に切り替わりません');
  });
  await apiCall(env, 'setScope', 'all');
  assert(equivalent(readingState(state(env)), beforeScope, 1e-7), '範囲を全体へ戻した際に他の閲覧状態が変わりました');
  const beforeRelated = readingState(state(env));
  await measure('related', async () => {
    await apiCall(env, 'explore', HIGH);
    assert(state(env).scope === 'related' && state(env).historyDepth > beforeRelated.historyDepth, '接続探索を開始できません');
  });
  await measure('frame', async () => {
    const target = round % 2 + 1;
    await apiCall(env, 'setFrame', target);
    assert(state(env).frame === target, '表示を切り替えられません');
  });
  await measure('back', async () => {
    await apiCall(env, 'back');
    assert(equivalent(readingState(state(env)), beforeRelated, 1e-7), '表示・範囲・選択・検索・フィルター・視点が探索前へ戻りません');
  });
  assert(equivalent(raw(env), original), '負荷検査中に元の作品が変わりました');
}

export function prepareFunctionalChecks(report) {
  report.checks = FIXTURES.flatMap(([fixture]) => [...BASE_CHECKS, ...SPECIAL_CHECKS[fixture]].map(([id, label]) => ({ id: `${fixture}:${id}`, fixture, label, status: 'INCOMPLETE' })));
}

export async function runFunctionalFixture(report, env, fixture, path, input, onProgress = () => {}) {
  const check = async (id, task) => {
    const row = report.checks.find(row => row.id === `${fixture}:${id}`);
    onProgress(`${fixture}：${row.label}`);
    try { await task(); row.status = 'PASS'; }
    catch (error) { row.status = statusOf(error); row.error = String(error.message || error); if (error instanceof IncompleteError) throw error; }
    return row.status === 'PASS';
  };
  const opened = await check('open', async () => {
    const result = await apiCall(env, 'openText', JSON.stringify(input), fileName(path));
    assert(result?.ok === true, `開けません：${result?.error || path}`);
    assert(state(env).format, '形式の表示がありません');
  });
  if (!opened) return;
  await check('original', async () => assert(equivalent(raw(env), input), '入力の値・原文・草稿が変化しました'));
  await check('selection', async () => {
    const id = firstSelectable(input); assert(id, '選択する要素がありません');
    const before = structuredClone(state(env).camera);
    await apiCall(env, 'info', id);
    assert(state(env).selectedId, '選択が記録されません');
    assert(equivalent(state(env).camera, before, 1e-7), '通常選択で視点が変化しました');
    assert(env.readInfo().trim().length > 0, '情報欄が空です');
  });
  if (fixture === 'F1') await check('identities', async () => {
    const c = input.contract, first = c.occurrences.find(o => o.id === 'q-overview'), second = c.occurrences.find(o => o.id === 'q-detail'), other = c.occurrences.find(o => o.id === 'q-other');
    assert(first.target === second.target && other.target !== first.target, '固定事例の対象関係が変わっています');
    await apiCall(env, 'search', '問い系列');
    assert(state(env).resultCount === 3, '同名の三出現を分離して検索できません');
    for (const occurrence of [first, second, other]) {
      await apiCall(env, 'info', occurrence.anchor);
      const text = env.readInfo();
      assert(text.includes(occurrence.id) && text.includes(occurrence.target), '対象IDと出現IDを区別して表示できません');
    }
  });
  if (fixture === 'F2') await check('roles', async () => {
    const loan = input.contract.relations.find(r => r.id === 'loan');
    await apiCall(env, 'info', loan.hub);
    let text = env.readInfo();
    assert(text.includes('貸手') && text.includes('借手') && text.includes('館内・一時'), '同一対象の二役または条件が表示されません');
    const support = input.contract.relations.find(r => r.id === 'supports');
    await apiCall(env, 'info', support.hub);
    text = env.readInfo();
    assert(text.includes('支持対象') && (text.includes('loan') || text.includes('自己への仮貸出')), '関係への参照を表示できません');
  });
  if (fixture === 'F3') await check('spatial', async () => {
    const c = input.contract;
    await apiCall(env, 'info', c.occurrences.find(o => o.id === 'a-priority').anchor);
    let text = env.readInfo();
    assert(text.includes(c.axis.quantity) && text.includes(c.axis.unit), '意味軸の量・単位を表示できません');
    await apiCall(env, 'info', c.boundary.aux);
    text = env.readInfo();
    assert(text.includes('XY') && (text.includes(c.boundary.id) || text.includes('境界')), '宣言された境界情報を表示できません');
  });
  if (fixture === 'F4') await check('draft', async () => {
    const c = raw(env).contract;
    assert(c.draft.inputs[0].raw === 'abc' && c.draft.pendingRelations.length === 1, '未完成入力・関係が失われました');
    assert(c.sources[0].utf8 === input.contract.sources[0].utf8, '原文が変わりました');
    assert(raw(env).scene.lines.length === 0, '未完成関係が完成した線になっています');
    await apiCall(env, 'info', input.contract.occurrences[0].anchor);
    await env.openRecord('作品全体・草稿・原資料の記録');
    assert(env.readInfo().includes('abc'), '未適用入力を情報欄で読めません');
  });
  if (fixture === 'legacy') await check('legacy', async () => {
    assert(raw(env).format === '3dsl-modeler-work/0.1' && !raw(env).contract, '旧作品を推測で新形式に変換しました');
    const text = env.readDocumentInfo();
    assert(text.includes('旧') && (text.includes('記録') || text.includes('対応')), '旧形式・対応記録の区別を案内していません');
  });
  if (fixture === 'scene') await check('scene', async () => {
    assert(!raw(env).contract && !raw(env).scene, '図単体に存在しない作品契約を補いました');
    assert(env.readDocumentInfo().includes('3DSS'), '図単体の形式を案内していません');
  });
  await check('invalid', async () => {
    const before = readingState(state(env)), original = structuredClone(raw(env));
    let failed = false;
    try { const result = await apiCall(env, 'openText', '{broken', 'broken.json'); failed = result?.ok === false; }
    catch (error) { if (error instanceof IncompleteError) throw error; failed = true; }
    assert(failed, '不正ファイルを成功扱いにしました');
    assert(equivalent(readingState(state(env)), before, 1e-7), '失敗読込で閲覧状態が変わりました');
    assert(equivalent(raw(env), original), '失敗読込で原作品が変わりました');
  });
  await check('cancel', async () => {
    const before = readingState(state(env)), original = structuredClone(raw(env));
    await apiCall(env, 'cancelOpen');
    assert(equivalent(readingState(state(env)), before, 1e-7) && equivalent(raw(env), original), '開く取消で作品または閲覧状態が変わりました');
  });
  await check('readonly', async () => {
    const original = structuredClone(raw(env));
    await env.sendEditingKeys();
    assert(equivalent(raw(env), original), '制作ショートカットで作品が変わりました');
    assert(!env.hasWriteControls(), '読取専用画面に保存・編集用の操作があります');
  });
  await check('unchanged', async () => assert(equivalent(raw(env), input), '閲覧後に元作品の全値が一致しません'));
}

export async function runChecks({ mount, fetchJson, onProgress = () => {}, environment = {} }) {
  const report = { format: '3dsl-viewer-check/0.1', runnerVersion: 'r0.4.2', startedAt: new Date().toISOString(),
    samples: [], checks: [], problems: [], environment, expectedRounds: 5, synthetic: SYNTHETIC,
    scope: 'Actual Viewer iframe and its normal controllers/renderer. Navigation, parsing, UI update and render-ready waits are included. No GPU completion, pixel correctness, physical mouse drag or native file dialog claim. No source-file writes. Download exports this report only.',
    timing: 'Every operation awaits the Viewer render-ready bridge. All five fresh iframe loads are included without excluding a warm-up. Foreground interruption is INCOMPLETE; exceeded thresholds remain FAIL.',
    limits: { loadMs: 5000, operationMs: 1000, physicalFileDialog: 'NOT_TESTED', pixels: 'NOT_TESTED' } };
  prepareFunctionalChecks(report);
  let env = null, interrupted = false;
  for (let round = 1; round <= 5; round++) {
    try {
      onProgress(`${round}/5回目：Viewer起動・読込`);
      env = await measured(report, 'load', round, () => mount(SYNTHETIC, round));
      await runPerformanceRound(report, env, round, onProgress);
    } catch (error) {
      report.problems.push({ phase: 'performance', round, status: statusOf(error), error: String(error.message || error) });
      if (error instanceof IncompleteError) { interrupted = true; break; }
    }
  }
  if (!interrupted) {
    try {
      // Start small for the functional round; do not leave the large synthetic scene alive.
      env = await mount(FIXTURES[0][1], 'functional');
      for (const [fixture, path] of FIXTURES) {
        const input = await fetchJson(path);
        await runFunctionalFixture(report, env, fixture, path, input, onProgress);
      }
    } catch (error) {
      report.problems.push({ phase: 'functional', status: statusOf(error), error: String(error.message || error) });
    }
  }
  report.summary = summarize(report.samples);
  report.performanceStatus = combineStatuses([...report.summary.map(row => row.status), ...report.problems.filter(row => row.phase === 'performance').map(row => row.status)]);
  report.functionalStatus = combineStatuses([...report.checks.map(row => row.status), ...report.problems.filter(row => row.phase === 'functional').map(row => row.status)]);
  report.status = combineStatuses([report.performanceStatus, report.functionalStatus]);
  report.finishedAt = new Date().toISOString();
  return report;
}
