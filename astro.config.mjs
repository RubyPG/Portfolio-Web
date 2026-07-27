// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

const basePath = process.env.BASE_PATH?.trim();
const siteUrl = process.env.SITE_URL?.trim() || 'https://rubenpg.dev';
const isDevCommand = process.argv.includes('dev');
// Build and dev use different React JSX branches, and two dev servers can
// optimize the same files concurrently. Isolate live servers by process so
// neither case can replace a runtime underneath an already loaded page.
const viteCacheDir = isDevCommand
  ? `node_modules/.vite-serve-${process.pid}`
  : 'node_modules/.vite-build';

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: basePath && basePath !== '/' ? basePath : undefined,
  output: 'static',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  redirects: {
    '/sobre-mi': '/',
    '/contacto': '/#contacto',
    '/en/sobre-mi': '/en',
    '/en/contacto': '/en#contacto',
  },
  integrations: [react()],
  vite: {
    cacheDir: viteCacheDir,
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
