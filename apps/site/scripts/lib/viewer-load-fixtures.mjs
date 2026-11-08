export { texturedGrid } from '../check/fixtures/textured-grid.mjs';

export const viewerAssetSizes = [
  { name: 'small', cells: 16, width: 256 },
  { name: 'large', cells: 256, width: 2048 },
];

export function makeAssetModel(source, glbName) {
  const model = JSON.parse(source);
  model.points[0].appearance.marker.gltf = {url:'./' + glbName};
  return JSON.stringify(model);
}
