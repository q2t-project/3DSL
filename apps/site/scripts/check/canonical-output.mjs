import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");

function read(rel) {
  const p = path.join(DIST, rel);
  if (!fs.existsSync(p)) throw new Error(`missing build output: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function canonicalOf(html) {
  const tag = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0] ?? "";
  return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? null;
}

function expect(rel, expected) {
  const got = canonicalOf(read(rel));
  if (got !== expected) {
    throw new Error(`canonical mismatch: ${rel}\nexpected: ${expected}\nactual:   ${got}`);
  }
  console.log(`canonical PASS: ${rel} -> ${got}`);
}

expect("index.html", "https://3dsl.jp/");
expect("library/index.html", "https://3dsl.jp/library/");
expect("docs/index.html", "https://3dsl.jp/docs/");

const libraryRoot = path.join(DIST, "library");
const detail = fs.readdirSync(libraryRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(libraryRoot, e.name, "index.html")))
  .map((e) => e.name)
  .sort()[0];

if (!detail) throw new Error("no Library detail page found in dist/library");
expect(`library/${detail}/index.html`, `https://3dsl.jp/library/${detail}/`);

console.log("canonical output check: PASS");
