import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 5273 belongs to the SheShield app itself; this is a separate client.
    port: 5274,
    // See frontend/vite.config.js — a silently moved port produces a page whose
    // every API call fails, so this refuses to start rather than mislead.
    strictPort: true,
    proxy: {
      // The only channel to SheShield. Proxying keeps it same-origin, so the
      // backend needs no CORS entry for this app in development.
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
    },
  },
});
