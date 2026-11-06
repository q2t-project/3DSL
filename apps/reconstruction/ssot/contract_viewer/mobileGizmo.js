// The touch target overlays only the compact compass. The first tap never
// reaches the camera's pointer handler, which stays attached to its own canvas.
export function attachMobileGizmo() {
  const dock = document.getElementById('viewer-rightdock');
  const modelCanvas = document.getElementById('viewer-canvas');
  const frame = document.getElementById('gizmo-wrapper');
  const open = document.createElement('button');
  open.type = 'button';
  open.id = 'mobile-gizmo-open';
  open.setAttribute('aria-label', '三軸の向き・視点操作を開く');
  open.setAttribute('aria-expanded', 'false');
  open.setAttribute('aria-controls', 'mobile-gizmo-controls');

  const compass = document.createElement('canvas');
  compass.dataset.role = 'compact-gizmo-axes';
  compass.width = compass.height = 112;
  compass.setAttribute('aria-hidden', 'true');
  open.append(compass);
  frame.append(open);

  const controls = document.createElement('div');
  controls.id = 'mobile-gizmo-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '視点操作');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '閉じる';
  controls.append(close);
  dock.append(controls);

  // Move the existing controls, including their handlers and live values,
  // between desktop and mobile. Put them back in their exact original order.
  const fields = [
    document.getElementById('reading-camera-home'),
    document.getElementById('reading-preset'),
    document.getElementById('reading-auto-orbit').closest('label'),
  ].map(node => {
    const slot = document.createComment('camera control');
    node.before(slot);
    return { node, slot };
  });

  let expanded = false;
  function setExpanded(value, restoreFocus = false) {
    if (expanded === value) return;
    expanded = value;
    if (value) document.dispatchEvent(new Event('reading-gizmo-open'));
    dock.toggleAttribute('data-gizmo-expanded', value);
    open.setAttribute('aria-expanded', String(value));
    for (const { node, slot } of fields) {
      if (value) controls.insertBefore(node, close);
      else slot.after(node);
    }
    if (value) close.focus({ preventScroll: true });
    else if (restoreFocus) open.focus({ preventScroll: true });
  }

  // Let the canvas own the entire gesture, including its first drag or pinch.
  // The canceled down tells the picker to skip selection for this gesture.
  function outside(event) {
    if (!expanded || dock.contains(event.target)) return;
    if (event.cancelable) event.preventDefault();
    if (event.type === 'pointerdown' && event.target === modelCanvas) {
      setExpanded(false);
      return;
    }
    // Other controls consume the dismissing tap without activating the control.
    event.stopImmediatePropagation();
    if (event.type === 'click') setExpanded(false, true);
  }

  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const capture = { ...options, capture: true, passive: false };
  open.addEventListener('click', () => setExpanded(true), options);
  close.addEventListener('click', () => setExpanded(false, true), options);
  for (const type of ['pointerdown', 'pointerup', 'click']) {
    window.addEventListener(type, outside, capture);
  }
  window.addEventListener('keydown', event => {
    if (expanded && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setExpanded(false, true);
    }
  }, capture);
  dock.addEventListener('focusout', event => {
    if (expanded && event.relatedTarget && !dock.contains(event.relatedTarget)) setExpanded(false);
  }, options);
  document.addEventListener('reading-panel-open', () => setExpanded(false), options);
  const layoutObserver = new MutationObserver(() => {
    if (!document.body.classList.contains('is-compact')) setExpanded(false);
  });
  layoutObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  return {
    dispose() {
      listeners.abort();
      layoutObserver.disconnect();
      setExpanded(false);
      for (const { slot } of fields) slot.remove();
      controls.remove();
      open.remove();
    }
  };
}
