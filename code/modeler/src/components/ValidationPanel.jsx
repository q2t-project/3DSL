import { formatAjvError } from '../lib/utils.js';

function ValidationPanel({ validation, onFocusPath }) {
  const errors = validation?.errors ?? [];
  return (
    <div className="h-full bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="px-3 py-2 border-b border-gray-800 text-xs uppercase tracking-wide text-gray-400">
        Validation
      </div>
      <div className="flex-1 overflow-auto text-xs">
        {validation?.valid && (
          <div className="p-3 text-emerald-400">Schema valid</div>
        )}
        {!validation?.valid && errors.length === 0 && (
          <div className="p-3 text-gray-400">Validating…</div>
        )}
        {!validation?.valid && errors.length > 0 && (
          <ul className="divide-y divide-gray-800">
            {errors.map((error, index) => (
              <li key={`${error.instancePath}-${index}`} className="p-2">
                <button
                  type="button"
                  className="text-left text-red-300 hover:text-red-200"
                  onClick={() => onFocusPath?.(error.instancePath)}
                >
                  {formatAjvError(error)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ValidationPanel;