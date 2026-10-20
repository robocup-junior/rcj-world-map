import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under /rcj-world-map/ and in any subfolder.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1200 }, // MapLibre is a single ~1 MB chunk; that's expected
});
