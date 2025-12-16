// viewer/ui/pointerInput.js
// canvas 上の pointer / wheel を受けて hub.core.camera / selection / mode を操作する

const ROTATE_SPEED = 0.005;
const PAN_SPEED = 0.002;
const ZOOM_SPEED = 0.001;

// デバッグが要るときだけ true（pick が走ってるか確認用）
const DEBUG_PICK = false;

const CLICK_TOL_PX = 8;
const CLICK_DT_MS = 350;

export class PointerInput {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import("../runtime/viewerHub.js").ViewerHub} hub
   */
  constructor(canvas, hub) {
    this.canvas = canvas;
    this.hub = hub;

    this.isPointerDown = false;
    this.activeMode = null; // "rotate" | "pan" | null
    this.lastX = 0;
    this.lastY = 0;

    // active pointer
    this._activePointerId = null;

    // click 判定（down→up の総移動量で見る）
    this._downX = 0;
    this._downY = 0;
    this._downT = 0;
    this._moveSq = 0;
    this._clickTolSq = CLICK_TOL_PX * CLICK_TOL_PX;

    // RAF 合成（ドラッグを滑らかに）
    this._pendingDx = 0;
    this._pendingDy = 0;
    this._raf = 0;

    this._dragAutoStopped = false;

    // UI から見える統一 camera API
    this.camera = this._resolveCamera();

    this._disposers = [];
    this._attached = false;

    this._onPointerDown = (e) => this.onPointerDown(e);
    this._onPointerMove = (e) => this.onPointerMove(e);
    this._onPointerUp = (e) => this.onPointerUp(e);
    this._onPointerCancel = (e) => this.onPointerCancel(e);
    this._onWheel = (e) => this.onWheel(e);
    this._onContextMenu = (e) => e.preventDefault();
  }

  attach() {
    if (this._attached) return;
    const canvas = this.canvas;
    if (!canvas) return;

    const on = (type, fn, opts) => {
      canvas.addEventListener(type, fn, opts);
      this._disposers.push(() => canvas.removeEventListener(type, fn, opts));
    };

    on("pointerdown", this._onPointerDown);
    on("pointermove", this._onPointerMove);
    on("pointerup", this._onPointerUp);
    on("pointerleave", this._onPointerCancel);
    on("pointercancel", this._onPointerCancel);
    on("wheel", this._onWheel, { passive: false });
    on("contextmenu", this._onContextMenu);

    try { canvas.style.touchAction = "none"; } catch (_e) {}

    this._attached = true;
  }

  dispose() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    for (const off of this._disposers.splice(0)) {
      try { off(); } catch (_e) {}
    }
    this._attached = false;
  }

  // ------------------------------------------------------------
  // internal helpers
  // ------------------------------------------------------------

  _nowMs() {
    return (globalThis.performance?.now?.() ?? Date.now());
  }

  _getPointerNdc(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    return { x, y };
  }

  _pickAtNdc(ndc) {
    const hub = this.hub;
    return (
      hub?.pickObjectAt?.(ndc.x, ndc.y) ??
      hub?.renderer?.pickObjectAt?.(ndc.x, ndc.y) ??
      null
    );
  }

  _normalizeHit(hit) {
    if (!hit?.uuid) return null;
    const kindMap = {
      points: "points",
      lines: "lines",
      aux: "aux",
      point: "points",
      line: "lines",
    };
    return { uuid: hit.uuid, kind: kindMap[hit.kind] ?? hit.kind ?? null };
  }

  _resolveCamera() {
    const core = this.hub?.core;
    if (!core) return null;

    if (core.camera) return core.camera;

    if (core.cameraEngine) {
      const ce = core.cameraEngine;
      return {
        rotate: (...args) => ce.rotate && ce.rotate(...args),
        pan: (...args) => ce.pan && ce.pan(...args),
        zoom: (...args) => ce.zoom && ce.zoom(...args),
        reset: (...args) => ce.reset && ce.reset(...args),
        getState: (...args) => (ce.getState ? ce.getState(...args) : null),
        stopAutoOrbit: (...args) => ce.stopAutoOrbit && ce.stopAutoOrbit(...args),
      };
    }
    return null;
  }

  dispatch(method, ...args) {
    const cam = this.camera || this._resolveCamera();
    if (!this.camera && cam) this.camera = cam;
    if (cam && typeof cam[method] === "function") cam[method](...args);
  }

  getCameraState() {
    const cam = this.camera || this._resolveCamera();
    if (!this.camera && cam) this.camera = cam;
    return cam && typeof cam.getState === "function" ? cam.getState() : null;
  }

  determineMode(event) {
    if (event.button === 2) return "pan";
    if (event.button === 1) return "rotate";
    if (event.ctrlKey || event.metaKey) return "pan";
    if (event.altKey) return "rotate";
    return "rotate";
  }

  stopAutoCamera() {
    const hub = this.hub;
    const core = hub?.core;

    if (hub?.autoOrbit?.stop && typeof hub.autoOrbit.stop === "function") {
      hub.autoOrbit.stop();
      return;
    }

    const camera = core?.camera || core?.cameraEngine;
    if (camera?.stopAutoOrbit && typeof camera.stopAutoOrbit === "function") {
      camera.stopAutoOrbit();
    }

    if (core?.mode?.setCameraAuto) core.mode.setCameraAuto(false);
    else if (typeof core?.setCameraAuto === "function") core.setCameraAuto(false);
  }

  _requestTick() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._flushPendingDrag();
    });
  }

  _flushPendingDrag() {
    const dx = this._pendingDx;
    const dy = this._pendingDy;
    this._pendingDx = 0;
    this._pendingDy = 0;

    if (!this.isPointerDown) return;
    if (!dx && !dy) return;

    if (this.activeMode === "pan") {
      const cs = this.getCameraState();
      const dist = (cs && typeof cs.distance === "number") ? cs.distance : 1;
      const panScale = dist * PAN_SPEED;
      this.dispatch("pan", dx * panScale, dy * panScale);
    } else {
      this.dispatch("rotate", dx * ROTATE_SPEED, dy * ROTATE_SPEED);
    }
  }

  // ------------------------------------------------------------
  // handlers
  // ------------------------------------------------------------

  onPointerDown(event) {
    // 既に別 pointer を掴んでたら無視（マルチタッチ混線防止）
    if (this._activePointerId != null) return;

    try { this.canvas.setPointerCapture(event.pointerId); } catch (_e) {}

    this._activePointerId = event.pointerId;

    this.isPointerDown = true;
    this.activeMode = this.determineMode(event);
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    this._downX = event.clientX;
    this._downY = event.clientY;
    this._downT = this._nowMs();
    this._moveSq = 0;

    this._pendingDx = 0;
    this._pendingDy = 0;
    this._dragAutoStopped = false;
  }

  onPointerMove(event) {
    if (!this.isPointerDown) return;
    if (this._activePointerId !== event.pointerId) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    const ax = event.clientX - this._downX;
    const ay = event.clientY - this._downY;
    this._moveSq = ax * ax + ay * ay;

    // ドラッグが始まったら autoOrbit 停止（1回だけ）
    if (!this._dragAutoStopped && this._moveSq > this._clickTolSq) {
      this._dragAutoStopped = true;
      this.stopAutoCamera();
    }

    this._pendingDx += dx;
    this._pendingDy += dy;
    this._requestTick();
  }

  onPointerCancel(event) {
    if (this._activePointerId !== event.pointerId && this._activePointerId != null) return;

    if (this.isPointerDown) {
      try { this.canvas.releasePointerCapture(event.pointerId); } catch (_e) {}
    }
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    this._pendingDx = 0;
    this._pendingDy = 0;

    this.isPointerDown = false;
    this.activeMode = null;
    this._activePointerId = null;
  }

  onPointerUp(event) {
    if (this._activePointerId !== event.pointerId) return;

    if (this.isPointerDown) {
      try { this.canvas.releasePointerCapture(event.pointerId); } catch (_e) {}
    }

    // 積み残しがあれば最後に反映
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    this._flushPendingDrag();

    const now = this._nowMs();
    const dtMs = now - (this._downT || now);

    const isLeft = event.button === 0;
    const isClick = isLeft && this._moveSq <= this._clickTolSq && dtMs <= CLICK_DT_MS;

    if (DEBUG_PICK) {
      console.log("[ui] pointerup", { isClick, moveSq: this._moveSq, tolSq: this._clickTolSq, dtMs });
    }

    if (isClick) {
      const ndc = this._getPointerNdc(event);
      const rawHit = this._pickAtNdc(ndc);

      if (DEBUG_PICK) console.log("[ui] pick", { ndc, rawHit });

      if (rawHit?.uuid) this.stopAutoCamera();
      this.applyPick(rawHit);
    }

    this.isPointerDown = false;
    this.activeMode = null;
    this._activePointerId = null;
  }

  onWheel(event) {
    event.preventDefault();
    const delta = event.deltaY * ZOOM_SPEED;
    this.stopAutoCamera();
    this.dispatch("zoom", delta);
  }

  // ------------------------------------------------------------
  // pick -> core
  // ------------------------------------------------------------

  applyPick(hit) {
    const core = this.hub?.core;
    if (!core) return;

    const normalized = this._normalizeHit(hit); // uuid ないなら null

    // 一本道（Phase2以降はこれが正）
    if (typeof core.handlePick === "function") {
      const wasMicro =
        (core.mode?.get && core.mode.get() === "micro") ||
        (core.uiState?.mode === "micro");

      // ★ここは必ず呼ぶ（normalized=null でも呼ぶ＝クリアも一本化）
      core.handlePick(normalized);

      // micro中で別要素に乗り換えた場合だけ、必要ならフォーカス移動
      if (wasMicro && normalized?.uuid && typeof core.mode?.focus === "function") {
        const already =
          core.uiState?.selection?.uuid === normalized.uuid &&
          core.uiState?.microState?.focusUuid === normalized.uuid;
        if (!already) core.mode.focus(normalized.uuid);
      }
      return;
    }

    // フォールバック（古い経路）
    if (normalized?.uuid) {
      const { uuid, kind } = normalized;
      if (core.selection?.set) core.selection.set({ uuid, kind });
      else if (typeof core.setSelection === "function") core.setSelection({ uuid, kind });

      if (typeof core.enterMicro === "function") core.enterMicro(uuid, kind);
      else if (core.mode?.set) core.mode.set("micro", uuid);
      else if (typeof core.setMode === "function") core.setMode("micro", uuid);
    } else {
      if (core.selection?.clear) core.selection.clear();
      else if (typeof core.clearSelection === "function") core.clearSelection();
      else if (typeof core.setSelection === "function") core.setSelection(null);

      if (typeof core.exitMicro === "function") core.exitMicro();
      else if (core.mode?.set) core.mode.set("macro");
      else if (typeof core.setMode === "function") core.setMode("macro");
    }
  }
}
