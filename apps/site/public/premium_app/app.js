function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mdToHtml(md, slug, apiBase) {
  const lines = String(md ?? "").replace(/\r\n/g, "\n").split("\n");
  const out = [];

  const imgRe = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;
  const hRe = /^(#{1,6})\s+(.*)$/;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      out.push("");
      continue;
    }

    const hm = line.match(hRe);
    if (hm) {
      const lvl = hm[1].length;
      out.push(`<h${lvl}>${inline(mdInline(hm[2]))}</h${lvl}>`);
      continue;
    }

    const im = line.match(imgRe);
    if (im) {
      const alt = escapeHtml(im[1] || "");
      const p = (im[2] || "").trim();
      const url = resolveAssetUrl(p, slug, apiBase);
      out.push(`<p><img src="${escapeHtml(url)}" alt="${alt}" /></p>`);
      continue;
    }

    // fenced code blocks (very small)
    if (line.startsWith("```")) {
      const buf = [];
      // consume until next fence
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const idx = out.length;
        // we don't have access to iterator index easily; do a simple approach later
        break;
      }
      // fallback: treat as paragraph
    }

    out.push(`<p>${inline(mdInline(line))}</p>`);
  }

  return out.filter((s) => s !== "").join("\n");

  function inline(s) {
    return s;
  }
}

function mdInline(s) {
  // links: [text](url)
  return String(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const t = escapeHtml(text);
    const u = escapeHtml(url);
    return `<a href="${u}" rel="noopener">${t}</a>`;
  });
}

function resolveAssetUrl(path, slug, apiBase) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path;
  // minimal: assets/... -> /api/premium/asset/<slug>/assets/...
  const cleaned = path.replace(/^\.\/?/, "");
  return `${apiBase}/asset/${encodeURIComponent(slug)}/${cleaned}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { credentials: "include" });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { res, data, text };
}

function render(root, cfg) {
  root.innerHTML = "";
  const container = el("div", { class: "container" });

  const header = el("div", { class: "card" }, [
    el("div", { class: "body" }, [
      el("h1", { class: "title" }, ["Premium"]),
      el("div", { class: "muted" }, [`slug: ${cfg.slug || "(empty)"}`]),
    ]),
  ]);

  const grid = el("div", { class: "grid" });
  const left = el("div", { class: "card" }, [
    el("h2", {}, ["本文"]),
    el("div", { class: "body" }, [
      el("div", { class: "muted" }, ["読み込み中..."]),
    ]),
  ]);
  const right = el("div", { class: "card" }, [
    el("h2", {}, ["Viewer"]),
    el("div", { class: "body" }, [
      el("div", { class: "muted" }, ["読み込み中..."]),
    ]),
  ]);

  grid.appendChild(left);
  grid.appendChild(right);

  container.appendChild(header);
  container.appendChild(grid);
  root.appendChild(container);

  return { container, left, right };
}

async function main() {
  const cfg = globalThis.__PREMIUM__ || {};
  const root = document.querySelector("#premium-app") || document.body;
  const ui = render(root, cfg);

  const apiBase = String(cfg.apiBase || "/api/premium");
  const slug = String(cfg.slug || "");
  const mode = String(cfg.mode || "overview");

  // overview mode: do not attempt protected fetch
  if (mode !== "full") {
    ui.left.querySelector(".body").innerHTML = `
      <p class="muted">完全版は購入者向けやで。入場リンク（token）から入ると Cookie が発行されて表示できる。</p>
      <p class="muted">（すでに購入済みなら、token URL を一度踏んでからこのページを再読み込み）</p>
    `;
    ui.right.querySelector(".body").innerHTML = `
      <p class="muted">Viewer は購入者向け。</p>
    `;
    return;
  }

  // fetch meta
  const metaUrl = `${apiBase}/meta/${encodeURIComponent(slug)}`;
  const { res: metaRes, data: meta } = await fetchJson(metaUrl);

  if (metaRes.status === 401) {
    ui.left.querySelector(".body").innerHTML = `
      <p class="muted">未認可（401）。Cookie が無い/期限切れや。</p>
      <p><a href="/premium/${encodeURIComponent(slug)}">概要へ戻る</a></p>
    `;
    ui.right.querySelector(".body").innerHTML = `<p class="muted">Viewer は未認可。</p>`;
    return;
  }

  if (!metaRes.ok || !meta || meta.ok === false) {
    ui.left.querySelector(".body").innerHTML = `
      <p class="muted">meta の取得に失敗した。</p>
      <pre>${escapeHtml(String(metaRes.status))}</pre>
    `;
    ui.right.querySelector(".body").innerHTML = `<p class="muted">Viewer は停止。</p>`;
    return;
  }

  // header title
  const title = meta.title || meta.name || "Premium";
  ui.container.querySelector(".title").textContent = String(title);

  // attachments
  const assets = Array.isArray(meta.assets) ? meta.assets : [];
  const kv = el("div", { class: "kv" }, assets.map((a) => {
    const name = String(a.name || a.path || a || "");
    const path = String(a.path || a || "");
    const url = `${apiBase}/asset/${encodeURIComponent(slug)}/${path.replace(/^\/+/, "")}`;
    return el("a", { href: url }, [name || path]);
  }));

  // content
  const contentMd = String(meta.content_md || "");
  const html = mdToHtml(contentMd, slug, apiBase);
  ui.left.querySelector(".body").innerHTML = "";
  ui.left.querySelector(".body").appendChild(el("div", { class: "prose", html }));
  if (assets.length) {
    ui.left.querySelector(".body").appendChild(el("h3", {}, ["添付"]));
    ui.left.querySelector(".body").appendChild(kv);
  }

  // viewer iframe
  const modelUrl = `${apiBase}/model/${encodeURIComponent(slug)}`;
  const viewerPeek = String(cfg.viewerPeek || "/viewer/peek.html");
  const iframeSrc = `${viewerPeek}?model=${encodeURIComponent(modelUrl)}`;
  ui.right.querySelector(".body").innerHTML = "";
  ui.right.querySelector(".body").appendChild(el("iframe", { class: "viewer", src: iframeSrc, allow: "fullscreen" }));
  ui.right.querySelector(".body").appendChild(el("div", { class: "muted" }, ["モデル: ", modelUrl]));
}

main().catch((e) => {
  console.error(e);
  const root = document.querySelector("#premium-app") || document.body;
  const pre = document.createElement("pre");
  pre.textContent = String(e?.stack || e);
  root.appendChild(pre);
});
