// ui/controllers/uiOutlinerController.js

function uuidOf(node) {
  return node?.meta?.uuid || node?.uuid || "";
}

function safePos(node) {
  const p = node?.appearance?.position || node?.position;
  if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  return [0, 0, 0];
}

function nameOf(node) {
  return String(node?.signification?.name || node?.name || "");
}

function auxModuleLabel(node) {
  const direct = node?.module;
  if (typeof direct === "string") return direct;

  const ap = node?.appearance?.module;
  if (typeof ap === "string") return ap;
  if (ap && typeof ap === "object") {
    const keys = Object.keys(ap);
    if (keys.length > 0) return String(keys[0]);
  }

  const kind = node?.kind;
  if (typeof kind === "string") return kind;

  return "";
}


function collectRows(doc, tab) {
  const rows = [];
  if (tab === "points" && doc && Array.isArray(doc.points)) doc.points.forEach((x, i) => rows.push({ kind: "point", node: x, path: `/points/${i}` }));
  if (tab === "lines" && doc && Array.isArray(doc.lines)) doc.lines.forEach((x, i) => rows.push({ kind: "line", node: x, path: `/lines/${i}` }));
  if (tab === "aux" && doc && Array.isArray(doc.aux)) doc.aux.forEach((x, i) => rows.push({ kind: "aux", node: x, path: `/aux/${i}` }));
  return rows;
}

function buildGroupTree(groupsArr) {
  const byId = new Map();
  for (const g of Array.isArray(groupsArr) ? groupsArr : []) {
    if (!g || !g.id) continue;
    byId.set(String(g.id), { id: String(g.id), name: String(g.name || "Group"), parentId: g.parentId ? String(g.parentId) : null });
  }

  const children = new Map();
  for (const g of byId.values()) {
    const pid = g.parentId && byId.has(g.parentId) ? g.parentId : null;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid).push(g.id);
  }

  // stable: order by insertion (id sequence) but with string compare fallback
  for (const [k, list] of children.entries()) {
    list.sort((a, b) => {
      const ai = parseInt(String(a).replace(/^g/, ""), 10);
      const bi = parseInt(String(b).replace(/^g/, ""), 10);
      if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
      return String(a).localeCompare(String(b));
    });
    children.set(k, list);
  }

  return { byId, children };
}

function walkGroups(tree, rootId = null, depth = 0, out = []) {
  const kids = tree.children.get(rootId) || [];
  for (const id of kids) {
    out.push({ id, depth });
    walkGroups(tree, id, depth + 1, out);
  }
  return out;
}

/**
 * Outliner rendering + UI-only controls (lock / visibility / solo / groups).
 */
export class UiOutlinerController {
  /**
   * @param {{
   *  root: HTMLElement,
   *  tbody: HTMLElement | null,
   *  core: any,
   *  signal: AbortSignal,
   *  syncTabButtons: () => void,
   *  getSelectedSet: () => Set<string>,
   *  onRowSelect: (issueLike: {uuid?: string, kind?: string, path?: string}, ev: MouseEvent) => void,
   *  ensureEditsAppliedOrConfirm?: () => boolean,
   *  requestToolbarSync?: () => void,
   *  setHud?: (msg: string) => void,
   * }} args
   */
  constructor({ root, tbody, core, signal, syncTabButtons, getSelectedSet, onRowSelect }) {
    this.root = root;
    this.tbody = tbody;
    this.thead = this.root?.querySelector?.('[data-role="outliner-thead"]') || null;
    this.core = core;
    this.signal = signal;
    this.syncTabButtons = syncTabButtons;
    this.getSelectedSet = getSelectedSet;
    this.onRowSelect = onRowSelect;

    this.ensureEditsAppliedOrConfirm = arguments[0]?.ensureEditsAppliedOrConfirm;
    this.requestToolbarSync = arguments[0]?.requestToolbarSync;
    this.setHud = arguments[0]?.setHud;

    this.setSelectionUuids = arguments[0]?.setSelectionUuids;

    this.selectedGroupId = null;

    /** @type {string[]} */
    this.lastRowOrder = [];

    this.columnCount = 8;
    this.activeHeaderTab = null;

    this.#bindGroupButtons();
    this.#bindAuthoringButtons();
    this.#bindTabButtons();
  }

