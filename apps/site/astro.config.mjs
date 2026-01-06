// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
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