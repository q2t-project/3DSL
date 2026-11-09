import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(site, 'dist');
const read = (file) => readFile(path.join(dist, file), 'utf8');
const index = JSON.parse(await read('_data/library/library_index.json'));
const listHtml = await read('library/index.html');
const topHtml = await read('index.html');
const sitemap = await read('sitemap.xml').catch(() => ''); // Preview may omit it.
const featured = [...topHtml.matchAll(/href="\/library\/([^"/?#]+)"/g)].map((match) => match[1]);

// Check generated reader links, not just whether a compatibility URL responds.
const viewerPath = '/app/viewer/';
const siteOrigin = 'https://3dsl.jp';

// Inspect the delivered HTML and PNG, including Preview builds without a sitemap.
// This proves metadata availability, not how a social platform caches/renders it.
{
  const image = JSON.parse(await read('assets/social/image.json'));
  assert.match(image.path, /^\/assets\/social\/3dsl\.[a-f0-9]{16}\.png$/);
  assert.equal(image.url, siteOrigin + image.path);
  const png = await readFile(path.join(dist, image.path.slice(1)));
  const digest = createHash('sha256').update(png).digest('hex');
  assert.equal(digest, image.sha256, 'social image bytes match manifest');
  assert(image.path.includes(digest.slice(0, 16)), 'social image URL changes with its content');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  assert.equal(image.type, 'image/png');
  assert(image.alt?.trim(), 'social image has descriptive alternative text');
  assert.equal(image.sourceLogoSha256, createHash('sha256')
    .update(await readFile(path.join(site, '../viewer/ssot/assets/logo/3DSL.svg'))).digest('hex'));
  const checked = new Set();
  for (const file of (await readdir(dist, { recursive: true })).filter(name => name.endsWith('.html'))) {
    const html = await read(file);
    if (!html.includes('property="og:title"')) continue;
    const meta = name => new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`).exec(html)?.[1];
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    assert(canonical?.startsWith(siteOrigin + '/'), file + ': production canonical');
    const identity = new URL(canonical);
    assert(!identity.search && !identity.hash, file + ': canonical excludes query/fragment');
    assert.equal(meta('og:url'), canonical, file + ': shared URL matches canonical');
    assert.equal(meta('og:title'), /<title>([\s\S]*?)<\/title>/.exec(html)?.[1], file + ': shared title');
    assert.equal(meta('og:description'), meta('description'), file + ': shared description');
    const pageImage = meta('og:image');
    assert.equal(new URL(pageImage).protocol, 'https:', file + ': absolute HTTPS image');
    assert.equal(meta('twitter:image'), pageImage, file + ': shared image');
    assert(meta('og:image:alt')?.trim(), file + ': descriptive image alt');
    assert.equal(meta('twitter:image:alt'), meta('og:image:alt'), file + ': shared image alt');
    if (pageImage === image.url) {
      assert.equal(meta('og:image:alt'), image.alt, file + ': default image alt');
      assert.equal(meta('og:image:type'), image.type, file + ': image type');
      assert.equal(meta('og:image:width'), String(image.width), file + ': image width');
      assert.equal(meta('og:image:height'), String(image.height), file + ': image height');
    }
    assert(['summary_large_image', 'summary'].includes(meta('twitter:card')), file + ': image card');
    checked.add(canonical);
  }
  for (const route of ['/', '/docs/works/knowledge-questions/', '/docs/usage/first-work/']) {
    assert(checked.has(siteOrigin + route), route + ': share metadata exists');
  }
  for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) assert(checked.has(loc), loc + ': sitemap page has share metadata');
  console.log(`[check:social-metadata] PASS ${checked.size} pages: canonical/title/description, absolute image and alt; PNG 1200x630, source and content hashes. No platform preview claim.`);
}

function readerLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="(\/[^"]*)"/gi)]
    .map(match => new URL(match[1].replace(/&(?:amp|#0*38|#x0*26);/gi, '&'), siteOrigin));
}
function hasWorkLink(links, model, returnTo) {
  return links.some(url => url.pathname === viewerPath && url.searchParams.get('model') === model &&
    url.searchParams.get('return') === returnTo);
}
const listLinks = readerLinks(listHtml);
// A retired work must disappear from both catalog and direct data routes.
const retiredIds = ['26010502', '26010801', '26012201'];
for (const id of retiredIds) {
  assert(!sitemap.includes(`/library/${id}/`), `${id}: retired work in sitemap`);
  assert(!index.items.some(item => item.id === id), `${id}: retired work in index`);
  for (const root of ['_data/library', '3dss/library', 'library']) {
    await assert.rejects(stat(path.join(dist, root, id)), { code: 'ENOENT' },
      `${root}/${id}: retired work in distribution`);
  }
}
const retiredGuide = '/docs/works/structure-classification';
await assert.rejects(stat(path.join(dist, retiredGuide.slice(1))), { code: 'ENOENT' }, 'retired guide in distribution');
assert(!sitemap.includes(retiredGuide), 'retired guide in sitemap');
const notFound = await read('404.html');
assert(notFound.includes('<meta name="robots" content="noindex"'), '404 is excluded from search');
assert(notFound.includes('ページが見つからなかった') && notFound.includes('href="/library"') && notFound.includes('href="/"'),
  '404 retains the public recovery links');
const functionRoutes = JSON.parse(await read('_routes.json'));
assert.deepEqual(functionRoutes, {
  version: 1, include: [retiredGuide, retiredGuide + '/'], exclude: [],
}, 'only the two retired guide URLs invoke Functions');
const { onRequest: retiredGuideResponse } = await import('../../functions/docs/works/structure-classification.js');
for (const method of ['GET', 'HEAD']) {
  const response = retiredGuideResponse({ request: new Request(siteOrigin + retiredGuide + '/', { method }) });
  assert.equal(response.status, 410, 'retired guide is gone');
  assert.equal(response.headers.get('Cache-Control'), 'no-store', 'retired guide cannot be cached');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
  assert.equal((await response.text()).includes('公開終了'), method === 'GET', 'HEAD has no response body');
}

for (const file of ['index.html', 'concept/index.html', 'docs/index.html', 'library/index.html',
  'docs/usage/read-a-work/index.html', 'faq/content-authorship/index.html']) {
  const links = readerLinks(await read(file));
  assert(!links.some(url => url.pathname.replace(/\/$/, '') === retiredGuide ||
    retiredIds.some(id => url.href.includes(id))), `${file}: link to a retired work or guide`);
}
for (const item of index.items) {
  const detail = await read(`library/${item.slug}/index.html`);
  assert(await stat(path.join(dist, item.model_url.replace(/^\//, ''))), `${item.id}: model preserved`);
  assert.equal(new URL(item.viewer_url, siteOrigin).pathname, viewerPath, `${item.id}: canonical catalog URL`);
  assert(hasWorkLink(readerLinks(detail), item.model_url, `/library/${item.slug}/`), `${item.id}: detail opens its work and retains return path`);
  // Resolve the actual generated links so a renamed image/attachment cannot
  // silently ship a 404 in a work description.
  for (const m of detail.matchAll(/(?:href|src)="(\/_data\/library\/[^"?#]+)"/g)) {
    const pathname = path.posix.normalize(decodeURIComponent(new URL(m[1].replaceAll('&amp;', '&'), siteOrigin).pathname));
    if (!pathname.startsWith(`${item.data_dir}/assets/`) && !pathname.startsWith(`${item.data_dir}/attachments/`)) continue;
    assert((await stat(path.join(dist, pathname))).isFile(), `${item.id}: missing file ${pathname}`);
  }
  if (item.hidden === true) {
    assert(!listHtml.includes(`data-library-id="${item.id}"`), `${item.id}: hidden from public list`);
    assert(!featured.includes(item.slug), `${item.id}: hidden from featured links`);
    assert(!sitemap.includes(`/library/${item.slug}/`), `${item.id}: hidden from sitemap`);
    assert(/<meta\b[^>]*name="robots"[^>]*content="noindex"/.test(detail), `${item.id}: noindex`);
    assert(detail.includes('data-3dsl-adsense-eligible="0"'), `${item.id}: no advertising`);
  } else {
    assert(listHtml.includes(`data-library-id="${item.id}"`), `${item.id}: present in public list`);
    assert(hasWorkLink(listLinks, item.model_url, '/library/'), `${item.id}: list opens its work and retains return path`);
  }
}
for (const slug of featured) {
  const item = index.items.find((entry) => entry.slug === slug);
  assert(item && !item.hidden && item.recommended === true, `${slug}: explicit featured choice`);
}

// Existing Markdown bookmarks and copyable CLI flags survive renderer changes.
for (const route of ['docs/ops/devops_site', 'policy/ssot_policy', 'faq/content-authorship']) {
  assert((await stat(path.join(dist, route, 'index.html'))).isFile(), `${route}: published Markdown route`);
}
assert((await read('docs/library/ops-cheatsheet/index.html')).includes('npm --prefix apps/site run check:library'),
  'published shell commands retain literal flags');

const guideRoute = '/docs/usage/create-save-read';
const guide = await read(`${guideRoute.slice(1)}/index.html`);
assert(guide.includes('作る・保存する・開き直す'), 'usage guide is generated');
for (const file of ['docs/index.html', 'preview-reconstruction/index.html', 'preview-reconstruction/OPEN_MODELS.html']) {
  assert((await read(file)).includes(`href="${guideRoute}"`), `${file}: guide entry`);
}
const policy = await read('policy/content-usage/index.html');
assert(policy.includes('id="practice-samples"'), 'sample terms anchor is generated');
// The six reader guides are public search entries. Fail if frontmatter is
// missing and the Docs template silently falls back to its internal label.
const representative = '/docs/works/knowledge-questions/';
const summaries = new Set();
for (const route of [representative, '/docs/overview/what-is-3dsl/', '/docs/overview/what-is-3dss/',
  '/docs/usage/create-save-read/', '/docs/usage/read-a-work/', '/docs/usage/first-work/']) {
  const page = await read(route.slice(1) + 'index.html');
  const summary = /<meta name="description" content="([^"]+)"/.exec(page)?.[1];
  assert(summary && !summary.includes('SSOT: packages/docs') && !summaries.has(summary), route + ': unique reader summary');
  assert(page.includes(`<meta property="og:description" content="${summary}"`), route + ': share summary');
  assert(page.includes(`<link rel="canonical" href="${siteOrigin + route}"`), route + ': canonical');
  if (sitemap) assert(sitemap.includes(`<loc>${siteOrigin + route}</loc>`), route + ': sitemap');
  summaries.add(summary);
}
for (const file of ['index.html', 'docs/index.html', 'concept/index.html', 'library/index.html',
  'docs/usage/read-a-work/index.html', 'docs/usage/first-work/index.html',
  'preview-reconstruction/index.html', 'preview-reconstruction/OPEN_MODELS.html']) {
  const entryLinks = readerLinks(await read(file)).filter(link => link.pathname.replace(/\/$/, '') === representative.slice(0,-1));
  assert(entryLinks.length && entryLinks.every(link => link.pathname === representative), file + ': direct link to the representative guide');
}
const firstWorkRoute = '/docs/usage/first-work';
const firstWork = await read(`${firstWorkRoute.slice(1)}/index.html`);
for (const file of ['index.html', 'canonical/index.html', 'preview-reconstruction/index.html', 'preview-reconstruction/OPEN_MODELS.html',
  'docs/usage/create-save-read/index.html', 'docs/usage/first-work/index.html',
  'docs/works/knowledge-questions/index.html']) {
  const page = await read(file);
  const links = readerLinks(page);
  assert(links.some(link => link.pathname === viewerPath), `${file}: canonical Viewer entry`);
  assert(!links.some(link => /^\/(?:preview-reconstruction\/)?(?:contract_viewer|viewer)(?:\/(?:index\.html)?)?$/.test(link.pathname)),
    `${file}: no link to an alternate Viewer`);
  assert(!/従来版Viewer|再構築版Viewer|従来画面で同じ図/.test(page), `${file}: one reader-facing Viewer`);
  for (const link of links.filter(link => link.pathname === viewerPath && link.searchParams.has('model'))) {
    const model = link.searchParams.get('model');
    assert(model.startsWith('/') && (await stat(path.join(dist, model))).isFile(), `${file}: linked work exists (${model})`);
  }
}
for (const file of ['index.html', 'docs/index.html', 'docs/usage/create-save-read/index.html', 'docs/works/knowledge-questions/index.html', 'preview-reconstruction/index.html', 'preview-reconstruction/OPEN_MODELS.html']) {
  assert((await read(file)).includes(`href="${firstWorkRoute}"`), `${file}: first-work entry`);
}
const tutorialModel = 'preview-reconstruction/models/first_work.3dsl-work.json';
assert(policy.includes('first_work.3dsl-work.json'), 'tutorial is covered by sample terms');
assert.equal(await read(tutorialModel), await readFile(path.join(site, '../../apps/reconstruction/ssot/models/first_work.3dsl-work.json'), 'utf8'), 'tutorial distribution matches its source');
assert(firstWork.includes('href="https://3dsl.jp/docs/usage/first-work/"'), 'tutorial production canonical');
assert(!firstWork.includes('name="robots" content="noindex'), 'tutorial is a public reading page');
assert(!firstWork.includes('content="3DSL Docs（SSOT: packages/docs）"'), 'tutorial has a specific search description');
assert(firstWork.includes('data-3dsl-adsense-eligible="0"'), 'tutorial stays ad-free');
if (sitemap) assert(sitemap.includes('https://3dsl.jp/docs/usage/first-work/'), 'tutorial sitemap entry');
for (const match of firstWork.matchAll(/href="(\/[^"?#]*)/g)) {
  const pathname = match[1];
  const file = path.join(dist, pathname.replace(/^\//, ''));
  const info = await stat(file).catch(() => null);
  assert(info && (info.isFile() || (await stat(path.join(file, 'index.html'))).isFile()), `tutorial link: ${pathname}`);
}
for (const file of ['docs/usage/create-save-read/index.html', 'preview-reconstruction/index.html', 'preview-reconstruction/OPEN_MODELS.html']) {
  assert((await read(file)).includes('href="/policy/content-usage#practice-samples"'), `${file}: sample terms entry`);
}
// Check actual guide destinations, including policy and the isolated app routes.
for (const match of guide.matchAll(/href="(\/[^"?#]*)/g)) {
  const pathname = match[1];
  const file = path.join(dist, pathname.replace(/^\//, ''));
  const info = await stat(file).catch(() => null);
  assert(info && (info.isFile() || (await stat(path.join(file, 'index.html'))).isFile()), `guide link: ${pathname}`);
}
for (const file of ['index.html', 'concept/index.html', 'docs/index.html', 'library/index.html', 'policy/index.html', 'contact/index.html']) {
  const html = await read(file);
  assert(!/<script\b[^>]*src="https:\/\/pagead2\.googlesyndication\.com\//.test(html), `${file}: no unconditional Google script`);
  assert(html.includes('name="google-adsense-account"'), `${file}: verification metadata retained`);
}
console.log(`[check:site-publication] PASS: ${index.items.length} detail/data URLs, hidden/list/featured/sitemap/ads policy, guide and its links; no browser or ad-serving claims`);

await import('./content-readability.mjs');

// Unversioned vendor URLs used to be immutable for a year. A warm legacy
// Modeler must preload the exact current validator before its module graph runs.
{
  const { createHash } = await import('node:crypto');
  const { pathToFileURL } = await import('node:url');
  const html = await read('modeler_app/index.html');
  const revision = html.match(/data-versioned-ajv="([a-f0-9]{64})"/)?.[1];
  assert(revision, 'legacy Modeler preloads a content-addressed validator');
  assert(html.includes(`await import("/vendor/ajv/dist/ajv.js?v=${revision}")`));
  const bootName = html.match(/await import\("\.\/(modelerHostBoot\.([a-f0-9]{64})\.js)"\)/);
  assert(bootName, 'legacy Modeler boot has a content-addressed URL');
  assert(html.indexOf(`await import("/vendor/ajv/dist/ajv.js?v=${revision}")`) < html.indexOf(bootName[0]));
  const boot = await readFile(path.join(dist, 'modeler_app', bootName[1]));
  assert.equal(createHash('sha256').update(boot).digest('hex'), bootName[2]);
  assert(boot.equals(await readFile(path.join(site, '../modeler/ssot/modelerHostBoot.js'))));
  assert(boot.includes('ev.origin !== window.location.origin || ev.source !== window.parent'));
  const shim = await read('vendor/ajv/dist/ajv.js');
  assert(shim.includes(`import "./ajv.${revision}.bundle.js"`));
  const bundle = await readFile(path.join(dist, 'vendor/ajv/dist', `ajv.${revision}.bundle.js`));
  assert.equal(createHash('sha256').update(bundle).digest('hex'), revision);
  const headers = await read('_headers');
  assert(headers.includes('/vendor/*\n  Cache-Control: public, max-age=0, must-revalidate'));
  assert(!headers.includes('immutable'), 'unversioned vendor files are revalidated');
  for (const entry of ['/modeler_app', '/modeler_app/', '/modeler_app/index.html']) {
    assert(headers.includes(`${entry}\n  Cache-Control: no-store`), 'Modeler entry is not retained in browser cache');
  }
  const keys = ['Ajv', 'AjvAddFormats', '__createAjv'];
  const previous = keys.map(key => [key, globalThis[key]]);
  try {
    await import(pathToFileURL(path.join(dist, 'vendor/ajv/dist/ajv.js')).href);
    // This is the API the generated preload exposes even to a cached controller.
    const validator = new globalThis.__createAjv({ strict: true });
    const dateTime = validator.compile({ type: 'string', format: 'date-time' });
    assert.equal(dateTime('2026-11-08T00:00:00Z'), true);
    assert.equal(dateTime('not-a-date'), false);
  } finally {
    for (const [key, value] of previous) if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  }
  console.log('[check:versioned-vendor] PASS current bundle/hash, preload order and date-time validation; no whole-Modeler UI claim.');
}

await import('./public-vendor.mjs');
