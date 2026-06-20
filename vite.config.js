import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const require = createRequire(import.meta.url);

// Upload source maps only during CI/builds where Sentry credentials are available.
const enableSentrySourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    enableSentrySourceMaps &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      }),
  ].filter(Boolean),

  build: {
    // Keep false unless source maps are uploaded to Sentry. This avoids publishing
    // source maps accidentally when Sentry upload credentials are not present.
    sourcemap: enableSentrySourceMaps ? 'hidden' : false,
  },

  // ✅ Fix: amazon-cognito-identity-js expects Node global
  define: {
    global: 'globalThis',
  },

  // ✅ Browser polyfills for node modules used by cognito package
  resolve: {
    alias: {
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser'),
    },
  },

  optimizeDeps: {
    include: ['buffer', 'process'],
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
