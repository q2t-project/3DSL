// apps/viewer/ssot/ui/errorOverlay.js
//
// renderErrorOverlay(root, { publicCategory, devDetails, dev, publicMessages, actionHandlers, urls })
//
// - root: HTMLElement (e.g. document.body, viewer root div)
// - publicCategory: "PUBLIC_LOAD_ERROR" | "PUBLIC_SCHEMA_ERROR" | ...
// - devDetails: (optional) { errorCode, schemaUri, schemaVersion, validation, errorName, where }
// - dev: boolean (optional) true to show Dev詳細 (otherwise: dev=1 or localhost)
// - publicMessages: optional override map (SSOT注入用)
// - actionHandlers: optional override handlers per ACTION_*
// - urls: optional override urls for ACTION_VIEW_SPEC / ACTION_OPEN_SAMPLES / ACTION_GO_HOME
//
// Returns controller: { update(next), destroy() }

const DEFAULT_ACTION_LABELS = Object.freeze({
  ACTION_RELOAD: "再読み込み",
  ACTION_GO_HOME: "トップへ",
  ACTION_VIEW_SPEC: "3DSS仕様を見る",
  ACTION_OPEN_SAMPLES: "別のサンプルを見る",
});

// ✅ 契約固定（表示名じゃなくて Action ID の固定）
const DEFAULT_CATEGORY_ACTIONS = Object.freeze({
  PUBLIC_LOAD_ERROR: ["ACTION_RELOAD", "ACTION_GO_HOME"],
  PUBLIC_SCHEMA_ERROR: ["ACTION_VIEW_SPEC", "ACTION_OPEN_SAMPLES"],
  PUBLIC_INVALID_ERROR: ["ACTION_OPEN_SAMPLES"],
  PUBLIC_INTERNAL_ERROR: ["ACTION_RELOAD", "ACTION_GO_HOME"],
  PUBLIC_UNEXPECTED_ERROR: ["ACTION_RELOAD"],
});

function getT(opts, next) {
  const t = next?.t ?? opts?.t;
  if (typeof t === "function") return t;
  return (key, o) =>
    o && typeof o === "object" && "defaultValue" in o ? o.defaultValue : key;
}

function resolvePublicCategory(next, opts) {
  return next?.publicCategory ?? opts?.publicCategory ?? "PUBLIC_UNEXPECTED_ERROR";
}

function normalizeBody(v) {
  if (Array.isArray(v)) return v.map(x => String(x));
  if (v === undefined || v === null || v === "") return [];
  return [String(v)];
}

// publicMessages(SSOT注入) があれば最優先。なければ t() から組み立て。
function resolveMessage(publicCategory, t, publicMessages) {
  const pc = DEFAULT_CATEGORY_ACTIONS[publicCategory]
    ? publicCategory
    : "PUBLIC_UNEXPECTED_ERROR";

  const injected =
    publicMessages && typeof publicMessages === "object" ? publicMessages[pc] : null;

  const title = injected?.title ?? t(`errors.${pc}.title`, { defaultValue: "表示できませんでした" });

  let body =
    injected?.body ??
    t(`errors.${pc}.body`, { returnObjects: true, defaultValue: [] });
  body = normalizeBody(body);

  const note = injected?.note ?? t(`errors.${pc}.note`, { defaultValue: "" });

  const actions = Array.isArray(injected?.actions)
    ? injected.actions
    : DEFAULT_CATEGORY_ACTIONS[pc];

  return { title, body, note, actions };
}

