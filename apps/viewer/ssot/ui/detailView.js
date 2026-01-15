// viewer/ui/detailView.js

// 情報パネル（Detail View）
// - データソース: structIndex.uuidToItem
// - selection 状態と連動（hover は無視）
// - 読み取り専用（UI から model/uiState を直接書き換えない）

import { createHubFacade } from './hubFacade.js';

const DEBUG_DETAIL_VIEW = false;
function debugDetailView(...args) {
  if (!DEBUG_DETAIL_VIEW) return;
  // eslint-disable-next-line no-console
  console.log('[detailView]', ...args);
}

function resolveLocalizedText(value, preferredLocales = ['ja', 'en']) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  for (const loc of preferredLocales) {
    const v = value[loc];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  const keys = Object.keys(value);
  if (keys.length > 0 && typeof value[keys[0]] === 'string') {
    return value[keys[0]];
  }
  return '';
}

function formatUuidShort(uuid) {
  if (typeof uuid !== 'string') return '';
  if (uuid.length <= 8) return uuid;
  return uuid.slice(0, 8) + '…';
}

function valueToShortString(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  if (Array.isArray(v)) {
    return v.map((x) => valueToShortString(x)).join(', ');
  }
  if (typeof v === 'object') {
    const localized = resolveLocalizedText(v);
    if (localized) return localized;

    try {
      const s = JSON.stringify(v);
      return s.length > 80 ? s.slice(0, 77) + '...' : s;
    } catch {
      return '[object]';
    }
  }
  return String(v);
}

function summarizeRelation(rel) {
  if (!rel || typeof rel !== 'object') return '';

  // 配列で来た場合: 各要素を再帰で処理
  if (Array.isArray(rel)) {
    return rel
      .map((entry) => summarizeRelation(entry))
      .filter((s) => s && s.trim() !== '')
      .join('; ');
  }

  const parts = [];
  for (const [k, v] of Object.entries(rel)) {
    if (v == null || v === '') continue;

    let text;
    if (typeof v === 'string') {
      text = v;
    } else if (Array.isArray(v)) {
      text = v.map((x) => valueToShortString(x)).join(', ');
    } else if (typeof v === 'object') {
      // lang マップっぽいものは優先してローカライズ
      const localized = resolveLocalizedText(v);
      text = localized || valueToShortString(v);
    } else {
      text = String(v);
    }

    parts.push(`${k}: ${text}`);
  }
  return parts.join(', ');
}

function stringifyJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function buildPanelDom(container) {
  container.innerHTML = `
    <div class="detail-panel">
      <div class="detail-header">
        <div class="detail-kind"></div>
        <div class="detail-name"></div>
      </div>
      <div class="detail-body">
        <div class="detail-section detail-summary"></div>
        <pre class="detail-section detail-json"></pre>
      </div>
    </div>
  `;

  return {
    kindEl: container.querySelector('.detail-kind'),
    nameEl: container.querySelector('.detail-name'),
    summaryEl: container.querySelector('.detail-summary'),
    jsonEl: container.querySelector('.detail-json'),
  };
}

function renderEmpty(dom) {
  if (!dom) return;
  dom.kindEl.textContent = '';
  dom.nameEl.textContent = '';
  dom.summaryEl.innerHTML =
    "<div class='detail-row'><span class='detail-key'>(no selection)</span></div>";
  dom.jsonEl.textContent = '';
}

