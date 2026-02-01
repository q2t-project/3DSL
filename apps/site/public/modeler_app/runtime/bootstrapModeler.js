// modeler/runtime/bootstrapModeler.js
// Entry layer: keep the public port surface stable.
// This file must remain a thin wrapper so host can only talk to entry.

import { createModelerHub, createModelerHubFromUrl } from "./modelerHub.js";

/**
 * Port: entry.bootstrapModeler
 * @param {HTMLElement|string} rootElOrId
 * @param {Object} [options]
 * @returns {any} hub
 */
export function bootstrapModeler(rootElOrId, options = {}) {
  return createModelerHub(rootElOrId, options);
}

/**
 * Convenience (not in manifest yet):
 * bootstrap + fetch document + set core.document
 */
export async function bootstrapModelerFromUrl(rootElOrId, url, options = {}) {
  return createModelerHubFromUrl(rootElOrId, url, options);
}
