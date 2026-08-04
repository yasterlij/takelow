import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const IDENTITY = process.env.VITE_IDENTITY_API_BASE_URL || 'http://localhost:3001';
const ENGINE = process.env.VITE_ENGINE_API_BASE_URL || 'http://localhost:3002';
const QUERY = process.env.VITE_QUERY_API_BASE_URL || 'http://localhost:3003';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'framer-motion'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'socket'
            if (id.includes('axios')) return 'axios'
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
            return 'vendor'
          }
        },
      },
    },
  },
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
      '/api/v1/admin/stats': { target: QUERY, changeOrigin: true },
      '/api/v1/admin': { target: ENGINE, changeOrigin: true },
      '/api/v1/products': { target: QUERY, changeOrigin: true },
      '/api/v1/auctions/result': { target: ENGINE, changeOrigin: true },
      '^/api/v1/auctions/[^/]+/result': { target: ENGINE, changeOrigin: true },
      '^/api/v1/auctions/[^/]+/bid': { target: ENGINE, changeOrigin: true },
      '^/api/v1/auctions/[^/]+/my-bids': { target: ENGINE, changeOrigin: true },
      '/api/v1/auctions': { target: QUERY, changeOrigin: true },
      '/api': { target: QUERY, changeOrigin: true },
      '/socket.io': { target: ENGINE, ws: true },
      '/uploads': { target: ENGINE, changeOrigin: true },
    },
  },
});
