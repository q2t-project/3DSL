// Preserve an input that cannot be opened without interpretation or loss.
// No geometry or semantic bindings are guessed from the input.
import { createEmptyContractWork, parseContractWork } from './contractWork.js';

export const IMPORT_REVIEW_PATH = 'imports/import-review.json';
export const IMPORT_SOURCE_PATH = 'imports/original.txt';
const REVIEW_FORMAT = '3dsl-uninterpreted-import/0.1';
const encoder = new TextEncoder();

async function sha256(text) {
  const bytes = encoder.encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
}

export async function createImportReviewWork(rawText, { filename = 'import.json', diagnostics = [] } = {}) {
  if (typeof rawText !== 'string') throw new Error('取込保留: 元ファイルの原文が必要です。');
  // This entry point receives decoded UTF-8 text. A lossy decoder must not be
  // used by its caller; reject unpaired surrogates instead of replacing them.
  const bytes = encoder.encode(rawText);
  if (new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) !== rawText) {
    throw new Error('取込保留: UTF-8でそのまま保持できない文字があります。');
  }
  if (typeof filename !== 'string' || !Array.isArray(diagnostics) || diagnostics.some(x => typeof x !== 'string')) {
    throw new Error('取込保留: ファイル名と診断の形式が不正です。');
  }
  const source = { path: IMPORT_SOURCE_PATH, utf8: rawText, sha256: await sha256(rawText), status: 'uninterpreted' };
  const info = { format: REVIEW_FORMAT, filename, sourcePath: source.path, sha256: source.sha256,
    utf8Bytes: bytes.byteLength, diagnostics: [...diagnostics],
    interpretation: 'none', geometry: 'empty-uninterpreted-input' };
  const work = createEmptyContractWork();
  work.scene.document_meta.document_title = '取込保留: ' + filename;
  work.baselineScene = structuredClone(work.scene);
  work.contract.sources = [source];
  work.baselineContract = structuredClone(work.contract);
  work.attachments[IMPORT_REVIEW_PATH] = JSON.stringify(info, null, 2);
  // Includes the common size/depth/UTF-8 checks. Oversize inputs are rejected
  // in full, never truncated to make this draft fit the work package limit.
  return parseContractWork(work);
}

export function getImportReviewInfo(work) {
  const text = work?.attachments?.[IMPORT_REVIEW_PATH];
  if (typeof text !== 'string') return null;
  let info;
  try { info = JSON.parse(text); } catch { return null; }
  if (info?.format !== REVIEW_FORMAT || info.sourcePath !== IMPORT_SOURCE_PATH
    || typeof info.filename !== 'string' || !Array.isArray(info.diagnostics)
    || info.diagnostics.some(x => typeof x !== 'string')) return null;
  const source = work?.contract?.sources?.find(x => x.path === info.sourcePath);
  if (!source || source.status !== 'uninterpreted' || typeof source.utf8 !== 'string') return null;
  return { ...structuredClone(info), kind: 'uninterpreted-import' };
}

export function getImportReviewOriginal(work) {
  const info = getImportReviewInfo(work);
  if (!info) throw new Error('取込保留の原文が見つかりません。');
  return work.contract.sources.find(x => x.path === info.sourcePath).utf8;
}

export async function verifyImportReviewOriginal(work) {
  const info = getImportReviewInfo(work);
  if (!info) return false;
  const original = getImportReviewOriginal(work);
  return encoder.encode(original).byteLength === info.utf8Bytes && await sha256(original) === info.sha256;
}
