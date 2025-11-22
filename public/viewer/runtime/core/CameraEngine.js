// ============================================================
// CameraEngine.js  (viewer / renderer 内部モジュール)
// ============================================================
//
// 役割：
// - camera_state（this.state）を唯一のソースオブトゥルースとして扱う
// - orbit / pan / zoom / reset / mode などカメラ操作の中核ロジック
// - spherical <-> cartesian の変換
// - clamp（phi の上下限）
// - three.js Camera への apply
//
// UI はこのクラスを直接触らない。
// 呼び口は core.camera.* のみ。
// ============================================================

export class CameraEngine {
  /**
   * @param {Object} rendererContext
   *   camera: THREE.PerspectiveCamera
   *   domElement: HTMLCanvasElement | HTMLElement
   *   getBoundingBox: () => { center:[x,y,z], radius:number } | null
   *   getElementBounds?: (uuid:string) => { center:[x,y,z], radius:number } | null
   */
  constructor(rendererContext = {}) {
    const { camera, domElement, getBoundingBox, getElementBounds } =
      rendererContext;

    if (!camera) {
      throw new Error("CameraEngine: rendererContext.camera が必須やで");
    }

    this.camera = camera;
    this.dom = domElement || null;

    // シーン全体の bbox（frame ごとでも OK）
    this.getBoundingBox =
      typeof getBoundingBox === "function" ? getBoundingBox : () => null;

    // 個別要素の bounds（フォーカス用）※任意
    this.getElementBounds =
      typeof getElementBounds === "function" ? getElementBounds : null;

    // --- カメラ状態（唯一の正規データ） ---
    // target: 注視点 (x,y,z)
    // theta:  水平角（rad）
    // phi:    垂直角（rad） Z+ が up
    // radius: target からの距離
    // fov:    視野角（deg）
    this.state = {
      target: [0, 0, 0],
      theta: 0,
      phi: Math.PI / 4, // default slight top-view
      radius: 100,
      fov: 45,
    };

    // --- 内部パラメータ ---
    this._minRadius = 0.1;
    this._maxRadius = 100000;
    this._phiEpsilon = 0.001; // 上下反転防止

    // 初期位置を bbox にフィットさせる
    this.reset();
  }

  // ------------------------------------------------------------
  // 基本インターフェース（core.camera.* が呼ぶ）
  // ------------------------------------------------------------

  /**
   * 視点回転（orbit）
   * dTheta: 水平回転量 [rad]
   * dPhi  : 垂直回転量 [rad]
   */
  rotate(dTheta, dPhi) {
    this.state.theta += dTheta;
    this.state.phi += dPhi;
    this._clampPhi();
    this.apply();
  }

  /**
   * 平行移動（pan）
   * dx, dy: スクリーン空間の移動量（正規化済み）
   */
  pan(dx, dy) {
    // シンプルに XY 平面方向だけ動かす版（Z+ が up）
    const factor = this.state.radius * 0.002;

    const offsetX = -dx * factor;
    const offsetY = dy * factor;

    this.state.target[0] += offsetX;
    this.state.target[1] += offsetY;

    this.apply();
  }

  /**
   * ズーム（radius のスケール）
   * delta: ホイール量（px 相当）
   */
  zoom(delta) {
    const scale = Math.exp(delta * 0.001); // ホイール速度調整
    this.state.radius *= scale;
    this.state.radius = Math.min(
      this._maxRadius,
      Math.max(this._minRadius, this.state.radius),
    );
    this.apply();
  }

  /**
   * シーン全体を見渡す位置にリセット
   */
  reset() {
    const box = this.getBoundingBox(); // { center: [x,y,z], radius: r } | null
    if (box) {
      this.state.target = [...box.center];
      this.state.radius = box.radius * 1.8;
    } else {
      this.state.target = [0, 0, 0];
      this.state.radius = 64;
    }

    this.state.theta = Math.PI / 4;
    this.state.phi = Math.PI / 4;
    this.state.fov = 45;

    this.apply(true);
  }

  /**
   * 任意項目の一括更新
   * 例: setState({ fov: 40 })
   */
  setState(partial) {
    if (!partial || typeof partial !== "object") return;
    Object.assign(this.state, partial);
    this._clampPhi();
    this.apply();
  }

  // ------------------------------------------------------------
  // モード切替
  // ------------------------------------------------------------

  /**
   * setMode("macro"|"meso"|"micro", uuid?)
   */
  setMode(mode, uuid = null) {
    switch (mode) {
      case "macro":
        this._applyMacroMode();
        break;
      case "meso":
        if (uuid) this._applyMesoMode(uuid);
        break;
      case "micro":
        if (uuid) this._applyMicroMode(uuid);
        break;
      default:
        // 不明な mode は macro に寄せる
        this._applyMacroMode();
        break;
    }
    this.apply(true);
  }

