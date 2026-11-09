// Existing controls keep their event handlers when moved between the desktop
// layout and the phone's sheet. The canvas always stays in the same container.
export function attachMobileReading({ getController, canRetryUrl = false }) {
  const byId = id => document.getElementById(id);
  const viewport = matchMedia('(max-width: 650px), (max-width: 960px) and (max-height: 550px) and (pointer: coarse)');
  const sheet = byId('reading-sheet');
  const panels = {find: '探す', menu: 'メニュー', info: '作品情報'};
  const slots = [
    ['reading-header', 'menu'], ['contract-status', 'menu'],
    ['reading-tools', 'menu'], ['reading-find', 'find'], ['contract-info', 'info'],
  ].map(([id, panel]) => {
    const element = byId(id);
    const marker = document.createComment(id);
    element.before(marker);
    return { element, marker, destination: byId('reading-sheet-' + panel) };
  });
  const buttons = new Map([
    [byId('reading-tab-find'), 'find'], [byId('reading-tab-menu'), 'menu'],
    [byId('reading-mobile-notice'), 'info'],
  ]);
  const scroll = byId('reading-sheet-scroll');
  const offsets = new Map();
  let previousEntry = null;
  let active = 'diagram';
  let trigger = null;
  let ready = false;
  let isBusy = false;
  let error = '';

  function show(name, { returnFocus = true, opener = null } = {}) {
    if (!viewport.matches || document.body.classList.contains('reading-peek')) return false;
    if (name !== 'diagram') {
      document.dispatchEvent(new Event('reading-panel-open'));
      trigger = opener || document.activeElement;
    }
    if (!sheet.hidden) offsets.set(active, scroll.scrollTop);
    active = name;
    document.body.dataset.readingPanel = name;
    sheet.hidden = name === 'diagram';
    for (const key of Object.keys(panels)) byId('reading-sheet-' + key).hidden = key !== name;
    for (const [button, panel] of buttons) button.setAttribute('aria-expanded', String(panel === name));
    if (sheet.hidden) {
      if (returnFocus) (trigger?.isConnected && trigger.offsetWidth ? trigger : byId('viewer-canvas')).focus({preventScroll: true});
      trigger = null;
    } else {
      byId('reading-sheet-title').textContent = panels[name];
      scroll.scrollTop = offsets.get(name) || 0;
      if (name === 'find') byId('reading-results').open = true;
      // Keep the keyboard closed until the reader explicitly taps the field.
      scroll.focus({preventScroll: true});
    }
    return true;
  }
  function fitVisibleViewport() {
    // Some mobile browsers resize only the visual viewport for their keyboard.
    const visible = window.visualViewport;
    if (!visible || !viewport.matches || visible.scale !== 1) {
      sheet.style.removeProperty('--reading-keyboard-inset');
      sheet.style.removeProperty('--reading-sheet-height');
      return;
    }
    const inset = Math.max(0, document.documentElement.clientHeight - visible.offsetTop - visible.height);
    sheet.style.setProperty('--reading-keyboard-inset', inset + 'px');
    sheet.style.setProperty('--reading-sheet-height', Math.round(visible.height * .46) + 'px');
  }
  function updateViewport() {
    const compact = viewport.matches;
    active = 'diagram';
    trigger = null;
    sheet.hidden = true;
    document.body.classList.toggle('is-compact', compact);
    if (compact) document.body.dataset.readingPanel = active;
    else delete document.body.dataset.readingPanel;
    for (const { element, marker, destination } of slots) {
      if (compact) destination.append(element);
      else marker.after(element);
    }
    for (const button of buttons.keys()) button.setAttribute('aria-expanded', 'false');
    byId('reading-tools').open = true;
    renderPrompt();
    fitVisibleViewport();
    window.dispatchEvent(new Event('resize'));
  }

  function renderPrompt() {
    const displayError = Boolean(error);
    const empty = !ready;
    byId('reading-mobile-prompt').hidden = !(empty || displayError);
    byId('reading-prompt-title').textContent = displayError ? '操作の確認' : '3DSL Viewer';
    byId('reading-prompt-message').textContent = displayError ? error : (isBusy ? byId('contract-status').textContent : '');
    byId('reading-prompt-open').textContent = displayError ? '開き直す' : '作品を開く';
    byId('reading-prompt-open').disabled = byId('contract-open').disabled;
    byId('reading-prompt-dismiss').hidden = !ready || !displayError;
    const help = byId('reading-prompt-help');
    if (help) help.hidden = !displayError;
    const returnLink = byId('reading-prompt-return');
    if (returnLink) returnLink.hidden = !displayError || !returnLink.getAttribute('href');
    const retry = byId('reading-prompt-retry');
    // A page reload can retry an initial URL, but must not replace a retained
    // local work or a one-time Modeler handoff under the label of retrying.
    if (retry) retry.hidden = !displayError || !canRetryUrl || Boolean(getController()?.getModel?.());
    byId('reading-tab-find').hidden = empty;
    document.body.classList.toggle('reading-error', displayError);
  }
  function render({ state, model, index, entry, busy }) {
    if (entry?.id !== previousEntry) {
      offsets.delete('info');
      if (active === 'info') scroll.scrollTop = 0;
      previousEntry = entry?.id;
    }
    ready = Boolean(model && state.renderAvailable);
    isBusy = busy;
    byId('viewer-root').inert = busy;
    byId('reading-tab-find').disabled = busy || !ready;
    const notes = model?.warnings?.length || 0;
    const notice = byId('reading-mobile-notice');
    notice.hidden = !notes;
    notice.textContent = '⚠ ' + notes;
    notice.setAttribute('aria-label', '読み取りの注意 ' + notes + '件');
    if (model?.meaning?.unresolvedRelations?.length) notice.textContent = '未描画 ' + model.meaning.unresolvedRelations.length;
    byId('reading-selection-back').hidden = !state.historyDepth;
    const neighbors = entry && index.neighbors(entry.id);
    byId('reading-selection-links').hidden = !neighbors?.some(edge => !edge.missing && index.get(edge.toId));
    byId('reading-selection').hidden = !entry && !(viewport.matches && state.historyDepth);
    byId('reading-selection-label').textContent = entry?.label || '';
    renderPrompt();
  }
  function showInfo(opener) {
    if (show('info', {opener})) return true;
    getController().setInfoOpen(true);
    return false;
  }
  byId('reading-tab-find').addEventListener('click', e => show(active === 'find' ? 'diagram' : 'find', {opener:e.currentTarget}));
  byId('reading-tab-menu').addEventListener('click', e => show(active === 'menu' ? 'diagram' : 'menu', {opener:e.currentTarget}));
  byId('reading-mobile-notice').addEventListener('click', e => {
    showInfo(e.currentTarget);
    byId('reading-capabilities')?.scrollIntoView({block:'start'});
  });
  byId('reading-selection-links').addEventListener('click', e => {
    showInfo(e.currentTarget);
    byId('reading-connections')?.scrollIntoView({block:'start'});
  });
  byId('reading-sheet-close').addEventListener('click', () => show('diagram'));
  byId('reading-prompt-open').addEventListener('click', () => byId('contract-open').click());
  byId('reading-prompt-retry')?.addEventListener('click', () => location.reload());
  byId('reading-prompt-dismiss').addEventListener('click', () => { error = ''; renderPrompt(); });
  function onKey(e) {
    if (viewport.matches && active !== 'diagram' && e.key === 'Escape' && !e.isComposing) {
      e.preventDefault(); show('diagram');
    }
  }
  function onGizmo() { if (active !== 'diagram') show('diagram', {returnFocus:false}); }
  window.addEventListener('keydown', onKey);
  document.addEventListener('reading-gizmo-open', onGizmo);
  viewport.addEventListener('change', updateViewport);
  window.visualViewport?.addEventListener('resize', fitVisibleViewport);
  window.visualViewport?.addEventListener('scroll', fitVisibleViewport);
  updateViewport();
  return {
    show, showInfo, render, refresh:renderPrompt,
    get compact() { return viewport.matches; },
    get panel() { return active; },
    reportFailure(message) { error = String(message || '作品を開き直してください。'); renderPrompt(); },
    clearFailure() { error = ''; renderPrompt(); },
    dispose() {
      viewport.removeEventListener('change', updateViewport);
      window.visualViewport?.removeEventListener('resize', fitVisibleViewport);
      window.visualViewport?.removeEventListener('scroll', fitVisibleViewport);
      document.removeEventListener('reading-gizmo-open', onGizmo);
      window.removeEventListener('keydown', onKey);
    },
  };
}
