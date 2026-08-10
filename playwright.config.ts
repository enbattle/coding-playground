import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 'list' locally for fast, readable terminal output; in CI, 'github' annotates failures inline
  // on the PR and 'html' produces a downloadable report (screenshots, traces) for the artifact
  // upload in .github/workflows/ci.yml.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  // Runs against a real `vite build` + `vite preview`, not `vite dev` — deliberately. Vite's dev
  // server bypasses Rollup's chunking entirely (native unbundled ESM), so it would never have
  // caught the real bug this suite exists partly to prevent: Rollup splitting monaco-editor's
  // internal dynamic imports into multiple chunks under the app's own React.lazy() boundary broke
  // several Monaco contributions (CodeLens, Suggest, CodeAction — see vite.config.ts's
  // manualChunks comment) in the production build while looking completely fine under `vite dev`.
  webServer: {
    command: 'npm run e2e:serve',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  // Single browser target for now — right-sized for a solo MVP with no cross-browser bug reports
  // yet, not a statement that Firefox/WebKit don't matter. Add more `projects` entries the moment
  // there's a real trigger (a reported bug, a second contributor who needs the coverage).
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
