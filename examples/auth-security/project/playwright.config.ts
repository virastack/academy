import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "e2e", dependencies: ["setup"] },
  ],
  webServer: {
    command: "npm run build && npm run start",
    timeout: 180_000,
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
