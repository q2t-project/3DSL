export class Base3DSLError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = this.constructor.name;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ValidationError extends Base3DSLError {}

export class InvariantError extends Base3DSLError {}
