import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/v1/wallet': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/v1/admin/auction': { target: 'http://localhost:3002', changeOrigin: true },
      '/api/v1/admin/product': { target: 'http://localhost:3002', changeOrigin: true },
      '/api': { target: 'http://localhost:3003', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3002', ws: true },
    },
  },
});
