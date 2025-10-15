const UUID_PATTERN = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const URI_PATTERN = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isValidDate(value) {
  if (typeof value !== "string") {
    return false;
  }
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (month === 2 && isLeapYear) {
    return day <= 29;
  }
  return day <= DAYS_IN_MONTH[month];
}

function isValidUri(value) {
  if (typeof value !== "string") {
    return false;
  }
  return URI_PATTERN.test(value);
}

function isValidUuid(value) {
  if (typeof value !== "string") {
    return false;
  }
  return UUID_PATTERN.test(value);
}

export function registerDefaultFormats(ajv) {
  if (!ajv || typeof ajv.addFormat !== "function") {
    return ajv;
  }

  ajv.addFormat("uuid", {
    type: "string",
    validate: isValidUuid,
  });

  ajv.addFormat("uri", {
    type: "string",
    validate: isValidUri,
  });

  ajv.addFormat("date", {
    type: "string",
    validate: isValidDate,
  });

  return ajv;
}
