import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["__tests__/**/*.test.ts", "__tests__/**/*.spec.ts"],
  exclude: { patterns: ["**/node_modules/**", "**/dist/**"] },
  testEnvironment: "node",
  root: process.cwd(),
  coverage: {
    enabled: true,
    include: ["src/**/*.ts"],
    exclude: ["**/cli.ts"],
    reporters: [["text", { skipFull: true }], "html", "json", "lcov"],
    reportsDirectory: "./coverage",
    thresholds: { statements: 25, branches: 30, functions: 15, lines: 25 },
  },
});
