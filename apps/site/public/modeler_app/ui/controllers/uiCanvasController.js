// ui/controllers/uiCanvasController.js
// Canvas wiring: resize + pick (no business logic).

function clampDpr(dpr) {
  const v = Number(dpr);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.max(1, Math.min(2, v));
}


function decimalsForStep(step) {
  const s = String(step);
  const i = s.indexOf(".");
  return i >= 0 ? Math.max(0, s.length - i - 1) : 0;
}
function snapToStep(value, step) {
  const v = Number(value);
  const st = Number(step);
  if (!Number.isFinite(v) || !Number.isFinite(st) || st === 0) return v;
  const snapped = Math.round(v / st) * st;
  const d = decimalsForStep(st);
  // normalize float error (e.g. 0.9999999999)
  const n = Number(snapped.toFixed(Math.min(6, d)));
  return Object.is(n, -0) ? 0 : n;
}
function fmtCoord(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "0";
  // show up to 3 decimals, but trim trailing zeros
  const n = Number(v.toFixed(3));
  return String(Object.is(n, -0) ? 0 : n);
}

/**
 * @param {{
 *  canvas: HTMLCanvasElement | null,
 *  core?: any,
 *  hub: any,
 *  signal: AbortSignal,
 *  onPick: (issueLike: any, ev: PointerEvent) => void,
 *  onResize: (args: { width: number, height: number, dpr: number }) => void,
 *  ensureEditsAppliedOrConfirm?: () => boolean,
 *  setHud?: (msg: string) => void,
 * }} args
 */
