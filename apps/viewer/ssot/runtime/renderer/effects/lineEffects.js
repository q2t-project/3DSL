// viewer/runtime/renderer/effects/lineEffects.js

// lineEffectsRuntime:
// - flow / glow / pulse のアニメーション
// - selection ハイライト（macro 用）
// - baseStyle を壊さず、「毎フレーム base に戻してから」上書きする
 import * as THREE from "/viewer/vendor/three/build/three.module.js";

function _normLineWidthMode(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return (s === "auto" || s === "fixed" || s === "adaptive") ? s : null;
}

function _normMicroFXProfile(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return (s === "weak" || s === "normal" || s === "strong") ? s : null;
}

const _PROFILE_FACTOR = {
  weak: 0.75,
  normal: 1.0,
  strong: 1.35,
};

export function createLineEffectsRuntime({ lineObjects, baseStyle }) {
  // uuid -> highlight level (0 以上の数値; 0 or undefined なら非ハイライト)
  const highlightLevels = new Map();

  // ------------------------------
  // viewer settings（外部から切替）
  // ------------------------------
  let _lineWidthMode = "auto";     // "auto" | "fixed" | "adaptive"
  let _microFXProfile = "normal";  // "weak" | "normal" | "strong"

  function setLineWidthMode(mode) {
    const m = _normLineWidthMode(mode);
    if (!m) return;
    _lineWidthMode = m;
  }

  function setMicroFXProfile(profile) {
    const p = _normMicroFXProfile(profile);
    if (!p) return;
    _microFXProfile = p;
  }

  let lastTime = performance.now();
  let timeSec = 0; // 経過秒

  // ------------------------------
  // ハイライト制御（外部 API）
  // ------------------------------

  function clearAllHighlights() {
    highlightLevels.clear();
  }

  function setHighlight({ uuid, level = 1 } = {}) {
    if (!uuid) return;
    if (!level || level <= 0) {
      highlightLevels.delete(uuid);
    } else {
      highlightLevels.set(uuid, level);
    }
  }

  // 互換：旧 selectionState: { uuid } を level=1 で扱う
  function applySelection(selectionState) {
    clearAllHighlights();
    if (selectionState && selectionState.uuid) {
      setHighlight({ uuid: selectionState.uuid, level: 1 });
    }
  }

  // ------------------------------
  // easing ユーティリティ
  // ------------------------------

  function applyEasing(t, easing) {
    // t: 0〜1
    switch (easing) {
      case "sine_in": {
        return 1 - Math.cos((t * Math.PI) / 2);
      }
      case "sine_out": {
        return Math.sin((t * Math.PI) / 2);
      }
      case "sine_in_out":
      case "sine": {
        return -(Math.cos(Math.PI * t) - 1) / 2;
      }
      case "quad_in": {
        return t * t;
      }
      case "quad_out": {
        return t * (2 - t);
      }
      case "quad_in_out": {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }
      case "linear":
      default:
        return t;
    }
  }

  // ------------------------------
  // 各 effect ごとの反映
  // ------------------------------

  function applyFlowEffect(obj, effect, dtSec) {
    const mat = obj.material;
    if (!mat || !mat.isLineDashedMaterial) return;

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

    // three.js のバージョンによって dashOffset の場所が違う可能性があるので両対応
    if (typeof mat.dashOffset === "number") {
      mat.dashOffset += delta;
    } else if (mat.uniforms && mat.uniforms.dashOffset) {
      mat.uniforms.dashOffset.value += delta;
    }
  }

  function applyGlowEffect(obj, effect, cycleT, highlightLevel, profileFactor) {
    const inner = obj.userData.haloInner;
    const outer = obj.userData.haloOuter;
    if (!inner && !outer) return;

    const ampRaw =
      typeof effect.amplitude === "number" ? effect.amplitude : 0.6;
    const amplitude = Math.max(0, Math.min(ampRaw, 1)) * (profileFactor || 1);

    // 0..1 の滑らかな波
    const wave = Math.sin(2 * Math.PI * cycleT) * 0.5 + 0.5;

    const extraHighlight = highlightLevel
      ? 0.15 * highlightLevel * (profileFactor || 1)
      : 0;

    if (inner && inner.material) {
      const baseOpacity =
        typeof inner.userData.baseOpacity === "number"
          ? inner.userData.baseOpacity
          : inner.material.opacity;

      inner.material.opacity =
        baseOpacity * (0.7 + 0.3 * wave + extraHighlight);
      inner.material.needsUpdate = true;

      // 半径方向だけ少しふくらませる
      const radialFactor = 1 + amplitude * 0.25 * (wave - 0.5);
      applyRadialScale(inner, 1 + radialFactor);
    }

    if (outer && outer.material) {
      const baseOpacity =
        typeof outer.userData.baseOpacity === "number"
          ? outer.userData.baseOpacity
          : outer.material.opacity;

      outer.material.opacity =
        baseOpacity * (0.4 + 0.2 * wave + extraHighlight * 0.5);
      outer.material.needsUpdate = true;

      const radialFactor = 1 + amplitude * 0.35 * (wave - 0.5);
      applyRadialScale(outer, 1 + radialFactor);
    }
  }

  function applyPulseEffect(obj, effect, cycleT, highlightLevel, profileFactor) {
    const inner = obj.userData.haloInner;
    const outer = obj.userData.haloOuter;

    const ampRaw =
      typeof effect.amplitude === "number" ? effect.amplitude : 0.9;
    const amplitude = Math.max(0, Math.min(ampRaw, 1)) * (profileFactor || 1);

    // 鼓動カーブ：
    // 0 〜 1 の間で立ち上がり速く、減衰長め
    let s = Math.sin(Math.PI * cycleT); // 0..1..0
    if (s < 0) s = 0;
    const wave = Math.pow(s, 3);        // ピークを尖らせる 0..1

    const extraHighlight = highlightLevel
      ? 0.2 * highlightLevel * (profileFactor || 1)
      : 0;

    // 線本体もドクンと明るく
    const mat = obj.material;
    if (mat && mat.color) {
      const hsl = { h: 0, s: 0, l: 0 };
      mat.color.getHSL(hsl);
      const deltaL = amplitude * 0.35 * wave + extraHighlight * 0.3;
      hsl.l = Math.min(1.0, hsl.l + deltaL);
      mat.color.setHSL(hsl.h, hsl.s, hsl.l);
      mat.needsUpdate = true;
    }

    // 「間」はほぼ消す（5% 程度だけ残す）
    const baseFloor = 0.05;

    if (inner && inner.material) {
      const baseOpacity =
        typeof inner.userData.baseOpacity === "number"
          ? inner.userData.baseOpacity
          : inner.material.opacity;

      const opFactor = baseFloor + (1 - baseFloor) * wave;
      inner.material.opacity =
        baseOpacity * (opFactor + extraHighlight);
      inner.material.needsUpdate = true;

      // 半径方向だけドクンと膨らむ
      const radialFactor = 1 + amplitude * 0.6 * wave;
      applyRadialScale(inner, radialFactor);
    }

    if (outer && outer.material) {
      const baseOpacity =
        typeof outer.userData.baseOpacity === "number"
          ? outer.userData.baseOpacity
          : outer.material.opacity;

      const opFactor = baseFloor + 0.7 * wave;
      outer.material.opacity =
        baseOpacity * (opFactor + extraHighlight * 0.5);
      outer.material.needsUpdate = true;

      const radialFactor = 1 + amplitude * 0.4 * wave;
      applyRadialScale(outer, radialFactor);
    }
  }

  function _readBaseLineWidth(base, mat) {
    const v =
      (base && typeof base.linewidth === "number" && Number.isFinite(base.linewidth))
        ? base.linewidth
        : (base && typeof base.lineWidth === "number" && Number.isFinite(base.lineWidth))
          ? base.lineWidth
          : null;
    if (v != null) return v;
    if (mat && typeof mat.linewidth === "number" && Number.isFinite(mat.linewidth)) {
      return mat.linewidth;
    }
    return null;
  }

  function _clampLineWidth(v) {
    if (!Number.isFinite(v)) return v;
    return Math.max(0.25, Math.min(v, 16));
  }

  function _applyLineWidthMode(mat, base, highlightLevel, profileFactor) {
    if (!mat || typeof mat.linewidth !== "number") return;
    const baseW = _readBaseLineWidth(base, mat);
    if (!Number.isFinite(baseW)) return;

    let w = baseW;
    if (_lineWidthMode === "adaptive") {
      const hl = Math.max(0, Math.min(Number(highlightLevel) || 0, 6));
      w = baseW * (1 + 0.15 * hl * (profileFactor || 1));
    } else {
      // "auto"/"fixed" は baseW に戻すだけ（距離ベースの調整は別モジュールでやる想定）
      w = baseW;
    }
    mat.linewidth = _clampLineWidth(w);
  }

  // ------------------------------
  // 毎フレーム呼ばれる更新処理
  // ------------------------------

  function updateLineEffects() {
    const now = performance.now();
    const dtSec = (now - lastTime) / 1000;
    lastTime = now;
    if (!Number.isFinite(dtSec) || dtSec <= 0) return;

    timeSec += dtSec;
    const profileFactor = _PROFILE_FACTOR[_microFXProfile] || 1.0;

    lineObjects.forEach((obj, uuid) => {
      const base = baseStyle.get(uuid);
      const mat = obj.material;
      if (!base || !mat) return;

      const effect = obj.userData?.effect || null;
      const effectType = obj.userData?.effectType || null;
      const highlightLevel = highlightLevels.get(uuid) || 0;

      // まず base にリセット
      if (mat.color && base.color) {
        mat.color.copy(base.color);
      }
      if (typeof base.opacity === "number") {
        mat.opacity = base.opacity;
      }

      // lineWidthMode（あれば反映）
      _applyLineWidthMode(mat, base, highlightLevel, profileFactor);

      // dashed でも effect が無い場合は dashOffset を 0 に戻しておく
      if (!effectType && mat.isLineDashedMaterial) {
        if (typeof mat.dashOffset === "number") {
          mat.dashOffset = 0;
        } else if (mat.uniforms && mat.uniforms.dashOffset) {
          mat.uniforms.dashOffset.value = 0;
        }
      }

      // ライン本体への「選択ハイライト」（macro 用）
      if (highlightLevel > 0) {
        if (mat.color) {
          const hsl = { h: 0, s: 0, l: 0 };
          mat.color.getHSL(hsl);
          const lBoost = Math.min(0.25 * highlightLevel * profileFactor, 0.6);
          hsl.l = Math.min(1.0, hsl.l + lBoost);
          mat.color.setHSL(hsl.h, hsl.s, hsl.l);
        }
      }

      // ハローの base を戻す（effect 用に毎フレームリセット）
      const inner = obj.userData.haloInner;
      const outer = obj.userData.haloOuter;

      if (inner && inner.material) {
        const baseOpacity =
          typeof inner.userData.baseOpacity === "number"
            ? inner.userData.baseOpacity
            : inner.material.opacity;
        const baseScale = inner.userData.baseScale || inner.scale;
        inner.material.opacity = baseOpacity;
        inner.scale.copy(baseScale);
      }

      if (outer && outer.material) {
        const baseOpacity =
          typeof outer.userData.baseOpacity === "number"
            ? outer.userData.baseOpacity
            : outer.material.opacity;
        const baseScale = outer.userData.baseScale || outer.scale;
        outer.material.opacity = baseOpacity;
        outer.scale.copy(baseScale);
      }

      // effect が無ければここまで
      if (!effectType || !effect) return;

      // 共通パラメータを読み出し
      const duration =
        typeof effect.duration === "number" && effect.duration > 0
          ? effect.duration
          : 1.0;
      const speed =
        typeof effect.speed === "number" && Number.isFinite(effect.speed)
          ? effect.speed
          : 1.0;
      const phase =
        typeof effect.phase === "number" && Number.isFinite(effect.phase)
          ? effect.phase
          : 0;
      const easing =
        typeof effect.easing === "string" && effect.easing.length > 0
          ? effect.easing
          : "sine_in_out";

      // flow は dashOffset アニメ、glow/pulse は周期波形を使う
      if (effectType === "flow") {
        applyFlowEffect(obj, effect, dtSec);
      } else {
        // cycleT: 0〜1 の周期位置
        const freq = speed / duration; // Hz 的な扱い
        const rawT = timeSec * freq + phase;
        // phase は 0〜1 前提で mod する（多少ズレても見た目に支障はない）
        const cycleT = ((rawT % 1) + 1) % 1;
        const easedT = applyEasing(cycleT, easing);

        if (effectType === "glow") {
          applyGlowEffect(obj, effect, easedT, highlightLevel, profileFactor);
        } else if (effectType === "pulse") {
          applyPulseEffect(obj, effect, easedT, highlightLevel, profileFactor);
        }
      }
    });
  }

  // baseScale を元に「半径方向だけ」スケールさせる
  function applyRadialScale(mesh, factor) {
    if (!mesh) return;
    const baseScale = mesh.userData.baseScale || mesh.scale;
    mesh.scale.set(
      baseScale.x * factor, // 半径 X
      baseScale.y,          // 長手 Y は固定
      baseScale.z * factor  // 半径 Z
    );
  }

  return {
    clearAllHighlights,
    setHighlight,
    applySelection,
    updateLineEffects,
    setLineWidthMode,
    setMicroFXProfile,
  };
}
