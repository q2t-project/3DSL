// code/common/schema/index.js
// Node / browser 共通の JSON スキーマローダ

import metadataSchema  from "./metadata.schema.json" with { type: "json" };
import modelSchema     from "./model.schema.json"    with { type: "json" };
import nodeSchema      from "./node.schema.json"     with { type: "json" };
import sceneSchema     from "./scene.schema.json"    with { type: "json" };
import transformSchema from "./transform.schema.json" with { type: "json" };

export const schemas = {
  metadata: metadataSchema,
  model: modelSchema,
  node: nodeSchema,
  scene: sceneSchema,
  transform: transformSchema,
};

// AJV 系ユーティリティからは schemaRegistry 名で参照する
// （Node / browser 共通の薄い API）
export const schemaRegistry = schemas;

export function listSchemas() {
  return Object.keys(schemas);
}

export default schemas;
