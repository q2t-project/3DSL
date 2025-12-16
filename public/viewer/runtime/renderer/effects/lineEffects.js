// viewer/runtime/renderer/effects/lineEffects.js

// ------------------------------------------------------------
// module-level state
// ------------------------------------------------------------
// NOTE: runtime 内部状態で持つ（module-level は要らん）

function getPrimaryMaterial(obj) {
  const m = obj?.material;
  return Array.isArray(m) ? (m[0] ?? null) : (m ?? null);
}

// ------------------------------------------------------------
// runtime: flow/glow/pulse apply
// ------------------------------------------------------------
export function createLineEffectsRuntime({ lineObjects /*, baseStyle*/ }) {
  let timeSec = 0;

  function reset() {
    timeSec = 0;
  }

  function applyEasing(t, easing) {
    switch (easing) {
      case "sine_in":
        return 1 - Math.cos((t * Math.PI) / 2);
      case "sine_out":
        return Math.sin((t * Math.PI) / 2);
      case "sine_in_out":
      case "sine":
        return -(Math.cos(Math.PI * t) - 1) / 2;
      case "quad_in":
        return t * t;
      case "quad_out":
        return t * (2 - t);
      case "quad_in_out":
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case "linear":
      default:
        return t;
    }
  }

  function applyFlowEffect(obj, effect, dtSec) {
    const mat = getPrimaryMaterial(obj);
    if (!mat) return;

    const speed =
      typeof effect.speed === "number" && Number.isFinite(effect.speed)
        ? effect.speed
        : 1.0;
    if (!speed) return;

    const direction =
      typeof effect.direction === "string" && effect.direction === "backward"
        ? -1
        : 1;

    const delta = -direction * speed * dtSec;

    // LineDashedMaterial（ここは既存の “dashOffset拡張” 前提のまま）
    if (mat.isLineDashedMaterial) {
      const dashSize =
        typeof mat.dashSize === "number" && mat.dashSize > 0 ? mat.dashSize : 0.4;
      const gapSize =
        typeof mat.gapSize === "number" && mat.gapSize > 0 ? mat.gapSize : 0.2;
      const period = dashSize + gapSize;

      if (typeof mat.dashOffset === "number") {
        mat.dashOffset += delta;
        if (period > 0) mat.dashOffset = ((mat.dashOffset % period) + period) % period;
      } else if (mat.uniforms && mat.uniforms.dashOffset) {
        const u = mat.uniforms.dashOffset;
        if (typeof u.value !== "number" || !Number.isFinite(u.value)) u.value = 0;
        u.value += delta;
        if (period > 0) u.value = ((u.value % period) + period) % period;
      }
      return;
    }
  }

  function getBaseScale0(mesh) {
    if (!mesh) return null;
    if (!mesh.userData) mesh.userData = {};
    if (!mesh.userData.baseScale0) mesh.userData.baseScale0 = mesh.scale.clone();
    return mesh.userData.baseScale0;
  }

  function applyRadialScale(mesh, factor) {
    const base0 = getBaseScale0(mesh);
    if (!base0) return;
    mesh.scale.set(base0.x * factor, base0.y, base0.z * factor);
  }

  function applyGlowEffect(obj, effect, cycleT) {
    const inner = obj.userData.haloInner;
    const outer = obj.userData.haloOuter;
    if (!inner && !outer) return;

    const ampRaw = typeof effect.amplitude === "number" ? effect.amplitude : 0.6;
    const amplitude = Math.max(0, Math.min(ampRaw, 1));

    const wave = Math.sin(2 * Math.PI * cycleT) * 0.5 + 0.5;

    if (inner && inner.material) {
      const baseOpacity =
        typeof inner.userData.baseOpacity === "number"
          ? inner.userData.baseOpacity
          : inner.material.opacity;
      inner.material.opacity = baseOpacity * (0.7 + 0.3 * wave);
      applyRadialScale(inner, 1 + amplitude * 0.25 * (wave - 0.5));
    }

    if (outer && outer.material) {
      const baseOpacity =
        typeof outer.userData.baseOpacity === "number"
          ? outer.userData.baseOpacity
          : outer.material.opacity;
      outer.material.opacity = baseOpacity * (0.4 + 0.2 * wave);
      applyRadialScale(outer, 1 + amplitude * 0.35 * (wave - 0.5));
    }
  }

  function applyPulseEffect(obj, effect, cycleT) {
    const inner = obj.userData.haloInner;
    const outer = obj.userData.haloOuter;

    const ampRaw = typeof effect.amplitude === "number" ? effect.amplitude : 0.9;
    const amplitude = Math.max(0, Math.min(ampRaw, 1));

    let s = Math.sin(Math.PI * cycleT);
    if (s < 0) s = 0;
    const wave = Math.pow(s, 3);

    const mat = getPrimaryMaterial(obj);
    if (mat && mat.color) {
      // ★ pulse は毎フレーム base color から開始せんと色が累積して白飛びする
      if (!obj.userData) obj.userData = {};
      if (!obj.userData.baseLineColor0) obj.userData.baseLineColor0 = mat.color.clone();
      mat.color.copy(obj.userData.baseLineColor0);
      const hsl = { h: 0, s: 0, l: 0 };
      mat.color.getHSL(hsl);
      hsl.l = Math.min(1.0, hsl.l + amplitude * 0.35 * wave);
      mat.color.setHSL(hsl.h, hsl.s, hsl.l);
    }

    const baseFloor = 0.05;

    if (inner && inner.material) {
      const baseOpacity =
        typeof inner.userData.baseOpacity === "number"
          ? inner.userData.baseOpacity
          : inner.material.opacity;
      inner.material.opacity = baseOpacity * (baseFloor + (1 - baseFloor) * wave);
      applyRadialScale(inner, 1 + amplitude * 0.6 * wave);
    }

    if (outer && outer.material) {
      const baseOpacity =
        typeof outer.userData.baseOpacity === "number"
          ? outer.userData.baseOpacity
          : outer.material.opacity;
      outer.material.opacity = baseOpacity * (baseFloor + 0.7 * wave);
      applyRadialScale(outer, 1 + amplitude * 0.4 * wave);
    }
  }

  function updateLineEffects(dtSec) {
    if (!Number.isFinite(dtSec) || dtSec <= 0) return;
    dtSec = Math.min(dtSec, 0.05);
    timeSec += dtSec;

    lineObjects.forEach((obj) => {
      if (!obj) return;

      const effect = obj.userData?.effect || null;
      const effectType = obj.userData?.effectType || null;
      const hasEffect = !!effectType && !!effect;

      if (obj.visible === false) {
        if (hasEffect && effectType === "flow") applyFlowEffect(obj, effect, dtSec);
        return;
      }

      const mat = getPrimaryMaterial(obj);
      if (!mat) return;

      if (!hasEffect) {
        if (mat.isLineDashedMaterial) {
          if (typeof mat.dashOffset === "number") mat.dashOffset = 0;
          else if (mat.uniforms && mat.uniforms.dashOffset) mat.uniforms.dashOffset.value = 0;
        }
        return;
      }

      if (effectType === "flow") {
        applyFlowEffect(obj, effect, dtSec);
        return;
      }

      const duration =
        typeof effect.duration === "number" && effect.duration > 0 ? effect.duration : 1.0;
      const speed =
        typeof effect.speed === "number" && Number.isFinite(effect.speed) ? effect.speed : 1.0;
      const phase =
        typeof effect.phase === "number" && Number.isFinite(effect.phase) ? effect.phase : 0;
      const easing =
        typeof effect.easing === "string" && effect.easing.length > 0
          ? effect.easing
          : "sine_in_out";

      const freq = speed / duration;
      const rawT = timeSec * freq + phase;
      const cycleT = ((rawT % 1) + 1) % 1;
      const easedT = applyEasing(cycleT, easing);

      if (effectType === "glow") applyGlowEffect(obj, effect, easedT);
      else if (effectType === "pulse") applyPulseEffect(obj, effect, easedT);
    });
  }

  function dispose() {
    reset();
  }

  return { updateLineEffects, reset, dispose };
}
