import { createSheetComponent } from './SheetNodes.jsx';
import { createGltf } from '../lib/defaults.js';

const gltfColumns = [
  {
    key: 'src',
    label: 'Source',
    required: true,
    type: 'text',
    errorKey: 'src'
  },
  {
    key: 'positionX',
    label: 'Pos X',
    type: 'number',
    vector: { key: 'position', index: 0 },
    errorKey: 'position/0',
    precision: 3
  },
  {
    key: 'positionY',
    label: 'Pos Y',
    type: 'number',
    vector: { key: 'position', index: 1 },
    errorKey: 'position/1',
    precision: 3
  },
  {
    key: 'positionZ',
    label: 'Pos Z',
    type: 'number',
    vector: { key: 'position', index: 2 },
    errorKey: 'position/2',
    precision: 3
  },
  {
    key: 'rotationX',
    label: 'Rot X',
    type: 'number',
    vector: { key: 'rotation', index: 0 },
    errorKey: 'rotation/0',
    precision: 3
  },
  {
    key: 'rotationY',
    label: 'Rot Y',
    type: 'number',
    vector: { key: 'rotation', index: 1 },
    errorKey: 'rotation/1',
    precision: 3
  },
  {
    key: 'rotationZ',
    label: 'Rot Z',
    type: 'number',
    vector: { key: 'rotation', index: 2 },
    errorKey: 'rotation/2',
    precision: 3
  },
  {
    key: 'scaleX',
    label: 'Scale X',
    type: 'number',
    vector: { key: 'scale', index: 0 },
    errorKey: 'scale/0',
    precision: 3
  },
  {
    key: 'scaleY',
    label: 'Scale Y',
    type: 'number',
    vector: { key: 'scale', index: 1 },
    errorKey: 'scale/1',
    precision: 3
  },
  {
    key: 'scaleZ',
    label: 'Scale Z',
    type: 'number',
    vector: { key: 'scale', index: 2 },
    errorKey: 'scale/2',
    precision: 3
  },
  {
    key: 'attachTo',
    label: 'Attach node',
    type: 'select',
    options: (context) => context?.nodes?.map((node) => node.id) ?? []
  }
];

const SheetGltf = createSheetComponent({
  columns: gltfColumns,
  createRow: () => createGltf()
});

export default SheetGltf;
