let counter = 0;

export function generateId(prefix = 'node') {
  counter += 1;
  return `${prefix}-${counter}`;
}
