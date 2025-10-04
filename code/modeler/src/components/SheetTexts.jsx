import { createSheetComponent } from './SheetNodes.jsx';
import { createText } from '../lib/defaults.js';

const textColumns = [
  {
    key: 'content',
    label: 'Content',
    required: true,
    type: 'text',
    errorKey: 'content',
    schemaType: 'string',
    description: 'Displayed text body',
    width: 200
  },
  {
    key: 'positionX',
    label: 'Pos X',
    required: true,
    type: 'number',
    vector: { key: 'position', index: 0 },
    errorKey: 'position/0',
    precision: 3,
    schemaType: 'number',
    description: 'Anchor X position',
    width: 96,
    step: 0.1
  },
  {
    key: 'positionY',
    label: 'Pos Y',
    required: true,
    type: 'number',
    vector: { key: 'position', index: 1 },
    errorKey: 'position/1',
    precision: 3,
    schemaType: 'number',
    description: 'Anchor Y position',
    width: 96,
    step: 0.1
  },
  {
    key: 'positionZ',
    label: 'Pos Z',
    required: true,
    type: 'number',
    vector: { key: 'position', index: 2 },
    errorKey: 'position/2',
    precision: 3,
    schemaType: 'number',
    description: 'Anchor Z position',
    width: 96,
    step: 0.1
  },
  {
    key: 'size',
    label: 'Size',
    type: 'number',
    fontSteps: true,
    placeholder: '16',
    precision: 3,
    schemaType: 'number',
    description: 'Text height in points',
    defaultValue: 16,
    width: 88
  },
  {
    key: 'color',
    label: 'Color',
    type: 'color',
    schemaType: 'string',
    description: 'Text fill color',
    defaultValue: '#000000',
    width: 120
  },
  {
    key: 'orientation',
    label: 'Orientation',
    type: 'select',
    options: ['XY', 'YZ', 'ZX', 'camera'],
    schemaType: 'string',
    description: 'Billboard orientation plane',
    defaultValue: 'XY',
    width: 132
  }
];

const SheetTexts = createSheetComponent({
  columns: textColumns,
  createRow: () => createText()
});

export default SheetTexts;
