// ui/controllers/uiCanvasController.js
// Canvas wiring: resize + pick (no business logic).

function clampDpr(dpr) {
  const v = Number(dpr);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.max(1, Math.min(2, v));
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
  }

  if (canvas) {
    ro = new ResizeObserver(() => doResize());
    ro.observe(canvas);
  }

  window.addEventListener("resize", doResize, { signal });
  window.addEventListener("modeler-previewout-resize", doResize, { signal });

  // Pick forwarding (selection)
  if (canvas && typeof hub?.applyPickAt === "function") {
    canvas.addEventListener(
      "pointerdown",
      (ev) => {
        if (ev.button !== 0) return;

        // Move tool: drag selected item on its current Z plane.
        try {
          const st = core?.getUiState?.() || {};
          const activeTool = String(st.activeTool || "select");
          if (activeTool === "move") {
            const sel = Array.isArray(core?.getSelection?.()) ? core.getSelection().map(String).filter(Boolean) : [];
            if (sel.length === 1) {
              const uuid = sel[0];
              const locked = new Set(core?.listLocks?.() || []);
              if (!locked.has(uuid)) {
                const doc = core?.getDocument?.();
                const findPos = () => {
                  const u = String(uuid || "");
                  const uuidOf = (n) => String(n?.meta?.uuid || n?.uuid || "");
                  const readPos = (n) => {
                    const p = n?.appearance?.position || n?.position;
                    if (Array.isArray(p) && p.length >= 3) return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
                    return [0, 0, 0];
                  };
                  if (doc && Array.isArray(doc.points)) {
                    const n = doc.points.find((it) => uuidOf(it) === u);
                    if (n) return { kind: "point", pos: readPos(n) };
                  }
                  if (doc && Array.isArray(doc.aux)) {
                    const n = doc.aux.find((it) => uuidOf(it) === u);
                    if (n) return { kind: "aux", pos: readPos(n) };
                  }
                  return null;
                };

                const base = findPos();
                if (base) {
                  const ok = (typeof ensureEditsAppliedOrConfirm === "function") ? ensureEditsAppliedOrConfirm() : true;
                  if (!ok) return;

                  const r = canvas.getBoundingClientRect();
                  if (!r || r.width <= 0 || r.height <= 0) return;
                  const ndcX0 = ((ev.clientX - r.left) / r.width) * 2 - 1;
                  const ndcY0 = -(((ev.clientY - r.top) / r.height) * 2 - 1);

                  const planeZ = Number(base.pos[2]) || 0;
                  const w0 = hub.worldPointOnPlaneZ?.(ndcX0, ndcY0, planeZ);
                  if (!Array.isArray(w0) || w0.length < 3) return;

                  // Begin gesture
                  let active = true;
                  const startPos = [Number(base.pos[0]) || 0, Number(base.pos[1]) || 0, Number(base.pos[2]) || 0];
                  const startWorld = [Number(w0[0]) || 0, Number(w0[1]) || 0, Number(w0[2]) || 0];
                  try { core.beginHistoryGroup?.(); } catch {}
                  try { canvas.setPointerCapture(ev.pointerId); } catch {}

                  const onMove = (e) => {
                    if (!active) return;
                    const rr = canvas.getBoundingClientRect();
                    if (!rr || rr.width <= 0 || rr.height <= 0) return;
                    const ndcX = ((e.clientX - rr.left) / rr.width) * 2 - 1;
                    const ndcY = -(((e.clientY - rr.top) / rr.height) * 2 - 1);
                    const w = hub.worldPointOnPlaneZ?.(ndcX, ndcY, planeZ);
                    if (!Array.isArray(w) || w.length < 3) return;
                    const dx = (Number(w[0]) || 0) - startWorld[0];
                    const dy = (Number(w[1]) || 0) - startWorld[1];
                    const next = [startPos[0] + dx, startPos[1] + dy, startPos[2]];
                    try { hub.previewSetPosition?.(uuid, next); } catch {}
                    try { setHud && setHud(`Move: ${next.map((n) => Math.round(n * 100) / 100).join(", ")}`); } catch {}
                  };

                  const finish = (commit) => {
                    if (!active) return;
                    active = false;
                    canvas.removeEventListener("pointermove", onMove);
                    canvas.removeEventListener("pointerup", onUp);
                    canvas.removeEventListener("pointercancel", onCancel);

                    // Read final preview position from renderer cache is not accessible,
                    // so recompute once at pointer end.
                    const rr = canvas.getBoundingClientRect();
                    let nextPos = startPos;
                    try {
                      if (rr && rr.width > 0 && rr.height > 0) {
                        const ndcX = ((lastClientX - rr.left) / rr.width) * 2 - 1;
                        const ndcY = -(((lastClientY - rr.top) / rr.height) * 2 - 1);
                        const w = hub.worldPointOnPlaneZ?.(ndcX, ndcY, planeZ);
                        if (Array.isArray(w) && w.length >= 3) {
                          const dx = (Number(w[0]) || 0) - startWorld[0];
                          const dy = (Number(w[1]) || 0) - startWorld[1];
                          nextPos = [startPos[0] + dx, startPos[1] + dy, startPos[2]];
                        }
                      }
                    } catch {}

                    if (commit) {
                      try {
                        core.updateDocument?.((cur) => {
                          const uuidOf = (n) => String(n?.meta?.uuid || n?.uuid || "");
                          const apply = (arr) => {
                            if (!Array.isArray(arr)) return arr;
                            return arr.map((it) => {
                              if (!it || uuidOf(it) !== uuid) return it;
                              const next = { ...it };
                              if (!next.appearance || typeof next.appearance !== "object") next.appearance = { ...(next.appearance || {}) };
                              next.appearance.position = [nextPos[0], nextPos[1], nextPos[2]];
                              return next;
                            });
                          };
                          return {
                            ...cur,
                            points: apply(cur.points),
                            aux: apply(cur.aux),
                          };
                        });
                      } catch {}
                    } else {
                      // Revert preview position on cancel.
                      try { hub.previewSetPosition?.(uuid, startPos); } catch {}
                    }

                    try { core.endHistoryGroup?.(); } catch {}
                    try { setHud && setHud(""); } catch {}
                  };

                  let lastClientX = ev.clientX;
                  let lastClientY = ev.clientY;
                  const onUp = (e) => {
                    lastClientX = e.clientX;
                    lastClientY = e.clientY;
                    finish(true);
                  };
                  const onCancel = (e) => {
                    lastClientX = e.clientX;
                    lastClientY = e.clientY;
                    finish(false);
                  };

                  canvas.addEventListener("pointermove", (e) => { lastClientX = e.clientX; lastClientY = e.clientY; onMove(e); }, { signal });
                  canvas.addEventListener("pointerup", onUp, { signal, once: true });
                  canvas.addEventListener("pointercancel", onCancel, { signal, once: true });
                  // Do not fallthrough to pick when move gesture started.
                  return;
                }
              }
            }
          }
        } catch {}

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
