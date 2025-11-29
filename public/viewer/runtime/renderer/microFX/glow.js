// viewer/runtime/renderer/microFX/glow.js

import * as THREE from "../../../../vendor/three/build/three.module.js";
import { microFXConfig } from "./config.js";

// unitless な world 座標系上での「輝き」オーバーレイ。
// position, offsetFactor, scalePerDistance などはすべて無次元スカラーとして扱う。

let glow = null;

const MAX_COORD = 1e4; // 数値暴走だけ抑える。単位はここでは規定しない。

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function ensureGlow(scene) {
  if (glow && glow.parent !== scene) {
    glow.parent?.remove(glow);
    glow = null;
  }

  if (!glow) {
    const material = new THREE.SpriteMaterial({
      color: "#ffffaa",
      transparent: true,
      opacity: 0.25,             // ちょっと弱め
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      depthTest: false,
    });
    glow = new THREE.Sprite(material);
    glow.renderOrder = 998;
  }

  if (glow.parent !== scene) {
    scene.add(glow);
  }

  return glow;
}

function sanitizePosition(position) {
  if (!Array.isArray(position) || position.length < 3) return null;

  const raw = position.map((v) => Number(v));
  if (!raw.every((v) => Number.isFinite(v))) return null;

  // unitless な world 座標として ±MAX_COORD にだけクランプ
  return raw.map((v) => clamp(v, -MAX_COORD, MAX_COORD))
}

export function updateGlow(target, position, camera) {
  if (!target) return;
  if (!camera) return;

  const sanitized = sanitizePosition(position);
  if (!sanitized) return;

  target.position.set(sanitized[0], sanitized[1], sanitized[2]);

  const cameraToPoint = new THREE.Vector3()
    .subVectors(target.position, camera.position)
    .normalize()
    .multiplyScalar(
      // offsetFactor も unitless。距離 dist と掛け合わせて「後退量」を決める。
      microFXConfig.glow.offsetFactor *
        camera.position.distanceTo(target.position)
    );

  target.position.add(cameraToPoint);
  
  // glow サイズも距離依存で拡縮（minScale/maxScale は unitless world 長さ）
  const dist = camera.position.distanceTo(target.position);
  const cfg = microFXConfig.glow;

  const rawScale = dist * cfg.scalePerDistance;
  const scale = Math.min(
    Math.max(rawScale, cfg.minScale),
    cfg.maxScale
  );

  target.scale.setScalar(scale);
}

export function removeGlow(scene) {
  if (glow) {
    scene.remove(glow);
    glow = null;
  }
}