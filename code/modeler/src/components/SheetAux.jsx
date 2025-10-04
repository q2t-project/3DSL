import { createSheetComponent } from './SheetNodes.jsx';
import { createAux } from '../lib/defaults.js';

const auxColumns = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: ['axis', 'grid', 'arc', 'hud']
  },
  {
    key: 'visible',
    label: 'Visible',
    type: 'checkbox'
  },
  {
    key: 'gridSize',
    label: 'Grid size',
    type: 'number',
    path: ['grid', 'size'],
    precision: 3
  },
  {
    key: 'gridDivisions',
    label: 'Grid divisions',
    type: 'number',
    path: ['grid', 'divisions'],
    precision: 0
  },
  {
    key: 'hudContent',
    label: 'HUD content',
    type: 'text',
    path: ['hud', 'content']
  }
];

const SheetAux = createSheetComponent({
  columns: auxColumns,
  createRow: () => createAux()
});

export default SheetAux;
