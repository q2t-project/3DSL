// Transport for the site host and legacy share/embed URLs. Validation, parsing
// and model replacement always go through the ordinary read-only controller.
export function modelFromSearch(params) {
  for (const key of ['model', 'open', 'work', 'scene', 'src']) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    // `src=library` is also used as provenance in shared links. Only a URL or
    // a JSON filename is a model source when this legacy key stands alone.
    if (key === 'src' && !/^(?:https?:|\.{0,2}\/)/i.test(value) && !/\.json(?:[?#]|$)/i.test(value)) continue;
    return value;
  }
  return null;
}

export function returnDestination(params, location) {
  for (const key of ['return', 'back']) {
    const raw = params.get(key);
    if (!raw) continue;
    try {
      const url = new URL(raw, location.origin);
      if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) continue;
      const scroll = params.get('scroll');
      if (key === 'return' && scroll && Number.isFinite(Number(scroll)) && Number(scroll) >= 0) {
        url.searchParams.set('scroll', String(Math.floor(Number(scroll))));
      }
      return url.href;
    } catch { /* Try the older back parameter when return is malformed. */ }
  }
  return null;
}

export function attachEntryInput({ openText, reportError, readDebugPose, win = window, fetchModel = fetch }) {
  const parent = win.parent !== win ? win.parent : null;
  const origin = win.location.origin;
  const params = new URLSearchParams(win.location.search);
  const canInspectPose = params.get('debugPose') === '1';
  let pending = null;

  function post(type, fields = {}) {
    parent?.postMessage({ type: `3dsl.viewer.${type}`, ...fields }, origin);
  }
  function cancel() {
    pending?.abort();
    pending = null;
  }
  function finish(result) {
    if (result?.ok) post('loadOk');
    else post('loadFail', { message: result?.error || '作品を開けませんでした。' });
    return result;
  }
  function failure(error) {
    reportError(error);
    return finish({ ok: false, error: String(error?.message || error) });
  }
  async function openUrl(raw) {
    cancel();
    const request = new AbortController();
    pending = request;
    post('loadStart');
    try {
      const url = new URL(raw, win.location.href);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new Error('作品の HTTP または HTTPS URL を指定してください。');
      }
      // Public URLs must allow CORS. Credentials are sent only to this origin.
      const response = await fetchModel(url.href, { cache: 'no-store', credentials: 'same-origin', signal: request.signal, referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error(`作品を取得できませんでした (HTTP ${response.status})。`);
      const text = await response.text();
      if (request.signal.aborted) return { ok: false, cancelled: true };
      const source = new URL(response.url || url.href);
      const label = params.get('title') || source.pathname.split('/').pop() || '作品';
      // Never put a capability token (or any other query/fragment) in the UI.
      source.search = ''; source.hash = '';
      const result = await openText(text, label, source.href);
      return request.signal.aborted ? { ok: false, cancelled: true } : finish(result);
    } catch (error) {
      if (request.signal.aborted) return { ok: false, cancelled: true };
      return failure(error);
    } finally {
      if (pending === request) pending = null;
    }
  }
  async function message(event) {
    if (!parent || event.source !== parent || event.origin !== origin) return;
    const data = event.data;
    if (data?.type === '3dsl.viewer.loadUrl' && typeof data.modelUrl === 'string' && data.modelUrl.trim()) {
      await openUrl(data.modelUrl);
    } else if (data?.type === '3dsl.viewer.loadDocument' && data.document3dss && typeof data.document3dss === 'object') {
      cancel();
      post('loadStart');
      try { finish(await openText(JSON.stringify(data.document3dss), data.label || 'ローカルの作品')); }
      catch (error) { failure(error); }
    } else if (canInspectPose && data?.type === '3DSL_GET_DEBUG_POSE') {
      const uuids = Array.isArray(data.uuids) ? data.uuids : [];
      parent.postMessage({ type: '3DSL_DEBUG_POSE', requestId: data.requestId, snapshot: readDebugPose({ uuids }) }, origin);
    }
  }
  win.addEventListener('message', message);
  post('hostReady');
  return { openUrl, cancel, dispose() { cancel(); win.removeEventListener('message', message); } };
}
