// ============================================================
// paxis.js（最小実装）
// XYZ の ArrowHelper を原点に 3 本描くだけ
// ============================================================

import * as THREE from "../../../../vendor/three/build/three.module.js";

export function drawPaxis(ctx, aux) {
    const { scene } = ctx;

    const origin = new THREE.Vector3(
        aux.position.x,
        aux.position.y,
        aux.position.z
    );

    const length = aux.params?.length ?? 0.8;
    const headLength = length * 0.25;
    const headWidth = length * 0.15;

    // X+
    const xArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        origin,
        length,
        0xff5555,
        headLength,
        headWidth
    );

    // Y+
    const yArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        origin,
        length,
        0x55ff55,
        headLength,
        headWidth
    );

    // Z+
    const zArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        origin,
        length,
        0x5599ff,
        headLength,
        headWidth
    );

    scene.add(xArrow);
    scene.add(yArrow);
    scene.add(zArrow);
}
