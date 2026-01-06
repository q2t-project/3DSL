console.error(
  [
    "[sync:library-index] DEPRECATED",
    "library_index.json is generated in packages/3dss-content by build-library-dist.mjs.",
    "Run: npm run sync:3dss-content (it copies packages/3dss-content/dist -> apps/site/public)."
  ].join("\n")
);
process.exit(1);
