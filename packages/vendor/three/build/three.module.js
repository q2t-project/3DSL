// Minimal ESM entrypoint for browser imports.
//
// This repo vendors THREE as source under packages/vendor/three/src.
// Upstream npm builds provide packages/vendor/three/build/three.module.js.
// For this monorepo, we keep a small stable entry that re-exports the public
// API from src/Three.js, so /vendor/three/build/three.module.js remains a
// consistent browser import path.

export * from "../src/Three.js";
