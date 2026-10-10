import { getImportReviewInfo, getImportReviewOriginal, verifyImportReviewOriginal } from '../../runtime/importReview.js';

function downloadName(filename) {
  const base = String(filename || '').split(/[/\\]/).at(-1)
    .replace(/[<>:"|?*\u0000-\u001f\u007f]/g, '_').replace(/[ .]+$/g, '');
  return `retained_${base || 'original.txt'}`;
}

// The helper is also exercised without a browser: verification runs before
// creating a Blob URL or clicking an anchor, and export never mutates the work.
export async function downloadImportReviewOriginal(work, {
  documentRef = document, urlApi = URL, schedule = setTimeout, isCurrent = () => true,
} = {}) {
  const info = getImportReviewInfo(work);
  if (!info || !(await verifyImportReviewOriginal(work))) {
    throw new Error('保持した原文が記録と一致しません。書き出しを止めました。');
  }
  if (!isCurrent()) throw new Error('作品が切り替わったため、原文の書き出しを取り消しました。');
  const bytes = new TextEncoder().encode(getImportReviewOriginal(work));
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = downloadName(info.filename);
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  documentRef.body.appendChild(anchor);
  try {
    anchor.click();
  } catch (error) {
    urlApi.revokeObjectURL(url);
    throw error;
  } finally {
    anchor.remove();
  }
  // Allow the browser to finish reading the Blob before releasing its URL.
  schedule(() => urlApi.revokeObjectURL(url), 60_000);
  return { filename: anchor.download, bytes: bytes.byteLength };
}

export function createUiImportReviewController({ core, hub, mountEl, setHud = () => {} } = {}) {
  if (!mountEl) return { refresh() {}, dispose() {} };
  let disposed = false, generation = 0, exporting = false;
  let previousOriginal = null, previousMetadata = null, previousVerified = null;
  const unsubs = [];
  const doc = mountEl.ownerDocument || document;
  mountEl.classList.add('contract-import-review');
  mountEl.setAttribute('aria-label', '未解釈原文の保持');
  const panel = doc.createElement('section');
  panel.className = 'contract-details';
  const title = doc.createElement('strong'); title.textContent = '取込保留 · 原文を保持';
  const filename = doc.createElement('p'); filename.className = 'contract-help';
  const explanation = doc.createElement('p'); explanation.className = 'contract-help';
  explanation.textContent = '読み込めなかった内容は原文のまま保存してあるで。図や関係への変換はまだ行ってへん。';
  const details = doc.createElement('details');
  const summary = doc.createElement('summary'); summary.textContent = '読込みを保留した理由';
  const diagnosticList = doc.createElement('ul');
  details.appendChild(summary); details.appendChild(diagnosticList);
  const status = doc.createElement('p'); status.className = 'contract-help'; status.setAttribute('role', 'status');
  const download = doc.createElement('button'); download.type = 'button';
  download.textContent = '保持した原文を書き出す'; download.dataset.importOriginalDownload = '';
  for (const node of [title, filename, explanation, details, status, download]) panel.appendChild(node);
  mountEl.appendChild(panel);

  async function refresh() {
    if (disposed) return;
    const version = ++generation;
    let work, info, original;
    try { work = hub?.getWorkPackage?.(); info = getImportReviewInfo(work); original = info && getImportReviewOriginal(work); }
    catch { info = null; }
    mountEl.hidden = !info;
    if (!info) {
      previousOriginal = null; previousMetadata = null; previousVerified = null;
      download.disabled = true;
      return;
    }
    filename.textContent = info.filename;
    diagnosticList.replaceChildren();
    for (const message of info.diagnostics.length ? info.diagnostics : ['通常形式としての読込みを保留しています。']) {
      const li = doc.createElement('li'); li.textContent = message; diagnosticList.appendChild(li);
    }
    const metadata = JSON.stringify([info.sha256, info.utf8Bytes, info.sourcePath]);
    if (original === previousOriginal && metadata === previousMetadata && previousVerified !== null) {
      status.textContent = previousVerified ? '原文の照合済み。作品一式の保存にも含まれるで。' : '原文が記録と一致しないため、書き出しを止めているで。';
      download.disabled = exporting || !previousVerified;
      return;
    }
    status.textContent = '保持した原文を照合中…'; download.disabled = true;
    let verified = false;
    try { verified = await verifyImportReviewOriginal(work); } catch {}
    if (disposed || version !== generation) return;
    previousOriginal = original; previousMetadata = metadata; previousVerified = verified;
    status.textContent = verified ? '原文の照合済み。作品一式の保存にも含まれるで。' : '原文が記録と一致しないため、書き出しを止めているで。';
    download.disabled = exporting || !verified;
  }

  async function onDownload() {
    if (disposed || exporting || download.disabled) return;
    exporting = true; download.disabled = true;
    const epoch = core?.getDocumentEpoch?.();
    let work;
    try {
      work = hub.getWorkPackage();
      const sourceId = work.scene?.document_meta?.document_uuid;
      const result = await downloadImportReviewOriginal(work, { documentRef: doc, isCurrent: () => {
        if (disposed) return false;
        if (epoch !== undefined && core?.getDocumentEpoch?.() !== epoch) return false;
        return hub.getWorkPackage()?.scene?.document_meta?.document_uuid === sourceId;
      }});
      setHud(`保持した原文を書き出したで: ${result.filename}`);
    } catch (error) { setHud(error?.message || '原文を書き出せませんでした。'); }
    finally { exporting = false; void refresh(); }
  }
  download.addEventListener('click', onDownload);
  const subscribe = typeof hub?.on === 'function' ? hub.on.bind(hub) : typeof core?.on === 'function' ? core.on.bind(core) : null;
  if (subscribe) for (const name of ['document', 'document-replaced']) {
    const off = subscribe(name, refresh);
    if (typeof off === 'function') unsubs.push(off);
  }
  void refresh();
  return { refresh, dispose() {
    if (disposed) return;
    disposed = true; generation++;
    for (const off of unsubs) off();
    download.removeEventListener('click', onDownload);
    panel.remove(); mountEl.hidden = true;
  }};
}
