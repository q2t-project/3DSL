import { defineCollection, z } from "astro:content";

/**
 * Explicit collections to avoid deprecated auto-generation.
 *
 * - fragments: small markdown snippets used by pages/layouts
 * - text: long-form markdown pages
 * - docs: mirrored docs SSOT (packages/docs/docs)
 * - faq: mirrored faq SSOT (packages/docs/faq)
 * - policy: mirrored policy SSOT (packages/docs/policy)
 *
 * Schema is intentionally permissive to avoid breaking existing content.
 */
const permissive = z.object({}).passthrough();

const fragments = defineCollection({ type: "content", schema: permissive });
const text = defineCollection({ type: "content", schema: permissive });
const docs = defineCollection({ type: "content", schema: permissive });
const faq = defineCollection({ type: "content", schema: permissive });
const policy = defineCollection({ type: "content", schema: permissive });

// Generated from library content sources by sync:3dss-content.
// Untracked generated files; used only at build time to render Markdown to HTML.
const library_items = defineCollection({
  type: "content",
  schema: z
    .object({
      id: z.string(),
      title: z.string().optional(),
      summary: z.string().optional(),
      tags: z.array(z.string()).optional(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
    })
    .passthrough(),
});

const pages = defineCollection({
  type: "content",
  schema: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { fragments, text, docs, faq, policy, library_items, pages };
