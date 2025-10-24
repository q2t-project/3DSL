const DEG2RAD = Math.PI / 180;

export class Color {
  constructor(value = 0xffffff) {
    this.set(value);
  }

  set(value) {
    if (value instanceof Color) {
      this._style = value._style;
    } else if (typeof value === "number") {
      this._style = `#${value.toString(16).padStart(6, "0")}`;
    } else if (typeof value === "string") {
      this._style = value.trim() || "#ffffff";
    } else {
      this._style = "#ffffff";
    }
    return this;
  }

  clone() {
    return new Color(this._style);
  }

  getStyle(alpha = 1) {
    const style = this._style || "#ffffff";
    if (alpha >= 1) {
      return style;
    }
    if (style.startsWith("#")) {
      const hex = style.slice(1);
      const bigint = parseInt(hex, 16);
      if (!Number.isFinite(bigint)) {
        return style;
      }
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return style;
  }
}

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  addVectors(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }

  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const len = this.length();
    if (len > 0) {
      this.multiplyScalar(1 / len);
    }
    return this;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v) {
    return this.crossVectors(this, v);
  }

  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z;
    const bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }

  setLength(length) {
    return this.normalize().multiplyScalar(length);
  }
}

class Object3D {
  constructor() {
    this.children = [];
    this.parent = null;
    this.position = new Vector3();
    this.visible = true;
  }

  add(object) {
    if (object.parent) {
      object.parent.remove(object);
    }
    object.parent = this;
    this.children.push(object);
    return this;
  }

  remove(object) {
    const index = this.children.indexOf(object);
    if (index !== -1) {
      this.children.splice(index, 1);
      object.parent = null;
    }
    return this;
  }

  traverse(callback) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
}

export class Scene extends Object3D {
  constructor() {
    super();
    this.type = "Scene";
    this.background = null;
  }
}

export class Group extends Object3D {
  constructor() {
    super();
    this.type = "Group";
  }
}

export class PerspectiveCamera extends Object3D {
  constructor(fov, aspect, near = 0.1, far = 2000) {
    super();
    this.type = "PerspectiveCamera";
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.up = new Vector3(0, 1, 0);
    this._target = new Vector3();
  }

  lookAt(x, y, z) {
    if (x instanceof Vector3) {
      this._target.copy(x);
    } else {
      this._target.set(x, y, z);
    }
    return this;
  }

  updateProjectionMatrix() {
    // Perspective math handled at render time.
  }

  get target() {
    return this._target;
  }
}

export class AmbientLight extends Object3D {
  constructor(color = 0xffffff, intensity = 1) {
    super();
    this.type = "AmbientLight";
    this.color = new Color(color);
    this.intensity = intensity;
  }
}

export class DirectionalLight extends Object3D {
  constructor(color = 0xffffff, intensity = 1) {
    super();
    this.type = "DirectionalLight";
    this.color = new Color(color);
    this.intensity = intensity;
  }
}

export class GridHelper extends Object3D {
  constructor(size = 10, divisions = 10, color1 = 0x444444, color2 = 0x888888) {
    super();
    this.type = "GridHelper";
    this.size = size;
    this.divisions = divisions;
    this.color1 = new Color(color1);
    this.color2 = new Color(color2);
  }
}

export class AxesHelper extends Object3D {
  constructor(size = 1) {
    super();
    this.type = "AxesHelper";
    this.size = size;
  }
}

export class MeshStandardMaterial {
  constructor({ color = new Color(0xffffff) } = {}) {
    this.type = "MeshStandardMaterial";
    this.color = color instanceof Color ? color : new Color(color);
  }

  dispose() {}
}

export class LineBasicMaterial {
  constructor({ color = "#ffffff" } = {}) {
    this.type = "LineBasicMaterial";
    this.color = color instanceof Color ? color : new Color(color);
  }

  dispose() {}
}

export class SphereGeometry {
  constructor(radius = 1, widthSegments = 16, heightSegments = 12) {
    this.type = "SphereGeometry";
    this.radius = radius;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
  }

  dispose() {}
}

export class BufferGeometry {
  constructor() {
    this.type = "BufferGeometry";
    this.points = [];
  }

  setFromPoints(points = []) {
    this.points = points.map((point) =>
      point instanceof Vector3 ? point.clone() : new Vector3(point.x, point.y, point.z)
    );
    return this;
  }

  dispose() {
    this.points.length = 0;
  }
}

export class Mesh extends Object3D {
  constructor(geometry = null, material = null) {
    super();
    this.type = "Mesh";
    this.geometry = geometry;
    this.material = material;
  }
}

export class Line extends Object3D {
  constructor(geometry = null, material = null) {
    super();
    this.type = "Line";
    this.geometry = geometry;
    this.material = material;
  }
}

function projectPoint(point, camera, width, height) {
  const target = camera.target || new Vector3();
  const forward = target.clone().sub(camera.position);
  if (forward.length() === 0) {
    forward.set(0, 0, -1);
  }
  forward.normalize();

  const right = forward.clone().cross(camera.up).normalize();
  if (right.length() === 0) {
    right.set(1, 0, 0);
  }
  const up = right.clone().cross(forward).normalize();

  const toPoint = point.clone().sub(camera.position);
  const depth = toPoint.dot(forward);

  if (depth <= camera.near || depth >= camera.far) {
    return null;
  }

  const xCam = toPoint.dot(right);
  const yCam = toPoint.dot(up);
  const fovRad = camera.fov * DEG2RAD;
  const scaleY = 1 / Math.tan(fovRad / 2);
  const scaleX = scaleY / camera.aspect;

  const ndcX = (xCam / depth) * scaleX;
  const ndcY = (yCam / depth) * scaleY;

  if (Math.abs(ndcX) > 1.5 || Math.abs(ndcY) > 1.5) {
    // Too far outside view, skip to reduce artifacts.
    return null;
  }

  const screenX = (ndcX + 1) * 0.5 * width;
  const screenY = (1 - (ndcY + 1) * 0.5) * height;

  return { x: screenX, y: screenY, depth };
}

