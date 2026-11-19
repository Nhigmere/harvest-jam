import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, Vite sirve la interfaz en :5173 y manda /api al servidor Express.
const API = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': API },
  },
  preview: {
    port: 4173,
    proxy: { '/api': API },
  },
});