  /**
   * Current visual row order (UUIDs) for the active tab, excluding group rows.
   * Used by uiSelectionController for SHIFT range selection.
   */
  getRowOrder() {
    return Array.isArray(this.lastRowOrder) ? [...this.lastRowOrder] : [];
  }


  #setSelection(uuids, reason = 'outliner') {
    try {
      if (typeof this.setSelectionUuids === 'function') {
        this.setSelectionUuids(uuids, null, reason);
        return;
      }
    } catch {}
    try { this.core.setSelection?.(uuids); } catch {}
  }

  #bindTabButtons() {
    // NOTE: Tab switching is primarily handled by the toolbar controller,
    // but routing all clicks through the global root handler is fragile
    // (event delegation / nested panels). Bind locally as well so the
    // Outliner UI always reacts.
    const btns = this.root?.querySelectorAll?.('.outliner-tabs [data-tab]') || [];
    btns.forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      btn.addEventListener(
        'click',
        (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!this.#guardEdits()) return;
          const tab = btn.getAttribute('data-tab') || 'points';
          this.core.setUiState?.({ activeTab: tab });
          this.syncTabButtons();
          this.render(this.core.getDocument?.());
        },
        { signal: this.signal }
      );
    });
  }

  #ensureHeader(tab) {
    if (!this.thead) return;
    if (this.activeHeaderTab === tab) return;
    this.activeHeaderTab = tab;

    const makeTh = (txt, cls = "", title = "") => {
      const th = document.createElement("th");
      if (cls) th.className = cls;
      th.textContent = txt;
      if (title) th.title = title;
      return th;
    };

    const tr = document.createElement("tr");
    tr.appendChild(makeTh("L", "col-lock", "Lock"));
    tr.appendChild(makeTh("V", "col-vis", "Visible"));
    tr.appendChild(makeTh("S", "col-solo", "Solo"));

    if (tab === "lines") {
      tr.appendChild(makeTh("name", "col-name"));
      tr.appendChild(makeTh("end_a", "col-end"));
      tr.appendChild(makeTh("end_b", "col-end"));
      tr.appendChild(makeTh("uuid", "col-uuid"));
      this.columnCount = 7;
    } else if (tab === "aux") {
      tr.appendChild(makeTh("module", "col-name"));
      tr.appendChild(makeTh("x", "col-num"));
      tr.appendChild(makeTh("y", "col-num"));
      tr.appendChild(makeTh("z", "col-num"));
      tr.appendChild(makeTh("uuid", "col-uuid"));
      this.columnCount = 8;
    } else {
      tr.appendChild(makeTh("name", "col-name"));
      tr.appendChild(makeTh("x", "col-num"));
      tr.appendChild(makeTh("y", "col-num"));
      tr.appendChild(makeTh("z", "col-num"));
      tr.appendChild(makeTh("uuid", "col-uuid"));
      this.columnCount = 8;
    }

    this.thead.textContent = "";
    this.thead.appendChild(tr);
  }

  #guardEdits() {
    if (typeof this.ensureEditsAppliedOrConfirm === "function") {
      return !!this.ensureEditsAppliedOrConfirm();
    }
    return true;
  }

  #hud(msg) {
    try { typeof this.setHud === "function" && this.setHud(String(msg || "")); } catch {}
  }

  #syncToolbar() {
    try { typeof this.requestToolbarSync === "function" && this.requestToolbarSync(); } catch {}
  }

  #newUuid() {
    try {
      if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
    } catch {}
    // fallback: not cryptographically strong, but stable enough for editing.
    const r = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    return `${r()}-${r().slice(0,4)}-${r().slice(0,4)}-${r().slice(0,4)}-${r()}${r().slice(0,4)}`;
  }

  #bindAuthoringButtons() {
    const btnAddPoint = this.root.querySelector('[data-action="add-point"]');
    const btnAddLine = this.root.querySelector('[data-action="add-line"]');
    const btnAddAux = this.root.querySelector('[data-action="add-aux"]');
    const btnDel = this.root.querySelector('[data-action="delete"]');

    if (btnAddPoint instanceof HTMLElement) {
      btnAddPoint.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          this.addPoint();
        },
        { signal: this.signal }
      );
    }

    if (btnAddLine instanceof HTMLElement) {
      btnAddLine.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          this.addLine();
        },
        { signal: this.signal }
      );
    }

    if (btnAddAux instanceof HTMLElement) {
      btnAddAux.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          this.addAux();
        },
        { signal: this.signal }
      );
    }

    if (btnDel instanceof HTMLElement) {
      btnDel.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          this.deleteSelection();
        },
        { signal: this.signal }
      );
    }
  }

  addPoint() {
    if (!this.#guardEdits()) return;
    const doc = this.core.getDocument?.();
    if (!doc) { this.#hud("Open a file or create New first"); return; }

    const uuid = this.#newUuid();
    const n = Array.isArray(doc.points) ? doc.points.length : 0;
    const x = (n % 10) * 4;
    const y = 0;
    const z = Math.floor(n / 10) * 4;

    this.core.updateDocument?.((cur) => {
      const next = { ...cur };
      const pts = Array.isArray(cur.points) ? cur.points.slice() : [];
      pts.push({
        meta: { uuid },
        signification: { name: `P${n + 1}` },
        appearance: { position: [x, y, z] }
      });
      next.points = pts;
      return next;
    });
    this.#setSelection([uuid], 'add');
    this.#syncToolbar();
  }

  addLine() {
    if (!this.#guardEdits()) return;
    const doc = this.core.getDocument?.();
    if (!doc) { this.#hud("Open a file or create New first"); return; }

    const selection = Array.isArray(this.core.getSelection?.()) ? this.core.getSelection?.().map(String) : [];
    const pointUuids = new Set((Array.isArray(doc.points) ? doc.points : []).map((p) => uuidOf(p)).filter(Boolean));
    const selectedPoints = selection.filter((u) => pointUuids.has(u));

    // If we have 2 selected points, create a line referencing them.
    // Otherwise, create 2 new points and connect.
    let aUuid = selectedPoints[0] || "";
    let bUuid = selectedPoints[1] || "";
    const willCreatePoints = !(aUuid && bUuid);

    const lineUuid = this.#newUuid();
    const newPointA = willCreatePoints ? this.#newUuid() : null;
    const newPointB = willCreatePoints ? this.#newUuid() : null;

    this.core.updateDocument?.((cur) => {
      const next = { ...cur };
      const pts = Array.isArray(cur.points) ? cur.points.slice() : [];
      const lines = Array.isArray(cur.lines) ? cur.lines.slice() : [];

      if (willCreatePoints) {
        const n0 = pts.length;
        pts.push({ meta: { uuid: newPointA }, signification: { name: `P${n0 + 1}` }, appearance: { position: [0, 0, 0] } });
        pts.push({ meta: { uuid: newPointB }, signification: { name: `P${n0 + 2}` }, appearance: { position: [8, 0, 0] } });
        aUuid = String(newPointA);
        bUuid = String(newPointB);
      }

      const nL = lines.length;
      lines.push({
        meta: { uuid: lineUuid },
        signification: { name: `L${nL + 1}` },
        end_a: { ref: aUuid },
        end_b: { ref: bUuid },
      });

      next.points = pts;
      next.lines = lines;
      return next;
    });

    // Prefer selecting the new line (single selection => property panel).
    this.#setSelection([lineUuid], 'add');
    this.#syncToolbar();
  }

  addAux() {
    if (!this.#guardEdits()) return;
    const doc = this.core.getDocument?.();
    if (!doc) { this.#hud("Open a file or create New first"); return; }
    const uuid = this.#newUuid();
    // NOTE: aux has no signification/name in schema; module is the primary identifier.

    this.core.updateDocument?.((cur) => {
      const next = { ...cur };
      const arr = Array.isArray(cur.aux) ? cur.aux.slice() : [];
      arr.push({
        meta: { uuid },
        module: "grid",
        appearance: { position: [0, 0, 0], visible: true },
      });
      next.aux = arr;
      return next;
    });
    this.#setSelection([uuid], 'add');
    this.#syncToolbar();
  }

  deleteSelection() {
    if (!this.#guardEdits()) return;
    const doc = this.core.getDocument?.();
    if (!doc) return;
    const sel = Array.isArray(this.core.getSelection?.()) ? this.core.getSelection?.().map(String) : [];
    if (sel.length === 0) return;

    const locked = new Set(this.core.listLocks?.() || []);
    const targets = sel.filter((u) => !locked.has(u));
    if (targets.length === 0) { this.#hud("Selection is locked"); return; }

    const delSet = new Set(targets);

    this.core.updateDocument?.((cur) => {
      const next = { ...cur };
      const pts = Array.isArray(cur.points) ? cur.points.filter((p) => !delSet.has(uuidOf(p))) : [];
      const aux = Array.isArray(cur.aux) ? cur.aux.filter((a) => !delSet.has(uuidOf(a))) : [];

      const deletedPoints = new Set();
      for (const u of delSet) {
        // if uuid was a point in original, track it for line cleanup
        if ((Array.isArray(cur.points) ? cur.points : []).some((p) => uuidOf(p) === u)) deletedPoints.add(u);
      }

      const lines = Array.isArray(cur.lines)
        ? cur.lines.filter((ln) => {
          const u = uuidOf(ln);
          if (delSet.has(u)) return false;
          const a = ln?.end_a?.ref;
          const b = ln?.end_b?.ref;
          if (typeof a === "string" && deletedPoints.has(a)) return false;
          if (typeof b === "string" && deletedPoints.has(b)) return false;
          return true;
        })
        : [];

      next.points = pts;
      next.lines = lines;
      next.aux = aux;
      return next;
    });

    this.#setSelection([], 'delete');
    this.#syncToolbar();
  }

  #bindGroupButtons() {
    const btnNew = this.root.querySelector('[data-action="group-new"]');
    const btnAssign = this.root.querySelector('[data-action="group-assign"]');
    const btnUngroup = this.root.querySelector('[data-action="group-ungroup"]');

    if (btnNew instanceof HTMLElement) {
      btnNew.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          const gid = this.core.createGroup?.("Group");
          if (gid) this.selectedGroupId = String(gid);
          this.render(this.core.getDocument?.());
        },
        { signal: this.signal }
      );
    }

    if (btnAssign instanceof HTMLElement) {
      btnAssign.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          const sel = [...(this.core.getSelection?.() || [])].filter(Boolean).map(String);
          if (sel.length === 0) return;

          let target = this.selectedGroupId;
          if (!target) {
            const gid = this.core.createGroup?.("Group");
            if (gid) target = String(gid);
          }
          if (!target) return;

          this.core.assignItemsToGroup?.(sel, target);
          this.selectedGroupId = target;
          this.render(this.core.getDocument?.());
        },
        { signal: this.signal }
      );
    }

    if (btnUngroup instanceof HTMLElement) {
      btnUngroup.addEventListener(
        "click",
        (ev) => {
          ev.preventDefault();
          const sel = [...(this.core.getSelection?.() || [])].filter(Boolean).map(String);
          if (sel.length === 0) return;
          this.core.ungroupItems?.(sel);
          this.render(this.core.getDocument?.());
        },
        { signal: this.signal }
      );
    }
  }

  /** @param {any} doc */
  render(doc) {
    const tbody = this.tbody;
    if (!tbody) return;
    tbody.textContent = "";

    this.syncTabButtons();

    const tab = (this.core.getUiState?.().activeTab) || "points";
    this.#ensureHeader(tab);
    const locked = new Set(this.core.listLocks?.() || []);
    const selected = this.getSelectedSet();

    const hidden = new Set(this.core.listHidden?.() || []);
    const solo = this.core.getSolo?.() || null;

    const outlinerState = this.core.getOutlinerState?.() || { groups: [], itemToGroup: {}, collapsed: [] };
    const groupTree = buildGroupTree(outlinerState.groups);
    const collapsed = new Set(Array.isArray(outlinerState.collapsed) ? outlinerState.collapsed.map(String) : []);
    const itemToGroup = outlinerState.itemToGroup || {};

    const rows = collectRows(doc, tab);

    // Build group -> items mapping for current tab.
    /** @type {Map<string, any[]>} */
    const itemsByGroup = new Map();
    const ungrouped = [];

    for (const r of rows) {
      const uuid = uuidOf(r.node);
      if (!uuid) continue;
      const gid = itemToGroup[uuid] ? String(itemToGroup[uuid]) : null;
      if (gid && groupTree.byId.has(gid)) {
        if (!itemsByGroup.has(gid)) itemsByGroup.set(gid, []);
        itemsByGroup.get(gid).push(r);
      } else {
        ungrouped.push(r);
      }
    }

    // Render groups (tree order)
    const groupOrder = walkGroups(groupTree, null, 0, []);
    for (const { id: gid, depth } of groupOrder) {
      const g = groupTree.byId.get(gid);
      if (!g) continue;

      const hasItems = itemsByGroup.has(gid) && itemsByGroup.get(gid).length > 0;
      // Always show group rows, even if empty, to allow assignment.
      tbody.appendChild(this.#createGroupRow({ gid, name: g.name, depth, collapsed: collapsed.has(gid), hasItems }));

      if (collapsed.has(gid)) continue;

      const list = itemsByGroup.get(gid) || [];
      for (const r of list) {
        tbody.appendChild(this.#createItemRow({ r, locked, selected, hidden, solo, indentDepth: depth + 1 }));
      }
    }

    // Render ungrouped items
    for (const r of ungrouped) {
      tbody.appendChild(this.#createItemRow({ r, locked, selected, hidden, solo, indentDepth: 0 }));
    }

    // Cache visual order (item rows only) for SHIFT range selection SSOT.
    try {
      const order = [];
      for (const tr of Array.from(tbody.querySelectorAll('tr[data-uuid]'))) {
        if (!(tr instanceof HTMLElement)) continue;
        const u = String(tr.dataset.uuid || "");
        if (u) order.push(u);
      }
      this.lastRowOrder = order;
    } catch {
      this.lastRowOrder = [];
    }

    // UX: keep the current single selection in view.
    try {
      const selList = Array.from(selected || []).map(String).filter(Boolean);
      if (selList.length === 1) {
        const uuid = selList[0];
        /** @type {HTMLElement|null} */
        let row = null;
        for (const tr of Array.from(tbody.querySelectorAll('tr[data-uuid]'))) {
          if (!(tr instanceof HTMLElement)) continue;
          if (String(tr.dataset.uuid || "") === String(uuid)) { row = tr; break; }
        }
        if (row && typeof row.scrollIntoView === "function") {
          row.scrollIntoView({ block: "nearest" });
        }
      }
    } catch {}
  }

  #createGroupRow({ gid, name, depth, collapsed, hasItems }) {
    const tr = document.createElement("tr");
    tr.classList.add("is-group-row");
    if (this.selectedGroupId && String(this.selectedGroupId) === String(gid)) tr.classList.add("is-group-selected");
    tr.dataset.groupId = String(gid);

    // lock/vis/solo placeholder cells
    tr.appendChild(this.#createPlainCell(""));
    tr.appendChild(this.#createPlainCell(""));
    tr.appendChild(this.#createPlainCell(""));

    // main cell (span across the remaining columns)
    const tdName = document.createElement("td");
    const span = Math.max(1, (Number(this.columnCount) || 8) - 3);
    tdName.colSpan = span;

    const indent = document.createElement("span");
    indent.className = "outliner-indent";
    indent.style.setProperty("--indent", `${Math.max(0, depth) * 16}px`);
    tdName.appendChild(indent);

    const caret = document.createElement("span");
    caret.className = "outliner-caret";
    caret.textContent = collapsed ? "▸" : "▾";
    caret.title = collapsed ? "Expand" : "Collapse";
    caret.setAttribute("role", "button");
    caret.tabIndex = 0;

    const onToggle = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.core.toggleGroupCollapsed?.(gid);
    };

    caret.addEventListener("click", onToggle, { signal: this.signal });
    caret.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        onToggle(ev);
      },
      { signal: this.signal }
    );

    const label = document.createElement("span");
    label.textContent = name;
    label.title = hasItems ? "Group" : "Group (empty)";

    tdName.appendChild(caret);
    tdName.appendChild(label);
    tr.appendChild(tdName);

    tr.addEventListener(
      "click",
      (ev) => {
        ev.preventDefault();
        this.selectedGroupId = String(gid);
        this.render(this.core.getDocument?.());
      },
      { signal: this.signal }
    );

    tr.addEventListener(
      "dblclick",
      (ev) => {
        // rename
        ev.preventDefault();
        ev.stopPropagation();
        const next = window.prompt("Rename group", name);
        if (next == null) return;
        this.core.renameGroup?.(gid, next);
      },
      { signal: this.signal }
    );

    return tr;
  }

  #createItemRow({ r, locked, selected, hidden, solo, indentDepth }) {
    const uuid = uuidOf(r.node);
    const name = nameOf(r.node);
    const [x, y, z] = safePos(r.node);
    const path = r.path || "/";

    const tr = document.createElement("tr");
    tr.dataset.uuid = uuid;
    tr.dataset.kind = r.kind;
    tr.dataset.locked = locked.has(uuid) ? "true" : "false";
    if (uuid && selected.has(uuid)) tr.classList.add("is-selected");

    const isHidden = hidden.has(uuid);
    if (isHidden) tr.classList.add("is-hidden");
    if (solo && String(solo) !== String(uuid)) tr.classList.add("solo-dim");

    tr.appendChild(this.#createLockCell(uuid, locked));
    tr.appendChild(this.#createVisCell(uuid, isHidden));
    tr.appendChild(this.#createSoloCell(uuid, solo));

    const tdName = document.createElement("td");
    const indent = document.createElement("span");
    indent.className = "outliner-indent";
    indent.style.setProperty("--indent", `${Math.max(0, indentDepth) * 16}px`);
    tdName.appendChild(indent);
    // name-ish cell: points/lines => name, aux => module
    if (r.kind === "aux") {
      const mod = auxModuleLabel(r.node);
      tdName.appendChild(document.createTextNode(String(mod)));
    } else {
      tdName.appendChild(document.createTextNode(name));
    }
    tr.appendChild(tdName);

    if (r.kind === "line") {
      const a = r.node?.end_a?.ref || r.node?.end_a || "";
      const b = r.node?.end_b?.ref || r.node?.end_b || "";
      tr.appendChild(this.#createTextCell(a, "col-end"));
      tr.appendChild(this.#createTextCell(b, "col-end"));
      tr.appendChild(this.#createUuidCell(uuid));
    } else {
      tr.appendChild(this.#createNumCell(x));
      tr.appendChild(this.#createNumCell(y));
      tr.appendChild(this.#createNumCell(z));
      tr.appendChild(this.#createUuidCell(uuid));
    }

    tr.addEventListener(
      "click",
      (ev) => {
        if (!uuid) return;
        this.onRowSelect({ uuid, kind: r.kind, path }, ev);
      },
      { signal: this.signal }
    );

    return tr;
  }

  #createPlainCell(text) {
    const td = document.createElement("td");
    td.textContent = String(text ?? "");
    return td;
  }

  #createLockCell(uuid, locked) {
    const td = document.createElement("td");
    td.className = "col-lock";
    td.textContent = locked.has(uuid) ? "🔒" : "🔓";
    td.title = locked.has(uuid) ? "Unlock" : "Lock";
    td.setAttribute("role", "button");
    td.tabIndex = 0;

    const toggle = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!uuid) return;

      const curLocked = new Set(this.core.listLocks?.() || []);
      const sel = Array.from(this.getSelectedSet?.() || []);
      const isMulti = sel.length > 1 && sel.includes(String(uuid));

      // If the clicked row is part of a multi-selection, apply the same lock/unlock intent to all selected items.
      if (isMulti) {
        const wantLock = !curLocked.has(String(uuid));
        for (const u of sel) {
          const su = String(u);
          if (wantLock && !curLocked.has(su)) this.core.toggleLock?.(su);
          if (!wantLock && curLocked.has(su)) this.core.toggleLock?.(su);
        }
        return;
      }

      this.core.toggleLock?.(uuid);
    };

    td.addEventListener("click", toggle, { signal: this.signal });
    td.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        toggle(ev);
      },
      { signal: this.signal }
    );

    return td;
  }

  #createVisCell(uuid, isHidden) {
    const td = document.createElement("td");
    td.className = "col-vis";
    td.textContent = isHidden ? "🙈" : "👁";
    td.title = isHidden ? "Show" : "Hide";
    td.setAttribute("role", "button");
    td.tabIndex = 0;

    const toggle = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!uuid) return;

      const curHidden = new Set(this.core.listHidden?.() || []);
      const sel = Array.from(this.getSelectedSet?.() || []);
      const isMulti = sel.length > 1 && sel.includes(String(uuid));

      // If the clicked row is part of a multi-selection, apply the same hide/show intent to all selected items.
      if (isMulti) {
        const wantHide = !curHidden.has(String(uuid));
        for (const u of sel) {
          const su = String(u);
          if (wantHide && !curHidden.has(su)) this.core.toggleHidden?.(su);
          if (!wantHide && curHidden.has(su)) this.core.toggleHidden?.(su);
        }
        return;
      }

      this.core.toggleHidden?.(uuid);
    };

    td.addEventListener("click", toggle, { signal: this.signal });
    td.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        toggle(ev);
      },
      { signal: this.signal }
    );

    return td;
  }

  #createSoloCell(uuid, soloUuid) {
    const td = document.createElement("td");
    td.className = "col-solo";
    const isSolo = soloUuid && String(soloUuid) === String(uuid);
    td.textContent = isSolo ? "★" : "☆";
    td.title = isSolo ? "Clear solo" : "Solo";
    td.setAttribute("role", "button");
    td.tabIndex = 0;

    const toggle = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!uuid) return;
      if (isSolo) this.core.clearSolo?.();
      else this.core.setSolo?.(uuid);
    };

    td.addEventListener("click", toggle, { signal: this.signal });
    td.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        toggle(ev);
      },
      { signal: this.signal }
    );

    return td;
  }

  #createNumCell(v) {
    const td = document.createElement("td");
    td.className = "col-num";
    td.textContent = String(v ?? 0);
    return td;
  }

  #createTextCell(v, cls = "") {
    const td = document.createElement("td");
    if (cls) td.className = cls;
    td.textContent = String(v ?? "");
    return td;
  }

  #createUuidCell(uuid) {
    const td = document.createElement("td");
    td.className = "col-uuid";
    td.textContent = uuid ? String(uuid).slice(0, 8) : "";
    return td;
  }
}
