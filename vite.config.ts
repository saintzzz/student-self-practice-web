/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // The gemini-web Chromium profile + the plaintext handoff bundle live
      // inside the repo but are not source - watching their cookie/sqlite
      // files crashes the dev server on Windows (EBUSY) and wastes cycles.
      ignored: ['**/gemini-web-profile*/**', '**/machine-transfer/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // CR-89: keep framework/vendor code in long-lived cacheable chunks
        // so the app chunk (which changes every deploy) stays small.
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // '**/node_modules/**' (not 'node_modules/**') - the scripts/gtm symlink
    // points outside the repo, so vendored test files under
    // scripts/gtm/*/node_modules must still be excluded.
    exclude: ['**/node_modules/**', 'scripts/gtm/**', 'e2e/**', 'tests/fixtures/**'],
    // EmojiVisual pulls a 171 kB lazy player chunk on first mount in every
    // component test; unbounded parallelism starves long tests past their
    // timeouts on mid-range machines. Cap workers for stability.
    poolOptions: { forks: { maxForks: 4, minForks: 1 } },
  },
});
