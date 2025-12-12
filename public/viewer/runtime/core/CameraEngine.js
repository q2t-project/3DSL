// runtime/core/cameraEngine.js

import {
  CAMERA_VIEW_DEFS,
  CAMERA_VIEW_ALIASES,
  CAMERA_VIEW_PRESET_SEQUENCE,
  CAMERA_VIEW_PRESET_COUNT,
} from "./cameraViewDefs.js";

const EPSILON = 1e-4;
const MIN_DISTANCE = 0.01;
const MAX_DISTANCE = 1000;
const MAX_COORD = 1e4;

// AutoOrbit 用の速度テーブル（段階：1〜N）
const AUTO_ORBIT_SPEED_TABLE = [
  0,                 // 0 は未使用
  Math.PI / 24,      // level 1: ゆっくり
  Math.PI / 16,      // level 2
  Math.PI / 12,      // level 3: そこそこ速い
];

const MAX_AUTO_ORBIT_SPEED_LEVEL = AUTO_ORBIT_SPEED_TABLE.length - 1;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampAutoOrbitSpeedLevel(level) {
  let n = Number(level);
  if (!Number.isFinite(n)) n = 1;
  n = Math.floor(n);
  return clamp(n, 1, MAX_AUTO_ORBIT_SPEED_LEVEL);
}

function sanitizeScalarCoord(v) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = 0;
  return clamp(n, -MAX_COORD, MAX_COORD);
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

function normalizePresetIndex(index) {
  const n = CAMERA_VIEW_PRESET_COUNT || 0;
  if (!n) return 0;

  let i = Number(index);
  if (!Number.isFinite(i)) i = 0;
  i = Math.floor(i);

  if (i < 0) {
    return ((i % n) + n) % n;
  }
  return i % n;
}

// ★ metrics.center / radius を使ったデフォルト算出ヘルパ
function deriveMetricsDefaults(metrics) {
  if (!metrics || typeof metrics !== "object") {
    return {
      target: { x: 0, y: 0, z: 0 },
      distance: 4, // 従来デフォルト
    };
  }

  // center: [x,y,z] or {x,y,z}
  let cx = 0;
  let cy = 0;
  let cz = 0;

  const center = metrics.center;
  if (Array.isArray(center) && center.length >= 3) {
    cx = sanitizeScalarCoord(center[0]);
    cy = sanitizeScalarCoord(center[1]);
    cz = sanitizeScalarCoord(center[2]);
  } else if (center && typeof center === "object") {
    if ("x" in center) cx = sanitizeScalarCoord(center.x);
    if ("y" in center) cy = sanitizeScalarCoord(center.y);
    if ("z" in center) cz = sanitizeScalarCoord(center.z);
  }

  let distance = 4;
  if (typeof metrics.radius === "number" && Number.isFinite(metrics.radius)) {
    // ★ 仕様：distance = radius * 2.4（クランプ付き）
    distance = clamp(metrics.radius * 2.4, MIN_DISTANCE, MAX_DISTANCE);
  }

  return {
    target: { x: cx, y: cy, z: cz },
    distance,
  };
}

/**
 * CameraEngine は runtime 内部専用の実装クラス。
 *
 * - 外部アプリや dev harness が直接 new してはならない。
 * - viewer の起動は必ず bootstrapViewer / bootstrapViewerFromUrl を通すこと。
 *
 * new CameraEngine(...) を呼んでよいのは runtime/bootstrapViewer.js だけを想定する。
 */

