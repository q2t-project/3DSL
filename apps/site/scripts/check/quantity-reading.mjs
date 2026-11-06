// Quantity targets have one explicitly referenced annotation; name fallback is
// kept everywhere else, including Modeler and older non-reading hosts.
import assert from 'node:assert/strict';
import {buildLabelIndex} from '../../../reconstruction/ssot/viewer/runtime/renderer/labels/labelIndex.js';
const target={meta:{uuid:'bar'},signification:{name:'現金'},appearance:{marker:{primitive:'box'}}};
const annotation={meta:{uuid:'amount'},signification:{name:'現金100'},appearance:{marker:{primitive:'none',text:{content:'現金100',size:1,pose:{front:[0,1,0],up:[0,0,1]}}}}};
const aux={appearance:{module:{extension:{parametric:{type:'org.3dsl.prototype.quantity-mark',params:{target_uuid:'bar',label_uuid:'amount'}}}}}};
const source={points:[target,annotation],lines:[],aux:[aux]},before=JSON.stringify(source);
assert(buildLabelIndex(source).has('bar'),'ordinary fallback remains');
const reading=buildLabelIndex(source,{readingPresentation:true});assert(!reading.has('bar'));assert(reading.has('amount'));
for(const changed of [
 {...aux,appearance:{module:{extension:{parametric:{type:'other',params:{target_uuid:'bar',label_uuid:'amount'}}}}}},
 {...aux,appearance:{module:{extension:{parametric:{type:'org.3dsl.prototype.quantity-mark',params:{target_uuid:'bar',label_uuid:'missing'}}}}}},
])assert(buildLabelIndex({...source,aux:[changed]},{readingPresentation:true}).has('bar'),'unknown or missing references keep fallback');
assert(buildLabelIndex({...source,points:[{...target,appearance:{marker:{primitive:'box',text:{content:'明示ラベル'}}}},annotation]},{readingPresentation:true}).has('bar'),'explicit marker text wins');
assert.equal(JSON.stringify(source),before,'presentation never rewrites source');
console.log('[check:quantity-reading] PASS duplicate annotation, explicit text, incomplete/unknown reference, ordinary fallback and source retention.');
