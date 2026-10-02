import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  filterRelease1Items,
  parseLibraryIndexRaw,
} from "./libraryIndexContract.js";

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

export type LibraryRelease1 = {
  included: boolean;
  role?: string;
  capabilities?: string[];
  exclusion_reason?: string;
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
  published_at?: string;
  republished_at?: string;
  hidden?: boolean;
  recommended?: boolean;
  release1?: LibraryRelease1 | null;
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
  guide_url?: string | null; // /_data/library/<id>/guide.json (Reader Guide v1)
  page?: any;
};

export type LibraryIndex = {
  version?: number;
  generated_at?: string;
  items: LibraryItem[];
};

export type LibraryIndexState = {
  ok: boolean;
  code: "OK" | "MISSING" | "INVALID_JSON" | "INVALID_SHAPE";
  index: LibraryIndex;
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

export function readLibraryIndexState(): LibraryIndexState {
  let raw = "";
  try {
    raw = fs.readFileSync(INDEX_ABS, "utf8");
  } catch {
    const parsed = parseLibraryIndexRaw(null) as LibraryIndexState;
    return parsed;
  }

  return parseLibraryIndexRaw(raw) as LibraryIndexState;
}

// Backward-compatible reader: callers receive an empty index rather than a throw.
// Use readLibraryIndexState() when the UI needs to distinguish degraded states.
export function readLibraryIndex(): LibraryIndex {
  return readLibraryIndexState().index;
}

export function getLibraryItems(): LibraryItem[] {
  return readLibraryIndexState().items.slice();
}

export function getReleaseLibraryItems(): LibraryItem[] {
  return filterRelease1Items(readLibraryIndexState().items) as LibraryItem[];
}

export function getLibraryIndexStatus(): Pick<LibraryIndexState, "ok" | "code"> {
  const { ok, code } = readLibraryIndexState();
  return { ok, code };
}

export function getLibraryItemBySlug(slug: string): LibraryItem | undefined {
  return getLibraryItems().find((x) => x.slug === slug);
}