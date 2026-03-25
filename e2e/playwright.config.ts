import { defineConfig } from "@playwright/test";

/**
 * E2E tests for addfox-built extensions (Chrome extension loaded via fixture).
 * Run `pnpm run e2e` (builds react-template then runs tests) or set ADDFOX_E2E_EXTENSION_PATH.
 * @see https://playwright.dev/docs/chrome-extensions
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? "dot" : "list",
  timeout: 60000,
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },
});
