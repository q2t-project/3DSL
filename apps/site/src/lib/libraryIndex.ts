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
  thumb?: string;
  viewer_url: string;
  tags?: string[];
  // Optional: editorial meta (schema外 / index側で管理)
  created_at?: string;
  updated_at?: string;
  recommended?: boolean;
  recommended_rank?: number;
  entry_points?: string[];
  pairs?: { a: string; b: string }[];
  series?: string;
  related?: string[];
  rights?: LibraryRights;
};

type LibraryIndex = {
  version: number;
  generated_at?: string;
  items: LibraryItem[];
};

const INDEX_ABS = path.join(process.cwd(), "public", "library", "library_index.json");

export function readLibraryIndex(): LibraryIndex {
  const raw = fs.readFileSync(INDEX_ABS, "utf8");
  const j = JSON.parse(raw) as LibraryIndex;
  if (!j?.items || !Array.isArray(j.items)) throw new Error("Invalid library_index.json: items missing");
  return j;
}

export function getLibraryItems(): LibraryItem[] {
  const { items } = readLibraryIndex();
  // Library は小規模運用を前提とし、一覧の並びは index 側の順序を SSOT とする。
  //（必要なら UI 側で「新着」「おすすめ」等に並べ替える）
  return items.slice();
}

export function getLibraryItemBySlug(slug: string): LibraryItem | undefined {
  return getLibraryItems().find((x) => x.slug === slug);
}
