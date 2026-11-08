// This retired URL must not fall back to a cached static guide.
const page = `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>公開終了 | 3DSL</title></head>
<body><main><h1>公開終了</h1><p>「構造と分類」の公開は終了しました。</p><p><a href="/library/">Libraryへ</a></p></main></body>
</html>`;

export function onRequest({ request }) {
  return new Response(request.method === 'HEAD' ? null : page, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
