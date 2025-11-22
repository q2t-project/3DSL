// ============================================================
// image.js（最小実装）
// - 画像を 3D 空間に貼るだけの Plane
// - params: { url, width, height, billboard }
// ============================================================

import * as THREE from "../../../../vendor/three/build/three.module.js";

export function drawImage(ctx, aux) {
    const { scene, camera } = ctx;

    const url = aux.params?.url;
    if (!url) return;

    const width = aux.params?.width ?? 1.0;
    const height = aux.params?.height ?? 1.0;
    const billboard = aux.params?.billboard ?? false;

    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);

    const geo = new THREE.PlaneGeometry(width, height);

    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthTest: true,
        opacity: aux.opacity ?? 1.0
    });

    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(
        aux.position.x,
        aux.position.y,
        aux.position.z
    );

    if (!billboard) {
        mesh.rotation.set(
            aux.orientation.x ?? 0,
            aux.orientation.y ?? 0,
            aux.orientation.z ?? 0
        );
    } else {
        // Billboard: カメラ正面へ
        mesh.onBeforeRender = function () {
            mesh.lookAt(camera.position);
        };
    }

    scene.add(mesh);
}
