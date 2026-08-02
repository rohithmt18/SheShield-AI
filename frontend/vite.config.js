import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Matches the backend's default CORS origin.
    port: 5273,
    // Fail instead of sliding to 5274+. A moved port silently becomes an origin
    // the backend does not know, so the app loads and every API call 403s —
    // which looks like a broken backend rather than a stale dev server.
    // `npm run dev` preflights the port and names the process holding it.
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
      '/health': { target: 'http://localhost:5050', changeOrigin: true },
    },
  },
});
