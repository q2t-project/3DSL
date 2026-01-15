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

export const collections = { fragments, text, docs, faq, policy };
