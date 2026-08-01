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
    proxy: {
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
      '/health': { target: 'http://localhost:5050', changeOrigin: true },
    },
  },
});
