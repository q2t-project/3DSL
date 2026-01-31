import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// Bundle entry for browser Ajv (+formats).
export default function createAjv(opts = {}) {
  const ajv = new Ajv(opts);
  addFormats(ajv); // uuid / uri / uri-reference などを登録
  return ajv;
}
