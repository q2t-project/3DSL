import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../schema/threeDSS.schema.json';

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
  $data: true
});
addFormats(ajv);

const validate = ajv.compile(schema);

export function validateModel(data) {
  const valid = validate(data);
  return {
    valid,
    errors: valid ? [] : validate.errors ?? []
  };
}

export function getValidator() {
  return validate;
}

export default ajv;