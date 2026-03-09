// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

const basePath = process.env.BASE_PATH?.trim();
const siteUrl = process.env.SITE_URL?.trim() || 'https://rubenpg.dev';

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: basePath && basePath !== '/' ? basePath : undefined,
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['ogl', 'framer-motion'],
      exclude: ['three'],
    },
    ssr: {
      noExternal: ['ogl'],
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
