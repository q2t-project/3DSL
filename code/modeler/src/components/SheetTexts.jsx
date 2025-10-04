import { createSheetComponent } from './SheetNodes.jsx';
import { createText } from '../lib/defaults.js';

const textColumns = [
  {
    key: 'content',
    label: 'Content',
    required: true,
    type: 'text',
    errorKey: 'content'
  },
  {
    key: 'positionX',
    label: 'Pos X',
    required: true,
    type: 'number',
    vector: { key: 'position', index: 0 },
    errorKey: 'position/0',
    precision: 3
  },
  {
    key: 'positionY',
    label: 'Pos Y',
    required: true,
    type: 'number',
    vector: { key: 'position', index: 1 },
    errorKey: 'position/1',
    precision: 3
  },
  {
    key: 'positionZ',
    label: 'Pos Z',
    required: true,
    type: 'number',
    vector: { key: 'position', index: 2 },
    errorKey: 'position/2',
    precision: 3
  },
  {
    key: 'size',
    label: 'Size',
    type: 'number',
    fontSteps: true,
    placeholder: '16',
    precision: 3
  },
  {
    key: 'color',
    label: 'Color',
    type: 'text'
  },
  {
    key: 'orientation',
    label: 'Orientation',
    type: 'select',
    options: ['XY', 'YZ', 'ZX', 'camera']
  }
];

const SheetTexts = createSheetComponent({
  columns: textColumns,
  createRow: () => createText()
});

export default SheetTexts;