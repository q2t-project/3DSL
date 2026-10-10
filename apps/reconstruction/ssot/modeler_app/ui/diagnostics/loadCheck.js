import { createHubCoreControllers } from "../hubFacade.js";
import { runContractChecks } from "./reconstructionCheck.js";
import { parseContractWork } from "../../runtime/contractWork.js";
import { parseWorkPackage } from "../../runtime/workPackage.js";
import { summarize, assert, equivalent, timed, LABELS, createViewStability } from "./loadCheckLogic.js";

const MODEL = "/models/synthetic_1000_2000.3dsl-work.json";
const HIGH = "81000000-0000-4000-8000-000000000001";
const TWINS = ["81000000-0000-4000-8000-000000000013", "81000000-0000-4000-8000-000000000713"];
const runButton = document.getElementById("run"), status = document.getElementById("status");
let running = false;
let activePhase = "実行前";
let activeEnv = null;
const note = text => { status.textContent = text; };
const role = (doc, name) => doc.querySelector(`[data-role="${name}"]`);
const action = (doc, name) => doc.querySelector(`[data-action="${name}"]`);
const explore = (doc, name) => doc.querySelector(`[data-explore="${name}"]`);
const snapshot = (hub, core, doc) => JSON.parse(JSON.stringify({ frame: core.getUiState().frameIndex, scope: core.getUiState().explorationScope,
  selection: core.getSelection(), camera: hub.getViewState(), scopeControl: role(doc, "exploration-scope").value }));

