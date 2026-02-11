// viewer_app_premium/premiumCapabilities.js
// Premium capability set (site-side). Core is not touched.

import { createPublicCapabilities } from "/viewer/runtime/entry/capabilities.js";

/**
 * Premium capabilities (P4 minimal).
 * - For now, same as public + addon slot.
 * - Future premium-only APIs can be added here without touching core.
 */
export function createPremiumCapabilities() {
  return createPublicCapabilities();
}
