// The published viewer and the edition its annotations cite must travel together.
import { cp, rm } from 'node:fs/promises';

const source = new URL('../../src/works/meta-atlas/', import.meta.url);
const target = new URL('../../public/meta-atlas/', import.meta.url);
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
