import fs from "node:fs";
import path from "node:path";

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

const INDEX_ABS = path.join(process.cwd(), "public", "_data", "library", "library_index.json");

export function readLibraryIndex(): LibraryIndex {
  const raw = fs.readFileSync(INDEX_ABS, "utf8");
  const j = JSON.parse(raw) as LibraryIndex;
  if (!j?.items || !Array.isArray(j.items)) throw new Error("Invalid library_index.json: items missing");
  return j;
}

export function getLibraryItems(): LibraryItem[] {
  const { items } = readLibraryIndex();
  return items.slice();
}

export function getLibraryItemBySlug(slug: string): LibraryItem | undefined {
  return getLibraryItems().find((x) => x.slug === slug);
}
