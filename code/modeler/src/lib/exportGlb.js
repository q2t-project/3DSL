import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export async function exportSceneToGlb(scene, filename = 'model.glb', options = {}) {
  const exporter = new GLTFExporter();
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          const json = JSON.stringify(result, null, 2);
          resolve(new TextEncoder().encode(json).buffer);
        }
      },
      (error) => reject(error),
      { binary: true, ...options }
    );
  });

  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 0);
}
