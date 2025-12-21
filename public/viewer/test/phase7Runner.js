// public/viewer/test/phase7Runner.js
//
// Phase7 browser regression runner (manual but repeatable)
// Usage in console:
//   const { runAll } = await import("/viewer/test/phase7Runner.js?ts=" + Date.now());
//   await runAll(window.__viewerHub, { disposeAtEnd: false });

const UUID_CENTER = "11111111-1111-1111-1111-111111111111";

function log(line) {
  console.log(`[phase7Runner] ${line}`);
}
function ok(name, detail = "") {
  log(`OK  ${name}${detail ? " - " + detail : ""}`);
  return { name, ok: true, detail };
}
function ng(name, detail = "") {
  log(`NG  ${name}${detail ? " - " + detail : ""}`);
  return { name, ok: false, detail };
}
function safe(label, fn) {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: `${label}: ${String(e?.message || e)}` };
  }
}

// --- helpers: structIndex wrapper対応（{kind,item} でも raw item でもOK）
function getCenterEntry(hub) {
  const si = hub?.core?.structIndex;
  if (!si) return null;

  // getItem が wrapper を返す場合も raw を返す場合もある
  if (typeof si.getItem === "function") return si.getItem(UUID_CENTER);

  const m = si.uuidToItem;
  return m?.get?.(UUID_CENTER) ?? m?.[UUID_CENTER] ?? null;
}
function unwrapItem(v) {
  if (!v) return null;
  if (v.item && typeof v.item === "object") return v.item; // wrapper {kind,item}
  return v; // raw item
}
function isCenterVisibleFromDoc(item) {
  // v1.1.0: visible undefined => true, false => hidden
  const v = item?.appearance?.visible;
  return v !== false;
}

function tryGetFrameRange(hub) {
  const frame = hub?.core?.frame;
  if (!frame) return null;
  if (typeof frame.getRange === "function") return frame.getRange();
  const r = hub?.core?.uiState?.frame?.range;
  return r ?? null;
}

function existsUuid(hub, uuid) {
  const si = hub?.core?.structIndex;
  if (!si || !uuid) return false;
  if (typeof si.getItem === "function") return !!si.getItem(uuid);
  const m = si.uuidToItem;
  if (m?.get) return !!m.get(uuid);
  if (m && typeof m === "object") return !!m[uuid];
  return false;
}

