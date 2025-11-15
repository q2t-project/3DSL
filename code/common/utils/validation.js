import { ValidationError } from '../errors/index.js';

export function ensureSchemaPresence(schemaName, payload) {
  if (!schemaName) {
    throw new ValidationError('Schema name is required for validation');
  }

  if (payload == null) {
    throw new ValidationError(`Payload is required for schema ${schemaName}`);
  }

  // Placeholder for future schema validation logic
  return true;
}
