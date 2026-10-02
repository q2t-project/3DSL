// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: "https://3dsl.jp",
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