export async function runAll(hub, opts = {}) {
  const results = [];
  const disposeAtEnd = opts.disposeAtEnd !== false;

  if (!hub || typeof hub !== "object") {
    return { ok: false, results: [ng("hub", "missing")] };
  }

  // 0) sanity
  if (typeof hub.pickObjectAt !== "function") results.push(ng("hub.pickObjectAt present", "missing"));
  else results.push(ok("hub.pickObjectAt present"));

  if (!hub.core || typeof hub.core !== "object") results.push(ng("hub.core present", "missing"));
  else results.push(ok("hub.core present"));

  // 1) pick: center (ndc 0,0)
  const centerItem = unwrapItem(getCenterEntry(hub));
  const centerVisible = isCenterVisibleFromDoc(centerItem);

  const pick0 = safe("pickObjectAt(0,0)", () => hub.pickObjectAt(0, 0));
  if (!pick0.ok) {
    results.push(ng("pick(center) no-throw", pick0.error));
  } else {
    results.push(ok("pick(center) no-throw"));
    const hit = pick0.value;

    // center位置は aux/points/lines が重なりうる（aux優先ヒットもあり得る）。
    // Phase7 の要件は「不可視は絶対に選べない」なので、uuid==center 固定はしない。
    if (hit == null) {
      results.push(ok("pick(center) returned null"));
    } else {
      results.push(
        typeof hit.uuid === "string" && hit.uuid
          ? ok("pick(center) returned uuid", `uuid=${hit.uuid}`)
          : ng("pick(center) returned uuid", `uuid=${hit.uuid}`)
      );

      results.push(
        existsUuid(hub, hit.uuid)
          ? ok("pick(center) uuid exists in structIndex")
          : ng("pick(center) uuid exists in structIndex", `uuid=${hit.uuid}`)
      );

      if (!centerVisible) {
        results.push(
          hit.uuid !== UUID_CENTER
            ? ok("pick(center) does not return invisible center")
            : ng("pick(center) does not return invisible center", `uuid=${hit.uuid}`)
        );
      } else {
        // center 可視：center を拾えたら嬉しいが、aux重なりで別uuidでもOK
        results.push(
          hit.uuid === UUID_CENTER
            ? ok("pick(center) hit center")
            : ok("pick(center) hit non-center (overlap)", `uuid=${hit.uuid}`)
        );
      }

      // 2) selection: pick 結果を選択できる
      const sel = hub?.core?.selection;
      if (sel && typeof sel.select === "function") {
        const s1 = safe("selection.select(hit.uuid, hit.kind)", () => sel.select(hit.uuid, hit.kind));
        results.push(s1.ok ? ok("selection.select(pick) callable") : ng("selection.select(pick) callable", s1.error));
        if (s1.ok) results.push(s1.value ? ok("selection.select(pick) returns non-null") : ng("selection.select(pick) returns non-null", "null"));
      } else {
        results.push(ng("hub.core.selection.select present", "missing"));
      }
    }
  }

  // 3) micro enter conditions
  const mode = hub?.core?.mode;
  const micro = hub?.core?.micro;
  const cam = hub?.core?.camera;
  const runtime = hub?.core?.runtime;

  if (!mode || typeof mode.canEnter !== "function") {
    results.push(ng("hub.core.mode.canEnter present", "missing"));
  } else {
    results.push(ok("hub.core.mode.canEnter present"));

    // autoOrbit 中 canEnter=false
    if (cam?.startAutoOrbit && cam?.stopAutoOrbit) {
      safe("camera.stopAutoOrbit", () => cam.stopAutoOrbit());
      safe("camera.startAutoOrbit", () => cam.startAutoOrbit());
      const c1 = safe("mode.canEnter(center) while autoOrbit", () => mode.canEnter(UUID_CENTER));
      if (c1.ok) results.push(c1.value === false ? ok("canEnter blocked while autoOrbit") : ng("canEnter blocked while autoOrbit", `canEnter=${c1.value}`));
      safe("camera.stopAutoOrbit", () => cam.stopAutoOrbit());
      if (runtime?.isCameraAuto) {
        const a = safe("runtime.isCameraAuto()", () => runtime.isCameraAuto());
        if (a.ok) results.push(a.value === false ? ok("runtime.isCameraAuto false after stop") : ng("runtime.isCameraAuto false after stop", `isCameraAuto=${a.value}`));
      }
    } else {
      results.push(ng("hub.core.camera autoOrbit present", "missing startAutoOrbit/stopAutoOrbit"));
    }

    // playback 中 canEnter=false（range がある場合だけ）
    const frameRange = tryGetFrameRange(hub);
    const frame = hub?.core?.frame;
    if (frame?.startPlayback && frame?.stopPlayback && runtime?.isFramePlaying) {
      safe("frame.stopPlayback", () => frame.stopPlayback());
      if (frameRange == null) {
        safe("frame.startPlayback", () => frame.startPlayback());
        const p = safe("runtime.isFramePlaying()", () => runtime.isFramePlaying());
        if (p.ok) results.push(p.value === false ? ok("startPlayback no-op when range null") : ng("startPlayback no-op when range null", `isFramePlaying=${p.value}`));
      } else {
        safe("frame.startPlayback", () => frame.startPlayback());
        const c2 = safe("mode.canEnter(center) while playing", () => mode.canEnter(UUID_CENTER));
        if (c2.ok) results.push(c2.value === false ? ok("canEnter blocked while playing") : ng("canEnter blocked while playing", `canEnter=${c2.value}`));
        safe("frame.stopPlayback", () => frame.stopPlayback());
      }
    } else {
      results.push(ok("playback check", "SKIP (frame/runtime API missing)"));
    }

    // normal micro enter/exit
    if (micro?.enter && micro?.exit && micro?.isActive) {
      safe("micro.exit", () => micro.exit()); // clean
      const c3 = safe("mode.canEnter(center) normal", () => mode.canEnter(UUID_CENTER));
      if (c3.ok) {
        if (!centerVisible) {
          results.push(c3.value === false ? ok("canEnter=false when center invisible") : ng("canEnter=false when center invisible", `canEnter=${c3.value}`));
        } else {
          results.push(c3.value === true ? ok("canEnter=true when center visible") : ng("canEnter=true when center visible", `canEnter=${c3.value}`));

          const e1 = safe("micro.enter(center)", () => micro.enter(UUID_CENTER));
          results.push(e1.ok ? ok("micro.enter no-throw", `mode=${e1.value}`) : ng("micro.enter no-throw", e1.error));

          const a1 = safe("micro.isActive()", () => micro.isActive());
          if (a1.ok) results.push(a1.value === true ? ok("micro.isActive true") : ng("micro.isActive true", `isActive=${a1.value}`));

          const e2 = safe("micro.exit()", () => micro.exit());
          results.push(e2.ok ? ok("micro.exit no-throw", `mode=${e2.value}`) : ng("micro.exit no-throw", e2.error));

          const a2 = safe("micro.isActive()", () => micro.isActive());
          if (a2.ok) results.push(a2.value === false ? ok("micro.isActive false after exit") : ng("micro.isActive false after exit", `isActive=${a2.value}`));
        }
      } else {
        results.push(ng("mode.canEnter(center) normal", c3.error));
      }
    } else {
      results.push(ng("hub.core.micro enter/exit/isActive present", "missing"));
    }
  }

  // 4) resize no-throw + pick no-throw
  if (typeof hub.resize === "function") {
    const r1 = safe("hub.resize(900,600)", () => hub.resize(900, 600));
    results.push(r1.ok ? ok("hub.resize no-throw") : ng("hub.resize no-throw", r1.error));
    const r2 = safe("pick after resize", () => hub.pickObjectAt?.(0, 0));
    results.push(r2.ok ? ok("pick after resize no-throw") : ng("pick after resize no-throw", r2.error));
  } else {
    results.push(ng("hub.resize present", "missing"));
  }

  // 5) dispose（必要なときだけ）
  if (disposeAtEnd) {
    if (typeof hub.dispose === "function") {
      results.push(safe("hub.dispose()", () => hub.dispose()).ok ? ok("dispose no-throw") : ng("dispose no-throw", "threw"));
      results.push(safe("hub.dispose() again", () => hub.dispose()).ok ? ok("dispose idempotent") : ng("dispose idempotent", "threw"));

      const p = safe("pick after dispose", () => hub.pickObjectAt?.(0, 0));
      if (p.ok) results.push(p.value == null ? ok("pick after dispose returns null") : ng("pick after dispose returns null", `value=${JSON.stringify(p.value)}`));
      else results.push(ng("pick after dispose no-throw", p.error));

      const s = safe("hub.start() after dispose", () => hub.start?.());
      results.push(s.ok ? ok("start after dispose no-throw") : ng("start after dispose no-throw", s.error));
    } else {
      results.push(ng("hub.dispose present", "missing"));
    }
  } else {
    results.push(ok("dispose check", "SKIP (disposeAtEnd=false)"));
  }

  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, results };
}
