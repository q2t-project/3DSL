import { createSheetComponent } from './SheetNodes.jsx';
import { createAux } from '../lib/defaults.js';

const auxColumns = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: ['axis', 'grid', 'arc', 'hud'],
    schemaType: 'string',
    description: 'Auxiliary helper preset',
    defaultValue: 'axis',
    width: 132
  },
  {
    key: 'visible',
    label: 'Visible',
    type: 'checkbox',
    schemaType: 'boolean',
    description: 'Toggle helper visibility',
    defaultValue: true,
    width: 96
  },
  {
    key: 'gridSize',
    label: 'Grid size',
    type: 'number',
    path: ['grid', 'size'],
    precision: 3,
    schemaType: 'number',
    description: 'Grid dimension in world units',
    width: 120,
    step: 0.1
  },
  {
    key: 'gridDivisions',
    label: 'Grid divisions',
    type: 'number',
    path: ['grid', 'divisions'],
    precision: 0,
    schemaType: 'integer',
    description: 'Number of grid subdivisions',
    width: 132,
    step: 1
  },
  {
    key: 'hudContent',
    label: 'HUD content',
    type: 'text',
    path: ['hud', 'content'],
    schemaType: 'string',
    description: 'Optional heads-up display markup',
    width: 220
  }
];

const SheetAux = createSheetComponent({
  columns: auxColumns,
  createRow: () => createAux()
});

export default SheetAux;
