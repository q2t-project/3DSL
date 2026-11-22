// The published viewer and the edition its annotations cite must travel together.
import { copyFile, cp, rm } from 'node:fs/promises';

const source = new URL('../../src/works/meta-atlas/', import.meta.url);
const target = new URL('../../public/meta-atlas/', import.meta.url);
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

const person = new URL('../../../../packages/3dss-content/parts/outline/v1/person_circle-head_halfellipse-body75_overlap-body-trim_u8_v1.glb', import.meta.url);
await copyFile(person, new URL('person.glb', target));
