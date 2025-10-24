import { Vector3 } from "../../../build/three.module.js";

function sphericalFromVector(vector) {
  const radius = Math.max(0.00001, vector.length());
  const theta = Math.atan2(vector.x, vector.z);
  const phi = Math.acos(Math.min(Math.max(vector.y / radius, -1), 1));
  return { radius, theta, phi };
}

function sphericalToVector(radius, theta, phi) {
  const sinPhi = Math.sin(phi);
  return new Vector3(
    radius * sinPhi * Math.sin(theta),
    radius * Math.cos(phi),
    radius * sinPhi * Math.cos(theta)
  );
}

export class OrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement || document;
    this.enableDamping = false;
    this.dampingFactor = 0.1;
    this.minDistance = 0.1;
    this.maxDistance = Infinity;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;
    this.rotateSpeed = 1;
    this.zoomSpeed = 1.0;
    this.target = camera.target ? camera.target.clone() : new Vector3();

    this._state = "none";
    this._start = { x: 0, y: 0 };
    this._lastPointer = { x: 0, y: 0 };
    this._spherical = sphericalFromVector(camera.position.clone().sub(this.target));
    this._sphericalDelta = { theta: 0, phi: 0 };
    this._zoomDelta = 0;

    this._onContextMenu = (event) => event.preventDefault();
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);

    if (this.domElement) {
      this.domElement.style.touchAction = "none";
      this.domElement.addEventListener("contextmenu", this._onContextMenu);
      this.domElement.addEventListener("pointerdown", this._onPointerDown);
      this.domElement.addEventListener("wheel", this._onWheel, { passive: false });
    }
  }

  _handlePointerDown(event) {
    if (event.button !== 0 && event.button !== 1) {
      return;
    }
    this._state = "rotate";
    this._start.x = event.clientX;
    this._start.y = event.clientY;
    this._lastPointer.x = event.clientX;
    this._lastPointer.y = event.clientY;
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  _handlePointerMove(event) {
    if (this._state !== "rotate") {
      return;
    }
    const dx = event.clientX - this._lastPointer.x;
    const dy = event.clientY - this._lastPointer.y;
    this._lastPointer.x = event.clientX;
    this._lastPointer.y = event.clientY;

    const element = this.domElement === document ? this.domElement.body : this.domElement;
    const width = element?.clientWidth || window.innerWidth;
    const height = element?.clientHeight || window.innerHeight;

    const deltaTheta = (2 * Math.PI * dx / width) * this.rotateSpeed;
    const deltaPhi = (2 * Math.PI * dy / height) * this.rotateSpeed;

    this._sphericalDelta.theta -= deltaTheta;
    this._sphericalDelta.phi -= deltaPhi;
  }

  _handlePointerUp() {
    this._state = "none";
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
  }

  _handleWheel(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    this._zoomDelta += delta * 0.2 * this.zoomSpeed;
  }

  update() {
    const spherical = this._spherical;
    spherical.theta += this._sphericalDelta.theta;
    spherical.phi += this._sphericalDelta.phi;

    spherical.phi = clamp(spherical.phi, this.minPolarAngle, this.maxPolarAngle);
    spherical.phi = clamp(spherical.phi, 0.0001, Math.PI - 0.0001);

    if (this._zoomDelta !== 0) {
      const zoomScale = Math.exp(this._zoomDelta);
      spherical.radius = clamp(
        spherical.radius * zoomScale,
        this.minDistance,
        this.maxDistance
      );
      this._zoomDelta = 0;
    }

    const offset = sphericalToVector(spherical.radius, spherical.theta, spherical.phi);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    if (this.enableDamping) {
      this._sphericalDelta.theta *= 1 - this.dampingFactor;
      this._sphericalDelta.phi *= 1 - this.dampingFactor;
    } else {
      this._sphericalDelta.theta = 0;
      this._sphericalDelta.phi = 0;
    }
  }

  dispose() {
    if (this.domElement) {
      this.domElement.removeEventListener("contextmenu", this._onContextMenu);
      this.domElement.removeEventListener("pointerdown", this._onPointerDown);
      this.domElement.removeEventListener("wheel", this._onWheel);
    }
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default OrbitControls;
