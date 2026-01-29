import fs from "node:fs";
import { fileURLToPath } from "node:url";

export type LibrarySource = {
  title?: string;
  creator?: string;
  publisher?: string;
  year?: string;
  type?: string;
  locator?: string;
  url?: string;
  copyright_notice?: string;
};

export type LibraryRights = {
  mode?: "quotation" | "original" | "licensed";
  purpose?: string;
  policy?: any;
  sources?: LibrarySource[];
  notice_short?: string;
  notice_long?: string;
};

export type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  viewer_url: string;
  tags?: string[];
  updated_at?: string;
  created_at?: string;
  entry_points?: string[];
  pairs?: { a: string; b: string }[];
  series?: string;
  related?: string[];
  rights?: LibraryRights | null;
  meta_title?: string;
  meta_description?: string;

  // Generated endpoints (optional; backward compatible)
  data_dir?: string; // /_data/library/<id>
  model_url?: string; // /_data/library/<id>/model.3dss.json
  legacy_model_url?: string; // /3dss/library/<id>/model.3dss.json
  page?: any;
};

type LibraryIndex = {
  version?: number;
  generated_at?: string;
  items: LibraryItem[];
};

// NOTE:
// Do not rely on process.cwd() here.
// Astro dev/build can run with different working directories depending on how
// npm scripts are invoked. Resolve from this file location instead.
//
// This file lives at: apps/site/src/lib/libraryIndex.ts
// We want to read:     apps/site/public/_data/library/library_index.json
const INDEX_ABS = fileURLToPath(
  new URL("../../public/_data/library/library_index.json", import.meta.url)
);

export function readLibraryIndex(): LibraryIndex {
  let raw: string;
  try {
    raw = fs.readFileSync(INDEX_ABS, "utf8");
  } catch (e: any) {
    throw new Error(
      [
        "library_index.json not found.",
        `expected: ${INDEX_ABS}`,
        "run: npm run sync:3dss-content",
      ].join("\n"),
      { cause: e }
    );
  }

  let j: LibraryIndex;
  try {
    j = JSON.parse(raw) as LibraryIndex;
  } catch (e: any) {
    throw new Error(`library_index.json is invalid JSON: ${INDEX_ABS}`, { cause: e });
  }

  if (!j?.items || !Array.isArray(j.items)) throw new Error(`Invalid library_index.json: items missing: `);
  return j;
}

export function getLibraryItems(): LibraryItem[] {
  const { items } = readLibraryIndex();
  return items.slice();
}

export function getLibraryItemBySlug(slug: string): LibraryItem | undefined {
  return getLibraryItems().find((x) => x.slug === slug);
}