function renderItem(dom, kind, node) {
  if (!dom || !node) {
    renderEmpty(dom);
    return;
  }

  const sign = node.signification || {};
  const app = node.appearance || {};
  const meta = node.meta || {};

  const name = resolveLocalizedText(sign.name);
  dom.kindEl.textContent = kind ? kind.toUpperCase() : '';
  dom.nameEl.textContent = name || '(no name)';

  // summary 部を作り直す
  dom.summaryEl.innerHTML = '';

  const addRow = (key, val) => {
    if (val === undefined || val === null || val === '') return;
    const d = dom?.kindEl?.ownerDocument || document;
    const row = d.createElement('div');
    row.className = 'detail-row';

    const k = d.createElement('div');
    k.className = 'detail-key';
    k.textContent = key;

    const v = d.createElement('div');
    v.className = 'detail-value';
    v.textContent = valueToShortString(val);

    row.appendChild(k);
    row.appendChild(v);
    dom.summaryEl.appendChild(row);
  };

  // signification 系
  if (meta.uuid) {
    addRow('uuid', formatUuidShort(meta.uuid));
  }
  if (name) addRow('name', name);

  const descText = resolveLocalizedText(sign.description);
  const categoryText =
    typeof sign.category === 'object'
      ? resolveLocalizedText(sign.category)
      : valueToShortString(sign.category);

  const qualifierText =
    typeof sign.qualifier === 'object'
      ? resolveLocalizedText(sign.qualifier)
      : valueToShortString(sign.qualifier);

  if (descText) addRow('description', descText);
  if (categoryText) addRow('category', categoryText);
  if (qualifierText) addRow('qualifier', qualifierText);

  if (sign.relation) {
    const relText = summarizeRelation(sign.relation);
    if (relText) addRow('relation', relText);
  }

  // appearance 系
  if (app.frames !== undefined) addRow('frames', app.frames);

  if (kind === 'lines') {
    if (app.end_a) {
      if (Array.isArray(app.end_a.coord)) {
        // coord 指定 → 座標だけ
        addRow('end_a', app.end_a.coord);
      } else if (app.end_a.ref) {
        // points 指定 → UUID（短縮）
        addRow('end_a', formatUuidShort(app.end_a.ref));
      }
    }

    if (app.end_b) {
      if (Array.isArray(app.end_b.coord)) {
        addRow('end_b', app.end_b.coord);
      } else if (app.end_b.ref) {
        addRow('end_b', formatUuidShort(app.end_b.ref));
      }
    }

    if (app.line_type) addRow('line_type', app.line_type);
    if (app.line_style) addRow('line_style', app.line_style);
  }

  // その他 meta
  if (Array.isArray(meta.tags) && meta.tags.length > 0) {
    addRow('tags', meta.tags);
  }
  if (meta.creator_memo) {
    addRow('creator_memo', meta.creator_memo);
  }

  // JSON 全体
  dom.jsonEl.textContent = stringifyJson(node);
}

/**
 * attachDetailView
 * @param {HTMLElement} container #viewer-detail
 * @param {object} hub viewerHub
 * @returns {object} handle { dispose() }
 */
export function attachDetailView(container, hub) {
  if (!container) {
    console.warn('[detailView] container not found');
    return null;
  }
  if (!hub) {
    console.warn('[detailView] attachDetailView: hub missing');
    return null;
  }

  let hf = null;
  try {
    hf = createHubFacade(hub);
  } catch (e) {
    console.warn('[detailView] attachDetailView: hub facade unavailable; disabled');
    return null;
  }

  const dom = buildPanelDom(container);
  renderEmpty(dom);

  const structIndex = hf.getStructIndex();
  const selectionAPI = hf.getSelection();

  if (!structIndex || !structIndex.uuidToItem) {
    console.warn('[detailView] structIndex.uuidToItem not available');
  }

  let disposed = false;
  let rafId = 0;
  let lastUuid = null;

  function loop() {
    if (disposed) return;

    let curUuid = null;

    if (selectionAPI && typeof selectionAPI.get === 'function') {
      const sel = selectionAPI.get();
      if (sel && sel.uuid) {
        curUuid = sel.uuid;
      }
    }

    if (curUuid !== lastUuid) {
      lastUuid = curUuid;

      if (!curUuid || !structIndex || !structIndex.uuidToItem) {
        renderEmpty(dom);
      } else {
        const hit = structIndex.uuidToItem.get(curUuid);
        if (hit && hit.item) {
          renderItem(dom, hit.kind, hit.item);
        } else {
          // UUID はあるが doc 側に見つからない場合
          dom.kindEl.textContent = '';
          dom.nameEl.textContent = '';
          dom.summaryEl.innerHTML =
            "<div class='detail-row'><span class='detail-key'>selection</span><span class='detail-value'>UUID not found in structIndex</span></div>";
          dom.jsonEl.textContent = '';
        }
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);


  debugDetailView('attached');

  function detach() {
    if (disposed) return;
    disposed = true;
    if (rafId) {
      try {
        cancelAnimationFrame(rafId);
      } catch (_e) {}
      rafId = 0;
    }
  }

  return {
    detach,
    dispose: detach, // alias
  };
}
