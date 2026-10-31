import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3101",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: [
    {
      command: "node tests/support/postgrest-fixture.mjs",
      url: "http://127.0.0.1:54329/health",
      reuseExistingServer: false,
    },
    {
      command: "npm start",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        PORT: "3101",
        SUPABASE_URL: "http://127.0.0.1:54329",
        SUPABASE_SECRET_KEY: "fictional-test-key",
      },
    },
  ],
});
