// [3DSD Preview System] Dual Preview + Unified Panel implemented
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Preview3D from './Preview3D.jsx';

function FloatingPreview({
  open,
  data,
  selection,
  onSelect,
  onClose,
  backgroundEnabled,
  showAxes,
  showGrid,
  onBackgroundChange
}) {
  const containerRef = useRef(null);
  const dragStateRef = useRef(null);
  const frameRef = useRef(null);
  const [position, setPosition] = useState({ x: 96, y: 96 });
  const [size, setSize] = useState({ width: 420, height: 320 });
  // TODO: Multi-monitor placement (screen.availWidth/availLeft)

  if (typeof document !== 'undefined' && !containerRef.current) {
    containerRef.current = document.createElement('div');
  }

  useEffect(() => {
    if (!open) return () => {};
    const container = containerRef.current;
    if (!container) return () => {};
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const handleMouseMove = (event) => {
      if (!dragStateRef.current) return;
      const { offsetX, offsetY } = dragStateRef.current;
      setPosition((prev) => ({
        x: Math.max(0, event.clientX - offsetX),
        y: Math.max(0, event.clientY - offsetY)
      }));
    };
    const handleMouseUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) => {
        if (Math.round(prev.width) === Math.round(width) && Math.round(prev.height) === Math.round(height)) {
          return prev;
        }
        return { width, height };
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  const handleHeaderMouseDown = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    dragStateRef.current = {
      offsetX: startX - position.x,
      offsetY: startY - position.y
    };
  };

  const mount = containerRef.current;
  if (!open || !mount) {
    return null;
  }

  return createPortal(
    <div
      ref={frameRef}
      className="fixed z-[60] flex flex-col overflow-hidden rounded-lg border border-white/10 bg-gray-900/95 shadow-2xl backdrop-blur"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        resize: 'both'
      }}
    >
      <div
        className="flex cursor-move items-center justify-between border-b border-white/10 bg-gray-800/90 px-3 py-2 text-xs uppercase tracking-wide text-gray-200"
        onMouseDown={handleHeaderMouseDown}
      >
        <span>Floating Preview</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">drag to move</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-700/80 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-gray-100 transition hover:bg-gray-600/80"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-black">
        <Preview3D
          data={data}
          selection={selection}
          onSelect={onSelect}
          limitedControls={false}
          className="h-full"
          enableFullPreview={false}
          onBackgroundChange={onBackgroundChange}
          showOverlayControls={false}
          backgroundEnabled={backgroundEnabled}
          showAxes={showAxes}
          showGrid={showGrid}
        />
      </div>
    </div>,
    mount
  );
}

export default FloatingPreview;
