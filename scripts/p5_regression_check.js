// public/viewer/dev/p5_regression_check.js
// Phase5 (P5) regression fixed check (dev-only).
// Usage (DevTools console):
//   await import("/viewer/dev/p5_regression_check.js")
//     .then(m => m.runP5RegressionCheck(hub, { uuid: "..." }));

const DEFAULT_UUID = "22222222-2222-4222-8222-222222222201";

function _selUuid(ui) {
return (ui && ui.selection && typeof ui.selection.uuid === "string") ? ui.selection.uuid : null;
}

function _microUuid(ui) {
const ms = ui ? ui.microState : null;
if (!ms) return null;
if (typeof ms === "string") return ms;
if (typeof ms === "object") {
return (
    (typeof ms.focusUuid === "string" && ms.focusUuid) ||
    (typeof ms.uuid === "string" && ms.uuid) ||
    (typeof ms.targetUuid === "string" && ms.targetUuid) ||
    null
);
}
return null;
}

function _state(ui) {
return {
mode: ui?.mode ?? null,
sel: _selUuid(ui),
micro: _microUuid(ui),
};
}

function _eqState(a, b) {
return a.mode === b.mode && a.sel === b.sel && a.micro === b.micro;
}

function _uuidFromData(data) {
// best-effort: find a non-zero UUID in data (avoid document_uuid all zeros)
const re = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const zero = "00000000-0000-0000-0000-000000000000";
const seen = new Set();

function walk(v) {
if (!v) return null;
if (typeof v === "string") {
    const m = v.match(re);
    if (!m) return null;
    const u = m[0];
    if (u.toLowerCase() === zero) return null;
    if (seen.has(u)) return null;
    seen.add(u);
    return u;
}
if (Array.isArray(v)) {
    for (const x of v) {
    const r = walk(x);
    if (r) return r;
    }
    return null;
}
if (typeof v === "object") {
    for (const k of Object.keys(v)) {
    const r = walk(v[k]);
    if (r) return r;
    }
}
return null;
}

return walk(data);
}

function _assert(cond, label, errors) {
if (cond) return true;
errors.push(label);
return false;
}

export function runP5RegressionCheck(hubLike, opts = {}) {
const hub =
hubLike ??
globalThis.hub ??
globalThis.viewerHub ??
globalThis.__viewerHub ??
null;

if (!hub || !hub.core) {
console.warn("[P5] hub not found. pass hub explicitly: runP5RegressionCheck(hub)");
return { ok: false, reason: "hub missing" };
}

const core = hub.core;
const ui = core.uiState;
if (!ui || !core.mode || !core.selection) {
console.warn("[P5] core.uiState/core.mode/core.selection missing");
return { ok: false, reason: "core api missing" };
}

const U =
(typeof opts.uuid === "string" && opts.uuid.trim()) ||
_selUuid(ui) ||
_uuidFromData(core.data) ||
DEFAULT_UUID;

const errors = [];
const out = [];

const log = (...a) => {
out.push(a.map(String).join(" "));
console.log("[P5]", ...a);
};

// ------------------------------------------------------------
// 1) 回帰ログ固定チェック（S0..S3）
// ------------------------------------------------------------
try { core.mode.exit(); } catch (_e) {}
const S0 = _state(ui);
log("S0", S0.mode, S0.sel ?? "null", S0.micro ?? "null");
_assert(S0.mode === "macro", "S0: mode should be macro", errors);

// pick hit 相当（= focus）
const kind1 = (typeof opts.kind === "string" && opts.kind.trim()) ? opts.kind.trim() : "points";
const r1 = core.mode.focus(U, kind1);
const S1 = _state(ui);
log("S1", S1.mode, S1.sel ?? "null", S1.micro ?? "null", `(ret=${r1})`);
_assert(S1.mode === "micro", "S1: mode should be micro", errors);
_assert(S1.sel === U, "S1: selection should be uuid", errors);
_assert(S1.micro === U, "S1: micro should be uuid", errors);

// focus(null) は no-op（microのまま / selection/micro不変）
const beforeNull = _state(ui);
const rNull = core.mode.focus(null);
const afterNull = _state(ui);
log("S1.5", afterNull.mode, afterNull.sel ?? "null", afterNull.micro ?? "null", `(ret=${rNull})`);
_assert(_eqState(beforeNull, afterNull), "S1.5: focus(null) must be no-op", errors);

// 空打ち1回目（micro → macro）
const r2 = core.mode.exit();
const S2 = _state(ui);
log("S2", S2.mode, S2.sel ?? "null", S2.micro ?? "null", `(ret=${r2})`);
_assert(S2.mode === "macro", "S2: mode should be macro", errors);
_assert(S2.sel === U, "S2: selection should keep uuid", errors);
_assert(S2.micro == null, "S2: micro should be null", errors);

// 空打ち2回目（macro で selection clear）
const r3 = core.selection.clear();
const S3 = _state(ui);
log("S3", S3.mode, S3.sel ?? "null", S3.micro ?? "null", `(ret=${r3})`);
_assert(S3.mode === "macro", "S3: mode should be macro", errors);
_assert(S3.sel == null, "S3: selection should be null", errors);
_assert(S3.micro == null, "S3: micro should be null", errors);

// ------------------------------------------------------------
// 2) ガード（isFramePlaying / isCameraAuto）
// ------------------------------------------------------------
ui.runtime ??= {};

// isFramePlaying ガード
try { core.mode.exit(); } catch (_e) {}
ui.runtime.isFramePlaying = true;
ui.runtime.isCameraAuto = false;

const canPlay = core.mode.canEnter(U);
const rPlay = core.mode.focus(U, kind1);
const modePlay = core.mode.get();
log("G(play)", `canEnter=${canPlay}`, `focus=${rPlay}`, `mode=${modePlay}`);
_assert(canPlay === false, "G(play): canEnter must be false", errors);
_assert(modePlay === "macro", "G(play): focus must be no-op (macro)", errors);

// isCameraAuto ガード
ui.runtime.isFramePlaying = false;
ui.runtime.isCameraAuto = true;

const canAuto = core.mode.canEnter(U);
const rAuto = core.mode.focus(U, kind1);
const modeAuto = core.mode.get();
log("G(auto)", `canEnter=${canAuto}`, `focus=${rAuto}`, `mode=${modeAuto}`);
_assert(canAuto === false, "G(auto): canEnter must be false", errors);
_assert(modeAuto === "macro", "G(auto): focus must be no-op (macro)", errors);

// 後始末（runtimeフラグ戻す）
ui.runtime.isFramePlaying = false;
ui.runtime.isCameraAuto = false;

const ok = errors.length === 0;
if (ok) log("PASS", `uuid=${U}`);
else log("FAIL", errors.join(" | "));

return { ok, uuid: U, errors, log: out };
}
