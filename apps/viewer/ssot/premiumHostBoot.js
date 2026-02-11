// premiumHostBoot.js
// Premium host bootstrap for /viewer/premium.html
//
// P4 DoD:
// - Construct viewer from SAME core/runtime
// - Inject premium capabilities + 1 dummy addon
// - No premium branching inside core

import { mountViewerHost } from "./viewerHost.js";
import { createPremiumCapabilities } from "./premium/premiumCapabilities.js";
import { createPremiumDummyAddon } from "./premium/premiumDummyAddon.js";

// Reuse URL parsing logic (minimal)
function getParam(name) {
  try { return new URL(location.href).searchParams.get(name); } catch { return null; }
}

const modelUrl = getParam("model") || undefined;
const title = getParam("title") || "";

const capabilities = createPremiumCapabilities();
capabilities.registerAddon(createPremiumDummyAddon());

mountViewerHost({
  modelUrl,
  modelLabel: title || undefined,
  profile: "prod_full",
  devBootLog: false,
  capabilities,
});
