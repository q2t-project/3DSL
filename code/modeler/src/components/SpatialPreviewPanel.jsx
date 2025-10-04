// [3DSD Preview System] Dual Preview + Unified Panel implemented
import { useCallback, useRef, useState } from 'react';
import FloatingPreview from './FloatingPreview.jsx';
import Preview3D from './Preview3D.jsx';

function SpatialPreviewPanel({
  data,
  selection,
  onSelect,
  onInlineSceneReady,
  onBackgroundChange
}) {
  const previewRef = useRef(null);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [popoutOpen, setPopoutOpen] = useState(false);
  const [backgroundEnabled, setBackgroundEnabled] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  const backgroundColor = data?.background ?? '#000000';

  const buttonClasses = useCallback(
    (active) =>
      [
        'rounded border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition',
        active
          ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
          : 'border-[#444] bg-[#333] text-gray-300 hover:border-gray-400 hover:text-gray-100'
      ].join(' '),
    []
  );

  const subtleButtonClasses = useCallback(
    (active) =>
      [
        'rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition',
        active
          ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
          : 'border-[#444] bg-[#2a2a2a] text-gray-300 hover:border-gray-400 hover:text-gray-100'
      ].join(' '),
    []
  );

  const handleFit = useCallback(() => {
    previewRef.current?.fitView?.();
  }, []);

  const handleReset = useCallback(() => {
    previewRef.current?.resetView?.();
  }, []);

  const handlePopout = useCallback(() => {
    previewRef.current?.openPopup?.();
  }, []);

  const handlePopupStateChange = useCallback((isOpen) => {
    setPopoutOpen(Boolean(isOpen));
  }, []);

  // TODO: Sync mainScene ↔ floating/popout via postMessage or BroadcastChannel
  // TODO: Unify UI tokens with ValidationPanel (theme consistency)

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-[#444] bg-[#222] text-xs text-gray-200">
      <div className="border-b border-[#444] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-300">
        Spatial Preview
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClasses(true)} aria-pressed="true">
              Inline Preview
            </button>
            <button
              type="button"
              className={buttonClasses(floatingOpen)}
              aria-pressed={floatingOpen}
              onClick={() => setFloatingOpen((prev) => !prev)}
            >
              Floating
            </button>
            <button
              type="button"
              className={buttonClasses(popoutOpen)}
              aria-pressed={popoutOpen}
              onClick={handlePopout}
            >
              Pop-out
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#444] bg-black/80">
            <div className="h-48">
              <Preview3D
                ref={previewRef}
                data={data}
                selection={selection}
                onSelect={onSelect}
                onSceneReady={onInlineSceneReady}
                limitedControls
                className="h-full"
                enableFullPreview
                onBackgroundChange={onBackgroundChange}
                showOverlayControls={false}
                backgroundEnabled={backgroundEnabled}
                showAxes={showAxes}
                showGrid={showGrid}
                onPopupStateChange={handlePopupStateChange}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={subtleButtonClasses(false)} onClick={handleFit}>
              Fit
            </button>
            <button type="button" className={subtleButtonClasses(false)} onClick={handleReset}>
              Reset
            </button>
            <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-300">
              <span>Background</span>
              <input
                type="color"
                className="h-6 w-6 cursor-pointer rounded border border-[#444] bg-transparent"
                value={backgroundColor}
                onChange={(event) => onBackgroundChange?.(event.target.value)}
                disabled={!backgroundEnabled}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={subtleButtonClasses(backgroundEnabled)}
              aria-pressed={backgroundEnabled}
              onClick={() => setBackgroundEnabled((prev) => !prev)}
            >
              Background {backgroundEnabled ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className={subtleButtonClasses(showAxes)}
              aria-pressed={showAxes}
              onClick={() => setShowAxes((prev) => !prev)}
            >
              Axes {showAxes ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className={subtleButtonClasses(showGrid)}
              aria-pressed={showGrid}
              onClick={() => setShowGrid((prev) => !prev)}
            >
              Guides {showGrid ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      <FloatingPreview
        open={floatingOpen}
        data={data}
        selection={selection}
        onSelect={onSelect}
        onClose={() => setFloatingOpen(false)}
        backgroundEnabled={backgroundEnabled}
        showAxes={showAxes}
        showGrid={showGrid}
        onBackgroundChange={onBackgroundChange}
      />
    </aside>
  );
}

export default SpatialPreviewPanel;
