// viewer/ui/orbitHint.js

const STORAGE_KEY = 'viewerOrbitHintDismissed';

function readStorage(win) {
  try {
    return win?.localStorage?.getItem?.(STORAGE_KEY) === '1';
  } catch (_e) {
    return false;
  }
}

function writeStorage(win, value) {
  try {
    win?.localStorage?.setItem?.(STORAGE_KEY, value ? '1' : '0');
  } catch (_e) {}
}

function getHintLines(win) {
  const isCoarse = !!win?.matchMedia?.('(pointer: coarse)')?.matches;
  if (isCoarse) {
    return [
      'ドラッグ：カメラ回転（対象固定）',
      'ピンチ：ズーム / 2本指ドラッグ：パン',
    ];
  }
  return [
    'ドラッグ：カメラ回転（対象固定）',
    'ホイール：ズーム / 右ドラッグ：パン',
  ];
}

export function attachOrbitHint(opts = {}) {
  const { doc, win, el } = opts;
  if (!doc || !win || typeof el !== 'function') return null;

  const root = el('orbitHint');
  if (!root) return null;

  const textEl = root.querySelector('[data-role="orbit-hint-text"]') || root;
  const closeBtn = root.querySelector('[data-role="orbit-hint-close"]');

  const setVisible = (visible) => {
    root.classList.toggle('orbit-hint-hidden', !visible);
    root.setAttribute('aria-hidden', visible ? 'false' : 'true');
  };

  const setLines = () => {
    const lines = getHintLines(win);
    if (textEl) textEl.textContent = lines.join('\n');
  };

  setLines();
  setVisible(!readStorage(win));

  const onClose = (ev) => {
    ev?.preventDefault?.();
    writeStorage(win, true);
    setVisible(false);
  };

  closeBtn?.addEventListener?.('click', onClose);

  const mql = win.matchMedia?.('(pointer: coarse)');
  const onEnvChange = () => setLines();
  mql?.addEventListener?.('change', onEnvChange);
  win.addEventListener?.('resize', onEnvChange);

  return {
    detach() {
      closeBtn?.removeEventListener?.('click', onClose);
      mql?.removeEventListener?.('change', onEnvChange);
      win.removeEventListener?.('resize', onEnvChange);
    },
  };
}
