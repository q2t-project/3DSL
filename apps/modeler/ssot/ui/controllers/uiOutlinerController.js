// ui/controllers/uiOutlinerController.js
// Outliner: dual columns (points | lines)
// - independent vertical scroll
// - fixed columns (no horizontal scroll)
// - essential authoring actions: add point/line, delete selection, lock toggle

function uuidOf(node) {
  return String(node?.meta?.uuid || node?.uuid || "");
}

function safePos(node) {
  const p = node?.appearance?.position || node?.position;
  if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  return [0, 0, 0];
}

function textOf(node) {
  // Prefer signification.name, but fall back to visible marker text.
  // NOTE: signification.name is often localized: { ja: "...", en: "..." }.
  const n = node?.signification?.name;
  if (typeof n === "string") return n;
  if (n && typeof n === "object") {
    const ja = n.ja ?? n.jp;
    const en = n.en;
    if (typeof ja === "string" && ja) return ja;
    if (typeof en === "string" && en) return en;
    for (const v of Object.values(n)) {
      if (typeof v === "string" && v) return v;
    }
  }

  const v =
    node?.name ??
    node?.appearance?.marker?.text?.content ??
    node?.appearance?.marker?.text?.value ??
    "";
  return String(v ?? "");
}

function escHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}


function refOf(v) {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object") return "";
  const r = v.ref ?? v.uuid ?? v.id;
  return typeof r === "string" ? r : "";
}

function captionOf(lineNode) {
  // line.caption_text OR signification.name fallback
  const cap = lineNode?.appearance?.caption_text?.content;
  if (typeof cap === "string") return cap;
  return textOf(lineNode);
}

function frameLabel(node) {
  const fr = node?.appearance?.frames ?? node?.frames;
  const arr = Array.isArray(fr) ? fr : fr == null ? [] : [fr];
  const nums = arr
    .map((v) => {
      if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
      if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Math.trunc(Number(v));
      return null;
    })
    .filter((v) => v != null);
  if (!nums.length) return "";
  let min = nums[0];
  let max = nums[0];
  for (const n of nums) {
    if (n < min) min = n;
    if (n > max) max = n;
  }
  return min === max ? String(min) : `${min}-${max}`;
}

function escAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

export class UiOutlinerController {
  constructor(opts) {
    const {
      root,
      pointsTbody,
      linesTbody,
      pointsScroll,
      linesScroll,
      core,
      signal,
      getSelectedSet,
      onRowSelect,
      ensureEditsAppliedOrConfirm,
      requestToolbarSync,
      setHud,
      setSelectionUuids,
    } = opts || {};

    this.root = root;
    this.pointsTbody = pointsTbody;
    this.linesTbody = linesTbody;
    this.pointsScroll = pointsScroll;
    this.linesScroll = linesScroll;
    this.core = core;
    this.signal = signal;
    this.getSelectedSet = typeof getSelectedSet === "function" ? getSelectedSet : () => new Set();
    this.onRowSelect = typeof onRowSelect === "function" ? onRowSelect : () => {};
    this.ensureEditsAppliedOrConfirm = typeof ensureEditsAppliedOrConfirm === "function" ? ensureEditsAppliedOrConfirm : () => true;
    this.requestToolbarSync = typeof requestToolbarSync === "function" ? requestToolbarSync : () => {};
    this.setHud = typeof setHud === "function" ? setHud : () => {};
    this.setSelectionUuids = typeof setSelectionUuids === "function" ? setSelectionUuids : () => {};

    this._doc = null;
    this._rowOrder = { points: [], lines: [] };

    this._bindAuthoringButtons();
    this._bindOrderButtons();
    this._bindTableEvents();
    this._ensureStaticHeaders();
  }

  // --- public ---

  render(doc) {
    this._doc = doc;
    this._renderPoints();
    this._renderLines();
  }

