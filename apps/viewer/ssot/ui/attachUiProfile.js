// viewer/ui/attachUiProfile.js
import { PointerInput } from './pointerInput.js';
import { KeyboardInput } from './keyboardInput.js';
import { attachGizmo } from './gizmo.js';
import { createPicker } from './picker.js';
import { createTimeline } from './timeline.js';
import { assertDomContract, validateDomContract, getRoleEl } from './domContract.js';
import { createHubFacade } from './hubFacade.js';

const DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  !!import.meta.env.DEV;

const _handles = new WeakMap();

const NEED_KEYBOARD = (p) => p === 'devHarness_full' || p === 'prod_full';
const NEED_PICKER = (p) => p === 'devHarness_full' || p === 'prod_full';
const NEED_TIMELINE = (p) => p === 'devHarness_full' || p === 'prod_full';
const NEED_GIZMO = (_p) => true; // 最小/フル問わず表示したいなら true 固定でOK
const NEED_CONTROLS = (p) => p === 'devHarness_full' || p === 'prod_full';


export function attachUiProfile(hub, opts) {
  if (!hub) throw new Error('[ui] attachUiProfile: hub required');
  if (!opts || typeof opts !== 'object') throw new Error('[ui] attachUiProfile: opts required');

  const hf = createHubFacade(hub);

  const existing = _handles.get(hub);
  if (existing && !opts.force) return existing;
  if (existing && opts.force) {
    try {
      existing.detach();
    } catch (_e) {}
    _handles.delete(hub);
  }

  const {
    profile,
    canvas,
    win,
    doc,
    debug = false,
    toast: toastOpt = null,
    log: logOpt = null,
  } = opts;

  // devビルド以外では debug を無効化する（事故防止）
  const DEBUG = DEV && !!debug;

  // 必須 opts を先に確定（contract 以前）
  if (!profile) throw new Error('[ui] attachUiProfile: profile required');
  if (!canvas) throw new Error('[ui] attachUiProfile: canvas required');
  if (!win) throw new Error('[ui] attachUiProfile: win required');
  if (!doc) throw new Error('[ui] attachUiProfile: doc required');

  // role getter（data-role優先 / id fallback）
  const el = (roleName) => getRoleEl(roleName, doc);

  // ------------------------------------------------------------
  // DOM contract（profile 別の必須DOMをここで確定）
  // - prod_full は「フレーム＋フィルタ必須」で固定
  // - 不足している場合は起動を停止する（不完全な状態で動作させない）
  // ------------------------------------------------------------
  const report = validateDomContract(profile, doc);
  if (!report.ok) console.warn('[ui][contract]', report);
  assertDomContract(profile, doc); // strict profile は missing required で即死

  if (DEBUG) console.log('[ui] attachUiProfile profile =', profile);

  const cleanup = [];
  const add = (fn) => {
    if (typeof fn === 'function') cleanup.push(fn);
  };

  const on = (el, type, fn, opt) => {
    if (!el?.addEventListener) return;
    el.addEventListener(type, fn, opt);
    add(() => {
      try {
        el.removeEventListener(type, fn, opt);
      } catch (_e) {}
    });
  };

  const rafLoop = (fn) => {
    let alive = true;
    let id = 0;
    const step = () => {
      if (!alive) return;
      fn();
      id = win.requestAnimationFrame(step);
    };
    id = win.requestAnimationFrame(step);
    add(() => {
      alive = false;
      try {
        win.cancelAnimationFrame(id);
      } catch (_e) {}
    });
  };

  const log = (...a) => {
    try {
      logOpt?.(...a);
    } catch (_e) {}
  };

  const toast = (text, o) => {
    if (toastOpt) {
      try {
        toastOpt(text, o);
      } catch (_e) {}
      return;
    }
    // fallback（devHarness だけ許可。prodで HUD を破壊しない）
    if (!DEBUG && profile !== 'devHarness_full') return;
    const hudEl = el('hudToast');
    if (!hudEl) return;
    hudEl.textContent = String(text ?? '');
  };

  let detached = false;
  const handle = {
    profile,
    pointerInput: null,
    keyboardInput: null,
    picker: null,
    timeline: null,
    gizmoWrapper: null, // ★ wrapperのみ保持（所有者はDOM側）
    detach,
    dispose: detach,
  };

  // -----------------------------
  // inputs
  // -----------------------------
  {
    handle.pointerInput = new PointerInput(canvas, hub);
    add(() => {
      try {
        handle.pointerInput?.dispose?.();
      } catch (_e) {}
    });

    if (NEED_KEYBOARD(profile)) {
      handle.keyboardInput = new KeyboardInput(win, hub);
      add(() => {
        try {
          handle.keyboardInput?.dispose?.();
        } catch (_e) {}
      });
    }

    if (NEED_PICKER(profile)) {
      handle.picker = createPicker(hub, { debug: DEBUG });
      handle.picker.attach(canvas);
      add(() => {
        try {
          handle.picker?.detach?.();
        } catch (_e) {}
      });
    }
  }

  // -----------------------------
  // gizmo view
  // -----------------------------
  if (NEED_GIZMO(profile)) {
    // contract の gizmoSlot を差し込み先にする
    const gw = el('gizmoSlot');
    if (!gw) {
      console.warn('[ui] gizmoSlot not found');
    } else {
      handle.gizmoWrapper = gw;

      const gh = attachGizmo(gw, hub, { doc, win, el, debug: DEBUG, log });
      if (!gh && DEBUG) log('[ui] attachGizmo: returned null/undefined');

      // ★ cleanup は wrapper 経由が正規ルート（要件(2)）
      add(() => {
        try {
          const h = gw.__gizmoHandle;
          if (h?.detach) h.detach();
          else if (h?.dispose) h.dispose();
          else if (gh?.detach) gh.detach();
          else gh?.dispose?.();
        } catch (_e) {}
      });
    }
  }

  // -----------------------------
  // timeline
  // -----------------------------
  if (NEED_TIMELINE(profile)) {
    handle.timeline = createTimeline(hub, { debug: DEBUG, toast: (text, o) => toast(text, o) });
    handle.timeline.attach({ doc, win, el });
    add(() => {
      try {
        handle.timeline?.detach?.();
      } catch (_e) {}
    });
  }

  // -----------------------------
  // full controls（ここで全部 bind）
  // -----------------------------
  if (NEED_CONTROLS(profile)) {
    // UI は hub の公開 API を優先（core 直叩きは最後の保険）
    const vs = hub?.viewerSettings || null;
    const filtersApi = hf?.getFilters?.() || null;
    // filter
    if (filtersApi) {
      const f = filtersApi;
      const btnLines = el('filterLines');
      const btnPoints = el('filterPoints');
      const btnAux = el('filterAux');

      const setBtn = (btn, enabled) => {
        if (!btn) return;
        btn.classList.toggle('filter-on', !!enabled);
        btn.classList.toggle('filter-off', !enabled);
      };

      // Committed state (frame-boundary). Prefer uiState.filters.types, then f.get().
      const readCommitted = () => {
        const st = hf?.getUiState?.() ?? null;
        const types = st?.filters?.types && typeof st.filters.types === 'object' ? st.filters.types : null;
        if (types) {
          return {
            lines: types.lines !== false,
            points: types.points !== false,
            aux: types.aux !== false,
          };
        }

        const s = f.get?.() || {};
        const t = s?.types && typeof s.types === 'object' ? s.types : s;
        return {
          lines: t.lines !== false,
          points: t.points !== false,
          aux: t.aux !== false,
        };
      };

      // Pending (optimistic) state to avoid 1-click lag and rapid-click mismatch.
      const pending = { lines: null, points: null, aux: null };

      const effective = () => {
        const c = readCommitted();
        return {
          lines: pending.lines ?? c.lines,
          points: pending.points ?? c.points,
          aux: pending.aux ?? c.aux,
        };
      };

      let lastKey = null;
      const sync = () => {
        const committed = readCommitted();
        // clear pending when committed catches up
        for (const k of ['lines', 'points', 'aux']) {
          if (pending[k] != null && pending[k] === committed[k]) pending[k] = null;
        }

        const v = effective();
        const key = `${v.lines ? 1 : 0}${v.points ? 1 : 0}${v.aux ? 1 : 0}`;
        if (key === lastKey) return;
        lastKey = key;
        setBtn(btnLines, v.lines);
        setBtn(btnPoints, v.points);
        setBtn(btnAux, v.aux);
      };

      const toggleKind = (kind, btn) => {
        if (!btn) return;
        const v = effective();
        const cur = !!v[kind];
        const next = !cur;
        pending[kind] = next;
        f.setTypeEnabled?.(kind, next);
        setBtn(btn, next);
        lastKey = null;
      };

      on(btnLines, 'click', () => toggleKind('lines', btnLines));
      on(btnPoints, 'click', () => toggleKind('points', btnPoints));
      on(btnAux, 'click', () => toggleKind('aux', btnAux));

      sync();
      rafLoop(sync);
    }

    // viewerSettings: lineWidthMode / microProfile
    // 公開側(hub.viewerSettings)にあればそれを使う。無ければ core 側にフォールバック。
    {
      const elLineMode = el('vsLineWidthMode');
      const elMicro = el('vsMicroProfile');
      const vsLine = vs && typeof vs.setLineWidthMode === 'function' ? vs : null;
      const vsMicro = vs && typeof vs.setMicroFXProfile === 'function' ? vs : null;

      if (elLineMode && vsLine && typeof vsLine.setLineWidthMode === 'function') {
        try {
          const v = vsLine.getLineWidthMode?.();
          if (typeof v === 'string' && v) elLineMode.value = v;
        } catch (_e) {}

        const unsub = vsLine.onLineWidthModeChanged?.((m) => {
          try {
            elLineMode.value = m;
          } catch (_e) {}
        });
        if (typeof unsub === 'function') add(unsub);

        on(elLineMode, 'change', () => {
          vsLine.setLineWidthMode(elLineMode.value);
          toast(`Line width: ${elLineMode.value}`, { duration: 700, level: 'info' });
        });
      }

      if (elMicro && vsMicro && typeof vsMicro.setMicroFXProfile === 'function') {
        try {
          const v = vsMicro.getMicroFXProfile?.();
          if (typeof v === 'string' && v) elMicro.value = v;
        } catch (_e) {}

        const unsub = vsMicro.onMicroFXProfileChanged?.((p) => {
          try {
            elMicro.value = p;
          } catch (_e) {}
        });
        if (typeof unsub === 'function') add(unsub);

        on(elMicro, 'change', () => {
          vsMicro.setMicroFXProfile(elMicro.value);
          toast(`micro FX: ${elMicro.value}`, { duration: 700, level: 'info' });
        });
      }
    }

    // ------------------------------------------------------------
    // meta panels / document caption（read-only）
    // - devHarness_full は meta* 必須（contract で保証）
    // - prod_full は optional（あれば更新、無ければ何もしない）
    // ------------------------------------------------------------
    {
      const elMetaFile = el('metaFile');
      const elMetaModel = el('metaModel');
      const elMetaModelLog = el('metaModelLog'); // 原則触らん（衝突回避）

      const elCapTitle = el('docCaptionTitle');
      const elCapBody = el('docCaptionBody');

      // meta-file の本文用コンテナ（h3残すために内側だけ更新）
      const ensureBodySlot = (root, key) => {
        if (!root) return null;
        let slot = root.querySelector(`[data-role="${key}"]`);
        if (!slot) {
          slot = doc.createElement('div');
          slot.dataset.role = key;
          // h3 があればその後ろに差す
          const h3 = root.querySelector('h3');
          if (h3 && h3.parentNode === root) root.insertBefore(slot, h3.nextSibling);
          else root.appendChild(slot);
        }
        return slot;
      };

      const fileBody = ensureBodySlot(elMetaFile, 'meta-file-body');
      const modelBody = ensureBodySlot(elMetaModel, 'meta-model-body');

      let lastCapKey = null;
      let lastFileKey = null;
      let lastModelKey = null;

      rafLoop(() => {
        const c = hf;
        if (!c) return;

        // ---- caption ----
        {
          const cap = c.getDocumentCaption?.() || c.getSceneMeta?.() || null;
          const t = String(cap?.title ?? '');
          const b = String(cap?.body ?? cap?.summary ?? '');
          const key = `${t}\n${b}`;
          if (key !== lastCapKey) {
            lastCapKey = key;
            if (elCapTitle) elCapTitle.textContent = t;
            if (elCapBody) elCapBody.textContent = b;
          }
        }

        const st = c.getUiState?.()?.runtime?.status ?? null;
        if (!st) return;

        const req = st.requested ?? {};
        const eff = st.effective ?? {};
        const micro = st.micro ?? {};
        const frame = st.frame ?? {};
        const vis = st.visibility ?? {};

        // ---- file panel ----
        if (fileBody) {
          const modelUrl = String(req.modelUrl ?? req.model ?? eff.modelUrl ?? '');
          const schema = String(eff.schemaUri ?? eff.schema ?? '');
          const key = `${modelUrl}|${schema}`;
          if (key !== lastFileKey) {
            lastFileKey = key;

            fileBody.innerHTML = '';
            const a = doc.createElement('div');
            a.className = 'text-xs text-neutral-300';
            a.textContent = modelUrl ? `model: ${modelUrl}` : '(no file yet)';

            const b = doc.createElement('div');
            b.className = 'text-xs text-neutral-400 mt-1';
            b.textContent = schema ? `schema: ${schema}` : '';

            fileBody.appendChild(a);
            if (schema) fileBody.appendChild(b);
          }
        }

        // ---- model panel summary（logとは別枠） ----
        if (modelBody) {
          const effMode = String(eff.mode ?? '');
          const reqMode = String(req.mode ?? '');
          const blocked = String(micro.blockedBy ?? '');
          const fcur = frame.current ?? frame.frame_id ?? frame.id ?? null;
          const fmin = frame.min ?? frame.range?.min ?? null;
          const fmax = frame.max ?? frame.range?.max ?? null;

          const key =
            `${effMode}|${reqMode}|${blocked}|${micro.focusUuid ?? ''}|${micro.focusKind ?? ''}|` +
            `${fcur}|${fmin}|${fmax}|${vis.lines ?? ''}|${vis.points ?? ''}|${vis.aux ?? ''}`;

          if (key !== lastModelKey) {
            lastModelKey = key;

            const lines = [];
            if (effMode)
              lines.push(
                `mode: ${effMode}${reqMode && reqMode !== effMode ? ` (req ${reqMode})` : ''}`
              );
            if (blocked && effMode !== 'micro') lines.push(`micro blockedBy: ${blocked}`);
            if (micro.focusUuid) lines.push(`focus: ${micro.focusKind ?? '?'} ${micro.focusUuid}`);
            if (fcur != null) {
              const r = fmin != null && fmax != null ? ` [${fmin}, ${fmax}]` : '';
              lines.push(`frame: ${fcur}${r}`);
            }
            if (vis && (vis.lines != null || vis.points != null || vis.aux != null)) {
              lines.push(
                `visible: lines=${vis.lines ?? '?'} points=${vis.points ?? '?'} aux=${vis.aux ?? '?'}`
              );
            }

            modelBody.innerHTML = '';
            const pre = doc.createElement('div');
            pre.className = 'text-xs text-neutral-300 whitespace-pre-wrap';
            pre.textContent = lines.join('\n') || '';
            modelBody.appendChild(pre);

            // prod 側でログ枠をここに使いたいなら、UIが触ってもええが
            // まずは衝突避けるため devHarness 以外でも触らんのが安全。
            // elMetaModelLog は devHarness が append する想定があるので UI は触らん
          }
        }
      });
    }

    // world axes toggle（公開API固定）
    if (vs && typeof vs.toggleWorldAxes === 'function') {
      const btn = el('worldAxesToggle');
      if (btn) {
        const update = (v) => {
          const onv = !!v;
          btn.dataset.visible = onv ? 'true' : 'false';
          btn.setAttribute('aria-pressed', onv ? 'true' : 'false');
        };

        try {
          update(!!vs.getWorldAxesVisible?.());
        } catch (_e) {}

        const unsub = vs.onWorldAxesChanged?.((v) => update(v));
        if (typeof unsub === 'function') add(unsub);

        on(btn, 'click', (ev) => {
          ev.preventDefault?.();
          vs.toggleWorldAxes();
          if (
            typeof vs.onWorldAxesChanged !== 'function' &&
            typeof vs.getWorldAxesVisible === 'function'
          ) {
            try {
              update(!!vs.getWorldAxesVisible());
            } catch (_e) {}
          }
        });
      }
    }
  }

  _handles.set(hub, handle);
  return handle;

  function detach() {
    if (detached) return; // ★ idempotent
    detached = true;
    for (let i = cleanup.length - 1; i >= 0; i--) {
      try {
        cleanup[i]();
      } catch (_e) {}
    }
    cleanup.length = 0;

    handle.pointerInput = null;
    handle.keyboardInput = null;
    handle.picker = null;
    handle.timeline = null;
    handle.gizmoWrapper = null;

    _handles.delete(hub);
  }
}

// dev only
if (DEV && typeof window !== 'undefined') {
  window.__dom = window.__dom || {};
  window.__dom.validateDomContract = validateDomContract;
  window.__dom.assertDomContract = assertDomContract;
}
