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
const VALID_KIND_SET = new Set(VALID_KIND);

function toSet(x) {
  if (!x) return new Set();
  if (x instanceof Set) return new Set(x);
  if (Array.isArray(x)) return new Set(x);

  try {
    if (typeof x?.[Symbol.iterator] === "function") return new Set(x);
  } catch (_e) {}

  if (typeof x?.forEach === "function") {
    const s = new Set();
    try { x.forEach((v) => s.add(v)); } catch (_e) {}
    return s;
  }
  return new Set();
}

function isSetLike(v) {
  if (!v) return false;
  if (v instanceof Set) return true;
  if (Array.isArray(v)) return true;
  if (typeof v === "string") return false; // ★文字列は iterable でも対象外
  if (typeof v?.[Symbol.iterator] === "function") return true;
  if (typeof v?.forEach === "function") return true;
  return false;
}

function normalizeVisibleSetShape(raw, frame) {
  // 旧互換: Set<uuid> が来たら「全種同一セット」とみなす
  if (raw instanceof Set) {
    const s = new Set(raw);
    return Object.freeze({
      frame,
      points: new Set(s),
      lines: new Set(s),
      aux: new Set(s),
    });
  }

  // Contract A案:
  // - visibleSet が object のとき「kind の Set が無い」状態を保持する
  //   => renderer.applyFrame で「その kind は全部非表示（filter OFF）」が成立する
  const obj = raw && typeof raw === "object" ? raw : {};
  const out = { frame };

  for (const k of VALID_KIND) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const v = obj[k];
    if (v == null) continue; // null/undefined は「Set無し」と同義
    if (isSetLike(v)) out[k] = toSet(v);
  }

  return Object.freeze(out);
}

function ensureFiltersCanonical(uiState) {
  if (!uiState || typeof uiState !== "object") {
    throw new Error("recomputeVisibleSet: uiState missing (contract)");
  }

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

function inferKindFromSelection(sel, micro, structIndex) {
  const k0 = sel?.kind;
  if (k0 && VALID_KIND_SET.has(k0)) return k0;

  const k1 = micro?.kind;
  if (k1 && VALID_KIND_SET.has(k1)) return k1;

  const u = sel?.uuid ?? null;
  if (u && typeof structIndex?.getKind === "function") {
    try {
      const k = structIndex.getKind(u);
      return VALID_KIND_SET.has(k) ? k : null;
    } catch (_e) {}
  }
  return null;
}

function ensureMicroAlignedToSelection(nextMicro, sel, kind) {
  const selUuid = sel?.uuid ?? null;
  if (!selUuid) return null;

  const base = nextMicro && typeof nextMicro === "object" ? nextMicro : {};
  const related = Array.isArray(base.relatedUuids) ? base.relatedUuids.slice() : [];
  if (!related.includes(selUuid)) related.unshift(selUuid);

  if (base.focusUuid !== selUuid || base.kind !== kind) {
    return {
      ...base,
      focusUuid: selUuid,
      kind: kind ?? null,
      relatedUuids: related,
      localBounds: base.localBounds ?? null,
      focusPosition: base.focusPosition ?? null,
    };
  }

  // related を触った場合のみ新オブジェクト
  if (related !== base.relatedUuids) return { ...base, relatedUuids: related };
  return base;
}

function computeMicroIfNeeded({ mode, selection, nextMicro, microController, cameraState, structIndex }) {
  if (mode !== "micro") return null;
  const selUuid = selection?.uuid ?? null;
  if (!selUuid) return null;

  // selection と focus がズレてる時だけ「計算で作り直す」チャンス
  if (
    microController &&
    typeof microController.compute === "function" &&
    (!nextMicro || nextMicro.focusUuid !== selUuid)
  ) {
    try {
      const computed = microController.compute(selection, cameraState, structIndex);
      if (computed) return computed;
    } catch (_e) {}
  }
  return nextMicro;
}

/**
 * uiState を整合させて書き戻す「唯一のルート」を作る
 */
export function createRecomputeVisibleSet({
  uiState,
  structIndex,
  getModel, // optional: () => model
  selectionController, // highlight/clear を正規ルートで
  microController,     // 任意：refresh したい場合
  dropSelectionIfHidden = true,
} = {}) {
  if (!uiState || typeof uiState !== "object") {
    throw new Error("[recomputeVisibleSet] uiState is required");
  }

  let _inRecompute = false;

  return function recomputeVisibleSet(arg = undefined) {
    if (_inRecompute) return uiState.visibleSet ?? null;
    _inRecompute = true;

    try {
      // 呼び出し互換：
      // - recomputeVisibleSet()
      // - recomputeVisibleSet("filters")
      // - recomputeVisibleSet({ model, reason })
      let model = null;
      if (arg && typeof arg === "object") model = arg.model ?? null;

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

      const nextSelection =
        normSel === null
          ? { uuid: null, kind: null }
          : { uuid: normSel.uuid, kind: ("kind" in normSel ? (normSel.kind ?? null) : null) };

      uiState.selection = nextSelection;

      // 副作用（highlight/clear）を controller 経由で一本化
      if (selectionController) {
        if (typeof selectionController.apply === "function" && typeof selectionController.clear === "function") {
          if (!nextSelection.uuid) selectionController.clear();
          else selectionController.apply(nextSelection);
        } else if (
          typeof selectionController.applySelectionHighlight === "function" &&
          typeof selectionController.clearSelectionHighlight === "function"
        ) {
          if (!nextSelection.uuid) selectionController.clearSelectionHighlight();
          else selectionController.applySelectionHighlight(nextSelection);
        } else if (typeof selectionController.select === "function" && typeof selectionController.clear === "function") {
          if (!nextSelection.uuid) selectionController.clear();
          else selectionController.select(nextSelection.uuid, nextSelection.kind ?? undefined);
        }
      }

      const selForMicro = uiState.selection; // 常に {uuid,kind}

      // micro 無効条件（一本化）
      const runtime = (uiState.runtime && typeof uiState.runtime === "object") ? uiState.runtime : {};
      const fxMicro = uiState.viewerSettings?.fx?.micro || {};
      const microEnabled = fxMicro.enabled !== undefined ? !!fxMicro.enabled : true;
      const microBlocked = !microEnabled || !!runtime.isFramePlaying || !!runtime.isCameraAuto;

      if (microBlocked || mode !== "micro") {
        uiState.microState = null;
      } else {
        const prevMicro = uiState.microState ?? null;

        let nextMicro = normalizeMicro(prevMicro, {
          mode,
          selection: selForMicro,
          structIndex,
          visibleSet: canonicalVisibleSet,
        });

        nextMicro = computeMicroIfNeeded({
          mode,
          selection: selForMicro,
          nextMicro,
          microController,
          cameraState: uiState.cameraState,
          structIndex,
        });

        const k = inferKindFromSelection(selForMicro, nextMicro, structIndex);
        nextMicro = ensureMicroAlignedToSelection(nextMicro, selForMicro, k);

        uiState.microState = nextMicro;
      }

      // 任意：microController が副作用持つならここで 1 回だけ
      if (microController && typeof microController.refresh === "function") {
        microController.refresh("recompute");
      }

      return canonicalVisibleSet;
    } finally {
      _inRecompute = false;
    }
  };
}
