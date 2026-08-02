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
    proxy: {
      // The only channel to SheShield. Proxying keeps it same-origin, so the
      // backend needs no CORS entry for this app in development.
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
    },
  },
});
