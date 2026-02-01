// SSOT: packages/vendor/i18next/
//
// Minimal i18next-compatible API for the viewer UI.
// The UI only needs createInstance().init({ resources, lng, fallbackLng }) and t().
//
// Replace with the official i18next build if/when you vendor it.

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

function interpolate(str, vars) {
  if (!vars) return str;
  return String(str).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

function makeInstance() {
  const state = {
    lng: "en",
    fallbackLng: "en",
    resources: {},
  };

  return {
    async init(opts = {}) {
      state.lng = opts.lng ?? state.lng;
      state.fallbackLng = opts.fallbackLng ?? state.fallbackLng;
      state.resources = opts.resources ?? state.resources;
      return this;
    },

    t(key, options = {}) {
      const lng = options.lng ?? state.lng;
      const fb = options.fallbackLng ?? state.fallbackLng;

      const res =
        getByPath(state.resources?.[lng]?.translation, key) ??
        getByPath(state.resources?.[fb]?.translation, key);

      if (res == null) {
        if (options.defaultValue != null) return String(options.defaultValue);
        return String(key);
      }

      if (typeof res === "string") return interpolate(res, options);
      // non-string values are returned as-is; UI typically expects string keys only.
      return res;
    },
  };
}

const i18next = {
  createInstance() {
    return makeInstance();
  },
};

export default i18next;
