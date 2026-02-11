// viewer_app_premium/addons/captureHiResAddon.js
//
// P5-2: Hi-res capture addon skeleton.
// - Receives postMessage from premium_app
// - Runs capture (single-flight) + rate limit
// - Returns Blob + minimal meta back to parent via postMessage

function nowMs() {
  return Date.now();
}

function safeNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function normalizePreset(preset) {
  // preset can be:
  // - { scale: 2 }
  // - "2x" | "3x"
  // - { maxEdge: 4096 } (future)
  if (typeof preset === "string") {
    const m = preset.match(/^(\d+)x$/i);
    if (m) return { scale: clamp(safeNum(m[1], 2), 1, 4) };
  }
  if (preset && typeof preset === "object") {
    if (typeof preset.scale !== "undefined") return { scale: clamp(safeNum(preset.scale, 2), 1, 4) };
    if (typeof preset.maxEdge !== "undefined") return { maxEdge: clamp(safeNum(preset.maxEdge, 4096), 512, 8192) };
  }
  return { scale: 2 };
}

function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve) => {
    try {
      if (canvas && typeof canvas.toBlob === "function") {
        canvas.toBlob((b) => resolve(b || null), type, quality);
        return;
      }
    } catch (_e) {}
    // fallback: dataURL
    try {
      const url = canvas.toDataURL(type, quality);
      const bin = atob(url.split(",")[1] || "");
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      resolve(new Blob([u8], { type }));
    } catch (_e) {
      resolve(null);
    }
  });
}

