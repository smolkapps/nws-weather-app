import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the static build works from any sub-path (GitHub Pages etc.).
  base: './',
});