function drawGrid(ctx, grid, camera, width, height) {
  const half = grid.size / 2;
  const divisions = grid.divisions;
  const step = grid.size / divisions;
  const color1 = grid.color1.getStyle(0.4);
  const color2 = grid.color2.getStyle(0.35);

  for (let i = 0; i <= divisions; i++) {
    const offset = -half + i * step;
    const points = [
      new Vector3(-half, 0, offset),
      new Vector3(half, 0, offset),
      new Vector3(offset, 0, -half),
      new Vector3(offset, 0, half),
    ];

    const [hStart, hEnd, vStart, vEnd] = points.map((p) =>
      projectPoint(p, camera, width, height)
    );

    if (hStart && hEnd) {
      ctx.strokeStyle = color1;
      ctx.beginPath();
      ctx.moveTo(hStart.x, hStart.y);
      ctx.lineTo(hEnd.x, hEnd.y);
      ctx.stroke();
    }

    if (vStart && vEnd) {
      ctx.strokeStyle = color2;
      ctx.beginPath();
      ctx.moveTo(vStart.x, vStart.y);
      ctx.lineTo(vEnd.x, vEnd.y);
      ctx.stroke();
    }
  }
}

function drawAxes(ctx, axes, camera, width, height) {
  const size = axes.size;
  const origin = projectPoint(new Vector3(0, 0, 0), camera, width, height);
  if (!origin) return;

  const axesPoints = [
    { point: new Vector3(size, 0, 0), color: "#ef4444" },
    { point: new Vector3(0, size, 0), color: "#22c55e" },
    { point: new Vector3(0, 0, size), color: "#3b82f6" },
  ];

  for (const { point, color } of axesPoints) {
    const projected = projectPoint(point, camera, width, height);
    if (!projected) continue;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(projected.x, projected.y);
    ctx.stroke();
  }
}

function drawSphere(ctx, mesh, camera, width, height) {
  const center = projectPoint(mesh.position, camera, width, height);
  if (!center) return;

  const radius = mesh.geometry?.radius ?? 0.5;
  const offsetPoint = mesh.position.clone().add(new Vector3(radius, 0, 0));
  const projectedOffset = projectPoint(offsetPoint, camera, width, height);
  if (!projectedOffset) return;

  const radiusPx = Math.max(2, Math.abs(projectedOffset.x - center.x));

  ctx.fillStyle = mesh.material?.color?.getStyle?.(1) || "#60a5fa";
  ctx.beginPath();
  ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
  ctx.stroke();
}

function drawLine(ctx, line, camera, width, height) {
  const points = line.geometry?.points || [];
  if (points.length < 2) {
    return;
  }

  const projected = points.map((p) => projectPoint(p, camera, width, height));
  if (projected.some((p) => !p)) {
    return;
  }

  ctx.strokeStyle = line.material?.color?.getStyle?.(1) || "#f97316";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i++) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }
  ctx.stroke();
}

export class WebGLRenderer {
  constructor({ antialias = true } = {}) {
    this.type = "WebGLRenderer";
    this.antialias = antialias;
    this.domElement = document.createElement("canvas");
    this.domElement.style.display = "block";
    this.domElement.style.width = "0px";
    this.domElement.style.height = "0px";
    this.domElement.getContext("2d");
    this._ctx = this.domElement.getContext("2d");
    this._pixelRatio = 1;
    this._width = 1;
    this._height = 1;
  }

  setPixelRatio(ratio) {
    if (ratio > 0) {
      this._pixelRatio = ratio;
      this.setSize(this._width, this._height, false);
    }
  }

  setSize(width, height) {
    this._width = width;
    this._height = height;
    const ratio = this._pixelRatio;
    this.domElement.width = Math.max(1, Math.floor(width * ratio));
    this.domElement.height = Math.max(1, Math.floor(height * ratio));
    this.domElement.style.width = `${width}px`;
    this.domElement.style.height = `${height}px`;
    this._ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  render(scene, camera) {
    const ctx = this._ctx;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, this._width, this._height);
    if (scene.background) {
      ctx.fillStyle = scene.background.getStyle(1);
      ctx.fillRect(0, 0, this._width, this._height);
    }

    const drawObject = (object) => {
      if (!object.visible) return;
      switch (object.type) {
        case "GridHelper":
          drawGrid(ctx, object, camera, this._width, this._height);
          break;
        case "AxesHelper":
          drawAxes(ctx, object, camera, this._width, this._height);
          break;
        case "Mesh":
          if (object.geometry instanceof SphereGeometry) {
            drawSphere(ctx, object, camera, this._width, this._height);
          }
          break;
        case "Line":
          drawLine(ctx, object, camera, this._width, this._height);
          break;
        default:
          break;
      }
    };

    for (const child of scene.children) {
      child.traverse((obj) => {
        if (obj !== scene) {
          drawObject(obj);
        }
      });
    }

    ctx.restore();
  }
}

export default {
  Color,
  Vector3,
  Scene,
  Group,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  AxesHelper,
  MeshStandardMaterial,
  LineBasicMaterial,
  SphereGeometry,
  BufferGeometry,
  Mesh,
  Line,
  WebGLRenderer,
};
