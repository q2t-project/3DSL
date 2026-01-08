import { defineCollection, z } from "astro:content";

/**
 * Explicit collections to avoid deprecated auto-generation.
 * - fragments: small markdown snippets used by pages/layouts
 * - text: long-form markdown pages
 *
 * Schema is intentionally permissive to avoid breaking existing content.
 */
const fragments = defineCollection({
  type: "content",
  schema: z.object({}).passthrough(),
});

const text = defineCollection({
  type: "content",
  schema: z.object({}).passthrough(),
});

export const collections = { fragments, text };
