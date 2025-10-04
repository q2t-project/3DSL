import { createSheetComponent } from './SheetNodes.jsx';
import { createGltf } from '../lib/defaults.js';

const gltfColumns = [
  {
    key: 'src',
    label: 'Source',
    required: true,
    type: 'text',
    errorKey: 'src',
    schemaType: 'uri',
    description: 'Relative or absolute path to the glTF asset',
    width: 220
  },
  {
    key: 'positionX',
    label: 'Pos X',
    type: 'number',
    vector: { key: 'position', index: 0 },
    errorKey: 'position/0',
    precision: 3,
    schemaType: 'number',
    description: 'Translation on X axis',
    defaultValue: 0,
    width: 96,
    step: 0.1
  },
  {
    key: 'positionY',
    label: 'Pos Y',
    type: 'number',
    vector: { key: 'position', index: 1 },
    errorKey: 'position/1',
    precision: 3,
    schemaType: 'number',
    description: 'Translation on Y axis',
    defaultValue: 0,
    width: 96,
    step: 0.1
  },
  {
    key: 'positionZ',
    label: 'Pos Z',
    type: 'number',
    vector: { key: 'position', index: 2 },
    errorKey: 'position/2',
    precision: 3,
    schemaType: 'number',
    description: 'Translation on Z axis',
    defaultValue: 0,
    width: 96,
    step: 0.1
  },
  {
    key: 'rotationX',
    label: 'Rot X',
    type: 'number',
    vector: { key: 'rotation', index: 0 },
    errorKey: 'rotation/0',
    precision: 3,
    schemaType: 'number',
    description: 'Rotation around X axis (radians)',
    defaultValue: 0,
    width: 96,
    step: 0.1
  },
  {
    key: 'rotationY',
    label: 'Rot Y',
    type: 'number',
    vector: { key: 'rotation', index: 1 },
    errorKey: 'rotation/1',
    precision: 3,
    schemaType: 'number',
    description: 'Rotation around Y axis (radians)',
    defaultValue: 0,
    width: 96,
    step: 0.1
  },
  {
    key: 'rotationZ',
    label: 'Rot Z',
    type: 'number',
    vector: { key: 'rotation', index: 2 },
    errorKey: 'rotation/2',
    precision: 3,
    schemaType: 'number',
    description: 'Rotation around Z axis (radians)',
    defaultValue: 0,
    width: 96,
    step: 0.1
  },
  {
    key: 'scaleX',
    label: 'Scale X',
    type: 'number',
    vector: { key: 'scale', index: 0 },
    errorKey: 'scale/0',
    precision: 3,
    schemaType: 'number',
    description: 'Scale along X axis',
    defaultValue: 1,
    width: 96,
    step: 0.1
  },
  {
    key: 'scaleY',
    label: 'Scale Y',
    type: 'number',
    vector: { key: 'scale', index: 1 },
    errorKey: 'scale/1',
    precision: 3,
    schemaType: 'number',
    description: 'Scale along Y axis',
    defaultValue: 1,
    width: 96,
    step: 0.1
  },
  {
    key: 'scaleZ',
    label: 'Scale Z',
    type: 'number',
    vector: { key: 'scale', index: 2 },
    errorKey: 'scale/2',
    precision: 3,
    schemaType: 'number',
    description: 'Scale along Z axis',
    defaultValue: 1,
    width: 96,
    step: 0.1
  },
  {
    key: 'attachTo',
    label: 'Attach node',
    type: 'select',
    options: (context) => context?.nodes?.map((node) => node.id) ?? [],
    schemaType: 'string',
    description: 'Optional node that anchors the asset',
    width: 152
  }
];

const SheetGltf = createSheetComponent({
  columns: gltfColumns,
  createRow: () => createGltf()
});

export default SheetGltf;
