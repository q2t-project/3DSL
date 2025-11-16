// common の validator をラップするだけのスケルトン

import { validate3Dss } from "../../common/validator/threeDssValidator.js";

export function validateModelerDocument(doc, overrideValidator) {
  if (typeof overrideValidator === 'function') {
    const ok = overrideValidator(doc);
    return { ok, errors: ok ? null : overrideValidator.errors ?? [] };
  }
  return validate3Dss(doc);
}
