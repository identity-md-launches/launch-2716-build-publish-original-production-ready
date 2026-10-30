/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0 },
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], environment: 'node' },
});
