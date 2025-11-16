import Ajv from '../../vendor/ajv/dist/ajv.bundle.js';
import addFormats from '../../vendor/ajv-formats/dist/index.js';
import threeDssSchema from '../../../schemas/3DSS.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(threeDssSchema);

function normalizeAjvError(error = {}) {
  return {
    message: error.message ?? '3DSS document is invalid',
    instancePath: error.instancePath ?? '',
    keyword: error.keyword,
    params: error.params,
  };
}

export function validate3Dss(doc) {
  const payload = doc ?? {};
  const ok = validate(payload);
  return {
    ok,
    errors: ok ? null : (validate.errors ?? []).map((error) => normalizeAjvError(error)),
  };
}

// TODO(spec): /specs/3DSD-common.md に validator 分離の補足を追加する
