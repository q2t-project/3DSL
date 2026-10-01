// ui/sidecarLocalContract.js
// G-SW-02 v1 contract: UI sidecar persistence is local-only and keyed by document UUID.

export function sidecarStorageKey(documentUuid) {
  const u = typeof documentUuid === "string" ? documentUuid.trim() : "";
  return u ? `modeler.sidecar.${u}` : null;
}

export function serializeLocalSidecar(payload) {
  if (!payload || typeof payload !== "object") return null;
  return JSON.stringify(payload);
}

export function parseLocalSidecar(raw) {
  if (typeof raw !== "string" || !raw) return null;
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === "object" ? parsed : null;
}
