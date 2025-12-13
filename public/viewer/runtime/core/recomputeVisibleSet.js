// viewer/runtime/core/recomputeVisibleSet.js
//
// Phase2: “唯一の更新ルート”
//
// - visibleSet を再計算
// - selection を正規化（hidden drop はオプション）
// - microState を mode/selection/visible に整合
//
// ここ以外では uiState.visibleSet / uiState.selection / uiState.microState を確定させへん。

import { computeVisibleSet } from "./computeVisibleSet.js";
import { normalizeSelection } from "./normalizeSelection.js";
import { normalizeMicro } from "./normalizeMicro.js";

const VALID_MODE = new Set(["macro", "meso", "micro"]);
const VALID_KIND = ["points", "lines", "aux"];

function toSet(x) {
  if (x instanceof Set) return x;
  if (Array.isArray(x)) return new Set(x);
  return new Set();
}

function normalizeVisibleSetShape(raw, frame) {
  // 旧互換: Set<uuid> が来たら「全種同一セット」とみなす
  if (raw instanceof Set) {
    return Object.freeze({ frame, points: raw, lines: raw, aux: raw });
  }
  const obj = raw && typeof raw === "object" ? raw : {};
  const out = { frame };
  for (const k of VALID_KIND) out[k] = toSet(obj[k]);
  return Object.freeze(out);
}

function ensureFiltersCanonical(uiState) {
  if (!uiState || typeof uiState !== "object") return {};

  const filters = uiState.filters;
  if (!filters || typeof filters !== "object") {
    throw new Error("recomputeVisibleSet: uiState.filters missing (contract)");
  }
  const root = uiState.filters;

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
  const frame = uiState.frame;
  if (!frame || typeof frame !== "object") {
    throw new Error("recomputeVisibleSet: uiState.frame missing (contract)");
  }
  const f = uiState.frame;

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

/**
 * uiState を整合させて書き戻す「唯一のルート」を作る
 */
export function createRecomputeVisibleSet({
  uiState,
  structIndex,
  getModel, // optional: () => model
  selectionController, // ★追加：highlight/clear を正規ルートで
  microController,     // ★任意：refresh したい場合
  dropSelectionIfHidden = true,
} = {}) {
  if (!uiState || typeof uiState !== "object") {
    throw new Error("[recomputeVisibleSet] uiState is required");
  }

  return function recomputeVisibleSet(arg = undefined) {
    // ★呼び出し互換：
    // - recomputeVisibleSet()
    // - recomputeVisibleSet("filters")
    // - recomputeVisibleSet({ model, reason })
    let model = null;
    if (arg && typeof arg === "object") {
      model = arg.model ?? null;
    }

    const filters = ensureFiltersCanonical(uiState);
    const activeFrame = ensureFrameCanonical(uiState);
    const mode = getMode(uiState);

    const m =
      (typeof getModel === "function" ? getModel() : undefined) ??
      model ??
      uiState.model ??
      null;

    const visibleSet = computeVisibleSet({
      model: m,
      structIndex,
      activeFrame,
      filters,
    });
    const canonicalVisibleSet = normalizeVisibleSetShape(visibleSet, activeFrame);

    // selection（hidden drop）
    let normSel = normalizeSelection(uiState.selection, { visibleSet: canonicalVisibleSet, structIndex });
    if (!dropSelectionIfHidden && normSel === null) {
      normSel = normalizeSelection(uiState.selection, { structIndex });
    }

    // ここだけが uiState の整合を “確定” させる
    uiState.visibleSet = canonicalVisibleSet;

    // ★selection は controller があれば必ず通す（highlight / clear の副作用ルート固定）
    if (selectionController && typeof selectionController.select === "function" && typeof selectionController.clear === "function") {
      if (normSel === null) {
        selectionController.clear();
      } else {
        selectionController.select(normSel.uuid, normSel.kind ?? undefined);
      }
    } else {
      if (normSel === null) {
        uiState.selection = null;
      } else {
        uiState.selection = { uuid: normSel.uuid, kind: ("kind" in normSel ? normSel.kind : null) };
      }
    }

    const selForMicro = uiState.selection;

    // --- micro 無効条件（一本化）------------------------------
    const runtime = (uiState.runtime && typeof uiState.runtime === "object") ? uiState.runtime : {};
    const fxMicro = uiState.viewerSettings?.fx?.micro || {};
    const microEnabled = fxMicro.enabled !== undefined ? !!fxMicro.enabled : true;
    const microBlocked = !microEnabled || !!runtime.isFramePlaying || !!runtime.isCameraAuto;

    if (microBlocked) {
      uiState.microState = null;
    } else {
      const normMicro = normalizeMicro(uiState.microState, {
        mode,
        selection: selForMicro,
        structIndex,
        visibleSet: canonicalVisibleSet,
      });
      uiState.microState = normMicro;
    }

    // 任意：microController が副作用持つならここで 1 回だけ
    if (microController && typeof microController.refresh === "function") {
      microController.refresh("recompute");
    }

    return visibleSet;
  };
}
