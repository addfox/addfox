import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["__tests__/**/*.test.ts", "__tests__/**/*.spec.ts"],
  exclude: { patterns: ["**/node_modules/**", "**/dist/**"] },
  testEnvironment: "node",
  root: process.cwd(),
  coverage: {
    enabled: true,
    include: ["src/**/*.ts"],
    // Exclude CLI entry point and commands that require interactive terminal
    exclude: ["**/cli.ts", "**/commands/test.ts"],
    reporters: [["text", { skipFull: true }], "html", "json", "lcov"],
    reportsDirectory: "./coverage",
    // Thresholds set to actual coverage levels
    thresholds: { statements: 74, branches: 59, functions: 85, lines: 75 },
  },
});
