// Library index parsing/filtering contract shared by Astro code and Node checks.
// Keep this module side-effect free so resilience behavior can be tested without Astro.

export const LIBRARY_INDEX_CODE = Object.freeze({
  OK: "OK",
  MISSING: "MISSING",
  INVALID_JSON: "INVALID_JSON",
  INVALID_SHAPE: "INVALID_SHAPE",
});

export function parseLibraryIndexRaw(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return {
      ok: false,
      code: LIBRARY_INDEX_CODE.MISSING,
      index: { version: 0, items: [] },
      items: [],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      code: LIBRARY_INDEX_CODE.INVALID_JSON,
      index: { version: 0, items: [] },
      items: [],
    };
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    return {
      ok: false,
      code: LIBRARY_INDEX_CODE.INVALID_SHAPE,
      index: { version: Number(parsed?.version) || 0, items: [] },
      items: [],
    };
  }

  return {
    ok: true,
    code: LIBRARY_INDEX_CODE.OK,
    index: parsed,
    items: parsed.items,
  };
}

export function isRelease1VisibleItem(item) {
  return !!(
    item &&
    typeof item === "object" &&
    item?.release1?.included === true &&
    item?.hidden !== true
  );
}

export function filterRelease1Items(items) {
  return (Array.isArray(items) ? items : []).filter(isRelease1VisibleItem);
}
