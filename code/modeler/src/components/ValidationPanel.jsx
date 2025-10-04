import { formatAjvError } from '../lib/utils.js';

function ValidationPanel({ validation, onFocusPath }) {
  const errors = validation?.errors ?? [];
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-[#444] bg-[#222] text-xs text-gray-200">
      <div className="border-b border-[#444] px-4 py-3 text-[11px] uppercase tracking-wide text-gray-300">
        Validation
      </div>
      <div className="flex-1 overflow-auto px-3 py-3 text-[11px]">
        {validation?.valid && (
          <div className="rounded border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-emerald-300">
            Schema valid
          </div>
        )}
        {!validation?.valid && errors.length === 0 && (
          <div className="rounded border border-[#444] bg-[#2b2b2b] px-3 py-2 text-gray-300">Validating…</div>
        )}
        {!validation?.valid && errors.length > 0 && (
          <ul className="divide-y divide-[#333]">
            {errors.map((error, index) => (
              <li key={`${error.instancePath}-${index}`} className="py-2">
                <button
                  type="button"
                  className="text-left text-red-300 transition hover:text-red-200"
                  onClick={() => onFocusPath?.(error.instancePath)}
                >
                  {formatAjvError(error)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default ValidationPanel;