import { useMemo, useRef } from 'react';
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
        className="flex flex-col h-full overflow-hidden"
        tabIndex={0}
        onKeyDown={handleTableKeyDown}
      >
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10 bg-gray-900">
              <tr>
                <th className="px-2 py-2 text-left text-gray-400">#</th>
                {resolvedColumns.map((column) => (
                  <th key={column.key} className="px-2 py-2 text-left text-gray-400">
                    {column.label}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const rowError = rowErrors[rowIndex] ?? {};
                const selected = isRowSelected(rowIndex);
                return (
                  <tr
                    key={rowIndex}
                    className={clsx(
                      'border-b border-gray-800',
                      selected ? 'bg-gray-800/60' : 'hover:bg-gray-800/40'
                    )}
                    onClick={(event) => handleRowClick(event, rowIndex)}
                  >
                    <td className="px-2 py-1 text-gray-500">{rowIndex + 1}</td>
                    {resolvedColumns.map((column) => {
                      const value = getValue(row, column);
                      const hasError = rowError[column.errorKey ?? column.key];
                      const required = column.required;
                      const empty = value === undefined || value === null || value === '';
                      const baseClass = clsx(
                        'px-2 py-1 align-middle',
                        required ? 'bg-white text-black' : 'bg-gray-900/60 text-gray-200',
                        empty && required ? 'ring-1 ring-red-500' : 'ring-0'
                      );
                      const commonProps = {
                        className: clsx(
                          'w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400',
                          hasError && 'border-red-500 ring-1 ring-red-500'
                        ),
                        onWheel: (event) => handleWheel(event, rowIndex, column),
                        onKeyDown: (event) => handleKeyDown(event, rowIndex, column)
                      };
                      let cellContent;
                      if (column.type === 'select') {
                        cellContent = (
                          <select
                            value={value ?? ''}
                            onChange={(event) => handleCellChange(rowIndex, column, event.target.value || undefined)}
                            {...commonProps}
                          >
                            <option value="">-</option>
                            {column.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        );
                      } else if (column.type === 'checkbox') {
                        cellContent = (
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(event) => handleCellChange(rowIndex, column, event.target.checked)}
                          />
                        );
                      } else if (column.type === 'number') {
                        cellContent = (
                          <input
                            type="number"
                            value={value ?? ''}
                            placeholder={column.placeholder}
                            step="any"
                            {...commonProps}
                            onChange={(event) => handleCellChange(rowIndex, column, event.target.value)}
                          />
                        );
                      } else {
                        cellContent = (
                          <input
                            type="text"
                            value={value ?? ''}
                            placeholder={column.placeholder}
                            {...commonProps}
                            onChange={(event) => handleCellChange(rowIndex, column, event.target.value)}
                          />
                        );
                      }
                      return (
                        <td key={column.key} className={baseClass}>
                          {cellContent}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveRow(rowIndex);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-800 p-2 text-right">
          <button
            onClick={handleAddRow}
            className="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400"
          >
            Add row
          </button>
        </div>
      </div>
    );
  };
}

const nodeColumns = [
  { key: 'id', label: 'ID', required: true, type: 'text' },
  {
    key: 'positionX',
    label: 'Pos X',
    type: 'number',
    required: true,
    vector: { key: 'position', index: 0 },
    errorKey: 'position/0',
    precision: 3
  },
  {
    key: 'positionY',
    label: 'Pos Y',
    type: 'number',
    required: true,
    vector: { key: 'position', index: 1 },
    errorKey: 'position/1',
    precision: 3
  },
  {
    key: 'positionZ',
    label: 'Pos Z',
    type: 'number',
    required: true,
    vector: { key: 'position', index: 2 },
    errorKey: 'position/2',
    precision: 3
  },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'size', label: 'Size', type: 'number', placeholder: '1.0', precision: 3 },
  {
    key: 'shape',
    label: 'Shape',
    type: 'select',
    options: ['sphere', 'cube', 'cylinder', 'cone', 'plane']
  },
  {
    key: 'labelText',
    label: 'Label text',
    type: 'text',
    path: ['label', 'text'],
    errorKey: 'label/text'
  }
];

const NodesSheet = createSheetComponent({
  tabKey: 'nodes',
  columns: nodeColumns,
  createRow: () => createNode()
});

export default NodesSheet;