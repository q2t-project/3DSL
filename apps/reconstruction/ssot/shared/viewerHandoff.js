// A single in-memory, same-origin handoff. There is no persistence or live link
// to the Modeler document; only the immutable serialized text crosses the tab.
const CHANNEL = '3dsl.viewer-snapshot.v1';
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const DEFAULT_TIMEOUT = 30000;

const report = (callback, message) => { try { callback?.(message); } catch {} };
const errorText = error => String(error?.message ?? error).slice(0, 500);
function originOf(win) {
  const url = new URL(win.location.href);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin === 'null') {
    throw new Error('ローカルサーバーで起動した画面からViewerを開いてください。');
  }
  return url.origin;
}
function delayOf(options) {
  return Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT;
}
function tokenOf(win) {
  const bytes = new Uint8Array(32);
  if (!win.crypto?.getRandomValues) throw new Error('この環境では安全な受渡し用の識別子を作れません。');
  win.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

// This function intentionally is NOT async. Call it directly from the user's
// click handler so window.open retains the browser's user activation.
// ready always resolves with {ok,label?} or {ok:false,error}; it never rejects.
export function openViewerSnapshot({ text, label = '制作中の作品', onStatus } = {}, options = {}) {
  const win = options.window ?? globalThis.window;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let popup = null, origin = null, token = null, sent = false, done = false, timer = null, poll = null;
  const snapshot = typeof text === 'string' ? text : null;
  const snapshotLabel = typeof label === 'string' && label ? label : '制作中の作品';
  function post(type, extra = {}) {
    if (!popup || !origin || !token) return;
    try { popup.postMessage({ channel: CHANNEL, type, token, ...extra }, origin); } catch {}
  }
  function clean() {
    win?.removeEventListener?.('message', message);
    win?.removeEventListener?.('pagehide', leave);
    if (timer != null) win.clearTimeout(timer);
    if (poll != null) win.clearInterval(poll);
  }
  function finish(ok, error = null) {
    if (done) return;
    done = true;
    if (!ok) post('abort', { error });
    clean();
    report(onStatus, ok ? '制作中の写しをViewerで開きました。保存と自動同期はしていません。' : error);
    resolveReady(ok ? { ok: true, label: snapshotLabel } : { ok: false, error });
  }
  function message(event) {
    if (done || event.origin !== origin || event.source !== popup) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.token !== token) return;
    if (data.type === 'ready' && !sent) {
      sent = true;
      // Strings are immutable; later edits or changes to the caller's object
      // cannot affect this captured value, and no second snapshot is sent.
      try { popup.postMessage({ channel: CHANNEL, type: 'snapshot', token, text: snapshot, label: snapshotLabel }, origin); }
      catch { finish(false, 'Viewerへ制作中の写しを渡せませんでした。もう一度開いてください。'); }
    } else if (data.type === 'accepted' && sent) finish(true);
    else if (data.type === 'rejected') finish(false, `Viewerで開けませんでした: ${errorText(data.error || '読み取りに失敗しました。')}`);
  }
  function leave() { finish(false, '制作元の画面を閉じたため、写しの受渡しを中止しました。'); }
  try {
    if (!win) throw new Error('ブラウザーの画面からViewerを開いてください。');
    if (snapshot == null) throw new Error('Viewerへ渡す作品の文字列がありません。');
    origin = originOf(win); token = tokenOf(win);
    const url = new URL('/contract_viewer/index.html', win.location.href);
    url.searchParams.set('handoff', token);
    // Install the listener BEFORE opening the child: a fast child may be ready
    // as soon as this task returns to the event loop.
    win.addEventListener('message', message);
    win.addEventListener('pagehide', leave, { once: true });
    popup = win.open(url.href, '_blank');
    if (!popup) throw new Error('Viewerを開けませんでした。ブラウザーのポップアップ許可を確認して、もう一度押してください。');
    report(onStatus, 'Viewerへ制作中の写しを渡しています…');
    timer = win.setTimeout(() => finish(false, 'Viewerの受取確認が時間内に終わりませんでした。もう一度開いてください。'), delayOf(options));
    poll = win.setInterval(() => {
      try { if (popup.closed) finish(false, 'Viewerが閉じられたため、写しの受渡しを中止しました。'); }
      catch { finish(false, 'Viewerの受取先を確認できませんでした。もう一度開いてください。'); }
    }, Math.min(250, delayOf(options)));
  } catch (error) { finish(false, errorText(error)); }
  return Object.freeze({ ready, dispose() { finish(false, '制作中の写しの受渡しを中止しました。'); } });
}

