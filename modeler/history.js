// history.js
let stack = [];
let idx = -1;

const clone = (s) => JSON.parse(JSON.stringify(s));

export function initHistory(initialState = null) {
  stack = [];
  idx = -1;
  if (initialState !== null) pushState(initialState);
}

export function pushState(state) {
  const snap = clone(state);
  if (idx >= 0) {
    const cur = JSON.stringify(stack[idx]);
    const nxt = JSON.stringify(snap);
    if (cur === nxt) return; // 変化なしは積まない
  }
  // 未来の履歴を切り落とす
  if (idx < stack.length - 1) stack = stack.slice(0, idx + 1);
  stack.push(snap);
  idx = stack.length - 1;
}

export function canUndo() { return idx > 0; }
export function canRedo() { return idx >= 0 && idx < stack.length - 1; }

export function undo() {
  if (!canUndo()) return null;
  idx -= 1;
  return clone(stack[idx]);
}

export function redo() {
  if (!canRedo()) return null;
  idx += 1;
  return clone(stack[idx]);
}
