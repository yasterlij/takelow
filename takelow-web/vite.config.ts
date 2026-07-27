import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const IDENTITY = 'http://localhost:3001';
const ENGINE = 'http://localhost:3002';
const QUERY = 'http://localhost:3003';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': { target: IDENTITY, changeOrigin: true },
      '/api/v1/wallet': { target: IDENTITY, changeOrigin: true },
      '/api/v1/notify': { target: IDENTITY, changeOrigin: true },
      '/api/v1/admin/users': { target: IDENTITY, changeOrigin: true },
      '/api/v1/payments': { target: ENGINE, changeOrigin: true },
      '/api/v1/admin/auctions': { target: ENGINE, changeOrigin: true },
      '/api/v1/admin/products': { target: ENGINE, changeOrigin: true },
      '/api/v1/admin': { target: ENGINE, changeOrigin: true },
      '/api/v1/products': { target: QUERY, changeOrigin: true },
      '/api/v1/auctions/:id/bid': { target: ENGINE, changeOrigin: true },
      '/api/v1/auctions/result': { target: ENGINE, changeOrigin: true },
      '/api/v1/auctions': { target: QUERY, changeOrigin: true },
      '/api': { target: QUERY, changeOrigin: true },
      '/socket.io': { target: ENGINE, ws: true },
    },
  },
});
