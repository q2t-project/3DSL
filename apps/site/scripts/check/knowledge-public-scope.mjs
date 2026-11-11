import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const site=fileURLToPath(new URL('../../',import.meta.url));
const baseline='8fec64352203e3e9a8dfe2f5e1323d00f0c8c2048b04f351399369c4bf0998c2';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
let attachments;
for(const [name,sceneHash] of [['knowledge_questions',baseline],['knowledge_questions_edited','0eb00e9c9a82e67c58a2a36cfa41fa248b0cf6ef2440afbb243c2a853fb63f7d']]){
 const text=await readFile(site+'public/preview-reconstruction/models/'+name+'.3dsl-work.json','utf8');
 const work=JSON.parse(text);
 assert.equal(digest(work.scene),sceneHash,name+': existing diagram retained');
 assert.equal(digest(work.baselineScene),baseline,name+': original diagram retained');
 assert(!/https:\/\/chatgpt\.com\/space\/|libfile_|\/workspace\//.test(text),name+': internal locators excluded');
 assert(!Object.keys(work.attachments).some(path=>path.startsWith('sources/')),name+': research manuscripts excluded');
 const note=work.attachments['authoring/PUBLIC_SOURCES.md'];
 assert(note?.includes('v0.3')&&note.includes('v1.3')&&note.includes('第12節'),name+': source editions and scope remain');
 const map=JSON.parse(work.attachments['authoring/source_map.json']);
 assert.equal(map.sources.proj3_integrated.sha256,'dd05d5f78e971a82b34e486d4aee84ed98f5fe9c39428bcc65ae47abb727e615');
 assert.equal(map.sources.proj3_roadmap.sha256,'57234f04a8d7831a431226e2fc1e4a21cb2d17b2a793e30e9ccd6ce74b33d155');
 assert.equal(map.tasks.length,3,'three reading tasks retained');
 assert(map.nodes.length>0&&map.relationships.length>0,'source correspondence retained');
 assert.equal(digest(JSON.parse(work.attachments['authoring/scene.3dss.json'])),baseline,'reconstruction input retained');
 if(attachments)assert.deepEqual(work.attachments,attachments,'original and edited sample share publication scope');
 attachments=work.attachments;
}
console.log('[check:knowledge-public-scope] PASS both public samples: manuscripts/internal locators excluded; source editions, hashes, tasks, mapping and existing diagrams retained. No historical deletion claim.');
