import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
export default defineConfig({ root: resolve(__dirname, '..'), plugins: [react(), tailwindcss()],
  resolve: { alias: [{ find: /.*\/contexts\/AuthContext$/, replacement: resolve(__dirname, 'auth-stub.tsx') }] },
  server: { port: 5361, strictPort: true } });
