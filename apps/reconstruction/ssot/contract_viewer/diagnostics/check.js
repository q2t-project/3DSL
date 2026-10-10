import { runChecks } from './runChecks.js';
import { IncompleteError, assert } from './checkLogic.js';

const el = id => document.getElementById(id);
let running = false, currentReport = null, becameHidden = false;
document.addEventListener('visibilitychange', () => { if (running && document.hidden) becameHidden = true; });
const foreground = () => {
  if (document.hidden || becameHidden) throw new IncompleteError('検査タブが背面になりました。前面にして「自動検査を開始」から再実行してください。');
};
async function guard(task, label = '処理', timeoutMs = 30000) {
  foreground();
  let timer, watchdog;
  try {
    return await Promise.race([
      Promise.resolve().then(task).then(value => { foreground(); return value; }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new IncompleteError(`${label}：完了待ちが${timeoutMs / 1000}秒を超えました`)), timeoutMs);
        watchdog = setInterval(() => { try { foreground(); } catch (error) { reject(error); } }, 100);
      }),
    ]);
  } finally { clearTimeout(timer); clearInterval(watchdog); }
}
async function until(predicate, label) {
  const started = performance.now();
  return await guard(async () => {
    while (true) {
      foreground();
      if (performance.now() - started >= 30000) throw new IncompleteError(`${label}：30秒以内に接続できませんでした`);
      const value = predicate(); if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  }, label);
}
async function mount(model, round) {
  foreground();
  const frame = document.createElement('iframe'); frame.title = '自動検査中の作品Viewer';
  frame.src = `/contract_viewer/index.html?model=${encodeURIComponent(model)}&diagnostics=${encodeURIComponent(round)}`;
  el('app').replaceChildren(frame);
  await until(() => frame.contentWindow?.viewerBootReady, 'Viewer起動');
  const bootResult = await guard(() => frame.contentWindow.viewerBootReady, 'Viewer初回描画');
  assert(bootResult?.ok === true, `Viewer読込失敗：${bootResult?.error || '未完了'}`);
  const win = frame.contentWindow, doc = frame.contentDocument;
  const api = win.viewerDiagnostics;
  if (!api) throw new IncompleteError('Viewer診断用接続がありません');
  for (const method of ['snapshot', 'rawSnapshot', 'openText']) if (typeof api[method] !== 'function') throw new IncompleteError(`Viewer診断用接続 ${method} がありません`);
  const result = {
    frame, api, guard,
    readInfo: () => doc.getElementById('contract-reading')?.textContent || '',
    readDocumentInfo: () => doc.body.textContent || '',
    openRecord: async title => {
      const disclosure = [...doc.querySelectorAll('#contract-reading details')].find(d => d.querySelector('summary')?.textContent === title);
      assert(disclosure, `記録を開く操作がありません：${title}`);
      if (!disclosure.open) disclosure.querySelector('summary').click();
      await guard(() => new Promise(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve))), '記録の表示待ち');
      assert(disclosure.open, `記録が開きません：${title}`);
    },
    hasWriteControls: () => Boolean(doc.querySelector('[data-action="save"], [data-action="saveas"], [data-action="add-point"], [data-action="add-line"], [data-action="delete"]')),
    sendEditingKeys: async () => {
      const canvas = doc.querySelector('canvas'); assert(canvas, 'Viewerのcanvasがありません');
      canvas.focus();
      for (const key of ['p', 'l', 'm', 'Delete', 'Backspace']) canvas.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await guard(() => api.info(), '制作キー後の描画待ち');
    },
  };
  // Boot resolves after the same renderer barrier used by every diagnostic action.
  return result;
}
async function fetchJson(path) {
  return await guard(async () => {
    const response = await fetch(path, { cache: 'no-store' });
    assert(response.ok, `検査モデルを読めません：${path} (${response.status})`);
    return await response.json();
  }, '検査作品の取得');
}
function table(container, headers, rows) {
  const t = document.createElement('table'); const head = t.createTHead().insertRow();
  for (const text of headers) { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = text; head.append(cell); }
  const body = t.createTBody();
  for (const values of rows) {
    const row = body.insertRow();
    for (const value of values) { const cell = row.insertCell(); cell.textContent = String(value ?? ''); if (['PASS', 'FAIL', 'INCOMPLETE'].includes(value)) cell.dataset.status = value; }
  }
  container.replaceChildren(t);
}
function show(report) {
  const passed = report.checks.filter(c => c.status === 'PASS').length;
  el('status').textContent = `検査結果：${report.status}　負荷検査：${report.performanceStatus} ／ 機能検査：${report.functionalStatus}（${passed}/${report.checks.length}件 PASS）`;
  table(el('results'), ['操作', '実行数', '最遅 ms', '目標 ms', '結果'], report.summary.map(row => [row.label, `${row.runs}/${row.expected}`, row.worstMs === null ? '未計測' : Math.round(row.worstMs), row.limitMs, row.status]));
  table(el('checks'), ['作品', '機能検査', '結果', '詳細'], report.checks.map(row => [row.fixture, row.label, row.status, row.error || '']));
  el('details').textContent = report.problems.map(row => `${row.phase}${row.round ? ` ${row.round}/5` : ''}：${row.error}`).join('\n');
  el('function-details').open = report.functionalStatus !== 'PASS';
  el('report-copy').value = JSON.stringify(report, null, 2);
  el('json-details').classList.remove('hidden'); el('download').disabled = false;
}
el('run').addEventListener('click', async () => {
  if (running) return;
  running = true; currentReport = null; becameHidden = false;
  el('run').disabled = true; el('download').disabled = true;
  el('json-details').classList.add('hidden'); el('results').replaceChildren(); el('checks').replaceChildren(); el('details').textContent = '';
  el('status').textContent = '検査中';
  try {
    assert(['http:', 'https:'].includes(location.protocol), 'START_RECONSTRUCTION.cmdで起動した入口から検査ページを開いてください。');
    foreground();
    currentReport = await runChecks({ mount, fetchJson,
      onProgress: text => { el('progress').textContent = `${text}。このタブを前面にして待ってください。`; },
      environment: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, startedVisible: !document.hidden },
    });
    show(currentReport);
    el('progress').textContent = currentReport.status === 'PASS' ? '自動検査が完了しました。実画面の読みやすさは普段の作品で確認できます。' : '結果を確認してください。未実行項目を合格扱いにはしていません。';
  } catch (error) {
    el('status').textContent = '検査結果：INCOMPLETE';
    el('progress').textContent = String(error.message || error);
  } finally { running = false; el('run').disabled = false; }
});
el('download').addEventListener('click', () => {
  if (!currentReport || running) return;
  const blob = new Blob([JSON.stringify(currentReport, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `viewer-r042-result-${currentReport.finishedAt.replace(/[:.]/g, '-')}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