export function createCameraEngine(initialState = {}, options = {}) {
  // ★ metrics: { center, radius } をここで受ける想定
  const { metrics } = options;

  const metricsDefaults = deriveMetricsDefaults(metrics);

  // ★ 初期 state を一度だけ決定。reset もここに戻す
  const initial = {
    // theta: Yaw（水平回転）
    theta:
      typeof initialState.theta === "number"
        ? initialState.theta
        : 0,

    // phi: Z 軸からの極角（0 ≒ 真上, π/2 ≒ 水平, π ≒ 真下）
    phi: clamp(
      initialState.phi ?? Math.PI / 2,
      EPSILON,
      Math.PI - EPSILON
    ),

    distance: clamp(
      // metrics.radius があれば radius*2.4 をデフォルトにしつつ、
      // initialState.distance 明示指定があればそっち優先
      initialState.distance ?? metricsDefaults.distance,
      MIN_DISTANCE,
      MAX_DISTANCE
    ),

    target: {
      x: sanitizeScalarCoord(
        initialState.target?.x ?? metricsDefaults.target.x
      ),
      y: sanitizeScalarCoord(
        initialState.target?.y ?? metricsDefaults.target.y
      ),
      z: sanitizeScalarCoord(
        initialState.target?.z ?? metricsDefaults.target.z
      ),
    },

    // three.js Camera と同様、fov は「度数法」で扱う想定
    fov:
      typeof initialState.fov === "number"
        ? initialState.fov
        : 50,
  };

  // ★ state は initial のコピー。reset で initial に戻す
  const state = {
    theta: initial.theta,
    phi: initial.phi,
    distance: initial.distance,
    target: {
      x: initial.target.x,
      y: initial.target.y,
      z: initial.target.z,
    },
    fov: initial.fov,
  };

  // 現在の view preset index（0〜N-1）
  // - setViewPreset 経由で更新
  // - 手動オービット等でプリセット外になったら null のまま
  let currentPresetIndex = null;

  // ★ 自動ぐるり俯瞰用 AutoOrbit 状態
  const autoOrbit = {
    enabled: false,
    direction: 1,      // +1: 正転, -1: 逆転
    speedLevel: 0,     // 0: 無効, 1〜N
    angularSpeed: 0,   // 実際に使う角速度 [rad/sec]
  };

  const api = {
    /**
     * 軸スナップ:
     *  - "x" / "+x"  : +X 方向から原点を見る
     *  - "-x"        : -X 方向
     *  - "y" / "+y"  : +Y 方向
     *  - "-y"        : -Y 方向
     *  - "z" / "+z"  : 真上（+Z）
     *  - "-z"        : 真下（-Z）
     *
     * 距離 / ターゲット / FOV はそのまま、theta/phi だけ切り替える。
     */
    snapToAxis(axis) {
      const raw = String(axis || "").toLowerCase();

      let key = null;
      switch (raw) {
        case "x":
        case "+x":
        case "x+":
          key = "x+";
          break;
        case "-x":
        case "x-":
          key = "x-";
          break;

        case "y":
        case "+y":
        case "y+":
          key = "y+";
          break;
        case "-y":
        case "y-":
          key = "y-";
          break;

        case "z":
        case "+z":
        case "z+":
          key = "z+";
          break;
        case "-z":
        case "z-":
          key = "z-";
          break;

        default:
          return state;
      }

      const def = CAMERA_VIEW_DEFS[key];
      if (!def) return state;

      state.theta = def.theta;
      state.phi = clamp(def.phi, EPSILON, Math.PI - EPSILON);
      return state;
    },

    // --------------------------------------------------------
    // 名前からビューを切り替え ("front" / "top" / "iso-ne" など)
    // --------------------------------------------------------
    setViewByName(name) {
      if (!name) return state;

      const raw = String(name);
      let key = null;

      if (
        CAMERA_VIEW_ALIASES &&
        Object.prototype.hasOwnProperty.call(CAMERA_VIEW_ALIASES, raw)
      ) {
        key = CAMERA_VIEW_ALIASES[raw];
      } else if (
        CAMERA_VIEW_DEFS &&
        Object.prototype.hasOwnProperty.call(CAMERA_VIEW_DEFS, raw)
      ) {
        key = raw;
      }

      if (!key) return state;

      const def = CAMERA_VIEW_DEFS[key];
      if (!def) return state;

      state.theta = def.theta;
      state.phi = clamp(def.phi, EPSILON, Math.PI - EPSILON);
      return state;
    },

    // --------------------------------------------------------
    // 7 プリセット index からビューを切り替え
    //   - 仕様の setViewPreset(view_preset_index) に対応
    // --------------------------------------------------------
    setViewPreset(index, opts = {}) {
      if (!CAMERA_VIEW_PRESET_COUNT) return state;

      const i = normalizePresetIndex(index);
      const key = CAMERA_VIEW_PRESET_SEQUENCE[i];
      const def = key && CAMERA_VIEW_DEFS[key];
      if (!def) return state;

      // 方向はテーブル通りに決め打ち
      state.theta = def.theta;
      state.phi = clamp(def.phi, EPSILON, Math.PI - EPSILON);
      currentPresetIndex = i;

      // ターゲット / 距離 / FOV はオプションで上書き可能
      const { target, distance, fov } = opts;

      if (target && typeof target === "object") {
        if (Array.isArray(target)) {
          const [tx = 0, ty = 0, tz = 0] = target;
          state.target.x = sanitizeScalarCoord(tx);
          state.target.y = sanitizeScalarCoord(ty);
          state.target.z = sanitizeScalarCoord(tz);
        } else {
          if ("x" in target) state.target.x = sanitizeScalarCoord(target.x);
          if ("y" in target) state.target.y = sanitizeScalarCoord(target.y);
          if ("z" in target) state.target.z = sanitizeScalarCoord(target.z);
        }
      }

      if (typeof distance === "number") {
        state.distance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
      }
      if (typeof fov === "number") {
        state.fov = fov;
      }

      return state;
    },

    /**
     * 現在の view preset index を返す。
     * - 直近の setViewPreset の値を優先
     * - なければ theta/phi 完全一致でプリセットを探索
     * - 見つからなければ 0 を返す
     */
    getViewPresetIndex() {
      if (currentPresetIndex != null) {
        return currentPresetIndex;
      }

      if (
        Array.isArray(CAMERA_VIEW_PRESET_SEQUENCE) &&
        CAMERA_VIEW_PRESET_SEQUENCE.length === CAMERA_VIEW_PRESET_COUNT
      ) {
        for (let i = 0; i < CAMERA_VIEW_PRESET_SEQUENCE.length; i++) {
          const key = CAMERA_VIEW_PRESET_SEQUENCE[i];
          const def = key && CAMERA_VIEW_DEFS[key];
          if (!def) continue;

          if (
            Math.abs(def.theta - state.theta) < 1e-3 &&
            Math.abs(def.phi - state.phi) < 1e-3
          ) {
            currentPresetIndex = i;
            return i;
          }
        }
      }
      return 0;
    },

    // --------------------------------------------------------
    // 角度回転（オービット）
    //   - dTheta: 水平回転量（rad）
    //   - dPhi  : 垂直回転量（rad）
    // --------------------------------------------------------
    rotate(dTheta, dPhi) {
      let dth = Number(dTheta);
      let dph = Number(dPhi);
      if (!Number.isFinite(dth)) dth = 0;
      if (!Number.isFinite(dph)) dph = 0;

      state.theta += dth;
      state.phi = clamp(
        state.phi + dph,
        EPSILON,
        Math.PI - EPSILON
      );
      return state;
    },

    // Z-up 版パン処理
    pan(dx, dy) {
      const cosTheta = Math.cos(state.theta);
      const sinTheta = Math.sin(state.theta);

      // カメラから見た「右」ベクトル（Z-up）
      const rightX = -sinTheta;
      const rightY =  cosTheta;

      // カメラ移動と逆向きにターゲットを動かす
      state.target.x = sanitizeScalarCoord(
        state.target.x + -dx * rightX
      );
      state.target.y = sanitizeScalarCoord(
        state.target.y + -dx * rightY
      );
      state.target.z = sanitizeScalarCoord(
        state.target.z + dy
      );
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

    // ------------------------------------------------------------
    // AutoOrbit（自動ぐるり俯瞰）制御
    // ------------------------------------------------------------

    /**
     * 毎フレーム呼ばれる想定（viewerHub から dt[sec] を渡す）
     * - AutoOrbit 中なら theta を dt ベースで進める
     */
    update(dt) {
      const d = Number(dt);
      if (!Number.isFinite(d) || d <= 0) return state;

      if (autoOrbit.enabled && autoOrbit.angularSpeed > 0) {
        const deltaAngle =
          autoOrbit.direction * autoOrbit.angularSpeed * d;
        state.theta += deltaAngle;
      }

      return state;
    },

    /**
     * AutoOrbit 開始
     */
  startAutoOrbit(opts = {}) {
    const {
      center,
      radius,
      isoPhi,
      fov,
      direction = 1,
      speedLevel = 1,
    } = opts;

    // center 正規化
    let cx = state.target.x;
    let cy = state.target.y;
    let cz = state.target.z;

    if (Array.isArray(center) && center.length === 3) {
      cx = sanitizeScalarCoord(center[0]);
      cy = sanitizeScalarCoord(center[1]);
      cz = sanitizeScalarCoord(center[2]);
    } else if (center && typeof center === "object") {
      if ("x" in center) cx = sanitizeScalarCoord(center.x);
      if ("y" in center) cy = sanitizeScalarCoord(center.y);
      if ("z" in center) cz = sanitizeScalarCoord(center.z);
    }

    // ★ 距離は基本「いまの距離」を保つ。
    // radius が明示指定されたときだけ、その値を距離として採用。
    let nextDistance = state.distance;
    if (typeof radius === "number" && Number.isFinite(radius) && radius > 0) {
      nextDistance = clamp(radius, MIN_DISTANCE, MAX_DISTANCE);
    }

    const nextPhi =
      typeof isoPhi === "number"
        ? clamp(isoPhi, EPSILON, Math.PI - EPSILON)
        : state.phi;

    const nextFov =
      typeof fov === "number" ? fov : state.fov;

    // カメラ state 更新
    state.target.x = cx;
    state.target.y = cy;
    state.target.z = cz;
    state.phi = nextPhi;
    state.distance = nextDistance;
    state.fov = nextFov;

    // AutoOrbit 設定
    autoOrbit.enabled = true;
    autoOrbit.direction = direction >= 0 ? 1 : -1;
    autoOrbit.speedLevel = clampAutoOrbitSpeedLevel(speedLevel);
    autoOrbit.angularSpeed =
      AUTO_ORBIT_SPEED_TABLE[autoOrbit.speedLevel];

    return state;
    },

    /**
     * AutoOrbit 中のパラメータ更新
     */
    updateAutoOrbitSettings(opts = {}) {
      if (!autoOrbit.enabled) return state;

      const { direction, speedLevel } = opts;

      if (direction != null) {
        autoOrbit.direction = direction >= 0 ? 1 : -1;
      }

      if (speedLevel != null) {
        autoOrbit.speedLevel = clampAutoOrbitSpeedLevel(speedLevel);
        autoOrbit.angularSpeed =
          AUTO_ORBIT_SPEED_TABLE[autoOrbit.speedLevel];
      }

      return state;
    },

    /**
     * AutoOrbit 停止
     */
    stopAutoOrbit() {
      autoOrbit.enabled = false;
      autoOrbit.speedLevel = 0;
      autoOrbit.angularSpeed = 0;
      return state;
    },

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
        if ("x" in partial.target) {
          state.target.x = sanitizeScalarCoord(partial.target.x);
        }
        if ("y" in partial.target) {
          state.target.y = sanitizeScalarCoord(partial.target.y);
        }
        if ("z" in partial.target) {
          state.target.z = sanitizeScalarCoord(partial.target.z);
        }
      }

      if ("fov" in partial) state.fov = partial.fov;

      return state;
    },

    getState() {
      return state;
    },

    // ★ reset で initialSnapshot に戻すように変更
    reset() {
      state.theta = initial.theta;
      state.phi = initial.phi;
      state.distance = initial.distance;
      state.target.x = initial.target.x;
      state.target.y = initial.target.y;
      state.target.z = initial.target.z;
      state.fov = initial.fov;

      // AutoOrbit もリセット
      autoOrbit.enabled = false;
      autoOrbit.direction = 1;
      autoOrbit.speedLevel = 0;
      autoOrbit.angularSpeed = 0;

      currentPresetIndex = null;

      return state;
    },
  };

  return api;
}