// A drag is a renderer-only preview until pointerup. The content transaction is
// the same occurrence move used by the numeric inspector, once per gesture.
// An inspected legacy display group uses its separate translation operation;
// it never turns a shared source ID into a shared movement/identity group.
const finitePosition = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const uuidOf = item => String(item?.meta?.uuid || item?.uuid || '');
// Pointer coordinates are CSS pixels, so this also behaves consistently when
// browser zoom or devicePixelRatio changes. A click may select without editing.
const DRAG_START_PIXELS = 4;

export function attachUiContractDragController({ canvas, core, hub, signal, setHud, hasPendingPropertyEdits, eventTarget = window }) {
  let gesture = null;
  const disposers = [];
  const tell = message => setHud?.(message);
  const showDragState = value => {
    if (!canvas.dataset) return;
    if (value) canvas.dataset.dragState = value;
    else delete canvas.dataset.dragState;
  };
  const listen = (target, type, handler, options = {}) => {
    target?.addEventListener?.(type, handler, options);
    disposers.push(() => target?.removeEventListener?.(type, handler, options));
  };
  const consume = event => { event.preventDefault?.(); event.stopImmediatePropagation?.(); };
  const ndc = event => {
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return null;
    return [((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((event.clientY - rect.top) / rect.height) * 2];
  };
  const positionAt = (event, z) => {
    const p = ndc(event);
    if (!p) return null;
    const value = hub.worldPointOnPlaneZ?.(p[0], p[1], z);
    return finitePosition(value) ? value : null;
  };
  const hasAffectedLock = current => {
    const locks = new Set(core.listLocks?.() || []);
    return current.affected.some(id => locks.has(id));
  };
  const sameState = current => {
    try {
      const currentValue = current.kind === 'contract' ? hub.getContractWork?.() : core.getDocument?.();
      return core.getDocumentEpoch?.() === current.epoch && JSON.stringify(currentValue) === current.workText;
    } catch { return false; }
  };
  function finishPreview() {
    const current = gesture;
    gesture = null;
    showDragState(null);
    hub.clearPositionPreview?.();
    if (current) {
      try { if (canvas.hasPointerCapture?.(current.pointerId)) canvas.releasePointerCapture(current.pointerId); } catch {}
    }
    return current;
  }
  function cancel(message = '移動を取消したで。') {
    if (!gesture) return;
    finishPreview();
    tell(message);
  }
  function pointerDown(event) {
    if (core.getUiState?.().activeTool !== 'move') return;
    if (event.button !== 0 || event.isPrimary === false) return;
    if (gesture) return;
    const xy = ndc(event);
    if (!xy) return;
    const hit = hub.applyPickAt?.({ndcX: xy[0], ndcY: xy[1]});
    const isContract = !!hub.isContractWork?.();
    if (!hit?.uuid) {
      if (isContract) {consume(event); tell('移動する出現の点かラベルをドラッグしてな。');}
      return;
    }
    const work = isContract ? hub.getContractWork?.() : null;
    const occurrence = work?.contract?.occurrences?.find(o => [o.anchor, o.label, o.port].includes(hit.uuid));
    const group = isContract ? null : hub.getLegacyDisplayGroup?.(hit.uuid);
    // Legacy elements without an inspected display group retain their normal
    // selection and wheel path. Equal source IDs are never grouping evidence.
    if (!isContract && !group) return;
    consume(event); // Capture phase prevents OrbitControls and selection handlers competing.
    if (isContract && !occurrence) { tell('この操作では対象の一出現を動かせるで。点かラベルを選んでな。'); return; }
    if (group && hasPendingPropertyEdits?.()) { tell('未適用のプロパティ入力が残ってるで。適用か取消してからドラッグしてな。'); return; }
    const scene = work?.scene || core.getDocument?.();
    const points = new Map((scene?.points || []).map(point => [uuidOf(point), point]));
    const ids = occurrence ? [occurrence.anchor, occurrence.label, occurrence.port] : [group.anchor, ...group.uuids.filter(id => id !== group.anchor)];
    const originals = ids.map(uuid => ({uuid, position: points.get(uuid)?.appearance?.position?.slice()}));
    if (originals.some(item => !finitePosition(item.position))) return;
    const anchor = originals[0].position;
    const startPlane = positionAt(event, anchor[2]);
    if (!startPlane) { tell('XY平面と平行な視点では移動できへん。少し視点を傾けてな。'); return; }
    // Numeric drafts remain intact. Applying a pending geometry edit here would
    // turn a cancelled gesture into a content change, so request its resolution.
    const geometryDraft = occurrence && work.contract.draft.inputs.some(input =>
      ['position','labelOffset','portOffset'].some(field => input.key === `ui:${occurrence.id}:${field}`));
    if (geometryDraft) { tell('この出現の位置入力が残ってるで。プロパティで適用か取消してからドラッグしてな。'); return; }
    const affected = occurrence ? [occurrence.id, occurrence.target, ...ids] : [group.id, ...ids];
    for (const line of scene.lines || []) {
      if (ids.includes(line.appearance?.end_a?.ref) || ids.includes(line.appearance?.end_b?.ref)) affected.push(uuidOf(line));
    }
    const current = {pointerId: event.pointerId, uuid: hit.uuid, kind: isContract ? 'contract' : 'legacy-group', occurrence: occurrence?.id,
      anchor, startPlane, originals, affected, position: anchor.slice(),
      startClient: [event.clientX, event.clientY], started: false,
      epoch: core.getDocumentEpoch?.(), workText: JSON.stringify(work || scene)};
    if (hasAffectedLock(current)) { tell('移動する出現か接続線にロックがあるで。ロックを外してから動かしてな。'); return; }
    if (typeof hub.previewPositions !== 'function' || typeof hub.clearPositionPreview !== 'function') {
      tell('移動プレビューを利用できへん。位置欄で数値を編集してな。'); return;
    }
    // Selection is UI state only. Do not apply inspector buffers or focus camera.
    core.setSelection?.([hit.uuid]);
    gesture = current;
    showDragState('ready');
    try { canvas.setPointerCapture?.(event.pointerId); } catch {}
    tell('選択したで。ドラッグでXY移動・Z固定。Escで取消。');
  }
  function updatePosition(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    consume(event);
    if (hasAffectedLock(gesture)) { cancel('ロック状態が変わったため移動を取消したで。'); return; }
    if (!gesture.started) {
      const distance = Math.hypot(event.clientX - gesture.startClient[0], event.clientY - gesture.startClient[1]);
      if (distance < DRAG_START_PIXELS) return;
      gesture.started = true;
      showDragState('moving');
      tell('XY移動中・Z固定。離すと確定、Escで取消。Undoで一回分戻せるで。');
    }
    const hit = positionAt(event, gesture.anchor[2]);
    if (!hit) return;
    const delta = [hit[0] - gesture.startPlane[0], hit[1] - gesture.startPlane[1], 0];
    const next = [gesture.anchor[0] + delta[0], gesture.anchor[1] + delta[1], gesture.anchor[2]];
    if (!finitePosition(next)) return;
    try {
      const accepted = hub.previewPositions(gesture.originals.map(item => ({uuid: item.uuid,
        position: [item.position[0] + delta[0], item.position[1] + delta[1], item.position[2]]})));
      if (accepted === false) { cancel('移動プレビューを更新できへんため取消したで。位置は変更してへん。'); return; }
      gesture.position = next;
    } catch {
      cancel('移動プレビューを更新できへんため取消したで。位置は変更してへん。');
    }
  }
  function pointerMove(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if ((event.buttons & 1) === 0) { consume(event); cancel(); return; }
    updatePosition(event);
  }
  function pointerUp(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!sameState(gesture)) { consume(event); cancel('編集状態が変わったため移動を取消したで。'); return; }
    updatePosition(event);
    if (!gesture) return;
    const current = finishPreview();
    if (current.position.every((value, i) => Math.abs(value - current.anchor[i]) < 1e-9)) { tell('位置は変更してへん。'); return; }
    try {
      if (current.kind === 'contract') hub.applyContractOperation({type:'move', occurrence:current.occurrence, position:current.position});
      else hub.applyLegacyDisplayGroupMove(current.uuid, current.position);
      tell(current.kind === 'contract' ? 'この出現を移動したで。Undoで一回分戻せる。' : '検査済みの表示まとまりを移動したで。Undoで一回分戻せる。');
    } catch (error) { tell(`移動は確定してへん。${error?.message || error}`); }
  }
  listen(canvas, 'pointerdown', pointerDown, {capture:true});
  listen(eventTarget, 'pointermove', pointerMove, {capture:true});
  listen(eventTarget, 'pointerup', pointerUp, {capture:true});
  listen(eventTarget, 'pointercancel', event => { if (gesture && event.pointerId === gesture.pointerId) {consume(event); cancel();} }, {capture:true});
  listen(canvas, 'lostpointercapture', event => { if (gesture && event.pointerId === gesture.pointerId) cancel(); });
  listen(eventTarget, 'keydown', event => { if (gesture && event.key === 'Escape' && !event.isComposing) {consume(event); cancel();} }, {capture:true});
  listen(eventTarget, 'blur', () => cancel());
  // A content edit, frame/scope/tool change, or external selection invalidates
  // the drag snapshot. The preview disappears without touching history.
  for (const name of ['document','document-replaced','uistate','selection','lock']) {
    const off = hub.on?.(name, () => cancel('操作状態が変わったため移動を取消したで。'));
    if (typeof off === 'function') disposers.push(off);
  }
  function detach() { cancel(); for (const dispose of disposers.splice(0)) dispose(); }
  if (signal?.aborted) detach();
  else listen(signal, 'abort', detach, {once:true});
  return {cancel, detach, isDragging: () => !!gesture};
}
