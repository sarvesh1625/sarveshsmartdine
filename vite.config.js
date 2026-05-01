import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // All /api calls → backend on port 5000
      '/api': {
        target:      'http://localhost:5000',
        changeOrigin: true,
      },
      // Socket.io → backend
      '/socket.io': {
        target:  'http://localhost:5000',
        ws:       true,
        changeOrigin: true,
      },
    },
  },
});