function defaultIsDevMode() {
  try {
    const sp = new URLSearchParams(location.search);
    if (sp.get("dev") === "1") return true;
    const host = location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function ensureStyles(doc) {
  if (doc.querySelector('style[data-3dsl-error-overlay="1"]')) return;

  const style = doc.createElement("style");
  style.setAttribute("data-3dsl-error-overlay", "1");
  style.textContent = `
:root{
  --eo-bg:#0b0b0b;
  --eo-fg:#f2f2f2;
  --eo-muted:rgba(242,242,242,.72);
  --eo-link:#9ad;
  --eo-panel:rgba(255,255,255,.04);
  --eo-border:rgba(255,255,255,.12);
  --eo-btn:rgba(255,255,255,.06);
  --eo-btnHover:rgba(255,255,255,.10);
  --eo-focus:rgba(154,170,221,.55);
}
.eo-overlay{
  position:fixed; inset:0;
  display:grid; place-items:center;
  background:var(--eo-bg);
  color:var(--eo-fg);

  /* 既存UIに絶対負けない */
  z-index:2147483647;

  /* 下の操作へ落とさない */
  pointer-events:auto;
  touch-action:none;
  overscroll-behavior:contain;
}
.eo-box{
  width:min(720px, calc(100vw - 48px));
  padding:24px;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
}
.eo-panel{
  background:var(--eo-panel);
  border:1px solid var(--eo-border);
  border-radius:14px;
  padding:18px 18px 14px;
  box-shadow:0 10px 40px rgba(0,0,0,.35);
}
.eo-kicker{
  font-size:12px;
  letter-spacing:.04em;
  color:var(--eo-muted);
  margin:0 0 10px;
}
.eo-title{
  font-size:22px;
  margin:0 0 12px;
  line-height:1.25;
}
.eo-body{
  margin:0 0 14px;
  line-height:1.65;
}
.eo-body ul{margin:8px 0 0 20px; padding:0}
.eo-body li{margin:2px 0}
.eo-note{
  margin:10px 0 0;
  color:var(--eo-muted);
  font-size:12px;
}
.eo-actions{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-top:14px;
  padding-top:12px;
  border-top:1px solid var(--eo-border);
}
.eo-btn, .eo-link{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid var(--eo-border);
  background:var(--eo-btn);
  color:var(--eo-fg);
  font-size:14px;
  cursor:pointer;
  user-select:none;
  text-decoration:none;
}
.eo-btn:hover, .eo-link:hover{background:var(--eo-btnHover); text-decoration:none}
.eo-btn:focus, .eo-link:focus{outline:2px solid var(--eo-focus); outline-offset:2px}
.eo-primary{ border-color:rgba(154,170,221,.35); }
.eo-details{
  margin-top:14px;
  border-top:1px dashed rgba(255,255,255,.10);
  padding-top:12px;
}
.eo-summary{
  cursor:pointer;
  color:var(--eo-link);
  user-select:none;
}
.eo-devbox{
  margin-top:10px;
  background:rgba(0,0,0,.35);
  border:1px solid rgba(255,255,255,.10);
  border-radius:12px;
  padding:12px;
  color:rgba(242,242,242,.85);
  font-family:ui-monospace, Menlo, Consolas, "SFMono-Regular", monospace;
  font-size:12px;
  line-height:1.55;
  white-space:pre-wrap;
  overflow:auto;
  max-height:240px;
}
`;
  doc.head.appendChild(style);
}

function safeText(v) {
  return String(v ?? "").replace(/\r\n/g, "\n");
}

function formatDevDetails(devDetails) {
  if (!devDetails) return "";

  const lines = [];
  const push = (k, v) => {
    if (v === undefined || v === null || v === "") return;
    lines.push(`${k}: ${safeText(v)}`);
  };

  push("ErrorCode", devDetails.errorCode);
  push("schema_uri", devDetails.schemaUri);
  push("schema_version", devDetails.schemaVersion);

  // validation: string or string[]
  if (devDetails.validation) {
    const arr = Array.isArray(devDetails.validation)
      ? devDetails.validation
      : safeText(devDetails.validation).split("\n");

    const trimmed = arr.map(s => safeText(s).trim()).filter(Boolean).slice(0, 3);
    if (trimmed.length) {
      lines.push(`validation: ${trimmed[0]}`);
      for (let i = 1; i < trimmed.length; i++) lines.push(`           ${trimmed[i]}`);
    }
  }

  push("Error.name", devDetails.errorName);
  push("where", devDetails.where);

  return lines.join("\n");
}

function joinBase(base, p) {
  const b = String(base ?? "/");
  const path = String(p ?? "");
  if (!path) return b;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path; // 絶対パス優先
  const bb = b.endsWith("/") ? b : b + "/";
  return bb + path.replace(/^\/+/, "");
}

function normalizeBase(base) {
  const b = String(base ?? "/");
  if (!b || b === "/") return "/";
  return b.endsWith("/") ? b : b + "/";
}

function resolveUrls(urls) {
  const base = normalizeBase(urls?.base ?? "/");
  return {
    home: joinBase(base, urls?.home ?? ""),      // /3dsl/
    spec: joinBase(base, urls?.spec ?? "docs"),  // /3dsl/docs
    samples: joinBase(base, urls?.samples ?? "canonical"), // /3dsl/canonical
  };
}


export function renderErrorOverlay(root, opts) {
  if (!(root instanceof HTMLElement)) {
    throw new Error("renderErrorOverlay: root must be an HTMLElement");
  }
  const doc = root.ownerDocument || document;
  ensureStyles(doc);

  // 再描画できるように、同rootに既存overlayがあれば消す
  const prev = root.querySelector(":scope > .eo-overlay[data-eo-root-child='1']");
  if (prev) prev.remove();

  const overlay = doc.createElement("div");
  overlay.className = "eo-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("data-eo-root-child", "1");

  const uid = `eo-${Math.random().toString(36).slice(2, 10)}`;

  const box = doc.createElement("div");
  box.className = "eo-box";

  const kicker = doc.createElement("p");
  kicker.className = "eo-kicker";
  kicker.textContent = "3DSL Viewer";

  const panel = doc.createElement("div");
  panel.className = "eo-panel";

  const titleEl = doc.createElement("h1");
  titleEl.className = "eo-title";
  titleEl.id = `${uid}-title`;

  const bodyEl = doc.createElement("div");
  bodyEl.className = "eo-body";
  bodyEl.id = `${uid}-body`;

  const noteEl = doc.createElement("p");
  noteEl.className = "eo-note";
  noteEl.style.display = "none";
  noteEl.id = `${uid}-note`;

  // a11y: dialog -> title/body (+ noteは update() で必要時に追加)
  overlay.setAttribute("aria-labelledby", titleEl.id);
  overlay.setAttribute("aria-describedby", bodyEl.id);

  const actionsEl = doc.createElement("div");
  actionsEl.className = "eo-actions";

  const detailsEl = doc.createElement("details");
  detailsEl.className = "eo-details";
  detailsEl.style.display = "none";

  const summaryEl = doc.createElement("summary");
  summaryEl.className = "eo-summary";
  summaryEl.textContent = "Dev詳細";

  const devBoxEl = doc.createElement("div");
  devBoxEl.className = "eo-devbox";

  detailsEl.appendChild(summaryEl);
  detailsEl.appendChild(devBoxEl);

  panel.appendChild(titleEl);
  panel.appendChild(bodyEl);
  panel.appendChild(noteEl);
  panel.appendChild(actionsEl);
  panel.appendChild(detailsEl);

  box.appendChild(kicker);
  box.appendChild(panel);
  overlay.appendChild(box);

  // root直下に差し込む（fixed overlayやけど、DOM責務はrootに寄せる）
  root.appendChild(overlay);

  // ---- block background scroll/gesture while overlay is visible ----
  const prevOverflowHtml = doc.documentElement?.style?.overflow ?? "";
  const prevOverflowBody = doc.body?.style?.overflow ?? "";

  if (doc.documentElement) doc.documentElement.style.overflow = "hidden";
  if (doc.body) doc.body.style.overflow = "hidden";

  const onWheel = (e) => { e.preventDefault(); };
  const onTouchMove = (e) => { e.preventDefault(); };

  overlay.addEventListener("wheel", onWheel, { passive: false });
  overlay.addEventListener("touchmove", onTouchMove, { passive: false });

  const actionLabels = opts?.actionLabels || DEFAULT_ACTION_LABELS;
  const urls = resolveUrls(opts?.urls);

  const defaultHandlers = {
    ACTION_RELOAD: () => location.reload(),
    ACTION_GO_HOME: () => (location.href = urls.home),
    ACTION_VIEW_SPEC: () => (location.href = urls.spec),
    ACTION_OPEN_SAMPLES: () => (location.href = urls.samples),
  };

  const actionHandlers = { ...defaultHandlers, ...(opts?.actionHandlers || {}) };

  function renderBody(lines) {
    bodyEl.innerHTML = "";
    const ul = doc.createElement("ul");
    for (const line of lines) {
      const li = doc.createElement("li");
      li.textContent = line;
      ul.appendChild(li);
    }
    bodyEl.appendChild(ul);
  }

  const t0 = getT(opts, null);

  kicker.textContent = t0("ui.errorOverlay.kicker", { defaultValue: "3DSL Viewer" });
  summaryEl.textContent = t0("ui.errorOverlay.devDetails", { defaultValue: "Dev詳細" });

function makeAction(actionId, primary, t) {
  const label = t(`actions.${actionId}`, {
    defaultValue: actionLabels[actionId] ?? actionId,
  });

  const btn = doc.createElement("button");
  btn.type = "button";
  btn.className = "eo-btn" + (primary ? " eo-primary" : "");
  btn.textContent = label;
  btn.dataset.actionId = actionId;

  btn.addEventListener("click", () => {
    const fn = actionHandlers[actionId];
    if (typeof fn === "function") fn();
  });

  return btn;
}

function update(next) {
  const t = getT(opts, next);

  // 言語切替えた時も追従させたいなら update ごとに更新しとく
  kicker.textContent = t("ui.errorOverlay.kicker", { defaultValue: "3DSL Viewer" });
  summaryEl.textContent = t("ui.errorOverlay.devDetails", { defaultValue: "Dev詳細" });

  const publicCategory = resolvePublicCategory(next, opts);
  const pm = next?.publicMessages ?? opts?.publicMessages;
  const msg = resolveMessage(publicCategory, t, pm);

  titleEl.textContent = msg.title;
  renderBody(msg.body);

  if (msg.note) {
    noteEl.style.display = "block";
    noteEl.textContent = msg.note;
    overlay.setAttribute("aria-describedby", `${bodyEl.id} ${noteEl.id}`);
  } else {
    noteEl.style.display = "none";
    noteEl.textContent = "";
    overlay.setAttribute("aria-describedby", bodyEl.id);
  }

  actionsEl.innerHTML = "";
  msg.actions.forEach((actionId, idx) => {
    actionsEl.appendChild(makeAction(actionId, idx === 0, t));
  });

  const devOn = next?.dev ?? opts?.dev ?? defaultIsDevMode();
  if (devOn) {
    const text = formatDevDetails(next?.devDetails ?? opts?.devDetails);
    detailsEl.style.display = "block";
    devBoxEl.textContent = text || t("ui.errorOverlay.noDetails", { defaultValue: "(no details)" });
  } else {
    detailsEl.style.display = "none";
    devBoxEl.textContent = "";
  }

  const firstBtn = actionsEl.querySelector("button");
  if (firstBtn) firstBtn.focus();
}

  function destroy() {
    overlay.removeEventListener("wheel", onWheel);
    overlay.removeEventListener("touchmove", onTouchMove);

    if (doc.documentElement) doc.documentElement.style.overflow = prevOverflowHtml;
    if (doc.body) doc.body.style.overflow = prevOverflowBody;

    overlay.remove();
  }

  // 初期描画
  update(opts || {});

  return Object.freeze({ update, destroy, el: overlay });
}
