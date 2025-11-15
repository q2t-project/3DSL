// common の validator をラップするだけのスケルトン

import { validate3DSS } from "../../common/validator/threeDssValidator.js";

/**
 * @param {import("../../common/core/modelTypes.js").ThreeDSSDocument} doc
 * @param {(doc: unknown) => boolean} validateFn
 */
export function validateModelerDocument(doc, validateFn) {
  return validate3DSS(doc, validateFn);
}
