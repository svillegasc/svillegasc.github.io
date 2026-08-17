// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://svillegasc.github.io',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
