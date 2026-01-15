// viewer/runtime/core/recomputeVisibleSet.js
//
// Phase2: “唯一の確定ルート”
// - uiState.visibleSet / uiState.selection / uiState.microState / uiState.mode を整合させて確定
// - ここでは controller の副作用を呼ばない（循環を断つ）

import { computeVisibleSet } from "./computeVisibleSet.js";
import { normalizeSelection } from "./normalizeSelection.js";
import { normalizeMicro } from "./normalizeMicro.js";

const VALID_MODE = new Set(["macro", "meso", "micro"]);
const VALID_KIND = ["points", "lines", "aux"];

const TRACE_RECOMPUTE = false; // デバッグ時のみ true
let _recomputeSeq = 0;

function toSet(x) {
  if (x instanceof Set) return x;
  if (Array.isArray(x)) return new Set(x);
  return new Set();
}

function normalizeVisibleSetShape(raw, frame) {
  // 旧互換: Set<uuid> が来たら「全種同一セット」扱い
  if (raw instanceof Set) {
    return Object.freeze({ frame, points: raw, lines: raw, aux: raw });
  }
  const obj = raw && typeof raw === "object" ? raw : {};
  const out = { frame };
  for (const k of VALID_KIND) out[k] = toSet(obj[k]);
  return Object.freeze(out);
}

function _hasIn(setLike, uuid) {
  try { return !!setLike?.has?.(uuid); } catch (_e) { return false; }
}
function _isVisibleUuid(uuid, vs) {
  if (!uuid || !vs) return false;
  if (vs instanceof Set) return vs.has(uuid);
  if (typeof vs?.has === "function") return !!vs.has(uuid);
  if (typeof vs === "object") {
    return _hasIn(vs.points, uuid) || _hasIn(vs.lines, uuid) || _hasIn(vs.aux, uuid);
  }
  return false;
}

function ensureFiltersCanonical(uiState) {
  const root = uiState.filters;
  if (!root || typeof root !== "object") {
    throw new Error("recomputeVisibleSet: uiState.filters missing (contract)");
  }

  if (!root.types || typeof root.types !== "object") root.types = {};
  const t = root.types;

  for (const k of ["points", "lines", "aux"]) {
    if (typeof t[k] !== "boolean" && typeof root[k] === "boolean") t[k] = root[k];
    if (typeof t[k] !== "boolean") t[k] = true;
    root[k] = t[k]; // mirror
  }

  if (!root.auxModules || typeof root.auxModules !== "object") root.auxModules = {};
  if (typeof root.auxModules.grid !== "boolean") root.auxModules.grid = false;
  if (typeof root.auxModules.axis !== "boolean") root.auxModules.axis = false;

  return root;
}

function ensureFrameCanonical(uiState) {
  const f = uiState.frame;
  if (!f || typeof f !== "object") {
    throw new Error("recomputeVisibleSet: uiState.frame missing (contract)");
  }

  if (!f.range || typeof f.range !== "object") f.range = {};
  let min = Number.isFinite(Number(f.range.min)) ? Math.trunc(Number(f.range.min)) : 0;
  let max = Number.isFinite(Number(f.range.max)) ? Math.trunc(Number(f.range.max)) : min;
  if (max < min) [min, max] = [max, min];

  let cur = Number.isFinite(Number(f.current)) ? Math.trunc(Number(f.current)) : min;
  if (cur < min) cur = min;
  if (cur > max) cur = max;

  f.range.min = min;
  f.range.max = max;
  f.current = cur;

  return cur;
}

function getMode(uiState) {
  const m = uiState?.mode ?? uiState?.ui_state?.mode;
  return VALID_MODE.has(m) ? m : "macro";
}

function ensureRuntimeCanonical(uiState) {
  const rt = uiState?.runtime;
  if (!rt || typeof rt !== "object") {
    uiState.runtime = {};
    return uiState.runtime;
  }
  return rt;
}

function readMicroKind(ms, sel) {
  const k = ms?.kind ?? ms?.focusKind ?? sel?.kind ?? null;
  return (k === "points" || k === "lines" || k === "aux") ? k : null;
}

