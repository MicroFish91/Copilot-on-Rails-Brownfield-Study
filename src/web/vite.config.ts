import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: forwards /api -> Functions host (http://localhost:7071)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
