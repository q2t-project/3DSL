import {mkdirSync, writeFileSync} from 'node:fs';
if (process.env.CF_PAGES_BRANCH !== 'work/astro7-runtime-probe-20261108') throw new Error('Dedicated Preview only');
mkdirSync('dist', {recursive:true});
writeFileSync('dist/__runtime.json', JSON.stringify({node: process.versions.node})+'\n');
writeFileSync('dist/robots.txt','User-agent: *\nDisallow: /\n');
writeFileSync('dist/_headers','/*\n  X-Robots-Tag: noindex\n  Cache-Control: no-store\n');
