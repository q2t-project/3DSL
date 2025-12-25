// viewer/runtime/core/computeVisibleSet.js
//
// Phase2: visibleSet computation (pure)
//
// フレーム可視判定（isVisibleOnFrame 系）はここに集約する。
// ＝ frame/frames/frameRange 系の解釈は computeVisibleSet だけが責務。

const VALID_KINDS = new Set(["points", "lines", "aux"]);

function asBool(v, dflt) {
  return typeof v === "boolean" ? v : dflt;
}

function getItem(structIndex, uuid) {
  if (!structIndex || !uuid) return null;

  if (typeof structIndex.getItem === "function") {
    return structIndex.getItem(uuid);
  }

  // Map 版
  if (structIndex.byUuid instanceof Map) {
    return structIndex.byUuid.get(uuid) || null;
  }
  if (structIndex.uuidToItem instanceof Map) {
    return structIndex.uuidToItem.get(uuid)?.item || null;
  }

  // Object 版（旧互換）
  return (
    structIndex.byUuid?.[uuid] ||
    structIndex.uuidToItem?.[uuid]?.item ||
    structIndex.map?.[uuid] ||
    null
  );
}

// ------------------------------------------------------------
// isVisibleOnFrame 系（ここに移管）
// ------------------------------------------------------------

function isVisibleFlag(el) {
  // v1.1.0: visible:false を非表示扱い（true/undefined は表示）
  const v = el?.appearance?.visible ?? el?.visible;
  return v !== false;
}

function isVisibleOnFrame(el, activeFrame) {
  if (!el) return true;
  if (activeFrame == null) return true;

  const frame = Number(activeFrame);
  if (!Number.isFinite(frame)) return true;

  const app = el.appearance || {};

  // frames（配列 or 単一値）
  const framesRaw = app.frames ?? el.frames;

  // frames: array
  if (Array.isArray(framesRaw)) {
    if (framesRaw.length === 0) return true; // 空配列は「指定無し」扱い

    let hasValid = false;
    for (const v of framesRaw) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      hasValid = true;
      if (n === frame) return true;
    }
    return hasValid ? false : true; // 全部無効値なら指定無し扱い
  }

  // frames: single value
  if (framesRaw !== undefined && framesRaw !== null) {
    const n = Number(framesRaw);
    if (Number.isFinite(n)) return n === frame;
    // 無効値は指定無し扱い
  }

  // frame: number
  const single = app.frame ?? el.frame;
  if (typeof single === "number") return single === frame;

  // frame_range / frameRange: {min,max} / {start,end}
  const fr =
    app.frame_range ||
    app.frameRange ||
    el.frame_range ||
    el.frameRange ||
    null;

  if (fr && typeof fr === "object") {
    const min = fr.min ?? fr.start ?? null;
    const max = fr.max ?? fr.end ?? null;

    const a = typeof min === "number" ? min : -Infinity;
    const b = typeof max === "number" ? max : Infinity;

    if (Number.isFinite(a) || Number.isFinite(b)) {
      return frame >= a && frame <= b;
    }
  }

  // frame_start / frame_end
  const a0 = app.frame_start ?? el.frame_start;
  const b0 = app.frame_end ?? el.frame_end;

  if (typeof a0 === "number" || typeof b0 === "number") {
    const a = typeof a0 === "number" ? a0 : -Infinity;
    const b = typeof b0 === "number" ? b0 : Infinity;
    return frame >= a && frame <= b;
  }

  return true; // 指定無しは全フレーム表示
}

// ------------------------------------------------------------
// computeVisibleSet (pure)
// ------------------------------------------------------------

/**
 * 純関数: visibleSet を計算する（frameIndex 最適化内蔵）
 *
 * return:
 *   {
 *     points:Set<string>, lines:Set<string>, aux:Set<string>, all:Set<string>,
 *     auxModules:{ grid:boolean, axis:boolean }
 *   }
 */
export function computeVisibleSet({ model, structIndex, activeFrame, filters }) {
  const types = (filters && (filters.types || filters)) || {};
  const allowPoints = asBool(types.points ?? filters?.points, true);
  const allowLines = asBool(types.lines ?? filters?.lines, true);
  const allowAux = asBool(types.aux ?? filters?.aux, true);

  const out = {
    points: new Set(),
    lines: new Set(),
    aux: new Set(),
    all: new Set(),
    auxModules: {
      grid: asBool(filters?.auxModules?.grid, false),
      axis: asBool(filters?.auxModules?.axis, false),
    },
  };

  const si = structIndex;

  // 最適化パス: frameIndex + uuidsWithoutFramesByKind + item取得手段 が揃ってる時
  const fi = si?.frameIndex;
  const wof = si?.uuidsWithoutFramesByKind;

  const canFast =
    fi?.points instanceof Map &&
    fi?.lines instanceof Map &&
    fi?.aux instanceof Map &&
    wof?.points instanceof Set &&
    wof?.lines instanceof Set &&
    wof?.aux instanceof Set &&
    (typeof si?.getItem === "function" ||
      si?.byUuid instanceof Map ||
      si?.uuidToItem instanceof Map);

  const n = Number(activeFrame);
  const frame = Number.isFinite(n) ? Math.trunc(n) : 0;

  if (canFast) {
    const fillKind = (kind, allow) => {
      if (!allow) return;
      if (!VALID_KINDS.has(kind)) return;

      const dst = out[kind];

      // frames 指定あり（frameIndex）
      const fromFrame = fi[kind].get(frame);
      if (fromFrame instanceof Set) {
        for (const uuid of fromFrame) {
          const node = getItem(si, uuid);
          if (!node) continue;
          if (!isVisibleFlag(node)) continue;
          if (!isVisibleOnFrame(node, frame)) continue; // range系混在の安全弁
          dst.add(uuid);
          out.all.add(uuid);
        }
      }

      // frames 指定なし（全フレーム共通）
      for (const uuid of wof[kind]) {
        const node = getItem(si, uuid);
        if (!node) continue;
        if (!isVisibleFlag(node)) continue;
        if (!isVisibleOnFrame(node, frame)) continue;
        dst.add(uuid);
        out.all.add(uuid);
      }
    };

    fillKind("points", allowPoints);
    fillKind("lines", allowLines);
    fillKind("aux", allowAux);

    return out;
  }

  // フォールバック: model 配列スキャン
  const getUuid = (node) => {
    const u = node?.meta?.uuid ?? node?.uuid;
    return typeof u === "string" && u ? u : null;
  };

  if (allowPoints && Array.isArray(model?.points)) {
    for (const p of model.points) {
      const uuid = getUuid(p);
      if (!uuid) continue;
      if (!isVisibleFlag(p)) continue;
      if (!isVisibleOnFrame(p, frame)) continue;
      out.points.add(uuid);
      out.all.add(uuid);
    }
  }

  if (allowLines && Array.isArray(model?.lines)) {
    for (const l of model.lines) {
      const uuid = getUuid(l);
      if (!uuid) continue;
      if (!isVisibleFlag(l)) continue;
      if (!isVisibleOnFrame(l, frame)) continue;
      out.lines.add(uuid);
      out.all.add(uuid);
    }
  }

  if (allowAux && Array.isArray(model?.aux)) {
    for (const a of model.aux) {
      const uuid = getUuid(a);
      if (!uuid) continue;
      if (!isVisibleFlag(a)) continue;
      if (!isVisibleOnFrame(a, frame)) continue;
      out.aux.add(uuid);
      out.all.add(uuid);
    }
  }

  return out;
}
