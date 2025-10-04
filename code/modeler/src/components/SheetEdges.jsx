import { createSheetComponent } from './SheetNodes.jsx';
import { createEdge } from '../lib/defaults.js';

const edgeColumns = [
  {
    key: 'source',
    label: 'Source',
    required: true,
    type: 'select',
    options: (context) => context?.nodes?.map((node) => node.id) ?? [],
    errorKey: 'source'
  },
  {
    key: 'target',
    label: 'Target',
    required: true,
    type: 'select',
    options: (context) => context?.nodes?.map((node) => node.id) ?? [],
    errorKey: 'target'
  },
  {
    key: 'directed',
    label: 'Directed',
    type: 'select',
    options: ['true', 'false', 'both'],
    placeholder: 'false'
  },
  {
    key: 'arrow',
    label: 'Arrow',
    type: 'select',
    options: ['none', 'normal', 'double', 'diamond', 'cone']
  },
  {
    key: 'curve',
    label: 'Curve',
    type: 'select',
    options: ['none', 'bezier', 'arc']
  },
  {
    key: 'color',
    label: 'Color',
    type: 'text'
  },
  {
    key: 'weight',
    label: 'Weight',
    type: 'number',
    precision: 3
  },
  {
    key: 'styleColor',
    label: 'Style color',
    type: 'text',
    path: ['style', 'color'],
    errorKey: 'style/color'
  },
  {
    key: 'styleWidth',
    label: 'Style width',
    type: 'number',
    path: ['style', 'width'],
    precision: 3
  },
  {
    key: 'styleDash',
    label: 'Style dash',
    type: 'select',
    path: ['style', 'dash'],
    options: ['solid', 'dashed', 'dotted']
  }
];

const SheetEdges = createSheetComponent({
  columns: edgeColumns,
  createRow: (context) => createEdge(context?.nodes ?? [])
});

export default SheetEdges;