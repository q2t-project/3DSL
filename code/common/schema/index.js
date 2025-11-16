// code/common/schema/index.js
// JSON スキーマ読み出し + レジストリ定義（Node 22 + ESM）

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// JSON は import assertion を使わず require で読む
const metadataSchema = require('./metadata.schema.json');
const nodeSchema = require('./node.schema.json');
const sceneSchema = require('./scene.schema.json');
const transformSchema = require('./transform.schema.json');
const coreModelSchema = require('./model.schema.json');

// 個別エクスポート
export { metadataSchema, nodeSchema, sceneSchema, transformSchema, coreModelSchema };

// 名前→スキーマ本体のレジストリ
export const schemaRegistry = {
  metadata: metadataSchema,
  node: nodeSchema,
  scene: sceneSchema,
  transform: transformSchema,
  '3dsl-core-model': coreModelSchema,
};
