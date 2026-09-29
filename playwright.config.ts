import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Student Self-Practice Web App E2E suite.
 * Starts the Vite dev server automatically before running tests.
 *
 * Scope and required data-testid contract:
 * plans/260827-student-self-practice-site/plan.md
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The dev server serves ~1.2 MB of unminified dotLottie WASM plus 400+
  // per-emoji SVG/JSON requests on first load of each page; with the default
  // core-count parallelism the suite's click/assertion steps can starve past
  // 30 s on this machine, so cap workers and raise the per-test timeout.
  workers: process.env.CI ? 2 : 3,
  timeout: 90_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
