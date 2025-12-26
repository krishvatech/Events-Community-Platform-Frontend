import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // ✅ Fix: amazon-cognito-identity-js expects Node global
  define: {
    global: 'globalThis',
  },

  // ✅ Browser polyfills for node modules used by cognito package
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
    },
  },

  optimizeDeps: {
    include: ['buffer', 'process'],
  },

  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
