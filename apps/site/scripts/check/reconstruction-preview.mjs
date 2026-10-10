import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, stat } from 'node:fs/promises';

// Static delivery check only: no AJAX, application, canvas, GPU or timing claims.
const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prefix = '/preview-reconstruction/';
const root = path.resolve(siteRoot, 'public', prefix.slice(1));
const origin = 'https://preview.invalid';
// This explicit navigation link leaves the isolated app; assets must not.
// Its generated HTML is checked after the site build.
const siteDocumentLinks = new Map([
  ['/docs/usage/create-save-read', path.resolve(siteRoot, 'src/content/docs/usage/create-save-read.md')],
]);
const errors = new Set();
const maps = new Map();
const scripts = [];
let references = 0;
const fail = (where, message) => errors.add(`${where}: ${message}`);
const toUrl = file => new URL(prefix + path.relative(root, file).split(path.sep).join('/'), origin);
const label = file => path.relative(siteRoot, file).split(path.sep).join('/');

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

async function checkReference(raw, base, where, { directory = false, externalLink = false, model = true } = {}) {
  if (!raw || raw.startsWith('#')) return;
  let url;
  try { url = new URL(raw, base); } catch { fail(where, `invalid URL ${raw}`); return; }
  if (externalLink && (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))) return;
  const siteDocument = externalLink && url.origin === origin && siteDocumentLinks.get(url.pathname.replace(/\/$/, ''));
  if (siteDocument) {
    references++;
    try { if (!(await stat(siteDocument)).isFile()) throw new Error(); }
    catch { fail(where, `missing source for site document ${url.pathname}`); }
    return url;
  }
  if (url.origin !== origin || !url.pathname.startsWith(prefix)) {
    fail(where, `outside ${prefix}: ${raw}`); return;
  }
  let relative;
  try { relative = decodeURIComponent(url.pathname.slice(prefix.length)); }
  catch { fail(where, `invalid URL encoding ${raw}`); return; }
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) {
    fail(where, `path escapes output: ${raw}`); return;
  }
  references++;
  try {
    const info = await stat(file);
    if (info.isDirectory()) {
      if (!directory && !(await stat(path.join(file, 'index.html'))).isFile()) throw new Error();
    } else if (!info.isFile() || directory) throw new Error();
  } catch { fail(where, `missing ${url.pathname}${directory ? ' (directory)' : ''}`); }
  if (model && url.searchParams.has('model')) {
    await checkReference(url.searchParams.get('model'), url, `${where} model=`, { model: false });
  }
  return url;
}

function entities(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    return String.fromCodePoint(entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1)));
  });
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = entities(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}

