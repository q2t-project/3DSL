import { getLibraryItems, type LibraryItem } from "./libraryIndex";

export const ACADEMIC_ATLAS_SLUG = "26112201";
export const ACADEMIC_ATLAS_PATH = `/library/${ACADEMIC_ATLAS_SLUG}/`;
export const ACADEMIC_ATLAS_READER = ACADEMIC_ATLAS_PATH + "read/";
export const ACADEMIC_ATLAS_EXPLORE = ACADEMIC_ATLAS_PATH + "explore/";
export function isPublicAcademicAtlas(item: LibraryItem): boolean {
  return item.slug === ACADEMIC_ATLAS_SLUG && !item.hidden && item.page?.guided === true;
}

export function allowsAcademicAtlasAds(item: LibraryItem): boolean {
  return isPublicAcademicAtlas(item) && Array.isArray(item.page?.ads) && item.page.ads.includes("guided_reader");
}

export function getAcademicAtlasPaths() {
  return getLibraryItems().filter(isPublicAcademicAtlas)
    .map(item => ({ params: { slug: item.slug }, props: { item } }));
}