  getRowOrder() {
    const tab = (this.core.getUiState?.().activeTab) || "points";
    if (tab === "lines") return this._rowOrder.lines.slice();
    return this._rowOrder.points.slice();
  }

  /**
   * Reveal a row by uuid and briefly flash it for visual confirmation.
   * @param {string} uuid
   * @param {"points"|"lines"|""} kindHint
   */
  revealUuid(uuid, kindHint = "") {
    const u = String(uuid || "");
    if (!u) return false;

    const findRow = (tbody) => {
      try { return tbody?.querySelector?.(`tr[data-uuid="${CSS.escape(u)}"]`) || null; } catch {}
      try { return tbody?.querySelector?.(`tr[data-uuid="${u.replaceAll('"', '\"')}"]`) || null; } catch {}
      return null;
    };

    /** @type {HTMLElement|null} */
    let row = null;
    let tab = "";

    if (kindHint === "points") {
      row = findRow(this.pointsTbody);
      tab = "points";
    } else if (kindHint === "lines") {
      row = findRow(this.linesTbody);
      tab = "lines";
    } else {
      row = findRow(this.pointsTbody);
      tab = row ? "points" : "";
      if (!row) {
        row = findRow(this.linesTbody);
        tab = row ? "lines" : "";
      }
    }

    if (!(row instanceof HTMLElement)) return false;

    try {
      if (tab) this.core?.setUiState?.({ activeTab: tab });
    } catch {}

    try {
      row.scrollIntoView({ block: "center", inline: "nearest" });
    } catch {}

    try {
      row.classList.remove("is-flash");
      // force reflow
      void row.offsetWidth;
      row.classList.add("is-flash");
      window.setTimeout(() => { try { row.classList.remove("is-flash"); } catch {} }, 650);
    } catch {}

    return true;
  }


  // --- internal ---

  _guardEdits() {
    try {
      return !!this.ensureEditsAppliedOrConfirm();
    } catch {
      return true;
    }
  }

