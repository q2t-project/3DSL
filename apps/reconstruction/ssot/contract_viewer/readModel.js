import { isContractWork, parseContractWork, readContractMeaning } from '../modeler_app/runtime/contractWork.js';
import { isWorkPackage, parseWorkPackage, assertLosslessWorkJSON, WORK_PACKAGE_MAX_BYTES, getWorkComparison, getUnplacedSourceRecords } from '../modeler_app/runtime/workPackage.js';

const copy = value => structuredClone(value);
const fail = message => { throw new Error(`Viewer読込: ${message}`); };

// Structural checks precede rendering. No normalization, migration or mutation is
// allowed here: the input snapshot and the renderer copy are separate objects.
function inspectScene(scene) {
  if (!scene || typeof scene !== 'object' || Array.isArray(scene) || !scene.document_meta) fail('対応する3DSSの図がありません。');
  const entries = new Map(), points = new Set();
  for (const kind of ['points', 'lines', 'aux']) {
    if (scene[kind] != null && !Array.isArray(scene[kind])) fail(`${kind}が配列ではありません。`);
    for (const element of scene[kind] || []) {
      const id = element?.meta?.uuid;
      if (typeof id !== 'string' || !id || entries.has(id)) fail(`図形UUIDが欠落または重複しています: ${id ?? ''}`);
      entries.set(id, element);
      if (kind === 'points') points.add(id);
    }
  }
  for (const line of scene.lines || []) for (const side of ['end_a', 'end_b']) {
    const end = line.appearance?.[side];
    if (end?.ref != null && !points.has(end.ref)) fail(`線 ${line.meta.uuid} の ${side} の参照先が図の点にありません: ${end.ref}`);
  }
}

function legacyInformation(work) {
  const attachments = Object.entries(work.attachments).map(([path, utf8]) => ({path, utf8}));
  const named = basename => attachments.find(item => item.path.split('/').at(-1) === basename);
  const decode = basename => { const text = named(basename)?.utf8; if (text == null) return null; try { return JSON.parse(text); } catch { return null; } };
  const source = decode('source_map.json'), display = decode('display_map.json');
  const known = source?.format === 'proj4-single-work-source-map/0.1' && display?.format === 'this-work-display-map-v1';
  return {
    status: known ? 'baseline-correspondence' : 'opaque-attachments',
    notice: '出典・対応記録は編集前の図に対する原記録です。現在のラベル・配置・接続へ意味を自動採用しません。',
    source: known ? source : null, display: known ? display : null, attachments,
    comparison: getWorkComparison(work), unplaced: getUnplacedSourceRecords(work),
  };
}

export function buildReadModel(raw) {
  let value = raw;
  const rawText = typeof raw === 'string' ? raw : null;
  if (rawText != null) {
    if (new TextEncoder().encode(rawText).byteLength > WORK_PACKAGE_MAX_BYTES) fail('32 MiBを超えています。');
    try { value = JSON.parse(rawText); } catch { fail('有効なJSONではありません。'); }
  }
  assertLosslessWorkJSON(value);
  const rawSnapshot = copy(value);
  let format, typeLabel, work = null, meaning = null, legacyInfo = null, scene;
  if (isContractWork(value)) {
    format = 'contract'; typeLabel = '対象・出現・関係を持つ作品';
    work = parseContractWork(value); meaning = readContractMeaning(work); scene = copy(work.scene);
  } else if (isWorkPackage(value)) {
    format = 'legacy'; typeLabel = '旧形式の作品一式';
    work = parseWorkPackage(value); legacyInfo = legacyInformation(work); scene = copy(work.scene);
  } else {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.format != null || value.scene != null) fail('未対応の作品形式です。原データを変換せず読込みを停止しました。');
    format = 'scene'; typeLabel = '図のみの3DSS'; scene = copy(value);
  }
  inspectScene(scene);
  if (work) inspectScene(work.baselineScene);
  const warnings = [];
  if (meaning?.unresolvedRelations.length) warnings.push(`表示接続の要修復関係 ${meaning.unresolvedRelations.length}件は図に描画していません。関係内容は保持記録で読めます。`);
  if (format === 'legacy') {
    warnings.push(legacyInfo.notice);
    if (legacyInfo.unplaced.length) warnings.push(`編集前の原記録のうち、現在の図に対応する配置がない記録 ${legacyInfo.unplaced.length}件を保持しています。`);
  }
  if (work?.contract?.draft.inputs.length || work?.contract?.draft.pendingRelations.length) warnings.push(`未適用入力 ${work.contract.draft.inputs.length}件・未完成関係 ${work.contract.draft.pendingRelations.length}件を保持しています。確定した値や接続には採用していません。`);
  if (format === 'scene') warnings.push('対象・出現・参与役割の作品契約はありません。図に明示された端点参照だけを接続として読みます。');
  const coordinateLines = (scene.lines || []).filter(line => ['end_a','end_b'].some(side => line.appearance?.[side]?.coord != null));
  if (coordinateLines.length) warnings.push(`座標端点を持つ線 ${coordinateLines.length}件は、その座標から接続対象を推測しません。`);
  if ((scene.lines || []).some(e => e.appearance?.arrow?.primitive && e.appearance.arrow.primitive !== 'none')) warnings.push('矢印は表示指定です。関係の方向・参与役割は保存された記録を参照してください。');
  if ((scene.lines || []).some(e => !['straight','polyline'].includes(e.appearance?.line_type ?? 'straight'))) warnings.push('曲線を含みます。今回のModelerとViewerの描画一致保証の対象外です。');
  const otherAux = (scene.aux || []).filter(e => e.meta.uuid !== work?.contract?.boundary?.aux);
  if (otherAux.length) warnings.push('宣言されたXY境界以外の補助要素は、契約として解釈していません。Modelerとの表示一致も未確認です。');
  const label = scene.document_meta?.title || typeLabel;
  return {format, typeLabel, label, rawSnapshot, rawText, work, scene, meaning, warnings, legacyInfo};
}

// The schema validator is intentionally supplied by the caller, and always gets
// disposable copies. Even a mutating validator cannot change received content.
export async function validateReadModel(model, validator) {
  if (!validator || typeof validator.validate !== 'function') fail('形式検査を利用できません。');
  await validator.ensureInitialized();
  if (typeof validator.isReady === 'function' && !validator.isReady()) fail('図の形式検査を初期化できません。');
  if (!validator.validate(copy(model.scene))) fail('現在の図が形式検査に合格しません。');
  if (model.work && !validator.validate(copy(model.work.baselineScene))) fail('編集前の図が形式検査に合格しません。');
  if (model.format === 'contract') {
    await validator.ensureWorkInitialized();
    if (!validator.validateWork(copy(model.work))) fail('作品契約が形式検査に合格しません。');
  }
  return true;
}