export function attachUiCanvasController({ canvas, core, hub, signal, onPick, onResize, ensureEditsAppliedOrConfirm, setHud }) {
  let ro = null;

  const getExternalWantedSize = () => {
    try {
      const v = globalThis.__modelerPreviewOutWantedSize;
      if (!v || typeof v !== 'object') return null;
      const w = Number(v.width);
      const h = Number(v.height);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
      return { width: Math.floor(w), height: Math.floor(h) };
    } catch {
      return null;
    }
  };


  // Dimension overlay (Move helper): show L-chain (0,0,0)->(x,0,0)->(x,y,0)->(x,y,z)
  const dimEl = document.querySelector('[data-role="dim-overlay"]');
  const dimSvg = dimEl ? dimEl.querySelector('[data-role="dim-svg"]') : null;
  const dimBtnX = dimEl ? dimEl.querySelector('[data-role="dim-x"]') : null;
  const dimBtnY = dimEl ? dimEl.querySelector('[data-role="dim-y"]') : null;
  const dimBtnZ = dimEl ? dimEl.querySelector('[data-role="dim-z"]') : null;
  // Selected axis for wheel edits. Null until the user explicitly selects one.
  let dimAxis = null;
  let dimVisible = false;
  let dimUuid = null;
  let dimPos = [0, 0, 0];

  function setDimAxis(axis) {
    const a = (axis === "x" || axis === "y" || axis === "z") ? axis : null;
    dimAxis = a;
    try {
      dimBtnX && dimBtnX.classList.toggle("is-active", dimAxis === "x");
      dimBtnY && dimBtnY.classList.toggle("is-active", dimAxis === "y");
      dimBtnZ && dimBtnZ.classList.toggle("is-active", dimAxis === "z");
      if (dimSvg) {
        const xLine = dimSvg.querySelector(".dim-x");
        const yLine = dimSvg.querySelector(".dim-y");
        const zLine = dimSvg.querySelector(".dim-z");
        xLine && xLine.classList.toggle("is-active", dimAxis === "x");
        yLine && yLine.classList.toggle("is-active", dimAxis === "y");
        zLine && zLine.classList.toggle("is-active", dimAxis === "z");

        // Labels are also clickable; highlight them together with the line.
        const lx = dimSvg.querySelector('.dim-label[data-axis="x"]');
        const ly = dimSvg.querySelector('.dim-label[data-axis="y"]');
        const lz = dimSvg.querySelector('.dim-label[data-axis="z"]');
        lx && lx.classList.toggle("is-active", dimAxis === "x");
        ly && ly.classList.toggle("is-active", dimAxis === "y");
        lz && lz.classList.toggle("is-active", dimAxis === "z");
      }
    } catch {}
  }

  function readSelectedPos(uuid) {
    const doc = core?.getDocument?.();
    if (!doc) return null;
    const u = String(uuid || "");
    const uuidOf = (n) => String(n?.meta?.uuid || n?.uuid || "");
    const readPos = (n) => {
      const p = n?.appearance?.position || n?.position;
      if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
      return [0, 0, 0];
    };
    if (Array.isArray(doc.points)) {
      const n = doc.points.find((it) => uuidOf(it) === u);
      if (n) return { kind: "points", pos: readPos(n) };
    }
    return null;
  }

  function ndcToPx(ndc, rect) {
    const x = (Number(ndc?.[0]) || 0);
    const y = (Number(ndc?.[1]) || 0);
    const px = (x * 0.5 + 0.5) * rect.width;
    const py = (1 - (y * 0.5 + 0.5)) * rect.height;
    return [px, py];
  }

  function updateDimOverlay() {
    if (!canvas || !dimEl || !dimSvg) return;
    const st = core?.getUiState?.() || {};
    const activeTool = String(st.activeTool || "select");
    const sel = Array.isArray(core?.getSelection?.()) ? core.getSelection().map(String).filter(Boolean) : [];
    const isMove = (activeTool === "move");
    if (!isMove || sel.length !== 1) {
      dimVisible = false;
      dimUuid = null;
      try { setDimAxis(null); } catch {}
      try { dimEl.hidden = true; } catch {}
      return;
    }

    const uuid = sel[0];
    const locked = new Set(core?.listLocks?.() || []);
    if (locked.has(uuid)) {
      dimVisible = false;
      dimUuid = null;
      try { setDimAxis(null); } catch {}
      try { dimEl.hidden = true; } catch {}
      return;
    }

    const hit = readSelectedPos(uuid);
    if (!hit) {
      dimVisible = false;
      dimUuid = null;
      try { setDimAxis(null); } catch {}
      try { dimEl.hidden = true; } catch {}
      return;
    }

    // New selection => require explicit axis pick again.
    if (dimUuid && dimUuid !== uuid) {
      try { setDimAxis(null); } catch {}
    }

    dimVisible = true;
    dimUuid = uuid;
    dimPos = hit.pos || [0, 0, 0];

    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 1 || rect.height <= 1) {
      try { dimEl.hidden = true; } catch {}
      return;
    }
    try { dimEl.hidden = false; } catch {}

    // World points for L-chain (B):
    const x = Number(dimPos[0]) || 0;
    const y = Number(dimPos[1]) || 0;
    const z = Number(dimPos[2]) || 0;
    const p0 = [0, 0, 0];
    const p1 = [x, 0, 0];
    const p2 = [x, y, 0];
    const p3 = [x, y, z];

    const s0 = ndcToPx(hub.projectToNdc?.(p0) || [0,0,0], rect);
    const s1 = ndcToPx(hub.projectToNdc?.(p1) || [0,0,0], rect);
    const s2 = ndcToPx(hub.projectToNdc?.(p2) || [0,0,0], rect);
    const s3 = ndcToPx(hub.projectToNdc?.(p3) || [0,0,0], rect);

    // SVG is in pixel coords for simplicity.
    dimSvg.setAttribute("viewBox", `0 0 ${Math.max(1, Math.floor(rect.width))} ${Math.max(1, Math.floor(rect.height))}`);

    const line = (a, b, cls, axis) => (
      `<line class="dim-line ${cls}" data-axis="${axis}" x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}"></line>`
    );
    const mid = (a, b) => [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5];
    const label = (p, txt, cls, axis) => (
      `<text class="dim-label ${cls}" data-axis="${axis}" x="${(p[0] + 8).toFixed(2)}" y="${(p[1] - 8).toFixed(2)}">${txt}</text>`
    );

    const mx = mid(s0, s1);
    const my = mid(s1, s2);
    const mz = mid(s2, s3);

    dimSvg.innerHTML =
      line(s0, s1, "dim-x", "x") +
      line(s1, s2, "dim-y", "y") +
      line(s2, s3, "dim-z", "z") +
      label(mx, `X ${fmtCoord(x)}`, "dim-label-x", "x") +
      label(my, `Y ${fmtCoord(y)}`, "dim-label-y", "y") +
      label(mz, `Z ${fmtCoord(z)}`, "dim-label-z", "z");


    // Button labels include current values
    if (dimBtnX) dimBtnX.textContent = `X: ${fmtCoord(x)}`;
    if (dimBtnY) dimBtnY.textContent = `Y: ${fmtCoord(y)}`;
    if (dimBtnZ) dimBtnZ.textContent = `Z: ${fmtCoord(z)}`;

    setDimAxis(dimAxis);
  }

  // Axis selection by buttons / clicking the dimension lines
  const onDimClick = (ev) => {
    try {
      const t = ev.target;
      const axis = t && t.getAttribute ? t.getAttribute("data-axis") : null;
      if (!axis) return;
      ev.preventDefault();
      ev.stopPropagation();
      setDimAxis(axis);
    } catch {}
  };
  if (dimSvg) dimSvg.addEventListener("click", onDimClick, { signal });
  if (dimBtnX) dimBtnX.addEventListener("click", () => setDimAxis("x"), { signal });
  if (dimBtnY) dimBtnY.addEventListener("click", () => setDimAxis("y"), { signal });
  if (dimBtnZ) dimBtnZ.addEventListener("click", () => setDimAxis("z"), { signal });

  // Keep overlay in sync with selection/tool/camera.
  // Also update periodically (camera can move due to orbit in other modes).
  let dimRaf = 0;
  const scheduleDim = () => {
    if (dimRaf) return;
    dimRaf = requestAnimationFrame(() => {
      dimRaf = 0;
      updateDimOverlay();
    });
  };

  try {
    const offSel = hub?.on?.("selection", scheduleDim);
    const offUi = hub?.on?.("uistate", scheduleDim);
    const offDoc = hub?.on?.("document", scheduleDim);
    signal.addEventListener("abort", () => { try { offSel && offSel(); offUi && offUi(); offDoc && offDoc(); } catch {} });
  } catch {}

  function doResize() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const dpr = clampDpr(window.devicePixelRatio || 1);
    // IMPORTANT: hub.resize expects CSS pixel size.
    // three.js renderer internally applies pixelRatio, so do NOT pre-multiply by dpr here.
    const cssW = Math.max(1, Math.floor(r.width));
    const cssH = Math.max(1, Math.floor(r.height));

    // If a preview-out window is open on an external display, render at the larger size
    // so the mirrored output remains sharp even when the in-app preview is smaller.
    const ext = getExternalWantedSize();
    const w = Math.max(cssW, ext?.width || 0);
    const h = Math.max(cssH, ext?.height || 0);
    onResize({ width: w, height: h, dpr });
    try { scheduleDim(); } catch {}
  }

  if (canvas) {
    ro = new ResizeObserver(() => doResize());
    ro.observe(canvas);
  }

  window.addEventListener("resize", doResize, { signal });
  window.addEventListener("modeler-previewout-resize", doResize, { signal });


  // Move tool: adjust selected axis with mouse wheel while Move is active.
  // NOTE: The dimension overlay sits on top of the canvas and can steal wheel events,
  // so we listen on BOTH the canvas and the overlay root (passive:false).
  if (canvas) {
    let wheelGroupOpen = false;
    let wheelEndTimer = null;

    const closeWheelGroup = () => {
      if (!wheelGroupOpen) return;
      wheelGroupOpen = false;
      try { core.endHistoryGroup?.(); } catch {}
      try { setHud && setHud(""); } catch {}
    };

    const handleMoveWheel = (ev) => {
      try {
        const st = core?.getUiState?.() || {};
        const activeTool = String(st.activeTool || "select");
        if (activeTool !== "move") return;
        if (ev.ctrlKey) return; // keep browser zoom

        const sel = Array.isArray(core?.getSelection?.()) ? core.getSelection().map(String).filter(Boolean) : [];
        if (sel.length !== 1) return;

        const uuid = sel[0];
        const locked = new Set(core?.listLocks?.() || []);
        if (locked.has(uuid)) return;

        // prevent scroll + avoid any other wheel consumers
        ev.preventDefault();
        ev.stopPropagation();

        const doc = core?.getDocument?.();
        const uuidOf = (n) => String(n?.meta?.uuid || n?.uuid || "");
        const readPos = (n) => {
          const p = n?.appearance?.position || n?.position;
          if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
          return [0, 0, 0];
        };

        let kind = null;
        let curPos = null;
        if (doc && Array.isArray(doc.points)) {
          const n = doc.points.find((it) => uuidOf(it) === uuid);
          if (n) { kind = "points"; curPos = readPos(n); }
        }
        if (!curPos || !kind) return;

        const dir = (ev.deltaY < 0) ? 1 : -1; // wheel-up => +
        const step = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
        const delta = dir * step;

        // Require explicit axis selection (X/Y/Z) in the overlay.
        const axis = (dimVisible && dimUuid === uuid) ? dimAxis : null;
        if (axis !== "x" && axis !== "y" && axis !== "z") {
          try { setHud && setHud("Select axis (X/Y/Z) then wheel"); } catch {}
          return;
        }
        const nextPos = [curPos[0], curPos[1], curPos[2]];
        if (axis === "x") nextPos[0] = snapToStep((Number(nextPos[0]) || 0) + delta, step);
        else if (axis === "y") nextPos[1] = snapToStep((Number(nextPos[1]) || 0) + delta, step);
        else nextPos[2] = snapToStep((Number(nextPos[2]) || 0) + delta, step);

        const ok = (typeof ensureEditsAppliedOrConfirm === "function") ? ensureEditsAppliedOrConfirm() : true;
        if (!ok) return;

        if (!wheelGroupOpen) {
          wheelGroupOpen = true;
          try { core.beginHistoryGroup?.(); } catch {}
        }
        try { clearTimeout(wheelEndTimer); } catch {}
        wheelEndTimer = setTimeout(closeWheelGroup, 250);

        // Preview first for responsiveness
        try { hub.previewSetPosition?.(uuid, nextPos); } catch {}

        // Commit to doc (still within a single Undo group)
        try {
          core.updateDocument?.((cur) => {
            if (!cur) return cur;
            const apply = (arr) => {
              if (!Array.isArray(arr)) return arr;
              let changed = false;
              const next = arr.map((it) => {
                if (uuidOf(it) !== uuid) return it;
                changed = true;
                const a = it.appearance || {};
                const position = Array.isArray(a.position) ? a.position.slice() : [0, 0, 0];
                position[0] = nextPos[0];
                position[1] = nextPos[1];
                position[2] = nextPos[2];
                return { ...it, appearance: { ...a, position } };
              });
              return changed ? next : arr;
            };
            return { ...cur, points: apply(cur.points) };
          });
        } catch {}

        // Update HUD + overlay
        try {
          const v = axis === "x" ? nextPos[0] : axis === "y" ? nextPos[1] : nextPos[2];
          setHud && setHud(`Move ${axis.toUpperCase()}: ${fmtCoord(v)}`);
        } catch {}
        try { scheduleDim(); } catch {}
      } catch {}
    };

    // Wheel can happen over the overlay (dimEl) rather than the canvas.
    const wheelTargets = [];
    if (dimEl) wheelTargets.push(dimEl);
    wheelTargets.push(canvas);

    for (const t of wheelTargets) {
      try { t.addEventListener("wheel", handleMoveWheel, { passive: false, signal }); } catch {}
    }
  }

  // Pick forwarding (selection)
  if (canvas && typeof hub?.applyPickAt === "function") {
    canvas.addEventListener(
      "pointerdown",
      (ev) => {
        if (ev.button !== 0) return;

        // Move tool position edits are performed via the dimension overlay + wheel.

        const r = canvas.getBoundingClientRect();
        if (!r || r.width <= 0 || r.height <= 0) return;
        const ndcX = ((ev.clientX - r.left) / r.width) * 2 - 1;
        const ndcY = -(((ev.clientY - r.top) / r.height) * 2 - 1);
        const issueLike = hub.applyPickAt({ ndcX, ndcY });
        if (issueLike && issueLike.uuid) onPick(issueLike, ev);
      },
      { signal }
    );
  }

  // Run initial resize once.
  doResize();

  return {
    resize: doResize,
    detach: () => {
      try {
        ro && ro.disconnect && ro.disconnect();
      } catch {}
    },
  };
}

