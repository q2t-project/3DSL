// Invoke the retirement response only for the former guide's two clean URLs.
export function GET() {
  return Response.json({
    version: 1,
    include: [
      '/docs/works/structure-classification',
      '/docs/works/structure-classification/',
    ],
    exclude: [],
  });
}
