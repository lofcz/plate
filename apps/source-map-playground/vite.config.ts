import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const packagesDir = path.resolve(__dirname, '../../packages');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point @platejs/markdown at TypeScript source for instant iteration.
      // Edit serializeMdWithSourceMap.ts, save, and see changes immediately.
      '@platejs/markdown': path.join(packagesDir, 'markdown/src/index.ts'),
      // Plate React entry needs aliasing to source too so usePlateEditor works
      'platejs/react': path.join(packagesDir, 'plate/src/react/index.tsx'),
      platejs: path.join(packagesDir, 'plate/src/index.tsx'),
    },
    dedupe: ['react', 'react-dom', 'slate', 'slate-dom'],
  },
  server: { port: 3999 },
});