export function createRecomputeVisibleSet({
  uiState,
  structIndex,
  getModel, // optional: () => model
  dropSelectionIfHidden = true,
} = {}) {
  if (!uiState || typeof uiState !== "object") {
    throw new Error("[recomputeVisibleSet] uiState is required");
  }

  return function recomputeVisibleSet(arg = undefined) {
    const seq = ++_recomputeSeq;

    const filters = ensureFiltersCanonical(uiState);
    const activeFrame = ensureFrameCanonical(uiState);

    const requestedMode = getMode(uiState);

    const model =
      (typeof getModel === "function" ? getModel() : null) ??
      (arg && typeof arg === "object" ? (arg.model ?? null) : null) ??
      uiState.model ??
      null;

    // 1) visibleSet 確定
    const rawVS = computeVisibleSet({
      model,
      structIndex,
      activeFrame,
      filters,
    });
    const visibleSet = normalizeVisibleSetShape(rawVS, activeFrame);
    uiState.visibleSet = visibleSet;

    // 2) selection 正規化（hidden drop）
    let normSel = normalizeSelection(uiState.selection, { visibleSet, structIndex });
    if (!dropSelectionIfHidden && normSel === null) {
      normSel = normalizeSelection(uiState.selection, { structIndex });
    }
    uiState.selection = normSel ? { uuid: normSel.uuid, kind: normSel.kind ?? null } : null;

    if (uiState.mode === "micro") {
      const selUuid = uiState.selection?.uuid ?? null;

      // microにいるのに selection 無い → macroへ（既にやってるならOK）
      if (!selUuid) {
        uiState.mode = "macro";
        uiState.microState = null;
      } else {
        const curFocus = uiState.microState?.focusUuid ?? null;

        // ★ここが肝：selection が変わったら microState を作り直す（最低でも focusUuid を更新）
        if (curFocus !== selUuid) {
          uiState.microState = {
            focusUuid: selUuid,
            relatedUuids: [],
            focusPosition: null,
            localBounds: null,
          };
        }
      }
    } else {
      uiState.microState = null;
    }


    // 3) microState / mode 整合
    const runtime = ensureRuntimeCanonical(uiState);
    const fxMicro = uiState.viewerSettings?.fx?.micro || {};
    const microEnabled = fxMicro.enabled !== undefined ? !!fxMicro.enabled : true;
    const microBlocked = !microEnabled || !!runtime.isFramePlaying || !!runtime.isCameraAuto;

    let mode = requestedMode;

    // micro は “条件満たさな無理” をここで確定させる
    if (mode === "micro") {
      const selUuid = uiState.selection?.uuid ? String(uiState.selection.uuid).trim() : "";
      if (microBlocked || !selUuid || !_isVisibleUuid(selUuid, visibleSet)) {
        mode = "macro";
        uiState.microState = null;
      } else {
        let normMicro = normalizeMicro(uiState.microState, {
          mode,
          selection: uiState.selection,
          structIndex,
          visibleSet,
        });
        if (!normMicro) {
          normMicro = {
            focusUuid: selUuid,
            relatedUuids: [],
            focusPosition: null,
            localBounds: null,
          };
        }
        uiState.microState = normMicro;
      }
    } else {
      uiState.microState = null;
    }

    uiState.mode = mode;

    // 4) 「状態＝結果」スナップショット（UIはこれだけを見る）
    {
      const sel = uiState.selection ? { uuid: uiState.selection.uuid, kind: uiState.selection.kind ?? null } : null;
      const ms = uiState.microState ?? null;
      const focusUuid = typeof ms?.focusUuid === "string" ? ms.focusUuid : null;
      const focusKind = readMicroKind(ms, uiState.selection);
      const focusPosition =
        Array.isArray(ms?.focusPosition) && ms.focusPosition.length >= 3
          ? [Number(ms.focusPosition[0]) || 0, Number(ms.focusPosition[1]) || 0, Number(ms.focusPosition[2]) || 0]
          : null;
      const localBounds =
        ms?.localBounds && typeof ms.localBounds === "object"
          ? ms.localBounds
          : null;

      let blockedBy = null;
      if (requestedMode === "micro") {
        const selUuid = uiState.selection?.uuid ? String(uiState.selection.uuid).trim() : "";
        if (!microEnabled) blockedBy = "microDisabled";
        else if (!!runtime.isFramePlaying) blockedBy = "framePlaying";
        else if (!!runtime.isCameraAuto) blockedBy = "cameraAuto";
        else if (!selUuid) blockedBy = "noSelection";
        else if (!_isVisibleUuid(selUuid, visibleSet)) blockedBy = "selectionHidden";
        else if (!ms) blockedBy = "noMicroState";
        else if (!focusPosition) blockedBy = "noFocusPosition";
      }

      runtime.status = {
        requested: {
          mode: requestedMode,
          selection: sel,
        },
        effective: {
          mode: uiState.mode,
          selection: sel,
          microReady: uiState.mode === "micro" && !!ms,
        },
        micro: {
          focusUuid,
          focusKind,
          focusPosition,
          localBounds,
          blockedBy,
        },
        frame: {
          index: activeFrame,
          playing: !!runtime.isFramePlaying,
        },
        visibility: {
          dirty: !!uiState._dirtyVisibleSet,
        },
      };
    }

    const wantTrace = TRACE_RECOMPUTE || !!uiState?.runtime?._traceRecomputeVisibleSet;
    if (wantTrace) {
      const selUuid = uiState.selection?.uuid ? String(uiState.selection.uuid) : null;
      console.log(`[recomputeVisibleSet #${seq}] end`, {
        ui: uiState?.__dbgId,
        mode: uiState.mode,
        sel: selUuid,
        micro: uiState.microState?.focusUuid ?? null,
        frame: activeFrame,
      });
    }

    return uiState.visibleSet;
  };
}
