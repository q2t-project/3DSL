// site/src/premium/viewer/premiumCapabilities.js
// Premium capabilities live in SITE layer (not viewer runtime/core).
// P4: minimal implementation, mirrors the ViewerCapabilities contract.

 /**
  * @typedef {Object} ViewerAddon
  * @property {string} id
  * @property {(ctx:any)=>(void|(()=>void))} mount
  */

 /**
  * @typedef {Object} ViewerCapabilities
  * @property {(addon:ViewerAddon)=>void} registerAddon
  * @property {()=>ViewerAddon[]} listAddons
  */

export function createPremiumCapabilities() {
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
