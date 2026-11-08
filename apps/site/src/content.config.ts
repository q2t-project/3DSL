import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Keep the existing Markdown collection directories and private-file exclusions.
function markdownFiles(directory: string) {
  return glob({
    base: `./src/content/${directory}`,
    pattern: ["**/*.{md,mdx}", "!**/_*/**", "!**/_*.{md,mdx}"],
  });
}

function markdownCollection(directory: string) {
  return defineCollection({ loader: markdownFiles(directory), schema: z.looseObject({}) });
}

export const collections = {
  fragments: markdownCollection("fragments"),
  text: markdownCollection("text"),
  docs: markdownCollection("docs"),
  faq: markdownCollection("faq"),
  policy: markdownCollection("policy"),
  docs_integrated: markdownCollection("docs_integrated"),
  pages: defineCollection({
    loader: markdownFiles("pages"),
    schema: z.looseObject({ title: z.string().optional(), description: z.string().optional() }),
  }),
};
