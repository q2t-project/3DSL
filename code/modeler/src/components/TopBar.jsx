import { useRef, useState } from 'react';

function TopBar({ onNew, onOpenFile, onSave, onExportGlb, onImportUrl, validation }) {
  const fileInputRef = useRef(null);
  const [url, setUrl] = useState('');

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onOpenFile?.(file);
    event.target.value = '';
  };

  const handleImportUrl = () => {
    if (!url) return;
    onImportUrl?.(url);
  };

  return (
    <div className="flex items-center gap-4 bg-gray-900 border-b border-gray-700 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={onNew}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-3 py-1 rounded"
        >
          New
        </button>
        <button
          onClick={handleFileClick}
          className="bg-sky-500 hover:bg-sky-600 text-black font-semibold px-3 py-1 rounded"
        >
          Load JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={onSave}
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-3 py-1 rounded"
        >
          Save JSON
        </button>
        <button
          onClick={onExportGlb}
          className="bg-purple-500 hover:bg-purple-600 text-black font-semibold px-3 py-1 rounded"
        >
          Export glb
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Import URL"
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-64"
        />
        <button
          onClick={handleImportUrl}
          className="bg-indigo-500 hover:bg-indigo-600 text-black font-semibold px-3 py-1 rounded"
        >
          Import
        </button>
      </div>
      <div className="ml-auto text-xs text-gray-300">
        {validation?.valid ? (
          <span className="text-emerald-400">Schema ✓</span>
        ) : (
          <span className="text-red-400">Schema ✕ ({validation?.errors?.length ?? 0})</span>
        )}
      </div>
    </div>
  );
}

export default TopBar;
