import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["__tests__/**/*.test.ts"],
  exclude: { patterns: ["**/node_modules/**", "**/dist/**"] },
  testEnvironment: "node",
  root: process.cwd(),
  coverage: {
    enabled: true,
    include: ["src/**/*.ts"],
    reporters: [["text", { skipFull: true }], "html", "json", "lcov"],
    reportsDirectory: "./coverage",
    thresholds: { statements: 83, branches: 51, functions: 79, lines: 85 },
  },
});
