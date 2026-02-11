// viewer/ssot/premium/premiumCapabilities.js
// Premium capabilities live OUTSIDE viewer runtime/core.
// In P4 we keep it minimal; real features will be added in P5+ as addons.

import { createPublicCapabilities } from "../runtime/entry/capabilities.js";

export function createPremiumCapabilities() {
  // Start from public capabilities to keep the surface identical.
  const caps = createPublicCapabilities();
  // Future: attach premium-specific capability APIs here (no core changes).
  return caps;
}