export function createCaptureHiResAddon() {
  // single-flight + basic rate limit
  let running = false;
  let lastRunAt = 0;

  // minimal cancel support (best-effort)
  let activeReqId = "";
  let cancelRequested = false;

  // cancellation bookkeeping (ensure we never emit ok after cancel)
  const cancelledReqIds = new Set();
  const repliedReqIds = new Set();

  /** @type {number[]} */
  const recent = []; // timestamps (ms)

  const COOLDOWN_MS = 5000;
  const WINDOW_MS = 60_000;
  const MAX_PER_WINDOW = 6;

  function prune(now) {
    while (recent.length > 0 && (now - recent[0]) > WINDOW_MS) recent.shift();
  }

  function canRun(now) {
    if (running) return { ok: false, code: "busy" };
    if (lastRunAt && (now - lastRunAt) < COOLDOWN_MS) return { ok: false, code: "rate_limited", reason: "cooldown" };
    prune(now);
    if (recent.length >= MAX_PER_WINDOW) return { ok: false, code: "rate_limited", reason: "per_minute" };
    return { ok: true };
  }

  function replyToParent(msg) {
    try {
      // same-origin usage (premium_app <-> premium viewer iframe)
      window.parent?.postMessage(msg, "*");
    } catch (_e) {}
  }

  async function runCapture(ctx, req) {
    const { core, renderer } = ctx || {};
    const reqId = req?.reqId || "";

    const isCancelled = () => Boolean(reqId && cancelledReqIds.has(reqId));

    // early cancel
    if (isCancelled()) {
      if (!repliedReqIds.has(reqId)) {
        repliedReqIds.add(reqId);
        replyToParent({ type: "premium.capture.result", reqId, ok: false, error: { code: "cancelled" } });
      }
      return;
    }

    const rctx = renderer; // renderer context (viewer/runtime/renderer/context.js)
    const canvas = rctx?.canvas;
    const threeRenderer = rctx?.renderer;

    if (!canvas || !threeRenderer || typeof rctx?.resize !== "function" || typeof rctx?.render !== "function") {
      repliedReqIds.add(reqId);
      repliedReqIds.add(reqId);
      replyToParent({
        type: "premium.capture.result",
        reqId,
        ok: false,
        error: { code: "not_ready" },
      });
      return;
    }

    // base viewport
    const wCss = Math.max(1, Math.floor(canvas.clientWidth || canvas.width || 1));
    const hCss = Math.max(1, Math.floor(canvas.clientHeight || canvas.height || 1));
    const baseDpr = safeNum(threeRenderer.getPixelRatio?.(), safeNum(globalThis.devicePixelRatio, 1));

    const preset = normalizePreset(req?.preset);
    let targetDpr = baseDpr;

    if (typeof preset.scale !== "undefined") {
      targetDpr = clamp(baseDpr * safeNum(preset.scale, 2), 1, 4);
    } else if (typeof preset.maxEdge !== "undefined") {
      // choose dpr to fit maxEdge (best-effort)
      const maxEdge = safeNum(preset.maxEdge, 4096);
      const edge = Math.max(wCss, hCss);
      const scale = clamp(maxEdge / Math.max(1, edge), 1, 4);
      targetDpr = clamp(baseDpr * scale, 1, 4);
    }

    // execute (best-effort)
    const t0 = nowMs();
    try {
      // hi-res resize (same CSS size, higher pixel ratio)
      try { rctx.resize(wCss, hCss, targetDpr); } catch (_e) {}

      // render a frame
      try { rctx.render(core); } catch (_e) {}

      if (isCancelled()) {
        // restore then report cancel (only once)
        try { rctx.resize(wCss, hCss, baseDpr); } catch (_e) {}
        if (!repliedReqIds.has(reqId)) {
          repliedReqIds.add(reqId);
          if (!repliedReqIds.has(reqId)) {
        repliedReqIds.add(reqId);
        replyToParent({ type: "premium.capture.result", reqId, ok: false, error: { code: "cancelled" } });
      }
        }
        return;
      }

      const blob = await canvasToBlob(canvas, "image/png");

      // restore
      try { rctx.resize(wCss, hCss, baseDpr); } catch (_e) {}

      // if cancelled after blob generation, do not emit ok
      if (isCancelled()) {
        if (!repliedReqIds.has(reqId)) {
          repliedReqIds.add(reqId);
          if (!repliedReqIds.has(reqId)) {
        repliedReqIds.add(reqId);
        replyToParent({ type: "premium.capture.result", reqId, ok: false, error: { code: "cancelled" } });
      }
        }
        return;
      }

      if (!blob) {
        replyToParent({
          type: "premium.capture.result",
          reqId,
          ok: false,
          error: { code: "capture_failed" },
        });
        return;
      }

      const dt = nowMs() - t0;
      const outW = Math.round(wCss * targetDpr);
      const outH = Math.round(hCss * targetDpr);

      repliedReqIds.add(reqId);
      repliedReqIds.add(reqId);
      replyToParent({
        type: "premium.capture.result",
        reqId,
        ok: true,
        blob,
        meta: {
          slug: String(req?.slug || ""),
          capturedAt: new Date().toISOString(),
          preset,
          viewport: { wCss, hCss, baseDpr },
          output: { wPx: outW, hPx: outH, dpr: targetDpr },
          perf: { ms: dt },
        },
      });
    } catch (e) {
      try { rctx.resize(wCss, hCss, baseDpr); } catch (_e) {}
      repliedReqIds.add(reqId);
      repliedReqIds.add(reqId);
      replyToParent({
        type: "premium.capture.result",
        reqId,
        ok: false,
        error: { code: "exception", message: String(e?.message || e) },
      });
    }
  }

  return {
    id: "premium.capture.hires",
    mount(ctx) {
      const onMessage = (ev) => {
        const data = ev?.data;
        if (!data || typeof data !== "object") return;

        // cancel (best-effort, but must be deterministic for UI)
        if (data.type === "premium.capture.cancel") {
          const reqId = data.reqId || "";
          if (!reqId) return;

          // record cancellation so runCapture never emits ok after this
          cancelledReqIds.add(reqId);

          // if this cancels the active run, unblock UI immediately (cooldown still applies)
          if (reqId === activeReqId) {
            running = false;
            activeReqId = "";
          }

          // always acknowledge cancel once so the parent can restore UI
          if (!repliedReqIds.has(reqId)) {
            repliedReqIds.add(reqId);
            replyToParent({ type: "premium.capture.result", reqId, ok: false, error: { code: "cancelled" } });
          }
          return;
        }

        if (data.type !== "premium.capture.request") return;

        const reqId = data.reqId || "";
        const now = nowMs();
        const gate = canRun(now);

        if (!gate.ok) {
          replyToParent({
            type: "premium.capture.result",
            reqId,
            ok: false,
            error: { code: gate.code, reason: gate.reason || null },
          });
          return;
        }

        running = true;
        activeReqId = reqId;
        cancelRequested = false;
        lastRunAt = now;
        recent.push(now);

        const thisReqId = reqId;
        runCapture(ctx, data).finally(() => {
          running = false;
          activeReqId = "";
          cancelRequested = false;
          if (thisReqId) {
            cancelledReqIds.delete(thisReqId);
            repliedReqIds.delete(thisReqId);
          }
        });
      };

      try { window.addEventListener("message", onMessage); } catch (_e) {}

      // optional: expose minimal debug info
      try { console.log("[premium] capture addon mounted"); } catch (_e) {}

      return () => {
        try { window.removeEventListener("message", onMessage); } catch (_e) {}
      };
    },
  };
}