export function receiveViewerSnapshot({ openText, onStatus, onSnapshot } = {}, options = {}) {
  const win = options.window ?? globalThis.window;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let origin = null, token = null, opener = null, done = false, received = false, disposed = false;
  let timer = null, poll = null, lastError = null;
  function post(type, extra = {}) {
    if (!opener || !origin || !token) return false;
    try { opener.postMessage({ channel: CHANNEL, type, token, ...extra }, origin); return true; } catch { return false; }
  }
  function clean() {
    win?.removeEventListener?.('message', message);
    win?.removeEventListener?.('pagehide', leave);
    if (timer != null) win.clearTimeout(timer);
    if (poll != null) win.clearInterval(poll);
  }
  function finish(ok, error = null, label = null) {
    if (done) return;
    if (ok) {
      let confirmed = false;
      try { confirmed = !opener.closed && post('accepted'); } catch {}
      if (!confirmed) { ok = false; error = '制作元のタブに受取確認を返せませんでした。必要ならModelerから開き直してください。'; }
    }
    done = true; lastError = error;
    if (!ok) post('rejected', { error });
    clean();
    if (!ok) report(onStatus, error);
    resolveReady(ok ? { ok: true, label } : { ok: false, error });
  }
  async function message(event) {
    if (done || event.origin !== origin || event.source !== opener) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.token !== token) return;
    if (data.type === 'abort') {
      finish(false, `制作中の写しの受渡しを中止しました: ${errorText(data.error || '制作元との接続を確認できません。')}`);
      return;
    }
    if (data.type !== 'snapshot' || received) return;
    received = true;
    if (typeof data.text !== 'string' || typeof data.label !== 'string') {
      finish(false, '制作中の写しの形式が正しくありません。制作元からもう一度開いてください。');
      return;
    }
    const label = data.label || '制作中の作品';
    report(onStatus, '制作中の写しの形式と内容を確認しています…');
    try {
      const result = await openText(data.text, label);
      if (result?.ok !== true) throw new Error(result?.error || '作品の読み取りに失敗しました。');
      // A manual file open disposes this receiver. An expired acknowledgement
      // can still leave a validated copy on screen, which must remain labelled.
      if (!disposed) onSnapshot?.({ label });
      if (done) { if (!disposed && lastError) report(onStatus, lastError); return; }
      finish(true, null, label);
    } catch (error) {
      if (!done) finish(false, errorText(error));
      else if (!disposed && lastError) report(onStatus, lastError);
    }
  }
  function leave() { disposed = true; finish(false, 'Viewerを閉じたため、写しの受渡しを中止しました。'); }
  try {
    if (!win || typeof openText !== 'function') throw new Error('制作中の写しを読み取る準備ができませんでした。');
    origin = originOf(win);
    token = new URL(win.location.href).searchParams.get('handoff');
    if (!TOKEN_PATTERN.test(token || '')) throw new Error('写しの受渡し用の識別子が正しくありません。制作元から開き直してください。');
    opener = win.opener;
    if (!opener || opener.closed) throw new Error('制作元のタブが見つかりません。Modelerから「Viewerで読む」を押してください。');
    win.addEventListener('message', message);
    win.addEventListener('pagehide', leave, { once: true });
    report(onStatus, '制作元から写しを受け取っています…');
    timer = win.setTimeout(() => finish(false, '制作中の写しを時間内に受け取れませんでした。Modelerから開き直してください。'), delayOf(options));
    poll = win.setInterval(() => {
      try { if (opener.closed) finish(false, '制作元のタブが閉じられました。Modelerから開き直してください。'); }
      catch { finish(false, '制作元との接続を確認できません。Modelerから開き直してください。'); }
    }, Math.min(250, delayOf(options)));
    post('ready');
  } catch (error) { finish(false, errorText(error)); }
  return Object.freeze({ ready, dispose() { disposed = true; finish(false, '別の操作に切り替えたため、写しの受渡しを中止しました。'); } });
}
