import metadataSchema from './metadata.schema.json' assert { type: 'json' };
import nodeSchema from './node.schema.json' assert { type: 'json' };
import sceneSchema from './scene.schema.json' assert { type: 'json' };
import transformSchema from './transform.schema.json' assert { type: 'json' };

export { metadataSchema, nodeSchema, sceneSchema, transformSchema };

export const schemaRegistry = {
  metadata: metadataSchema,
  node: nodeSchema,
  scene: sceneSchema,
  transform: transformSchema,
};
