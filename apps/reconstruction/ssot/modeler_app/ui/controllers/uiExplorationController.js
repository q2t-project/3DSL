import { indexExploration, explorationRows, scopeUuids, selectionReasons, elementFrames, frameAllows, EXPLORATION_PAGE_SIZE } from "../explorationModel.js";

// Exploration history is UI state. It never calls the document editor or edit Undo.
export function createUiExplorationController({ root, core, signal, setHud = () => {}, ensureEditsAppliedOrConfirm = () => true,
  renderOutliner = () => {}, getViewState = () => null, setViewState = () => {}, applyScope = () => {},
  setSelectionUuids = (uuids) => core.setSelection?.(uuids), unplacedRecords = () => [], getCorrespondingUuids = () => [] } = {}) {
  const host = root?.querySelector?.('[data-role="exploration-toolbar"]');
  const listHost = root?.querySelector?.('[data-role="exploration-list-tools"]');
  let doc = null;
  let index = indexExploration(null);
  let state = { scope: { type: "all" }, query: "", pages: { points: 0, lines: 0 } };
  let history = [];
  let scopeSignature = "";
  let busy = false;
  let pending = Promise.resolve();
  let generation = 0;
  let restoring = false;
  let unplacedPage = 0;
  const busyControls = new Map();
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const getOutliner = () => core.getOutlinerState?.() || {};
  const getRows = (kind) => explorationRows(index, state, kind, getOutliner());
  const query = (selector) => host?.querySelector?.(selector) || listHost?.querySelector?.(selector);
  const el = (role) => query(`[data-role="${role}"]`);

  if (host) host.innerHTML = `
    <div class="exploration-row">
      <button type="button" data-explore="back" title="探索前の範囲・表示・視点・選択に戻る。編集Undoとは別">探索を戻る</button>
      <label>表示 <select data-role="exploration-frame" aria-label="表示を切り替える"></select></label>
      <label>範囲 <select data-role="exploration-scope" aria-label="探索範囲"></select></label>
      <button type="button" data-explore="related" title="参照端点と接続線を辿る。対応記録がある場合は同じ対象のラベル・接続点も辿る">接続先へ</button>
      <button type="button" data-explore="reveal" title="検索と範囲を解除し、選択要素の所属表示へ移る">選択を表示</button>
    </div>
    <form data-role="exploration-search-form" class="exploration-row">
      <input type="search" data-role="exploration-query" placeholder="名前・ラベル・IDで検索" aria-label="名前・ラベル・IDで検索" />
      <button type="submit">検索</button><button type="button" data-explore="clear">全体へ</button>
    </form>
    <div data-role="exploration-status" class="exploration-status" aria-live="polite"></div>
    <div data-role="exploration-selection" class="exploration-selection" aria-live="polite"></div>
    <div class="exploration-pages">
      <span>点 <button type="button" data-explore="points-prev" aria-label="点の前ページ">前</button> <span data-role="points-page"></span> <button type="button" data-explore="points-next" aria-label="点の次ページ">次</button></span>
      <span>線 <button type="button" data-explore="lines-prev" aria-label="線の前ページ">前</button> <span data-role="lines-page"></span> <button type="button" data-explore="lines-next" aria-label="線の次ページ">次</button></span>
    </div>
    <details data-role="exploration-unplaced" hidden><summary data-role="unplaced-summary"></summary><p>対応記録に存在し、この図に表示出現がない対象。図の点数には含めない。</p><ul data-role="unplaced-list"></ul><button type="button" data-explore="unplaced-prev">前</button><span data-role="unplaced-page"></span><button type="button" data-explore="unplaced-next">次</button></details>`;

  // Keep the same controls/listeners while moving list-only tools beside the list.
  if (host && listHost) {
    for (const selector of ['[data-role="exploration-search-form"]', '[data-role="exploration-status"]', '.exploration-pages', '[data-role="exploration-unplaced"]']) {
      const node = host.querySelector(selector);
      if (node) listHost.appendChild(node);
    }
  }
  const controlHosts = [host, listHost].filter(Boolean);
  const controls = () => controlHosts.flatMap(node => [...(node.querySelectorAll?.("button,input,select") || [])]);

  function publishScope() {
    const allowed = scopeUuids(index, state.scope, getOutliner());
    const values = allowed ? [...allowed].sort() : null;
    const signature = JSON.stringify(values);
    if (signature === scopeSignature) return;
    scopeSignature = signature;
    applyScope(values);
  }

  function option(select, value, text) {
    const item = document.createElement("option");
    item.value = value; item.textContent = text; select.appendChild(item);
  }

  function syncControls() {
    if (!host) return;
    host.setAttribute("aria-busy", String(busy));
    if (busy) {
      // Keep controls guarded without rebuilding lists/maps for transient states.
      for (const control of controls()) {
        if (!busyControls.has(control)) busyControls.set(control, control.disabled);
        control.disabled = true;
      }
      return;
    }
    for (const [control, disabled] of busyControls) control.disabled = disabled;
    busyControls.clear();
    const frame = core.getUiState?.().frameIndex ?? 0;
    const frameEl = el("exploration-frame");
    const frames = [...new Set([...index.frames, frame])].sort((a, b) => a - b);
    frameEl.replaceChildren();
    for (const value of frames) option(frameEl, String(value), String(value));
    frameEl.value = String(frame);
    const scopeEl = el("exploration-scope");
    scopeEl.replaceChildren();
    option(scopeEl, "all", "全体");
    for (const value of index.frames) option(scopeEl, `frame:${value}`, `表示 ${value} の所属`);
    for (const group of getOutliner().groups || []) option(scopeEl, `group:${group.id}`, `グループ: ${group.name}`);
    if (state.scope.type === "related") option(scopeEl, "related", "選択からの接続範囲");
    scopeEl.value = state.scope.type === "frame" ? `frame:${state.scope.frame}` : state.scope.type === "group" ? `group:${state.scope.id}` : state.scope.type;
    if (el("exploration-query") !== document.activeElement) el("exploration-query").value = state.query;

    const hidden = core.listHidden?.() || [];
    const solo = core.getSolo?.() || null;
    const allowed = scopeUuids(index, state.scope, getOutliner());
    const visible = [...index.byUuid.values()].filter((row) => (!allowed || allowed.has(row.uuid)) && frameAllows(row.node, frame) && row.node?.appearance?.visible !== false && !hidden.includes(row.uuid) && (!solo || solo === row.uuid));
    const pointPage = getRows("points");
    const linePage = getRows("lines");
    el("exploration-status").textContent = `一覧: 点 ${pointPage.total}/${index.lists.points.length}・線 ${linePage.total}/${index.lists.lines.length} ／ 図の表示条件: ${visible.length} 要素（表示 ${frame}）。検索は一覧に適用。各一覧は ${EXPLORATION_PAGE_SIZE} 件ずつ。`;
    const selected = core.getSelection?.() || [];
    const descriptions = selected.slice(0, 3).map((uuid) => {
      const row = index.byUuid.get(uuid);
      const reasons = selectionReasons(index, uuid, state, { frameIndex: frame, hidden, solo, outliner: getOutliner() });
      return `${row?.label || uuid} [${String(uuid).slice(0, 8)}]${reasons.length ? `：${reasons.join("・")}` : ""}`;
    });
    el("exploration-selection").textContent = selected.length ? `選択 ${selected.length} 件 — ${descriptions.join(" ／ ")}${selected.length > 3 ? " …" : ""}` : "選択なし。範囲を選ぶか、図・一覧から対象を選択。";
    for (const kind of ["points", "lines"]) {
      const page = getRows(kind);
      state.pages[kind] = page.page;
      el(`${kind}-page`).textContent = page.total ? `${page.page * page.pageSize + 1}–${Math.min((page.page + 1) * page.pageSize, page.total)} / ${page.total}（残り ${page.remaining}）` : "0 / 0";
      query(`[data-explore="${kind}-prev"]`).disabled = busy || page.page === 0;
      query(`[data-explore="${kind}-next"]`).disabled = busy || page.page + 1 >= page.pages;
    }
    query('[data-explore="back"]').disabled = busy || !history.length;
    query('[data-explore="related"]').disabled = busy || !selected.some((uuid) => index.byUuid.has(uuid));
    query('[data-explore="reveal"]').disabled = busy || selected.length !== 1;
    frameEl.disabled = busy || !doc;
    scopeEl.disabled = busy || !doc;
    host.setAttribute("aria-busy", String(busy));
    const records = unplacedRecords() || [];
    const section = el("exploration-unplaced");
    section.hidden = !records.length;
    if (records.length) {
      const count = Math.max(1, Math.ceil(records.length / EXPLORATION_PAGE_SIZE));
      unplacedPage = Math.min(unplacedPage, count - 1);
      el("unplaced-summary").textContent = `この図に出現のない対象 ${records.length} 件`;
      const list = el("unplaced-list"); list.replaceChildren();
      for (const record of records.slice(unplacedPage * EXPLORATION_PAGE_SIZE, (unplacedPage + 1) * EXPLORATION_PAGE_SIZE)) {
        const li = document.createElement("li"); li.textContent = `${record.label || record.id} [${record.id}] — 出現なし`; list.appendChild(li);
      }
      el("unplaced-page").textContent = ` ${unplacedPage + 1}/${count} `;
      query('[data-explore="unplaced-prev"]').disabled = !unplacedPage;
      query('[data-explore="unplaced-next"]').disabled = unplacedPage + 1 >= count;
    }
  }

  function refresh() {
    publishScope();
    if (!busy) renderOutliner(doc);
    syncControls();
  }
  async function snapshot() {
    return { state: clone(state), selection: [...(core.getSelection?.() || [])], ui: { frameIndex: core.getUiState?.().frameIndex ?? 0, activeTab: core.getUiState?.().activeTab || "points" }, view: await getViewState() };
  }
  function run(task, { checkpoint = true } = {}) {
    if (busy) return pending;
    if (!ensureEditsAppliedOrConfirm({ reason: "exploration" })) return Promise.resolve(false);
    busy = true; syncControls();
    const epoch = generation;
    pending = (async () => {
      const before = checkpoint ? await snapshot() : null;
      if (epoch !== generation) return false;
      if (before) history.push(before);
      if (history.length > 80) history.shift();
      const result = await task();
      return result !== false;
    })().catch((error) => { setHud(`探索できません: ${error?.message || error}`); return false; })
      .finally(() => { busy = false; refresh(); });
    return pending;
  }
  function changeFrame(value) {
    const frame = Number(value);
    if (!Number.isInteger(frame) || frame < -64 || frame > 63) return Promise.resolve(false);
    return run(() => {
      if (state.scope.type === "frame") state.scope = { type: "frame", frame };
      state.pages = { points: 0, lines: 0 };
      core.setUiState?.({ frameIndex: frame, framePlaying: false });
    });
  }
  function back() {
    if (!history.length) return Promise.resolve(false);
    return run(async () => {
      const previous = history.pop();
      restoring = true;
      try {
        state = clone(previous.state);
        core.setUiState?.({ ...previous.ui, framePlaying: false });
        publishScope();
        const surviving = previous.selection.filter((uuid) => index.byUuid.has(uuid));
        setSelectionUuids(surviving, null, "exploration-back");
        // Restore after focus emitted by selection; the renderer setter cancels focus animation.
        await setViewState(previous.view);
      } finally { restoring = false; }
      setHud("探索前の範囲・表示・視点・選択へ戻りました。編集内容はそのままです。");
    }, { checkpoint: false });
  }
  function navigateSelection(issueLike, event, selectFn) {
    return run(() => selectFn(issueLike, event));
  }
  function revealUuid(uuid) {
    if (restoring) return false;
    const row = index.byUuid.get(String(uuid));
    if (!row) return false;
    const result = getRows(row.kind);
    const position = result.all.findIndex((entry) => entry.uuid === uuid);
    if (position < 0) { syncControls(); return false; }
    const page = Math.floor(position / result.pageSize);
    if (state.pages[row.kind] !== page) { state.pages[row.kind] = page; renderOutliner(doc); syncControls(); }
    return true;
  }
  function reset() {
    generation += 1; history = []; unplacedPage = 0;
    state = { scope: { type: "all" }, query: "", pages: { points: 0, lines: 0 } };
    scopeSignature = "";
    if (el("exploration-query")) el("exploration-query").value = "";
  }
  function render(nextDoc, options = {}) {
    if (options.reset) reset();
    if (doc !== nextDoc || options.reset) {
      doc = nextDoc; index = indexExploration(doc); scopeSignature = "";
      index.correspondences = new Map([...index.byUuid.keys()].map((uuid) => [uuid, getCorrespondingUuids(uuid) || []]));
    }
    refresh();
  }

  const onExploreClick = (event) => {
    const button = event.target.closest?.("[data-explore]");
    if (!button || button.disabled) return;
    const action = button.dataset.explore;
    if (action === "back") { void back(); return; }
    if (action.startsWith("unplaced-")) { unplacedPage = Math.max(0, unplacedPage + (action.endsWith("next") ? 1 : -1)); syncControls(); return; }
    void run(() => {
      if (action === "related") {
        state = { scope: { type: "related", seeds: [...(core.getSelection?.() || [])] }, query: "", pages: { points: 0, lines: 0 } };
        setHud("参照端点で接続された点・線と、作者の対応記録にある同対象の出現です。別表示の所属は Fr で確認できます。");
      } else if (action === "clear") {
        state = { scope: { type: "all" }, query: "", pages: { points: 0, lines: 0 } };
      } else if (action === "reveal") {
        const uuid = core.getSelection?.()[0];
        const row = index.byUuid.get(uuid);
        if (!row) { setHud("この図に表示出現がありません。"); return; }
        state.scope = { type: "all" }; state.query = "";
        const frames = elementFrames(row.node);
        if (frames?.length && !frames.includes(core.getUiState?.().frameIndex)) core.setUiState?.({ frameIndex: frames[0], framePlaying: false });
        revealUuid(uuid);
        core.focusByIssue?.({ uuid, kind: row.kind });
        if ((core.listHidden?.() || []).includes(uuid) || row.node?.appearance?.visible === false || (core.getSolo?.() && core.getSolo() !== uuid)) setHud("一覧へ移りました。手動非表示・単独表示は変更していません。");
      } else {
        const match = action.match(/^(points|lines)-(prev|next)$/);
        if (match) state.pages[match[1]] += match[2] === "next" ? 1 : -1;
      }
    });
  };
  for (const node of controlHosts) node.addEventListener("click", onExploreClick, { signal });
  el("exploration-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); const query = el("exploration-query").value;
    void run(() => { state.query = query; state.pages = { points: 0, lines: 0 }; });
  }, { signal });
  el("exploration-frame")?.addEventListener("change", (event) => { void changeFrame(event.target.value); }, { signal });
  el("exploration-scope")?.addEventListener("change", (event) => {
    const value = event.target.value;
    void run(() => {
      if (value.startsWith("frame:")) {
        const frame = Number(value.slice(6)); state.scope = { type: "frame", frame }; core.setUiState?.({ frameIndex: frame, framePlaying: false });
      } else if (value.startsWith("group:")) state.scope = { type: "group", id: value.slice(6) };
      else if (value === "all") state.scope = { type: "all" };
      state.pages = { points: 0, lines: 0 };
    });
  }, { signal });
  return { render, getRows, revealUuid, navigateSelection, changeFrame, back, reset, getState: () => ({ ...clone(state), historyLength: history.length, busy }), whenIdle: () => pending };
}
