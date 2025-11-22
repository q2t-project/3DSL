// /viewer/viewer_min_core.js
import * as THREE from "../vendor/three/build/three.module.js";

export function initCore(canvas) {
  const width  = canvas.clientWidth  || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(width, height);
  renderer.setClearColor(0x050505, 1.0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 8);
  scene.add(dir);

  window.addEventListener("resize", () => {
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  return { canvas, renderer, scene, camera };
}

export function startLoop({ renderer, scene, camera }) {
  let last = performance.now();

  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    // 今は dt 使わんけど、後で使えるよう渡しておく想定
    renderer.render(scene, camera);
  }

  loop();
  console.log("[min] loop start");
}
