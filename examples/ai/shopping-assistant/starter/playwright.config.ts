import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: 'list',
  timeout: 12_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:3100',
    actionTimeout: 4_000,
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined },
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
