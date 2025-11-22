// ============================================================
// grid.js（最小実装）
// XY 平面の単純な GridHelper を生成するだけ
// ============================================================

import * as THREE from "../../../../vendor/three/build/three.module.js";

export function drawGrid(ctx, aux) {
    const { scene } = ctx;

    // GridHelper(size, divisions, colorCenterLine, colorGrid)
    const size = aux.params?.size ?? 10;
    const divisions = aux.params?.divisions ?? 10;

    const grid = new THREE.GridHelper(
        size,
        divisions,
        aux.color ?? "#888888",
        aux.color ?? "#444444"
    );

    grid.position.set(
        aux.position.x,
        aux.position.y,
        aux.position.z
    );

    grid.rotation.set(
        aux.orientation.x ?? 0,
        aux.orientation.y ?? 0,
        aux.orientation.z ?? 0
    );

    grid.material.opacity = aux.opacity ?? 1.0;
    grid.material.transparent = (aux.opacity ?? 1.0) < 1.0;

    // Group 管理は drawAux.js 側でやるので
    scene.add(grid);
}
