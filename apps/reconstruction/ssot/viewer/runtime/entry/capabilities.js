// viewer/runtime/entry/capabilities.js
// Capability/Add-on contracts live in ENTRY layer (not runtime/core).

/**
 * @typedef {Object} ViewerAddonContext
 * @property {any} hub
 * @property {any} core
 * @property {any} renderer
 * @property {ViewerCapabilities} capabilities
 */

/**
 * @typedef {Object} ViewerAddon
 * @property {string} id
 * @property {(ctx:ViewerAddonContext)=> (void|(()=>void))} mount
 */

/**
 * @typedef {Object} ViewerCapabilities
 * @property {(addon:ViewerAddon)=>void} registerAddon
 * @property {()=>ViewerAddon[]} listAddons
 */

/**
 * Public (default) capabilities.
 * - Holds addons only. No premium branching.
 * @returns {ViewerCapabilities}
 */
export function createPublicCapabilities() {
  /** @type {ViewerAddon[]} */
  const addons = [];

  return {
    registerAddon(addon) {
      if (!addon || typeof addon !== "object") return;
      if (typeof addon.id !== "string" || addon.id.length === 0) return;
      if (typeof addon.mount !== "function") return;
      addons.push(addon);
    },
    listAddons() {
      return addons.slice();
    },
  };
}

/**
 * Mount all addons in registration order.
 * - Exceptions are logged (not swallowed silently).
 * @param {ViewerCapabilities} capabilities
 * @param {{hub:any, core:any, renderer:any, capabilities:ViewerCapabilities}} ctx
 * @returns {Array<()=>void>} unmounters
 */
export function mountAddons(capabilities, ctx) {
  /** @type {Array<()=>void>} */
  const unmounters = [];
  try {
    const list =
      capabilities && typeof capabilities.listAddons === "function"
        ? capabilities.listAddons()
        : [];
    for (const addon of list) {
      if (!addon || typeof addon.mount !== "function") continue;
      try {
        const r = addon.mount(ctx);
        if (typeof r === "function") unmounters.push(r);
      } catch (e) {
        console.warn("[viewer] addon mount failed:", addon?.id, e);
      }
    }
  } catch (e) {
    console.warn("[viewer] mountAddons failed:", e);
  }
  return unmounters;
}
