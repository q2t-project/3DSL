import {createAtlasTour} from "./atlas-tour.js?v=tour-2";
import {createReaderNote} from "./reader-note.js";
import {createReadingExample} from "./reading-example.js";
import {createReadingViews, introductoryRole, overviewSize, setOverviewSize} from "./reader-phases.js?v=annotation-exchange-1";
import {loadPersonMarker, drawPersonMarker, personMarkerHeight} from "./person-marker.js?v=person-overview-1";
var Ys=Object.create;var qn=Object.defineProperty;var Zs=Object.getOwnPropertyDescriptor;var Js=Object.getOwnPropertyNames;var Ks=Object.getPrototypeOf,Qs=Object.prototype.hasOwnProperty;var ii=(s,e)=>()=>(e||s((e={exports:{}}).exports,e),e.exports);var er=(s,e,i,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let l of Js(e))!Qs.call(s,l)&&l!==i&&qn(s,l,{get:()=>e[l],enumerable:!(a=Zs(e,l))||a.enumerable});return s};var tr=(s,e,i)=>(i=s!=null?Ys(Ks(s)):{},er(e||!s||!s.__esModule?qn(i,"default",{value:s,enumerable:!0}):i,s));var bs=ii(wn=>{"use strict";Object.defineProperty(wn,"__esModule",{value:!0});function vs(s){let e=s.length,i=0,a=0,l;for(;a<e;)i++,l=s.charCodeAt(a++),l>=55296&&l<=56319&&a<e&&(l=s.charCodeAt(a),(l&64512)===56320&&a++);return i}wn.default=vs;vs.code='require("ajv/dist/runtime/ucs2length").default'});var ws=ii((o0,Ms)=>{"use strict";Ms.exports=function s(e,i){if(e===i)return!0;if(e&&i&&typeof e=="object"&&typeof i=="object"){if(e.constructor!==i.constructor)return!1;var a,l,u;if(Array.isArray(e)){if(a=e.length,a!=i.length)return!1;for(l=a;l--!==0;)if(!s(e[l],i[l]))return!1;return!0}if(e.constructor===RegExp)return e.source===i.source&&e.flags===i.flags;if(e.valueOf!==Object.prototype.valueOf)return e.valueOf()===i.valueOf();if(e.toString!==Object.prototype.toString)return e.toString()===i.toString();if(u=Object.keys(e),a=u.length,a!==Object.keys(i).length)return!1;for(l=a;l--!==0;)if(!Object.prototype.hasOwnProperty.call(i,u[l]))return!1;for(l=a;l--!==0;){var t=u[l];if(!s(e[t],i[t]))return!1}return!0}return e!==e&&i!==i}});var As=ii(Sn=>{"use strict";Object.defineProperty(Sn,"__esModule",{value:!0});var Ss=ws();Ss.code='require("ajv/dist/runtime/equal").default';Sn.default=Ss});var Ls=ii((c0,Cn)=>{"use strict";Cn.exports=Yt;Cn.exports.default=Yt;var Ul={type:"object",properties:{relation:{$ref:"#/$defs/line/relation"},sense:{type:"string",enum:["a_to_b","b_to_a","bidirectional","neutral"],default:"a_to_b"},caption:{$ref:"#/$defs/labels/localized_string",default:""}},additionalProperties:!1},jt={type:"object",properties:{structural:{type:"string",enum:["association","containment","hierarchy"]},dynamic:{type:"string",enum:["causal","flow","influence","derivation","transformation","feedback","recursion","reflection"]},logical:{type:"string",enum:["equivalence","negation","implication","support","conflict"]},temporal:{type:"string",enum:["precedence","succession"]},meta:{type:"string",enum:["reference"]}},minProperties:1,maxProperties:1,additionalProperties:!1};function rt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=rt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let o in s)if(!(o==="relation"||o==="sense"||o==="caption")){let c={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:o},message:"must NOT have additional properties"};t===null?t=[c]:t.push(c),n++}if(s.relation!==void 0){let o=s.relation;if(o&&typeof o=="object"&&!Array.isArray(o)){if(Object.keys(o).length>1){let c={instancePath:e+"/relation",schemaPath:"#/$defs/line/relation/maxProperties",keyword:"maxProperties",params:{limit:1},message:"must NOT have more than 1 properties"};t===null?t=[c]:t.push(c),n++}if(Object.keys(o).length<1){let c={instancePath:e+"/relation",schemaPath:"#/$defs/line/relation/minProperties",keyword:"minProperties",params:{limit:1},message:"must NOT have fewer than 1 properties"};t===null?t=[c]:t.push(c),n++}for(let c in o)if(!(c==="structural"||c==="dynamic"||c==="logical"||c==="temporal"||c==="meta")){let h={instancePath:e+"/relation",schemaPath:"#/$defs/line/relation/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:c},message:"must NOT have additional properties"};t===null?t=[h]:t.push(h),n++}if(o.structural!==void 0){let c=o.structural;if(typeof c!="string"){let h={instancePath:e+"/relation/structural",schemaPath:"#/$defs/line/relation/properties/structural/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(!(c==="association"||c==="containment"||c==="hierarchy")){let h={instancePath:e+"/relation/structural",schemaPath:"#/$defs/line/relation/properties/structural/enum",keyword:"enum",params:{allowedValues:jt.properties.structural.enum},message:"must be equal to one of the allowed values"};t===null?t=[h]:t.push(h),n++}}if(o.dynamic!==void 0){let c=o.dynamic;if(typeof c!="string"){let h={instancePath:e+"/relation/dynamic",schemaPath:"#/$defs/line/relation/properties/dynamic/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(!(c==="causal"||c==="flow"||c==="influence"||c==="derivation"||c==="transformation"||c==="feedback"||c==="recursion"||c==="reflection")){let h={instancePath:e+"/relation/dynamic",schemaPath:"#/$defs/line/relation/properties/dynamic/enum",keyword:"enum",params:{allowedValues:jt.properties.dynamic.enum},message:"must be equal to one of the allowed values"};t===null?t=[h]:t.push(h),n++}}if(o.logical!==void 0){let c=o.logical;if(typeof c!="string"){let h={instancePath:e+"/relation/logical",schemaPath:"#/$defs/line/relation/properties/logical/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(!(c==="equivalence"||c==="negation"||c==="implication"||c==="support"||c==="conflict")){let h={instancePath:e+"/relation/logical",schemaPath:"#/$defs/line/relation/properties/logical/enum",keyword:"enum",params:{allowedValues:jt.properties.logical.enum},message:"must be equal to one of the allowed values"};t===null?t=[h]:t.push(h),n++}}if(o.temporal!==void 0){let c=o.temporal;if(typeof c!="string"){let h={instancePath:e+"/relation/temporal",schemaPath:"#/$defs/line/relation/properties/temporal/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(!(c==="precedence"||c==="succession")){let h={instancePath:e+"/relation/temporal",schemaPath:"#/$defs/line/relation/properties/temporal/enum",keyword:"enum",params:{allowedValues:jt.properties.temporal.enum},message:"must be equal to one of the allowed values"};t===null?t=[h]:t.push(h),n++}}if(o.meta!==void 0){let c=o.meta;if(typeof c!="string"){let h={instancePath:e+"/relation/meta",schemaPath:"#/$defs/line/relation/properties/meta/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(c!=="reference"){let h={instancePath:e+"/relation/meta",schemaPath:"#/$defs/line/relation/properties/meta/enum",keyword:"enum",params:{allowedValues:jt.properties.meta.enum},message:"must be equal to one of the allowed values"};t===null?t=[h]:t.push(h),n++}}}else{let c={instancePath:e+"/relation",schemaPath:"#/$defs/line/relation/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[c]:t.push(c),n++}}if(s.sense!==void 0){let o=s.sense;if(typeof o!="string"){let c={instancePath:e+"/sense",schemaPath:"#/properties/sense/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[c]:t.push(c),n++}if(!(o==="a_to_b"||o==="b_to_a"||o==="bidirectional"||o==="neutral")){let c={instancePath:e+"/sense",schemaPath:"#/properties/sense/enum",keyword:"enum",params:{allowedValues:Ul.properties.sense.enum},message:"must be equal to one of the allowed values"};t===null?t=[c]:t.push(c),n++}}if(s.caption!==void 0){let o=s.caption,c=n,h=!1,f=null,m=n;if(typeof o!="string"){let y={instancePath:e+"/caption",schemaPath:"#/$defs/labels/localized_string/oneOf/0/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[y]:t.push(y),n++}var r=m===n;r&&(h=!0,f=0);let g=n;if(o&&typeof o=="object"&&!Array.isArray(o)){for(let y in o)if(!(y==="ja"||y==="en")){let p={instancePath:e+"/caption",schemaPath:"#/$defs/labels/localized_string/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:y},message:"must NOT have additional properties"};t===null?t=[p]:t.push(p),n++}if(o.ja!==void 0&&typeof o.ja!="string"){let y={instancePath:e+"/caption/ja",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/ja/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[y]:t.push(y),n++}if(o.en!==void 0&&typeof o.en!="string"){let y={instancePath:e+"/caption/en",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/en/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[y]:t.push(y),n++}}else{let y={instancePath:e+"/caption",schemaPath:"#/$defs/labels/localized_string/oneOf/1/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[y]:t.push(y),n++}var r=g===n;if(r&&h?(h=!1,f=[f,1]):r&&(h=!0,f=1),h)n=c,t!==null&&(c?t.length=c:t=null);else{let y={instancePath:e+"/caption",schemaPath:"#/$defs/labels/localized_string/oneOf",keyword:"oneOf",params:{passingSchemas:f},message:"must match exactly one schema in oneOf"};t===null?t=[y]:t.push(y),n++}}}else{let o={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[o]:t.push(o),n++}return rt.errors=t,n===0}rt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var An={type:"object",properties:{end_a:{$ref:"#/$defs/line/endpoint"},end_b:{$ref:"#/$defs/line/endpoint"},line_type:{type:"string",enum:["straight","polyline","catmullrom","bezier","arc"],default:"straight"},geometry:{$ref:"#/$defs/geometry/line_geometry"},line_style:{type:"string",enum:["solid","dashed","dotted","double","none"],default:"solid"},color:{$ref:"#/$defs/validator/color_hex",default:"#ffffff"},opacity:{type:"number",minimum:0,maximum:1,default:.4},render_order:{type:"number",default:0},arrow:{$ref:"#/$defs/line/arrow"},effect:{$ref:"#/$defs/line/effect"},visible:{type:"boolean"},frames:{$ref:"#/$defs/validator/frames"},caption_text:{$ref:"#/$defs/labels/caption_text_style"}},additionalProperties:!1,allOf:[{if:{properties:{line_type:{enum:["polyline","catmullrom","bezier","arc"]}},required:["line_type"]},then:{properties:{geometry:{}},required:["geometry"]}}]},Ts={type:"object",properties:{primitive:{type:"string",enum:["none","line","cone","pyramid"]},length:{type:"number",minimum:1e-4},thickness:{type:"number",minimum:1e-4},radius:{type:"number",minimum:1e-4},height:{type:"number",minimum:1e-4},base:{type:"array",items:{type:"number",minimum:1e-4},minItems:2,maxItems:2},placement:{type:"string",enum:["end_a","end_b","both","none"],default:"end_b"},auto_orient:{type:"boolean",default:!0}},required:["primitive"],additionalProperties:!1,allOf:[{if:{properties:{primitive:{const:"line"}}},then:{properties:{length:{},thickness:{}},required:["length","thickness"]}},{if:{properties:{primitive:{const:"cone"}}},then:{properties:{radius:{},height:{}},required:["radius","height"]}},{if:{properties:{primitive:{const:"pyramid"}}},then:{properties:{base:{},height:{}},required:["base","height"]}}]},Es={type:"object",properties:{effect_type:{type:"string",enum:["none","pulse","flow","glow"],default:"none"},amplitude:{type:"number",minimum:0,default:1},speed:{type:"number",minimum:0,default:1},duration:{type:"number",minimum:0,default:1},loop:{type:"boolean",default:!0},phase:{type:"number",minimum:0,maximum:1,default:0},easing:{type:"string",enum:["linear","ease-in","ease-out","ease-in-out"],default:"linear"},width:{type:"number",default:1}},additionalProperties:!1},Ii=Object.prototype.hasOwnProperty,Di=new RegExp("^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$","u");function Le(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Le.evaluated;d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0);let r=n,o=!1,c=null,h=n;if(s&&typeof s=="object"&&!Array.isArray(s)){if(s.ref===void 0){let y={instancePath:e,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty:"ref"},message:"must have required property 'ref'"};t===null?t=[y]:t.push(y),n++}for(let y in s)if(y!=="ref"){let p={instancePath:e,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:y},message:"must NOT have additional properties"};t===null?t=[p]:t.push(p),n++}if(s.ref!==void 0){let y=s.ref;if(typeof y=="string"){if(!Di.test(y)){let p={instancePath:e+"/ref",schemaPath:"#/$defs/validator/uuid/pattern",keyword:"pattern",params:{pattern:"^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"},message:'must match pattern "^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"'};t===null?t=[p]:t.push(p),n++}}else{let p={instancePath:e+"/ref",schemaPath:"#/$defs/validator/uuid/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}}}else{let y={instancePath:e,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[y]:t.push(y),n++}var g=h===n;if(g){o=!0,c=0;var f=!0}let m=n;if(s&&typeof s=="object"&&!Array.isArray(s)){if(s.coord===void 0){let y={instancePath:e,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty:"coord"},message:"must have required property 'coord'"};t===null?t=[y]:t.push(y),n++}for(let y in s)if(y!=="coord"){let p={instancePath:e,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:y},message:"must NOT have additional properties"};t===null?t=[p]:t.push(p),n++}if(s.coord!==void 0){let y=s.coord;if(Array.isArray(y)){if(y.length>3){let w={instancePath:e+"/coord",schemaPath:"#/$defs/validator/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[w]:t.push(w),n++}if(y.length<3){let w={instancePath:e+"/coord",schemaPath:"#/$defs/validator/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[w]:t.push(w),n++}let p=y.length;for(let w=0;w<p;w++)if(typeof y[w]!="number"){let b={instancePath:e+"/coord/"+w,schemaPath:"#/$defs/validator/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[b]:t.push(b),n++}}else{let p={instancePath:e+"/coord",schemaPath:"#/$defs/validator/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[p]:t.push(p),n++}}}else{let y={instancePath:e,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[y]:t.push(y),n++}var g=m===n;if(g&&o?(o=!1,c=[c,1]):g&&(o=!0,c=1,f!==!0&&(f=!0)),o)n=r,t!==null&&(r?t.length=r:t=null);else{let y={instancePath:e,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas:c},message:"must match exactly one schema in oneOf"};t===null?t=[y]:t.push(y),n++}return Le.errors=t,d.props=f,n===0}Le.evaluated={dynamicProps:!0,dynamicItems:!1};var Ps={type:"object",properties:{dimension:{type:"integer",enum:[2,3]},polyline_points:{type:"array",items:{$ref:"#/$defs/validator/vec3"}},bezier_controls:{type:"array",minItems:1,maxItems:2,items:{$ref:"#/$defs/validator/vec3"}},arc_center:{$ref:"#/$defs/validator/vec3"},arc_radius:{type:"number",minimum:0},arc_angle_start:{type:"number"},arc_angle_end:{type:"number"},arc_clockwise:{type:"boolean"},catmullrom_points:{type:"array",items:{$ref:"#/$defs/validator/vec3"}},catmullrom_tension:{type:"number",minimum:0,maximum:1}},additionalProperties:!1};function at(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=at.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!Ii.call(Ps.properties,r)){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.dimension!==void 0){let r=s.dimension;if(!(typeof r=="number"&&!(r%1)&&!isNaN(r))){let o={instancePath:e+"/dimension",schemaPath:"#/properties/dimension/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[o]:t.push(o),n++}if(!(r===2||r===3)){let o={instancePath:e+"/dimension",schemaPath:"#/properties/dimension/enum",keyword:"enum",params:{allowedValues:Ps.properties.dimension.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.polyline_points!==void 0){let r=s.polyline_points;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++){let h=r[c];if(Array.isArray(h)){if(h.length>3){let m={instancePath:e+"/polyline_points/"+c,schemaPath:"#/$defs/validator/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[m]:t.push(m),n++}if(h.length<3){let m={instancePath:e+"/polyline_points/"+c,schemaPath:"#/$defs/validator/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[m]:t.push(m),n++}let f=h.length;for(let m=0;m<f;m++)if(typeof h[m]!="number"){let g={instancePath:e+"/polyline_points/"+c+"/"+m,schemaPath:"#/$defs/validator/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[g]:t.push(g),n++}}else{let f={instancePath:e+"/polyline_points/"+c,schemaPath:"#/$defs/validator/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[f]:t.push(f),n++}}}else{let o={instancePath:e+"/polyline_points",schemaPath:"#/properties/polyline_points/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.bezier_controls!==void 0){let r=s.bezier_controls;if(Array.isArray(r)){if(r.length>2){let c={instancePath:e+"/bezier_controls",schemaPath:"#/properties/bezier_controls/maxItems",keyword:"maxItems",params:{limit:2},message:"must NOT have more than 2 items"};t===null?t=[c]:t.push(c),n++}if(r.length<1){let c={instancePath:e+"/bezier_controls",schemaPath:"#/properties/bezier_controls/minItems",keyword:"minItems",params:{limit:1},message:"must NOT have fewer than 1 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++){let h=r[c];if(Array.isArray(h)){if(h.length>3){let m={instancePath:e+"/bezier_controls/"+c,schemaPath:"#/$defs/validator/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[m]:t.push(m),n++}if(h.length<3){let m={instancePath:e+"/bezier_controls/"+c,schemaPath:"#/$defs/validator/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[m]:t.push(m),n++}let f=h.length;for(let m=0;m<f;m++)if(typeof h[m]!="number"){let g={instancePath:e+"/bezier_controls/"+c+"/"+m,schemaPath:"#/$defs/validator/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[g]:t.push(g),n++}}else{let f={instancePath:e+"/bezier_controls/"+c,schemaPath:"#/$defs/validator/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[f]:t.push(f),n++}}}else{let o={instancePath:e+"/bezier_controls",schemaPath:"#/properties/bezier_controls/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.arc_center!==void 0){let r=s.arc_center;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/arc_center",schemaPath:"#/$defs/validator/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/arc_center",schemaPath:"#/$defs/validator/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/arc_center/"+c,schemaPath:"#/$defs/validator/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/arc_center",schemaPath:"#/$defs/validator/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.arc_radius!==void 0){let r=s.arc_radius;if(typeof r=="number"){if(r<0||isNaN(r)){let o={instancePath:e+"/arc_radius",schemaPath:"#/properties/arc_radius/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/arc_radius",schemaPath:"#/properties/arc_radius/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}if(s.arc_angle_start!==void 0&&typeof s.arc_angle_start!="number"){let r={instancePath:e+"/arc_angle_start",schemaPath:"#/properties/arc_angle_start/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[r]:t.push(r),n++}if(s.arc_angle_end!==void 0&&typeof s.arc_angle_end!="number"){let r={instancePath:e+"/arc_angle_end",schemaPath:"#/properties/arc_angle_end/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[r]:t.push(r),n++}if(s.arc_clockwise!==void 0&&typeof s.arc_clockwise!="boolean"){let r={instancePath:e+"/arc_clockwise",schemaPath:"#/properties/arc_clockwise/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[r]:t.push(r),n++}if(s.catmullrom_points!==void 0){let r=s.catmullrom_points;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++){let h=r[c];if(Array.isArray(h)){if(h.length>3){let m={instancePath:e+"/catmullrom_points/"+c,schemaPath:"#/$defs/validator/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[m]:t.push(m),n++}if(h.length<3){let m={instancePath:e+"/catmullrom_points/"+c,schemaPath:"#/$defs/validator/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[m]:t.push(m),n++}let f=h.length;for(let m=0;m<f;m++)if(typeof h[m]!="number"){let g={instancePath:e+"/catmullrom_points/"+c+"/"+m,schemaPath:"#/$defs/validator/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[g]:t.push(g),n++}}else{let f={instancePath:e+"/catmullrom_points/"+c,schemaPath:"#/$defs/validator/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[f]:t.push(f),n++}}}else{let o={instancePath:e+"/catmullrom_points",schemaPath:"#/properties/catmullrom_points/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.catmullrom_tension!==void 0){let r=s.catmullrom_tension;if(typeof r=="number"){if(r>1||isNaN(r)){let o={instancePath:e+"/catmullrom_tension",schemaPath:"#/properties/catmullrom_tension/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[o]:t.push(o),n++}if(r<0||isNaN(r)){let o={instancePath:e+"/catmullrom_tension",schemaPath:"#/properties/catmullrom_tension/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/catmullrom_tension",schemaPath:"#/properties/catmullrom_tension/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return at.errors=t,n===0}at.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Li={type:"number",enum:[.125,.25,.5,1,2,4,8,16,32,64,128,256],default:8,description:"Authored relative text scope size. A shared 2^n step from 0.125 through 256. Not CSS pixels, quantity, or absolute importance."},Tn={type:"string",enum:["horizontal-tb","vertical-rl"],default:"horizontal-tb",description:"Local text layout, separate from fixed front/up pose. Horizontal glyph progression is +right; vertical is -up and successive columns progress -right, where right=up cross front. This does not infer time or causal direction."},En={type:"integer",enum:[400,700],description:"When present, overrides a weight encoded in a legacy font string. When absent, preserve supported legacy font weight semantics; otherwise normal 400. Validation never rewrites the original font string."};function ue(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=ue.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.front===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"front"},message:"must have required property 'front'"};t===null?t=[r]:t.push(r),n++}if(s.up===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"up"},message:"must have required property 'up'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="front"||r==="up")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.front!==void 0){let r=s.front;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/front",schemaPath:"#/$defs/spatial/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/front",schemaPath:"#/$defs/spatial/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/front/"+c,schemaPath:"#/$defs/spatial/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/front",schemaPath:"#/$defs/spatial/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.up!==void 0){let r=s.up;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/up",schemaPath:"#/$defs/spatial/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/up",schemaPath:"#/$defs/spatial/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/up/"+c,schemaPath:"#/$defs/spatial/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/up",schemaPath:"#/$defs/spatial/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return ue.errors=t,n===0}ue.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Lt=bs().default,Oe=new RegExp("^#(?:[0-9a-fA-F]{3}){1,2}$","u");function ot(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=ot.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="font_size"||r==="pose"||r==="writing_mode"||r==="font"||r==="font_weight"||r==="color")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.font_size!==void 0){let r=s.font_size;if(typeof r!="number"){let o={instancePath:e+"/font_size",schemaPath:"#/$defs/labels/scope_size/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}if(!(r===.125||r===.25||r===.5||r===1||r===2||r===4||r===8||r===16||r===32||r===64||r===128||r===256)){let o={instancePath:e+"/font_size",schemaPath:"#/$defs/labels/scope_size/enum",keyword:"enum",params:{allowedValues:Li.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.pose!==void 0&&(ue(s.pose,{instancePath:e+"/pose",parentData:s,parentDataProperty:"pose",rootData:l,dynamicAnchors:u})||(t=t===null?ue.errors:t.concat(ue.errors),n=t.length)),s.writing_mode!==void 0){let r=s.writing_mode;if(typeof r!="string"){let o={instancePath:e+"/writing_mode",schemaPath:"#/$defs/labels/writing_mode/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}if(!(r==="horizontal-tb"||r==="vertical-rl")){let o={instancePath:e+"/writing_mode",schemaPath:"#/$defs/labels/writing_mode/enum",keyword:"enum",params:{allowedValues:Tn.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.font!==void 0){let r=s.font;if(typeof r=="string"){if(Lt(r)<1){let o={instancePath:e+"/font",schemaPath:"#/properties/font/minLength",keyword:"minLength",params:{limit:1},message:"must NOT have fewer than 1 characters"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/font",schemaPath:"#/properties/font/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.font_weight!==void 0){let r=s.font_weight;if(!(typeof r=="number"&&!(r%1)&&!isNaN(r))){let o={instancePath:e+"/font_weight",schemaPath:"#/$defs/labels/font_weight/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[o]:t.push(o),n++}if(!(r===400||r===700)){let o={instancePath:e+"/font_weight",schemaPath:"#/$defs/labels/font_weight/enum",keyword:"enum",params:{allowedValues:En.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.color!==void 0){let r=s.color;if(typeof r=="string"){if(!Oe.test(r)){let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return ot.errors=t,n===0}ot.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function lt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=lt.evaluated;d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0);let r=n,o=!0,c=n;if(s&&typeof s=="object"&&!Array.isArray(s)){let x;if(s.line_type===void 0&&(x="line_type")){let _={};t===null?t=[_]:t.push(_),n++}else if(s.line_type!==void 0){let _=s.line_type;if(!(_==="polyline"||_==="catmullrom"||_==="bezier"||_==="arc")){let M={};t===null?t=[M]:t.push(M),n++}}}var h=c===n;if(n=r,t!==null&&(r?t.length=r:t=null),h){let x=n;if(s&&typeof s=="object"&&!Array.isArray(s)&&s.geometry===void 0){let M={instancePath:e,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty:"geometry"},message:"must have required property 'geometry'"};t===null?t=[M]:t.push(M),n++}var h=x===n;if(o=h,o){var f={};f.geometry=!0,f.line_type=!0}}if(!o){let x={instancePath:e,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[x]:t.push(x),n++}if(s&&typeof s=="object"&&!Array.isArray(s)){for(let x in s)if(!Ii.call(An.properties,x)){let _={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:x},message:"must NOT have additional properties"};t===null?t=[_]:t.push(_),n++}if(s.end_a!==void 0&&(Le(s.end_a,{instancePath:e+"/end_a",parentData:s,parentDataProperty:"end_a",rootData:l,dynamicAnchors:u})||(t=t===null?Le.errors:t.concat(Le.errors),n=t.length)),s.end_b!==void 0&&(Le(s.end_b,{instancePath:e+"/end_b",parentData:s,parentDataProperty:"end_b",rootData:l,dynamicAnchors:u})||(t=t===null?Le.errors:t.concat(Le.errors),n=t.length)),s.line_type!==void 0){let x=s.line_type;if(typeof x!="string"){let _={instancePath:e+"/line_type",schemaPath:"#/properties/line_type/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[_]:t.push(_),n++}if(!(x==="straight"||x==="polyline"||x==="catmullrom"||x==="bezier"||x==="arc")){let _={instancePath:e+"/line_type",schemaPath:"#/properties/line_type/enum",keyword:"enum",params:{allowedValues:An.properties.line_type.enum},message:"must be equal to one of the allowed values"};t===null?t=[_]:t.push(_),n++}}if(s.geometry!==void 0&&(at(s.geometry,{instancePath:e+"/geometry",parentData:s,parentDataProperty:"geometry",rootData:l,dynamicAnchors:u})||(t=t===null?at.errors:t.concat(at.errors),n=t.length)),s.line_style!==void 0){let x=s.line_style;if(typeof x!="string"){let _={instancePath:e+"/line_style",schemaPath:"#/properties/line_style/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[_]:t.push(_),n++}if(!(x==="solid"||x==="dashed"||x==="dotted"||x==="double"||x==="none")){let _={instancePath:e+"/line_style",schemaPath:"#/properties/line_style/enum",keyword:"enum",params:{allowedValues:An.properties.line_style.enum},message:"must be equal to one of the allowed values"};t===null?t=[_]:t.push(_),n++}}if(s.color!==void 0){let x=s.color;if(typeof x=="string"){if(!Oe.test(x)){let _={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[_]:t.push(_),n++}}else{let _={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[_]:t.push(_),n++}}if(s.opacity!==void 0){let x=s.opacity;if(typeof x=="number"){if(x>1||isNaN(x)){let _={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[_]:t.push(_),n++}if(x<0||isNaN(x)){let _={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[_]:t.push(_),n++}}else{let _={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[_]:t.push(_),n++}}if(s.render_order!==void 0&&typeof s.render_order!="number"){let x={instancePath:e+"/render_order",schemaPath:"#/properties/render_order/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[x]:t.push(x),n++}if(s.arrow!==void 0){let x=s.arrow,_=n,M=!0,B=n;if(x&&typeof x=="object"&&!Array.isArray(x)&&x.primitive!==void 0&&x.primitive!=="line"){let S={};t===null?t=[S]:t.push(S),n++}var m=B===n;if(n=_,t!==null&&(_?t.length=_:t=null),m){let S=n;if(x&&typeof x=="object"&&!Array.isArray(x)){if(x.length===void 0){let F={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/0/then/required",keyword:"required",params:{missingProperty:"length"},message:"must have required property 'length'"};t===null?t=[F]:t.push(F),n++}if(x.thickness===void 0){let F={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/0/then/required",keyword:"required",params:{missingProperty:"thickness"},message:"must have required property 'thickness'"};t===null?t=[F]:t.push(F),n++}}var m=S===n;if(M=m,M){var g={};g.length=!0,g.thickness=!0,g.primitive=!0}}if(!M){let S={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/0/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[S]:t.push(S),n++}let A=n,P=!0,C=n;if(x&&typeof x=="object"&&!Array.isArray(x)&&x.primitive!==void 0&&x.primitive!=="cone"){let S={};t===null?t=[S]:t.push(S),n++}var y=C===n;if(n=A,t!==null&&(A?t.length=A:t=null),y){let S=n;if(x&&typeof x=="object"&&!Array.isArray(x)){if(x.radius===void 0){let F={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/1/then/required",keyword:"required",params:{missingProperty:"radius"},message:"must have required property 'radius'"};t===null?t=[F]:t.push(F),n++}if(x.height===void 0){let F={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/1/then/required",keyword:"required",params:{missingProperty:"height"},message:"must have required property 'height'"};t===null?t=[F]:t.push(F),n++}}var y=S===n;if(P=y,P){var p={};p.radius=!0,p.height=!0,p.primitive=!0}}if(!P){let S={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/1/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[S]:t.push(S),n++}g!==!0&&p!==void 0&&(p===!0?g=!0:(g=g||{},Object.assign(g,p)));let L=n,G=!0,k=n;if(x&&typeof x=="object"&&!Array.isArray(x)&&x.primitive!==void 0&&x.primitive!=="pyramid"){let S={};t===null?t=[S]:t.push(S),n++}var w=k===n;if(n=L,t!==null&&(L?t.length=L:t=null),w){let S=n;if(x&&typeof x=="object"&&!Array.isArray(x)){if(x.base===void 0){let F={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/2/then/required",keyword:"required",params:{missingProperty:"base"},message:"must have required property 'base'"};t===null?t=[F]:t.push(F),n++}if(x.height===void 0){let F={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/2/then/required",keyword:"required",params:{missingProperty:"height"},message:"must have required property 'height'"};t===null?t=[F]:t.push(F),n++}}var w=S===n;if(G=w,G){var b={};b.base=!0,b.height=!0,b.primitive=!0}}if(!G){let S={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/allOf/2/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[S]:t.push(S),n++}if(g!==!0&&b!==void 0&&(b===!0?g=!0:(g=g||{},Object.assign(g,b))),x&&typeof x=="object"&&!Array.isArray(x)){if(x.primitive===void 0){let S={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/required",keyword:"required",params:{missingProperty:"primitive"},message:"must have required property 'primitive'"};t===null?t=[S]:t.push(S),n++}for(let S in x)if(!(S==="primitive"||S==="length"||S==="thickness"||S==="radius"||S==="height"||S==="base"||S==="placement"||S==="auto_orient")){let I={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:S},message:"must NOT have additional properties"};t===null?t=[I]:t.push(I),n++}if(x.primitive!==void 0){let S=x.primitive;if(typeof S!="string"){let I={instancePath:e+"/arrow/primitive",schemaPath:"#/$defs/line/arrow/properties/primitive/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[I]:t.push(I),n++}if(!(S==="none"||S==="line"||S==="cone"||S==="pyramid")){let I={instancePath:e+"/arrow/primitive",schemaPath:"#/$defs/line/arrow/properties/primitive/enum",keyword:"enum",params:{allowedValues:Ts.properties.primitive.enum},message:"must be equal to one of the allowed values"};t===null?t=[I]:t.push(I),n++}}if(x.length!==void 0){let S=x.length;if(typeof S=="number"){if(S<1e-4||isNaN(S)){let I={instancePath:e+"/arrow/length",schemaPath:"#/$defs/line/arrow/properties/length/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[I]:t.push(I),n++}}else{let I={instancePath:e+"/arrow/length",schemaPath:"#/$defs/line/arrow/properties/length/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[I]:t.push(I),n++}}if(x.thickness!==void 0){let S=x.thickness;if(typeof S=="number"){if(S<1e-4||isNaN(S)){let I={instancePath:e+"/arrow/thickness",schemaPath:"#/$defs/line/arrow/properties/thickness/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[I]:t.push(I),n++}}else{let I={instancePath:e+"/arrow/thickness",schemaPath:"#/$defs/line/arrow/properties/thickness/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[I]:t.push(I),n++}}if(x.radius!==void 0){let S=x.radius;if(typeof S=="number"){if(S<1e-4||isNaN(S)){let I={instancePath:e+"/arrow/radius",schemaPath:"#/$defs/line/arrow/properties/radius/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[I]:t.push(I),n++}}else{let I={instancePath:e+"/arrow/radius",schemaPath:"#/$defs/line/arrow/properties/radius/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[I]:t.push(I),n++}}if(x.height!==void 0){let S=x.height;if(typeof S=="number"){if(S<1e-4||isNaN(S)){let I={instancePath:e+"/arrow/height",schemaPath:"#/$defs/line/arrow/properties/height/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[I]:t.push(I),n++}}else{let I={instancePath:e+"/arrow/height",schemaPath:"#/$defs/line/arrow/properties/height/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[I]:t.push(I),n++}}if(x.base!==void 0){let S=x.base;if(Array.isArray(S)){if(S.length>2){let F={instancePath:e+"/arrow/base",schemaPath:"#/$defs/line/arrow/properties/base/maxItems",keyword:"maxItems",params:{limit:2},message:"must NOT have more than 2 items"};t===null?t=[F]:t.push(F),n++}if(S.length<2){let F={instancePath:e+"/arrow/base",schemaPath:"#/$defs/line/arrow/properties/base/minItems",keyword:"minItems",params:{limit:2},message:"must NOT have fewer than 2 items"};t===null?t=[F]:t.push(F),n++}let I=S.length;for(let F=0;F<I;F++){let E=S[F];if(typeof E=="number"){if(E<1e-4||isNaN(E)){let T={instancePath:e+"/arrow/base/"+F,schemaPath:"#/$defs/line/arrow/properties/base/items/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[T]:t.push(T),n++}}else{let T={instancePath:e+"/arrow/base/"+F,schemaPath:"#/$defs/line/arrow/properties/base/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[T]:t.push(T),n++}}}else{let I={instancePath:e+"/arrow/base",schemaPath:"#/$defs/line/arrow/properties/base/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[I]:t.push(I),n++}}if(x.placement!==void 0){let S=x.placement;if(typeof S!="string"){let I={instancePath:e+"/arrow/placement",schemaPath:"#/$defs/line/arrow/properties/placement/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[I]:t.push(I),n++}if(!(S==="end_a"||S==="end_b"||S==="both"||S==="none")){let I={instancePath:e+"/arrow/placement",schemaPath:"#/$defs/line/arrow/properties/placement/enum",keyword:"enum",params:{allowedValues:Ts.properties.placement.enum},message:"must be equal to one of the allowed values"};t===null?t=[I]:t.push(I),n++}}if(x.auto_orient!==void 0&&typeof x.auto_orient!="boolean"){let S={instancePath:e+"/arrow/auto_orient",schemaPath:"#/$defs/line/arrow/properties/auto_orient/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[S]:t.push(S),n++}}else{let S={instancePath:e+"/arrow",schemaPath:"#/$defs/line/arrow/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[S]:t.push(S),n++}}if(s.effect!==void 0){let x=s.effect;if(x&&typeof x=="object"&&!Array.isArray(x)){for(let _ in x)if(!(_==="effect_type"||_==="amplitude"||_==="speed"||_==="duration"||_==="loop"||_==="phase"||_==="easing"||_==="width")){let M={instancePath:e+"/effect",schemaPath:"#/$defs/line/effect/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:_},message:"must NOT have additional properties"};t===null?t=[M]:t.push(M),n++}if(x.effect_type!==void 0){let _=x.effect_type;if(typeof _!="string"){let M={instancePath:e+"/effect/effect_type",schemaPath:"#/$defs/line/effect/properties/effect_type/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[M]:t.push(M),n++}if(!(_==="none"||_==="pulse"||_==="flow"||_==="glow")){let M={instancePath:e+"/effect/effect_type",schemaPath:"#/$defs/line/effect/properties/effect_type/enum",keyword:"enum",params:{allowedValues:Es.properties.effect_type.enum},message:"must be equal to one of the allowed values"};t===null?t=[M]:t.push(M),n++}}if(x.amplitude!==void 0){let _=x.amplitude;if(typeof _=="number"){if(_<0||isNaN(_)){let M={instancePath:e+"/effect/amplitude",schemaPath:"#/$defs/line/effect/properties/amplitude/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[M]:t.push(M),n++}}else{let M={instancePath:e+"/effect/amplitude",schemaPath:"#/$defs/line/effect/properties/amplitude/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[M]:t.push(M),n++}}if(x.speed!==void 0){let _=x.speed;if(typeof _=="number"){if(_<0||isNaN(_)){let M={instancePath:e+"/effect/speed",schemaPath:"#/$defs/line/effect/properties/speed/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[M]:t.push(M),n++}}else{let M={instancePath:e+"/effect/speed",schemaPath:"#/$defs/line/effect/properties/speed/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[M]:t.push(M),n++}}if(x.duration!==void 0){let _=x.duration;if(typeof _=="number"){if(_<0||isNaN(_)){let M={instancePath:e+"/effect/duration",schemaPath:"#/$defs/line/effect/properties/duration/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[M]:t.push(M),n++}}else{let M={instancePath:e+"/effect/duration",schemaPath:"#/$defs/line/effect/properties/duration/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[M]:t.push(M),n++}}if(x.loop!==void 0&&typeof x.loop!="boolean"){let _={instancePath:e+"/effect/loop",schemaPath:"#/$defs/line/effect/properties/loop/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[_]:t.push(_),n++}if(x.phase!==void 0){let _=x.phase;if(typeof _=="number"){if(_>1||isNaN(_)){let M={instancePath:e+"/effect/phase",schemaPath:"#/$defs/line/effect/properties/phase/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[M]:t.push(M),n++}if(_<0||isNaN(_)){let M={instancePath:e+"/effect/phase",schemaPath:"#/$defs/line/effect/properties/phase/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[M]:t.push(M),n++}}else{let M={instancePath:e+"/effect/phase",schemaPath:"#/$defs/line/effect/properties/phase/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[M]:t.push(M),n++}}if(x.easing!==void 0){let _=x.easing;if(typeof _!="string"){let M={instancePath:e+"/effect/easing",schemaPath:"#/$defs/line/effect/properties/easing/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[M]:t.push(M),n++}if(!(_==="linear"||_==="ease-in"||_==="ease-out"||_==="ease-in-out")){let M={instancePath:e+"/effect/easing",schemaPath:"#/$defs/line/effect/properties/easing/enum",keyword:"enum",params:{allowedValues:Es.properties.easing.enum},message:"must be equal to one of the allowed values"};t===null?t=[M]:t.push(M),n++}}if(x.width!==void 0&&typeof x.width!="number"){let _={instancePath:e+"/effect/width",schemaPath:"#/$defs/line/effect/properties/width/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[_]:t.push(_),n++}}else{let _={instancePath:e+"/effect",schemaPath:"#/$defs/line/effect/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[_]:t.push(_),n++}}if(s.visible!==void 0&&typeof s.visible!="boolean"){let x={instancePath:e+"/visible",schemaPath:"#/properties/visible/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[x]:t.push(x),n++}if(s.frames!==void 0){let x=s.frames,_=n,M=!1,B=null,A=n;if(!(typeof x=="number"&&!(x%1)&&!isNaN(x))){let C={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[C]:t.push(C),n++}if(typeof x=="number"){if(x>9999||isNaN(x)){let C={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/maximum",keyword:"maximum",params:{comparison:"<=",limit:9999},message:"must be <= 9999"};t===null?t=[C]:t.push(C),n++}if(x<-9999||isNaN(x)){let C={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/minimum",keyword:"minimum",params:{comparison:">=",limit:-9999},message:"must be >= -9999"};t===null?t=[C]:t.push(C),n++}}var v=A===n;v&&(M=!0,B=0);let P=n;if(Array.isArray(x)){if(x.length>256){let k={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/maxItems",keyword:"maxItems",params:{limit:256},message:"must NOT have more than 256 items"};t===null?t=[k]:t.push(k),n++}if(x.length<1){let k={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/minItems",keyword:"minItems",params:{limit:1},message:"must NOT have fewer than 1 items"};t===null?t=[k]:t.push(k),n++}let C=x.length;for(let k=0;k<C;k++){let S=x[k];if(!(typeof S=="number"&&!(S%1)&&!isNaN(S))){let I={instancePath:e+"/frames/"+k,schemaPath:"#/$defs/validator/frames/oneOf/1/items/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[I]:t.push(I),n++}if(typeof S=="number"){if(S>9999||isNaN(S)){let I={instancePath:e+"/frames/"+k,schemaPath:"#/$defs/validator/frames/oneOf/1/items/maximum",keyword:"maximum",params:{comparison:"<=",limit:9999},message:"must be <= 9999"};t===null?t=[I]:t.push(I),n++}if(S<-9999||isNaN(S)){let I={instancePath:e+"/frames/"+k,schemaPath:"#/$defs/validator/frames/oneOf/1/items/minimum",keyword:"minimum",params:{comparison:">=",limit:-9999},message:"must be >= -9999"};t===null?t=[I]:t.push(I),n++}}}let L=x.length,G;if(L>1){let k={};for(;L--;){let S=x[L];if(typeof S=="number"&&!(S%1)&&!isNaN(S)){if(typeof k[S]=="number"){G=k[S];let I={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/uniqueItems",keyword:"uniqueItems",params:{i:L,j:G},message:"must NOT have duplicate items (items ## "+G+" and "+L+" are identical)"};t===null?t=[I]:t.push(I),n++;break}k[S]=L}}}}else{let C={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[C]:t.push(C),n++}var v=P===n;if(v&&M?(M=!1,B=[B,1]):v&&(M=!0,B=1),M)n=_,t!==null&&(_?t.length=_:t=null);else{let C={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf",keyword:"oneOf",params:{passingSchemas:B},message:"must match exactly one schema in oneOf"};t===null?t=[C]:t.push(C),n++}}s.caption_text!==void 0&&(ot(s.caption_text,{instancePath:e+"/caption_text",parentData:s,parentDataProperty:"caption_text",rootData:l,dynamicAnchors:u})||(t=t===null?ot.errors:t.concat(ot.errors),n=t.length))}else{let x={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[x]:t.push(x),n++}return lt.errors=t,n===0}lt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Pn=new RegExp("^(s|m|x):[^\\s:]+$","u"),Is=new RegExp("^[a-z][a-z0-9_-]{0,63}$","u"),Fl=As().default;function ct(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=ct.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),Array.isArray(s)){let r=s.length;for(let h=0;h<r;h++){let f=s[h];if(typeof f=="string"){if(!Is.test(f)){let m={instancePath:e+"/"+h,schemaPath:"#/$defs/visual_legend/id/pattern",keyword:"pattern",params:{pattern:"^[a-z][a-z0-9_-]{0,63}$"},message:'must match pattern "^[a-z][a-z0-9_-]{0,63}$"'};t===null?t=[m]:t.push(m),n++}}else{let m={instancePath:e+"/"+h,schemaPath:"#/$defs/visual_legend/id/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[m]:t.push(m),n++}}let o=s.length,c;if(o>1){e:for(;o--;)for(c=o;c--;)if(Fl(s[o],s[c])){let h={instancePath:e,schemaPath:"#/uniqueItems",keyword:"uniqueItems",params:{i:o,j:c},message:"must NOT have duplicate items (items ## "+c+" and "+o+" are identical)"};t===null?t=[h]:t.push(h),n++;break e}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[r]:t.push(r),n++}return ct.errors=t,n===0}ct.evaluated={items:!0,dynamicProps:!1,dynamicItems:!1};function Ne(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Ne.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.uuid===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"uuid"},message:"must have required property 'uuid'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="uuid"||r==="tags"||r==="creator_memo"||r==="legend_refs")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.uuid!==void 0){let r=s.uuid;if(typeof r=="string"){if(!Di.test(r)){let o={instancePath:e+"/uuid",schemaPath:"#/$defs/validator/uuid/pattern",keyword:"pattern",params:{pattern:"^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"},message:'must match pattern "^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/uuid",schemaPath:"#/$defs/validator/uuid/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.tags!==void 0){let r=s.tags;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++){let h=r[c];if(typeof h=="string"){if(!Pn.test(h)){let f={instancePath:e+"/tags/"+c,schemaPath:"#/$defs/validator/tag/pattern",keyword:"pattern",params:{pattern:"^(s|m|x):[^\\s:]+$"},message:'must match pattern "^(s|m|x):[^\\s:]+$"'};t===null?t=[f]:t.push(f),n++}}else{let f={instancePath:e+"/tags/"+c,schemaPath:"#/$defs/validator/tag/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[f]:t.push(f),n++}}}else{let o={instancePath:e+"/tags",schemaPath:"#/properties/tags/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.creator_memo!==void 0&&typeof s.creator_memo!="string"){let r={instancePath:e+"/creator_memo",schemaPath:"#/properties/creator_memo/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[r]:t.push(r),n++}s.legend_refs!==void 0&&(ct(s.legend_refs,{instancePath:e+"/legend_refs",parentData:s,parentDataProperty:"legend_refs",rootData:l,dynamicAnchors:u})||(t=t===null?ct.errors:t.concat(ct.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return Ne.errors=t,n===0}Ne.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function ut(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=ut.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.appearance===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"appearance"},message:"must have required property 'appearance'"};t===null?t=[r]:t.push(r),n++}if(s.meta===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"meta"},message:"must have required property 'meta'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="signification"||r==="appearance"||r==="meta")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}s.signification!==void 0&&(rt(s.signification,{instancePath:e+"/signification",parentData:s,parentDataProperty:"signification",rootData:l,dynamicAnchors:u})||(t=t===null?rt.errors:t.concat(rt.errors),n=t.length)),s.appearance!==void 0&&(lt(s.appearance,{instancePath:e+"/appearance",parentData:s,parentDataProperty:"appearance",rootData:l,dynamicAnchors:u})||(t=t===null?lt.errors:t.concat(lt.errors),n=t.length)),s.meta!==void 0&&(Ne(s.meta,{instancePath:e+"/meta",parentData:s,parentDataProperty:"meta",rootData:l,dynamicAnchors:u})||(t=t===null?Ne.errors:t.concat(Ne.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return ut.errors=t,n===0}ut.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function ht(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=ht.evaluated;d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0);let r=n,o=!1,c=null,h=n;if(typeof s!="string"){let y={instancePath:e,schemaPath:"#/$defs/labels/localized_string/oneOf/0/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[y]:t.push(y),n++}var m=h===n;m&&(o=!0,c=0);let f=n;if(s&&typeof s=="object"&&!Array.isArray(s)){for(let y in s)if(!(y==="ja"||y==="en")){let p={instancePath:e,schemaPath:"#/$defs/labels/localized_string/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:y},message:"must NOT have additional properties"};t===null?t=[p]:t.push(p),n++}if(s.ja!==void 0&&typeof s.ja!="string"){let y={instancePath:e+"/ja",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/ja/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[y]:t.push(y),n++}if(s.en!==void 0&&typeof s.en!="string"){let y={instancePath:e+"/en",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/en/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[y]:t.push(y),n++}}else{let y={instancePath:e,schemaPath:"#/$defs/labels/localized_string/oneOf/1/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[y]:t.push(y),n++}var m=f===n;if(m&&o)o=!1,c=[c,1];else if(m){o=!0,c=1;var g=!0}if(o)n=r,t!==null&&(r?t.length=r:t=null);else{let y={instancePath:e,schemaPath:"#/$defs/labels/localized_string/oneOf",keyword:"oneOf",params:{passingSchemas:c},message:"must match exactly one schema in oneOf"};t===null?t=[y]:t.push(y),n++}return ht.errors=t,d.props=g,n===0}ht.evaluated={dynamicProps:!0,dynamicItems:!1};function dt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=dt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(r!=="name"){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}s.name!==void 0&&(ht(s.name,{instancePath:e+"/name",parentData:s,parentDataProperty:"name",rootData:l,dynamicAnchors:u})||(t=t===null?ht.errors:t.concat(ht.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return dt.errors=t,n===0}dt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Cs={type:"object",properties:{common:{$ref:"#/$defs/point/marker_common"},primitive:{type:"string",enum:["sphere","box","cone","pyramid","corona","none"]},radius:{type:"number",minimum:1e-4},size:{type:"array",items:{type:"number",minimum:1e-4},minItems:3,maxItems:3},height:{type:"number",minimum:1e-4},base:{type:"array",items:{type:"number",minimum:1e-4},minItems:2,maxItems:2},inner_radius:{type:"number",minimum:1e-4},outer_radius:{type:"number",minimum:1e-4},gltf:{$ref:"#/$defs/point/marker_gltf"},text:{$ref:"#/$defs/point/marker_text"}},required:["primitive"],additionalProperties:!1,allOf:[{if:{properties:{primitive:{const:"sphere"}},required:["primitive"]},then:{properties:{radius:{}},required:["radius"]}},{if:{properties:{primitive:{const:"box"}},required:["primitive"]},then:{properties:{size:{}},required:["size"]}},{if:{properties:{primitive:{const:"cone"}},required:["primitive"]},then:{properties:{radius:{},height:{}},required:["radius","height"]}},{if:{properties:{primitive:{const:"pyramid"}},required:["primitive"]},then:{properties:{base:{},height:{}},required:["base","height"]}},{if:{properties:{primitive:{const:"corona"}},required:["primitive"]},then:{properties:{inner_radius:{},outer_radius:{}},required:["inner_radius","outer_radius"]}}]};function ft(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=ft.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="orientation"||r==="scale"||r==="color"||r==="opacity"||r==="emissive"||r==="wireframe")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.orientation!==void 0){let r=s.orientation;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/orientation",schemaPath:"#/$defs/spatial/orientation/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/orientation",schemaPath:"#/$defs/spatial/orientation/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/orientation/"+c,schemaPath:"#/$defs/spatial/orientation/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/orientation",schemaPath:"#/$defs/spatial/orientation/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.scale!==void 0){let r=s.scale;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/scale",schemaPath:"#/$defs/spatial/scale/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/scale",schemaPath:"#/$defs/spatial/scale/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/scale/"+c,schemaPath:"#/$defs/spatial/scale/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/scale",schemaPath:"#/$defs/spatial/scale/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.color!==void 0){let r=s.color;if(typeof r=="string"){if(!Oe.test(r)){let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.opacity!==void 0){let r=s.opacity;if(typeof r=="number"){if(r>1||isNaN(r)){let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[o]:t.push(o),n++}if(r<0||isNaN(r)){let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}if(s.emissive!==void 0&&typeof s.emissive!="boolean"){let r={instancePath:e+"/emissive",schemaPath:"#/properties/emissive/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[r]:t.push(r),n++}if(s.wireframe!==void 0&&typeof s.wireframe!="boolean"){let r={instancePath:e+"/wireframe",schemaPath:"#/properties/wireframe/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[r]:t.push(r),n++}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return ft.errors=t,n===0}ft.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function pt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=pt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="url"||r==="scale"||r==="rotation"||r==="offset")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.url!==void 0&&typeof s.url!="string"){let r={instancePath:e+"/url",schemaPath:"#/properties/url/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[r]:t.push(r),n++}if(s.scale!==void 0){let r=s.scale;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/scale",schemaPath:"#/$defs/spatial/scale/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/scale",schemaPath:"#/$defs/spatial/scale/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/scale/"+c,schemaPath:"#/$defs/spatial/scale/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/scale",schemaPath:"#/$defs/spatial/scale/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.rotation!==void 0){let r=s.rotation;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/rotation",schemaPath:"#/$defs/spatial/rotation/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/rotation",schemaPath:"#/$defs/spatial/rotation/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/rotation/"+c,schemaPath:"#/$defs/spatial/rotation/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/rotation",schemaPath:"#/$defs/spatial/rotation/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.offset!==void 0){let r=s.offset;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/offset",schemaPath:"#/$defs/spatial/offset/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/offset",schemaPath:"#/$defs/spatial/offset/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/offset/"+c,schemaPath:"#/$defs/spatial/offset/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/offset",schemaPath:"#/$defs/spatial/offset/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return pt.errors=t,n===0}pt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var kl={type:"object",properties:{content:{type:"string",default:""},font:{type:"string",minLength:1,default:"helvetiker_regular",description:"Preserved author font token or existing font string. Candidate does not infer semantic roles from this name."},size:{$ref:"#/$defs/labels/scope_size"},align:{type:"string",enum:["left&top","left&middle","left&baseline","center&top","center&middle","center&baseline","right&top","right&middle","right&baseline"],default:"center&middle"},pose:{$ref:"#/$defs/text_pose",default:{front:[0,1,0],up:[0,0,1]}},writing_mode:{$ref:"#/$defs/labels/writing_mode"},font_weight:{$ref:"#/$defs/labels/font_weight"},color:{$ref:"#/$defs/validator/color_hex",default:"#ffffff",description:"Text color only; independent of marker or line geometry color."}},additionalProperties:!1,required:["content","pose"]};function mt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=mt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.content===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"content"},message:"must have required property 'content'"};t===null?t=[r]:t.push(r),n++}if(s.pose===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"pose"},message:"must have required property 'pose'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="content"||r==="font"||r==="size"||r==="align"||r==="pose"||r==="writing_mode"||r==="font_weight"||r==="color")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.content!==void 0&&typeof s.content!="string"){let r={instancePath:e+"/content",schemaPath:"#/properties/content/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[r]:t.push(r),n++}if(s.font!==void 0){let r=s.font;if(typeof r=="string"){if(Lt(r)<1){let o={instancePath:e+"/font",schemaPath:"#/properties/font/minLength",keyword:"minLength",params:{limit:1},message:"must NOT have fewer than 1 characters"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/font",schemaPath:"#/properties/font/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.size!==void 0){let r=s.size;if(typeof r!="number"){let o={instancePath:e+"/size",schemaPath:"#/$defs/labels/scope_size/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}if(!(r===.125||r===.25||r===.5||r===1||r===2||r===4||r===8||r===16||r===32||r===64||r===128||r===256)){let o={instancePath:e+"/size",schemaPath:"#/$defs/labels/scope_size/enum",keyword:"enum",params:{allowedValues:Li.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.align!==void 0){let r=s.align;if(typeof r!="string"){let o={instancePath:e+"/align",schemaPath:"#/properties/align/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}if(!(r==="left&top"||r==="left&middle"||r==="left&baseline"||r==="center&top"||r==="center&middle"||r==="center&baseline"||r==="right&top"||r==="right&middle"||r==="right&baseline")){let o={instancePath:e+"/align",schemaPath:"#/properties/align/enum",keyword:"enum",params:{allowedValues:kl.properties.align.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.pose!==void 0&&(ue(s.pose,{instancePath:e+"/pose",parentData:s,parentDataProperty:"pose",rootData:l,dynamicAnchors:u})||(t=t===null?ue.errors:t.concat(ue.errors),n=t.length)),s.writing_mode!==void 0){let r=s.writing_mode;if(typeof r!="string"){let o={instancePath:e+"/writing_mode",schemaPath:"#/$defs/labels/writing_mode/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}if(!(r==="horizontal-tb"||r==="vertical-rl")){let o={instancePath:e+"/writing_mode",schemaPath:"#/$defs/labels/writing_mode/enum",keyword:"enum",params:{allowedValues:Tn.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.font_weight!==void 0){let r=s.font_weight;if(!(typeof r=="number"&&!(r%1)&&!isNaN(r))){let o={instancePath:e+"/font_weight",schemaPath:"#/$defs/labels/font_weight/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[o]:t.push(o),n++}if(!(r===400||r===700)){let o={instancePath:e+"/font_weight",schemaPath:"#/$defs/labels/font_weight/enum",keyword:"enum",params:{allowedValues:En.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.color!==void 0){let r=s.color;if(typeof r=="string"){if(!Oe.test(r)){let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return mt.errors=t,n===0}mt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function gt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=gt.evaluated;d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0);let r=n,o=!0,c=n;if(s&&typeof s=="object"&&!Array.isArray(s)){let E;if(s.primitive===void 0&&(E="primitive")){let T={};t===null?t=[T]:t.push(T),n++}else if(s.primitive!==void 0&&s.primitive!=="sphere"){let T={};t===null?t=[T]:t.push(T),n++}}var h=c===n;if(n=r,t!==null&&(r?t.length=r:t=null),h){let E=n;if(s&&typeof s=="object"&&!Array.isArray(s)&&s.radius===void 0){let O={instancePath:e,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty:"radius"},message:"must have required property 'radius'"};t===null?t=[O]:t.push(O),n++}var h=E===n;if(o=h,o){var f={};f.radius=!0,f.primitive=!0}}if(!o){let E={instancePath:e,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[E]:t.push(E),n++}let m=n,g=!0,y=n;if(s&&typeof s=="object"&&!Array.isArray(s)){let E;if(s.primitive===void 0&&(E="primitive")){let T={};t===null?t=[T]:t.push(T),n++}else if(s.primitive!==void 0&&s.primitive!=="box"){let T={};t===null?t=[T]:t.push(T),n++}}var p=y===n;if(n=m,t!==null&&(m?t.length=m:t=null),p){let E=n;if(s&&typeof s=="object"&&!Array.isArray(s)&&s.size===void 0){let O={instancePath:e,schemaPath:"#/allOf/1/then/required",keyword:"required",params:{missingProperty:"size"},message:"must have required property 'size'"};t===null?t=[O]:t.push(O),n++}var p=E===n;if(g=p,g){var w={};w.size=!0,w.primitive=!0}}if(!g){let E={instancePath:e,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[E]:t.push(E),n++}f!==!0&&w!==void 0&&(w===!0?f=!0:(f=f||{},Object.assign(f,w)));let b=n,v=!0,x=n;if(s&&typeof s=="object"&&!Array.isArray(s)){let E;if(s.primitive===void 0&&(E="primitive")){let T={};t===null?t=[T]:t.push(T),n++}else if(s.primitive!==void 0&&s.primitive!=="cone"){let T={};t===null?t=[T]:t.push(T),n++}}var _=x===n;if(n=b,t!==null&&(b?t.length=b:t=null),_){let E=n;if(s&&typeof s=="object"&&!Array.isArray(s)){if(s.radius===void 0){let O={instancePath:e,schemaPath:"#/allOf/2/then/required",keyword:"required",params:{missingProperty:"radius"},message:"must have required property 'radius'"};t===null?t=[O]:t.push(O),n++}if(s.height===void 0){let O={instancePath:e,schemaPath:"#/allOf/2/then/required",keyword:"required",params:{missingProperty:"height"},message:"must have required property 'height'"};t===null?t=[O]:t.push(O),n++}}var _=E===n;if(v=_,v){var M={};M.radius=!0,M.height=!0,M.primitive=!0}}if(!v){let E={instancePath:e,schemaPath:"#/allOf/2/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[E]:t.push(E),n++}f!==!0&&M!==void 0&&(M===!0?f=!0:(f=f||{},Object.assign(f,M)));let B=n,A=!0,P=n;if(s&&typeof s=="object"&&!Array.isArray(s)){let E;if(s.primitive===void 0&&(E="primitive")){let T={};t===null?t=[T]:t.push(T),n++}else if(s.primitive!==void 0&&s.primitive!=="pyramid"){let T={};t===null?t=[T]:t.push(T),n++}}var C=P===n;if(n=B,t!==null&&(B?t.length=B:t=null),C){let E=n;if(s&&typeof s=="object"&&!Array.isArray(s)){if(s.base===void 0){let O={instancePath:e,schemaPath:"#/allOf/3/then/required",keyword:"required",params:{missingProperty:"base"},message:"must have required property 'base'"};t===null?t=[O]:t.push(O),n++}if(s.height===void 0){let O={instancePath:e,schemaPath:"#/allOf/3/then/required",keyword:"required",params:{missingProperty:"height"},message:"must have required property 'height'"};t===null?t=[O]:t.push(O),n++}}var C=E===n;if(A=C,A){var L={};L.base=!0,L.height=!0,L.primitive=!0}}if(!A){let E={instancePath:e,schemaPath:"#/allOf/3/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[E]:t.push(E),n++}f!==!0&&L!==void 0&&(L===!0?f=!0:(f=f||{},Object.assign(f,L)));let G=n,k=!0,S=n;if(s&&typeof s=="object"&&!Array.isArray(s)){let E;if(s.primitive===void 0&&(E="primitive")){let T={};t===null?t=[T]:t.push(T),n++}else if(s.primitive!==void 0&&s.primitive!=="corona"){let T={};t===null?t=[T]:t.push(T),n++}}var I=S===n;if(n=G,t!==null&&(G?t.length=G:t=null),I){let E=n;if(s&&typeof s=="object"&&!Array.isArray(s)){if(s.inner_radius===void 0){let O={instancePath:e,schemaPath:"#/allOf/4/then/required",keyword:"required",params:{missingProperty:"inner_radius"},message:"must have required property 'inner_radius'"};t===null?t=[O]:t.push(O),n++}if(s.outer_radius===void 0){let O={instancePath:e,schemaPath:"#/allOf/4/then/required",keyword:"required",params:{missingProperty:"outer_radius"},message:"must have required property 'outer_radius'"};t===null?t=[O]:t.push(O),n++}}var I=E===n;if(k=I,k){var F={};F.inner_radius=!0,F.outer_radius=!0,F.primitive=!0}}if(!k){let E={instancePath:e,schemaPath:"#/allOf/4/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[E]:t.push(E),n++}if(f!==!0&&F!==void 0&&(F===!0?f=!0:(f=f||{},Object.assign(f,F))),s&&typeof s=="object"&&!Array.isArray(s)){if(s.primitive===void 0){let E={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"primitive"},message:"must have required property 'primitive'"};t===null?t=[E]:t.push(E),n++}for(let E in s)if(!Ii.call(Cs.properties,E)){let T={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:E},message:"must NOT have additional properties"};t===null?t=[T]:t.push(T),n++}if(s.common!==void 0&&(ft(s.common,{instancePath:e+"/common",parentData:s,parentDataProperty:"common",rootData:l,dynamicAnchors:u})||(t=t===null?ft.errors:t.concat(ft.errors),n=t.length)),s.primitive!==void 0){let E=s.primitive;if(typeof E!="string"){let T={instancePath:e+"/primitive",schemaPath:"#/properties/primitive/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[T]:t.push(T),n++}if(!(E==="sphere"||E==="box"||E==="cone"||E==="pyramid"||E==="corona"||E==="none")){let T={instancePath:e+"/primitive",schemaPath:"#/properties/primitive/enum",keyword:"enum",params:{allowedValues:Cs.properties.primitive.enum},message:"must be equal to one of the allowed values"};t===null?t=[T]:t.push(T),n++}}if(s.radius!==void 0){let E=s.radius;if(typeof E=="number"){if(E<1e-4||isNaN(E)){let T={instancePath:e+"/radius",schemaPath:"#/properties/radius/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[T]:t.push(T),n++}}else{let T={instancePath:e+"/radius",schemaPath:"#/properties/radius/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[T]:t.push(T),n++}}if(s.size!==void 0){let E=s.size;if(Array.isArray(E)){if(E.length>3){let O={instancePath:e+"/size",schemaPath:"#/properties/size/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[O]:t.push(O),n++}if(E.length<3){let O={instancePath:e+"/size",schemaPath:"#/properties/size/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[O]:t.push(O),n++}let T=E.length;for(let O=0;O<T;O++){let le=E[O];if(typeof le=="number"){if(le<1e-4||isNaN(le)){let he={instancePath:e+"/size/"+O,schemaPath:"#/properties/size/items/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[he]:t.push(he),n++}}else{let he={instancePath:e+"/size/"+O,schemaPath:"#/properties/size/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[he]:t.push(he),n++}}}else{let T={instancePath:e+"/size",schemaPath:"#/properties/size/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[T]:t.push(T),n++}}if(s.height!==void 0){let E=s.height;if(typeof E=="number"){if(E<1e-4||isNaN(E)){let T={instancePath:e+"/height",schemaPath:"#/properties/height/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[T]:t.push(T),n++}}else{let T={instancePath:e+"/height",schemaPath:"#/properties/height/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[T]:t.push(T),n++}}if(s.base!==void 0){let E=s.base;if(Array.isArray(E)){if(E.length>2){let O={instancePath:e+"/base",schemaPath:"#/properties/base/maxItems",keyword:"maxItems",params:{limit:2},message:"must NOT have more than 2 items"};t===null?t=[O]:t.push(O),n++}if(E.length<2){let O={instancePath:e+"/base",schemaPath:"#/properties/base/minItems",keyword:"minItems",params:{limit:2},message:"must NOT have fewer than 2 items"};t===null?t=[O]:t.push(O),n++}let T=E.length;for(let O=0;O<T;O++){let le=E[O];if(typeof le=="number"){if(le<1e-4||isNaN(le)){let he={instancePath:e+"/base/"+O,schemaPath:"#/properties/base/items/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[he]:t.push(he),n++}}else{let he={instancePath:e+"/base/"+O,schemaPath:"#/properties/base/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[he]:t.push(he),n++}}}else{let T={instancePath:e+"/base",schemaPath:"#/properties/base/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[T]:t.push(T),n++}}if(s.inner_radius!==void 0){let E=s.inner_radius;if(typeof E=="number"){if(E<1e-4||isNaN(E)){let T={instancePath:e+"/inner_radius",schemaPath:"#/properties/inner_radius/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[T]:t.push(T),n++}}else{let T={instancePath:e+"/inner_radius",schemaPath:"#/properties/inner_radius/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[T]:t.push(T),n++}}if(s.outer_radius!==void 0){let E=s.outer_radius;if(typeof E=="number"){if(E<1e-4||isNaN(E)){let T={instancePath:e+"/outer_radius",schemaPath:"#/properties/outer_radius/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[T]:t.push(T),n++}}else{let T={instancePath:e+"/outer_radius",schemaPath:"#/properties/outer_radius/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[T]:t.push(T),n++}}s.gltf!==void 0&&(pt(s.gltf,{instancePath:e+"/gltf",parentData:s,parentDataProperty:"gltf",rootData:l,dynamicAnchors:u})||(t=t===null?pt.errors:t.concat(pt.errors),n=t.length)),s.text!==void 0&&(mt(s.text,{instancePath:e+"/text",parentData:s,parentDataProperty:"text",rootData:l,dynamicAnchors:u})||(t=t===null?mt.errors:t.concat(mt.errors),n=t.length))}else{let E={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[E]:t.push(E),n++}return gt.errors=t,n===0}gt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function yt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=yt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.position===void 0){let o={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"position"},message:"must have required property 'position'"};t===null?t=[o]:t.push(o),n++}for(let o in s)if(!(o==="position"||o==="marker"||o==="visible"||o==="frames")){let c={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:o},message:"must NOT have additional properties"};t===null?t=[c]:t.push(c),n++}if(s.position!==void 0){let o=s.position;if(Array.isArray(o)){if(o.length>3){let h={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[h]:t.push(h),n++}if(o.length<3){let h={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[h]:t.push(h),n++}let c=o.length;for(let h=0;h<c;h++)if(typeof o[h]!="number"){let f={instancePath:e+"/position/"+h,schemaPath:"#/$defs/spatial/position/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[f]:t.push(f),n++}}else{let c={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[c]:t.push(c),n++}}if(s.marker!==void 0&&(gt(s.marker,{instancePath:e+"/marker",parentData:s,parentDataProperty:"marker",rootData:l,dynamicAnchors:u})||(t=t===null?gt.errors:t.concat(gt.errors),n=t.length)),s.visible!==void 0&&typeof s.visible!="boolean"){let o={instancePath:e+"/visible",schemaPath:"#/properties/visible/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[o]:t.push(o),n++}if(s.frames!==void 0){let o=s.frames,c=n,h=!1,f=null,m=n;if(!(typeof o=="number"&&!(o%1)&&!isNaN(o))){let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[y]:t.push(y),n++}if(typeof o=="number"){if(o>9999||isNaN(o)){let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/maximum",keyword:"maximum",params:{comparison:"<=",limit:9999},message:"must be <= 9999"};t===null?t=[y]:t.push(y),n++}if(o<-9999||isNaN(o)){let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/minimum",keyword:"minimum",params:{comparison:">=",limit:-9999},message:"must be >= -9999"};t===null?t=[y]:t.push(y),n++}}var r=m===n;r&&(h=!0,f=0);let g=n;if(Array.isArray(o)){if(o.length>256){let b={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/maxItems",keyword:"maxItems",params:{limit:256},message:"must NOT have more than 256 items"};t===null?t=[b]:t.push(b),n++}if(o.length<1){let b={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/minItems",keyword:"minItems",params:{limit:1},message:"must NOT have fewer than 1 items"};t===null?t=[b]:t.push(b),n++}let y=o.length;for(let b=0;b<y;b++){let v=o[b];if(!(typeof v=="number"&&!(v%1)&&!isNaN(v))){let x={instancePath:e+"/frames/"+b,schemaPath:"#/$defs/validator/frames/oneOf/1/items/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[x]:t.push(x),n++}if(typeof v=="number"){if(v>9999||isNaN(v)){let x={instancePath:e+"/frames/"+b,schemaPath:"#/$defs/validator/frames/oneOf/1/items/maximum",keyword:"maximum",params:{comparison:"<=",limit:9999},message:"must be <= 9999"};t===null?t=[x]:t.push(x),n++}if(v<-9999||isNaN(v)){let x={instancePath:e+"/frames/"+b,schemaPath:"#/$defs/validator/frames/oneOf/1/items/minimum",keyword:"minimum",params:{comparison:">=",limit:-9999},message:"must be >= -9999"};t===null?t=[x]:t.push(x),n++}}}let p=o.length,w;if(p>1){let b={};for(;p--;){let v=o[p];if(typeof v=="number"&&!(v%1)&&!isNaN(v)){if(typeof b[v]=="number"){w=b[v];let x={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/uniqueItems",keyword:"uniqueItems",params:{i:p,j:w},message:"must NOT have duplicate items (items ## "+w+" and "+p+" are identical)"};t===null?t=[x]:t.push(x),n++;break}b[v]=p}}}}else{let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[y]:t.push(y),n++}var r=g===n;if(r&&h?(h=!1,f=[f,1]):r&&(h=!0,f=1),h)n=c,t!==null&&(c?t.length=c:t=null);else{let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf",keyword:"oneOf",params:{passingSchemas:f},message:"must match exactly one schema in oneOf"};t===null?t=[y]:t.push(y),n++}}}else{let o={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[o]:t.push(o),n++}return yt.errors=t,n===0}yt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function xt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=xt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.appearance===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"appearance"},message:"must have required property 'appearance'"};t===null?t=[r]:t.push(r),n++}if(s.meta===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"meta"},message:"must have required property 'meta'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="signification"||r==="appearance"||r==="meta")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}s.signification!==void 0&&(dt(s.signification,{instancePath:e+"/signification",parentData:s,parentDataProperty:"signification",rootData:l,dynamicAnchors:u})||(t=t===null?dt.errors:t.concat(dt.errors),n=t.length)),s.appearance!==void 0&&(yt(s.appearance,{instancePath:e+"/appearance",parentData:s,parentDataProperty:"appearance",rootData:l,dynamicAnchors:u})||(t=t===null?yt.errors:t.concat(yt.errors),n=t.length)),s.meta!==void 0&&(Ne(s.meta,{instancePath:e+"/meta",parentData:s,parentDataProperty:"meta",rootData:l,dynamicAnchors:u})||(t=t===null?Ne.errors:t.concat(Ne.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return xt.errors=t,n===0}xt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Bl={type:"object",properties:{grid_type:{type:"string",enum:["cartesian","polar"],default:"cartesian"},subdivisions:{type:"integer",default:8},major_step:{type:"number",default:4},minor_step:{type:"number",default:1},color_major:{$ref:"#/$defs/validator/color_hex",default:"#666666"},color_minor:{$ref:"#/$defs/validator/color_hex",default:"#333333"}},additionalProperties:!1};function _t(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=_t.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="grid_type"||r==="subdivisions"||r==="major_step"||r==="minor_step"||r==="color_major"||r==="color_minor")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.grid_type!==void 0){let r=s.grid_type;if(typeof r!="string"){let o={instancePath:e+"/grid_type",schemaPath:"#/properties/grid_type/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}if(!(r==="cartesian"||r==="polar")){let o={instancePath:e+"/grid_type",schemaPath:"#/properties/grid_type/enum",keyword:"enum",params:{allowedValues:Bl.properties.grid_type.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.subdivisions!==void 0){let r=s.subdivisions;if(!(typeof r=="number"&&!(r%1)&&!isNaN(r))){let o={instancePath:e+"/subdivisions",schemaPath:"#/properties/subdivisions/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[o]:t.push(o),n++}}if(s.major_step!==void 0&&typeof s.major_step!="number"){let r={instancePath:e+"/major_step",schemaPath:"#/properties/major_step/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[r]:t.push(r),n++}if(s.minor_step!==void 0&&typeof s.minor_step!="number"){let r={instancePath:e+"/minor_step",schemaPath:"#/properties/minor_step/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[r]:t.push(r),n++}if(s.color_major!==void 0){let r=s.color_major;if(typeof r=="string"){if(!Oe.test(r)){let o={instancePath:e+"/color_major",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/color_major",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.color_minor!==void 0){let r=s.color_minor;if(typeof r=="string"){if(!Oe.test(r)){let o={instancePath:e+"/color_minor",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/color_minor",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return _t.errors=t,n===0}_t.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var zl={type:"object",properties:{primitive:{type:"string",enum:["none","line","cone","pyramid"]},length:{type:"number",minimum:1e-4},thickness:{type:"number",minimum:1e-4},radius:{type:"number",minimum:1e-4},height:{type:"number",minimum:1e-4},base:{type:"array",items:{type:"number",minimum:1e-4},minItems:2,maxItems:2}},required:["primitive"],additionalProperties:!1,allOf:[{if:{properties:{primitive:{const:"line"}},required:["primitive"]},then:{properties:{length:{},thickness:{}},required:["length","thickness"]}},{if:{properties:{primitive:{const:"cone"}},required:["primitive"]},then:{properties:{radius:{},height:{}},required:["radius","height"]}},{if:{properties:{primitive:{const:"pyramid"}},required:["primitive"]},then:{properties:{base:{},height:{}},required:["base","height"]}}]};function vt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=vt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let g in s)if(!(g==="length"||g==="labels"||g==="arrow")){let y={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:g},message:"must NOT have additional properties"};t===null?t=[y]:t.push(y),n++}if(s.length!==void 0&&typeof s.length!="number"){let g={instancePath:e+"/length",schemaPath:"#/properties/length/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[g]:t.push(g),n++}if(s.labels!==void 0&&typeof s.labels!="boolean"){let g={instancePath:e+"/labels",schemaPath:"#/properties/labels/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[g]:t.push(g),n++}if(s.arrow!==void 0){let g=s.arrow,y=n,p=!0,w=n;if(g&&typeof g=="object"&&!Array.isArray(g)){let A;if(g.primitive===void 0&&(A="primitive")){let P={};t===null?t=[P]:t.push(P),n++}else if(g.primitive!==void 0&&g.primitive!=="line"){let P={};t===null?t=[P]:t.push(P),n++}}var r=w===n;if(n=y,t!==null&&(y?t.length=y:t=null),r){let A=n;if(g&&typeof g=="object"&&!Array.isArray(g)){if(g.length===void 0){let C={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/0/then/required",keyword:"required",params:{missingProperty:"length"},message:"must have required property 'length'"};t===null?t=[C]:t.push(C),n++}if(g.thickness===void 0){let C={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/0/then/required",keyword:"required",params:{missingProperty:"thickness"},message:"must have required property 'thickness'"};t===null?t=[C]:t.push(C),n++}}var r=A===n;if(p=r,p){var o={};o.length=!0,o.thickness=!0,o.primitive=!0}}if(!p){let A={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/0/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[A]:t.push(A),n++}let b=n,v=!0,x=n;if(g&&typeof g=="object"&&!Array.isArray(g)){let A;if(g.primitive===void 0&&(A="primitive")){let P={};t===null?t=[P]:t.push(P),n++}else if(g.primitive!==void 0&&g.primitive!=="cone"){let P={};t===null?t=[P]:t.push(P),n++}}var c=x===n;if(n=b,t!==null&&(b?t.length=b:t=null),c){let A=n;if(g&&typeof g=="object"&&!Array.isArray(g)){if(g.radius===void 0){let C={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/1/then/required",keyword:"required",params:{missingProperty:"radius"},message:"must have required property 'radius'"};t===null?t=[C]:t.push(C),n++}if(g.height===void 0){let C={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/1/then/required",keyword:"required",params:{missingProperty:"height"},message:"must have required property 'height'"};t===null?t=[C]:t.push(C),n++}}var c=A===n;if(v=c,v){var h={};h.radius=!0,h.height=!0,h.primitive=!0}}if(!v){let A={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/1/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[A]:t.push(A),n++}o!==!0&&h!==void 0&&(h===!0?o=!0:(o=o||{},Object.assign(o,h)));let _=n,M=!0,B=n;if(g&&typeof g=="object"&&!Array.isArray(g)){let A;if(g.primitive===void 0&&(A="primitive")){let P={};t===null?t=[P]:t.push(P),n++}else if(g.primitive!==void 0&&g.primitive!=="pyramid"){let P={};t===null?t=[P]:t.push(P),n++}}var f=B===n;if(n=_,t!==null&&(_?t.length=_:t=null),f){let A=n;if(g&&typeof g=="object"&&!Array.isArray(g)){if(g.base===void 0){let C={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/2/then/required",keyword:"required",params:{missingProperty:"base"},message:"must have required property 'base'"};t===null?t=[C]:t.push(C),n++}if(g.height===void 0){let C={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/2/then/required",keyword:"required",params:{missingProperty:"height"},message:"must have required property 'height'"};t===null?t=[C]:t.push(C),n++}}var f=A===n;if(M=f,M){var m={};m.base=!0,m.height=!0,m.primitive=!0}}if(!M){let A={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/allOf/2/if",keyword:"if",params:{failingKeyword:"then"},message:'must match "then" schema'};t===null?t=[A]:t.push(A),n++}if(o!==!0&&m!==void 0&&(m===!0?o=!0:(o=o||{},Object.assign(o,m))),g&&typeof g=="object"&&!Array.isArray(g)){if(g.primitive===void 0){let A={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/required",keyword:"required",params:{missingProperty:"primitive"},message:"must have required property 'primitive'"};t===null?t=[A]:t.push(A),n++}for(let A in g)if(!(A==="primitive"||A==="length"||A==="thickness"||A==="radius"||A==="height"||A==="base")){let P={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:A},message:"must NOT have additional properties"};t===null?t=[P]:t.push(P),n++}if(g.primitive!==void 0){let A=g.primitive;if(typeof A!="string"){let P={instancePath:e+"/arrow/primitive",schemaPath:"#/$defs/aux/module_axis_arrow/properties/primitive/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[P]:t.push(P),n++}if(!(A==="none"||A==="line"||A==="cone"||A==="pyramid")){let P={instancePath:e+"/arrow/primitive",schemaPath:"#/$defs/aux/module_axis_arrow/properties/primitive/enum",keyword:"enum",params:{allowedValues:zl.properties.primitive.enum},message:"must be equal to one of the allowed values"};t===null?t=[P]:t.push(P),n++}}if(g.length!==void 0){let A=g.length;if(typeof A=="number"){if(A<1e-4||isNaN(A)){let P={instancePath:e+"/arrow/length",schemaPath:"#/$defs/aux/module_axis_arrow/properties/length/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[P]:t.push(P),n++}}else{let P={instancePath:e+"/arrow/length",schemaPath:"#/$defs/aux/module_axis_arrow/properties/length/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[P]:t.push(P),n++}}if(g.thickness!==void 0){let A=g.thickness;if(typeof A=="number"){if(A<1e-4||isNaN(A)){let P={instancePath:e+"/arrow/thickness",schemaPath:"#/$defs/aux/module_axis_arrow/properties/thickness/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[P]:t.push(P),n++}}else{let P={instancePath:e+"/arrow/thickness",schemaPath:"#/$defs/aux/module_axis_arrow/properties/thickness/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[P]:t.push(P),n++}}if(g.radius!==void 0){let A=g.radius;if(typeof A=="number"){if(A<1e-4||isNaN(A)){let P={instancePath:e+"/arrow/radius",schemaPath:"#/$defs/aux/module_axis_arrow/properties/radius/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[P]:t.push(P),n++}}else{let P={instancePath:e+"/arrow/radius",schemaPath:"#/$defs/aux/module_axis_arrow/properties/radius/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[P]:t.push(P),n++}}if(g.height!==void 0){let A=g.height;if(typeof A=="number"){if(A<1e-4||isNaN(A)){let P={instancePath:e+"/arrow/height",schemaPath:"#/$defs/aux/module_axis_arrow/properties/height/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[P]:t.push(P),n++}}else{let P={instancePath:e+"/arrow/height",schemaPath:"#/$defs/aux/module_axis_arrow/properties/height/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[P]:t.push(P),n++}}if(g.base!==void 0){let A=g.base;if(Array.isArray(A)){if(A.length>2){let C={instancePath:e+"/arrow/base",schemaPath:"#/$defs/aux/module_axis_arrow/properties/base/maxItems",keyword:"maxItems",params:{limit:2},message:"must NOT have more than 2 items"};t===null?t=[C]:t.push(C),n++}if(A.length<2){let C={instancePath:e+"/arrow/base",schemaPath:"#/$defs/aux/module_axis_arrow/properties/base/minItems",keyword:"minItems",params:{limit:2},message:"must NOT have fewer than 2 items"};t===null?t=[C]:t.push(C),n++}let P=A.length;for(let C=0;C<P;C++){let L=A[C];if(typeof L=="number"){if(L<1e-4||isNaN(L)){let G={instancePath:e+"/arrow/base/"+C,schemaPath:"#/$defs/aux/module_axis_arrow/properties/base/items/minimum",keyword:"minimum",params:{comparison:">=",limit:1e-4},message:"must be >= 0.0001"};t===null?t=[G]:t.push(G),n++}}else{let G={instancePath:e+"/arrow/base/"+C,schemaPath:"#/$defs/aux/module_axis_arrow/properties/base/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[G]:t.push(G),n++}}}else{let P={instancePath:e+"/arrow/base",schemaPath:"#/$defs/aux/module_axis_arrow/properties/base/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[P]:t.push(P),n++}}}else{let A={instancePath:e+"/arrow",schemaPath:"#/$defs/aux/module_axis_arrow/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[A]:t.push(A),n++}}}else{let g={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[g]:t.push(g),n++}return vt.errors=t,n===0}vt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Vl={type:"object",properties:{plane:{type:"string",enum:["xy","yz","zx"],default:"xy"},position:{$ref:"#/$defs/spatial/position",default:[0,0,0]},size:{type:"array",items:{type:"number"},minItems:2,maxItems:2,default:[32,32]},reflectivity:{type:"number",minimum:0,maximum:1,default:.5},opacity:{type:"number",minimum:0,maximum:1,default:.4}},additionalProperties:!1};function bt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=bt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="plane"||r==="position"||r==="size"||r==="reflectivity"||r==="opacity")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.plane!==void 0){let r=s.plane;if(typeof r!="string"){let o={instancePath:e+"/plane",schemaPath:"#/properties/plane/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}if(!(r==="xy"||r==="yz"||r==="zx")){let o={instancePath:e+"/plane",schemaPath:"#/properties/plane/enum",keyword:"enum",params:{allowedValues:Vl.properties.plane.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.position!==void 0){let r=s.position;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/position/"+c,schemaPath:"#/$defs/spatial/position/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.size!==void 0){let r=s.size;if(Array.isArray(r)){if(r.length>2){let c={instancePath:e+"/size",schemaPath:"#/properties/size/maxItems",keyword:"maxItems",params:{limit:2},message:"must NOT have more than 2 items"};t===null?t=[c]:t.push(c),n++}if(r.length<2){let c={instancePath:e+"/size",schemaPath:"#/properties/size/minItems",keyword:"minItems",params:{limit:2},message:"must NOT have fewer than 2 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/size/"+c,schemaPath:"#/properties/size/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/size",schemaPath:"#/properties/size/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.reflectivity!==void 0){let r=s.reflectivity;if(typeof r=="number"){if(r>1||isNaN(r)){let o={instancePath:e+"/reflectivity",schemaPath:"#/properties/reflectivity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[o]:t.push(o),n++}if(r<0||isNaN(r)){let o={instancePath:e+"/reflectivity",schemaPath:"#/properties/reflectivity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/reflectivity",schemaPath:"#/properties/reflectivity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}if(s.opacity!==void 0){let r=s.opacity;if(typeof r=="number"){if(r>1||isNaN(r)){let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[o]:t.push(o),n++}if(r<0||isNaN(r)){let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return bt.errors=t,n===0}bt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Gl={type:"object",properties:{shell_type:{type:"string",enum:["sphere","box","hemisphere","quarter_sphere","eighth_sphere"],default:"sphere"},opacity:{type:"number",minimum:0,maximum:1,default:.4},reflectivity:{type:"number",minimum:0,maximum:1,default:.5},effect:{$ref:"#/$defs/aux/module_shell_effect"}},additionalProperties:!1};function Mt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Mt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="edge_intensity"||r==="rimlight"||r==="glow_color")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.edge_intensity!==void 0){let r=s.edge_intensity;if(typeof r=="number"){if(r>1||isNaN(r)){let o={instancePath:e+"/edge_intensity",schemaPath:"#/properties/edge_intensity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[o]:t.push(o),n++}if(r<0||isNaN(r)){let o={instancePath:e+"/edge_intensity",schemaPath:"#/properties/edge_intensity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/edge_intensity",schemaPath:"#/properties/edge_intensity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}if(s.rimlight!==void 0&&typeof s.rimlight!="boolean"){let r={instancePath:e+"/rimlight",schemaPath:"#/properties/rimlight/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[r]:t.push(r),n++}if(s.glow_color!==void 0){let r=s.glow_color;if(typeof r=="string"){if(!Oe.test(r)){let o={instancePath:e+"/glow_color",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/glow_color",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return Mt.errors=t,n===0}Mt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function wt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=wt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="shell_type"||r==="opacity"||r==="reflectivity"||r==="effect")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.shell_type!==void 0){let r=s.shell_type;if(typeof r!="string"){let o={instancePath:e+"/shell_type",schemaPath:"#/properties/shell_type/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}if(!(r==="sphere"||r==="box"||r==="hemisphere"||r==="quarter_sphere"||r==="eighth_sphere")){let o={instancePath:e+"/shell_type",schemaPath:"#/properties/shell_type/enum",keyword:"enum",params:{allowedValues:Gl.properties.shell_type.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.opacity!==void 0){let r=s.opacity;if(typeof r=="number"){if(r>1||isNaN(r)){let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[o]:t.push(o),n++}if(r<0||isNaN(r)){let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}if(s.reflectivity!==void 0){let r=s.reflectivity;if(typeof r=="number"){if(r>1||isNaN(r)){let o={instancePath:e+"/reflectivity",schemaPath:"#/properties/reflectivity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[o]:t.push(o),n++}if(r<0||isNaN(r)){let o={instancePath:e+"/reflectivity",schemaPath:"#/properties/reflectivity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/reflectivity",schemaPath:"#/properties/reflectivity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}}s.effect!==void 0&&(Mt(s.effect,{instancePath:e+"/effect",parentData:s,parentDataProperty:"effect",rootData:l,dynamicAnchors:u})||(t=t===null?Mt.errors:t.concat(Mt.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return wt.errors=t,n===0}wt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Hl={type:"object",properties:{content:{type:"string",minLength:1},render_mode:{type:"string",enum:["math","inline","block"]},font_size:{$ref:"#/$defs/labels/scope_size",description:"Outer math text size. Candidate default is 8; legacy renderer default 10 is not changed. Internal math layout such as subscripts is outside this constraint."},color:{$ref:"#/$defs/validator/color_hex"},position:{$ref:"#/$defs/validator/vec3"},pose:{$ref:"#/$defs/text_pose",default:{front:[0,1,0],up:[0,0,1]}}},required:["content","pose"],additionalProperties:!1};function St(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=St.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.content===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"content"},message:"must have required property 'content'"};t===null?t=[r]:t.push(r),n++}if(s.pose===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"pose"},message:"must have required property 'pose'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="content"||r==="render_mode"||r==="font_size"||r==="color"||r==="position"||r==="pose")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.content!==void 0){let r=s.content;if(typeof r=="string"){if(Lt(r)<1){let o={instancePath:e+"/content",schemaPath:"#/properties/content/minLength",keyword:"minLength",params:{limit:1},message:"must NOT have fewer than 1 characters"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/content",schemaPath:"#/properties/content/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.render_mode!==void 0){let r=s.render_mode;if(typeof r!="string"){let o={instancePath:e+"/render_mode",schemaPath:"#/properties/render_mode/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}if(!(r==="math"||r==="inline"||r==="block")){let o={instancePath:e+"/render_mode",schemaPath:"#/properties/render_mode/enum",keyword:"enum",params:{allowedValues:Hl.properties.render_mode.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.font_size!==void 0){let r=s.font_size;if(typeof r!="number"){let o={instancePath:e+"/font_size",schemaPath:"#/$defs/labels/scope_size/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[o]:t.push(o),n++}if(!(r===.125||r===.25||r===.5||r===1||r===2||r===4||r===8||r===16||r===32||r===64||r===128||r===256)){let o={instancePath:e+"/font_size",schemaPath:"#/$defs/labels/scope_size/enum",keyword:"enum",params:{allowedValues:Li.enum},message:"must be equal to one of the allowed values"};t===null?t=[o]:t.push(o),n++}}if(s.color!==void 0){let r=s.color;if(typeof r=="string"){if(!Oe.test(r)){let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/color",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.position!==void 0){let r=s.position;if(Array.isArray(r)){if(r.length>3){let c={instancePath:e+"/position",schemaPath:"#/$defs/validator/vec3/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[c]:t.push(c),n++}if(r.length<3){let c={instancePath:e+"/position",schemaPath:"#/$defs/validator/vec3/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[c]:t.push(c),n++}let o=r.length;for(let c=0;c<o;c++)if(typeof r[c]!="number"){let h={instancePath:e+"/position/"+c,schemaPath:"#/$defs/validator/vec3/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[h]:t.push(h),n++}}else{let o={instancePath:e+"/position",schemaPath:"#/$defs/validator/vec3/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}s.pose!==void 0&&(ue(s.pose,{instancePath:e+"/pose",parentData:s,parentDataProperty:"pose",rootData:l,dynamicAnchors:u})||(t=t===null?ue.errors:t.concat(ue.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return St.errors=t,n===0}St.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Ds=new RegExp("^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$","u"),$l=new RegExp("^[\\w./-]+$","u");function At(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=At.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.type===void 0){let o={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"type"},message:"must have required property 'type'"};t===null?t=[o]:t.push(o),n++}for(let o in s)if(!(o==="type"||o==="version"||o==="params"||o==="bindings"||o==="seed")){let c={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:o},message:"must NOT have additional properties"};t===null?t=[c]:t.push(c),n++}if(s.type!==void 0){let o=s.type;if(typeof o=="string"){if(Lt(o)<1){let c={instancePath:e+"/type",schemaPath:"#/properties/type/minLength",keyword:"minLength",params:{limit:1},message:"must NOT have fewer than 1 characters"};t===null?t=[c]:t.push(c),n++}}else{let c={instancePath:e+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[c]:t.push(c),n++}}if(s.version!==void 0){let o=s.version;if(typeof o=="string"){if(!Ds.test(o)){let c={instancePath:e+"/version",schemaPath:"#/$defs/validator/semver/pattern",keyword:"pattern",params:{pattern:"^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$"},message:'must match pattern "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$"'};t===null?t=[c]:t.push(c),n++}}else{let c={instancePath:e+"/version",schemaPath:"#/$defs/validator/semver/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[c]:t.push(c),n++}}if(s.params!==void 0){let o=s.params;if(o&&typeof o=="object"&&!Array.isArray(o))for(let c in o){let h=o[c],f=n,m=!1,g=n;if(typeof h!="number"){let v={instancePath:e+"/params/"+c.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/params/additionalProperties/anyOf/0/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[v]:t.push(v),n++}var r=g===n;m=m||r;let y=n;if(!(typeof h=="number"&&!(h%1)&&!isNaN(h))){let v={instancePath:e+"/params/"+c.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/params/additionalProperties/anyOf/1/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[v]:t.push(v),n++}var r=y===n;m=m||r;let p=n;if(typeof h!="boolean"){let v={instancePath:e+"/params/"+c.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/params/additionalProperties/anyOf/2/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[v]:t.push(v),n++}var r=p===n;m=m||r;let w=n;if(typeof h!="string"){let v={instancePath:e+"/params/"+c.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/params/additionalProperties/anyOf/3/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[v]:t.push(v),n++}var r=w===n;m=m||r;let b=n;if(Array.isArray(h)){let v=h.length;for(let x=0;x<v;x++)if(typeof h[x]!="number"){let _={instancePath:e+"/params/"+c.replace(/~/g,"~0").replace(/\//g,"~1")+"/"+x,schemaPath:"#/properties/params/additionalProperties/anyOf/4/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[_]:t.push(_),n++}}else{let v={instancePath:e+"/params/"+c.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/params/additionalProperties/anyOf/4/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[v]:t.push(v),n++}var r=b===n;if(m=m||r,m)n=f,t!==null&&(f?t.length=f:t=null);else{let v={instancePath:e+"/params/"+c.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/params/additionalProperties/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};t===null?t=[v]:t.push(v),n++}}else{let c={instancePath:e+"/params",schemaPath:"#/properties/params/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[c]:t.push(c),n++}}if(s.bindings!==void 0){let o=s.bindings;if(Array.isArray(o)){let c=o.length;for(let h=0;h<c;h++){let f=o[h];if(f&&typeof f=="object"&&!Array.isArray(f)){if(f.target===void 0){let m={instancePath:e+"/bindings/"+h,schemaPath:"#/properties/bindings/items/required",keyword:"required",params:{missingProperty:"target"},message:"must have required property 'target'"};t===null?t=[m]:t.push(m),n++}if(f.expression===void 0){let m={instancePath:e+"/bindings/"+h,schemaPath:"#/properties/bindings/items/required",keyword:"required",params:{missingProperty:"expression"},message:"must have required property 'expression'"};t===null?t=[m]:t.push(m),n++}for(let m in f)if(!(m==="target"||m==="expression")){let g={instancePath:e+"/bindings/"+h,schemaPath:"#/properties/bindings/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:m},message:"must NOT have additional properties"};t===null?t=[g]:t.push(g),n++}if(f.target!==void 0){let m=f.target;if(typeof m=="string"){if(!$l.test(m)){let g={instancePath:e+"/bindings/"+h+"/target",schemaPath:"#/$defs/validator/path_ref/pattern",keyword:"pattern",params:{pattern:"^[\\w./-]+$"},message:'must match pattern "^[\\w./-]+$"'};t===null?t=[g]:t.push(g),n++}}else{let g={instancePath:e+"/bindings/"+h+"/target",schemaPath:"#/$defs/validator/path_ref/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[g]:t.push(g),n++}}if(f.expression!==void 0){let m=f.expression;if(typeof m=="string"){if(Lt(m)<1){let g={instancePath:e+"/bindings/"+h+"/expression",schemaPath:"#/properties/bindings/items/properties/expression/minLength",keyword:"minLength",params:{limit:1},message:"must NOT have fewer than 1 characters"};t===null?t=[g]:t.push(g),n++}}else{let g={instancePath:e+"/bindings/"+h+"/expression",schemaPath:"#/properties/bindings/items/properties/expression/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[g]:t.push(g),n++}}}else{let m={instancePath:e+"/bindings/"+h,schemaPath:"#/properties/bindings/items/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[m]:t.push(m),n++}}}else{let c={instancePath:e+"/bindings",schemaPath:"#/properties/bindings/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[c]:t.push(c),n++}}if(s.seed!==void 0){let o=s.seed;if(!(typeof o=="number"&&!(o%1)&&!isNaN(o))){let c={instancePath:e+"/seed",schemaPath:"#/properties/seed/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[c]:t.push(c),n++}}}else{let o={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[o]:t.push(o),n++}return At.errors=t,n===0}At.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function Tt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Tt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="type"||r==="latex"||r==="parametric")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.type!==void 0&&typeof s.type!="string"){let r={instancePath:e+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[r]:t.push(r),n++}s.latex!==void 0&&(St(s.latex,{instancePath:e+"/latex",parentData:s,parentDataProperty:"latex",rootData:l,dynamicAnchors:u})||(t=t===null?St.errors:t.concat(St.errors),n=t.length)),s.parametric!==void 0&&(At(s.parametric,{instancePath:e+"/parametric",parentData:s,parentDataProperty:"parametric",rootData:l,dynamicAnchors:u})||(t=t===null?At.errors:t.concat(At.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return Tt.errors=t,n===0}Tt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function Et(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Et.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let r in s)if(!(r==="grid"||r==="axis"||r==="plate"||r==="shell"||r==="hud"||r==="extension")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.grid!==void 0&&(_t(s.grid,{instancePath:e+"/grid",parentData:s,parentDataProperty:"grid",rootData:l,dynamicAnchors:u})||(t=t===null?_t.errors:t.concat(_t.errors),n=t.length)),s.axis!==void 0&&(vt(s.axis,{instancePath:e+"/axis",parentData:s,parentDataProperty:"axis",rootData:l,dynamicAnchors:u})||(t=t===null?vt.errors:t.concat(vt.errors),n=t.length)),s.plate!==void 0&&(bt(s.plate,{instancePath:e+"/plate",parentData:s,parentDataProperty:"plate",rootData:l,dynamicAnchors:u})||(t=t===null?bt.errors:t.concat(bt.errors),n=t.length)),s.shell!==void 0&&(wt(s.shell,{instancePath:e+"/shell",parentData:s,parentDataProperty:"shell",rootData:l,dynamicAnchors:u})||(t=t===null?wt.errors:t.concat(wt.errors),n=t.length)),s.hud!==void 0){let r=s.hud;if(r&&typeof r=="object"&&!Array.isArray(r)){for(let o in r)if(!(o==="follow_camera"||o==="scale_with_distance")){let c={instancePath:e+"/hud",schemaPath:"#/$defs/aux/module_hud/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:o},message:"must NOT have additional properties"};t===null?t=[c]:t.push(c),n++}if(r.follow_camera!==void 0&&typeof r.follow_camera!="boolean"){let o={instancePath:e+"/hud/follow_camera",schemaPath:"#/$defs/aux/module_hud/properties/follow_camera/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[o]:t.push(o),n++}if(r.scale_with_distance!==void 0&&typeof r.scale_with_distance!="boolean"){let o={instancePath:e+"/hud/scale_with_distance",schemaPath:"#/$defs/aux/module_hud/properties/scale_with_distance/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/hud",schemaPath:"#/$defs/aux/module_hud/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[o]:t.push(o),n++}}s.extension!==void 0&&(Tt(s.extension,{instancePath:e+"/extension",parentData:s,parentDataProperty:"extension",rootData:l,dynamicAnchors:u})||(t=t===null?Tt.errors:t.concat(Tt.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return Et.errors=t,n===0}Et.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function Pt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Pt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){for(let o in s)if(!(o==="position"||o==="orientation"||o==="opacity"||o==="module"||o==="visible"||o==="frames")){let c={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:o},message:"must NOT have additional properties"};t===null?t=[c]:t.push(c),n++}if(s.position!==void 0){let o=s.position;if(Array.isArray(o)){if(o.length>3){let h={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[h]:t.push(h),n++}if(o.length<3){let h={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[h]:t.push(h),n++}let c=o.length;for(let h=0;h<c;h++)if(typeof o[h]!="number"){let f={instancePath:e+"/position/"+h,schemaPath:"#/$defs/spatial/position/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[f]:t.push(f),n++}}else{let c={instancePath:e+"/position",schemaPath:"#/$defs/spatial/position/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[c]:t.push(c),n++}}if(s.orientation!==void 0){let o=s.orientation;if(Array.isArray(o)){if(o.length>3){let h={instancePath:e+"/orientation",schemaPath:"#/$defs/spatial/orientation/maxItems",keyword:"maxItems",params:{limit:3},message:"must NOT have more than 3 items"};t===null?t=[h]:t.push(h),n++}if(o.length<3){let h={instancePath:e+"/orientation",schemaPath:"#/$defs/spatial/orientation/minItems",keyword:"minItems",params:{limit:3},message:"must NOT have fewer than 3 items"};t===null?t=[h]:t.push(h),n++}let c=o.length;for(let h=0;h<c;h++)if(typeof o[h]!="number"){let f={instancePath:e+"/orientation/"+h,schemaPath:"#/$defs/spatial/orientation/items/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[f]:t.push(f),n++}}else{let c={instancePath:e+"/orientation",schemaPath:"#/$defs/spatial/orientation/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[c]:t.push(c),n++}}if(s.opacity!==void 0){let o=s.opacity;if(typeof o=="number"){if(o>1||isNaN(o)){let c={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/maximum",keyword:"maximum",params:{comparison:"<=",limit:1},message:"must be <= 1"};t===null?t=[c]:t.push(c),n++}if(o<0||isNaN(o)){let c={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/minimum",keyword:"minimum",params:{comparison:">=",limit:0},message:"must be >= 0"};t===null?t=[c]:t.push(c),n++}}else{let c={instancePath:e+"/opacity",schemaPath:"#/properties/opacity/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[c]:t.push(c),n++}}if(s.module!==void 0&&(Et(s.module,{instancePath:e+"/module",parentData:s,parentDataProperty:"module",rootData:l,dynamicAnchors:u})||(t=t===null?Et.errors:t.concat(Et.errors),n=t.length)),s.visible!==void 0&&typeof s.visible!="boolean"){let o={instancePath:e+"/visible",schemaPath:"#/properties/visible/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};t===null?t=[o]:t.push(o),n++}if(s.frames!==void 0){let o=s.frames,c=n,h=!1,f=null,m=n;if(!(typeof o=="number"&&!(o%1)&&!isNaN(o))){let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[y]:t.push(y),n++}if(typeof o=="number"){if(o>9999||isNaN(o)){let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/maximum",keyword:"maximum",params:{comparison:"<=",limit:9999},message:"must be <= 9999"};t===null?t=[y]:t.push(y),n++}if(o<-9999||isNaN(o)){let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/0/minimum",keyword:"minimum",params:{comparison:">=",limit:-9999},message:"must be >= -9999"};t===null?t=[y]:t.push(y),n++}}var r=m===n;r&&(h=!0,f=0);let g=n;if(Array.isArray(o)){if(o.length>256){let b={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/maxItems",keyword:"maxItems",params:{limit:256},message:"must NOT have more than 256 items"};t===null?t=[b]:t.push(b),n++}if(o.length<1){let b={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/minItems",keyword:"minItems",params:{limit:1},message:"must NOT have fewer than 1 items"};t===null?t=[b]:t.push(b),n++}let y=o.length;for(let b=0;b<y;b++){let v=o[b];if(!(typeof v=="number"&&!(v%1)&&!isNaN(v))){let x={instancePath:e+"/frames/"+b,schemaPath:"#/$defs/validator/frames/oneOf/1/items/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[x]:t.push(x),n++}if(typeof v=="number"){if(v>9999||isNaN(v)){let x={instancePath:e+"/frames/"+b,schemaPath:"#/$defs/validator/frames/oneOf/1/items/maximum",keyword:"maximum",params:{comparison:"<=",limit:9999},message:"must be <= 9999"};t===null?t=[x]:t.push(x),n++}if(v<-9999||isNaN(v)){let x={instancePath:e+"/frames/"+b,schemaPath:"#/$defs/validator/frames/oneOf/1/items/minimum",keyword:"minimum",params:{comparison:">=",limit:-9999},message:"must be >= -9999"};t===null?t=[x]:t.push(x),n++}}}let p=o.length,w;if(p>1){let b={};for(;p--;){let v=o[p];if(typeof v=="number"&&!(v%1)&&!isNaN(v)){if(typeof b[v]=="number"){w=b[v];let x={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/uniqueItems",keyword:"uniqueItems",params:{i:p,j:w},message:"must NOT have duplicate items (items ## "+w+" and "+p+" are identical)"};t===null?t=[x]:t.push(x),n++;break}b[v]=p}}}}else{let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf/1/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[y]:t.push(y),n++}var r=g===n;if(r&&h?(h=!1,f=[f,1]):r&&(h=!0,f=1),h)n=c,t!==null&&(c?t.length=c:t=null);else{let y={instancePath:e+"/frames",schemaPath:"#/$defs/validator/frames/oneOf",keyword:"oneOf",params:{passingSchemas:f},message:"must match exactly one schema in oneOf"};t===null?t=[y]:t.push(y),n++}}}else{let o={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[o]:t.push(o),n++}return Pt.errors=t,n===0}Pt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function Ct(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Ct.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.uuid===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"uuid"},message:"must have required property 'uuid'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="uuid"||r==="tags"||r==="creator_memo")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.uuid!==void 0){let r=s.uuid;if(typeof r=="string"){if(!Di.test(r)){let o={instancePath:e+"/uuid",schemaPath:"#/$defs/validator/uuid/pattern",keyword:"pattern",params:{pattern:"^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"},message:'must match pattern "^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"'};t===null?t=[o]:t.push(o),n++}}else{let o={instancePath:e+"/uuid",schemaPath:"#/$defs/validator/uuid/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[o]:t.push(o),n++}}if(s.tags!==void 0){let r=s.tags;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++){let h=r[c];if(typeof h=="string"){if(!Pn.test(h)){let f={instancePath:e+"/tags/"+c,schemaPath:"#/$defs/validator/tag/pattern",keyword:"pattern",params:{pattern:"^(s|m|x):[^\\s:]+$"},message:'must match pattern "^(s|m|x):[^\\s:]+$"'};t===null?t=[f]:t.push(f),n++}}else{let f={instancePath:e+"/tags/"+c,schemaPath:"#/$defs/validator/tag/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[f]:t.push(f),n++}}}else{let o={instancePath:e+"/tags",schemaPath:"#/properties/tags/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.creator_memo!==void 0&&typeof s.creator_memo!="string"){let r={instancePath:e+"/creator_memo",schemaPath:"#/properties/creator_memo/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[r]:t.push(r),n++}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return Ct.errors=t,n===0}Ct.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function Rt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Rt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.meta===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"meta"},message:"must have required property 'meta'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="appearance"||r==="meta")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}s.appearance!==void 0&&(Pt(s.appearance,{instancePath:e+"/appearance",parentData:s,parentDataProperty:"appearance",rootData:l,dynamicAnchors:u})||(t=t===null?Pt.errors:t.concat(Pt.errors),n=t.length)),s.meta!==void 0&&(Ct(s.meta,{instancePath:e+"/meta",parentData:s,parentDataProperty:"meta",rootData:l,dynamicAnchors:u})||(t=t===null?Ct.errors:t.concat(Ct.errors),n=t.length))}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return Rt.errors=t,n===0}Rt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Wl={type:"object",properties:{document_title:{$ref:"#/$defs/labels/localized_string"},document_summary:{$ref:"#/$defs/labels/localized_string"},document_uuid:{$ref:"#/$defs/validator/uuid"},version:{allOf:[{$ref:"#/$defs/validator/semver"},{pattern:"^2\\."}],default:"2.0.0"},created_at:{$ref:"#/$defs/validator/timestamp_utc"},revised_at:{$ref:"#/$defs/validator/timestamp_utc"},tags:{type:"array",items:{$ref:"#/$defs/validator/tag"},default:[]},schema_uri:{$ref:"#/$defs/validator/schema_uri"},generator:{allOf:[{$ref:"#/$defs/validator/uri"}],default:"https://3dsl.jp/"},reference:{type:"string",default:""},coordinate_system:{type:"string",const:"Z+up/freeXY"},units:{$ref:"#/$defs/validator/units",default:"non_si:px"},i18n:{$ref:"#/$defs/validator/language_code",default:"ja"},author:{$ref:"#/$defs/validator/author"},creator_memo:{type:"string"}},required:["document_title","document_uuid","created_at","revised_at","schema_uri","author","version"],additionalProperties:!1},ql={type:"string",enum:["m","cm","mm","non_si:px"]},Xl={type:"string",enum:["ja","en"]},jl=new RegExp("^2\\.","u"),Rs=new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$","u"),Yl=new RegExp("^(https?|ftp|file)://\\S+$","u"),Zl=new RegExp("^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+)?$","u");function It(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=It.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.document_title===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"document_title"},message:"must have required property 'document_title'"};t===null?t=[c]:t.push(c),n++}if(s.document_uuid===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"document_uuid"},message:"must have required property 'document_uuid'"};t===null?t=[c]:t.push(c),n++}if(s.created_at===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"created_at"},message:"must have required property 'created_at'"};t===null?t=[c]:t.push(c),n++}if(s.revised_at===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"revised_at"},message:"must have required property 'revised_at'"};t===null?t=[c]:t.push(c),n++}if(s.schema_uri===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"schema_uri"},message:"must have required property 'schema_uri'"};t===null?t=[c]:t.push(c),n++}if(s.author===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"author"},message:"must have required property 'author'"};t===null?t=[c]:t.push(c),n++}if(s.version===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"version"},message:"must have required property 'version'"};t===null?t=[c]:t.push(c),n++}for(let c in s)if(!Ii.call(Wl.properties,c)){let h={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:c},message:"must NOT have additional properties"};t===null?t=[h]:t.push(h),n++}if(s.document_title!==void 0){let c=s.document_title,h=n,f=!1,m=null,g=n;if(typeof c!="string"){let p={instancePath:e+"/document_title",schemaPath:"#/$defs/labels/localized_string/oneOf/0/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}var r=g===n;r&&(f=!0,m=0);let y=n;if(c&&typeof c=="object"&&!Array.isArray(c)){for(let p in c)if(!(p==="ja"||p==="en")){let w={instancePath:e+"/document_title",schemaPath:"#/$defs/labels/localized_string/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:p},message:"must NOT have additional properties"};t===null?t=[w]:t.push(w),n++}if(c.ja!==void 0&&typeof c.ja!="string"){let p={instancePath:e+"/document_title/ja",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/ja/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}if(c.en!==void 0&&typeof c.en!="string"){let p={instancePath:e+"/document_title/en",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/en/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}}else{let p={instancePath:e+"/document_title",schemaPath:"#/$defs/labels/localized_string/oneOf/1/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[p]:t.push(p),n++}var r=y===n;if(r&&f?(f=!1,m=[m,1]):r&&(f=!0,m=1),f)n=h,t!==null&&(h?t.length=h:t=null);else{let p={instancePath:e+"/document_title",schemaPath:"#/$defs/labels/localized_string/oneOf",keyword:"oneOf",params:{passingSchemas:m},message:"must match exactly one schema in oneOf"};t===null?t=[p]:t.push(p),n++}}if(s.document_summary!==void 0){let c=s.document_summary,h=n,f=!1,m=null,g=n;if(typeof c!="string"){let p={instancePath:e+"/document_summary",schemaPath:"#/$defs/labels/localized_string/oneOf/0/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}var o=g===n;o&&(f=!0,m=0);let y=n;if(c&&typeof c=="object"&&!Array.isArray(c)){for(let p in c)if(!(p==="ja"||p==="en")){let w={instancePath:e+"/document_summary",schemaPath:"#/$defs/labels/localized_string/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:p},message:"must NOT have additional properties"};t===null?t=[w]:t.push(w),n++}if(c.ja!==void 0&&typeof c.ja!="string"){let p={instancePath:e+"/document_summary/ja",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/ja/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}if(c.en!==void 0&&typeof c.en!="string"){let p={instancePath:e+"/document_summary/en",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/en/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}}else{let p={instancePath:e+"/document_summary",schemaPath:"#/$defs/labels/localized_string/oneOf/1/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[p]:t.push(p),n++}var o=y===n;if(o&&f?(f=!1,m=[m,1]):o&&(f=!0,m=1),f)n=h,t!==null&&(h?t.length=h:t=null);else{let p={instancePath:e+"/document_summary",schemaPath:"#/$defs/labels/localized_string/oneOf",keyword:"oneOf",params:{passingSchemas:m},message:"must match exactly one schema in oneOf"};t===null?t=[p]:t.push(p),n++}}if(s.document_uuid!==void 0){let c=s.document_uuid;if(typeof c=="string"){if(!Di.test(c)){let h={instancePath:e+"/document_uuid",schemaPath:"#/$defs/validator/uuid/pattern",keyword:"pattern",params:{pattern:"^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"},message:'must match pattern "^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"'};t===null?t=[h]:t.push(h),n++}}else{let h={instancePath:e+"/document_uuid",schemaPath:"#/$defs/validator/uuid/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}}if(s.version!==void 0){let c=s.version;if(typeof c=="string"){if(!Ds.test(c)){let h={instancePath:e+"/version",schemaPath:"#/$defs/validator/semver/pattern",keyword:"pattern",params:{pattern:"^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$"},message:'must match pattern "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$"'};t===null?t=[h]:t.push(h),n++}}else{let h={instancePath:e+"/version",schemaPath:"#/$defs/validator/semver/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(typeof c=="string"&&!jl.test(c)){let h={instancePath:e+"/version",schemaPath:"#/properties/version/allOf/1/pattern",keyword:"pattern",params:{pattern:"^2\\."},message:'must match pattern "^2\\."'};t===null?t=[h]:t.push(h),n++}}if(s.created_at!==void 0){let c=s.created_at;if(typeof c=="string"){if(!Rs.test(c)){let h={instancePath:e+"/created_at",schemaPath:"#/$defs/validator/timestamp_utc/pattern",keyword:"pattern",params:{pattern:"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"},message:'must match pattern "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"'};t===null?t=[h]:t.push(h),n++}}else{let h={instancePath:e+"/created_at",schemaPath:"#/$defs/validator/timestamp_utc/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}}if(s.revised_at!==void 0){let c=s.revised_at;if(typeof c=="string"){if(!Rs.test(c)){let h={instancePath:e+"/revised_at",schemaPath:"#/$defs/validator/timestamp_utc/pattern",keyword:"pattern",params:{pattern:"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"},message:'must match pattern "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"'};t===null?t=[h]:t.push(h),n++}}else{let h={instancePath:e+"/revised_at",schemaPath:"#/$defs/validator/timestamp_utc/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}}if(s.tags!==void 0){let c=s.tags;if(Array.isArray(c)){let h=c.length;for(let f=0;f<h;f++){let m=c[f];if(typeof m=="string"){if(!Pn.test(m)){let g={instancePath:e+"/tags/"+f,schemaPath:"#/$defs/validator/tag/pattern",keyword:"pattern",params:{pattern:"^(s|m|x):[^\\s:]+$"},message:'must match pattern "^(s|m|x):[^\\s:]+$"'};t===null?t=[g]:t.push(g),n++}}else{let g={instancePath:e+"/tags/"+f,schemaPath:"#/$defs/validator/tag/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[g]:t.push(g),n++}}}else{let h={instancePath:e+"/tags",schemaPath:"#/properties/tags/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[h]:t.push(h),n++}}if(s.schema_uri!==void 0){let c=s.schema_uri;if(typeof c!="string"){let h={instancePath:e+"/schema_uri",schemaPath:"#/$defs/validator/schema_uri/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(c!=="https://3dsl.jp/schemas/candidates/v2.0.0/3DSS.schema.json#v2.0.0"){let h={instancePath:e+"/schema_uri",schemaPath:"#/$defs/validator/schema_uri/const",keyword:"const",params:{allowedValue:"https://3dsl.jp/schemas/candidates/v2.0.0/3DSS.schema.json#v2.0.0"},message:"must be equal to constant"};t===null?t=[h]:t.push(h),n++}}if(s.generator!==void 0){let c=s.generator;if(typeof c=="string"){if(!Yl.test(c)){let h={instancePath:e+"/generator",schemaPath:"#/$defs/validator/uri/pattern",keyword:"pattern",params:{pattern:"^(https?|ftp|file)://\\S+$"},message:'must match pattern "^(https?|ftp|file)://\\S+$"'};t===null?t=[h]:t.push(h),n++}}else{let h={instancePath:e+"/generator",schemaPath:"#/$defs/validator/uri/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}}if(s.reference!==void 0&&typeof s.reference!="string"){let c={instancePath:e+"/reference",schemaPath:"#/properties/reference/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[c]:t.push(c),n++}if(s.coordinate_system!==void 0){let c=s.coordinate_system;if(typeof c!="string"){let h={instancePath:e+"/coordinate_system",schemaPath:"#/properties/coordinate_system/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(c!=="Z+up/freeXY"){let h={instancePath:e+"/coordinate_system",schemaPath:"#/properties/coordinate_system/const",keyword:"const",params:{allowedValue:"Z+up/freeXY"},message:"must be equal to constant"};t===null?t=[h]:t.push(h),n++}}if(s.units!==void 0){let c=s.units;if(typeof c!="string"){let h={instancePath:e+"/units",schemaPath:"#/$defs/validator/units/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(!(c==="m"||c==="cm"||c==="mm"||c==="non_si:px")){let h={instancePath:e+"/units",schemaPath:"#/$defs/validator/units/enum",keyword:"enum",params:{allowedValues:ql.enum},message:"must be equal to one of the allowed values"};t===null?t=[h]:t.push(h),n++}}if(s.i18n!==void 0){let c=s.i18n;if(typeof c!="string"){let h={instancePath:e+"/i18n",schemaPath:"#/$defs/validator/language_code/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}if(!(c==="ja"||c==="en")){let h={instancePath:e+"/i18n",schemaPath:"#/$defs/validator/language_code/enum",keyword:"enum",params:{allowedValues:Xl.enum},message:"must be equal to one of the allowed values"};t===null?t=[h]:t.push(h),n++}}if(s.author!==void 0){let c=s.author;if(typeof c=="string"){if(!Zl.test(c)){let h={instancePath:e+"/author",schemaPath:"#/$defs/validator/author/pattern",keyword:"pattern",params:{pattern:"^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+)?$"},message:'must match pattern "^[a-zA-Z0-9._-]+(@[a-zA-Z0-9.-]+)?$"'};t===null?t=[h]:t.push(h),n++}}else{let h={instancePath:e+"/author",schemaPath:"#/$defs/validator/author/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}}if(s.creator_memo!==void 0&&typeof s.creator_memo!="string"){let c={instancePath:e+"/creator_memo",schemaPath:"#/properties/creator_memo/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[c]:t.push(c),n++}}else{let c={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[c]:t.push(c),n++}return It.errors=t,n===0}It.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};var Jl={type:"object",properties:{id:{$ref:"#/$defs/visual_legend/id"},label:{$ref:"#/$defs/labels/localized_string"},description:{$ref:"#/$defs/labels/localized_string"},applies_to:{type:"array",minItems:1,uniqueItems:!0,items:{type:"string",enum:["point_text","line_caption","line","point_marker"]}},sample:{type:"object",minProperties:1,properties:{size:{$ref:"#/$defs/labels/scope_size"},writing_mode:{$ref:"#/$defs/labels/writing_mode"},font:{type:"string",minLength:1},font_weight:{$ref:"#/$defs/labels/font_weight"},color:{$ref:"#/$defs/validator/color_hex"},pose:{$ref:"#/$defs/text_pose"}},additionalProperties:!1,description:"Legend specimen only, never a style cascade. Actual element appearance is authoritative. Multiple references denote participation, not automatic visual property merging."}},required:["id","label","description","applies_to"],additionalProperties:!1};function Dt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Dt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.id===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"id"},message:"must have required property 'id'"};t===null?t=[c]:t.push(c),n++}if(s.label===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"label"},message:"must have required property 'label'"};t===null?t=[c]:t.push(c),n++}if(s.description===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"description"},message:"must have required property 'description'"};t===null?t=[c]:t.push(c),n++}if(s.applies_to===void 0){let c={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"applies_to"},message:"must have required property 'applies_to'"};t===null?t=[c]:t.push(c),n++}for(let c in s)if(!(c==="id"||c==="label"||c==="description"||c==="applies_to"||c==="sample")){let h={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:c},message:"must NOT have additional properties"};t===null?t=[h]:t.push(h),n++}if(s.id!==void 0){let c=s.id;if(typeof c=="string"){if(!Is.test(c)){let h={instancePath:e+"/id",schemaPath:"#/$defs/visual_legend/id/pattern",keyword:"pattern",params:{pattern:"^[a-z][a-z0-9_-]{0,63}$"},message:'must match pattern "^[a-z][a-z0-9_-]{0,63}$"'};t===null?t=[h]:t.push(h),n++}}else{let h={instancePath:e+"/id",schemaPath:"#/$defs/visual_legend/id/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[h]:t.push(h),n++}}if(s.label!==void 0){let c=s.label,h=n,f=!1,m=null,g=n;if(typeof c!="string"){let p={instancePath:e+"/label",schemaPath:"#/$defs/labels/localized_string/oneOf/0/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}var r=g===n;r&&(f=!0,m=0);let y=n;if(c&&typeof c=="object"&&!Array.isArray(c)){for(let p in c)if(!(p==="ja"||p==="en")){let w={instancePath:e+"/label",schemaPath:"#/$defs/labels/localized_string/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:p},message:"must NOT have additional properties"};t===null?t=[w]:t.push(w),n++}if(c.ja!==void 0&&typeof c.ja!="string"){let p={instancePath:e+"/label/ja",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/ja/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}if(c.en!==void 0&&typeof c.en!="string"){let p={instancePath:e+"/label/en",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/en/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}}else{let p={instancePath:e+"/label",schemaPath:"#/$defs/labels/localized_string/oneOf/1/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[p]:t.push(p),n++}var r=y===n;if(r&&f?(f=!1,m=[m,1]):r&&(f=!0,m=1),f)n=h,t!==null&&(h?t.length=h:t=null);else{let p={instancePath:e+"/label",schemaPath:"#/$defs/labels/localized_string/oneOf",keyword:"oneOf",params:{passingSchemas:m},message:"must match exactly one schema in oneOf"};t===null?t=[p]:t.push(p),n++}}if(s.description!==void 0){let c=s.description,h=n,f=!1,m=null,g=n;if(typeof c!="string"){let p={instancePath:e+"/description",schemaPath:"#/$defs/labels/localized_string/oneOf/0/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}var o=g===n;o&&(f=!0,m=0);let y=n;if(c&&typeof c=="object"&&!Array.isArray(c)){for(let p in c)if(!(p==="ja"||p==="en")){let w={instancePath:e+"/description",schemaPath:"#/$defs/labels/localized_string/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:p},message:"must NOT have additional properties"};t===null?t=[w]:t.push(w),n++}if(c.ja!==void 0&&typeof c.ja!="string"){let p={instancePath:e+"/description/ja",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/ja/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}if(c.en!==void 0&&typeof c.en!="string"){let p={instancePath:e+"/description/en",schemaPath:"#/$defs/labels/localized_string/oneOf/1/properties/en/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}}else{let p={instancePath:e+"/description",schemaPath:"#/$defs/labels/localized_string/oneOf/1/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[p]:t.push(p),n++}var o=y===n;if(o&&f?(f=!1,m=[m,1]):o&&(f=!0,m=1),f)n=h,t!==null&&(h?t.length=h:t=null);else{let p={instancePath:e+"/description",schemaPath:"#/$defs/labels/localized_string/oneOf",keyword:"oneOf",params:{passingSchemas:m},message:"must match exactly one schema in oneOf"};t===null?t=[p]:t.push(p),n++}}if(s.applies_to!==void 0){let c=s.applies_to;if(Array.isArray(c)){if(c.length<1){let g={instancePath:e+"/applies_to",schemaPath:"#/properties/applies_to/minItems",keyword:"minItems",params:{limit:1},message:"must NOT have fewer than 1 items"};t===null?t=[g]:t.push(g),n++}let h=c.length;for(let g=0;g<h;g++){let y=c[g];if(typeof y!="string"){let p={instancePath:e+"/applies_to/"+g,schemaPath:"#/properties/applies_to/items/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[p]:t.push(p),n++}if(!(y==="point_text"||y==="line_caption"||y==="line"||y==="point_marker")){let p={instancePath:e+"/applies_to/"+g,schemaPath:"#/properties/applies_to/items/enum",keyword:"enum",params:{allowedValues:Jl.properties.applies_to.items.enum},message:"must be equal to one of the allowed values"};t===null?t=[p]:t.push(p),n++}}let f=c.length,m;if(f>1){let g={};for(;f--;){let y=c[f];if(typeof y=="string"){if(typeof g[y]=="number"){m=g[y];let p={instancePath:e+"/applies_to",schemaPath:"#/properties/applies_to/uniqueItems",keyword:"uniqueItems",params:{i:f,j:m},message:"must NOT have duplicate items (items ## "+m+" and "+f+" are identical)"};t===null?t=[p]:t.push(p),n++;break}g[y]=f}}}}else{let h={instancePath:e+"/applies_to",schemaPath:"#/properties/applies_to/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[h]:t.push(h),n++}}if(s.sample!==void 0){let c=s.sample;if(c&&typeof c=="object"&&!Array.isArray(c)){if(Object.keys(c).length<1){let h={instancePath:e+"/sample",schemaPath:"#/properties/sample/minProperties",keyword:"minProperties",params:{limit:1},message:"must NOT have fewer than 1 properties"};t===null?t=[h]:t.push(h),n++}for(let h in c)if(!(h==="size"||h==="writing_mode"||h==="font"||h==="font_weight"||h==="color"||h==="pose")){let f={instancePath:e+"/sample",schemaPath:"#/properties/sample/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:h},message:"must NOT have additional properties"};t===null?t=[f]:t.push(f),n++}if(c.size!==void 0){let h=c.size;if(typeof h!="number"){let f={instancePath:e+"/sample/size",schemaPath:"#/$defs/labels/scope_size/type",keyword:"type",params:{type:"number"},message:"must be number"};t===null?t=[f]:t.push(f),n++}if(!(h===.125||h===.25||h===.5||h===1||h===2||h===4||h===8||h===16||h===32||h===64||h===128||h===256)){let f={instancePath:e+"/sample/size",schemaPath:"#/$defs/labels/scope_size/enum",keyword:"enum",params:{allowedValues:Li.enum},message:"must be equal to one of the allowed values"};t===null?t=[f]:t.push(f),n++}}if(c.writing_mode!==void 0){let h=c.writing_mode;if(typeof h!="string"){let f={instancePath:e+"/sample/writing_mode",schemaPath:"#/$defs/labels/writing_mode/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[f]:t.push(f),n++}if(!(h==="horizontal-tb"||h==="vertical-rl")){let f={instancePath:e+"/sample/writing_mode",schemaPath:"#/$defs/labels/writing_mode/enum",keyword:"enum",params:{allowedValues:Tn.enum},message:"must be equal to one of the allowed values"};t===null?t=[f]:t.push(f),n++}}if(c.font!==void 0){let h=c.font;if(typeof h=="string"){if(Lt(h)<1){let f={instancePath:e+"/sample/font",schemaPath:"#/properties/sample/properties/font/minLength",keyword:"minLength",params:{limit:1},message:"must NOT have fewer than 1 characters"};t===null?t=[f]:t.push(f),n++}}else{let f={instancePath:e+"/sample/font",schemaPath:"#/properties/sample/properties/font/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[f]:t.push(f),n++}}if(c.font_weight!==void 0){let h=c.font_weight;if(!(typeof h=="number"&&!(h%1)&&!isNaN(h))){let f={instancePath:e+"/sample/font_weight",schemaPath:"#/$defs/labels/font_weight/type",keyword:"type",params:{type:"integer"},message:"must be integer"};t===null?t=[f]:t.push(f),n++}if(!(h===400||h===700)){let f={instancePath:e+"/sample/font_weight",schemaPath:"#/$defs/labels/font_weight/enum",keyword:"enum",params:{allowedValues:En.enum},message:"must be equal to one of the allowed values"};t===null?t=[f]:t.push(f),n++}}if(c.color!==void 0){let h=c.color;if(typeof h=="string"){if(!Oe.test(h)){let f={instancePath:e+"/sample/color",schemaPath:"#/$defs/validator/color_hex/pattern",keyword:"pattern",params:{pattern:"^#(?:[0-9a-fA-F]{3}){1,2}$"},message:'must match pattern "^#(?:[0-9a-fA-F]{3}){1,2}$"'};t===null?t=[f]:t.push(f),n++}}else{let f={instancePath:e+"/sample/color",schemaPath:"#/$defs/validator/color_hex/type",keyword:"type",params:{type:"string"},message:"must be string"};t===null?t=[f]:t.push(f),n++}}c.pose!==void 0&&(ue(c.pose,{instancePath:e+"/sample/pose",parentData:c,parentDataProperty:"pose",rootData:l,dynamicAnchors:u})||(t=t===null?ue.errors:t.concat(ue.errors),n=t.length))}else{let h={instancePath:e+"/sample",schemaPath:"#/properties/sample/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[h]:t.push(h),n++}}}else{let c={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[c]:t.push(c),n++}return Dt.errors=t,n===0}Dt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1};function Yt(s,{instancePath:e="",parentData:i,parentDataProperty:a,rootData:l=s,dynamicAnchors:u={}}={}){let t=null,n=0,d=Yt.evaluated;if(d.dynamicProps&&(d.props=void 0),d.dynamicItems&&(d.items=void 0),s&&typeof s=="object"&&!Array.isArray(s)){if(s.document_meta===void 0){let r={instancePath:e,schemaPath:"#/required",keyword:"required",params:{missingProperty:"document_meta"},message:"must have required property 'document_meta'"};t===null?t=[r]:t.push(r),n++}for(let r in s)if(!(r==="lines"||r==="points"||r==="aux"||r==="document_meta"||r==="visual_legend")){let o={instancePath:e,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:r},message:"must NOT have additional properties"};t===null?t=[o]:t.push(o),n++}if(s.lines!==void 0){let r=s.lines;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++)ut(r[c],{instancePath:e+"/lines/"+c,parentData:r,parentDataProperty:c,rootData:l,dynamicAnchors:u})||(t=t===null?ut.errors:t.concat(ut.errors),n=t.length)}else{let o={instancePath:e+"/lines",schemaPath:"#/properties/lines/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.points!==void 0){let r=s.points;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++)xt(r[c],{instancePath:e+"/points/"+c,parentData:r,parentDataProperty:c,rootData:l,dynamicAnchors:u})||(t=t===null?xt.errors:t.concat(xt.errors),n=t.length)}else{let o={instancePath:e+"/points",schemaPath:"#/properties/points/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.aux!==void 0){let r=s.aux;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++)Rt(r[c],{instancePath:e+"/aux/"+c,parentData:r,parentDataProperty:c,rootData:l,dynamicAnchors:u})||(t=t===null?Rt.errors:t.concat(Rt.errors),n=t.length)}else{let o={instancePath:e+"/aux",schemaPath:"#/properties/aux/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}if(s.document_meta!==void 0&&(It(s.document_meta,{instancePath:e+"/document_meta",parentData:s,parentDataProperty:"document_meta",rootData:l,dynamicAnchors:u})||(t=t===null?It.errors:t.concat(It.errors),n=t.length)),s.visual_legend!==void 0){let r=s.visual_legend;if(Array.isArray(r)){let o=r.length;for(let c=0;c<o;c++)Dt(r[c],{instancePath:e+"/visual_legend/"+c,parentData:r,parentDataProperty:c,rootData:l,dynamicAnchors:u})||(t=t===null?Dt.errors:t.concat(Dt.errors),n=t.length)}else{let o={instancePath:e+"/visual_legend",schemaPath:"#/properties/visual_legend/type",keyword:"type",params:{type:"array"},message:"must be array"};t===null?t=[o]:t.push(o),n++}}}else{let r={instancePath:e,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"};t===null?t=[r]:t.push(r),n++}return Yt.errors=t,n===0}Yt.evaluated={props:!0,dynamicProps:!1,dynamicItems:!1}});var $e={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},we={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3};var ln=0,cn=1,un=2,hn=3,dn=4,fn=5,pn=6,mn=7;var gn=300;var Zi=1e3,Ft=1001,Ji=1002;var os=1006;var ls=1008;var cs=1009;var us=1023;var zt=2300,hi=2301,ci=2302,Ki=2400,Qi=2401,en=2402;var yn="",_e="srgb",tn="srgb-linear",nn="linear",ui="srgb";var et=2e3,sn=2001;function rn(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}var Xn={},di=null;function ee(...s){let e="THREE."+s.shift();di?di("warn",e,...s):console.warn(e,...s)}function Q(...s){let e="THREE."+s.shift();di?di("error",e,...s):console.error(e,...s)}function an(...s){let e=s.join(" ");e in Xn||(Xn[e]=!0,ee(...s))}var it=class{addEventListener(e,i){this._listeners===void 0&&(this._listeners={});let a=this._listeners;a[e]===void 0&&(a[e]=[]),a[e].indexOf(i)===-1&&a[e].push(i)}hasEventListener(e,i){let a=this._listeners;return a===void 0?!1:a[e]!==void 0&&a[e].indexOf(i)!==-1}removeEventListener(e,i){let a=this._listeners;if(a===void 0)return;let l=a[e];if(l!==void 0){let u=l.indexOf(i);u!==-1&&l.splice(u,1)}}dispatchEvent(e){let i=this._listeners;if(i===void 0)return;let a=i[e.type];if(a!==void 0){e.target=this;let l=a.slice(0);for(let u=0,t=l.length;u<t;u++)l[u].call(this,e);e.target=null}}},se=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],jn=1234567,kt=Math.PI/180,Vt=180/Math.PI;function Ti(){let s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0,a=Math.random()*4294967295|0;return(se[s&255]+se[s>>8&255]+se[s>>16&255]+se[s>>24&255]+"-"+se[e&255]+se[e>>8&255]+"-"+se[e>>16&15|64]+se[e>>24&255]+"-"+se[i&63|128]+se[i>>8&255]+"-"+se[i>>16&255]+se[i>>24&255]+se[a&255]+se[a>>8&255]+se[a>>16&255]+se[a>>24&255]).toLowerCase()}function W(s,e,i){return Math.max(e,Math.min(i,s))}function xn(s,e){return(s%e+e)%e}function ir(s,e,i,a,l){return a+(s-e)*(l-a)/(i-e)}function nr(s,e,i){return s!==e?(i-s)/(e-s):0}function Bt(s,e,i){return(1-i)*s+i*e}function sr(s,e,i,a){return Bt(s,e,1-Math.exp(-i*a))}function rr(s,e=1){return e-Math.abs(xn(s,e*2)-e)}function ar(s,e,i){return s<=e?0:s>=i?1:(s=(s-e)/(i-e),s*s*(3-2*s))}function or(s,e,i){return s<=e?0:s>=i?1:(s=(s-e)/(i-e),s*s*s*(s*(s*6-15)+10))}function lr(s,e){return s+Math.floor(Math.random()*(e-s+1))}function cr(s,e){return s+Math.random()*(e-s)}function ur(s){return s*(.5-Math.random())}function hr(s){s!==void 0&&(jn=s);let e=jn+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function dr(s){return s*kt}function fr(s){return s*Vt}function pr(s){return(s&s-1)===0&&s!==0}function mr(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function gr(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function yr(s,e,i,a,l){let u=Math.cos,t=Math.sin,n=u(i/2),d=t(i/2),r=u((e+a)/2),o=t((e+a)/2),c=u((e-a)/2),h=t((e-a)/2),f=u((a-e)/2),m=t((a-e)/2);switch(l){case"XYX":s.set(n*o,d*c,d*h,n*r);break;case"YZY":s.set(d*h,n*o,d*c,n*r);break;case"ZXZ":s.set(d*c,d*h,n*o,n*r);break;case"XZX":s.set(n*o,d*m,d*f,n*r);break;case"YXY":s.set(d*f,n*o,d*m,n*r);break;case"ZYZ":s.set(d*m,d*f,n*o,n*r);break;default:ee("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+l)}}function xr(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function _r(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}var ne={DEG2RAD:kt,RAD2DEG:Vt,generateUUID:Ti,clamp:W,euclideanModulo:xn,mapLinear:ir,inverseLerp:nr,lerp:Bt,damp:sr,pingpong:rr,smoothstep:ar,smootherstep:or,randInt:lr,randFloat:cr,randFloatSpread:ur,seededRandom:hr,degToRad:dr,radToDeg:fr,isPowerOfTwo:pr,ceilPowerOfTwo:mr,floorPowerOfTwo:gr,setQuaternionFromProperEuler:yr,normalize:_r,denormalize:xr},j=class s{constructor(e=0,i=0){s.prototype.isVector2=!0,this.x=e,this.y=i}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,i){return this.x=e,this.y=i,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,i){switch(e){case 0:this.x=i;break;case 1:this.y=i;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,i){return this.x=e.x+i.x,this.y=e.y+i.y,this}addScaledVector(e,i){return this.x+=e.x*i,this.y+=e.y*i,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,i){return this.x=e.x-i.x,this.y=e.y-i.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let i=this.x,a=this.y,l=e.elements;return this.x=l[0]*i+l[3]*a+l[6],this.y=l[1]*i+l[4]*a+l[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,i){return this.x=W(this.x,e.x,i.x),this.y=W(this.y,e.y,i.y),this}clampScalar(e,i){return this.x=W(this.x,e,i),this.y=W(this.y,e,i),this}clampLength(e,i){let a=this.length();return this.divideScalar(a||1).multiplyScalar(W(a,e,i))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let i=Math.sqrt(this.lengthSq()*e.lengthSq());if(i===0)return Math.PI/2;let a=this.dot(e)/i;return Math.acos(W(a,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let i=this.x-e.x,a=this.y-e.y;return i*i+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,i){return this.x+=(e.x-this.x)*i,this.y+=(e.y-this.y)*i,this}lerpVectors(e,i,a){return this.x=e.x+(i.x-e.x)*a,this.y=e.y+(i.y-e.y)*a,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,i=0){return this.x=e[i],this.y=e[i+1],this}toArray(e=[],i=0){return e[i]=this.x,e[i+1]=this.y,e}fromBufferAttribute(e,i){return this.x=e.getX(i),this.y=e.getY(i),this}rotateAround(e,i){let a=Math.cos(i),l=Math.sin(i),u=this.x-e.x,t=this.y-e.y;return this.x=u*a-t*l+e.x,this.y=u*l+t*a+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},ae=class{constructor(e=0,i=0,a=0,l=1){this.isQuaternion=!0,this._x=e,this._y=i,this._z=a,this._w=l}static slerpFlat(e,i,a,l,u,t,n){let d=a[l+0],r=a[l+1],o=a[l+2],c=a[l+3],h=u[t+0],f=u[t+1],m=u[t+2],g=u[t+3];if(n<=0){e[i+0]=d,e[i+1]=r,e[i+2]=o,e[i+3]=c;return}if(n>=1){e[i+0]=h,e[i+1]=f,e[i+2]=m,e[i+3]=g;return}if(c!==g||d!==h||r!==f||o!==m){let y=d*h+r*f+o*m+c*g;y<0&&(h=-h,f=-f,m=-m,g=-g,y=-y);let p=1-n;if(y<.9995){let w=Math.acos(y),b=Math.sin(w);p=Math.sin(p*w)/b,n=Math.sin(n*w)/b,d=d*p+h*n,r=r*p+f*n,o=o*p+m*n,c=c*p+g*n}else{d=d*p+h*n,r=r*p+f*n,o=o*p+m*n,c=c*p+g*n;let w=1/Math.sqrt(d*d+r*r+o*o+c*c);d*=w,r*=w,o*=w,c*=w}}e[i]=d,e[i+1]=r,e[i+2]=o,e[i+3]=c}static multiplyQuaternionsFlat(e,i,a,l,u,t){let n=a[l],d=a[l+1],r=a[l+2],o=a[l+3],c=u[t],h=u[t+1],f=u[t+2],m=u[t+3];return e[i]=n*m+o*c+d*f-r*h,e[i+1]=d*m+o*h+r*c-n*f,e[i+2]=r*m+o*f+n*h-d*c,e[i+3]=o*m-n*c-d*h-r*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,i,a,l){return this._x=e,this._y=i,this._z=a,this._w=l,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,i=!0){let a=e._x,l=e._y,u=e._z,t=e._order,n=Math.cos,d=Math.sin,r=n(a/2),o=n(l/2),c=n(u/2),h=d(a/2),f=d(l/2),m=d(u/2);switch(t){case"XYZ":this._x=h*o*c+r*f*m,this._y=r*f*c-h*o*m,this._z=r*o*m+h*f*c,this._w=r*o*c-h*f*m;break;case"YXZ":this._x=h*o*c+r*f*m,this._y=r*f*c-h*o*m,this._z=r*o*m-h*f*c,this._w=r*o*c+h*f*m;break;case"ZXY":this._x=h*o*c-r*f*m,this._y=r*f*c+h*o*m,this._z=r*o*m+h*f*c,this._w=r*o*c-h*f*m;break;case"ZYX":this._x=h*o*c-r*f*m,this._y=r*f*c+h*o*m,this._z=r*o*m-h*f*c,this._w=r*o*c+h*f*m;break;case"YZX":this._x=h*o*c+r*f*m,this._y=r*f*c+h*o*m,this._z=r*o*m-h*f*c,this._w=r*o*c-h*f*m;break;case"XZY":this._x=h*o*c-r*f*m,this._y=r*f*c-h*o*m,this._z=r*o*m+h*f*c,this._w=r*o*c+h*f*m;break;default:ee("Quaternion: .setFromEuler() encountered an unknown order: "+t)}return i===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,i){let a=i/2,l=Math.sin(a);return this._x=e.x*l,this._y=e.y*l,this._z=e.z*l,this._w=Math.cos(a),this._onChangeCallback(),this}setFromRotationMatrix(e){let i=e.elements,a=i[0],l=i[4],u=i[8],t=i[1],n=i[5],d=i[9],r=i[2],o=i[6],c=i[10],h=a+n+c;if(h>0){let f=.5/Math.sqrt(h+1);this._w=.25/f,this._x=(o-d)*f,this._y=(u-r)*f,this._z=(t-l)*f}else if(a>n&&a>c){let f=2*Math.sqrt(1+a-n-c);this._w=(o-d)/f,this._x=.25*f,this._y=(l+t)/f,this._z=(u+r)/f}else if(n>c){let f=2*Math.sqrt(1+n-a-c);this._w=(u-r)/f,this._x=(l+t)/f,this._y=.25*f,this._z=(d+o)/f}else{let f=2*Math.sqrt(1+c-a-n);this._w=(t-l)/f,this._x=(u+r)/f,this._y=(d+o)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,i){let a=e.dot(i)+1;return a<1e-8?(a=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=a):(this._x=0,this._y=-e.z,this._z=e.y,this._w=a)):(this._x=e.y*i.z-e.z*i.y,this._y=e.z*i.x-e.x*i.z,this._z=e.x*i.y-e.y*i.x,this._w=a),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(W(this.dot(e),-1,1)))}rotateTowards(e,i){let a=this.angleTo(e);if(a===0)return this;let l=Math.min(1,i/a);return this.slerp(e,l),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,i){let a=e._x,l=e._y,u=e._z,t=e._w,n=i._x,d=i._y,r=i._z,o=i._w;return this._x=a*o+t*n+l*r-u*d,this._y=l*o+t*d+u*n-a*r,this._z=u*o+t*r+a*d-l*n,this._w=t*o-a*n-l*d-u*r,this._onChangeCallback(),this}slerp(e,i){if(i<=0)return this;if(i>=1)return this.copy(e);let a=e._x,l=e._y,u=e._z,t=e._w,n=this.dot(e);n<0&&(a=-a,l=-l,u=-u,t=-t,n=-n);let d=1-i;if(n<.9995){let r=Math.acos(n),o=Math.sin(r);d=Math.sin(d*r)/o,i=Math.sin(i*r)/o,this._x=this._x*d+a*i,this._y=this._y*d+l*i,this._z=this._z*d+u*i,this._w=this._w*d+t*i,this._onChangeCallback()}else this._x=this._x*d+a*i,this._y=this._y*d+l*i,this._z=this._z*d+u*i,this._w=this._w*d+t*i,this.normalize();return this}slerpQuaternions(e,i,a){return this.copy(e).slerp(i,a)}random(){let e=2*Math.PI*Math.random(),i=2*Math.PI*Math.random(),a=Math.random(),l=Math.sqrt(1-a),u=Math.sqrt(a);return this.set(l*Math.sin(e),l*Math.cos(e),u*Math.sin(i),u*Math.cos(i))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,i=0){return this._x=e[i],this._y=e[i+1],this._z=e[i+2],this._w=e[i+3],this._onChangeCallback(),this}toArray(e=[],i=0){return e[i]=this._x,e[i+1]=this._y,e[i+2]=this._z,e[i+3]=this._w,e}fromBufferAttribute(e,i){return this._x=e.getX(i),this._y=e.getY(i),this._z=e.getZ(i),this._w=e.getW(i),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},N=class s{constructor(e=0,i=0,a=0){s.prototype.isVector3=!0,this.x=e,this.y=i,this.z=a}set(e,i,a){return a===void 0&&(a=this.z),this.x=e,this.y=i,this.z=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,i){switch(e){case 0:this.x=i;break;case 1:this.y=i;break;case 2:this.z=i;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,i){return this.x=e.x+i.x,this.y=e.y+i.y,this.z=e.z+i.z,this}addScaledVector(e,i){return this.x+=e.x*i,this.y+=e.y*i,this.z+=e.z*i,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,i){return this.x=e.x-i.x,this.y=e.y-i.y,this.z=e.z-i.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,i){return this.x=e.x*i.x,this.y=e.y*i.y,this.z=e.z*i.z,this}applyEuler(e){return this.applyQuaternion(Yn.setFromEuler(e))}applyAxisAngle(e,i){return this.applyQuaternion(Yn.setFromAxisAngle(e,i))}applyMatrix3(e){let i=this.x,a=this.y,l=this.z,u=e.elements;return this.x=u[0]*i+u[3]*a+u[6]*l,this.y=u[1]*i+u[4]*a+u[7]*l,this.z=u[2]*i+u[5]*a+u[8]*l,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let i=this.x,a=this.y,l=this.z,u=e.elements,t=1/(u[3]*i+u[7]*a+u[11]*l+u[15]);return this.x=(u[0]*i+u[4]*a+u[8]*l+u[12])*t,this.y=(u[1]*i+u[5]*a+u[9]*l+u[13])*t,this.z=(u[2]*i+u[6]*a+u[10]*l+u[14])*t,this}applyQuaternion(e){let i=this.x,a=this.y,l=this.z,u=e.x,t=e.y,n=e.z,d=e.w,r=2*(t*l-n*a),o=2*(n*i-u*l),c=2*(u*a-t*i);return this.x=i+d*r+t*c-n*o,this.y=a+d*o+n*r-u*c,this.z=l+d*c+u*o-t*r,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let i=this.x,a=this.y,l=this.z,u=e.elements;return this.x=u[0]*i+u[4]*a+u[8]*l,this.y=u[1]*i+u[5]*a+u[9]*l,this.z=u[2]*i+u[6]*a+u[10]*l,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,i){return this.x=W(this.x,e.x,i.x),this.y=W(this.y,e.y,i.y),this.z=W(this.z,e.z,i.z),this}clampScalar(e,i){return this.x=W(this.x,e,i),this.y=W(this.y,e,i),this.z=W(this.z,e,i),this}clampLength(e,i){let a=this.length();return this.divideScalar(a||1).multiplyScalar(W(a,e,i))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,i){return this.x+=(e.x-this.x)*i,this.y+=(e.y-this.y)*i,this.z+=(e.z-this.z)*i,this}lerpVectors(e,i,a){return this.x=e.x+(i.x-e.x)*a,this.y=e.y+(i.y-e.y)*a,this.z=e.z+(i.z-e.z)*a,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,i){let a=e.x,l=e.y,u=e.z,t=i.x,n=i.y,d=i.z;return this.x=l*d-u*n,this.y=u*t-a*d,this.z=a*n-l*t,this}projectOnVector(e){let i=e.lengthSq();if(i===0)return this.set(0,0,0);let a=e.dot(this)/i;return this.copy(e).multiplyScalar(a)}projectOnPlane(e){return zi.copy(this).projectOnVector(e),this.sub(zi)}reflect(e){return this.sub(zi.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let i=Math.sqrt(this.lengthSq()*e.lengthSq());if(i===0)return Math.PI/2;let a=this.dot(e)/i;return Math.acos(W(a,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let i=this.x-e.x,a=this.y-e.y,l=this.z-e.z;return i*i+a*a+l*l}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,i,a){let l=Math.sin(i)*e;return this.x=l*Math.sin(a),this.y=Math.cos(i)*e,this.z=l*Math.cos(a),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,i,a){return this.x=e*Math.sin(i),this.y=a,this.z=e*Math.cos(i),this}setFromMatrixPosition(e){let i=e.elements;return this.x=i[12],this.y=i[13],this.z=i[14],this}setFromMatrixScale(e){let i=this.setFromMatrixColumn(e,0).length(),a=this.setFromMatrixColumn(e,1).length(),l=this.setFromMatrixColumn(e,2).length();return this.x=i,this.y=a,this.z=l,this}setFromMatrixColumn(e,i){return this.fromArray(e.elements,i*4)}setFromMatrix3Column(e,i){return this.fromArray(e.elements,i*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,i=0){return this.x=e[i],this.y=e[i+1],this.z=e[i+2],this}toArray(e=[],i=0){return e[i]=this.x,e[i+1]=this.y,e[i+2]=this.z,e}fromBufferAttribute(e,i){return this.x=e.getX(i),this.y=e.getY(i),this.z=e.getZ(i),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,i=Math.random()*2-1,a=Math.sqrt(1-i*i);return this.x=a*Math.cos(e),this.y=i,this.z=a*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},zi=new N,Yn=new ae,z=class s{constructor(e,i,a,l,u,t,n,d,r){s.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,i,a,l,u,t,n,d,r)}set(e,i,a,l,u,t,n,d,r){let o=this.elements;return o[0]=e,o[1]=l,o[2]=n,o[3]=i,o[4]=u,o[5]=d,o[6]=a,o[7]=t,o[8]=r,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let i=this.elements,a=e.elements;return i[0]=a[0],i[1]=a[1],i[2]=a[2],i[3]=a[3],i[4]=a[4],i[5]=a[5],i[6]=a[6],i[7]=a[7],i[8]=a[8],this}extractBasis(e,i,a){return e.setFromMatrix3Column(this,0),i.setFromMatrix3Column(this,1),a.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let i=e.elements;return this.set(i[0],i[4],i[8],i[1],i[5],i[9],i[2],i[6],i[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,i){let a=e.elements,l=i.elements,u=this.elements,t=a[0],n=a[3],d=a[6],r=a[1],o=a[4],c=a[7],h=a[2],f=a[5],m=a[8],g=l[0],y=l[3],p=l[6],w=l[1],b=l[4],v=l[7],x=l[2],_=l[5],M=l[8];return u[0]=t*g+n*w+d*x,u[3]=t*y+n*b+d*_,u[6]=t*p+n*v+d*M,u[1]=r*g+o*w+c*x,u[4]=r*y+o*b+c*_,u[7]=r*p+o*v+c*M,u[2]=h*g+f*w+m*x,u[5]=h*y+f*b+m*_,u[8]=h*p+f*v+m*M,this}multiplyScalar(e){let i=this.elements;return i[0]*=e,i[3]*=e,i[6]*=e,i[1]*=e,i[4]*=e,i[7]*=e,i[2]*=e,i[5]*=e,i[8]*=e,this}determinant(){let e=this.elements,i=e[0],a=e[1],l=e[2],u=e[3],t=e[4],n=e[5],d=e[6],r=e[7],o=e[8];return i*t*o-i*n*r-a*u*o+a*n*d+l*u*r-l*t*d}invert(){let e=this.elements,i=e[0],a=e[1],l=e[2],u=e[3],t=e[4],n=e[5],d=e[6],r=e[7],o=e[8],c=o*t-n*r,h=n*d-o*u,f=r*u-t*d,m=i*c+a*h+l*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let g=1/m;return e[0]=c*g,e[1]=(l*r-o*a)*g,e[2]=(n*a-l*t)*g,e[3]=h*g,e[4]=(o*i-l*d)*g,e[5]=(l*u-n*i)*g,e[6]=f*g,e[7]=(a*d-r*i)*g,e[8]=(t*i-a*u)*g,this}transpose(){let e,i=this.elements;return e=i[1],i[1]=i[3],i[3]=e,e=i[2],i[2]=i[6],i[6]=e,e=i[5],i[5]=i[7],i[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let i=this.elements;return e[0]=i[0],e[1]=i[3],e[2]=i[6],e[3]=i[1],e[4]=i[4],e[5]=i[7],e[6]=i[2],e[7]=i[5],e[8]=i[8],this}setUvTransform(e,i,a,l,u,t,n){let d=Math.cos(u),r=Math.sin(u);return this.set(a*d,a*r,-a*(d*t+r*n)+t+e,-l*r,l*d,-l*(-r*t+d*n)+n+i,0,0,1),this}scale(e,i){return this.premultiply(Vi.makeScale(e,i)),this}rotate(e){return this.premultiply(Vi.makeRotation(-e)),this}translate(e,i){return this.premultiply(Vi.makeTranslation(e,i)),this}makeTranslation(e,i){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,i,0,0,1),this}makeRotation(e){let i=Math.cos(e),a=Math.sin(e);return this.set(i,-a,0,a,i,0,0,0,1),this}makeScale(e,i){return this.set(e,0,0,0,i,0,0,0,1),this}equals(e){let i=this.elements,a=e.elements;for(let l=0;l<9;l++)if(i[l]!==a[l])return!1;return!0}fromArray(e,i=0){for(let a=0;a<9;a++)this.elements[a]=e[a+i];return this}toArray(e=[],i=0){let a=this.elements;return e[i]=a[0],e[i+1]=a[1],e[i+2]=a[2],e[i+3]=a[3],e[i+4]=a[4],e[i+5]=a[5],e[i+6]=a[6],e[i+7]=a[7],e[i+8]=a[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Vi=new z,Zn=new z().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Jn=new z().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function vr(){let s={enabled:!0,workingColorSpace:tn,spaces:{},convert:function(l,u,t){return this.enabled===!1||u===t||!u||!t||(this.spaces[u].transfer===ui&&(l.r=Ie(l.r),l.g=Ie(l.g),l.b=Ie(l.b)),this.spaces[u].primaries!==this.spaces[t].primaries&&(l.applyMatrix3(this.spaces[u].toXYZ),l.applyMatrix3(this.spaces[t].fromXYZ)),this.spaces[t].transfer===ui&&(l.r=tt(l.r),l.g=tt(l.g),l.b=tt(l.b))),l},workingToColorSpace:function(l,u){return this.convert(l,this.workingColorSpace,u)},colorSpaceToWorking:function(l,u){return this.convert(l,u,this.workingColorSpace)},getPrimaries:function(l){return this.spaces[l].primaries},getTransfer:function(l){return l===yn?nn:this.spaces[l].transfer},getToneMappingMode:function(l){return this.spaces[l].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(l,u=this.workingColorSpace){return l.fromArray(this.spaces[u].luminanceCoefficients)},define:function(l){Object.assign(this.spaces,l)},_getMatrix:function(l,u,t){return l.copy(this.spaces[u].toXYZ).multiply(this.spaces[t].fromXYZ)},_getDrawingBufferColorSpace:function(l){return this.spaces[l].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(l=this.workingColorSpace){return this.spaces[l].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(l,u){return an("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(l,u)},toWorkingColorSpace:function(l,u){return an("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(l,u)}},e=[.64,.33,.3,.6,.15,.06],i=[.2126,.7152,.0722],a=[.3127,.329];return s.define({[tn]:{primaries:e,whitePoint:a,transfer:nn,toXYZ:Zn,fromXYZ:Jn,luminanceCoefficients:i,workingColorSpaceConfig:{unpackColorSpace:_e},outputColorSpaceConfig:{drawingBufferColorSpace:_e}},[_e]:{primaries:e,whitePoint:a,transfer:ui,toXYZ:Zn,fromXYZ:Jn,luminanceCoefficients:i,outputColorSpaceConfig:{drawingBufferColorSpace:_e}}}),s}var xe=vr();function Ie(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function tt(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}var Ze,fi=class{static getDataURL(e,i="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let a;if(e instanceof HTMLCanvasElement)a=e;else{Ze===void 0&&(Ze=rn("canvas")),Ze.width=e.width,Ze.height=e.height;let l=Ze.getContext("2d");e instanceof ImageData?l.putImageData(e,0,0):l.drawImage(e,0,0,e.width,e.height),a=Ze}return a.toDataURL(i)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let i=rn("canvas");i.width=e.width,i.height=e.height;let a=i.getContext("2d");a.drawImage(e,0,0,e.width,e.height);let l=a.getImageData(0,0,e.width,e.height),u=l.data;for(let t=0;t<u.length;t++)u[t]=Ie(u[t]/255)*255;return a.putImageData(l,0,0),i}else if(e.data){let i=e.data.slice(0);for(let a=0;a<i.length;a++)i instanceof Uint8Array||i instanceof Uint8ClampedArray?i[a]=Math.floor(Ie(i[a]/255)*255):i[a]=Ie(i[a]);return{data:i,width:e.width,height:e.height}}else return ee("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},br=0,pi=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:br++}),this.uuid=Ti(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let i=this.data;return typeof HTMLVideoElement<"u"&&i instanceof HTMLVideoElement?e.set(i.videoWidth,i.videoHeight,0):i instanceof VideoFrame?e.set(i.displayHeight,i.displayWidth,0):i!==null?e.set(i.width,i.height,i.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let i=e===void 0||typeof e=="string";if(!i&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let a={uuid:this.uuid,url:""},l=this.data;if(l!==null){let u;if(Array.isArray(l)){u=[];for(let t=0,n=l.length;t<n;t++)l[t].isDataTexture?u.push(Gi(l[t].image)):u.push(Gi(l[t]))}else u=Gi(l);a.url=u}return i||(e.images[this.uuid]=a),a}};function Gi(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?fi.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(ee("Texture: Unable to serialize Texture."),{})}var Mr=0,Hi=new N,nt=class s extends it{constructor(e=s.DEFAULT_IMAGE,i=s.DEFAULT_MAPPING,a=Ft,l=Ft,u=os,t=ls,n=us,d=cs,r=s.DEFAULT_ANISOTROPY,o=yn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Mr++}),this.uuid=Ti(),this.name="",this.source=new pi(e),this.mipmaps=[],this.mapping=i,this.channel=0,this.wrapS=a,this.wrapT=l,this.magFilter=u,this.minFilter=t,this.anisotropy=r,this.format=n,this.internalFormat=null,this.type=d,this.offset=new j(0,0),this.repeat=new j(1,1),this.center=new j(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new z,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=o,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Hi).x}get height(){return this.source.getSize(Hi).y}get depth(){return this.source.getSize(Hi).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,i){this.updateRanges.push({start:e,count:i})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let i in e){let a=e[i];if(a===void 0){ee(`Texture.setValues(): parameter '${i}' has value of undefined.`);continue}let l=this[i];if(l===void 0){ee(`Texture.setValues(): property '${i}' does not exist.`);continue}l&&a&&l.isVector2&&a.isVector2||l&&a&&l.isVector3&&a.isVector3||l&&a&&l.isMatrix3&&a.isMatrix3?l.copy(a):this[i]=a}}toJSON(e){let i=e===void 0||typeof e=="string";if(!i&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let a={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(a.userData=this.userData),i||(e.textures[this.uuid]=a),a}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==gn)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Zi:e.x=e.x-Math.floor(e.x);break;case Ft:e.x=e.x<0?0:1;break;case Ji:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Zi:e.y=e.y-Math.floor(e.y);break;case Ft:e.y=e.y<0?0:1;break;case Ji:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};nt.DEFAULT_IMAGE=null;nt.DEFAULT_MAPPING=gn;nt.DEFAULT_ANISOTROPY=1;var Ce=new N,$i=new N,ni=new N,ke=new N,Wi=new N,si=new N,qi=new N,Gt=class{constructor(e=new N,i=new N(0,0,-1)){this.origin=e,this.direction=i}set(e,i){return this.origin.copy(e),this.direction.copy(i),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,i){return i.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ce)),this}closestPointToPoint(e,i){i.subVectors(e,this.origin);let a=i.dot(this.direction);return a<0?i.copy(this.origin):i.copy(this.origin).addScaledVector(this.direction,a)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let i=Ce.subVectors(e,this.origin).dot(this.direction);return i<0?this.origin.distanceToSquared(e):(Ce.copy(this.origin).addScaledVector(this.direction,i),Ce.distanceToSquared(e))}distanceSqToSegment(e,i,a,l){$i.copy(e).add(i).multiplyScalar(.5),ni.copy(i).sub(e).normalize(),ke.copy(this.origin).sub($i);let u=e.distanceTo(i)*.5,t=-this.direction.dot(ni),n=ke.dot(this.direction),d=-ke.dot(ni),r=ke.lengthSq(),o=Math.abs(1-t*t),c,h,f,m;if(o>0)if(c=t*d-n,h=t*n-d,m=u*o,c>=0)if(h>=-m)if(h<=m){let g=1/o;c*=g,h*=g,f=c*(c+t*h+2*n)+h*(t*c+h+2*d)+r}else h=u,c=Math.max(0,-(t*h+n)),f=-c*c+h*(h+2*d)+r;else h=-u,c=Math.max(0,-(t*h+n)),f=-c*c+h*(h+2*d)+r;else h<=-m?(c=Math.max(0,-(-t*u+n)),h=c>0?-u:Math.min(Math.max(-u,-d),u),f=-c*c+h*(h+2*d)+r):h<=m?(c=0,h=Math.min(Math.max(-u,-d),u),f=h*(h+2*d)+r):(c=Math.max(0,-(t*u+n)),h=c>0?u:Math.min(Math.max(-u,-d),u),f=-c*c+h*(h+2*d)+r);else h=t>0?-u:u,c=Math.max(0,-(t*h+n)),f=-c*c+h*(h+2*d)+r;return a&&a.copy(this.origin).addScaledVector(this.direction,c),l&&l.copy($i).addScaledVector(ni,h),f}intersectSphere(e,i){Ce.subVectors(e.center,this.origin);let a=Ce.dot(this.direction),l=Ce.dot(Ce)-a*a,u=e.radius*e.radius;if(l>u)return null;let t=Math.sqrt(u-l),n=a-t,d=a+t;return d<0?null:n<0?this.at(d,i):this.at(n,i)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let i=e.normal.dot(this.direction);if(i===0)return e.distanceToPoint(this.origin)===0?0:null;let a=-(this.origin.dot(e.normal)+e.constant)/i;return a>=0?a:null}intersectPlane(e,i){let a=this.distanceToPlane(e);return a===null?null:this.at(a,i)}intersectsPlane(e){let i=e.distanceToPoint(this.origin);return i===0||e.normal.dot(this.direction)*i<0}intersectBox(e,i){let a,l,u,t,n,d,r=1/this.direction.x,o=1/this.direction.y,c=1/this.direction.z,h=this.origin;return r>=0?(a=(e.min.x-h.x)*r,l=(e.max.x-h.x)*r):(a=(e.max.x-h.x)*r,l=(e.min.x-h.x)*r),o>=0?(u=(e.min.y-h.y)*o,t=(e.max.y-h.y)*o):(u=(e.max.y-h.y)*o,t=(e.min.y-h.y)*o),a>t||u>l||((u>a||isNaN(a))&&(a=u),(t<l||isNaN(l))&&(l=t),c>=0?(n=(e.min.z-h.z)*c,d=(e.max.z-h.z)*c):(n=(e.max.z-h.z)*c,d=(e.min.z-h.z)*c),a>d||n>l)||((n>a||a!==a)&&(a=n),(d<l||l!==l)&&(l=d),l<0)?null:this.at(a>=0?a:l,i)}intersectsBox(e){return this.intersectBox(e,Ce)!==null}intersectTriangle(e,i,a,l,u){Wi.subVectors(i,e),si.subVectors(a,e),qi.crossVectors(Wi,si);let t=this.direction.dot(qi),n;if(t>0){if(l)return null;n=1}else if(t<0)n=-1,t=-t;else return null;ke.subVectors(this.origin,e);let d=n*this.direction.dot(si.crossVectors(ke,si));if(d<0)return null;let r=n*this.direction.dot(Wi.cross(ke));if(r<0||d+r>t)return null;let o=-n*ke.dot(qi);return o<0?null:this.at(o/t,u)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ie=class s{constructor(e,i,a,l,u,t,n,d,r,o,c,h,f,m,g,y){s.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,i,a,l,u,t,n,d,r,o,c,h,f,m,g,y)}set(e,i,a,l,u,t,n,d,r,o,c,h,f,m,g,y){let p=this.elements;return p[0]=e,p[4]=i,p[8]=a,p[12]=l,p[1]=u,p[5]=t,p[9]=n,p[13]=d,p[2]=r,p[6]=o,p[10]=c,p[14]=h,p[3]=f,p[7]=m,p[11]=g,p[15]=y,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new s().fromArray(this.elements)}copy(e){let i=this.elements,a=e.elements;return i[0]=a[0],i[1]=a[1],i[2]=a[2],i[3]=a[3],i[4]=a[4],i[5]=a[5],i[6]=a[6],i[7]=a[7],i[8]=a[8],i[9]=a[9],i[10]=a[10],i[11]=a[11],i[12]=a[12],i[13]=a[13],i[14]=a[14],i[15]=a[15],this}copyPosition(e){let i=this.elements,a=e.elements;return i[12]=a[12],i[13]=a[13],i[14]=a[14],this}setFromMatrix3(e){let i=e.elements;return this.set(i[0],i[3],i[6],0,i[1],i[4],i[7],0,i[2],i[5],i[8],0,0,0,0,1),this}extractBasis(e,i,a){return e.setFromMatrixColumn(this,0),i.setFromMatrixColumn(this,1),a.setFromMatrixColumn(this,2),this}makeBasis(e,i,a){return this.set(e.x,i.x,a.x,0,e.y,i.y,a.y,0,e.z,i.z,a.z,0,0,0,0,1),this}extractRotation(e){let i=this.elements,a=e.elements,l=1/Je.setFromMatrixColumn(e,0).length(),u=1/Je.setFromMatrixColumn(e,1).length(),t=1/Je.setFromMatrixColumn(e,2).length();return i[0]=a[0]*l,i[1]=a[1]*l,i[2]=a[2]*l,i[3]=0,i[4]=a[4]*u,i[5]=a[5]*u,i[6]=a[6]*u,i[7]=0,i[8]=a[8]*t,i[9]=a[9]*t,i[10]=a[10]*t,i[11]=0,i[12]=0,i[13]=0,i[14]=0,i[15]=1,this}makeRotationFromEuler(e){let i=this.elements,a=e.x,l=e.y,u=e.z,t=Math.cos(a),n=Math.sin(a),d=Math.cos(l),r=Math.sin(l),o=Math.cos(u),c=Math.sin(u);if(e.order==="XYZ"){let h=t*o,f=t*c,m=n*o,g=n*c;i[0]=d*o,i[4]=-d*c,i[8]=r,i[1]=f+m*r,i[5]=h-g*r,i[9]=-n*d,i[2]=g-h*r,i[6]=m+f*r,i[10]=t*d}else if(e.order==="YXZ"){let h=d*o,f=d*c,m=r*o,g=r*c;i[0]=h+g*n,i[4]=m*n-f,i[8]=t*r,i[1]=t*c,i[5]=t*o,i[9]=-n,i[2]=f*n-m,i[6]=g+h*n,i[10]=t*d}else if(e.order==="ZXY"){let h=d*o,f=d*c,m=r*o,g=r*c;i[0]=h-g*n,i[4]=-t*c,i[8]=m+f*n,i[1]=f+m*n,i[5]=t*o,i[9]=g-h*n,i[2]=-t*r,i[6]=n,i[10]=t*d}else if(e.order==="ZYX"){let h=t*o,f=t*c,m=n*o,g=n*c;i[0]=d*o,i[4]=m*r-f,i[8]=h*r+g,i[1]=d*c,i[5]=g*r+h,i[9]=f*r-m,i[2]=-r,i[6]=n*d,i[10]=t*d}else if(e.order==="YZX"){let h=t*d,f=t*r,m=n*d,g=n*r;i[0]=d*o,i[4]=g-h*c,i[8]=m*c+f,i[1]=c,i[5]=t*o,i[9]=-n*o,i[2]=-r*o,i[6]=f*c+m,i[10]=h-g*c}else if(e.order==="XZY"){let h=t*d,f=t*r,m=n*d,g=n*r;i[0]=d*o,i[4]=-c,i[8]=r*o,i[1]=h*c+g,i[5]=t*o,i[9]=f*c-m,i[2]=m*c-f,i[6]=n*o,i[10]=g*c+h}return i[3]=0,i[7]=0,i[11]=0,i[12]=0,i[13]=0,i[14]=0,i[15]=1,this}makeRotationFromQuaternion(e){return this.compose(wr,e,Sr)}lookAt(e,i,a){let l=this.elements;return ge.subVectors(e,i),ge.lengthSq()===0&&(ge.z=1),ge.normalize(),Be.crossVectors(a,ge),Be.lengthSq()===0&&(Math.abs(a.z)===1?ge.x+=1e-4:ge.z+=1e-4,ge.normalize(),Be.crossVectors(a,ge)),Be.normalize(),ri.crossVectors(ge,Be),l[0]=Be.x,l[4]=ri.x,l[8]=ge.x,l[1]=Be.y,l[5]=ri.y,l[9]=ge.y,l[2]=Be.z,l[6]=ri.z,l[10]=ge.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,i){let a=e.elements,l=i.elements,u=this.elements,t=a[0],n=a[4],d=a[8],r=a[12],o=a[1],c=a[5],h=a[9],f=a[13],m=a[2],g=a[6],y=a[10],p=a[14],w=a[3],b=a[7],v=a[11],x=a[15],_=l[0],M=l[4],B=l[8],A=l[12],P=l[1],C=l[5],L=l[9],G=l[13],k=l[2],S=l[6],I=l[10],F=l[14],E=l[3],T=l[7],O=l[11],le=l[15];return u[0]=t*_+n*P+d*k+r*E,u[4]=t*M+n*C+d*S+r*T,u[8]=t*B+n*L+d*I+r*O,u[12]=t*A+n*G+d*F+r*le,u[1]=o*_+c*P+h*k+f*E,u[5]=o*M+c*C+h*S+f*T,u[9]=o*B+c*L+h*I+f*O,u[13]=o*A+c*G+h*F+f*le,u[2]=m*_+g*P+y*k+p*E,u[6]=m*M+g*C+y*S+p*T,u[10]=m*B+g*L+y*I+p*O,u[14]=m*A+g*G+y*F+p*le,u[3]=w*_+b*P+v*k+x*E,u[7]=w*M+b*C+v*S+x*T,u[11]=w*B+b*L+v*I+x*O,u[15]=w*A+b*G+v*F+x*le,this}multiplyScalar(e){let i=this.elements;return i[0]*=e,i[4]*=e,i[8]*=e,i[12]*=e,i[1]*=e,i[5]*=e,i[9]*=e,i[13]*=e,i[2]*=e,i[6]*=e,i[10]*=e,i[14]*=e,i[3]*=e,i[7]*=e,i[11]*=e,i[15]*=e,this}determinant(){let e=this.elements,i=e[0],a=e[4],l=e[8],u=e[12],t=e[1],n=e[5],d=e[9],r=e[13],o=e[2],c=e[6],h=e[10],f=e[14],m=e[3],g=e[7],y=e[11],p=e[15];return m*(+u*d*c-l*r*c-u*n*h+a*r*h+l*n*f-a*d*f)+g*(+i*d*f-i*r*h+u*t*h-l*t*f+l*r*o-u*d*o)+y*(+i*r*c-i*n*f-u*t*c+a*t*f+u*n*o-a*r*o)+p*(-l*n*o-i*d*c+i*n*h+l*t*c-a*t*h+a*d*o)}transpose(){let e=this.elements,i;return i=e[1],e[1]=e[4],e[4]=i,i=e[2],e[2]=e[8],e[8]=i,i=e[6],e[6]=e[9],e[9]=i,i=e[3],e[3]=e[12],e[12]=i,i=e[7],e[7]=e[13],e[13]=i,i=e[11],e[11]=e[14],e[14]=i,this}setPosition(e,i,a){let l=this.elements;return e.isVector3?(l[12]=e.x,l[13]=e.y,l[14]=e.z):(l[12]=e,l[13]=i,l[14]=a),this}invert(){let e=this.elements,i=e[0],a=e[1],l=e[2],u=e[3],t=e[4],n=e[5],d=e[6],r=e[7],o=e[8],c=e[9],h=e[10],f=e[11],m=e[12],g=e[13],y=e[14],p=e[15],w=c*y*r-g*h*r+g*d*f-n*y*f-c*d*p+n*h*p,b=m*h*r-o*y*r-m*d*f+t*y*f+o*d*p-t*h*p,v=o*g*r-m*c*r+m*n*f-t*g*f-o*n*p+t*c*p,x=m*c*d-o*g*d-m*n*h+t*g*h+o*n*y-t*c*y,_=i*w+a*b+l*v+u*x;if(_===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let M=1/_;return e[0]=w*M,e[1]=(g*h*u-c*y*u-g*l*f+a*y*f+c*l*p-a*h*p)*M,e[2]=(n*y*u-g*d*u+g*l*r-a*y*r-n*l*p+a*d*p)*M,e[3]=(c*d*u-n*h*u-c*l*r+a*h*r+n*l*f-a*d*f)*M,e[4]=b*M,e[5]=(o*y*u-m*h*u+m*l*f-i*y*f-o*l*p+i*h*p)*M,e[6]=(m*d*u-t*y*u-m*l*r+i*y*r+t*l*p-i*d*p)*M,e[7]=(t*h*u-o*d*u+o*l*r-i*h*r-t*l*f+i*d*f)*M,e[8]=v*M,e[9]=(m*c*u-o*g*u-m*a*f+i*g*f+o*a*p-i*c*p)*M,e[10]=(t*g*u-m*n*u+m*a*r-i*g*r-t*a*p+i*n*p)*M,e[11]=(o*n*u-t*c*u-o*a*r+i*c*r+t*a*f-i*n*f)*M,e[12]=x*M,e[13]=(o*g*l-m*c*l+m*a*h-i*g*h-o*a*y+i*c*y)*M,e[14]=(m*n*l-t*g*l-m*a*d+i*g*d+t*a*y-i*n*y)*M,e[15]=(t*c*l-o*n*l+o*a*d-i*c*d-t*a*h+i*n*h)*M,this}scale(e){let i=this.elements,a=e.x,l=e.y,u=e.z;return i[0]*=a,i[4]*=l,i[8]*=u,i[1]*=a,i[5]*=l,i[9]*=u,i[2]*=a,i[6]*=l,i[10]*=u,i[3]*=a,i[7]*=l,i[11]*=u,this}getMaxScaleOnAxis(){let e=this.elements,i=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],a=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],l=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(i,a,l))}makeTranslation(e,i,a){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,i,0,0,1,a,0,0,0,1),this}makeRotationX(e){let i=Math.cos(e),a=Math.sin(e);return this.set(1,0,0,0,0,i,-a,0,0,a,i,0,0,0,0,1),this}makeRotationY(e){let i=Math.cos(e),a=Math.sin(e);return this.set(i,0,a,0,0,1,0,0,-a,0,i,0,0,0,0,1),this}makeRotationZ(e){let i=Math.cos(e),a=Math.sin(e);return this.set(i,-a,0,0,a,i,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,i){let a=Math.cos(i),l=Math.sin(i),u=1-a,t=e.x,n=e.y,d=e.z,r=u*t,o=u*n;return this.set(r*t+a,r*n-l*d,r*d+l*n,0,r*n+l*d,o*n+a,o*d-l*t,0,r*d-l*n,o*d+l*t,u*d*d+a,0,0,0,0,1),this}makeScale(e,i,a){return this.set(e,0,0,0,0,i,0,0,0,0,a,0,0,0,0,1),this}makeShear(e,i,a,l,u,t){return this.set(1,a,u,0,e,1,t,0,i,l,1,0,0,0,0,1),this}compose(e,i,a){let l=this.elements,u=i._x,t=i._y,n=i._z,d=i._w,r=u+u,o=t+t,c=n+n,h=u*r,f=u*o,m=u*c,g=t*o,y=t*c,p=n*c,w=d*r,b=d*o,v=d*c,x=a.x,_=a.y,M=a.z;return l[0]=(1-(g+p))*x,l[1]=(f+v)*x,l[2]=(m-b)*x,l[3]=0,l[4]=(f-v)*_,l[5]=(1-(h+p))*_,l[6]=(y+w)*_,l[7]=0,l[8]=(m+b)*M,l[9]=(y-w)*M,l[10]=(1-(h+g))*M,l[11]=0,l[12]=e.x,l[13]=e.y,l[14]=e.z,l[15]=1,this}decompose(e,i,a){let l=this.elements,u=Je.set(l[0],l[1],l[2]).length(),t=Je.set(l[4],l[5],l[6]).length(),n=Je.set(l[8],l[9],l[10]).length();this.determinant()<0&&(u=-u),e.x=l[12],e.y=l[13],e.z=l[14],Me.copy(this);let r=1/u,o=1/t,c=1/n;return Me.elements[0]*=r,Me.elements[1]*=r,Me.elements[2]*=r,Me.elements[4]*=o,Me.elements[5]*=o,Me.elements[6]*=o,Me.elements[8]*=c,Me.elements[9]*=c,Me.elements[10]*=c,i.setFromRotationMatrix(Me),a.x=u,a.y=t,a.z=n,this}makePerspective(e,i,a,l,u,t,n=et,d=!1){let r=this.elements,o=2*u/(i-e),c=2*u/(a-l),h=(i+e)/(i-e),f=(a+l)/(a-l),m,g;if(d)m=u/(t-u),g=t*u/(t-u);else if(n===et)m=-(t+u)/(t-u),g=-2*t*u/(t-u);else if(n===sn)m=-t/(t-u),g=-t*u/(t-u);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+n);return r[0]=o,r[4]=0,r[8]=h,r[12]=0,r[1]=0,r[5]=c,r[9]=f,r[13]=0,r[2]=0,r[6]=0,r[10]=m,r[14]=g,r[3]=0,r[7]=0,r[11]=-1,r[15]=0,this}makeOrthographic(e,i,a,l,u,t,n=et,d=!1){let r=this.elements,o=2/(i-e),c=2/(a-l),h=-(i+e)/(i-e),f=-(a+l)/(a-l),m,g;if(d)m=1/(t-u),g=t/(t-u);else if(n===et)m=-2/(t-u),g=-(t+u)/(t-u);else if(n===sn)m=-1/(t-u),g=-u/(t-u);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+n);return r[0]=o,r[4]=0,r[8]=0,r[12]=h,r[1]=0,r[5]=c,r[9]=0,r[13]=f,r[2]=0,r[6]=0,r[10]=m,r[14]=g,r[3]=0,r[7]=0,r[11]=0,r[15]=1,this}equals(e){let i=this.elements,a=e.elements;for(let l=0;l<16;l++)if(i[l]!==a[l])return!1;return!0}fromArray(e,i=0){for(let a=0;a<16;a++)this.elements[a]=e[a+i];return this}toArray(e=[],i=0){let a=this.elements;return e[i]=a[0],e[i+1]=a[1],e[i+2]=a[2],e[i+3]=a[3],e[i+4]=a[4],e[i+5]=a[5],e[i+6]=a[6],e[i+7]=a[7],e[i+8]=a[8],e[i+9]=a[9],e[i+10]=a[10],e[i+11]=a[11],e[i+12]=a[12],e[i+13]=a[13],e[i+14]=a[14],e[i+15]=a[15],e}},Je=new N,Me=new ie,wr=new N(0,0,0),Sr=new N(1,1,1),Be=new N,ri=new N,ge=new N,Kn=new ie,Qn=new ae,De=class s{constructor(e=0,i=0,a=0,l=s.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=i,this._z=a,this._order=l}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,i,a,l=this._order){return this._x=e,this._y=i,this._z=a,this._order=l,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,i=this._order,a=!0){let l=e.elements,u=l[0],t=l[4],n=l[8],d=l[1],r=l[5],o=l[9],c=l[2],h=l[6],f=l[10];switch(i){case"XYZ":this._y=Math.asin(W(n,-1,1)),Math.abs(n)<.9999999?(this._x=Math.atan2(-o,f),this._z=Math.atan2(-t,u)):(this._x=Math.atan2(h,r),this._z=0);break;case"YXZ":this._x=Math.asin(-W(o,-1,1)),Math.abs(o)<.9999999?(this._y=Math.atan2(n,f),this._z=Math.atan2(d,r)):(this._y=Math.atan2(-c,u),this._z=0);break;case"ZXY":this._x=Math.asin(W(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-c,f),this._z=Math.atan2(-t,r)):(this._y=0,this._z=Math.atan2(d,u));break;case"ZYX":this._y=Math.asin(-W(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(h,f),this._z=Math.atan2(d,u)):(this._x=0,this._z=Math.atan2(-t,r));break;case"YZX":this._z=Math.asin(W(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-o,r),this._y=Math.atan2(-c,u)):(this._x=0,this._y=Math.atan2(n,f));break;case"XZY":this._z=Math.asin(-W(t,-1,1)),Math.abs(t)<.9999999?(this._x=Math.atan2(h,r),this._y=Math.atan2(n,u)):(this._x=Math.atan2(-o,f),this._y=0);break;default:ee("Euler: .setFromRotationMatrix() encountered an unknown order: "+i)}return this._order=i,a===!0&&this._onChangeCallback(),this}setFromQuaternion(e,i,a){return Kn.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Kn,i,a)}setFromVector3(e,i=this._order){return this.set(e.x,e.y,e.z,i)}reorder(e){return Qn.setFromEuler(this),this.setFromQuaternion(Qn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],i=0){return e[i]=this._x,e[i+1]=this._y,e[i+2]=this._z,e[i+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};De.DEFAULT_ORDER="XYZ";var mi=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Ar=0,es=new N,Ke=new ae,Re=new ie,ai=new N,Ut=new N,Tr=new N,Er=new ae,ts=new N(1,0,0),is=new N(0,1,0),ns=new N(0,0,1),ss={type:"added"},Pr={type:"removed"},Qe={type:"childadded",child:null},Xi={type:"childremoved",child:null},Ee=class s extends it{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ar++}),this.uuid=Ti(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=s.DEFAULT_UP.clone();let e=new N,i=new De,a=new ae,l=new N(1,1,1);function u(){a.setFromEuler(i,!1)}function t(){i.setFromQuaternion(a,void 0,!1)}i._onChange(u),a._onChange(t),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:i},quaternion:{configurable:!0,enumerable:!0,value:a},scale:{configurable:!0,enumerable:!0,value:l},modelViewMatrix:{value:new ie},normalMatrix:{value:new z}}),this.matrix=new ie,this.matrixWorld=new ie,this.matrixAutoUpdate=s.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=s.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new mi,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,i){this.quaternion.setFromAxisAngle(e,i)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,i){return Ke.setFromAxisAngle(e,i),this.quaternion.multiply(Ke),this}rotateOnWorldAxis(e,i){return Ke.setFromAxisAngle(e,i),this.quaternion.premultiply(Ke),this}rotateX(e){return this.rotateOnAxis(ts,e)}rotateY(e){return this.rotateOnAxis(is,e)}rotateZ(e){return this.rotateOnAxis(ns,e)}translateOnAxis(e,i){return es.copy(e).applyQuaternion(this.quaternion),this.position.add(es.multiplyScalar(i)),this}translateX(e){return this.translateOnAxis(ts,e)}translateY(e){return this.translateOnAxis(is,e)}translateZ(e){return this.translateOnAxis(ns,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Re.copy(this.matrixWorld).invert())}lookAt(e,i,a){e.isVector3?ai.copy(e):ai.set(e,i,a);let l=this.parent;this.updateWorldMatrix(!0,!1),Ut.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Re.lookAt(Ut,ai,this.up):Re.lookAt(ai,Ut,this.up),this.quaternion.setFromRotationMatrix(Re),l&&(Re.extractRotation(l.matrixWorld),Ke.setFromRotationMatrix(Re),this.quaternion.premultiply(Ke.invert()))}add(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.add(arguments[i]);return this}return e===this?(Q("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ss),Qe.child=e,this.dispatchEvent(Qe),Qe.child=null):Q("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let a=0;a<arguments.length;a++)this.remove(arguments[a]);return this}let i=this.children.indexOf(e);return i!==-1&&(e.parent=null,this.children.splice(i,1),e.dispatchEvent(Pr),Xi.child=e,this.dispatchEvent(Xi),Xi.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Re.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Re.multiply(e.parent.matrixWorld)),e.applyMatrix4(Re),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ss),Qe.child=e,this.dispatchEvent(Qe),Qe.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,i){if(this[e]===i)return this;for(let a=0,l=this.children.length;a<l;a++){let t=this.children[a].getObjectByProperty(e,i);if(t!==void 0)return t}}getObjectsByProperty(e,i,a=[]){this[e]===i&&a.push(this);let l=this.children;for(let u=0,t=l.length;u<t;u++)l[u].getObjectsByProperty(e,i,a);return a}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ut,e,Tr),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ut,Er,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let i=this.matrixWorld.elements;return e.set(i[8],i[9],i[10]).normalize()}raycast(){}traverse(e){e(this);let i=this.children;for(let a=0,l=i.length;a<l;a++)i[a].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let i=this.children;for(let a=0,l=i.length;a<l;a++)i[a].traverseVisible(e)}traverseAncestors(e){let i=this.parent;i!==null&&(e(i),i.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let i=this.children;for(let a=0,l=i.length;a<l;a++)i[a].updateMatrixWorld(e)}updateWorldMatrix(e,i){let a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),i===!0){let l=this.children;for(let u=0,t=l.length;u<t;u++)l[u].updateWorldMatrix(!1,!0)}}toJSON(e){let i=e===void 0||typeof e=="string",a={};i&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},a.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let l={};l.uuid=this.uuid,l.type=this.type,this.name!==""&&(l.name=this.name),this.castShadow===!0&&(l.castShadow=!0),this.receiveShadow===!0&&(l.receiveShadow=!0),this.visible===!1&&(l.visible=!1),this.frustumCulled===!1&&(l.frustumCulled=!1),this.renderOrder!==0&&(l.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(l.userData=this.userData),l.layers=this.layers.mask,l.matrix=this.matrix.toArray(),l.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(l.matrixAutoUpdate=!1),this.isInstancedMesh&&(l.type="InstancedMesh",l.count=this.count,l.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(l.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(l.type="BatchedMesh",l.perObjectFrustumCulled=this.perObjectFrustumCulled,l.sortObjects=this.sortObjects,l.drawRanges=this._drawRanges,l.reservedRanges=this._reservedRanges,l.geometryInfo=this._geometryInfo.map(n=>({...n,boundingBox:n.boundingBox?n.boundingBox.toJSON():void 0,boundingSphere:n.boundingSphere?n.boundingSphere.toJSON():void 0})),l.instanceInfo=this._instanceInfo.map(n=>({...n})),l.availableInstanceIds=this._availableInstanceIds.slice(),l.availableGeometryIds=this._availableGeometryIds.slice(),l.nextIndexStart=this._nextIndexStart,l.nextVertexStart=this._nextVertexStart,l.geometryCount=this._geometryCount,l.maxInstanceCount=this._maxInstanceCount,l.maxVertexCount=this._maxVertexCount,l.maxIndexCount=this._maxIndexCount,l.geometryInitialized=this._geometryInitialized,l.matricesTexture=this._matricesTexture.toJSON(e),l.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(l.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(l.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(l.boundingBox=this.boundingBox.toJSON()));function u(n,d){return n[d.uuid]===void 0&&(n[d.uuid]=d.toJSON(e)),d.uuid}if(this.isScene)this.background&&(this.background.isColor?l.background=this.background.toJSON():this.background.isTexture&&(l.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(l.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){l.geometry=u(e.geometries,this.geometry);let n=this.geometry.parameters;if(n!==void 0&&n.shapes!==void 0){let d=n.shapes;if(Array.isArray(d))for(let r=0,o=d.length;r<o;r++){let c=d[r];u(e.shapes,c)}else u(e.shapes,d)}}if(this.isSkinnedMesh&&(l.bindMode=this.bindMode,l.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(u(e.skeletons,this.skeleton),l.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let n=[];for(let d=0,r=this.material.length;d<r;d++)n.push(u(e.materials,this.material[d]));l.material=n}else l.material=u(e.materials,this.material);if(this.children.length>0){l.children=[];for(let n=0;n<this.children.length;n++)l.children.push(this.children[n].toJSON(e).object)}if(this.animations.length>0){l.animations=[];for(let n=0;n<this.animations.length;n++){let d=this.animations[n];l.animations.push(u(e.animations,d))}}if(i){let n=t(e.geometries),d=t(e.materials),r=t(e.textures),o=t(e.images),c=t(e.shapes),h=t(e.skeletons),f=t(e.animations),m=t(e.nodes);n.length>0&&(a.geometries=n),d.length>0&&(a.materials=d),r.length>0&&(a.textures=r),o.length>0&&(a.images=o),c.length>0&&(a.shapes=c),h.length>0&&(a.skeletons=h),f.length>0&&(a.animations=f),m.length>0&&(a.nodes=m)}return a.object=l,a;function t(n){let d=[];for(let r in n){let o=n[r];delete o.metadata,d.push(o)}return d}}clone(e){return new this.constructor().copy(this,e)}copy(e,i=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),i===!0)for(let a=0;a<e.children.length;a++){let l=e.children[a];this.add(l.clone())}return this}};Ee.DEFAULT_UP=new N(0,1,0);Ee.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ee.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var hs={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ze={h:0,s:0,l:0},oi={h:0,s:0,l:0};function ji(s,e,i){return i<0&&(i+=1),i>1&&(i-=1),i<1/6?s+(e-s)*6*i:i<1/2?e:i<2/3?s+(e-s)*6*(2/3-i):s}var te=class{constructor(e,i,a){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,i,a)}set(e,i,a){if(i===void 0&&a===void 0){let l=e;l&&l.isColor?this.copy(l):typeof l=="number"?this.setHex(l):typeof l=="string"&&this.setStyle(l)}else this.setRGB(e,i,a);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,i=_e){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,xe.colorSpaceToWorking(this,i),this}setRGB(e,i,a,l=xe.workingColorSpace){return this.r=e,this.g=i,this.b=a,xe.colorSpaceToWorking(this,l),this}setHSL(e,i,a,l=xe.workingColorSpace){if(e=xn(e,1),i=W(i,0,1),a=W(a,0,1),i===0)this.r=this.g=this.b=a;else{let u=a<=.5?a*(1+i):a+i-a*i,t=2*a-u;this.r=ji(t,u,e+1/3),this.g=ji(t,u,e),this.b=ji(t,u,e-1/3)}return xe.colorSpaceToWorking(this,l),this}setStyle(e,i=_e){function a(u){u!==void 0&&parseFloat(u)<1&&ee("Color: Alpha component of "+e+" will be ignored.")}let l;if(l=/^(\w+)\(([^\)]*)\)/.exec(e)){let u,t=l[1],n=l[2];switch(t){case"rgb":case"rgba":if(u=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(n))return a(u[4]),this.setRGB(Math.min(255,parseInt(u[1],10))/255,Math.min(255,parseInt(u[2],10))/255,Math.min(255,parseInt(u[3],10))/255,i);if(u=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(n))return a(u[4]),this.setRGB(Math.min(100,parseInt(u[1],10))/100,Math.min(100,parseInt(u[2],10))/100,Math.min(100,parseInt(u[3],10))/100,i);break;case"hsl":case"hsla":if(u=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(n))return a(u[4]),this.setHSL(parseFloat(u[1])/360,parseFloat(u[2])/100,parseFloat(u[3])/100,i);break;default:ee("Color: Unknown color model "+e)}}else if(l=/^\#([A-Fa-f\d]+)$/.exec(e)){let u=l[1],t=u.length;if(t===3)return this.setRGB(parseInt(u.charAt(0),16)/15,parseInt(u.charAt(1),16)/15,parseInt(u.charAt(2),16)/15,i);if(t===6)return this.setHex(parseInt(u,16),i);ee("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,i);return this}setColorName(e,i=_e){let a=hs[e.toLowerCase()];return a!==void 0?this.setHex(a,i):ee("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ie(e.r),this.g=Ie(e.g),this.b=Ie(e.b),this}copyLinearToSRGB(e){return this.r=tt(e.r),this.g=tt(e.g),this.b=tt(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=_e){return xe.workingToColorSpace(re.copy(this),e),Math.round(W(re.r*255,0,255))*65536+Math.round(W(re.g*255,0,255))*256+Math.round(W(re.b*255,0,255))}getHexString(e=_e){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,i=xe.workingColorSpace){xe.workingToColorSpace(re.copy(this),i);let a=re.r,l=re.g,u=re.b,t=Math.max(a,l,u),n=Math.min(a,l,u),d,r,o=(n+t)/2;if(n===t)d=0,r=0;else{let c=t-n;switch(r=o<=.5?c/(t+n):c/(2-t-n),t){case a:d=(l-u)/c+(l<u?6:0);break;case l:d=(u-a)/c+2;break;case u:d=(a-l)/c+4;break}d/=6}return e.h=d,e.s=r,e.l=o,e}getRGB(e,i=xe.workingColorSpace){return xe.workingToColorSpace(re.copy(this),i),e.r=re.r,e.g=re.g,e.b=re.b,e}getStyle(e=_e){xe.workingToColorSpace(re.copy(this),e);let i=re.r,a=re.g,l=re.b;return e!==_e?`color(${e} ${i.toFixed(3)} ${a.toFixed(3)} ${l.toFixed(3)})`:`rgb(${Math.round(i*255)},${Math.round(a*255)},${Math.round(l*255)})`}offsetHSL(e,i,a){return this.getHSL(ze),this.setHSL(ze.h+e,ze.s+i,ze.l+a)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,i){return this.r=e.r+i.r,this.g=e.g+i.g,this.b=e.b+i.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,i){return this.r+=(e.r-this.r)*i,this.g+=(e.g-this.g)*i,this.b+=(e.b-this.b)*i,this}lerpColors(e,i,a){return this.r=e.r+(i.r-e.r)*a,this.g=e.g+(i.g-e.g)*a,this.b=e.b+(i.b-e.b)*a,this}lerpHSL(e,i){this.getHSL(ze),e.getHSL(oi);let a=Bt(ze.h,oi.h,i),l=Bt(ze.s,oi.s,i),u=Bt(ze.l,oi.l,i);return this.setHSL(a,l,u),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let i=this.r,a=this.g,l=this.b,u=e.elements;return this.r=u[0]*i+u[3]*a+u[6]*l,this.g=u[1]*i+u[4]*a+u[7]*l,this.b=u[2]*i+u[5]*a+u[8]*l,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,i=0){return this.r=e[i],this.g=e[i+1],this.b=e[i+2],this}toArray(e=[],i=0){return e[i]=this.r,e[i+1]=this.g,e[i+2]=this.b,e}fromBufferAttribute(e,i){return this.r=e.getX(i),this.g=e.getY(i),this.b=e.getZ(i),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},re=new te;te.NAMES=hs;function ds(s){let e={};for(let i in s){e[i]={};for(let a in s[i]){let l=s[i][a];l&&(l.isColor||l.isMatrix3||l.isMatrix4||l.isVector2||l.isVector3||l.isVector4||l.isTexture||l.isQuaternion)?l.isRenderTargetTexture?(ee("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[i][a]=null):e[i][a]=l.clone():Array.isArray(l)?e[i][a]=l.slice():e[i][a]=l}}return e}function ce(s){let e={};for(let i=0;i<s.length;i++){let a=ds(s[i]);for(let l in a)e[l]=a[l]}return e}var gi=class extends Ee{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ie,this.projectionMatrix=new ie,this.projectionMatrixInverse=new ie,this.coordinateSystem=et,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,i){return super.copy(e,i),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,i){super.updateWorldMatrix(e,i),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},Ve=new N,rs=new j,as=new j,Ht=class extends gi{constructor(e=50,i=1,a=.1,l=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=a,this.far=l,this.focus=10,this.aspect=i,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,i){return super.copy(e,i),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let i=.5*this.getFilmHeight()/e;this.fov=Vt*2*Math.atan(i),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(kt*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Vt*2*Math.atan(Math.tan(kt*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,i,a){Ve.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Ve.x,Ve.y).multiplyScalar(-e/Ve.z),Ve.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),a.set(Ve.x,Ve.y).multiplyScalar(-e/Ve.z)}getViewSize(e,i){return this.getViewBounds(e,rs,as),i.subVectors(as,rs)}setViewOffset(e,i,a,l,u,t){this.aspect=e/i,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=i,this.view.offsetX=a,this.view.offsetY=l,this.view.width=u,this.view.height=t,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,i=e*Math.tan(kt*.5*this.fov)/this.zoom,a=2*i,l=this.aspect*a,u=-.5*l,t=this.view;if(this.view!==null&&this.view.enabled){let d=t.fullWidth,r=t.fullHeight;u+=t.offsetX*l/d,i-=t.offsetY*a/r,l*=t.width/d,a*=t.height/r}let n=this.filmOffset;n!==0&&(u+=e*n/this.getFilmWidth()),this.projectionMatrix.makePerspective(u,u+l,i,i-a,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let i=super.toJSON(e);return i.object.fov=this.fov,i.object.zoom=this.zoom,i.object.near=this.near,i.object.far=this.far,i.object.focus=this.focus,i.object.aspect=this.aspect,this.view!==null&&(i.object.view=Object.assign({},this.view)),i.object.filmGauge=this.filmGauge,i.object.filmOffset=this.filmOffset,i}};var $t=class extends Ee{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new De,this.environmentIntensity=1,this.environmentRotation=new De,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,i){return super.copy(e,i),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let i=super.toJSON(e);return this.fog!==null&&(i.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(i.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(i.object.backgroundIntensity=this.backgroundIntensity),i.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(i.object.environmentIntensity=this.environmentIntensity),i.object.environmentRotation=this.environmentRotation.toArray(),i}};var Yi=new N,Cr=new N,Rr=new z,Wt=class{constructor(e=new N(1,0,0),i=0){this.isPlane=!0,this.normal=e,this.constant=i}set(e,i){return this.normal.copy(e),this.constant=i,this}setComponents(e,i,a,l){return this.normal.set(e,i,a),this.constant=l,this}setFromNormalAndCoplanarPoint(e,i){return this.normal.copy(e),this.constant=-i.dot(this.normal),this}setFromCoplanarPoints(e,i,a){let l=Yi.subVectors(a,i).cross(Cr.subVectors(e,i)).normalize();return this.setFromNormalAndCoplanarPoint(l,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,i){return i.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,i){let a=e.delta(Yi),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?i.copy(e.start):null;let u=-(e.start.dot(this.normal)+this.constant)/l;return u<0||u>1?null:i.copy(e.start).addScaledVector(a,u)}intersectsLine(e){let i=this.distanceToPoint(e.start),a=this.distanceToPoint(e.end);return i<0&&a>0||a<0&&i>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,i){let a=i||Rr.getNormalMatrix(e),l=this.coplanarPoint(Yi).applyMatrix4(e),u=this.normal.applyMatrix3(a).normalize();return this.constant=-l.dot(u),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}};function li(s,e){return!s||s.constructor===e?s:typeof e.BYTES_PER_ELEMENT=="number"?new e(s):Array.prototype.slice.call(s)}function Ir(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}var qe=class{constructor(e,i,a,l){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=l!==void 0?l:new i.constructor(a),this.sampleValues=i,this.valueSize=a,this.settings=null,this.DefaultSettings_={}}evaluate(e){let i=this.parameterPositions,a=this._cachedIndex,l=i[a],u=i[a-1];e:{t:{let t;i:{n:if(!(e<l)){for(let n=a+2;;){if(l===void 0){if(e<u)break n;return a=i.length,this._cachedIndex=a,this.copySampleValue_(a-1)}if(a===n)break;if(u=l,l=i[++a],e<l)break t}t=i.length;break i}if(!(e>=u)){let n=i[1];e<n&&(a=2,u=n);for(let d=a-2;;){if(u===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(a===d)break;if(l=u,u=i[--a-1],e>=u)break t}t=a,a=0;break i}break e}for(;a<t;){let n=a+t>>>1;e<i[n]?t=n:a=n+1}if(l=i[a],u=i[a-1],u===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(l===void 0)return a=i.length,this._cachedIndex=a,this.copySampleValue_(a-1)}this._cachedIndex=a,this.intervalChanged_(a,u,l)}return this.interpolate_(a,u,e,l)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let i=this.resultBuffer,a=this.sampleValues,l=this.valueSize,u=e*l;for(let t=0;t!==l;++t)i[t]=a[u+t];return i}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},yi=class extends qe{constructor(e,i,a,l){super(e,i,a,l),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Ki,endingEnd:Ki}}intervalChanged_(e,i,a){let l=this.parameterPositions,u=e-2,t=e+1,n=l[u],d=l[t];if(n===void 0)switch(this.getSettings_().endingStart){case Qi:u=e,n=2*i-a;break;case en:u=l.length-2,n=i+l[u]-l[u+1];break;default:u=e,n=a}if(d===void 0)switch(this.getSettings_().endingEnd){case Qi:t=e,d=2*a-i;break;case en:t=1,d=a+l[1]-l[0];break;default:t=e-1,d=i}let r=(a-i)*.5,o=this.valueSize;this._weightPrev=r/(i-n),this._weightNext=r/(d-a),this._offsetPrev=u*o,this._offsetNext=t*o}interpolate_(e,i,a,l){let u=this.resultBuffer,t=this.sampleValues,n=this.valueSize,d=e*n,r=d-n,o=this._offsetPrev,c=this._offsetNext,h=this._weightPrev,f=this._weightNext,m=(a-i)/(l-i),g=m*m,y=g*m,p=-h*y+2*h*g-h*m,w=(1+h)*y+(-1.5-2*h)*g+(-.5+h)*m+1,b=(-1-f)*y+(1.5+f)*g+.5*m,v=f*y-f*g;for(let x=0;x!==n;++x)u[x]=p*t[o+x]+w*t[r+x]+b*t[d+x]+v*t[c+x];return u}},xi=class extends qe{constructor(e,i,a,l){super(e,i,a,l)}interpolate_(e,i,a,l){let u=this.resultBuffer,t=this.sampleValues,n=this.valueSize,d=e*n,r=d-n,o=(a-i)/(l-i),c=1-o;for(let h=0;h!==n;++h)u[h]=t[r+h]*c+t[d+h]*o;return u}},_i=class extends qe{constructor(e,i,a,l){super(e,i,a,l)}interpolate_(e){return this.copySampleValue_(e-1)}},ye=class{constructor(e,i,a,l){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(i===void 0||i.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=li(i,this.TimeBufferType),this.values=li(a,this.ValueBufferType),this.setInterpolation(l||this.DefaultInterpolation)}static toJSON(e){let i=e.constructor,a;if(i.toJSON!==this.toJSON)a=i.toJSON(e);else{a={name:e.name,times:li(e.times,Array),values:li(e.values,Array)};let l=e.getInterpolation();l!==e.DefaultInterpolation&&(a.interpolation=l)}return a.type=e.ValueTypeName,a}InterpolantFactoryMethodDiscrete(e){return new _i(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new xi(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new yi(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let i;switch(e){case zt:i=this.InterpolantFactoryMethodDiscrete;break;case hi:i=this.InterpolantFactoryMethodLinear;break;case ci:i=this.InterpolantFactoryMethodSmooth;break}if(i===void 0){let a="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(a);return ee("KeyframeTrack:",a),this}return this.createInterpolant=i,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return zt;case this.InterpolantFactoryMethodLinear:return hi;case this.InterpolantFactoryMethodSmooth:return ci}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let i=this.times;for(let a=0,l=i.length;a!==l;++a)i[a]+=e}return this}scale(e){if(e!==1){let i=this.times;for(let a=0,l=i.length;a!==l;++a)i[a]*=e}return this}trim(e,i){let a=this.times,l=a.length,u=0,t=l-1;for(;u!==l&&a[u]<e;)++u;for(;t!==-1&&a[t]>i;)--t;if(++t,u!==0||t!==l){u>=t&&(t=Math.max(t,1),u=t-1);let n=this.getValueSize();this.times=a.slice(u,t),this.values=this.values.slice(u*n,t*n)}return this}validate(){let e=!0,i=this.getValueSize();i-Math.floor(i)!==0&&(Q("KeyframeTrack: Invalid value size in track.",this),e=!1);let a=this.times,l=this.values,u=a.length;u===0&&(Q("KeyframeTrack: Track is empty.",this),e=!1);let t=null;for(let n=0;n!==u;n++){let d=a[n];if(typeof d=="number"&&isNaN(d)){Q("KeyframeTrack: Time is not a valid number.",this,n,d),e=!1;break}if(t!==null&&t>d){Q("KeyframeTrack: Out of order keys.",this,n,d,t),e=!1;break}t=d}if(l!==void 0&&Ir(l))for(let n=0,d=l.length;n!==d;++n){let r=l[n];if(isNaN(r)){Q("KeyframeTrack: Value is not a valid number.",this,n,r),e=!1;break}}return e}optimize(){let e=this.times.slice(),i=this.values.slice(),a=this.getValueSize(),l=this.getInterpolation()===ci,u=e.length-1,t=1;for(let n=1;n<u;++n){let d=!1,r=e[n],o=e[n+1];if(r!==o&&(n!==1||r!==e[0]))if(l)d=!0;else{let c=n*a,h=c-a,f=c+a;for(let m=0;m!==a;++m){let g=i[c+m];if(g!==i[h+m]||g!==i[f+m]){d=!0;break}}}if(d){if(n!==t){e[t]=e[n];let c=n*a,h=t*a;for(let f=0;f!==a;++f)i[h+f]=i[c+f]}++t}}if(u>0){e[t]=e[u];for(let n=u*a,d=t*a,r=0;r!==a;++r)i[d+r]=i[n+r];++t}return t!==e.length?(this.times=e.slice(0,t),this.values=i.slice(0,t*a)):(this.times=e,this.values=i),this}clone(){let e=this.times.slice(),i=this.values.slice(),a=this.constructor,l=new a(this.name,e,i);return l.createInterpolant=this.createInterpolant,l}};ye.prototype.ValueTypeName="";ye.prototype.TimeBufferType=Float32Array;ye.prototype.ValueBufferType=Float32Array;ye.prototype.DefaultInterpolation=hi;var Ge=class extends ye{constructor(e,i,a){super(e,i,a)}};Ge.prototype.ValueTypeName="bool";Ge.prototype.ValueBufferType=Array;Ge.prototype.DefaultInterpolation=zt;Ge.prototype.InterpolantFactoryMethodLinear=void 0;Ge.prototype.InterpolantFactoryMethodSmooth=void 0;var vi=class extends ye{constructor(e,i,a,l){super(e,i,a,l)}};vi.prototype.ValueTypeName="color";var bi=class extends ye{constructor(e,i,a,l){super(e,i,a,l)}};bi.prototype.ValueTypeName="number";var Mi=class extends qe{constructor(e,i,a,l){super(e,i,a,l)}interpolate_(e,i,a,l){let u=this.resultBuffer,t=this.sampleValues,n=this.valueSize,d=(a-i)/(l-i),r=e*n;for(let o=r+n;r!==o;r+=4)ae.slerpFlat(u,0,t,r-n,t,r,d);return u}},qt=class extends ye{constructor(e,i,a,l){super(e,i,a,l)}InterpolantFactoryMethodLinear(e){return new Mi(this.times,this.values,this.getValueSize(),e)}};qt.prototype.ValueTypeName="quaternion";qt.prototype.InterpolantFactoryMethodSmooth=void 0;var He=class extends ye{constructor(e,i,a){super(e,i,a)}};He.prototype.ValueTypeName="string";He.prototype.ValueBufferType=Array;He.prototype.DefaultInterpolation=zt;He.prototype.InterpolantFactoryMethodLinear=void 0;He.prototype.InterpolantFactoryMethodSmooth=void 0;var wi=class extends ye{constructor(e,i,a,l){super(e,i,a,l)}};wi.prototype.ValueTypeName="vector";var Si=class{constructor(e,i,a){let l=this,u=!1,t=0,n=0,d,r=[];this.onStart=void 0,this.onLoad=e,this.onProgress=i,this.onError=a,this._abortController=null,this.itemStart=function(o){n++,u===!1&&l.onStart!==void 0&&l.onStart(o,t,n),u=!0},this.itemEnd=function(o){t++,l.onProgress!==void 0&&l.onProgress(o,t,n),t===n&&(u=!1,l.onLoad!==void 0&&l.onLoad())},this.itemError=function(o){l.onError!==void 0&&l.onError(o)},this.resolveURL=function(o){return d?d(o):o},this.setURLModifier=function(o){return d=o,this},this.addHandler=function(o,c){return r.push(o,c),this},this.removeHandler=function(o){let c=r.indexOf(o);return c!==-1&&r.splice(c,2),this},this.getHandler=function(o){for(let c=0,h=r.length;c<h;c+=2){let f=r[c],m=r[c+1];if(f.global&&(f.lastIndex=0),f.test(o))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},fs=new Si,Ai=class{constructor(e){this.manager=e!==void 0?e:fs,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,i){let a=this;return new Promise(function(l,u){a.load(e,l,i,u)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Ai.DEFAULT_MATERIAL_NAME="__DEFAULT";var _n="\\[\\]\\.:\\/",Dr=new RegExp("["+_n+"]","g"),vn="[^"+_n+"]",Lr="[^"+_n.replace("\\.","")+"]",Nr=/((?:WC+[\/:])*)/.source.replace("WC",vn),Or=/(WCOD+)?/.source.replace("WCOD",Lr),Ur=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",vn),Fr=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",vn),kr=new RegExp("^"+Nr+Or+Ur+Fr+"$"),Br=["material","materials","bones","map"],on=class{constructor(e,i,a){let l=a||X.parseTrackName(i);this._targetGroup=e,this._bindings=e.subscribe_(i,l)}getValue(e,i){this.bind();let a=this._targetGroup.nCachedObjects_,l=this._bindings[a];l!==void 0&&l.getValue(e,i)}setValue(e,i){let a=this._bindings;for(let l=this._targetGroup.nCachedObjects_,u=a.length;l!==u;++l)a[l].setValue(e,i)}bind(){let e=this._bindings;for(let i=this._targetGroup.nCachedObjects_,a=e.length;i!==a;++i)e[i].bind()}unbind(){let e=this._bindings;for(let i=this._targetGroup.nCachedObjects_,a=e.length;i!==a;++i)e[i].unbind()}},X=class s{constructor(e,i,a){this.path=i,this.parsedPath=a||s.parseTrackName(i),this.node=s.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,i,a){return e&&e.isAnimationObjectGroup?new s.Composite(e,i,a):new s(e,i,a)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Dr,"")}static parseTrackName(e){let i=kr.exec(e);if(i===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let a={nodeName:i[2],objectName:i[3],objectIndex:i[4],propertyName:i[5],propertyIndex:i[6]},l=a.nodeName&&a.nodeName.lastIndexOf(".");if(l!==void 0&&l!==-1){let u=a.nodeName.substring(l+1);Br.indexOf(u)!==-1&&(a.nodeName=a.nodeName.substring(0,l),a.objectName=u)}if(a.propertyName===null||a.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return a}static findNode(e,i){if(i===void 0||i===""||i==="."||i===-1||i===e.name||i===e.uuid)return e;if(e.skeleton){let a=e.skeleton.getBoneByName(i);if(a!==void 0)return a}if(e.children){let a=function(u){for(let t=0;t<u.length;t++){let n=u[t];if(n.name===i||n.uuid===i)return n;let d=a(n.children);if(d)return d}return null},l=a(e.children);if(l)return l}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,i){e[i]=this.targetObject[this.propertyName]}_getValue_array(e,i){let a=this.resolvedProperty;for(let l=0,u=a.length;l!==u;++l)e[i++]=a[l]}_getValue_arrayElement(e,i){e[i]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,i){this.resolvedProperty.toArray(e,i)}_setValue_direct(e,i){this.targetObject[this.propertyName]=e[i]}_setValue_direct_setNeedsUpdate(e,i){this.targetObject[this.propertyName]=e[i],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,i){this.targetObject[this.propertyName]=e[i],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,i){let a=this.resolvedProperty;for(let l=0,u=a.length;l!==u;++l)a[l]=e[i++]}_setValue_array_setNeedsUpdate(e,i){let a=this.resolvedProperty;for(let l=0,u=a.length;l!==u;++l)a[l]=e[i++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,i){let a=this.resolvedProperty;for(let l=0,u=a.length;l!==u;++l)a[l]=e[i++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,i){this.resolvedProperty[this.propertyIndex]=e[i]}_setValue_arrayElement_setNeedsUpdate(e,i){this.resolvedProperty[this.propertyIndex]=e[i],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,i){this.resolvedProperty[this.propertyIndex]=e[i],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,i){this.resolvedProperty.fromArray(e,i)}_setValue_fromArray_setNeedsUpdate(e,i){this.resolvedProperty.fromArray(e,i),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,i){this.resolvedProperty.fromArray(e,i),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,i){this.bind(),this.getValue(e,i)}_setValue_unbound(e,i){this.bind(),this.setValue(e,i)}bind(){let e=this.node,i=this.parsedPath,a=i.objectName,l=i.propertyName,u=i.propertyIndex;if(e||(e=s.findNode(this.rootNode,i.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){ee("PropertyBinding: No target node found for track: "+this.path+".");return}if(a){let r=i.objectIndex;switch(a){case"materials":if(!e.material){Q("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Q("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Q("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let o=0;o<e.length;o++)if(e[o].name===r){r=o;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Q("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Q("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[a]===void 0){Q("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[a]}if(r!==void 0){if(e[r]===void 0){Q("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[r]}}let t=e[l];if(t===void 0){let r=i.nodeName;Q("PropertyBinding: Trying to update property for track: "+r+"."+l+" but it wasn't found.",e);return}let n=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?n=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(n=this.Versioning.MatrixWorldNeedsUpdate);let d=this.BindingType.Direct;if(u!==void 0){if(l==="morphTargetInfluences"){if(!e.geometry){Q("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Q("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[u]!==void 0&&(u=e.morphTargetDictionary[u])}d=this.BindingType.ArrayElement,this.resolvedProperty=t,this.propertyIndex=u}else t.fromArray!==void 0&&t.toArray!==void 0?(d=this.BindingType.HasFromToArray,this.resolvedProperty=t):Array.isArray(t)?(d=this.BindingType.EntireArray,this.resolvedProperty=t):this.propertyName=l;this.getValue=this.GetterByBindingType[d],this.setValue=this.SetterByBindingTypeAndVersioning[d][n]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};X.Composite=on;X.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};X.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};X.prototype.GetterByBindingType=[X.prototype._getValue_direct,X.prototype._getValue_array,X.prototype._getValue_arrayElement,X.prototype._getValue_toArray];X.prototype.SetterByBindingTypeAndVersioning=[[X.prototype._setValue_direct,X.prototype._setValue_direct_setNeedsUpdate,X.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[X.prototype._setValue_array,X.prototype._setValue_array_setNeedsUpdate,X.prototype._setValue_array_setMatrixWorldNeedsUpdate],[X.prototype._setValue_arrayElement,X.prototype._setValue_arrayElement_setNeedsUpdate,X.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[X.prototype._setValue_fromArray,X.prototype._setValue_fromArray_setNeedsUpdate,X.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var gc=new Float32Array(1);var st=class{constructor(e=1,i=0,a=0){this.radius=e,this.phi=i,this.theta=a}set(e,i,a){return this.radius=e,this.phi=i,this.theta=a,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=W(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,i,a){return this.radius=Math.sqrt(e*e+i*i+a*a),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,a),this.phi=Math.acos(W(i/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Xt=class extends it{constructor(e,i=null){super(),this.object=e,this.domElement=i,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){ee("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"181"}}));typeof window<"u"&&(window.__THREE__?ee("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="181");var zr=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Vr=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Gr=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Hr=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,$r=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Wr=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,qr=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Xr=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,jr=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Yr=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Zr=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Jr=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Kr=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Qr=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,ea=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,ta=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,ia=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,na=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,sa=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,ra=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,aa=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,oa=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,la=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,ca=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ua=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,ha=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,da=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,fa=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,pa=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ma=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ga="gl_FragColor = linearToOutputTexel( gl_FragColor );",ya=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,xa=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,_a=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,va=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,ba=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Ma=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,wa=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Sa=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Aa=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ta=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Ea=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Pa=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ca=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ra=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Ia=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Da=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,La=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Na=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Oa=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Ua=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Fa=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ka=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 uv = vec2( roughness, dotNV );
	return texture2D( dfgLUT, uv ).rg;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNV * dotNV), 0.0, dotNV), material.roughness );
	vec2 dfgL = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNL * dotNL), 0.0, dotNL), material.roughness );
	vec3 FssEss_V = material.specularColor * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColor * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColor + ( 1.0 - material.specularColor ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Ba=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,za=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Va=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ga=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ha=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,$a=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Wa=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,qa=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Xa=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ja=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Ya=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Za=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Ja=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ka=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Qa=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,eo=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,to=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,io=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,no=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,so=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,ro=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ao=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,oo=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,lo=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,co=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,uo=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,ho=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,fo=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,po=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,mo=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,go=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,yo=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,xo=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,_o=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,vo=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,bo=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Mo=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,wo=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,So=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Ao=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,To=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Eo=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Po=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Co=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Ro=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Io=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Do=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Lo=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,No=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Oo=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Uo=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Fo=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ko=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Bo=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,zo=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Vo=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Go=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ho=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$o=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Wo=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qo=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Xo=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,jo=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Yo=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Zo=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Jo=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ko=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Qo=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,el=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,tl=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,il=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,nl=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,sl=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,rl=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,al=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,ol=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,ll=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,cl=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ul=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,hl=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,dl=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fl=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pl=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,ml=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gl=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,yl=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,xl=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,_l=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,V={alphahash_fragment:zr,alphahash_pars_fragment:Vr,alphamap_fragment:Gr,alphamap_pars_fragment:Hr,alphatest_fragment:$r,alphatest_pars_fragment:Wr,aomap_fragment:qr,aomap_pars_fragment:Xr,batching_pars_vertex:jr,batching_vertex:Yr,begin_vertex:Zr,beginnormal_vertex:Jr,bsdfs:Kr,iridescence_fragment:Qr,bumpmap_pars_fragment:ea,clipping_planes_fragment:ta,clipping_planes_pars_fragment:ia,clipping_planes_pars_vertex:na,clipping_planes_vertex:sa,color_fragment:ra,color_pars_fragment:aa,color_pars_vertex:oa,color_vertex:la,common:ca,cube_uv_reflection_fragment:ua,defaultnormal_vertex:ha,displacementmap_pars_vertex:da,displacementmap_vertex:fa,emissivemap_fragment:pa,emissivemap_pars_fragment:ma,colorspace_fragment:ga,colorspace_pars_fragment:ya,envmap_fragment:xa,envmap_common_pars_fragment:_a,envmap_pars_fragment:va,envmap_pars_vertex:ba,envmap_physical_pars_fragment:Da,envmap_vertex:Ma,fog_vertex:wa,fog_pars_vertex:Sa,fog_fragment:Aa,fog_pars_fragment:Ta,gradientmap_pars_fragment:Ea,lightmap_pars_fragment:Pa,lights_lambert_fragment:Ca,lights_lambert_pars_fragment:Ra,lights_pars_begin:Ia,lights_toon_fragment:La,lights_toon_pars_fragment:Na,lights_phong_fragment:Oa,lights_phong_pars_fragment:Ua,lights_physical_fragment:Fa,lights_physical_pars_fragment:ka,lights_fragment_begin:Ba,lights_fragment_maps:za,lights_fragment_end:Va,logdepthbuf_fragment:Ga,logdepthbuf_pars_fragment:Ha,logdepthbuf_pars_vertex:$a,logdepthbuf_vertex:Wa,map_fragment:qa,map_pars_fragment:Xa,map_particle_fragment:ja,map_particle_pars_fragment:Ya,metalnessmap_fragment:Za,metalnessmap_pars_fragment:Ja,morphinstance_vertex:Ka,morphcolor_vertex:Qa,morphnormal_vertex:eo,morphtarget_pars_vertex:to,morphtarget_vertex:io,normal_fragment_begin:no,normal_fragment_maps:so,normal_pars_fragment:ro,normal_pars_vertex:ao,normal_vertex:oo,normalmap_pars_fragment:lo,clearcoat_normal_fragment_begin:co,clearcoat_normal_fragment_maps:uo,clearcoat_pars_fragment:ho,iridescence_pars_fragment:fo,opaque_fragment:po,packing:mo,premultiplied_alpha_fragment:go,project_vertex:yo,dithering_fragment:xo,dithering_pars_fragment:_o,roughnessmap_fragment:vo,roughnessmap_pars_fragment:bo,shadowmap_pars_fragment:Mo,shadowmap_pars_vertex:wo,shadowmap_vertex:So,shadowmask_pars_fragment:Ao,skinbase_vertex:To,skinning_pars_vertex:Eo,skinning_vertex:Po,skinnormal_vertex:Co,specularmap_fragment:Ro,specularmap_pars_fragment:Io,tonemapping_fragment:Do,tonemapping_pars_fragment:Lo,transmission_fragment:No,transmission_pars_fragment:Oo,uv_pars_fragment:Uo,uv_pars_vertex:Fo,uv_vertex:ko,worldpos_vertex:Bo,background_vert:zo,background_frag:Vo,backgroundCube_vert:Go,backgroundCube_frag:Ho,cube_vert:$o,cube_frag:Wo,depth_vert:qo,depth_frag:Xo,distanceRGBA_vert:jo,distanceRGBA_frag:Yo,equirect_vert:Zo,equirect_frag:Jo,linedashed_vert:Ko,linedashed_frag:Qo,meshbasic_vert:el,meshbasic_frag:tl,meshlambert_vert:il,meshlambert_frag:nl,meshmatcap_vert:sl,meshmatcap_frag:rl,meshnormal_vert:al,meshnormal_frag:ol,meshphong_vert:ll,meshphong_frag:cl,meshphysical_vert:ul,meshphysical_frag:hl,meshtoon_vert:dl,meshtoon_frag:fl,points_vert:pl,points_frag:ml,shadow_vert:gl,shadow_frag:yl,sprite_vert:xl,sprite_frag:_l},D={common:{diffuse:{value:new te(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new z},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new z}},envmap:{envMap:{value:null},envMapRotation:{value:new z},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new z}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new z}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new z},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new z},normalScale:{value:new j(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new z},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new z}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new z}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new z}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new te(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new te(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0},uvTransform:{value:new z}},sprite:{diffuse:{value:new te(16777215)},opacity:{value:1},center:{value:new j(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new z},alphaMap:{value:null},alphaMapTransform:{value:new z},alphaTest:{value:0}}},ps={basic:{uniforms:ce([D.common,D.specularmap,D.envmap,D.aomap,D.lightmap,D.fog]),vertexShader:V.meshbasic_vert,fragmentShader:V.meshbasic_frag},lambert:{uniforms:ce([D.common,D.specularmap,D.envmap,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.fog,D.lights,{emissive:{value:new te(0)}}]),vertexShader:V.meshlambert_vert,fragmentShader:V.meshlambert_frag},phong:{uniforms:ce([D.common,D.specularmap,D.envmap,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.fog,D.lights,{emissive:{value:new te(0)},specular:{value:new te(1118481)},shininess:{value:30}}]),vertexShader:V.meshphong_vert,fragmentShader:V.meshphong_frag},standard:{uniforms:ce([D.common,D.envmap,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.roughnessmap,D.metalnessmap,D.fog,D.lights,{emissive:{value:new te(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:V.meshphysical_vert,fragmentShader:V.meshphysical_frag},toon:{uniforms:ce([D.common,D.aomap,D.lightmap,D.emissivemap,D.bumpmap,D.normalmap,D.displacementmap,D.gradientmap,D.fog,D.lights,{emissive:{value:new te(0)}}]),vertexShader:V.meshtoon_vert,fragmentShader:V.meshtoon_frag},matcap:{uniforms:ce([D.common,D.bumpmap,D.normalmap,D.displacementmap,D.fog,{matcap:{value:null}}]),vertexShader:V.meshmatcap_vert,fragmentShader:V.meshmatcap_frag},points:{uniforms:ce([D.points,D.fog]),vertexShader:V.points_vert,fragmentShader:V.points_frag},dashed:{uniforms:ce([D.common,D.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:V.linedashed_vert,fragmentShader:V.linedashed_frag},depth:{uniforms:ce([D.common,D.displacementmap]),vertexShader:V.depth_vert,fragmentShader:V.depth_frag},normal:{uniforms:ce([D.common,D.bumpmap,D.normalmap,D.displacementmap,{opacity:{value:1}}]),vertexShader:V.meshnormal_vert,fragmentShader:V.meshnormal_frag},sprite:{uniforms:ce([D.sprite,D.fog]),vertexShader:V.sprite_vert,fragmentShader:V.sprite_frag},background:{uniforms:{uvTransform:{value:new z},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:V.background_vert,fragmentShader:V.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new z}},vertexShader:V.backgroundCube_vert,fragmentShader:V.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:V.cube_vert,fragmentShader:V.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:V.equirect_vert,fragmentShader:V.equirect_frag},distanceRGBA:{uniforms:ce([D.common,D.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:V.distanceRGBA_vert,fragmentShader:V.distanceRGBA_frag},shadow:{uniforms:ce([D.lights,D.fog,{color:{value:new te(0)},opacity:{value:1}}]),vertexShader:V.shadow_vert,fragmentShader:V.shadow_frag}};ps.physical={uniforms:ce([ps.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new z},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new z},clearcoatNormalScale:{value:new j(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new z},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new z},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new z},sheen:{value:0},sheenColor:{value:new te(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new z},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new z},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new z},transmissionSamplerSize:{value:new j},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new z},attenuationDistance:{value:0},attenuationColor:{value:new te(0)},specularColor:{value:new te(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new z},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new z},anisotropyVector:{value:new j},anisotropyMap:{value:null},anisotropyMapTransform:{value:new z}}]),vertexShader:V.meshphysical_vert,fragmentShader:V.meshphysical_frag};var Zm=new Float32Array(16),Jm=new Float32Array(9),Km=new Float32Array(4);var Qm={[ln]:cn,[un]:pn,[dn]:mn,[hn]:fn,[cn]:ln,[pn]:un,[mn]:dn,[fn]:hn};var e0=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);var ms=new N,bl=new ae,gs=new N,Ei=class extends Ee{constructor(e=document.createElement("div")){super(),this.isCSS3DObject=!0,this.element=e,this.element.style.position="absolute",this.element.style.pointerEvents="auto",this.element.style.userSelect="none",this.element.setAttribute("draggable",!1),this.addEventListener("removed",function(){this.traverse(function(i){i.element&&i.element instanceof i.element.ownerDocument.defaultView.Element&&i.element.parentNode!==null&&i.element.remove()})})}copy(e,i){return super.copy(e,i),this.element=e.element.cloneNode(!0),this}};var Pe=new ie,Ml=new ie,Pi=class{constructor(e={}){let i=this,a,l,u,t,n={camera:{style:""},objects:new WeakMap},d=e.element!==void 0?e.element:document.createElement("div");d.style.overflow="hidden",this.domElement=d;let r=document.createElement("div");r.style.transformOrigin="0 0",r.style.pointerEvents="none",d.appendChild(r);let o=document.createElement("div");o.style.transformStyle="preserve-3d",r.appendChild(o),this.getSize=function(){return{width:a,height:l}},this.render=function(y,p){let w=p.projectionMatrix.elements[5]*t;p.view&&p.view.enabled?(r.style.transform=`translate( ${-p.view.offsetX*(a/p.view.width)}px, ${-p.view.offsetY*(l/p.view.height)}px )`,r.style.transform+=`scale( ${p.view.fullWidth/p.view.width}, ${p.view.fullHeight/p.view.height} )`):r.style.transform="",y.matrixWorldAutoUpdate===!0&&y.updateMatrixWorld(),p.parent===null&&p.matrixWorldAutoUpdate===!0&&p.updateMatrixWorld();let b,v;p.isOrthographicCamera&&(b=-(p.right+p.left)/2,v=(p.top+p.bottom)/2);let x=p.view&&p.view.enabled?p.view.height/p.view.fullHeight:1,_=p.isOrthographicCamera?`scale( ${x} )scale(`+w+")translate("+c(b)+"px,"+c(v)+"px)"+h(p.matrixWorldInverse):`scale( ${x} )translateZ(`+w+"px)"+h(p.matrixWorldInverse),B=(p.isPerspectiveCamera?"perspective("+w+"px) ":"")+_+"translate("+u+"px,"+t+"px)";n.camera.style!==B&&(o.style.transform=B,n.camera.style=B),g(y,y,p,_)},this.setSize=function(y,p){a=y,l=p,u=a/2,t=l/2,d.style.width=y+"px",d.style.height=p+"px",r.style.width=y+"px",r.style.height=p+"px",o.style.width=y+"px",o.style.height=p+"px"};function c(y){return Math.abs(y)<1e-10?0:y}function h(y){let p=y.elements;return"matrix3d("+c(p[0])+","+c(-p[1])+","+c(p[2])+","+c(p[3])+","+c(p[4])+","+c(-p[5])+","+c(p[6])+","+c(p[7])+","+c(p[8])+","+c(-p[9])+","+c(p[10])+","+c(p[11])+","+c(p[12])+","+c(-p[13])+","+c(p[14])+","+c(p[15])+")"}function f(y){let p=y.elements;return"translate(-50%,-50%)"+("matrix3d("+c(p[0])+","+c(p[1])+","+c(p[2])+","+c(p[3])+","+c(-p[4])+","+c(-p[5])+","+c(-p[6])+","+c(-p[7])+","+c(p[8])+","+c(p[9])+","+c(p[10])+","+c(p[11])+","+c(p[12])+","+c(p[13])+","+c(p[14])+","+c(p[15])+")")}function m(y){y.isCSS3DObject&&(y.element.style.display="none");for(let p=0,w=y.children.length;p<w;p++)m(y.children[p])}function g(y,p,w,b){if(y.visible===!1){m(y);return}if(y.isCSS3DObject){let v=y.layers.test(w.layers)===!0,x=y.element;if(x.style.display=v===!0?"":"none",v===!0){y.onBeforeRender(i,p,w);let _;y.isCSS3DSprite?(Pe.copy(w.matrixWorldInverse),Pe.transpose(),y.rotation2D!==0&&Pe.multiply(Ml.makeRotationZ(y.rotation2D)),y.matrixWorld.decompose(ms,bl,gs),Pe.setPosition(ms),Pe.scale(gs),Pe.elements[3]=0,Pe.elements[7]=0,Pe.elements[11]=0,Pe.elements[15]=1,_=f(Pe)):_=f(y.matrixWorld);let M=n.objects.get(y);if(M===void 0||M.style!==_){x.style.transform=_;let B={style:_};n.objects.set(y,B)}x.parentNode!==o&&o.appendChild(x),y.onAfterRender(i,p,w)}}for(let v=0,x=y.children.length;v<x;v++)g(y.children[v],p,w,b)}}};var ys={type:"change"},Mn={type:"start"},_s={type:"end"},Ci=new Gt,xs=new Wt,wl=Math.cos(70*ne.DEG2RAD),K=new N,de=2*Math.PI,q={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},bn=1e-6,Ri=class extends Xt{constructor(e,i=null){super(e,i),this.state=q.NONE,this.target=new N,this.cursor=new N,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:$e.ROTATE,MIDDLE:$e.DOLLY,RIGHT:$e.PAN},this.touches={ONE:we.ROTATE,TWO:we.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new N,this._lastQuaternion=new ae,this._lastTargetPosition=new N,this._quat=new ae().setFromUnitVectors(e.up,new N(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new st,this._sphericalDelta=new st,this._scale=1,this._panOffset=new N,this._rotateStart=new j,this._rotateEnd=new j,this._rotateDelta=new j,this._panStart=new j,this._panEnd=new j,this._panDelta=new j,this._dollyStart=new j,this._dollyEnd=new j,this._dollyDelta=new j,this._dollyDirection=new N,this._mouse=new j,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Al.bind(this),this._onPointerDown=Sl.bind(this),this._onPointerUp=Tl.bind(this),this._onContextMenu=Ll.bind(this),this._onMouseWheel=Cl.bind(this),this._onKeyDown=Rl.bind(this),this._onTouchStart=Il.bind(this),this._onTouchMove=Dl.bind(this),this._onMouseDown=El.bind(this),this._onMouseMove=Pl.bind(this),this._interceptControlDown=Nl.bind(this),this._interceptControlUp=Ol.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(ys),this.update(),this.state=q.NONE}update(e=null){let i=this.object.position;K.copy(i).sub(this.target),K.applyQuaternion(this._quat),this._spherical.setFromVector3(K),this.autoRotate&&this.state===q.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let a=this.minAzimuthAngle,l=this.maxAzimuthAngle;isFinite(a)&&isFinite(l)&&(a<-Math.PI?a+=de:a>Math.PI&&(a-=de),l<-Math.PI?l+=de:l>Math.PI&&(l-=de),a<=l?this._spherical.theta=Math.max(a,Math.min(l,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(a+l)/2?Math.max(a,this._spherical.theta):Math.min(l,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let u=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let t=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),u=t!=this._spherical.radius}if(K.setFromSpherical(this._spherical),K.applyQuaternion(this._quatInverse),i.copy(this.target).add(K),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let t=null;if(this.object.isPerspectiveCamera){let n=K.length();t=this._clampDistance(n*this._scale);let d=n-t;this.object.position.addScaledVector(this._dollyDirection,d),this.object.updateMatrixWorld(),u=!!d}else if(this.object.isOrthographicCamera){let n=new N(this._mouse.x,this._mouse.y,0);n.unproject(this.object);let d=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),u=d!==this.object.zoom;let r=new N(this._mouse.x,this._mouse.y,0);r.unproject(this.object),this.object.position.sub(r).add(n),this.object.updateMatrixWorld(),t=K.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;t!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(t).add(this.object.position):(Ci.origin.copy(this.object.position),Ci.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ci.direction))<wl?this.object.lookAt(this.target):(xs.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ci.intersectPlane(xs,this.target))))}else if(this.object.isOrthographicCamera){let t=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),t!==this.object.zoom&&(this.object.updateProjectionMatrix(),u=!0)}return this._scale=1,this._performCursorZoom=!1,u||this._lastPosition.distanceToSquared(this.object.position)>bn||8*(1-this._lastQuaternion.dot(this.object.quaternion))>bn||this._lastTargetPosition.distanceToSquared(this.target)>bn?(this.dispatchEvent(ys),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?de/60*this.autoRotateSpeed*e:de/60/60*this.autoRotateSpeed}_getZoomScale(e){let i=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*i)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,i){K.setFromMatrixColumn(i,0),K.multiplyScalar(-e),this._panOffset.add(K)}_panUp(e,i){this.screenSpacePanning===!0?K.setFromMatrixColumn(i,1):(K.setFromMatrixColumn(i,0),K.crossVectors(this.object.up,K)),K.multiplyScalar(e),this._panOffset.add(K)}_pan(e,i){let a=this.domElement;if(this.object.isPerspectiveCamera){let l=this.object.position;K.copy(l).sub(this.target);let u=K.length();u*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*u/a.clientHeight,this.object.matrix),this._panUp(2*i*u/a.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/a.clientWidth,this.object.matrix),this._panUp(i*(this.object.top-this.object.bottom)/this.object.zoom/a.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,i){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let a=this.domElement.getBoundingClientRect(),l=e-a.left,u=i-a.top,t=a.width,n=a.height;this._mouse.x=l/t*2-1,this._mouse.y=-(u/n)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let i=this.domElement;this._rotateLeft(de*this._rotateDelta.x/i.clientHeight),this._rotateUp(de*this._rotateDelta.y/i.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let i=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(de*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),i=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-de*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),i=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(de*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),i=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-de*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),i=!0;break}i&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let i=this._getSecondPointerPosition(e),a=.5*(e.pageX+i.x),l=.5*(e.pageY+i.y);this._rotateStart.set(a,l)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let i=this._getSecondPointerPosition(e),a=.5*(e.pageX+i.x),l=.5*(e.pageY+i.y);this._panStart.set(a,l)}}_handleTouchStartDolly(e){let i=this._getSecondPointerPosition(e),a=e.pageX-i.x,l=e.pageY-i.y,u=Math.sqrt(a*a+l*l);this._dollyStart.set(0,u)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let a=this._getSecondPointerPosition(e),l=.5*(e.pageX+a.x),u=.5*(e.pageY+a.y);this._rotateEnd.set(l,u)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let i=this.domElement;this._rotateLeft(de*this._rotateDelta.x/i.clientHeight),this._rotateUp(de*this._rotateDelta.y/i.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let i=this._getSecondPointerPosition(e),a=.5*(e.pageX+i.x),l=.5*(e.pageY+i.y);this._panEnd.set(a,l)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let i=this._getSecondPointerPosition(e),a=e.pageX-i.x,l=e.pageY-i.y,u=Math.sqrt(a*a+l*l);this._dollyEnd.set(0,u),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let t=(e.pageX+i.x)*.5,n=(e.pageY+i.y)*.5;this._updateZoomParameters(t,n)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let i=0;i<this._pointers.length;i++)if(this._pointers[i]==e.pointerId){this._pointers.splice(i,1);return}}_isTrackingPointer(e){for(let i=0;i<this._pointers.length;i++)if(this._pointers[i]==e.pointerId)return!0;return!1}_trackPointer(e){let i=this._pointerPositions[e.pointerId];i===void 0&&(i=new j,this._pointerPositions[e.pointerId]=i),i.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let i=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[i]}_customWheelEvent(e){let i=e.deltaMode,a={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(i){case 1:a.deltaY*=16;break;case 2:a.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(a.deltaY*=10),a}};function Sl(s){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(s.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(s)&&(this._addPointer(s),s.pointerType==="touch"?this._onTouchStart(s):this._onMouseDown(s)))}function Al(s){this.enabled!==!1&&(s.pointerType==="touch"?this._onTouchMove(s):this._onMouseMove(s))}function Tl(s){switch(this._removePointer(s),this._pointers.length){case 0:this.domElement.releasePointerCapture(s.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(_s),this.state=q.NONE;break;case 1:let e=this._pointers[0],i=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:i.x,pageY:i.y});break}}function El(s){let e;switch(s.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case $e.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(s),this.state=q.DOLLY;break;case $e.ROTATE:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=q.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=q.ROTATE}break;case $e.PAN:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=q.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=q.PAN}break;default:this.state=q.NONE}this.state!==q.NONE&&this.dispatchEvent(Mn)}function Pl(s){switch(this.state){case q.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(s);break;case q.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(s);break;case q.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(s);break}}function Cl(s){this.enabled===!1||this.enableZoom===!1||this.state!==q.NONE||(s.preventDefault(),this.dispatchEvent(Mn),this._handleMouseWheel(this._customWheelEvent(s)),this.dispatchEvent(_s))}function Rl(s){this.enabled!==!1&&this._handleKeyDown(s)}function Il(s){switch(this._trackPointer(s),this._pointers.length){case 1:switch(this.touches.ONE){case we.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(s),this.state=q.TOUCH_ROTATE;break;case we.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(s),this.state=q.TOUCH_PAN;break;default:this.state=q.NONE}break;case 2:switch(this.touches.TWO){case we.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(s),this.state=q.TOUCH_DOLLY_PAN;break;case we.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(s),this.state=q.TOUCH_DOLLY_ROTATE;break;default:this.state=q.NONE}break;default:this.state=q.NONE}this.state!==q.NONE&&this.dispatchEvent(Mn)}function Dl(s){switch(this._trackPointer(s),this.state){case q.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(s),this.update();break;case q.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(s),this.update();break;case q.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(s),this.update();break;case q.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(s),this.update();break;default:this.state=q.NONE}}function Ll(s){this.enabled!==!1&&s.preventDefault()}function Nl(s){s.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Ol(s){s.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var Ln=tr(Ls());var Rn=(s,e)=>s[0]*e[0]+s[1]*e[1]+s[2]*e[2],Ns=(s,e)=>[s[1]*e[2]-s[2]*e[1],s[2]*e[0]-s[0]*e[2],s[0]*e[1]-s[1]*e[0]],In=s=>{let e=Math.hypot(...s);if(!(e>1e-9))throw new Error("Camera direction and up must be independent.");return s.map(i=>i/e)};function Dn(s,e){if(!s.length||s.some(C=>C.length!==3||!C.every(Number.isFinite)))throw new Error("Camera fitting requires finite actual points.");let i=In(e.direction),a=In(Ns(e.up??[0,0,1],i)),l=In(Ns(i,a)),{width:u,height:t,fov:n}=e,d=e.insets??{left:0,right:0,top:0,bottom:0},r=Math.tan(n*Math.PI/360),o=r*u/t,c=(-1+2*d.left/u)*o,h=(1-2*d.right/u)*o,f=(-1+2*d.bottom/t)*r,m=(1-2*d.top/t)*r;if(!(c<h&&f<m))throw new Error("Camera fitting needs a non-empty screen rectangle.");let g=s.map(C=>[Rn(C,a),Rn(C,l),Rn(C,i)]),y=1/0,p=-1/0;for(let C of g)y=Math.min(y,C[2]),p=Math.max(p,C[2]);let w=(y+p)/2,b=Math.max(p+.5,w+(e.minDistance??25)),v=w+(e.maxDistance??2500);function x(C){let L=-1/0,G=1/0,k=-1/0,S=1/0;for(let[I,F,E]of g){let T=C-E;if(!(T>0))return null;L=Math.max(L,I-h*T),G=Math.min(G,I-c*T),k=Math.max(k,F-m*T),S=Math.min(S,F-f*T)}return L<=G&&k<=S?{x:(L+G)/2,y:(k+S)/2}:null}if(!x(v))throw new Error("The specimen exceeds the supported camera distance.");let _=b,M=v;if(x(_))M=_;else for(let C=0;C<56;C+=1){let L=(_+M)/2;x(L)?M=L:_=L}let B=Math.min(v,M+1e-5),A=x(B),P=C=>a.map((L,G)=>L*A.x+l[G]*A.y+i[G]*C);return{position:P(B),target:P(w),distance:B-w,direction:i,right:a,up:l}}var R=s=>document.getElementById(s),Oi=s=>typeof s=="string"?s:s?.ja??s?.en??"",Bs=new Map(Object.entries({"f5e61012-e1d7-50b6-9c37-d34502dc072a":4,"6ffd7a2e-b257-566c-b4a1-63ff8da8acce":4,"a6733e79-741e-558b-b813-e5ddd4f75a83":4,"58efb521-d9a4-5946-99b9-67217475da54":4,"dd2fee64-670a-55b5-b1ef-7b344de25fdb":4,"098cb370-be15-5694-b010-4de5dc060d29":2,"d7e919a2-e3f6-570f-9196-4c02a7ef7080":2,"51373c22-0ac5-5e23-b45a-4ac0ed403f06":2,"9b76fb50-21a1-5122-b5d8-1fad4420e7a1":2,"5c5d283e-463e-5b96-9264-74f1d567f69c":2,"9c1a1b89-2923-51f4-9738-4e981abab3c7":2,"9a0f48a8-1b69-5526-b5cf-b70d24a9e02f":2})),Nn=JSON.parse(R("model-data").textContent),Os=createReadingViews(Nn),Kl=JSON.parse(R("schema-data").textContent),ei=R("stage"),Zt=R("geometry"),U=Zt.getContext("2d"),Te=new Pi;Te.domElement.className="text-layer";ei.append(Te.domElement);var Ui=new $t,$=new Ht(42,1,.1,9e3);$.up.set(0,0,1);var Y=new Ri($,Te.domElement);Y.enableDamping=!1;Y.screenSpacePanning=!0;Y.minDistance=2;Y.maxDistance=4e3;Y.zoomToCursor=!0;Y.touches.ONE=we.ROTATE;Y.touches.TWO=we.DOLLY_PAN;var H,Xe,Ot,be=[],pe=1,me=1,Jt=1,Z=null,Ue=!0,Fn=!1,J=null,oe=null,kn={entry:"\u5165\u53E3\u3068\u4FDD\u7559",argument:"\u4E3B\u5F35\u3068\u6839\u62E0",carry:"\u6B21\u306E\u6587\u732E",distribution:"\u8AAD\u89E3\u306E\u5206\u5E03"},Bn={entrances:"\u5165\u53E3\u306E\u7167\u5408",revisit:"\u518D\u8A2A\u3068\u6839\u62E0",sharingOverview:"\u5171\u6709"},On={core:"\u5F80\u9084",routes:"\u6298\u308A\u8FD4\u3057",detail:"\u8AAD\u307F\u5206\u3051",resolution:"\u89E3\u50CF\u5EA6",text:"\u672C\u6587\u3068\u30E2\u30C7\u30EB",shared:"\u5171\u6709",scope:"\u500B\u3068\u793E\u4F1A",frames:"\u4E8C\u5EA7\u6A19",people:"\u500B\u306E\u5EA7\u6A19",manuscript:"\u6587\u9762\u306E\u5F80\u9084",display:"\u8868\u793A\u306E\u5F80\u9084",social:"\u793E\u4F1A\u306E\u5F80\u9084",...kn,...Bn},Ql=new Set(["annotationExchange","scope","frames","people","manuscript","display","social"]),We="all",Kt=null;function Us(s){return s==="history"||Object.hasOwn(kn,s)?"history":Object.hasOwn(Bn,s)?"commons":Ql.has(s)?"media":"core"}function Ni(s,e){return H.points.find(i=>i.meta.tags?.includes(s)&&(!e||i.meta.tags.includes("x:"+e)))}function Fi(){return H.document_meta.document_uuid===Nn.document_meta.document_uuid&&H.document_meta.revised_at===Nn.document_meta.revised_at}function ec(s){if(!Fi())return null;let e=new URL(window.location.href);if(!["file:","https:","http:"].includes(e.protocol))return null;let i=document.querySelector('meta[name="atlas-edition"]')?.content,a=e;if(i&&e.protocol!=="file:"){try{a=new URL(i,e)}catch{return null}if(a.protocol!==e.protocol||a.origin!==e.origin||a.username||a.password)return null}return a.search="",a.hash=new URLSearchParams({line:s.meta.uuid,rev:H.document_meta.revised_at}).toString(),a.href}function zs(s){let e=s.appearance.position[1],i=s.signification.name;return s.meta.tags?.includes("m:\u5C40\u6240\u57FA\u5E95")?"\u500B\u4EBA\u306E\u5EA7\u6A19":["\u8A8D\u8B58","\u5B58\u5728","\u5F62\u5F0F","\u6A5F\u80FD","\u610F\u5473","\u8CEA","\u6642\u9593","\u91CF"].includes(i)?"\u4E8C\u3064\u306E\u5EA7\u6A19":e<0?"\u6B74\u53F2":e===0||e===24?e===0?"\u672C\u6587\u30FB\u305D\u306E\u5834":"\u672C\u6587\u30FB\u5F8C\u523B":e===320||e===344||e===84||e===108?e===320||e===84?"3DSL\u30FB\u305D\u306E\u5834":"3DSL\u30FB\u5F8C\u523B":e===368||e===392||e===132||e===156?"\u6B21\u306E\u5FDC\u7B54":"\u5171\u6709\u306E\u69CB\u60F3"}var Se=s=>new N(...s),ve=s=>Oi(s.signification?.name)||Oi(s.signification?.caption)||s.meta.uuid,Vs=s=>(Object.freeze(s),Object.values(s).forEach(e=>{e&&typeof e=="object"&&!Object.isFrozen(e)&&Vs(e)}),s);function tc(s){let e=s.slice(1).map((a,l)=>a.distanceTo(s[l])),i=e.reduce((a,l)=>a+l,0)/2;for(let a=0;a<e.length;a++){let l=e[a];if(l>0&&i<l-1e-8)return{point:s[a].clone().lerp(s[a+1],i/l),tangent:s[a+1].clone().sub(s[a]).normalize()};i-=l}return{point:s.at(-1).clone(),tangent:new N}}function ic(s){let e=Se(s.pose?.front??[0,1,0]).normalize(),i=Se(s.pose?.up??[0,0,1]).normalize();if(Math.abs(e.dot(i))>1e-6)throw Error("\u6587\u5B57\u9762\u306Efront/up\u304C\u76F4\u4EA4\u3057\u3066\u3078\u3093\u3002");let a=new N().crossVectors(i,e).normalize();return{front:e,up:i,right:a,rotation:new ae().setFromRotationMatrix(new ie().makeBasis(a,i,e))}}function Fs(s,e,i,a,l=null){let u=document.createElement("button");u.type="button",u.className="model-label",u.dataset.id=s.meta.uuid;let t=document.createElement("span");t.className="ink",t.textContent=a==="point"?(displayingEmbeddedAtlas && introductoryRole(s) || i.content):ve(s),t.style.writingMode=i.writing_mode??"horizontal-tb",t.style.textOrientation="mixed",t.style.fontWeight=String(i.font_weight??400),t.style.color=i.color??"#e5edf2",u.append(t),u.setAttribute("aria-label",a==="point"?(displayingEmbeddedAtlas && introductoryRole(s) || ve(s)):ve(s)),u.setAttribute("aria-pressed","false");let n=new Ei(u),d=ic(i),r=a==="point"?i.size:i.font_size;n.quaternion.copy(d.rotation),n.scale.setScalar((r??8)/64),Ui.add(n);let o={e:s,kind:a,button:u,ink:t,object:n,config:i,basis:d,size:r??8,position:e,tangent:l};be.push(o),u.addEventListener("click",c=>{c.detail===0&&Fe(s.meta.uuid)})}function nc(){for(let s of be){let e=s.ink.offsetWidth*s.size/64,i=s.ink.offsetHeight*s.size/64,a=0,l=0,[u,t]=(s.config.align??"center&middle").split("&");u==="left"&&(a=e/2),u==="right"&&(a=-e/2),t==="baseline"&&(l=i/2-s.size*.12),t==="top"&&(l=-i/2);let n=s.e.appearance.marker;if(n?.primitive==="corona"&&t==="baseline"){let d=n.common?.scale??[1,1,1];l+=n.outer_radius*Math.max(...d.map(Math.abs))+s.size*.55}if(s.kind==="line"){let d=s.size/8;l=i/2+d,Math.abs(s.tangent.dot(s.basis.up))>.9&&(a=e/2+d)}s.object.position.copy(s.position).addScaledVector(s.basis.right,a).addScaledVector(s.basis.up,l),s.baseCenter=s.object.position.clone(),s.corners=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([d,r])=>s.object.position.clone().addScaledVector(s.basis.right,d*e/2).addScaledVector(s.basis.up,r*i/2).toArray())}Ue=!0}function Gs(s){if(s.document_meta?.version!=="2.0.0"||s.document_meta?.schema_uri?.split("#")[0]!==Kl.$id)throw Error("\u3053\u306E\u7E26\u7D44\u307F\u8868\u793A\u306F3DSS v2.0.0\u5019\u88DC\u7528\u3084\u3002");if(!(0,Ln.default)(s))throw Error("\u5F62\u5F0F\u30A8\u30E9\u30FC\uFF1A"+Ln.default.errors.map(l=>(l.instancePath||"/")+" "+l.message).join(" / "));let e=new Set;for(let l of[...s.points,...s.lines,...s.aux??[]]){if(e.has(l.meta.uuid))throw Error("\u8B58\u5225\u5B50\u304C\u91CD\u8907\u3057\u3066\u308B\u3002");e.add(l.meta.uuid)}let i=new Set(s.points.map(l=>l.meta.uuid)),a=new Set((s.visual_legend??[]).map(l=>l.id));if(a.size!==(s.visual_legend??[]).length)throw Error("\u51E1\u4F8B\u306E\u8B58\u5225\u5B50\u304C\u91CD\u8907\u3057\u3066\u308B\u3002");for(let l of[...s.points,...s.lines])for(let u of l.meta.legend_refs??[])if(!a.has(u))throw Error("\u51E1\u4F8B\u306E\u53C2\u7167\u5148\u304C\u306A\u3044\u3002");for(let l of s.lines)for(let u of["end_a","end_b"])if(!i.has(l.appearance[u]?.ref))throw Error("\u7DDA\u306E\u7AEF\u70B9\u53C2\u7167\u5148\u304C\u306A\u3044\u3002");if(s.aux?.length)throw Error("\u3053\u306E\u78BA\u8A8D\u8868\u793A\u3067\u672A\u5BFE\u5FDC\u306E\u88DC\u52A9\u8981\u7D20\u304C\u3042\u308B\u3002");for(let l of s.lines){if(!["straight","polyline",void 0].includes(l.appearance.line_type))throw Error("\u3053\u306E\u78BA\u8A8D\u8868\u793A\u3067\u672A\u5BFE\u5FDC\u306E\u66F2\u7DDA\u304C\u3042\u308B\u3002");if(!["solid","dotted","dashed","none",void 0].includes(l.appearance.line_style))throw Error("\u3053\u306E\u78BA\u8A8D\u8868\u793A\u3067\u672A\u5BFE\u5FDC\u306E\u7DDA\u7A2E\u304C\u3042\u308B\u3002")}for(let l of s.points)if(!l.appearance.marker.text)throw Error("\u3053\u306E\u78BA\u8A8D\u8868\u793A\u306F\u6587\u5B57\u3092\u6301\u3064\u8981\u7D20\u7528\u3084\u3002")}let displayingEmbeddedAtlas = false;
function isPerson(point) {
  return point && /^個人 [ABC]$/.test(point.signification.name);
}

function personMarkerOpacity(point, wideView) {
  if (!displayingEmbeddedAtlas || !isPerson(point)) return 0;
  if (We === "all" && wideView > .5) {
    const tags = point.meta.tags ?? [];
    // A second point for the same person marks a later time. Show the
    // introductory point at overview scale and reveal the rest while zooming.
    if (point.signification.name !== "個人 C" && !tags.includes("m:sender") && !tags.includes("m:receiver")) {
      return .58 * (1 - wideView);
    }
  }
  if (We === "annotationExchange") return Os.annotationPeople.has(point.meta.uuid) ? .58 : 0;
  if (J && !J.has(point.meta.uuid)) return 0;
  return .58;
}

function personMarkerCorners(point, scale = 1) {
  const [x, y, z] = point.appearance.position;
  const halfWidth = 20 * scale;
  const top = z + personMarkerHeight * scale;
  return [[x - halfWidth, y, z], [x - halfWidth, y, top], [x + halfWidth, y, z], [x + halfWidth, y, top]];
}

const personMarkerHits = [];

function pickPersonMarker(clientX, clientY) {
  const canvas = Zt.getBoundingClientRect();
  const x = clientX - canvas.left;
  const y = clientY - canvas.top;
  let nearest;
  let distance = Infinity;
  for (const { id, left, right, top, bottom } of personMarkerHits) {
    if (x < left - 4 || x > right + 4 || y < top - 4 || y > bottom + 4) continue;
    const offset = Math.hypot(x - (left + right) / 2, y - (top + bottom) / 2);
    if (offset < distance) {
      nearest = id;
      distance = offset;
    }
  }
  return nearest;
}

let personMarker;
let personMarkerRequest;

function preparePersonMarker() {
  personMarkerRequest ??= loadPersonMarker().then(marker => {
    personMarker = marker;
    Ue = true;
  }).catch(() => { personMarkerRequest = null; });
}

const phaseQuestions = {
  annotationExchange: "図を読んだBが注を書き、次の読者Cが読む。",
  textLegacy: "資料を開いたあと、離れた記述を結ぶのは誰？",
  structureWork: "作り手が置いた関係を、読み手はどこで確かめる？",
  socialEffect: "先の読者が残した注は、何を指し、誰に届く？"
};
function isReadingPhase(view) {
  return displayingEmbeddedAtlas && Object.hasOwn(phaseQuestions, view) && R("reading-example").hidden;
}
function isPhaseLine(view, origin) {
  return displayingEmbeddedAtlas && view === "linkedLine" && (origin?.fromPhase === true || origin?.fromNote === true);
}
async function Hs(s){Gs(s);let e=Vs(structuredClone(s));displayingEmbeddedAtlas=s===Nn;if(displayingEmbeddedAtlas)preparePersonMarker();for(let i of be)Ui.remove(i.object);be=[],Z=null,H=e,Xe=new Map(H.points.map(i=>[i.meta.uuid,i])),Ot=H.lines.map(i=>({e:i,chain:[Xe.get(i.appearance.end_a.ref).appearance.position,...i.appearance.geometry?.polyline_points??[],Xe.get(i.appearance.end_b.ref).appearance.position].map(Se)}));for(let i of H.points)Fs(i,Se(i.appearance.position),i.appearance.marker.text,"point");for(let{e:i,chain:a}of Ot){let l=tc(a);Fs(i,l.point,i.appearance.caption_text,"line",l.tangent)}J=null,R("details").hidden=!0,Un(),Te.render(Ui,$),await document.fonts.ready,await new Promise(requestAnimationFrame),nc(),Xs(),pc(),R("title").textContent=H.document_meta.document_title,Fn=!0,Un(),sc(),Ae(R("compare-width")&&Fi()?"core":"all"),R("status").textContent=""}var je=0;
function sc(){je=0;}
function $s(s,e=!1){let i=s?new Set(s):null,a=be.filter(l=>!i||i.has(l.e.meta.uuid)).flatMap(l=>l.corners);for(let{e:l,chain:u}of Ot)(!i||i.has(l.meta.uuid)||!e&&i.has(l.appearance.end_a.ref)&&i.has(l.appearance.end_b.ref))&&a.push(...u.map(t=>t.toArray()));return a}function Ae(s="all",e=s==="selected"?Kt:null){if(!Fn)return;let i=null;R("status").textContent="";let a=H.lines.some(b=>b.meta.tags?.includes("x:\u500B\u306E\u5EA7\u6A19")),l=H.lines.some(b=>b.meta.tags?.includes("x:\u500B\u3068\u793E\u4F1A")),u=new Set(H.lines.flatMap(b=>b.meta.tags??[])),t=Object.values(kn).some(b=>u.has("x:"+b));s==="scope"&&!l&&(s="people"),s==="people"&&!a&&(s=H.lines.some(b=>b.meta.tags?.includes("x:\u8868\u793A\u306E\u5F80\u9084"))?"display":"all");let n=u.has("x:\u5171\u901A\u53C2\u7167"),d=s==="shared"&&n?"\u5171\u901A\u53C2\u7167":On[s];if(d){let b="x:"+d,v=s==="sharingOverview"?[b,"x:\u5171\u901A\u53C2\u7167","x:\u518D\u8A2A\u3068\u6839\u62E0"]:[b];i=be.filter(x=>v.some(_=>x.e.meta.tags?.includes(_))).map(x=>x.e.meta.uuid),i.length||(i=null)}if(s==="revisit"&&i){let b=Ni("m:\u53C2\u7167\u7B87\u6240",d),v=Ni("m:\u5F79\u5272",d),x=b&&v&&H.lines.find(_=>_.appearance.end_a.ref===b.meta.uuid&&_.appearance.end_b.ref===v.meta.uuid&&_.meta.tags?.includes("x:"+d));x&&(i=[b.meta.uuid,x.meta.uuid,v.meta.uuid])}if(Fi()&&["textLegacy","structureWork","socialEffect"].includes(s))i=Os[s];
if (s === "annotationExchange") {
  if (displayingEmbeddedAtlas) {
    i = Os.annotationExchange;
  } else {
    s = "scope";
    i = be.filter(label => label.e.meta.tags?.includes("x:個と社会")).map(label => label.e.meta.uuid);
  }
}if(s==="exampleLoop"&&Fi())i=readingExample.ids;let r=s==="linkedLine"&&H.lines.find(b=>b.meta.uuid===Z);r&&(i=[r.meta.uuid,r.appearance.end_a.ref,r.appearance.end_b.ref]),J=i?new Set(i):null;let o=s==="textLegacy"?"history":s==="socialEffect"||s==="shared"&&n?"commons":Us(s);We = s;
readingExample.onView(s,Fi()),atlasTour.onView(s,displayingEmbeddedAtlas&&R("reading-example").hidden),R("note-open").hidden=!(readerNote && displayingEmbeddedAtlas && s==="socialEffect" && R("reading-example").hidden),R("phase-nav").hidden=!Fi()||s!=="all",Kt=e,R("place-return").hidden=!Kt,R("place-return").textContent=Kt?.fromNote?"注に戻る":Kt?.fromPhase?"元の局所に戻る":"参照した箇所へ戻る";let c=o==="commons"&&J&&Ni("m:\u53C2\u7167\u7B87\u6240",d);R("place-open").hidden=!c,R("place-open").onclick=c?()=>Fe(c.meta.uuid):null;let h=["entrances","revisit"].includes(s)&&Ni("m:\u51FA\u5178\u672C\u6587",d);R("excerpt-open").hidden=!h,h&&(R("excerpt-open").textContent=ve(h)+"\u3092\u8AAD\u3080"),R("excerpt-open").onclick=h?()=>Fe(h.meta.uuid):null;let f=R("route-filter");f.hidden=s!=="routes"||!J,f.hidden&&(R("route-mode").value="both"),R("lines-panel").hidden=!0,R("focus-lines").hidden=!(J && (o==="history" || isReadingPhase(s)));for(let b of document.querySelectorAll("header [data-fit],#reading-nav [data-fit]")){let v=b.dataset.fit;if(b.closest("#reading-nav")){let _=Us(v)===o||v==="shared"&&o==="commons",M=v==="shared"&&n?"\u5171\u901A\u53C2\u7167":On[v];b.hidden=!_||M&&!u.has("x:"+M)||v==="annotationExchange"&&!displayingEmbeddedAtlas}let x=v===s;b.closest("header")&&v==="core"&&(x=!!J&&o==="core"),b.closest("header")&&v==="scope"&&(x=!!J&&o==="media"),b.setAttribute("aria-pressed",String(x))}if(R("reading-nav").hidden=isPhaseLine(s,Kt)||!J&&!(s==="history"&&t),R("reading-hint").hidden=!J||o==="core"||o==="commons",R("reading-hint").textContent={frames:"X\u2212 \u5404\u4EBA\u306E\u8A8D\u8B58\u3000\uFF0F\u3000X\uFF0B \u5A92\u4F53\u306E\u5B58\u5728",scope:"\u4E0B\u304B\u3089\u672C\u4EBAA\u3001\u4ED6\u8005B\u3001C\u3002\u4E0A\u6BB5\u306E\u300C\u793E\u4F1A\u300D\u304B\u3089\u540C\u3058\u3084\u308A\u53D6\u308A\u3092\u898B\u6E21\u305B\u308B\u3002",people:"\u539F\u70B9\u306FA\u304C0\u3001B\u304C\uFF0B96\u3001C\u304C\uFF0B192\u3002\u03BC\u306F\u5404\u4EBA\u306E\u539F\u70B9\u304B\u3089\u8AAD\u3080\u3002",manuscript:"\u672C\u4EBA\u3082\u4ED6\u8005\u3082\u3001\u540C\u3058\u6587\u3092\u305D\u306E\u5834\u3067\u3082\u5F8C\u523B\u3067\u3082\u8AAD\u3081\u308B\u3002",entry:"\u540C\u3058B\u304B\u3089\u3001\u8AAD\u3080\u7B87\u6240\u3092\u9078\u3076\u9053\u3068\u3001\u4FDD\u7559\u3057\u3066\u623B\u308B\u9053\u3092\u305F\u3069\u308B\u3002",argument:"\u7D50\u8AD6\u304B\u3089\u306E\u4E8C\u672C\u3092\u305F\u3069\u308B\u3002\u4E3B\u5F35\u3092\u8AAD\u3081\u3066\u3082\u3001\u6839\u62E0\u306F\u4FDD\u7559\u3067\u304D\u308B\u3002",carry:"\u4ECA\u56DE\u3064\u304B\u3093\u3060\u95A2\u4FC2\u304C\u3001\u5F8C\u3067\u5225\u306E\u6587\u732E\u3092\u9078\u3076\u624B\u639B\u304B\u308A\u306B\u306A\u308B\u3002",distribution:"\u4E0A\u6BB5\u304B\u3089\u3001\u3069\u306E\u7D4C\u8DEF\u304C\u8AB0\u306B\u958B\u304B\u308C\u7D9A\u3051\u308B\u304B\u3092\u898B\u6BD4\u3079\u308B\u3002",display:"\u540C\u3058\u7248\u304B\u3089\u3001\u898B\u308B\u305F\u3073\u306B\u8868\u793A\u304C\u751F\u307E\u308C\u308B\u3002",social:"\u5FDC\u7B54\u304C\u4EBA\u306E\u9593\u3092\u5DE1\u308A\u3001\u5171\u6709\u3057\u305F\u8A18\u6CD5\u304C\u6B21\u306E\u8AAD\u307F\u66F8\u304D\u306B\u8FD4\u308B\u3002"}[s]??"",s!=="selected"&&!r){R("details").hidden=!0,Z=null;for(let b of be)b.button.setAttribute("aria-pressed","false")}if(Fi()){
 const guidance={
 annotationExchange:phaseQuestions.annotationExchange,
 textLegacy:"文書が残り、別の人が読める。読み手は離れた記述を結び直す。",
 structureWork:"作り手が概念と関係を配置する。読み手は全体から部分に寄り、確かめた関係を全体に戻して読める。",
 core:"「寄る」で全体から部分へ。「捉え直す」で同じ全体に戻れる。",
 socialEffect:"本文と図は同じ箇所を指す。「二つの入口」で、後の読者が開ける一本を確かめられる。"
 };
 if(guidance[s]){R("reading-hint").textContent=isReadingPhase(s)?phaseQuestions[s]:guidance[s];R("reading-hint").hidden=false}
}let m={history:"traditional",present:"3dsl",future:"future"}[s];if(m){let b=H.points.filter(_=>{if(_.meta.tags?.includes("m:phase-"+m))return!0;let M=_.appearance.position[1];return m==="traditional"?M<=32:m==="3dsl"?M>=84&&M<=156:M===168}),v=new Set(b.map(_=>_.meta.uuid)),x=H.lines.filter(_=>v.has(_.appearance.end_a.ref)&&v.has(_.appearance.end_b.ref));i=[...v,...x.map(_=>_.meta.uuid)]}if(s==="selected"&&Z)if(i=[Z],Xe.get(Z))for(let v of H.lines)[v.appearance.end_a.ref,v.appearance.end_b.ref].includes(Z)&&i.push(v.meta.uuid,v.appearance.end_a.ref,v.appearance.end_b.ref);else{let v=H.lines.find(x=>x.meta.uuid===Z);v&&i.push(v.appearance.end_a.ref,v.appearance.end_b.ref)}const chosenPoint = displayingEmbeddedAtlas && s === "selected" ? Xe.get(Z) : null;
const personToFit = isPerson(chosenPoint) ? chosenPoint : null;
if (personToFit) J = new Set(i);
let g=$s(i,!!J);
if (personToFit) g.push(...personMarkerCorners(personToFit));
if (s === "annotationExchange") {
  for (const id of Os.annotationPeople) g.push(...personMarkerCorners(Xe.get(id)));
}
let y=Math.max(66,document.querySelector("header").getBoundingClientRect().bottom+12),p=R("reading-nav").hidden&&R("reading-example").hidden?Math.max(50,me-R("reading-tools").getBoundingClientRect().top+10):Math.max(65,me-R("reading-tools").getBoundingClientRect().top+10);
if (personToFit && !R("details").hidden) {
  p = Math.max(p, me - R("details").getBoundingClientRect().top + 10);
}
let w=Dn(g,{direction:isReadingPhase(s)||isPhaseLine(s,e)||personToFit?[.35,1,.24]:[1,1,1],up:[0,0,1],width:pe,height:me,fov:$.fov,minDistance:20,maxDistance:4e3,insets:{left:22,right:22,top:y,bottom:p}});s==="all"&&(je=w.distance),$.position.fromArray(w.position),Y.target.fromArray(w.target),$.updateProjectionMatrix(),Y.update(),oe=J?{target:Y.target.clone(),distance:w.distance,direction:$.position.clone().sub(Y.target).normalize()}:null,oe&&(s==="core"&&u.has("m:\u7D50\u3073\u65B9")||s==="routes"||o==="commons"||isReadingPhase(s)||isPhaseLine(s,Kt))&&(oe.extent=Math.max(1,...g.map(b=>Y.target.distanceTo(new N(...b))))),Ue=!0}function ac(){if(!oe)return 1;let s=$.position.clone().sub(Y.target);if(oe.extent){let u=Y.target.distanceTo(oe.target)/oe.extent,t=Math.log2(s.length()/oe.distance),n=ne.clamp(Math.max((u-1)*1.6,t*1.25),0,1);return .055+.945*n*n*(3-2*n)}let e=Math.abs(Math.log2(s.length()/oe.distance)),i=Y.target.distanceTo(oe.target)/oe.distance,a=s.normalize().angleTo(oe.direction),l=ne.clamp(Math.max(e*1.7,i*4,a*2.2),0,1);return .055+.945*l*l*(3-2*l)}function Un(){je=0,pe=ei.clientWidth,me=ei.clientHeight,Jt=Math.min(devicePixelRatio||1,2),Zt.width=Math.round(pe*Jt),Zt.height=Math.round(me*Jt),Zt.style.width=pe+"px",Zt.style.height=me+"px",Te.setSize(pe,me),$.aspect=pe/me,$.updateProjectionMatrix(),Ue=!0}function fe(s){let e=s.clone().project($);return{x:(e.x+1)*pe/2,y:(1-e.y)*me/2,z:e.z}}function Nt(s){let e=$.matrixWorldInverse.elements;return-(s.x*e[2]+s.y*e[6]+s.z*e[10]+e[14])}function ks(s,e){let i=Nt(s),a=Nt(e),l=$.near*1.0001,u=$.far;if(Math.max(i,a)<l||Math.min(i,a)>u)return null;if(i===a)return[s,e];let t=ne.clamp((ne.clamp(i,l,u)-i)/(a-i),0,1),n=ne.clamp((ne.clamp(a,l,u)-i)/(a-i),0,1);return[t===0?s:s.clone().lerp(e,t),n===1?e:s.clone().lerp(e,n)]}function oc(s){let e=s.object.position,i=fe(e),a=Math.min(...[s.basis.right,s.basis.up].map(l=>{let u=fe(e.clone().addScaledVector(l,s.size));return Math.hypot(u.x-i.x,u.y-i.y)}));return .22+.78*ne.smoothstep(a,4,14)}function lc(s,e){let i=1;if(e>0){let a=fe(s.baseCenter),l=Math.min(...[s.basis.right,s.basis.up].map(t=>{let n=fe(s.baseCenter.clone().addScaledVector(t,s.size));return Math.max(Math.abs(n.x-a.x),Math.abs(n.y-a.y))})),u=s.kind==="point"?17:13;i+=e*(ne.clamp(u/Math.max(l,.01),1,4)-1)}i!==(s.viewScale??1)&&(s.viewScale=i,s.object.scale.setScalar(i*s.size/64),s.object.position.copy(s.position).lerp(s.baseCenter,i))}function Ws(s,e){return e==="both"||!s.appearance.end_a||!s.meta.tags?.includes("x:\u6298\u308A\u8FD4\u3057")||(s.signification.relation?.structural==="containment"?"members":"turn")===e?1:.17}function cc(s,e){let i=s.marker,a=i.common??{},l=Se(s.position),u=Se(a.scale??[1,1,1]),[t,n,d]=a.orientation??[0,0,0],r=new De(n,t,d,"YXZ");U.beginPath();for(let o of[i.outer_radius??1,i.inner_radius??.7]){for(let c=0;c<32;c++){let h=c*Math.PI/16,f=new N(Math.cos(h)*o,Math.sin(h)*o,0).multiply(u).applyEuler(r).add(l),m=Nt(f);if(m<=$.near||m>=$.far)return;let g=fe(f);c===0?U.moveTo(g.x,g.y):U.lineTo(g.x,g.y)}U.closePath()}U.fill("evenodd"),e&&(U.strokeStyle=U.fillStyle,U.lineWidth=1.5,U.stroke())}function uc(s){let e=new Map,i=ne.smoothstep,a=Y.target.y<160?"text":Y.target.y<480?"receiver":"commons",l=i(s,.4,.64),u=We==="all"||l>.99&&ac()>.8,t=u?1-i(s,.13,.46):1-i($.position.distanceTo(Y.target)/Math.max(1,oe?.distance??je),.45,.96);if(!u&&!["core","routes","resolution","detail","text","entrances","revisit","shared","sharingOverview","socialEffect","structureWork","textLegacy","exampleLoop"].includes(We))return null;for(let{e:d}of Ot){let r=d.meta.uuid,o;if(u){let c=Os.overview.includes(r)&&(displayingEmbeddedAtlas||d.signification.caption!=="領域へ展開")?l:0,h=Os[a].includes(r)?1-l:0;o=Math.min(1,c+h)}else{let c=Bs.get(r)??1;o=We==="exampleLoop"?Number(J?.has(r)):["textLegacy","structureWork","socialEffect"].includes(We)?Number(J?.has(r)):J?.has(r)&&c>=(We==="core"?4:2)?1:0}if(!(!o||d.appearance.visible===!1||d.appearance.line_style==="none"||d.appearance.opacity===0))for(let c of[r,d.appearance.end_a.ref,d.appearance.end_b.ref])e.set(c,Math.max(e.get(c)??0,o))}return e.size?{strength:d=>e.get(d.meta.uuid)??0,secondary: u ? .56 + .1*t : .34 + .25*t}:null}function loopReadingHead(available, projectedLength, projectedRadius) {
  // Size in CSS pixels. The head stays on the projected terminal segment, even edge-on.
  const length = Math.min(available * .75, Math.max(15, projectedLength));
  const halfWidth = Math.min(length * .48, Math.max(6, projectedRadius));
  return {length, halfWidth};
}
function drawLoopDirection(chain) {
  // Anchor the marker near the exit bend on the longest Z segment of each directed edge.
  let endIndex = 1;
  let rise = 0;
  for (let i = 1; i < chain.length; i++) {
    const span = Math.abs(chain[i].z - chain[i - 1].z);
    if (span > rise) {
      rise = span;
      endIndex = i;
    }
  }
  if (!rise) return;
  drawDirectionOnSegment(chain[endIndex - 1], chain[endIndex], .82, 12, 5);
}
function drawPhaseDirection(chain) {
  // The two inter-phase edges advance along Y on a single orthogonal run.
  const endIndex = chain.findIndex((end, i) => i > 0 && end.y > chain[i - 1].y &&
    end.x === chain[i - 1].x && end.z === chain[i - 1].z);
  if (endIndex > 0) drawDirectionOnSegment(chain[endIndex - 1], chain[endIndex], .55, 10, 18);
}
function drawDirectionOnSegment(start, end, fraction, maxLength, minSpan) {
  const worldTip = start.clone().lerp(end, fraction);
  if (Nt(worldTip) < $.near * 1.0001 || Nt(worldTip) > $.far) return;
  const visible = ks(start, worldTip);
  if (!visible) return;
  const base = fe(visible[0]);
  const tip = fe(worldTip);
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const distance = Math.hypot(dx, dy);
  if (distance < minSpan) return;
  const length = Math.min(maxLength, distance * .45);
  const halfWidth = length * .42;
  const ux = dx / distance, uy = dy / distance;
  const x = tip.x - ux * length, y = tip.y - uy * length;
  U.beginPath();
  U.moveTo(tip.x, tip.y);
  U.lineTo(x - uy * halfWidth, y + ux * halfWidth);
  U.lineTo(x + uy * halfWidth, y - ux * halfWidth);
  U.closePath();
  U.fill();
}
function phaseLabelQuadsOverlap(first, second) {
  // A projected text plane can be a narrow diagonal quadrilateral. Test its actual sides.
  for (const polygon of [first, second]) {
    for (let index=0; index<polygon.length; index++) {
      const a=polygon[index], b=polygon[(index+1)%polygon.length];
      const dx=b.x-a.x, dy=b.y-a.y, length=Math.hypot(dx,dy);
      if (length < .01) continue;
      const across=point=>(dy*point.x-dx*point.y)/length;
      const left=first.map(across), right=second.map(across);
      const depth=Math.min(Math.max(...left),Math.max(...right))-Math.max(Math.min(...left),Math.min(...right));
      if (depth <= .5) return false;
    }
  }
  return true;
}
function hc(){if(!Fn||!Ue)return;personMarkerHits.length = 0;Ue=!1,$.updateMatrixWorld(),U.setTransform(Jt,0,0,Jt,0,0),U.clearRect(0,0,pe,me),je||(je=Dn($s(null),{direction:[1,1,1],up:[0,0,1],width:pe,height:me,fov:$.fov,minDistance:20,maxDistance:4e3,insets:{left:22,right:22,top:82,bottom:60}}).distance);let s=$.position.distanceTo(Y.target)/je,e=Fi()?ne.smoothstep(s,.43,.6)*(J?ne.smoothstep(ac(),.4,.85):1):0,i=Fi(),a=i&&R("compare-width")?.checked,u=i&&R("compare-opacity").checked?uc(s):null,t=R("monochrome").checked;ei.classList.toggle("mono-trial",t);let n=Math.max(e,ac()),d=R("route-filter").hidden?"both":R("route-mode").value,r=p=>Z===p.meta.uuid?1:J&&!J.has(p.meta.uuid)?n:Ws(p,d),o=0;if(We==="revisit"&&oe){let w=$.position.clone().sub(Y.target).normalize().angleTo(oe.direction);o=(1-n)/.945*(1-ne.smoothstep(w,.12,.5))}const focusedPhaseLine = isPhaseLine(We,Kt);
const localLabels = (isReadingPhase(We) || focusedPhaseLine) && J && n < .8;
let c=!J||n>.8,h=localLabels ? [...be].sort((p,w)=>
  Number(w.e.meta.uuid===Z)-Number(p.e.meta.uuid===Z) ||
  Number(J.has(w.e.meta.uuid))-Number(J.has(p.e.meta.uuid)) ||
  Number(p.kind==="line")-Number(w.kind==="line")) : c?[...be].sort((p,w)=>(w.e.meta.uuid===Z)-(p.e.meta.uuid===Z)||(e>.5?overviewSize(w,pe<=520)-overviewSize(p,pe<=520):0)||w.size-p.size||(p.kind==="line")-(w.kind==="line")):be,f=[],m=p=>!u||Z===p.meta.uuid?1:ne.lerp(u.secondary,1,u.strength(p));const loopReading = We === "exampleLoop" && Fi();
const showPhaseDirections = We === "all" && displayingEmbeddedAtlas && u && e > .45 &&
  Math.abs($.matrixWorldInverse.elements[6]) < .985;
for(let p of h){let w=o>0&&J.has(p.e.meta.uuid),b=J?.has(p.e.meta.uuid),v=c&&s>.1&&s<.63,x=w?o:v?p.kind==="point"&&p.size>=8?1:.4:b&&!e?p.kind==="point"?.72:.45:0;lc(p,localLabels && b ? 1 : x);
if (localLabels && !focusedPhaseLine && b && pe<=520 && p.kind==="point" && p.size>=32)
  setOverviewSize(p,p.size/2,1);
if (loopReading && p.e.meta.uuid === readingExample.ids[0]) setOverviewSize(p, p.size / 2, 1);
const macro=e>0?overviewSize(p,pe<=520):0;if(macro)setOverviewSize(p,macro,e);let _=Nt(p.object.position);p.object.visible=_>=$.near&&_<=$.far;let M=!localLabels&&oe?.extent&&!w&&Z!==p.e.meta.uuid&&J.has(p.e.meta.uuid)?oc(p):1,B=p.object.visible?Math.max(r(p.e)*m(p.e)*M*(1-e),macro?e:0):0;if((v||e>.05||localLabels&&b)&&B>.02){let A=p.corners.map(k=>fe(p.position.clone().lerp(Se(k),p.viewScale??1))),P=A.map(k=>k.x),C=A.map(k=>k.y),L={l:Math.min(...P)-3,r:Math.max(...P)+3,t:Math.min(...C)-2,b:Math.max(...C)+2},G=Math.min(L.r-L.l-6,L.b-L.t-4);if (localLabels && b) L.quad=[A[0],A[1],A[3],A[2]];
const collides=f.some(k=>L.l<k.r&&L.r>k.l&&L.t<k.b&&L.b>k.t&&
  (!L.quad||!k.quad||phaseLabelQuadsOverlap(L.quad,k.quad)));
if (p.e.meta.uuid!==Z && (G<(macro?5:11)||collides)) B=0;
else if (L.r>0&&L.l<pe&&L.b>0&&L.t<me) f.push(L);}p.button.style.opacity=String(B),p.button.style.pointerEvents=B<.22?"none":"auto",p.button.tabIndex=B<.22?-1:0}let g=p=>a?Bs.get(p.meta.uuid)??1:1,y=u||a?[...Ot].sort((p,w)=>(u?u.strength(p.e)-u.strength(w.e):0)||g(p.e)-g(w.e)):Ot;for(let{e:p,chain:w}of y){let b=p.appearance;if(b.visible===!1||b.line_style==="none")continue;let v=g(p);const exampleEdge = loopReading && J?.has(p.meta.uuid);
const focusStroke = exampleEdge || (focusedPhaseLine || We === "annotationExchange") && J?.has(p.meta.uuid);
U.strokeStyle=t?"#aab9c1":b.color,U.fillStyle=U.strokeStyle,U.globalAlpha=(Z===p.meta.uuid?1:b.opacity??.65)*r(p),U.globalAlpha*=1-e*.14,u&&Z!==p.meta.uuid&&(U.globalAlpha=ne.lerp(U.globalAlpha*u.secondary,.94,u.strength(p))),U.lineWidth=Math.max(1.1*v,focusStroke?2.6:0)+(Z===p.meta.uuid?1.3:0),U.setLineDash(b.line_style==="dashed"?[6,5]:b.line_style==="dotted"?[2,5]:[]),U.beginPath();let x=null;for(let M=1;M<w.length;M++){let B=ks(w[M-1],w[M]);if(!B){x=null;continue}let[A,P]=B;if(A!==x){let L=fe(A);U.moveTo(L.x,L.y)}let C=fe(P);U.lineTo(C.x,C.y),x=P}U.stroke(),U.setLineDash([]);if (exampleEdge) drawLoopDirection(w);
if (showPhaseDirections && Os.phaseBridges.includes(p.meta.uuid)) {
  const lineOpacity = U.globalAlpha;
  U.globalAlpha *= ne.smoothstep(e, .45, .95);
  drawPhaseDirection(w);
  U.globalAlpha = lineOpacity;
}
let _=b.arrow;if(_&&_.primitive!=="none")for(let M of _.placement==="both"?["a","b"]:_.placement==="end_a"?["a"]:_.placement==="none"?[]:["b"]){let B=M==="b"?w:[...w].reverse(),A=B.at(-1),P=B.at(-2),C=B.length-2;for(;C>=0&&P.distanceToSquared(A)<1e-10;)P=B[C--];if(C<0&&P.distanceToSquared(A)<1e-10||Nt(A)<$.near*1.0001||Nt(A)>$.far)continue;let L=A.clone().sub(P).normalize(),G=Math.min(_.height??_.length??2,A.distanceTo(P)/2),k=ks(A.clone().addScaledVector(L,-G),A)[0],S=fe(A),I=fe(k),F=S.x-I.x,E=S.y-I.y,T=Math.hypot(F,E);if(T<.01)continue;let O=_.radius??.5,le=fe(k.clone().addScaledVector(Se([1,0,0]),O)),he=Math.max(.4,Math.hypot(le.x-I.x,le.y-I.y)),Vn=fe(P),Gn=Math.hypot(Vn.x-S.x,Vn.y-S.y),exampleHead=focusStroke?loopReadingHead(Gn,T,he):null,
Hn=exampleHead?.length??(v>1?Math.min(Gn*.75,Math.max(T,U.lineWidth*1.8)):T),
ti=exampleHead?.halfWidth??(v>1?Math.max(he,Math.min(Gn*.4,U.lineWidth*.85)):he),ki=F/T,Bi=E/T,$n=S.x-ki*Hn,Wn=S.y-Bi*Hn;U.beginPath(),U.moveTo(S.x,S.y),U.lineTo($n-Bi*ti,Wn+ki*ti),U.lineTo($n+Bi*ti,Wn-ki*ti),U.closePath(),U.fill()}}U.globalAlpha=1;for(let p of H.points){let w=p.appearance;if(w.visible===!1)continue;let b=fe(Se(w.position));if(b.z>1||b.z<-1)continue;let v=Z===p.meta.uuid;
const personOpacity = personMarker ? personMarkerOpacity(p, e) : 0;
if (personOpacity > .035) {
  // Paint on the model canvas, underneath the separate layer of anchored text.
  U.globalAlpha = personOpacity;
  U.fillStyle = t ? "#d6e0e4" : "#b7eee0";
  const scale = We === "all" ? 1 + e : 1;
  const corners = personMarkerCorners(p, scale).map(position => fe(Se(position)));
  const xs = corners.map(corner => corner.x);
  const ys = corners.map(corner => corner.y);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);
  if (right >= 0 && left <= pe && bottom >= 0 && top <= me) {
    drawPersonMarker(U, personMarker, w.position, coordinates => fe(Se(coordinates)), scale);
    if (personOpacity >= .25 && corners.every(corner => Math.abs(corner.z) <= 1)) {
      personMarkerHits.push({ id: p.meta.uuid, left, right, top, bottom });
    }
  }
  continue;
}
if(U.globalAlpha=r(p)*m(p),U.fillStyle=t?"#d6e0e4":w.marker.common.color,w.marker.primitive==="corona"){cc(w,v);continue}U.beginPath(),U.arc(b.x,b.y,v?3:1.6,0,Math.PI*2),U.fill()}U.globalAlpha=1,Te.render(Ui,$),dc()}function dc(){let s=R("axes"),e=s.getContext("2d");e.clearRect(0,0,88,88);let i=$.quaternion.clone().invert();for(let[a,l,u]of[[[1,0,0],"X","#639dff"],[[0,1,0],"Y","#6be172"],[[0,0,1],"Z","#ff747c"]]){let t=Se(a).applyQuaternion(i);e.strokeStyle=u,e.lineWidth=2.5,e.beginPath(),e.moveTo(44,44),e.lineTo(44+t.x*27,44-t.y*27),e.stroke(),e.fillStyle=u,e.font="bold 13px sans-serif",e.textAlign="center",e.fillText(l,44+t.x*36,49-t.y*36)}}function Fe(s){atlasTour.close();if(readingExample.select(s))return;let e=Xe.get(s)??H.lines.find(r=>r.meta.uuid===s);if(!e)return;const showNote=displayingEmbeddedAtlas && s===readerNote?.id;R("reader-note").hidden=!showNote;Z=s;for(let r of be)r.button.setAttribute("aria-pressed",String(r.e.meta.uuid===s));R("selection").textContent=Xe.has(s)?(displayingEmbeddedAtlas&&introductoryRole(e)||ve(e))+" \xB7 "+zs(e):ve(e),R("description").textContent=e.meta.creator_memo??"";let i="m:\u53C2\u7167\u7DDA-",a=e.meta.tags?.find(r=>r.startsWith(i))?.slice(i.length),l=a&&H.lines.find(r=>r.meta.uuid===a),u=R("actual-route");u.hidden=!l;let t=e.meta.tags?.includes("m:\u53C2\u7167\u7B87\u6240");u.textContent=l&&t?"\u300C"+ve(l)+"\u300D\u306E\u7DDA\u3092\u898B\u308B":"\u5143\u306E\u7DDA\u3092\u898B\u308B";let n=R("edition-link"),d=t&&l?ec(l):!Xe.has(s)?ec(e):null;n.hidden=!d,d?(n.href=d,n.textContent="この版の「"+ve(l??e)+"」\u3092\u958B\u304F\u30EA\u30F3\u30AF"):n.href="",u.onclick=l?()=>{let r=t?{id:s,view:We==="shared"||We==="socialEffect"||Object.hasOwn(Bn,We)?We:"shared",position:$.position.clone(),target:Y.target.clone(),width:pe,height:me}:null;t?qs(l,r):(Ae("core"),Fe(l.meta.uuid),R("details").hidden=!0)}:null,R("details").hidden=!1,Ue=!0;
if(showNote){R("selection").textContent="学習者の注（作例）";readerNote.show();R("details").scrollTop=0;}
}function qs(s,e){Z=s.meta.uuid,Ae("linkedLine",e),Fe(s.meta.uuid),R("details").hidden=!0}function zn(){let s=window.location.hash;if(!s)return;let e=new URLSearchParams(s.slice(1));if(["#view=shared","#view=entrances","#view=revisit"].includes(s)){let a=e.get("view");if(a==="shared"||H.lines.some(l=>l.meta.tags?.includes("x:"+On[a]))){Ae(a),R("status").textContent="";return}}let i="\u3053\u306E\u30EA\u30F3\u30AF\u306E\u8AAD\u307F\u65B9\u3092\u7279\u5B9A\u3067\u304D\u3078\u3093\u304B\u3063\u305F\u3002\u901A\u5E38\u306E\u56F3\u3092\u8868\u793A\u3057\u3066\u308B\u3067\u3002";if(e.has("line")){let a=e.get("line"),l=e.get("rev");if(!(e.size===2&&e.getAll("line").length===1&&e.getAll("rev").length===1)||!l)i="\u7DDA\u3068\u7248\u3092\u7279\u5B9A\u3067\u304D\u3078\u3093\u30EA\u30F3\u30AF\u3084\u3002\u901A\u5E38\u306E\u56F3\u3092\u8868\u793A\u3057\u3066\u308B\u3067\u3002";else if(!Fi()||l!==H.document_meta.revised_at)i="\u30EA\u30F3\u30AF\u304C\u6307\u3059\u7248\u3068\u8868\u793A\u4E2D\u306E\u7248\u304C\u7570\u306A\u308B\u3067\u3002\u901A\u5E38\u306E\u56F3\u3092\u8868\u793A\u3057\u3066\u308B\u3002";else{let t=H.lines.find(n=>n.meta.uuid===a);if(t){let n=H.points.find(d=>d.meta.tags?.includes("m:\u53C2\u7167\u7B87\u6240")&&d.meta.tags.includes("m:\u53C2\u7167\u7DDA-"+a));qs(t,n?{id:n.meta.uuid,view:"entrances"}:null),R("status").textContent="";return}i="\u3053\u306E\u7248\u306B\u306F\u30EA\u30F3\u30AF\u304C\u6307\u3059\u7DDA\u304C\u898B\u3064\u304B\u3089\u3078\u3093\u3002\u901A\u5E38\u306E\u56F3\u3092\u8868\u793A\u3057\u3066\u308B\u3067\u3002"}}Ae(H.lines.some(a=>a.meta.tags?.includes("x:\u5F80\u9084"))?"core":"all"),R("status").textContent=i}function Xs(){let s=R("results");s.replaceChildren();let e=R("search").value.trim().toLowerCase();for(let i of H.points)if(ve(i).toLowerCase().includes(e)||(displayingEmbeddedAtlas&&introductoryRole(i)?.toLowerCase().includes(e))){let a=document.createElement("button");a.textContent=(displayingEmbeddedAtlas&&introductoryRole(i)||ve(i))+" \xB7 "+zs(i),a.onclick=()=>{Fe(i.meta.uuid),R("search-panel").hidden=!0,Ae("selected")},s.append(a)}}function fc() {
  if (!J) return;
  const panel=R("lines-panel"), list=R("focus-list");
  list.replaceChildren();
  const lines=H.lines.filter(line=>J.has(line.meta.uuid));
  const phase=isReadingPhase(We);
  if (phase) {
    const order=new Map([...J].map((uuid,index)=>[uuid,index]));
    lines.sort((first,second)=>order.get(first.meta.uuid)-order.get(second.meta.uuid));
  }
  for (const line of lines) {
    const endpoint=key=>{
      const point=Xe.get(line.appearance[key].ref);
      return ve(point)+(point.appearance.position[1]===24?"（後刻）":"");
    };
    const button=document.createElement("button");
    const ends=document.createElement("small"), caption=document.createElement("span");
    button.type="button";
    ends.textContent=endpoint("end_a")+" → "+endpoint("end_b");
    caption.textContent=ve(line);
    button.append(ends,caption);
    button.onclick=()=>{
      panel.hidden=true;
      if (phase) {
        qs(line,{fromPhase:true,view:We,position:$.position.clone(),target:Y.target.clone(),width:pe,height:me});
        R("place-return").focus({preventScroll:true});
      } else {
        Fe(line.meta.uuid);
      }
    };
    list.append(button);
  }
  R("details").hidden=true;
  panel.hidden=false;
}function pc(){let s=R("legend-content");s.replaceChildren();for(let e of H.visual_legend??[]){let i=document.createElement("p"),a=document.createElement("strong");a.textContent=Oi(e.label),i.append(a,document.createElement("br"),document.createTextNode(Oi(e.description))),s.append(i)}}var Ye=new Map;Te.domElement.addEventListener("pointerdown",s=>{if(Ye.set(s.pointerId,{x:s.clientX,y:s.clientY,id:s.target.closest("[data-id]")?.dataset.id,moved:!1}),Ye.size>1)for(let e of Ye.values())e.moved=!0});Te.domElement.addEventListener("pointermove",s=>{let e=Ye.get(s.pointerId);e&&Math.hypot(s.clientX-e.x,s.clientY-e.y)>6&&(e.moved=!0)});Te.domElement.addEventListener("pointerup",s=>{let e=Ye.get(s.pointerId);Ye.delete(s.pointerId);
if (e && !e.moved) {
  const id = e.id ?? pickPersonMarker(s.clientX, s.clientY);
  if (id) Fe(id);
}});Te.domElement.addEventListener("pointercancel",s=>Ye.delete(s.pointerId));for(let s of document.querySelectorAll("[data-fit]"))s.onclick=()=>{R("legend-panel").hidden=!0,R("search-panel").hidden=!0,Ae(s.dataset.fit)};R("find").onclick=()=>{R("lines-panel").hidden=!0,R("search-panel").hidden=!R("search-panel").hidden,R("search-panel").hidden||R("search").focus()};R("search").oninput=Xs;R("focus-lines").onclick=fc;R("note-open").onclick=()=>{if(readerNote && displayingEmbeddedAtlas){Fe(readerNote.id);R("note-source").querySelector("summary").focus({preventScroll:true})}};
R("note-check").onclick=()=>{
  if (!readerNote || !displayingEmbeddedAtlas) return;
  qs(readerNote.line,{id:readerNote.id,view:We,fromNote:true,position:$.position.clone(),target:Y.target.clone(),width:pe,height:me});
  R("place-return").focus({preventScroll:true});
};
R("place-return").onclick=()=>{
  if (!Kt) return;
  const origin=Kt;
  Ae(origin.view);
  if (origin.position && origin.width===pe && origin.height===me) {
    $.position.copy(origin.position);
    Y.target.copy(origin.target);
    Y.update();
  }
  if (origin.fromPhase) R("focus-lines").focus({preventScroll:true});
  else {Fe(origin.id);if(origin.fromNote)R("note-check").focus({preventScroll:true});}
};R("edition-link").onclick=s=>{!s.ctrlKey&&!s.shiftKey&&!s.altKey&&!s.metaKey&&s.currentTarget.href===window.location.href&&(s.preventDefault(),zn())};R("route-mode").onchange=()=>{let s=Z&&H.lines.find(e=>e.meta.uuid===Z);s&&Ws(s,R("route-mode").value)<1&&(be.find(e=>e.e.meta.uuid===Z)?.button.setAttribute("aria-pressed","false"),Z=null,R("details").hidden=!0),Ue=!0};R("legend").onclick=()=>{R("lines-panel").hidden=!0,R("legend-panel").hidden=!R("legend-panel").hidden};R("close-details").onclick=()=>{R("details").hidden=!0};for(let s of document.querySelectorAll("[data-close]"))s.onclick=()=>{R(s.dataset.close).hidden=!0};R("line-comparison").onchange=()=>{Ue=!0};R("download").onclick=()=>{let s=new Blob([JSON.stringify(H,null,2)+`
`],{type:"application/json"}),e=URL.createObjectURL(s),i=document.createElement("a");i.href=e,i.download="3DSL_MetaAtlas_Commons_vertical.3dss.json",i.click(),setTimeout(()=>URL.revokeObjectURL(e),1e3)};R("open").onchange=async s=>{try{let e=s.target.files[0];if(!e)return;if(e.size>32*1024*1024)throw Error("\u30D5\u30A1\u30A4\u30EB\u304C32MiB\u3092\u8D85\u3048\u3066\u308B\u3002");await Hs(JSON.parse(await e.text()))}catch(e){R("status").textContent=e.message}finally{s.target.value=""}};Y.addEventListener("change",()=>{Ue=!0});new ResizeObserver(()=>{Un()}).observe(ei);window.addEventListener("error",s=>{R("status").textContent=s.message});window.addEventListener("unhandledrejection",s=>{R("status").textContent=String(s.reason)});const readerNote=createReaderNote(Nn,ec);
const atlasTour=createAtlasTour({model:Nn,fit:view=>{R("legend-panel").hidden=true;R("search-panel").hidden=true;Ae(view)},openNote:()=>R("note-open").click()});
Y.addEventListener("start",atlasTour.pause);
document.querySelector("header").addEventListener("click",atlasTour.close,{capture:true});
document.addEventListener("visibilitychange",()=>{if(document.hidden)atlasTour.pause()});
const readingExample=createReadingExample({model:Nn,fit:Ae,editionLink:ec,currentView:()=>We});
window.metaAtlas={getDocument:()=>structuredClone(H),getCamera:()=>({position:$.position.toArray(),target:Y.target.toArray()}),getLabels:()=>be.map(s=>({id:s.e.meta.uuid,text:s.ink.textContent,writingMode:s.ink.style.writingMode,pose:s.config.pose,corners:s.corners})),fit:Ae,validateDocument:Gs};await Hs(Nn);zn();window.addEventListener("hashchange",zn);function js(){requestAnimationFrame(js),hc()}js();
/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
