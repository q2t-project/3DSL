// runtime/core/CameraEngine.js

const EPSILON = 1e-4;
const MIN_DISTANCE = 0.1;
const MAX_DISTANCE = 1000;
const MAX_COORD = 1e4;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sanitizePosition(positionVec3) {
  if (!Array.isArray(positionVec3) || positionVec3.length !== 3) {
    return [0, 0, 0];
  }

  return positionVec3.map((v) => {
    let n = Number(v);
    if (!Number.isFinite(n)) n = 0;
    return clamp(n, -MAX_COORD, MAX_COORD);
  });
}

export function createCameraEngine(initialState = {}) {
  // ★ この state だけを真実として使う
  const state = {
    theta:
      typeof initialState.theta === "number"
        ? initialState.theta
        : 0,
    phi: clamp(
      initialState.phi ?? Math.PI / 2,
      EPSILON,
      Math.PI - EPSILON
    ),
    distance: clamp(
      initialState.distance ?? 4,
      MIN_DISTANCE,
      MAX_DISTANCE
    ),
    target: {
      x: initialState.target?.x ?? 0,
      y: initialState.target?.y ?? 0,
      z: initialState.target?.z ?? 0,
    },
    fov:
      typeof initialState.fov === "number"
        ? initialState.fov
        : 50,
  };

  const api = {
    rotate(dTheta, dPhi) {
      state.theta += dTheta;
      state.phi = clamp(
        state.phi + dPhi,
        EPSILON,
        Math.PI - EPSILON
      );
      return state;
    },

    // Z-up 版パン処理
    // - 水平方向（dx）は「画面右方向」に相当するベクトル R（Z 軸回りの右）に沿って移動
    //   R = (-sinθ, cosθ, 0)
    //   ターゲットを -dx * R だけ動かすことで「カメラが右へ動いた」ように見せる
    // - 垂直方向（dy）はワールド Z 方向にそのまま乗せる
    pan(dx, dy) {
      const cosTheta = Math.cos(state.theta);
      const sinTheta = Math.sin(state.theta);

      // カメラから見た「右」ベクトル（Z-up）
      const rightX = -sinTheta;
      const rightY =  cosTheta;

      // カメラ移動と逆向きにターゲットを動かす
      state.target.x += -dx * rightX;
      state.target.y += -dx * rightY;
      state.target.z += dy;
      return state;
    },

    zoom(delta) {
      const factor = 1 + delta;
      state.distance = clamp(
        state.distance * factor,
        MIN_DISTANCE,
        MAX_DISTANCE
      );
      return state;
    },

    computeFocusState(positionVec3, opts = {}) {
      const [x, y, z] = sanitizePosition(positionVec3);

      const mode =
        opts.mode === "preserve" ? "preserve" : "approach";
      const distanceFactor =
        typeof opts.distanceFactor === "number"
          ? opts.distanceFactor
          : 0.7;

      // min/max は「渡されていればそれを使う」、無ければグローバルな範囲
      const minD =
        typeof opts.minDistance === "number"
          ? clamp(opts.minDistance, MIN_DISTANCE, MAX_DISTANCE)
          : MIN_DISTANCE;

      const maxD =
        typeof opts.maxDistance === "number"
          ? clamp(opts.maxDistance, MIN_DISTANCE, MAX_DISTANCE)
          : MAX_DISTANCE;

      let nextDistance = state.distance;
      if (mode === "approach") {
        nextDistance = state.distance * distanceFactor;
      }

      nextDistance = clamp(nextDistance, minD, maxD);

      return {
        theta: state.theta,
        phi: state.phi,
        distance: nextDistance,
        target: { x, y, z },
        fov: state.fov,
      };
    },

    // TODO: camera lerp（スムーズ遷移）を再導入する場合は、
    // ここに beginLerp / stepLerp を追加して制御する。
    // 現状は「即時反映のみ」で運用しているため未実装。

    setState(partial) {
      if (!partial || typeof partial !== "object") return state;

      if ("theta" in partial) state.theta = partial.theta;
      if ("phi" in partial) {
        state.phi = clamp(
          partial.phi,
          EPSILON,
          Math.PI - EPSILON
        );
      }
      if ("distance" in partial) {
        state.distance = clamp(
          partial.distance,
          MIN_DISTANCE,
          MAX_DISTANCE
        );
      }
      if (partial.target && typeof partial.target === "object") {
        if (typeof partial.target.x === "number") {
          state.target.x = partial.target.x;
        }
        if (typeof partial.target.y === "number") {
          state.target.y = partial.target.y;
        }
        if (typeof partial.target.z === "number") {
          state.target.z = partial.target.z;
        }
      }
      if ("fov" in partial) state.fov = partial.fov;

      return state;
    },

    getState() {
      return state;
    },

    reset() {
      state.theta = 0;
      state.phi = clamp(Math.PI / 2, EPSILON, Math.PI - EPSILON);
      state.distance = 4;
      state.target.x = 0;
      state.target.y = 0;
      state.target.z = 0;
      state.fov = 50;
      return state;
    },
  };

  return api;
}
