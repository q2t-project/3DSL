import atlas from "../../../../works/chemical-engineering/atlas.html?raw";

export const GET = () => new Response(atlas, {
  headers: { "Content-Type": "text/html; charset=utf-8" },
});
