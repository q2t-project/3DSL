import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { deepClone, parseNumber } from '../lib/utils.js';
import { createNode } from '../lib/defaults.js';

const FONT_STEPS = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256];

function toFontStep(value, direction, fine) {
  const current = value ?? 16;
  if (fine) {
    return Math.max(0.125, current + direction);
  }
  const idx = FONT_STEPS.findIndex((step) => step >= current - 1e-6);
  if (idx === -1) {
    return direction > 0 ? FONT_STEPS[FONT_STEPS.length - 1] : FONT_STEPS[0];
  }
  const nextIndex = Math.min(
    FONT_STEPS.length - 1,
    Math.max(0, idx + direction)
  );
  return FONT_STEPS[nextIndex];
}

function getStep(event) {
  if (event.altKey) return 0.1;
  if (event.shiftKey) return 10;
  return 1;
}

function normalizeValue(value, column) {
  if (column.type === 'number') {
    if (value === '' || value === null) return undefined;
    const num = parseNumber(value, 0);
    return column.precision != null ? Number(num.toFixed(column.precision)) : num;
  }
  if (column.type === 'checkbox') {
    return Boolean(value);
  }
  return value;
}

function getValue(row, column) {
  if (column.vector) {
    const array = row[column.vector.key] ?? [0, 0, 0];
    return array[column.vector.index] ?? 0;
  }
  if (column.path) {
    let value = row;
    for (const part of column.path) {
      value = value?.[part];
    }
    return value;
  }
  return row[column.key];
}

function setValue(row, column, value) {
  if (column.vector) {
    const array = Array.isArray(row[column.vector.key]) ? [...row[column.vector.key]] : [0, 0, 0];
    array[column.vector.index] = value;
    return { ...row, [column.vector.key]: array };
  }
  if (column.path) {
    const next = { ...row };
    let target = next;
    for (let i = 0; i < column.path.length - 1; i += 1) {
      const key = column.path[i];
      target[key] = { ...(target[key] ?? {}) };
      target = target[key];
    }
    target[column.path[column.path.length - 1]] = value;
    return next;
  }
  return { ...row, [column.key]: value };
}

function adjustCoordinate(row, column, delta) {
  if (!column.vector) return row;
  const current = getValue(row, column) ?? 0;
  const nextValue = Number((current + delta).toFixed(column.precision ?? 3));
  return setValue(row, column, nextValue);
}

function createClipboardPayload(rows, selection) {
  const indexes = selection?.length ? selection : [];
  return indexes.map((index) => rows[index]).filter(Boolean);
}

function applyClipboard(rows, selection, clipboard) {
  if (!clipboard?.length) return rows;
  if (!selection?.length) {
    return [...rows, ...deepClone(clipboard)];
  }
  const result = [...rows];
  selection.forEach((rowIndex, idx) => {
    if (rowIndex < result.length) {
      result[rowIndex] = deepClone(clipboard[idx % clipboard.length]);
    }
  });
  return result;
}

function asDisplayString(value) {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function buildTooltip(column, required) {
  const parts = [column.label];
  if (column.description) parts.push(column.description);
  if (column.schemaType) parts.push(`Type: ${column.schemaType}`);
  if (column.defaultValue !== undefined) parts.push(`Default: ${column.defaultValue}`);
  parts.push(required ? 'Required' : 'Optional');
  return parts.join('\n');
}

function useEditableState(value) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);
  return [draft, setDraft];
}