async function waitUntil(predicate, { label, timeout = 30000, describe = () => ({}) } = {}) {
  activePhase = label || "処理完了";
  const start = performance.now();
  while (!predicate()) {
    assert(!document.hidden, "検査タブが背面になりました。前面にして再実行してください。");
    if (performance.now() - start >= timeout) {
      const error = new Error(`${activePhase}: 完了待ちが${timeout / 1000}秒を超えました`);
      error.diagnostic = { phase: activePhase, timeoutMs: timeout, ...describe() };
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 16));
  }
}
async function settle(env) {
  const settleStart = performance.now();
  const stability = createViewStability();
  let busy = false, view = null, observations = 0, busyObservations = 0;
  await waitUntil(() => {
    observations += 1;
    busy = role(env.doc, "exploration-toolbar").getAttribute("aria-busy") === "true";
    if (busy) busyObservations += 1;
    view = env.hub.getViewState();
    return stability.observe(view, busy, performance.now());
  }, { label: "探索処理・視点の安定待ち", describe: () => ({ busy, view, ...stability.state() }) });
  const stableAt = performance.now();
  let firstFrameAt = null, secondFrameAt = null;
  // Two frame opportunities in the actual Modeler iframe, not just its parent.
  activePhase = "Modeler描画待ち";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("描画待ちが停止しました。検査タブを前面にして再実行してください。")), 10000);
    env.win.requestAnimationFrame(() => {
      firstFrameAt = performance.now();
      env.win.requestAnimationFrame(() => {
        secondFrameAt = performance.now();
        clearTimeout(timeout);
        if (document.hidden) reject(new Error("検査タブが背面になりました。前面にして再実行してください。"));
        else resolve();
      });
    });
  });
  // Observation only: retain the existing 80 ms window and both RAF waits.
  return { stableWaitMs: stableAt - settleStart, raf1WaitMs: firstFrameAt - stableAt,
    raf2WaitMs: secondFrameAt - firstFrameAt, observations, busyObservations };
}
function selectValue(env, name, value) {
  const el = role(env.doc, name); assert(el, `入力欄がありません: ${name}`);
  assert([...el.options].some(option => option.value === value), `選択肢がありません: ${value}`);
  el.value = value; el.dispatchEvent(new env.win.Event("change", { bubbles: true }));
}
function click(element) { assert(element && !element.disabled, "対象操作が利用できません"); element.click(); }
function search(env, text) {
  role(env.doc, "exploration-query").value = text;
  role(env.doc, "exploration-search-form").dispatchEvent(new env.win.Event("submit", { bubbles: true, cancelable: true }));
}
function visibleCounts(scene, state) {
  const allowed = state.explorationScope ? new Set(state.explorationScope) : null;
  const visible = node => {
    const frames = node.appearance?.frames;
    return (!allowed || allowed.has(node.meta.uuid)) && node.appearance?.visible !== false &&
      (frames == null || (Array.isArray(frames) ? frames : [frames]).includes(state.frameIndex));
  };
  const points = scene.points.filter(visible), lines = scene.lines.filter(visible);
  return { points: points.length, lines: lines.length,
    labels: points.filter(p => p.appearance?.marker?.text?.content).length + lines.filter(l => l.signification?.caption).length };
}
function loadResources(env) {
  // Diagnostic metadata only; never replace the total wall-clock measurement.
  try {
    return (env.win.performance.getEntriesByType?.("resource") || [])
      .sort((a, b) => b.duration - a.duration).slice(0, 12)
      .map(entry => ({ path: new URL(entry.name).pathname, startMs: entry.startTime,
        durationMs: entry.duration, responseStartMs: entry.responseStart, responseEndMs: entry.responseEnd,
        transferBytes: entry.transferSize, decodedBytes: entry.decodedBodySize }));
  } catch { return []; }
}
function loadNavigation(env) {
  try {
    const entry = env.win.performance.getEntriesByType?.("navigation")?.[0];
    if (!entry) return null;
    return { type: entry.type, startMs: entry.startTime, responseStartMs: entry.responseStart,
      responseEndMs: entry.responseEnd, domInteractiveMs: entry.domInteractive,
      domContentLoadedMs: entry.domContentLoadedEventEnd, loadEventEndMs: entry.loadEventEnd,
      transferBytes: entry.transferSize, decodedBytes: entry.decodedBodySize };
  } catch { return null; }
}
async function load(round, model = MODEL) {
  const loadStart = performance.now();
  const frame = document.createElement("iframe");
  frame.title = "自動操作中の通常Modeler";
  document.getElementById("app").replaceChildren(frame);
  frame.src = `../../index.html?model=${model}&loadcheckRound=${round}`;
  await waitUntil(() => frame.contentDocument?.getElementById("modeler-root")?.__ownedUi,
    { label: "Modeler起動待ち", describe: () => ({ readyState: frame.contentDocument?.readyState,
      bodyTail: frame.contentDocument?.body?.innerText?.slice(-1500) }) });
  const root = frame.contentDocument.getElementById("modeler-root"), hub = root.__ownedHub;
  const readyAt = performance.now();
  const env = { frame, win: frame.contentWindow, doc: frame.contentDocument, hub, core: createHubCoreControllers(hub) };
  activeEnv = env;
  activePhase = "厳密検証の初期化";
  await env.core.ensureValidatorInitialized();
  assert(env.core.isValidatorReady(), "厳密検証を初期化できません");
  if (model === MODEL) assert(env.core.getDocument().points.length === 1000 && env.core.getDocument().lines.length === 2000, "固定件数と一致しません");
  else assert(env.hub.isContractWork(), "作品契約として読み込めません");
  const validatedAt = performance.now();
  const settleTiming = await settle(env);
  const navigationOffset = env.win.performance.timeOrigin - performance.timeOrigin - loadStart;
  const settleMs = performance.now() - validatedAt;
  const debugSnapshot = hub.getDebugPoseSnapshot?.();
  env.loadTiming = { round, model, readyWaitMs: readyAt - loadStart, validatorWaitMs: validatedAt - readyAt,
    settleMs, settleTiming,
    startup: root.__ownedStartup ? JSON.parse(JSON.stringify(root.__ownedStartup)) : null,
    iframeNavigationOffsetMs: Number.isFinite(navigationOffset) ? navigationOffset : null,
    renderStats: debugSnapshot?.renderStats ?? null,
    labelTextureStats: debugSnapshot?.labelTextureStats ?? null,
    rendering: debugSnapshot?.rendering ?? hub.getRenderDiagnostics?.() ?? null,
    preparation: hub.getLoadDiagnostics?.() ?? null,
    navigation: loadNavigation(env),
    slowestResources: loadResources(env) };
  return env;
}
async function saveAndCheck(env, session, round, filename) {
  const name = filename || `state-${round}.3dsl-work.json`;
  const path = `/diagnostic-output/${session.runId}/${name}`;
  let committed = false, writeError = null;
  env.win.showSaveFilePicker = async () => ({
    name,
    async createWritable() {
      let bytes;
      return {
        async write(value) { bytes = typeof value === "string" ? value : await value.text(); },
        async close() {
          try {
            const response = await fetch("/__modeler_checks__/save/" + name, { method: "POST",
              headers: { "Content-Type": "application/json", "X-Modeler-Check": session.token }, body: bytes });
            if (!response.ok) throw new Error(await response.text());
            committed = true;
          } catch (error) { writeError = error; throw error; }
        },
        async abort() {},
      };
    },
    async getFile() {
      const response = await fetch(path, { cache: "no-store" });
      assert(response.ok, "保存bytesを再取得できません");
      return new env.win.File([await response.text()], name, { type: "application/json" });
    },
  });
  click(action(env.doc, "saveas"));
  await waitUntil(() => writeError || (committed && !env.core.isDirty() && env.core.getSaveHandle()?.name === name),
    { label: "保存完了待ち", describe: () => ({ committed, dirty: env.core.isDirty(),
      saveName: env.core.getSaveHandle()?.name, hud: role(env.doc, "hud")?.textContent }) });
  if (writeError) throw writeError;
  const response = await fetch(path, { cache: "no-store" });
  assert(response.ok, "保存物がありません");
  const raw = await response.json();
  const reopened = raw.format === "3dsl-contract-work/0.1" ? parseContractWork(raw) : parseWorkPackage(raw);
  const expected = env.hub.prepareWorkPackage(env.core.getDocument());
  assert(equivalent(reopened, expected), "保存後に値・基準図・付属原文が変化しました");
  // The app owns its validator and data realm. Transfer saved JSON as text.
  assert(env.core.validateStrict(env.win.JSON.parse(JSON.stringify(reopened.scene))), "保存物が3DSSの厳密検証を通りません");
  return path;
}
function show(report) {
  const table = document.createElement("table");
  for (const values of [["操作", "実行数", "最遅 ms", "目標 ms", "結果"],
    ...report.summary.map(row => [row.label, `${row.runs}/5`, row.worstMs == null ? "未計測" : Math.round(row.worstMs), row.limitMs, row.status])]) {
    const tr = table.insertRow(); for (const value of values) tr.insertCell().textContent = String(value);
  }
  document.getElementById("results").replaceChildren(table);
}
runButton.addEventListener("click", async () => {
  if (running) return; running = true; runButton.disabled = true;
  const report = { format: "3dsl-modeler-loadcheck/0.1", runnerVersion: "r0.3", startedAt: new Date().toISOString(), samples: [], layout: [], savedFiles: [], loadTimings: [],
    environment: { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio },
    scope: "Actual browser DOM, normal Modeler/core/renderer. Save uses a diagnostic disk bridge, not a native OS picker. Stable camera/controller plus two paint opportunities are included; GPU completion and pixel correctness are not asserted.",
    loadTimingScope: "Load samples retain the complete navigation-to-settle boundary. readyWaitMs includes module loading and mounting; startup phases are measured within that wait. Add iframeNavigationOffsetMs to startup mountStartMs/mountEndMs and renderStats firstRenderStartMs/lastRenderEndMs to express them relative to load start. document-render measures synchronous scene construction; resize-start schedules the first render after synchronous UI setup. settleTiming splits the unchanged stable-view wait and two iframe RAF waits; observation counts do not alter the 80 ms condition. renderStats measures synchronous render() submission calls, not GPU completion or pixel correctness.",
    resourceTimingScope: "navigation and slowestResources use iframe timeOrigin. Zero transferBytes alone does not prove a cache hit. Diagnostic reads remain inside the unchanged measured load operation; no warm-up round is excluded.",
    rounds: 5, thresholdsChanged: false, viewStability: { absoluteTolerance: 1e-7, stableMs: 80, fixedWindowAnchor: true } };
  let session, env;
  try {
    assert(location.protocol === "http:", "START_RECONSTRUCTION.cmdで起動してから検査ページを開いてください");
    assert(!document.hidden, "検査タブを前面にしてください");
    const response = await fetch("/__modeler_checks__/session", { headers: { "X-Modeler-Check": "start" } });
    assert(response.ok, "START_RECONSTRUCTION.cmdで起動してから検査ページを開いてください。");
    session = await response.json();
    for (let round = 1; round <= 5; round++) {
      const measure = async (operation, task) => {
        note(`${round}/5回目: ${LABELS[operation]}。このタブを前面にして待ってください。`);
        return timed(report.samples, operation, round, task, () => Promise.resolve());
      };
      env = null;
      await measure("load", async () => { env = await load(round); });
      report.loadTimings.push(env.loadTiming);
      selectValue(env, "exploration-frame", "0"); await settle(env);
      click(explore(env.doc, "clear")); await settle(env);
      const original = JSON.stringify(env.core.getDocument());
      const modelRoot = env.doc.getElementById("modeler-root");
      if (!modelRoot.classList.contains("is-outliner-open")) {
        click(env.doc.querySelector('[data-ui-action="toggle-outliner"]')); await settle(env);
      }
      const cell = role(env.doc, "outliner-points-tbody").querySelector("td.col-name");
      assert(cell && cell.getBoundingClientRect().width >= 160 && cell.textContent.trim(), "名前欄の幅または表示が不足しています");
      activePhase = "未配置原記録の確認";
      // Call the app's own validated API. Its objects have iframe prototypes;
      // feeding them to the parent realm's plain-object parser rejects valid work.
      assert(env.hub.getUnplacedSourceRecords().length === 2, "未配置対象2件を保持していません");
      report.layout.push({ round, nameWidth: cell.getBoundingClientRect().width,
        appViewport: [env.frame.clientWidth, env.frame.clientHeight], visible: visibleCounts(env.core.getDocument(), env.core.getUiState()) });
      await measure("scope", async () => {
        selectValue(env, "exploration-scope", "frame:1"); await settle(env);
        assert(env.core.getUiState().frameIndex === 1 && env.core.getUiState().explorationScope?.length > 0, "表示1の範囲へ移れません");
      });
      click(explore(env.doc, "clear")); await settle(env);
      await measure("search", async () => {
        search(env, "同名の対象"); await settle(env);
        const ids = [...role(env.doc, "outliner-points-tbody").querySelectorAll("tr[data-uuid]")].map(row => row.dataset.uuid);
        assert(ids.length === 2 && TWINS.every(id => ids.includes(id)), "同名の別対象を正しく検索できません");
      });
      selectValue(env, "exploration-frame", "0"); await settle(env);
      search(env, HIGH); await settle(env);
      await measure("selection", async () => {
        click(role(env.doc, "outliner-points-tbody").querySelector(`tr[data-uuid="${HIGH}"] td.col-name`));
        await settle(env); assert(env.core.getSelection()[0] === HIGH, "指定対象を選択できません");
      });
      const beforeRelated = snapshot(env.hub, env.core, env.doc);
      await measure("related", async () => {
        click(explore(env.doc, "related")); await settle(env);
        assert(env.core.getUiState().explorationScope?.includes(HIGH) && env.core.getUiState().explorationScope.length > 400, "高次数の接続範囲を取得できません");
      });
      const beforeFrame = snapshot(env.hub, env.core, env.doc);
      const targetFrame = round % 2 + 1;
      await measure("frame", async () => {
        selectValue(env, "exploration-frame", String(targetFrame)); await settle(env);
        assert(env.core.getUiState().frameIndex === targetFrame, "表示が切り替わりません");
      });
      await measure("back", async () => {
        click(explore(env.doc, "back")); await settle(env);
        assert(equivalent(snapshot(env.hub, env.core, env.doc), beforeFrame, 1e-7), "範囲・表示・選択・視点が戻りません");
      });
      click(explore(env.doc, "back")); await settle(env);
      assert(equivalent(snapshot(env.hub, env.core, env.doc), beforeRelated, 1e-7), "接続探索から元へ戻りません");
      await measure("save", async () => { report.savedFiles.push(await saveAndCheck(env, session, round)); await settle(env); });
      assert(JSON.stringify(env.core.getDocument()) === original, "探索または保存が図の値を変更しました");
      // Release the real renderer/UI before loading the next round.
      env.doc.getElementById("modeler-root").__ownedUi.detach();
      env.hub.dispose(); env = null; activeEnv = null;
    }
  } catch (error) {
    report.error = String(error?.message || error);
    report.failure = error?.diagnostic || { phase: activePhase };
  }
  finally {
    const release = candidate => {
      // Also release when load() throws after mount but before returning env.
      const mounted = candidate || activeEnv;
      if (mounted) { mounted.doc.getElementById("modeler-root").__ownedUi?.detach(); mounted.hub.dispose(); }
      activeEnv = null;
    };
    try { release(env); } catch (error) { report.cleanupError = String(error); }
    // Continue contract checks even when the large-model series fails.
    // Its result remains FAIL/INCOMPLETE; this does not relax any threshold.
    if (session && !document.hidden) {
      report.contract = await runContractChecks({ load, settle, saveAndCheck, session, note, click, action, waitUntil, release });
    } else report.contract = { status: "INCOMPLETE", checks: [], error: "診断用接続または前面表示が必要です" };
    report.finishedAt = new Date().toISOString();
    report.summary = summarize(report.samples);
    report.performanceStatus = report.error ? "INCOMPLETE" : report.summary.every(row => row.status === "PASS") ? "PASS" : "FAIL";
    report.status = [report.performanceStatus, report.contract.status].includes("FAIL") ? "FAIL" : [report.performanceStatus, report.contract.status].every(s => s === "PASS") ? "PASS" : "INCOMPLETE";
    show(report);
    const contractTable = document.createElement("table");
    for (const row of [["新しい作品の検査", "結果"], ...report.contract.checks.map(c => [c.name, c.status + (c.error ? ": " + c.error : "")])]) {
      const tr = contractTable.insertRow(); for (const text of row) tr.insertCell().textContent = text;
    }
    document.getElementById("results").appendChild(contractTable);
    if (session) {
      try {
        const response = await fetch("/__modeler_checks__/save/result.json", { method: "POST",
          headers: { "Content-Type": "application/json", "X-Modeler-Check": session.token }, body: JSON.stringify(report, null, 2) });
        assert(response.ok, "結果の自動保存に失敗しました");
        const link = document.getElementById("report-link"); link.hidden = false;
        link.href = `/diagnostic-output/${session.runId}/result.json`;
        link.textContent = `結果JSONを開く — diagnostic-output/${session.runId}/result.json`;
      } catch (error) { report.reportSaveError = String(error); }
    }
    if (report.reportSaveError || !session) {
      const link = document.getElementById("report-link"); link.hidden = false;
      link.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
      link.download = "modeler-loadcheck-result.json"; link.textContent = "結果JSONをダウンロード";
    }
    const contractPassed = report.contract.checks.filter(check => check.status === "PASS").length;
    note(`検査結果: ${report.status}\n負荷検査: ${report.performanceStatus} ／ 新しい作品の検査: ${report.contract.status}（${contractPassed}/${report.contract.checks.length}件 PASS）${report.error ? "\n" + report.error : ""}${report.contract.error ? "\n" + report.contract.error : ""}\n操作が完了しても閾値超過はFAIL、未実行はINCOMPLETEと記録します。`);
    runButton.disabled = false; running = false;
  }
});
