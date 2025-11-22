// ============================================================
// marker.js（最小実装）
// - 小型の Billboard アイコン
// - texture が無ければ円形のカラー板で代用
// ============================================================

import * as THREE from "../../../../vendor/three/build/three.module.js";

export function drawMarker(ctx, aux) {
    const { scene, camera } = ctx;

    const pos = new THREE.Vector3(
        aux.position.x,
        aux.position.y,
        aux.position.z
    );

    const size = aux.params?.size ?? 0.2;
    const textureURL = aux.params?.icon ?? null;

    // Billboard の基準オブジェクト
    const root = new THREE.Object3D();
    root.position.copy(pos);

    // texture を使う場合
    if (textureURL) {
        const loader = new THREE.TextureLoader();
        const tex = loader.load(textureURL);

        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthTest: true
        });

        const geo = new THREE.PlaneGeometry(size, size);
        const mesh = new THREE.Mesh(geo, mat);

        root.add(mesh);
    } else {
        // fallback: 円形 sprite 風
        const geo = new THREE.CircleGeometry(size * 0.5, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: aux.color ?? "#ffaa00",
            opacity: aux.opacity ?? 1.0,
            transparent: (aux.opacity ?? 1.0) < 1.0
        });

        const mesh = new THREE.Mesh(geo, mat);
        root.add(mesh);
    }

    // Billboard（毎フレームカメラを向く）
    root.onBeforeRender = function () {
        root.lookAt(camera.position);
    };

    scene.add(root);
}