  /**
   * 特定要素にフォーカス（micro 用のショートカット）
   */
  focusOn(uuid) {
    const info = this._computeElementBounds(uuid);
    if (!info) return;

    this.state.target = [...info.center];
    this.state.radius = info.radius * 1.6;

    this.apply(true);
  }

  /**
   * ギズモの軸スナップ
   * axis: "x" | "y" | "z"
   */
snapToAxis(axis) {
  if (axis === "x") {
    // +X 方向から（横から見る）
    this.state.theta = 0;
    this.state.phi = 0; // XY平面上
  } else if (axis === "y") {
    // +Y 方向から
    this.state.theta = Math.PI / 2;
    this.state.phi = 0;
  } else if (axis === "z") {
    // 上から（トップビュー）
    this.state.theta = 0;
    this.state.phi = Math.PI / 2 - this._phiEpsilon;
  }

  this._clampPhi();
  this.apply(true);
}

  /**
   * フレーム切替時の通知（必要なら bbox 再フィットなどに使う）
   */
  onFrameChange(activeFrame) {
    // いまは何もしない。
    // 「frame ごとに bbox を取り直して macro モードを再フィット」みたいなんを
    // 将来 viewerSettings 側で ON にするならここで拾う。
    void activeFrame;
  }

  /**
   * 視野角の変更
   */
  setFOV(value) {
    if (typeof value !== "number" || !isFinite(value)) return;
    this.state.fov = value;
    this.apply();
  }

  // ------------------------------------------------------------
  // 外から state を読む用ヘルパ（任意）
  // ------------------------------------------------------------

  /**
   * state の shallow copy を返す（直接いじられへんように）
   */
  getState() {
    return { ...this.state, target: [...this.state.target] };
  }

  // ------------------------------------------------------------
  // 内部：カメラ適用ロジック
  // ------------------------------------------------------------

  /**
   * state → three.js Camera へ反映
   * force: true で「途中の補間を無視して即時反映する」想定
   */
  apply(force = false) {
    const { theta, phi, radius, target } = this.state;

    // spherical → cartesian（Z+ up）
    const x = target[0] + radius * Math.cos(phi) * Math.cos(theta);
    const y = target[1] + radius * Math.cos(phi) * Math.sin(theta);
    const z = target[2] + radius * Math.sin(phi);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(target[0], target[1], target[2]);

    // FOV
    this.camera.fov = this.state.fov;
    this.camera.updateProjectionMatrix();

    // smooth 演出を入れるなら、force=false のときだけ
    // requestAnimationFrame で徐々に追随、みたいな処理をここに足していく。
    void force;
  }

  // ------------------------------------------------------------
  // 内部ユーティリティ
  // ------------------------------------------------------------

  _clampPhi() {
    const eps = this._phiEpsilon;
    this.state.phi = Math.min(Math.PI - eps, Math.max(eps, this.state.phi));
  }

  /**
   * uuid から要素の bounding sphere を取得
   * rendererContext.getElementBounds が渡されていればそれを叩く。
   */
  _computeElementBounds(uuid) {
    if (!this.getElementBounds) return null;
    const info = this.getElementBounds(uuid);
    if (
      !info ||
      !Array.isArray(info.center) ||
      info.center.length < 3 ||
      typeof info.radius !== "number"
    ) {
      return null;
    }
    return {
      center: [info.center[0], info.center[1], info.center[2]],
      radius: info.radius,
    };
  }

  _applyMacroMode() {
    const box = this.getBoundingBox();
    if (!box) return;

    this.state.target = [...box.center];
    this.state.radius = box.radius * 1.8;
    this.state.theta = Math.PI / 4;
    this.state.phi = Math.PI / 4;
  }

  _applyMesoMode(uuid) {
    // meso 用：要素群の bbox から radius を再算出
    const info = this._computeElementBounds(uuid);
    if (!info) return;

    this.state.target = [...info.center];
    this.state.radius = info.radius * 2.2;
    this.state.theta = Math.PI / 4;
    this.state.phi = Math.PI / 4;
  }

  _applyMicroMode(uuid) {
    const info = this._computeElementBounds(uuid);
    if (!info) return;

    this.state.target = [...info.center];
    this.state.radius = info.radius * 0.8;
    this.state.theta = Math.PI / 4;
    this.state.phi = Math.PI / 4;

    // micro 専用の DOF / emissive / saturation の調整は
    // renderer 側 or modeEngine 側でやる。
  }
}
