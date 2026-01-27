// NOTE:
// While `/modeler/` is owned by Astro pages (docs/landing), Modeler app lives under `/modeler_app/`.
// Some dev flows / bookmarks open `/modeler/index.html` directly; make that path redirect to the app entry.
//
// When you finally migrate the app to `/modeler/`, this file can be removed.

export function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/app/modeler',
      'Cache-Control': 'no-store',
    },
  });
}
