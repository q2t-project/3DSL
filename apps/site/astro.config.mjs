// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Preserve literal punctuation in specification text and copyable shell commands.
  markdown: { processor: satteri({ features: { smartPunctuation: false } }) },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: [
          "**/public/vendor/**",
          "**/public/viewer/**",
          "**/public/3dss/**",
          "**/public/library/**",
        ],
      },
    },
  },
});