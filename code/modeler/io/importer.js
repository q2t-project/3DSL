import { Model } from '../../common/types/index.js';
import { ValidationError } from '../../common/errors/index.js';
import { ensureSchemaPresence, validateModelStructure } from '../../common/utils/index.js';

const DEFAULT_SCHEMA = '3dsl-core-model';

function parseInput(jsonInput) {
  if (typeof jsonInput === 'string') {
    const trimmed = jsonInput.trim();
    if (!trimmed) {
      throw new ValidationError('JSON input cannot be empty');
    }
    return JSON.parse(trimmed);
  }

  return jsonInput;
}

// code/modeler/io/importer.js
// 3DSS-prep.json を modeler 内部表現に変換する入口

/**
 * @param {unknown} prepJson
 * @returns {{
 *   ok: boolean,
 *   document?: import("../../common/core/modelTypes.js").ThreeDSSDocument,
 *   errors?: string[]
 * }}
 */
export function importFromPrep(prepJson) {
  // ここは後でちゃんと実装する。
  // 今は単に失敗を返しておく。
  return {
    ok: false,
    errors: ['prep importer is not implemented yet'],
  };
}


export function importModelFromJSON(jsonInput, { schemaName = DEFAULT_SCHEMA } = {}) {
  const payload = parseInput(jsonInput);
  ensureSchemaPresence(schemaName, payload);
  validateModelStructure(payload);
  return new Model(payload);
}
