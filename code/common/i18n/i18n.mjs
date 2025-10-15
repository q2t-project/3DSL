const OWN = Object.prototype.hasOwnProperty;

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function normalizeValue(value) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function resolveValue(container, key) {
  if (!container) {
    return undefined;
  }

  if (Array.isArray(container)) {
    for (const entry of container) {
      const resolved = resolveValue(entry, key);
      if (resolved !== undefined) {
        return resolved;
      }
    }
    return undefined;
  }

  if (container instanceof Map) {
    if (container.has(key)) {
      return normalizeValue(container.get(key));
    }
    return undefined;
  }

  if (typeof container === "function") {
    try {
      return normalizeValue(container(key));
    } catch (error) {
      return undefined;
    }
  }

  if (isObject(container) && OWN.call(container, key)) {
    return normalizeValue(container[key]);
  }

  return undefined;
}

const NESTED_COLLECTION_KEYS = ["translations", "locales", "languages", "fallbacks"];

function getLanguageContainer(dictionary, language) {
  if (!dictionary || typeof language !== "string") {
    return undefined;
  }

  const code = language.trim();
  if (!code) {
    return undefined;
  }

  if (dictionary instanceof Map) {
    if (dictionary.has(code)) {
      return dictionary.get(code);
    }

    for (const key of NESTED_COLLECTION_KEYS) {
      if (dictionary.has(key)) {
        const nested = dictionary.get(key);
        const result = getLanguageContainer(nested, code);
        if (result !== undefined) {
          return result;
        }
      }
    }

    return undefined;
  }

  if (Array.isArray(dictionary)) {
    for (const entry of dictionary) {
      const result = getLanguageContainer(entry, code);
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  }

  if (isObject(dictionary)) {
    if (OWN.call(dictionary, code)) {
      return dictionary[code];
    }

    for (const key of NESTED_COLLECTION_KEYS) {
      if (OWN.call(dictionary, key)) {
        const result = getLanguageContainer(dictionary[key], code);
        if (result !== undefined) {
          return result;
        }
      }
    }
  }

  return undefined;
}

function expandLanguageCodes(input) {
  if (typeof input !== "string") {
    return [];
  }

  const normalized = input.trim();
  if (!normalized) {
    return [];
  }

  const sanitized = normalized.replace(/_/g, "-");
  const segments = sanitized.split("-");
  const codes = [];

  for (let index = segments.length; index > 0; index -= 1) {
    const candidate = segments.slice(0, index).join("-");
    if (candidate && !codes.includes(candidate)) {
      codes.push(candidate);
    }
  }

  return codes;
}

function collectLanguageFallbacks(dictionary, options) {
  const set = new Set();

  const queue = [
    options?.language,
    options?.languages,
    options?.locale,
    options?.locales,
    options?.preferredLanguages,
    options?.fallbackLanguage,
    options?.fallbackLanguages,
    options?.fallbackLocale,
    options?.fallbackLocales,
    options?.fallback,
    options?.fallbacks,
    options?.defaultLanguage,
    options?.defaultLocale,
    options?.fallbackKey,
    options?.primaryLanguage,
  ];

  for (const entry of queue) {
    if (Array.isArray(entry)) {
      for (const value of entry) {
        for (const code of expandLanguageCodes(value)) {
          set.add(code);
        }
      }
      continue;
    }

    if (typeof entry === "string") {
      for (const code of expandLanguageCodes(entry)) {
        set.add(code);
      }
    }
  }

  if (isObject(dictionary)) {
    if (OWN.call(dictionary, "default")) {
      set.add("default");
    }
    if (OWN.call(dictionary, "fallback")) {
      set.add("fallback");
    }
  }

  set.add("default");

  return Array.from(set);
}

function collectFallbackContainers(dictionary, options) {
  const containers = [];

  if (isObject(dictionary) && Array.isArray(dictionary.fallbacks)) {
    containers.push(...dictionary.fallbacks);
  }

  if (options && Array.isArray(options.dictionaries)) {
    containers.push(...options.dictionaries);
  }

  if (options && Array.isArray(options.fallbackDictionaries)) {
    containers.push(...options.fallbackDictionaries);
  }

  return containers;
}

export function t(key, dictionary = {}, options = {}) {
  if (typeof key !== "string" || key.length === 0) {
    return "";
  }

  const direct = resolveValue(dictionary, key);
  if (direct !== undefined) {
    return direct;
  }

  const fallbacks = collectLanguageFallbacks(dictionary, options);
  for (const language of fallbacks) {
    const container = getLanguageContainer(dictionary, language);
    const value = resolveValue(container, key);
    if (value !== undefined) {
      return value;
    }
  }

  const extraContainers = collectFallbackContainers(dictionary, options);
  for (const container of extraContainers) {
    const value = resolveValue(container, key);
    if (value !== undefined) {
      return value;
    }
  }

  const defaultValue = normalizeValue(options?.defaultValue ?? options?.fallbackValue);
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  return options?.fallbackToKey === false ? "" : key;
}

export default { t };
