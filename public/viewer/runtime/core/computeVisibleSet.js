// viewer/runtime/core/computeVisibleSet.js

const VALID_KINDS = new Set(["points", "lines", "aux"]);

function asBool(v, dflt) {
  return typeof v === "boolean" ? v : dflt;
}

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeFrameIndex(activeFrame) {
  if (activeFrame == null) return null;
  const n = toFiniteNumber(activeFrame);
  return n == null ? null : Math.trunc(n);
}

function getItem(structIndex, uuid) {
  if (!structIndex || !uuid) return null;

  if (typeof structIndex.getItem === "function") {
    return structIndex.getItem(uuid);
  }
  if (structIndex.byUuid instanceof Map) {
    return structIndex.byUuid.get(uuid) || null;
  }
  if (structIndex.uuidToItem instanceof Map) {
    return structIndex.uuidToItem.get(uuid)?.item || null;
  }
  return (
    structIndex.byUuid?.[uuid] ||
    structIndex.uuidToItem?.[uuid]?.item ||
    structIndex.map?.[uuid] ||
    null
  );
}

// ---------------- isVisibleOnFrame ----------------

function isVisibleFlag(el) {
  const v = el?.appearance?.visible ?? el?.visible;
  return v !== false;
}

function isVisibleOnFrame(el, activeFrame) {
  if (!el) return true;
  if (activeFrame == null) return true;

  const frame = Number(activeFrame);
  if (!Number.isFinite(frame)) return true;

  const app = el.appearance || {};
  const framesRaw = app.frames ?? el.frames;

  if (Array.isArray(framesRaw)) {
    if (framesRaw.length === 0) return true;
    let hasValid = false;
    for (const v of framesRaw) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      hasValid = true;
      if (n === frame) return true;
    }
    return hasValid ? false : true;
  }

  if (framesRaw !== undefined && framesRaw !== null) {
    const n = Number(framesRaw);
    if (Number.isFinite(n)) return n === frame;
  }

  const single = app.frame ?? el.frame;
  if (single !== undefined && single !== null) {
    const n = Number(single);
    if (Number.isFinite(n)) return n === frame;
  }

  const fr =
    app.frame_range ||
    app.frameRange ||
    el.frame_range ||
    el.frameRange ||
    null;

  if (fr && typeof fr === "object") {
    const minRaw = fr.min ?? fr.start ?? null;
    const maxRaw = fr.max ?? fr.end ?? null;
    const aNum = toFiniteNumber(minRaw);
    const bNum = toFiniteNumber(maxRaw);
    const a = aNum == null ? -Infinity : aNum;
    const b = bNum == null ? Infinity : bNum;
    if (aNum != null || bNum != null) return frame >= a && frame <= b;
  }

  const a0 = app.frame_start ?? el.frame_start;
  const b0 = app.frame_end ?? el.frame_end;

  const aNum = toFiniteNumber(a0);
  const bNum = toFiniteNumber(b0);
  if (aNum != null || bNum != null) {
    const a = aNum == null ? -Infinity : aNum;
    const b = bNum == null ? Infinity : bNum;
    return frame >= a && frame <= b;
  }

  return true;
}

// ---------------- computeVisibleSet ----------------

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
  const fi = si?.frameIndex;
  const wof = si?.uuidsWithoutFramesByKind;

  // --- fast base: frameIndex + wof + getItem 手段 ---
  const canFastBase =
    fi?.points instanceof Map &&
    fi?.lines instanceof Map &&
    fi?.aux instanceof Map &&
    wof?.points instanceof Set &&
    wof?.lines instanceof Set &&
    wof?.aux instanceof Set &&
    (typeof si?.getItem === "function" ||
      si?.byUuid instanceof Map ||
      si?.uuidToItem instanceof Map);

  // --- full fast: allFrameIndexUuidsByKind が 3種揃ってる ---
  const afi = si?.allFrameIndexUuidsByKind;
  const hasAllFrameUnion =
    afi?.points instanceof Set &&
    afi?.lines instanceof Set &&
    afi?.aux instanceof Set;

  const canFastFull = canFastBase && hasAllFrameUnion;
  const canFastCompat = canFastBase && !hasAllFrameUnion;

  const frame = normalizeFrameIndex(activeFrame);
  const hasFrame = frame != null;

  // ------------------------------------------------------------
  // 完全高速パス（union 構築なし）
  // ------------------------------------------------------------
  if (canFastFull) {
    const fillKind = (kind, allow) => {
      if (!allow) return;
      if (!VALID_KINDS.has(kind)) return;

      const dst = out[kind];

      // frames 指定あり（frameIndex）
      if (!hasFrame) {
        // ★ structIndex 側で作った union をそのまま使う
        for (const uuid of afi[kind]) {
          const node = getItem(si, uuid);
          if (!node) continue;
          if (!isVisibleFlag(node)) continue;
          dst.add(uuid);
          out.all.add(uuid);
        }
      } else {
        const fromFrame = fi[kind].get(frame);
        if (fromFrame instanceof Set) {
          for (const uuid of fromFrame) {
            const node = getItem(si, uuid);
            if (!node) continue;
            if (!isVisibleFlag(node)) continue;
            if (!isVisibleOnFrame(node, frame)) continue;
            dst.add(uuid);
            out.all.add(uuid);
          }
        }
      }

      // frames 指定なし（全フレーム共通）
      for (const uuid of wof[kind]) {
        const node = getItem(si, uuid);
        if (!node) continue;
        if (!isVisibleFlag(node)) continue;
        if (hasFrame && !isVisibleOnFrame(node, frame)) continue;
        dst.add(uuid);
        out.all.add(uuid);
      }
    };

    fillKind("points", allowPoints);
    fillKind("lines", allowLines);
    fillKind("aux", allowAux);
    return out;
  }

  // ------------------------------------------------------------
  // 互換フォールバック（union を毎回構築）
  // ------------------------------------------------------------
  if (canFastCompat) {
    const buildUnionFromFrameIndex = (m) => {
      const u = new Set();
      for (const set of m.values()) {
        if (!(set instanceof Set)) continue;
        for (const uuid of set) u.add(uuid);
      }
      return u;
    };

    const fillKind = (kind, allow) => {
      if (!allow) return;
      if (!VALID_KINDS.has(kind)) return;

      const dst = out[kind];

      if (!hasFrame) {
        const src = buildUnionFromFrameIndex(fi[kind]);
        for (const uuid of src) {
          const node = getItem(si, uuid);
          if (!node) continue;
          if (!isVisibleFlag(node)) continue;
          dst.add(uuid);
          out.all.add(uuid);
        }
      } else {
        const fromFrame = fi[kind].get(frame);
        if (fromFrame instanceof Set) {
          for (const uuid of fromFrame) {
            const node = getItem(si, uuid);
            if (!node) continue;
            if (!isVisibleFlag(node)) continue;
            if (!isVisibleOnFrame(node, frame)) continue;
            dst.add(uuid);
            out.all.add(uuid);
          }
        }
      }

      for (const uuid of wof[kind]) {
        const node = getItem(si, uuid);
        if (!node) continue;
        if (!isVisibleFlag(node)) continue;
        if (hasFrame && !isVisibleOnFrame(node, frame)) continue;
        dst.add(uuid);
        out.all.add(uuid);
      }
    };

    fillKind("points", allowPoints);
    fillKind("lines", allowLines);
    fillKind("aux", allowAux);
    return out;
  }

  // ------------------------------------------------------------
  // 最終フォールバック: model 配列スキャン
  // ------------------------------------------------------------
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
