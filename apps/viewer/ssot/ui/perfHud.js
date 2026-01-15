// viewer/ui/perfHud.js

function formatNumber(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toFixed(digits);
}

export function attachPerfHud(hubFacade, opts = {}) {
  const { doc, win, el, rafLoop } = opts;
  if (!hubFacade || !doc || !win || typeof el !== 'function' || typeof rafLoop !== 'function') {
    return null;
  }

  const root = el('perfHud');
  if (!root) return null;

  let lastText = null;

  const setText = (text) => {
    if (text === lastText) return;
    lastText = text;
    root.textContent = text;
  };

  const update = () => {
    // runtime の取り方は環境差を吸収（どっちでも来い）
    const runtime = hubFacade.getRuntime?.() || hubFacade.getUiState?.()?.runtime || null;
    const m = runtime?.debugMetrics || null;

    if (!m) {
      // debugMetrics 無いなら “空” にして CSS の #perf-hud:empty を効かせる
      root.setAttribute('aria-hidden', 'true');
      setText('');
      return;
    }

    root.setAttribute('aria-hidden', 'false');

    const fps = formatNumber(m.fps, 1);
    const frameMs = formatNumber(m.frameMs, 1);

    const labelLine = `labels: ${m.labelVisible ?? '-'} / ${m.labelCount ?? '-'}`;
    const labelUpdates = `updates: ${m.labelUpdates ?? '-'} rebuilds: ${m.labelTextRebuilds ?? '-'}`;
    const cullLine =
      `cull(d/s/f): ${m.labelCulledDistance ?? '-'} / ${m.labelCulledScreen ?? '-'} / ${m.labelCulledFrustum ?? '-'}`;
    const renderLine =
      `calls: ${m.calls ?? '-'} tris: ${m.triangles ?? '-'} geo: ${m.geometries ?? '-'} tex: ${m.textures ?? '-'}`;

    setText(
      [
        `FPS: ${fps} (${frameMs} ms)`,
        `${labelLine} | ${labelUpdates}`,
        cullLine,
        renderLine,
      ].join('\n')
    );
  };

  rafLoop(update);

  return {
    detach() {
      root.setAttribute('aria-hidden', 'true');
      lastText = null;
      root.textContent = '';
    },
  };
}
