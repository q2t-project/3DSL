import { useEffect, useRef } from 'react';

// [3DSD Floating Preview] reimplemented as pseudo-front movable window
// TODO: sync floatingScene ↔ mainScene (postMessage / BroadcastChannel)
// TODO: persist last window position/size across sessions

function FloatingPreviewFrame({ container, children, onClose, title = 'Floating Preview' }) {
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!container) return () => {};

    const updateCursor = (next) => {
      if (!container) return;
      container.style.cursor = next ?? '';
    };

    const handlePointerMove = (event) => {
      if (!draggingRef.current || !container) return;
      const nextX = event.clientX - offsetRef.current.x;
      const nextY = event.clientY - offsetRef.current.y;
      container.style.left = `${nextX}px`;
      container.style.top = `${nextY}px`;
    };

    const handlePointerUp = () => {
      draggingRef.current = false;
      updateCursor('');
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
    };
  }, [container]);

  useEffect(() => {
    if (!container) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [container, onClose]);

  if (!container) return null;

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const rect = container.getBoundingClientRect();
    draggingRef.current = true;
    offsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    container.style.cursor = 'grabbing';
    event.preventDefault();
  };

  const handleClose = (event) => {
    event.stopPropagation();
    onClose?.();
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="flex cursor-grab select-none items-center justify-between border-b border-white/10 bg-gray-900/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-200"
        onPointerDown={handlePointerDown}
      >
        <span className="pr-2 text-gray-100">{title}</span>
        <button
          type="button"
          onClick={handleClose}
          onPointerDown={(event) => event.stopPropagation()}
          className="cursor-pointer rounded border border-white/10 bg-gray-800 px-2 py-0.5 text-xs font-bold text-gray-200 transition hover:border-white/30 hover:bg-gray-700"
        >
          ×
        </button>
      </div>
      <div className="relative flex flex-1 overflow-hidden bg-black">{children}</div>
    </div>
  );
}

export default FloatingPreviewFrame;

