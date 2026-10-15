import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: 'list',
  timeout: 15_000,
  expect: { timeout: 3_000 },
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
