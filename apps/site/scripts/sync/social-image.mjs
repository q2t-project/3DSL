import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// The existing outlined logo is the source; no fonts or remote images are used.
const source = new URL('../../../viewer/ssot/assets/logo/3DSL.svg', import.meta.url);
const destination = new URL('../../public/assets/social/', import.meta.url);
const logo = await readFile(source);
const background = '#0b0d10';
const width = 1200;
const height = 630;
const mark = await sharp(logo).resize({ width: 900, height: 420, fit: 'inside' }).png().toBuffer();
const png = await sharp({ create: { width, height, channels: 3, background } })
  .composite([{ input: mark, gravity: 'centre' }])
  .flatten({ background }).png().toBuffer();
const sha256 = createHash('sha256').update(png).digest('hex');
const filename = `3dsl.${sha256.slice(0, 16)}.png`;
const image = {
  path: `/assets/social/${filename}`,
  url: `https://3dsl.jp/assets/social/${filename}`,
  width, height, type: 'image/png',
  alt: '濃い背景に白い3DSLのロゴ',
  sha256,
  sourceLogoSha256: createHash('sha256').update(logo).digest('hex'),
};

// Only this generated directory belongs to this producer.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await writeFile(new URL(filename, destination), png);
await writeFile(new URL('image.json', destination), JSON.stringify(image, null, 2) + '\n');
console.log(`[sync] social image: ${image.path} (${width}x${height}, ${png.length} bytes)`);
