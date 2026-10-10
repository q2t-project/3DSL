// Read-only indexes for ordinary Modeler exploration. Scope never changes the document.
export const EXPLORATION_PAGE_SIZE = 100;

export function elementUuid(node) { return String(node?.meta?.uuid || node?.uuid || ""); }
export function plainText(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return String(value.ja ?? value.en ?? Object.values(value).find((v) => typeof v === "string") ?? "");
  return "";
}
export function elementLabel(node) {
  return plainText(node?.signification?.name) || plainText(node?.signification?.caption) || plainText(node?.appearance?.caption_text?.content)
    || plainText(node?.appearance?.marker?.text?.content) || plainText(node?.name) || "(名称なし)";
}
export function endpointRef(endpoint) {
  if (typeof endpoint === "string") return endpoint;
  return String(endpoint?.ref ?? endpoint?.uuid ?? endpoint?.id ?? "");
}
export function elementFrames(node) {
  const raw = node?.appearance?.frames ?? node?.frames;
  if (raw == null) return null;
  return (Array.isArray(raw) ? raw : [raw]).map(Number).filter(Number.isInteger);
}
export function frameAllows(node, frame) {
  const frames = elementFrames(node);
  return frames === null || frames.includes(Number(frame));
}
export function indexExploration(doc) {
  const lists = { points: [], lines: [], aux: [] };
  const byUuid = new Map();
  const neighbours = new Map();
  const frames = new Set([0]);
  for (const kind of Object.keys(lists)) {
    for (const [index, node] of (Array.isArray(doc?.[kind]) ? doc[kind] : []).entries()) {
      const uuid = elementUuid(node);
      if (!uuid) continue;
      const label = elementLabel(node);
      const search = [uuid, label, plainText(node?.signification?.name), plainText(node?.signification?.caption), plainText(node?.appearance?.marker?.text?.content), plainText(node?.appearance?.caption_text?.content)].join(" ").toLocaleLowerCase();
      const row = { node, index, uuid, label, kind, search };
      lists[kind].push(row);
      byUuid.set(uuid, row);
      neighbours.set(uuid, new Set());
      for (const frame of elementFrames(node) || []) frames.add(frame);
    }
  }
  for (const row of lists.lines) {
    const ends = ["end_a", "end_b"].map((key) => endpointRef(row.node?.appearance?.[key] ?? row.node?.[key])).filter((uuid) => byUuid.has(uuid));
    for (const uuid of ends) {
      neighbours.get(row.uuid).add(uuid);
      neighbours.get(uuid).add(row.uuid);
      for (const other of ends) if (other !== uuid) neighbours.get(uuid).add(other);
    }
  }
  return { lists, byUuid, neighbours, frames: [...frames].sort((a, b) => a - b) };
}
export function scopeUuids(index, scope, outliner = {}) {
  if (!scope || scope.type === "all") return null;
  if (scope.type === "frame") return new Set([...index.byUuid.values()].filter((row) => frameAllows(row.node, scope.frame)).map((row) => row.uuid));
  if (scope.type === "related") {
    const ids = new Set();
    const seeds = new Set(scope.seeds || []);
    // Only supplied author-declared same-target occurrence mappings are followed.
    for (const seed of [...seeds]) for (const other of index.correspondences?.get(seed) || []) if (index.byUuid.has(other)) seeds.add(other);
    for (const seed of seeds) {
      if (index.byUuid.has(seed)) ids.add(seed);
      for (const other of index.neighbours.get(seed) || []) ids.add(other);
    }
    // Expand the reached target's labels/anchors, without taking another graph hop.
    for (const uuid of [...ids]) for (const other of index.correspondences?.get(uuid) || []) if (index.byUuid.has(other)) ids.add(other);
    return ids;
  }
  if (scope.type === "group") {
    const groupIds = new Set([scope.id]);
    // Explicit UI groups only. No inferred grouping by name or geometric proximity.
    let added = true;
    while (added) {
      added = false;
      for (const group of outliner.groups || []) if (groupIds.has(group.parentId) && !groupIds.has(group.id)) { groupIds.add(group.id); added = true; }
    }
    return new Set(Object.entries(outliner.itemToGroup || {}).filter(([uuid, group]) => index.byUuid.has(uuid) && groupIds.has(group)).map(([uuid]) => uuid));
  }
  return new Set();
}
export function explorationRows(index, { scope = { type: "all" }, query = "", pages = {} } = {}, kind, outliner = {}, pageSize = EXPLORATION_PAGE_SIZE) {
  const allowed = scopeUuids(index, scope, outliner);
  const words = String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const all = (index.lists[kind] || []).filter((row) => (!allowed || allowed.has(row.uuid)) && words.every((word) => row.search.includes(word)));
  const pagesCount = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.max(0, Math.min(pagesCount - 1, Math.trunc(pages[kind] || 0)));
  const rows = all.slice(page * pageSize, (page + 1) * pageSize);
  return { rows, all, total: all.length, page, pages: pagesCount, pageSize, remaining: Math.max(0, all.length - (page + 1) * pageSize) };
}
export function selectionReasons(index, uuid, state, { frameIndex = 0, hidden = [], solo = null, outliner = {} } = {}) {
  const row = index.byUuid.get(uuid);
  if (!row) return ["この図に出現なし"];
  const reasons = [];
  if (!frameAllows(row.node, frameIndex)) reasons.push(`表示 ${frameIndex} に所属なし`);
  if (row.node?.appearance?.visible === false) reasons.push("作品で非表示");
  if (hidden.includes(uuid)) reasons.push("手動で非表示");
  if (solo && solo !== uuid) reasons.push("別要素の単独表示中");
  const allowed = scopeUuids(index, state.scope, outliner);
  if (allowed && !allowed.has(uuid)) reasons.push("探索範囲外");
  const words = String(state.query || "").trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((word) => row.search.includes(word))) reasons.push("検索条件外");
  const page = explorationRows(index, state, row.kind, outliner);
  if (page.all.some((entry) => entry.uuid === uuid) && !page.rows.some((entry) => entry.uuid === uuid)) reasons.push("別ページ");
  if (row.kind === "points" && !(Array.isArray(row.node?.appearance?.position) && row.node.appearance.position.length === 3)) reasons.push("座標未設定（要修正）");
  return reasons;
}