  _bindAuthoringButtons() {
    const btnAddPoint = this.root?.querySelector?.('[data-action="add-point"]');
    const btnAddLine = this.root?.querySelector?.('[data-action="add-line"]');
    const btnDel = this.root?.querySelector?.('[data-action="delete"]');

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

  _bindOrderButtons() {
    const bind = (action, fn) => {
      const els = Array.from(this.root?.querySelectorAll?.(`[data-action="${action}"]`) || []);
      for (const el of els) {
        if (!(el instanceof HTMLElement)) continue;
        el.addEventListener(
          "click",
          (ev) => {
            ev.preventDefault();
            const rawKind = (el.getAttribute("data-kind") || "").trim();
            let kind = rawKind === "point" ? "points" : rawKind === "line" ? "lines" : rawKind;

            if (kind !== "points" && kind !== "lines") {
              if (el.closest(".outcol-lines,[aria-label='Lines']")) kind = "lines";
              else if (el.closest(".outcol-points,[aria-label='Points']")) kind = "points";
              else {
                const ui = this.core?.getUiState?.() || {};
                kind = ui.activeTab === "lines" ? "lines" : "points";
              }
            }

            fn(kind);
          },
          { signal: this.signal }
        );
      }
    };

    bind("order-up", (kind) => this._moveSelection(kind, "up"));
    bind("order-down", (kind) => this._moveSelection(kind, "down"));
    bind("order-top", (kind) => this._moveSelection(kind, "top"));
    bind("order-bottom", (kind) => this._moveSelection(kind, "bottom"));
  }

  _bindTableEvents() {
    const bind = (tbody, tab) => {
      if (!(tbody instanceof HTMLElement)) return;
      tbody.addEventListener(
        "click",
        (ev) => {
          const tr = ev.target?.closest?.("tr[data-uuid]");
          if (!tr) return;

          const uuid = tr.getAttribute("data-uuid") || "";
          const path = tr.getAttribute("data-path") || "";
          const kind = tr.getAttribute("data-kind") || tab;

          // lock toggle
          const lockEl = ev.target?.closest?.("[data-action='toggle-lock']");
          if (lockEl) {
            ev.preventDefault();
            this._toggleLock(uuid);
            return;
          }

          if (!this._guardEdits()) return;
          this.core.setUiState?.({ activeTab: tab });
          this.onRowSelect({ uuid, kind, path }, ev);
        },
        { signal: this.signal }
      );
    };

    bind(this.pointsTbody, "points");
    bind(this.linesTbody, "lines");
  }

  _toggleLock(uuid) {
    if (!uuid) return;
    try {
      this.core.toggleLock?.(uuid);
      this.requestToolbarSync();
      this.render(this._doc);
    } catch {}
  }

  _moveSelection(kind, mode) {
    if (!kind || (kind !== "points" && kind !== "lines")) return;
    if (!this._guardEdits()) return;

    const sel = Array.isArray(this.core.getSelection?.())
      ? this.core.getSelection?.().filter(Boolean).map(String)
      : [...this.getSelectedSet()];

    if (!sel.length) return;

    try {
      const locked = new Set(this.core.listLocks?.() || []);
      this.core.updateDocument?.((doc) => {
        if (!doc || typeof doc !== "object") return;
        const key = kind;
        const arr = Array.isArray(doc[key]) ? doc[key] : [];
        if (!arr.length) return;

        // Keep locked items fixed at their indices; reorder only within unlocked slots.
        const isLockedAt = arr.map((it) => locked.has(uuidOf(it)));
        const unlocked = arr.filter((it) => !locked.has(uuidOf(it)));
        const selSet = new Set(sel);
        const movingSet = new Set(unlocked.map(uuidOf).filter((u) => selSet.has(u)));
        if (!movingSet.size) return;

        const moveUpDown = (dir) => {
          if (dir === "up") {
            for (let i = 1; i < unlocked.length; i += 1) {
              const cur = unlocked[i];
              const prev = unlocked[i - 1];
              const cu = uuidOf(cur);
              const pu = uuidOf(prev);
              if (movingSet.has(cu) && !movingSet.has(pu)) {
                unlocked[i - 1] = cur;
                unlocked[i] = prev;
              }
            }
          } else {
            for (let i = unlocked.length - 2; i >= 0; i -= 1) {
              const cur = unlocked[i];
              const next = unlocked[i + 1];
              const cu = uuidOf(cur);
              const nu = uuidOf(next);
              if (movingSet.has(cu) && !movingSet.has(nu)) {
                unlocked[i] = next;
                unlocked[i + 1] = cur;
              }
            }
          }
        };

        const moveToEnd = (where) => {
          const kept = [];
          const moved = [];
          for (const it of unlocked) {
            (movingSet.has(uuidOf(it)) ? moved : kept).push(it);
          }
          const merged = where === "top" ? [...moved, ...kept] : [...kept, ...moved];
          unlocked.length = 0;
          unlocked.push(...merged);
        };

        if (mode === "up" || mode === "down") moveUpDown(mode);
        if (mode === "top" || mode === "bottom") moveToEnd(mode);

        // Rebuild array preserving locked indices.
        let ui = 0;
        const rebuilt = arr.map((it, idx) => {
          if (isLockedAt[idx]) return it;
          const v = unlocked[ui] ?? it;
          ui += 1;
          return v;
        });
        doc[key] = rebuilt;
      });

      this.core.setUiState?.({ activeTab: kind });
      this.requestToolbarSync();
    } catch {
      this.setHud("Reorder failed");
    }
  }

  _renderPoints() {
    const tbody = this.pointsTbody;
    if (!(tbody instanceof HTMLElement)) return;
    tbody.textContent = "";

    const doc = this._doc;
    const points = Array.isArray(doc?.points) ? doc.points : [];
    const locked = new Set(this.core.listLocks?.() || []);
    const selected = this.getSelectedSet();

    const order = [];
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const uuid = uuidOf(p);
      if (!uuid) continue;
      order.push(uuid);
      const [x, y, z] = safePos(p);
      const name = textOf(p) || "(unnamed)";
      const frames = frameLabel(p);
      const tr = document.createElement("tr");
      tr.dataset.uuid = uuid;
      tr.dataset.kind = "point";
      tr.dataset.path = `/points/${i}`;
      tr.classList.toggle("is-selected", selected.has(uuid));
      tr.dataset.locked = locked.has(uuid) ? "true" : "false";

      tr.innerHTML = `
        <td class="col-lock" title="${locked.has(uuid) ? "Unlock" : "Lock"}"><button type="button" data-action="toggle-lock" class="cellbtn lockbtn ${locked.has(uuid) ? "is-locked" : "is-unlocked"}">${locked.has(uuid) ? "🔒" : "🔓"}</button></td>
        <td class="col-name" title="${escAttr(name)}">${escHtml(name)}</td>
        <td class="col-num">${x}</td>
        <td class="col-num">${y}</td>
        <td class="col-num">${z}</td>
        <td class="col-frames" title="${escAttr(frames)}">${frames}</td>
      `.trim();
      tbody.appendChild(tr);
    }
    this._rowOrder.points = order;
  }