// A small lexer keeps comment-only imports and quoted examples out of the check.
// Interpolated module names are intentionally outside a literal-import check.
function tokens(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i], next = source[i + 1];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && next === '/') { i = source.indexOf('\n', i + 2); if (i < 0) break; continue; }
    if (c === '/' && next === '*') { const end = source.indexOf('*/', i + 2); i = end < 0 ? source.length : end + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const start = i++, quote = c;
      let value = '', dynamic = false;
      while (i < source.length && source[i] !== quote) {
        if (quote === '`' && source[i] === '$' && source[i + 1] === '{') dynamic = true;
        if (source[i] === '\\') {
          i++;
          const escaped = source[i++];
          if (escaped === '\n') continue;
          if (escaped === '\r') { if (source[i] === '\n') i++; continue; }
          if (escaped === 'x' || escaped === 'u') {
            const length = escaped === 'x' ? 2 : 4, hex = source.slice(i, i + length);
            if (new RegExp(`^[\\da-f]{${length}}$`, 'i').test(hex)) { value += String.fromCharCode(parseInt(hex, 16)); i += length; continue; }
          }
          value += ({ n: '\n', r: '\r', t: '\t' })[escaped] ?? escaped;
        } else value += source[i++];
      }
      i++;
      out.push({ kind: dynamic ? 'dynamic' : 'string', value, start });
      continue;
    }
    const previous = out.at(-1)?.value;
    if (c === '/' && (!previous || /^(?:\(|\[|\{|=|:|,|;|!|\?|&&|\|\||return|throw|case|=>)$/.test(previous))) {
      // Skip regular-expression bodies (including character classes).
      i++; let inClass = false;
      while (i < source.length) {
        if (source[i] === '\\') { i += 2; continue; }
        if (source[i] === '[') inClass = true;
        if (source[i] === ']') inClass = false;
        if (source[i++] === '/' && !inClass) break;
      }
      while (/[a-z]/i.test(source[i] || '') && i < source.length) i++;
      out.push({ kind: 'regexp', value: '/', start: i });
      continue;
    }
    const word = source.slice(i).match(/^[\w$]+/);
    if (word) { out.push({ kind: 'word', value: word[0], start: i }); i += word[0].length; }
    else { out.push({ kind: 'punctuation', value: c, start: i }); i++; }
  }
  return out;
}

function imports(source) {
  const list = tokens(source), result = [];
  for (let i = 0; i < list.length; i++) {
    const token = list[i];
    if (token.kind !== 'word' || !['import', 'export'].includes(token.value) || list[i - 1]?.value === '.') continue;
    if (token.value === 'import' && list[i + 1]?.kind === 'string') result.push(list[i + 1]);
    else if (token.value === 'import' && list[i + 1]?.value === '(' && list[i + 2]?.kind === 'string') result.push(list[i + 2]);
    else if (list[i + 1]?.value !== '(' && list[i + 1]?.value !== '.') {
      for (let j = i + 1; j < list.length && list[j].value !== ';'; j++) {
        if (list[j].value === 'from' && list[j + 1]?.kind === 'string') { result.push(list[j + 1]); break; }
        if (['import', 'export'].includes(list[j].value)) break;
      }
    }
  }
  return result;
}

function resolveImport(specifier, where) {
  if (/^(?:[./]|[a-z][\w+.-]*:)/i.test(specifier)) return specifier;
  const key = [...maps.keys()].filter(key => key === specifier || (key.endsWith('/') && specifier.startsWith(key))).sort((a, b) => b.length - a.length)[0];
  if (!key) { fail(where, `unmapped import ${specifier}`); return null; }
  return maps.get(key) + specifier.slice(key.length);
}

try {
  const files = await walk(root);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const jsFiles = files.filter(file => /\.(?:m?js)$/.test(file));
  if (!htmlFiles.length || !jsFiles.length) fail(label(root), 'missing HTML or JavaScript output');
  for (const file of htmlFiles) {
    const html = (await readFile(file, 'utf8')).replace(/<!--[\s\S]*?-->/g, '');
    const documentUrl = toUrl(file), where = label(file);
    const tags = [...html.matchAll(/<(base|[a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)];
    const baseHref = tags.find(match => match[1].toLowerCase() === 'base');
    const base = baseHref ? new URL(attributes(baseHref[0]).href || '', documentUrl) : documentUrl;
    for (const match of tags) {
      const tag = match[1].toLowerCase(), attrs = attributes(match[0]);
      for (const key of ['src', 'href']) if (attrs[key]) {
        await checkReference(attrs[key], base, `${where} ${tag}[${key}]`, { directory: tag === 'base', externalLink: tag === 'a' });
      }
    }
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attrs = attributes(match[1]);
      if (attrs.type === 'importmap') {
        const map = JSON.parse(match[2]);
        if (map.scopes) fail(where, 'scoped import map is not supported by this check');
        for (const [key, target] of Object.entries(map.imports || {})) {
          if (typeof target !== 'string') { fail(where, `invalid import mapping ${key}`); continue; }
          const url = await checkReference(target, base, `${where} importmap ${key}`, { directory: key.endsWith('/') });
          if (!url) continue;
          if (maps.has(key) && maps.get(key) !== url.href) fail(where, `conflicting import mapping ${key}`);
          maps.set(key, url.href);
        }
      } else if (!attrs.src) scripts.push({ source: match[2], base, where });
    }
    if (file === path.join(root, 'modeler_app/ui/diagnostics/index.html')) {
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        const attrs = attributes(match[1]);
        if ((attrs.src && /(?:^|\/)loadCheck\.js(?:[?#]|$)/.test(attrs.src)) || imports(match[2]).some(item => /(?:^|\/)loadCheck\.js(?:[?#]|$)/.test(item.value))) {
          fail(where, 'hosted page still executes local-server loadCheck.js');
        }
      }
    }
  }
  for (const file of jsFiles) scripts.push({ source: await readFile(file, 'utf8'), base: toUrl(file), where: label(file) });
  for (const script of scripts) for (const item of imports(script.source)) {
    const where = `${script.where}:${script.source.slice(0, item.start).split('\n').length}`;
    const target = resolveImport(item.value, where);
    if (target) await checkReference(target, script.base, where);
  }
  await checkReference(prefix + 'vendor/ajv/dist/ajv.js', origin, 'required AJV');
  await checkReference(prefix + 'modeler_app/ui/diagnostics/index.html', origin, 'local diagnostic notice');
  if (errors.size) {
    for (const error of errors) console.error(`[reconstruction-preview] ${error}`);
    console.error(`[reconstruction-preview] FAIL (${errors.size} errors)`);
    process.exitCode = 1;
  } else console.log(`[reconstruction-preview] OK: ${htmlFiles.length} HTML, ${jsFiles.length} JS, ${references} static references; no runtime/rendering assertions.`);
} catch (error) {
  console.error(`[reconstruction-preview] FAIL: ${error.message}`);
  process.exitCode = 1;
}
