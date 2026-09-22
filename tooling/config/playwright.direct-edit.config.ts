import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '../e2e',
  testMatch: 'direct-edit.e2e.ts',
  outputDir: '../../test-results/direct-edit',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:3999',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter source-map-playground dev --host 127.0.0.1',
    url: 'http://127.0.0.1:3999',
    reuseExistingServer: true,
  },
});
