// SSOT: packages/vendor/three/
// This repo vendors the full three.js source tree under src/.
// Some consumers expect the canonical build entry "build/three.module.js".
// Instead of checking in the full built artifact, we provide a thin ESM bridge.
//
// NOTE:
// - This is valid ESM for browsers.
// - It re-exports the same symbols as "src/Three.js".

export * from "../src/Three.js";
import * as THREE from "../src/Three.js";
export default THREE;
