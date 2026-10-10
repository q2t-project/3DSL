import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { cases, isReviewPreview, reviewPath } from '../../../../packages/3dss-content/review/concept-repair/cases.mjs';

const dist = new URL('../../dist/', import.meta.url);
const files = ['index.html', ...cases.map(({ id }) => `${id}.3dss.json`)];
const read = (file) => readFile(new URL(file, dist), 'utf8');
for (const env of [{ CF_PAGES_ENV: 'production' }, { CF_PAGES_BRANCH: 'main' }, { CF_PAGES: '1' }]) {
  assert.equal(isReviewPreview(env), false, 'production/unknown Cloudflare must not generate review');
}
assert.equal(isReviewPreview({ CF_PAGES_ENV: 'preview' }), true);
assert.equal(isReviewPreview({}), true, 'local review is allowed');

if (!isReviewPreview()) {
  for (const file of files) {
    await assert.rejects(access(new URL(`review/concept-repair/${file}`, dist)), { code: 'ENOENT' });
  }
  console.log('[check:concept-repair] PASS: no review page or comparison JSON in production output');
} else {
  const { checks } = await import('./concept-repair-data.mjs');
  const html = await read('review/concept-repair/index.html');
  assert(/name="robots" content="noindex, nofollow"/.test(html), 'comparison page is noindex');
  assert(html.includes('data-3dsl-adsense-eligible="0"'), 'comparison page is not ad eligible');
  assert(!/<script\b[^>]*src="https:\/\/pagead2\.googlesyndication\.com\//.test(html));
  const links = [...html.matchAll(/href="(\/app\/viewer\?[^"]+)"/g)].map((match) => new URL(match[1].replace(/&(?:amp|#38|#x26);/gi, '&'), 'https://3dsl.jp'));
  assert.equal(links.length, 3);
  for (const [index, { id, model }] of cases.entries()) {
    assert.equal(await read(`review/concept-repair/${id}.3dss.json`), `${JSON.stringify(model, null, 2)}\n`, `${id}: delivered JSON matches validated source candidate`);
    const params = links[index].searchParams;
    assert.equal(params.get('model'), `${reviewPath}${id}.3dss.json`);
    assert.equal(params.get('return'), reviewPath);
    assert.equal(params.get('from'), 'review');
    assert.equal(params.get('noads'), '1');
  }
  for (const file of ['index.html', 'library/index.html', 'sitemap.xml']) {
    assert(!(await read(file).catch(() => '')).includes(reviewPath), `${file}: no public promotion`);
  }
  console.log(`[check:concept-repair] PASS: ${JSON.stringify(checks)}; source hash, immutable 38 points/41 lines, distribution equality, return links, noindex/ad exclusion. No WebGL assertion.`);
}
