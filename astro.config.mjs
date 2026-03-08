// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://rubenpg.dev', // TODO: actualizar con dominio real
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['ogl'],
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
