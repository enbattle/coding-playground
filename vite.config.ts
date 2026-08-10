import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Monaco's contribution modules (CodeLens, Suggest, CodeAction, etc.) register themselves
        // against a shared service registry that assumes the whole package evaluates as one
        // synchronous unit. Left to its own chunking heuristics, Rollup splits monaco-editor's
        // internal dynamic imports into several chunks under the outer React.lazy() boundary
        // (AppShell.tsx) — some of those contributions then run before their service's chunk has
        // loaded, throwing "depends on UNKNOWN service" at runtime. Forcing all of node_modules/
        // monaco-editor into a single chunk keeps it atomic regardless of how it's imported.
        manualChunks: (id) => {
          if (id.includes('node_modules/monaco-editor')) return 'monaco';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Vitest's default include (`**/*.spec.ts`) would otherwise also pick up e2e/*.spec.ts, which
    // use @playwright/test's `test`/`expect`, not Vitest's — excluded here, not just left to run
    // (and fail) by accident.
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});
