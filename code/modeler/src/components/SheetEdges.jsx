import { createSheetComponent } from './SheetNodes.jsx';
import { createEdge } from '../lib/defaults.js';

const edgeColumns = [
  {
    key: 'source',
    label: 'Source',
    required: true,
    type: 'select',
    options: (context) => context?.nodes?.map((node) => node.id) ?? [],
    errorKey: 'source',
    schemaType: 'string',
    description: 'ID of the edge origin node',
    width: 144
  },
  {
    key: 'target',
    label: 'Target',
    required: true,
    type: 'select',
    options: (context) => context?.nodes?.map((node) => node.id) ?? [],
    errorKey: 'target',
    schemaType: 'string',
    description: 'ID of the edge destination node',
    width: 144
  },
  {
    key: 'directed',
    label: 'Directed',
    type: 'select',
    options: ['true', 'false', 'both'],
    placeholder: 'false',
    schemaType: 'string',
    description: 'Directionality mode for the edge',
    defaultValue: 'false',
    width: 120
  },
  {
    key: 'arrow',
    label: 'Arrow',
    type: 'select',
    options: ['none', 'normal', 'double', 'diamond', 'cone'],
    schemaType: 'string',
    description: 'Arrowhead rendering preset',
    defaultValue: 'none',
    width: 132
  },
  {
    key: 'curve',
    label: 'Curve',
    type: 'select',
    options: ['none', 'bezier', 'arc'],
    schemaType: 'string',
    description: 'Edge curvature interpolation',
    defaultValue: 'none',
    width: 120
  },
  {
    key: 'color',
    label: 'Color',
    type: 'color',
    schemaType: 'string',
    description: 'Edge stroke color',
    defaultValue: '#000000',
    width: 120
  },
  {
    key: 'weight',
    label: 'Weight',
    type: 'number',
    precision: 3,
    schemaType: 'number',
    description: 'Numeric weight for layout/logic',
    width: 96,
    step: 0.1
  },
  {
    key: 'styleColor',
    label: 'Style color',
    type: 'color',
    path: ['style', 'color'],
    errorKey: 'style/color',
    schemaType: 'string',
    description: 'Override color for rendered stroke',
    defaultValue: '#000000',
    width: 128
  },
  {
    key: 'styleWidth',
    label: 'Style width',
    type: 'number',
    path: ['style', 'width'],
    precision: 3,
    schemaType: 'number',
    description: 'Stroke width in world units',
    defaultValue: 1,
    width: 112,
    step: 0.1
  },
  {
    key: 'styleDash',
    label: 'Style dash',
    type: 'select',
    path: ['style', 'dash'],
    options: ['solid', 'dashed', 'dotted'],
    schemaType: 'string',
    description: 'Line dash pattern',
    defaultValue: 'solid',
    width: 120
  }
];

const SheetEdges = createSheetComponent({
  columns: edgeColumns,
  createRow: (context) => createEdge(context?.nodes ?? [])
});

export default SheetEdges;
