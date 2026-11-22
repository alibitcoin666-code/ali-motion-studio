import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/remotion') || id.includes('@remotion/player')) return 'remotion';
          if (id.includes('node_modules/react')) return 'react';
        },
      },
    },
  },
});