  _renderLines() {
    const tbody = this.linesTbody;
    if (!(tbody instanceof HTMLElement)) return;
    tbody.textContent = "";

    const doc = this._doc;
    const lines = Array.isArray(doc?.lines) ? doc.lines : [];
    const locked = new Set(this.core.listLocks?.() || []);
    const selected = this.getSelectedSet();

    const order = [];
    for (let i = 0; i < lines.length; i += 1) {
      const ln = lines[i];
      const uuid = uuidOf(ln);
      if (!uuid) continue;
      order.push(uuid);

      const cap = captionOf(ln);
      const a = refOf(ln?.appearance?.end_a ?? ln?.end_a) || (typeof (ln?.appearance?.end_a ?? ln?.end_a) === "string" ? (ln?.appearance?.end_a ?? ln?.end_a) : "");
      const b = refOf(ln?.appearance?.end_b ?? ln?.end_b) || (typeof (ln?.appearance?.end_b ?? ln?.end_b) === "string" ? (ln?.appearance?.end_b ?? ln?.end_b) : "");
      const frames = frameLabel(ln);

      const tr = document.createElement("tr");
      tr.dataset.uuid = uuid;
      tr.dataset.kind = "line";
      tr.dataset.path = `/lines/${i}`;
      tr.classList.toggle("is-selected", selected.has(uuid));
      tr.dataset.locked = locked.has(uuid) ? "true" : "false";

      const short = (u) => (u && u.length > 8) ? u.slice(0, 6) : (u || "");
      tr.innerHTML = `
        <td class="col-lock" title="${locked.has(uuid) ? "Unlock" : "Lock"}"><button type="button" data-action="toggle-lock" class="cellbtn">${locked.has(uuid) ? "🔒" : "🔓"}</button></td>
        <td class="col-name" title="${escAttr(cap)}">${escHtml(cap)}</td>
        <td class="col-end" title="${escAttr(a)}">${short(a)}</td>
        <td class="col-end" title="${escAttr(b)}">${short(b)}</td>
        <td class="col-frames" title="${escAttr(frames)}">${frames}</td>
      `.trim();
      tbody.appendChild(tr);
    }
    this._rowOrder.lines = order;
  }

