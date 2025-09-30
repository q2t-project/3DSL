// history.js  [modeler_spec.md: §7 ストレージと履歴管理]
// 目的: 編集履歴の独立管理（index.html から疎結合に利用）

/** 初期化（履歴最大数 limit デフォルト=100） */
export function initHistory(/* limit=100 */){ /* TODO */ }

/** 現在のモデル状態を push（JSONディープコピー or 文字列化） */
export function pushState(/* state */){ /* TODO */ }

/** 1つ前の状態を返す（無ければ null） */
export function undo(){ /* TODO: pop→redoStackへ→前状態を返す */ }

/** 1つ先の状態を返す（無ければ null） */
export function redo(){ /* TODO: redoStack→history へ→復元 */ }

/** 実行可否（UIボタン活性制御用） */
export function canUndo(){ /* TODO */ }
export function canRedo(){ /* TODO */ }
