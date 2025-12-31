import fs from "node:fs";
import path from "node:path";
export type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  thumb?: string;
  viewer_url: string;
  tags?: string[];
  entry_points?: string[];
  pairs?: { a: string; b: string }[];
  rights?: {
    mode?: "quotation" | "original" | "licensed";
    notice_short?: string;
    sources?: Array<{
      title?: string;
      creator?: string;
      publisher?: string;
      year?: string;
      type?: string;
      locator?: string;
      url?: string;
      copyright_notice?: string;
    }>;
  };
};
type LibraryIndex = { version: number; items: LibraryItem[] };
const INDEX_ABS = path.join(process.cwd(), "public", "library", "library_index.json");
export function getLibraryItems(): LibraryItem[] {
  const raw = fs.readFileSync(INDEX_ABS, "utf8");
  const j = JSON.parse(raw) as LibraryIndex;
  if (!j?.items || !Array.isArray(j.items)) throw new Error("Invalid library_index.json: items missing");
  return j.items;
}
export function getLibraryItemBySlug(slug: string): LibraryItem | undefined {
  return getLibraryItems().find((x) => x.slug === slug);
}