function EditableCell({
  column,
  value,
  onCommit,
  onWheel,
  onNavigate,
  required,
  hasError
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useEditableState(
    column.type === 'number' && value != null ? value : value ?? ''
  );
  const inputRef = useRef(null);

  const empty = value === undefined || value === null || value === '';
  const isDefaultValue = !empty && column.defaultValue !== undefined && value === column.defaultValue;
  const showGhost = empty && column.defaultValue !== undefined;
  const tooltip = useMemo(() => buildTooltip(column, required), [column, required]);

  useEffect(() => {
    if (!editing) return;
    const handle = requestAnimationFrame(() => {
      const element = inputRef.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      if (element.select && column.type !== 'color' && column.type !== 'checkbox') {
        element.select();
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [editing, column.type]);

  const closeEditor = useCallback(() => {
    setEditing(false);
  }, []);

  const commitValue = useCallback(
    (nextValue) => {
      onCommit(nextValue);
    },
    [onCommit]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (onNavigate) onNavigate(event);
      if (event.defaultPrevented) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (column.type === 'checkbox') {
          commitValue(!(value ?? false));
        } else if (column.type === 'select') {
          commitValue(event.target.value ?? '');
        } else {
          commitValue(event.target.value);
        }
        closeEditor();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDraft(value ?? '');
        closeEditor();
      }
    },
    [closeEditor, column.type, commitValue, onNavigate, setDraft, value]
  );

  const baseTextClass = clsx(
    'flex h-full w-full items-center gap-2 overflow-hidden truncate px-2 py-1 text-left transition-colors whitespace-nowrap',
    required ? 'font-semibold text-emerald-200' : 'text-gray-300',
    showGhost && 'italic text-gray-500',
    !showGhost && !isDefaultValue && !hasError && 'text-white',
    isDefaultValue && 'text-sky-300/90',
    hasError && 'text-red-200 font-semibold'
  );

  const displayContent = () => {
    if (column.type === 'color') {
      const colorValue = value ?? column.defaultValue ?? '#000000';
      return (
        <div className="flex w-full items-center gap-2">
          <span
            className="h-3 w-3 rounded border border-white/40"
            style={{ backgroundColor: colorValue || 'transparent' }}
          />
          <span className={clsx('truncate', showGhost && 'text-gray-500')}>
            {showGhost ? column.defaultValue : asDisplayString(colorValue)}
          </span>
        </div>
      );
    }
    if (column.type === 'checkbox') {
      return (
        <span className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex h-3 w-3 items-center justify-center rounded border text-[9px]',
              value ? 'border-emerald-400 text-emerald-300' : 'border-gray-600 text-gray-600'
            )}
          >
            {value ? '✓' : ''}
          </span>
          <span className="truncate">{value ? 'Enabled' : 'Disabled'}</span>
        </span>
      );
    }
    if (showGhost) {
      return <span className="truncate">{column.defaultValue ?? '—'}</span>;
    }
    const text = asDisplayString(value) || '—';
    return <span className="truncate">{text}</span>;
  };

  const sharedInteraction = {
    onWheel: (event) => onWheel?.(event),
    onKeyDown: handleKeyDown,
    title: tooltip
  };

  return (
    <div className="relative h-full min-h-[32px]">
      {editing ? (
        column.type === 'select' ? (
          <select
            ref={inputRef}
            className="h-full w-full bg-transparent px-2 py-1 text-xs text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/70"
            value={draft ?? ''}
            onBlur={(event) => {
              commitValue(event.target.value || undefined);
              closeEditor();
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              commitValue(event.target.value || undefined);
              closeEditor();
            }}
            {...sharedInteraction}
          >
            <option value="">—</option>
            {column.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : column.type === 'checkbox' ? (
          <div className="flex h-full w-full items-center justify-center">
            <input
              ref={inputRef}
              type="checkbox"
              className="h-4 w-4 cursor-pointer"
              checked={Boolean(value)}
              onChange={(event) => {
                commitValue(event.target.checked);
                closeEditor();
              }}
              onBlur={() => {
                closeEditor();
              }}
              {...sharedInteraction}
            />
          </div>
        ) : column.type === 'color' ? (
          <input
            ref={inputRef}
            type="color"
            className="h-full w-full cursor-pointer rounded border border-white/20 bg-transparent"
            value={value ?? column.defaultValue ?? '#000000'}
            onBlur={(event) => {
              commitValue(event.target.value || undefined);
              closeEditor();
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              commitValue(event.target.value || undefined);
            }}
            {...sharedInteraction}
          />
        ) : (
          <input
            ref={inputRef}
            type={column.type === 'number' ? 'number' : 'text'}
            step={column.type === 'number' ? column.step ?? 'any' : undefined}
            className="h-full w-full bg-transparent px-2 py-1 text-xs text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/70"
            value={draft ?? ''}
            placeholder={column.placeholder}
            onBlur={(event) => {
              commitValue(event.target.value);
              closeEditor();
            }}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            {...sharedInteraction}
          />
        )
      ) : (
        <button
          type="button"
          className={clsx(
            baseTextClass,
            'w-full rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/70'
          )}
          onFocus={() => setEditing(true)}
          onClick={() => setEditing(true)}
          title={tooltip}
        >
          {displayContent()}
        </button>
      )}
    </div>
  );
}

export function createSheetComponent(config) {
  const { columns, createRow } = config;

  return function SheetComponent({
    rows,
    onChange,
    selection,
    onSelectionChange,
    errors,
    context
  }) {
    context = context ?? {};
    const clipboardRef = useRef(null);
    const resolvedColumns = useMemo(
      () =>
        columns.map((column) => ({
          ...column,
          options: typeof column.options === 'function' ? column.options(context) : column.options
        })),
      [columns, context]
    );

    const updateRows = (updater) => {
      const next = typeof updater === 'function' ? updater(rows) : updater;
      onChange?.(next);
    };

    const handleAddRow = () => {
      updateRows([...rows, createRow?.(context) ?? {}]);
    };

    const handleRemoveRow = (index) => {
      updateRows(rows.filter((_, i) => i !== index));
    };

    const handleCellChange = (rowIndex, column, value) => {
      const row = rows[rowIndex];
      const normalized = normalizeValue(value, column);
      updateRows(
        rows.map((item, idx) => (idx === rowIndex ? setValue(row, column, normalized) : item))
      );
    };

    const handleWheel = (event, rowIndex, column) => {
      if (column.type !== 'number' && !column.fontSteps) return;
      event.preventDefault();
      const row = rows[rowIndex];
      let delta = event.deltaY < 0 ? 1 : -1;
      if (column.fontSteps) {
        const current = parseNumber(getValue(row, column) ?? 16, 16);
        const next = toFontStep(current, delta, event.altKey);
        handleCellChange(rowIndex, column, next);
        return;
      }
      const step = getStep(event);
      delta *= step;
      const current = parseNumber(getValue(row, column), 0);
      const next = Number((current + delta).toFixed(column.precision ?? 3));
      handleCellChange(rowIndex, column, next);
    };

    const handleKeyDown = (event, rowIndex, column) => {
      if (event.key === 'Tab') return;
      const row = rows[rowIndex];
      const step = getStep(event);
      let handled = false;

      if (column.fontSteps && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        const direction = event.key === 'ArrowUp' ? 1 : -1;
        const current = parseNumber(getValue(row, column) ?? 16, 16);
        const next = toFontStep(current, direction, event.altKey && !event.shiftKey);
        handleCellChange(rowIndex, column, next);
        handled = true;
      }

      if (!column.vector && column.type === 'number') {
        if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
          const direction = event.key === 'ArrowUp' ? 1 : -1;
          const current = parseNumber(getValue(row, column), 0);
          const next = Number((current + direction * step).toFixed(column.precision ?? 3));
          handleCellChange(rowIndex, column, next);
          handled = true;
        }
      }
      if (column.vector) {
        if (column.vector.index === 0 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          updateRows(
            rows.map((item, idx) =>
              idx === rowIndex ? adjustCoordinate(item, column, direction * step) : item
            )
          );
          handled = true;
        }
        if (column.vector.index === 1 && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
          const direction = event.key === 'ArrowUp' ? 1 : -1;
          updateRows(
            rows.map((item, idx) =>
              idx === rowIndex ? adjustCoordinate(item, column, direction * step) : item
            )
          );
          handled = true;
        }
        if (
          column.vector.index === 2 &&
          (event.key === 'PageUp' || event.key === 'PageDown')
        ) {
          const direction = event.key === 'PageUp' ? 1 : -1;
          updateRows(
            rows.map((item, idx) =>
              idx === rowIndex ? adjustCoordinate(item, column, direction * step) : item
            )
          );
          handled = true;
        }
      }

      if (handled) {
        event.preventDefault();
      }
    };

    const handleRowClick = (event, rowIndex) => {
      if (!onSelectionChange) return;
      if (event.shiftKey && selection?.length) {
        const last = selection[selection.length - 1];
        const [start, end] = [Math.min(last, rowIndex), Math.max(last, rowIndex)];
        const range = [];
        for (let i = start; i <= end; i += 1) {
          range.push(i);
        }
        onSelectionChange(Array.from(new Set([...selection, ...range])));
        return;
      }
      if (event.metaKey || event.ctrlKey) {
        const exists = selection?.includes(rowIndex);
        const next = exists
          ? selection.filter((index) => index !== rowIndex)
          : [...(selection ?? []), rowIndex];
        onSelectionChange(next);
        return;
      }
      onSelectionChange([rowIndex]);
    };

    const handleTableKeyDown = (event) => {
      if (!onSelectionChange) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selection?.length) {
          event.preventDefault();
          updateRows(rows.filter((_, index) => !selection.includes(index)));
          onSelectionChange([]);
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        clipboardRef.current = createClipboardPayload(rows, selection);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        updateRows(applyClipboard(rows, selection, clipboardRef.current));
      }
    };

    const isRowSelected = (index) => selection?.includes(index);

    const rowErrors = errors ?? {};

    return (
      <div
        className="sheet-table-wrapper" 
        tabIndex={0}
        onKeyDown={handleTableKeyDown}
      >
        <div className="sheet-table-container">
          <table className="sheet-table text-[11px] text-gray-200">
            <colgroup>
              <col style={{ width: '56px' }} />
              {resolvedColumns.map((column) => (
                <col
                  key={column.key}
                  style={{
                    width: column.width ? `${column.width}px` : undefined,
                    minWidth: column.minWidth ? `${column.minWidth}px` : column.width ? `${column.width}px` : '120px'
                  }}
                />
              ))}
              <col style={{ width: '64px' }} />
            </colgroup>
            <thead className="bg-gray-950/95 text-[10px] uppercase tracking-wide text-gray-400">
              <tr className="divide-x divide-gray-800/70">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                {resolvedColumns.map((column) => (
                  <th
                    key={column.key}
                    className={clsx(
                      'px-3 py-2 text-left font-semibold',
                      column.required ? 'text-emerald-200' : 'text-gray-400'
                    )}
                    title={buildTooltip(column, column.required)}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {rows.map((row, rowIndex) => {
                const rowError = rowErrors[rowIndex] ?? {};
                const selected = isRowSelected(rowIndex);
                return (
                  <tr
                    key={rowIndex}
                    className={clsx(
                      'group divide-x divide-gray-900/60 even:bg-gray-900/50',
                      'hover:bg-gray-900/80 transition-colors',
                      selected && 'bg-emerald-500/10 ring-1 ring-emerald-400/40'
                    )}
                    onClick={(event) => handleRowClick(event, rowIndex)}
                  >
                    <td className="px-3 py-1 align-middle text-right text-[10px] text-gray-500">{rowIndex + 1}</td>
                    {resolvedColumns.map((column) => {
                      const value = getValue(row, column);
                      const hasError = Boolean(rowError[column.errorKey ?? column.key]);
                      const required = column.required;
                      return (
                        <td
                          key={column.key}
                          className={clsx(
                            'px-0 align-middle',
                            hasError && 'bg-red-950/40'
                          )}
                        >
                          <EditableCell
                            column={column}
                            value={value}
                            required={required}
                            hasError={hasError}
                            onCommit={(nextValue) => handleCellChange(rowIndex, column, nextValue)}
                            onWheel={(event) => handleWheel(event, rowIndex, column)}
                            onNavigate={(event) => handleKeyDown(event, rowIndex, column)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right align-middle">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveRow(rowIndex);
                        }}
                        className="rounded px-2 py-1 text-[10px] font-semibold text-red-400 transition hover:bg-red-500/20 hover:text-red-200"
                        title="Remove row"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-gray-900/70 bg-gray-950/60 p-2">
          <button
            onClick={handleAddRow}
            className="rounded bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-black shadow-sm transition hover:bg-emerald-400"
          >
            Add row
          </button>
        </div>
      </div>
    );
  };
}

const nodeColumns = [
  {
    key: 'id',
    label: 'ID',
    required: true,
    type: 'text',
    schemaType: 'string',
    description: 'Unique identifier for the node',
    width: 160
  },
  {
    key: 'positionX',
    label: 'Pos X',
    type: 'number',
    required: true,
    vector: { key: 'position', index: 0 },
    errorKey: 'position/0',
    precision: 3,
    schemaType: 'number',
    description: 'World position on the X axis',
    width: 96,
    step: 0.1
  },
  {
    key: 'positionY',
    label: 'Pos Y',
    type: 'number',
    required: true,
    vector: { key: 'position', index: 1 },
    errorKey: 'position/1',
    precision: 3,
    schemaType: 'number',
    description: 'World position on the Y axis',
    width: 96,
    step: 0.1
  },
  {
    key: 'positionZ',
    label: 'Pos Z',
    type: 'number',
    required: true,
    vector: { key: 'position', index: 2 },
    errorKey: 'position/2',
    precision: 3,
    schemaType: 'number',
    description: 'World position on the Z axis',
    width: 96,
    step: 0.1
  },
  {
    key: 'color',
    label: 'Color',
    type: 'color',
    schemaType: 'string',
    description: 'Primary node color',
    defaultValue: '#808080',
    width: 120
  },
  {
    key: 'size',
    label: 'Size',
    type: 'number',
    placeholder: '1.0',
    precision: 3,
    schemaType: 'number',
    description: 'Node size multiplier',
    defaultValue: 1,
    width: 88,
    step: 0.1
  },
  {
    key: 'shape',
    label: 'Shape',
    type: 'select',
    options: ['sphere', 'cube', 'cylinder', 'cone', 'plane'],
    schemaType: 'string',
    description: 'Geometry profile',
    defaultValue: 'sphere',
    width: 128
  },
  {
    key: 'labelText',
    label: 'Label text',
    type: 'text',
    path: ['label', 'text'],
    errorKey: 'label/text',
    schemaType: 'string',
    description: 'Optional label displayed near the node',
    width: 200
  }
];

const NodesSheet = createSheetComponent({
  tabKey: 'nodes',
  columns: nodeColumns,
  createRow: () => createNode()
});

export default NodesSheet;
