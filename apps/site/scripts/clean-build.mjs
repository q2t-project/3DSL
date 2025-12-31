import fs from "node:fs";
fs.rmSync("dist", { recursive: true, force: true });
fs.rmSync(".astro", { recursive: true, force: true });
console.log("[clean:build] removed dist/ and .astro/");