  _ensureStaticHeaders() {
    // Force the fixed-column contract, even if older HTML is loaded.
    // Points: L | name | x | y | z | Fr
    // Lines : L | caption | end_a | end_b | Fr
    const force = (table, kind) => {
      const tr = table?.querySelector?.("thead tr");
      if (!(tr instanceof HTMLElement)) return;

      const mk = (txt, cls) => {
        const th = document.createElement("th");
        th.className = cls;
        th.textContent = txt;
        return th;
      };

      tr.replaceChildren();

      if (kind === "points") {
        tr.appendChild(mk("L", "col-lock"));
        tr.appendChild(mk("name", "col-name"));
        tr.appendChild(mk("x", "col-num"));
        tr.appendChild(mk("y", "col-num"));
        tr.appendChild(mk("z", "col-num"));
        tr.appendChild(mk("Fr", "col-frames"));
      } else if (kind === "lines") {
        tr.appendChild(mk("L", "col-lock"));
        tr.appendChild(mk("caption", "col-name"));
        tr.appendChild(mk("end_a", "col-end"));
        tr.appendChild(mk("end_b", "col-end"));
        tr.appendChild(mk("Fr", "col-frames"));
      }
    };

    try {
      force(this.root?.querySelector?.('[data-role="outliner-points-table"]'), "points");
    } catch {}
    try {
      force(this.root?.querySelector?.('[data-role="outliner-lines-table"]'), "lines");
    } catch {}
  }
  _newUuid() {
    try {
      if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
    } catch {}
    const r = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    return `${r()}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r()}${r().slice(0, 4)}`;
  }

  addPoint() {
    if (!this._guardEdits()) return;
    const uuid = this._newUuid();
    try {
      this.core.updateDocument?.((doc) => {
        if (!doc || typeof doc !== 'object') return;
        if (!Array.isArray(doc.points)) doc.points = [];
        doc.points.push({
          meta: { uuid },
          signification: { name: '' },
          appearance: { position: [0, 0, 0] },
        });
      });
      if (typeof this.setSelectionUuids === 'function') this.setSelectionUuids([uuid], { uuid, kind: 'point' }, 'outliner-add');
      else this.core.setSelection?.([uuid]);
      this.core.setUiState?.({ activeTab: 'points' });
      this.requestToolbarSync();
    } catch {
      this.setHud('addPoint failed');
    }
  }

  addLine() {
    if (!this._guardEdits()) return;
    const uuid = this._newUuid();
    try {
      this.core.updateDocument?.((doc) => {
        if (!doc || typeof doc !== 'object') return;
        if (!Array.isArray(doc.lines)) doc.lines = [];
        doc.lines.push({
          meta: { uuid },
          signification: { name: '' },
          end_a: { ref: '' },
          end_b: { ref: '' },
          appearance: {},
        });
      });
      if (typeof this.setSelectionUuids === 'function') this.setSelectionUuids([uuid], { uuid, kind: 'line' }, 'outliner-add');
      else this.core.setSelection?.([uuid]);
      this.core.setUiState?.({ activeTab: 'lines' });
      this.requestToolbarSync();
    } catch {
      this.setHud('addLine failed');
    }
  }

  deleteSelection() {
    if (!this._guardEdits()) return;
    try {
      const sel = Array.isArray(this.core.getSelection?.()) ? this.core.getSelection?.().filter(Boolean).map(String) : [];
      if (!sel.length) return;
      const locked = new Set(this.core.listLocks?.() || []);
      const targets = sel.filter((u) => !locked.has(u));
      if (!targets.length) {
        this.setHud('Selection is locked');
        return;
      }
      const rm = new Set(targets);
      this.core.updateDocument?.((doc) => {
        if (!doc || typeof doc !== 'object') return;
        const keep = (arr) => Array.isArray(arr) ? arr.filter((it) => !rm.has(String(it?.meta?.uuid || it?.uuid || ''))) : arr;
        doc.points = keep(doc.points);
        doc.lines = keep(doc.lines);
        doc.aux = keep(doc.aux);
      });
      if (typeof this.setSelectionUuids === 'function') this.setSelectionUuids([], null, 'outliner-delete');
      else this.core.setSelection?.([]);
      this.requestToolbarSync();
    } catch {
      this.setHud('Delete failed');
    }
  }
}
