import atlas from "../../../../works/academic-atlas/atlas.html?raw";
import { getAcademicAtlasPaths } from "../../../../lib/academicAtlas";

export function getStaticPaths() {
  return getAcademicAtlasPaths();
}

export const GET = () => new Response(atlas, {
  headers: { "Content-Type": "text/html; charset=utf-8" },
});
