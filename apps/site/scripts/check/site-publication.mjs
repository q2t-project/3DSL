import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(site, 'dist');
const read = (file) => readFile(path.join(dist, file), 'utf8');
const index = JSON.parse(await read('_data/library/library_index.json'));
const listHtml = await read('library/index.html');
const topHtml = await read('index.html');
const sitemap = await read('sitemap.xml').catch(() => ''); // Preview may omit it.
const featured = [...topHtml.matchAll(/href="\/library\/([^"/?#]+)"/g)].map((match) => match[1]);

for (const item of index.items) {
  const detail = await read(`library/${item.slug}/index.html`);
  assert(await stat(path.join(dist, item.model_url.replace(/^\//, ''))), `${item.id}: model preserved`);
  if (item.hidden === true) {
    assert(!listHtml.includes(`"id":"${item.id}"`), `${item.id}: hidden from public list`);
    assert(!featured.includes(item.slug), `${item.id}: hidden from featured links`);
    assert(!sitemap.includes(`/library/${item.slug}/`), `${item.id}: hidden from sitemap`);
    assert(/<meta\b[^>]*name="robots"[^>]*content="noindex"/.test(detail), `${item.id}: noindex`);
    assert(detail.includes('data-3dsl-adsense-eligible="0"'), `${item.id}: no advertising`);
  } else {
    assert(listHtml.includes(`"id":"${item.id}"`), `${item.id}: present in public list`);
  }
}
for (const slug of featured) {
  const item = index.items.find((entry) => entry.slug === slug);
  assert(item && !item.hidden && item.recommended === true, `${slug}: explicit featured choice`);
}

const guideRoute = '/docs/usage/create-save-read';
const guide = await read(`${guideRoute.slice(1)}/index.html`);
assert(guide.includes('作る・保存する・開き直す'), 'usage guide is generated');
for (const file of ['docs/index.html', 'preview-reconstruction/index.html', 'preview-reconstruction/OPEN_MODELS.html']) {
  assert((await read(file)).includes(`href="${guideRoute}"`), `${file}: guide entry`);
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
