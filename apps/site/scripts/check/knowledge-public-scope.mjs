import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const site=fileURLToPath(new URL('../../',import.meta.url));
// Pin the reviewed v2 public scenes and independently preserve the v1 authoring input.
const baseline='a010396686cd3813b100436453e645a2398cf3d545ed1b55eb86f9a10ac36d11';
const authoringInput='8fec64352203e3e9a8dfe2f5e1323d00f0c8c2048b04f351399369c4bf0998c2';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
let attachments;
for(const [name,sceneHash] of [['knowledge_questions',baseline],['knowledge_questions_edited','59ca9d451dc142ac73be5eda05e6e46b8dc6b5e1f22f51ca4df5a969806effc1']]){
 const text=await readFile(site+'public/preview-reconstruction/models/'+name+'.3dsl-work.json','utf8');
 const work=JSON.parse(text);
 assert.equal(digest(work.scene),sceneHash,name+': existing diagram retained');
 assert.equal(digest(work.baselineScene),baseline,name+': reviewed baseline retained');
 assert(!/https:\/\/chatgpt\.com\/space\/|libfile_|\/workspace\//.test(text),name+': internal locators excluded');
 assert(!Object.keys(work.attachments).some(path=>path.startsWith('sources/')),name+': research manuscripts excluded');
 const note=work.attachments['authoring/PUBLIC_SOURCES.md'];
 assert(note?.includes('v0.3')&&note.includes('v1.3')&&note.includes('第12節'),name+': source editions and scope remain');
 const map=JSON.parse(work.attachments['authoring/source_map.json']);
 assert.equal(map.sources.proj3_integrated.sha256,'dd05d5f78e971a82b34e486d4aee84ed98f5fe9c39428bcc65ae47abb727e615');
 assert.equal(map.sources.proj3_roadmap.sha256,'57234f04a8d7831a431226e2fc1e4a21cb2d17b2a793e30e9ccd6ce74b33d155');
 assert.equal(map.tasks.length,3,'three reading tasks retained');
 assert(map.nodes.length>0&&map.relationships.length>0,'source correspondence retained');
 assert.equal(digest(JSON.parse(work.attachments['authoring/scene.3dss.json'])),authoringInput,'original reconstruction input retained');
 if(attachments)assert.deepEqual(work.attachments,attachments,'original and edited sample share publication scope');
 attachments=work.attachments;
}
console.log('[check:knowledge-public-scope] PASS both public samples: manuscripts/internal locators excluded; source editions, hashes, tasks, mapping and existing diagrams retained. No historical deletion claim.');
