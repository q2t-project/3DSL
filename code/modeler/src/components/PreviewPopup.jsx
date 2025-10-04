import { useEffect } from 'react';

function PreviewPopup({ children, onClose, title = 'Immersive 3D Preview' }) {
  useEffect(() => {
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
  }, [onClose]);

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3 text-sm uppercase tracking-wide text-gray-300">
        <div className="font-semibold text-gray-100">{title}</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-gray-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-gray-700"
        >
          ✕ Close
        </button>
      </div>
      <div className="flex-1 bg-black">{children}</div>
    </div>
  );
}

export default PreviewPopup;
