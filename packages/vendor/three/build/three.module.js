// Shim build artifact for 3DSL local vendor.
// Upstream `three` npm package normally ships build/three.module.js.
// This vendored tree appears to omit the build output, so we forward exports
// to the source entry.
export * from '../src/Three.js';
