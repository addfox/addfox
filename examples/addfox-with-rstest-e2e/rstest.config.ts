import { defineConfig } from "@rstest/core";

export default defineConfig({
  root: process.cwd(),
  projects: [
    {
      name: "node",
      testEnvironment: "node",
      include: ["__tests__/example.test.ts", "__tests__/e2e.extension.test.ts"],
    },
    {
      name: "browser",
      include: ["__tests__/e2e.browser.test.ts"],
      browser: {
        enabled: true,
        provider: "playwright",
        browser: "chromium",
      },
    },
  ],
});
